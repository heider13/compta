// Client de l'API Les Echos Le Parisien Services (annonces légales).
// Doc : https://docs.lesechosleparisienservices.fr (protégée par mot de passe)
//
// Variables d'env (voir SETUP-ANNONCES.md) :
//   LELPS_API_KEY         clé API de l'organisation (une par environnement)     obligatoire
//   LELPS_API_URL         défaut : préproduction https://api-preprod.lesechosleparisienservices.fr/v1
//   LELPS_WEBHOOK_SECRET  clé de signature des webhooks (fournie par leur support)
//
// Règles de la doc suivies ici :
//   - Authorization: Bearer <clé> ; jamais journalisée
//   - Idempotency-Key sur chaque écriture (une annonce est facturée : pas de doublon au nouvel essai)
//   - 429 / 503 : attente de retry_after puis nouvel essai (borné) ; 401 jamais retenté
//   - departmentCode toujours en chaîne (« 01 », « 2B », « 972 »)

const crypto = require('node:crypto');

const DEFAUT = 'https://api-preprod.lesechosleparisienservices.fr/v1';
const TIMEOUT_MS = 30_000;
const ESSAIS = 3;

const configure = () => Boolean(process.env.LELPS_API_KEY);
const baseUrl = () => (process.env.LELPS_API_URL || DEFAUT).replace(/\/+$/, '');
const preproduction = () => /api-preprod\./.test(baseUrl());

function erreurConfig() {
  return Object.assign(new Error('Publication des annonces non configurée (LELPS_API_KEY absente) — voir SETUP-ANNONCES.md'), { status: 400, code: 'lelps_non_configure' });
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

// Message lisible d'une réponse d'erreur (format « problem » RFC 7807, ou { error })
function messageErreur(status, corps) {
  if (corps && typeof corps === 'object') {
    const violations = (corps.violations || []).map((v) => `${v.field} : ${v.message}`).join(' ; ');
    const texte = [corps.title || corps.error, corps.detail, violations].filter(Boolean).join(' — ');
    return `${texte || `erreur ${status}`}${corps.request_id ? ` (request_id ${corps.request_id})` : ''}`;
  }
  return String(corps || `erreur ${status}`).slice(0, 300);
}

async function appel(chemin, { method = 'GET', body, idempotence, brut = false } = {}) {
  if (!configure()) throw erreurConfig();
  for (let essai = 1; ; essai += 1) {
    const ac = new AbortController();
    const minuteur = setTimeout(() => ac.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(`${baseUrl()}${chemin}`, {
        method,
        signal: ac.signal,
        headers: {
          Authorization: `Bearer ${process.env.LELPS_API_KEY}`,
          Accept: brut ? '*/*' : 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(idempotence ? { 'Idempotency-Key': idempotence } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      // Délai dépassé ou réseau : nouvel essai sûr grâce à l'Idempotency-Key
      if (essai < ESSAIS && (method === 'GET' || idempotence)) { await attendre(1000 * essai); continue; }
      throw Object.assign(new Error(`Annonces légales : service injoignable (${e.name === 'AbortError' ? 'délai dépassé' : e.message})`), { status: 502 });
    } finally {
      clearTimeout(minuteur);
    }
    if (brut && res.ok) return Buffer.from(await res.arrayBuffer());
    const texte = await res.text();
    let corps = null;
    try { corps = texte ? JSON.parse(texte) : null; } catch { corps = texte; }
    if (res.ok) return corps;
    // Quota (429) ou service momentanément indisponible (503) : on attend ce que l'API demande
    if ((res.status === 429 || res.status === 503) && essai < ESSAIS && (method === 'GET' || idempotence)) {
      const delai = Number(res.headers.get('retry-after') || corps?.retry_after || 5);
      if (delai <= 60) { await attendre(delai * 1000); continue; }
    }
    if (res.status >= 500 && essai < ESSAIS && (method === 'GET' || idempotence)) { await attendre(2000 * essai); continue; }
    throw Object.assign(new Error(`Annonces légales : ${messageErreur(res.status, corps)}`), { status: res.status === 401 || res.status === 403 ? 502 : res.status, payload: corps });
  }
}

// Types d'annonces (référentiel, propre à chaque environnement) : en cache 1 h
let cacheTypes = null;
async function typesAnnonce() {
  if (cacheTypes && cacheTypes.exp > Date.now()) return cacheTypes.liste;
  const r = await appel('/legal-notice-types');
  const liste = (r?.legalNoticeTypes || []).map((t) => ({ id: t.id, nom: t.name, bodacc: Boolean(t.hasBodacc) }));
  cacheTypes = { exp: Date.now() + 3600_000, liste };
  return liste;
}

const codeDepartement = (d) => {
  const s = String(d ?? '').trim().toUpperCase();
  return /^\d$/.test(s) ? `0${s}` : s;
};

// Devis : un tarif par journal habilité, avec la première date de parution possible
async function estimer({ departement, typeId, contenu, date, justificatifs = 0 }) {
  const r = await appel('/legal-notices/estimate', {
    method: 'POST',
    body: {
      departmentCode: codeDepartement(departement),
      legalNoticeTypeId: typeId,
      content: contenu,
      ...(date ? { fromDate: date } : {}),
      supportingDocumentQuantity: justificatifs,
      withHeader: false,
      withLogo: false,
    },
  });
  return (r?.estimates || []).map((e) => ({
    journal: { id: e.newspaper?.id, nom: e.newspaper?.name, support: e.newspaper?.medium === 'web' ? 'web' : 'papier', groupe: Boolean(e.newspaper?.recommended), justificatifNumerique: Boolean(e.newspaper?.hasDigitalSupportingDocument) },
    dateParution: e.publicationDate,
    clotureLe: e.publicationClosingDatetime,
    prix: { ht: e.price?.totalExcludingTax, tva: e.price?.totalTax, ttc: e.price?.total, tauxTva: e.price?.taxRate },
  }));
}

// Commande (facturée) : Idempotency-Key obligatoire, fournie par l'appelant
async function creer({ departement, typeId, contenu, date, journalId, referenceClient, justificatifs = 0 }, idempotence) {
  if (!idempotence) throw new Error('creer : Idempotency-Key requise');
  return appel('/legal-notices', {
    method: 'POST',
    idempotence,
    body: {
      content: contenu,
      customerReference: referenceClient,
      departmentCode: codeDepartement(departement),
      legalNoticeTypeId: typeId,
      ...(date ? { publicationDate: date } : {}),
      ...(journalId ? { newspaperId: journalId } : {}),
      supportingDocumentQuantity: justificatifs,
    },
  });
}

const lire = (reference) => appel(`/legal-notices/${encodeURIComponent(reference)}`);
const annuler = (reference) => appel(`/legal-notices/${encodeURIComponent(reference)}/cancel`, { method: 'POST', idempotence: crypto.randomUUID() });
const telechargerDocument = (documentId) => appel(`/legal-notices/documents/${encodeURIComponent(documentId)}/download`, { brut: true });

// Texte de l'annonce (rédigé par l'agent, en lignes) → HTML simple accepté par l'API :
// un <p> par paragraphe, seuls <strong>/<b>/<br> à l'intérieur.
function contenuHtml(texte) {
  const echapper = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paragraphes = String(texte || '').split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return `<div>${paragraphes.map((p) => `<p>${echapper(p)}</p>`).join('')}</div>`;
}

// Signature des webhooks : X-Signature: t=<unix>,s=<hex HMAC-SHA256 du corps brut>, fenêtre de 5 min
function signatureWebhookValide(corpsBrut, entete, secret = process.env.LELPS_WEBHOOK_SECRET) {
  if (!secret || !corpsBrut?.length) return false;
  const parts = Object.fromEntries(String(entete || '').split(',').map((p) => p.split(/=(.*)/s).slice(0, 2)));
  if (!/^\d+$/.test(parts.t || '') || !parts.s) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const attendu = Buffer.from(crypto.createHmac('sha256', secret).update(corpsBrut).digest('hex'));
  const recu = Buffer.from(String(parts.s));
  return recu.length === attendu.length && crypto.timingSafeEqual(recu, attendu);
}

module.exports = {
  configure, preproduction, typesAnnonce, estimer, creer, lire, annuler, telechargerDocument,
  contenuHtml, codeDepartement, signatureWebhookValide,
  _interne: { appel, messageErreur },
};
