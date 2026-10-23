// Client DocuSign eSignature REST v2.1 — même interface que ./yousign.js, pour que le
// parcours de signature (parcours.js, routes/signatures.js) change de fournisseur sans
// être réécrit. Les réponses sont ramenées au format Yousign utilisé par l'appelant :
//   createSignatureRequest → { id }                      (enveloppe brouillon « created »)
//   uploadDocument         → { id, total_pages }         (documentId DocuSign)
//   addSigner              → { id, signature_link }      (recipientId)
//   activate               → { signers: [{ id, signature_link }] }  (enveloppe « sent »)
//   getStatus              → { status, documents: [{ id, nature }] }
//
// Authentification : JWT Grant (application « service »), jeton mis en cache.
// Variables d'env (voir SETUP-DOCUSIGN.md) :
//   DOCUSIGN_INTEGRATION_KEY   clé d'intégration (client_id)          obligatoire
//   DOCUSIGN_USER_ID           GUID de l'utilisateur à impersonner    obligatoire
//   DOCUSIGN_PRIVATE_KEY       clé RSA privée PEM (\n échappés acceptés) — ou
//   DOCUSIGN_PRIVATE_KEY_PATH  chemin du fichier PEM sur le serveur   l'un des deux
//   DOCUSIGN_ENV               demo (défaut) | prod
//   DOCUSIGN_ACCOUNT_ID        compte à utiliser (défaut : compte par défaut de l'utilisateur)
//   DOCUSIGN_RETURN_URL        page de retour après une signature intégrée
//   DOCUSIGN_SIGNATURE_PROVIDER  fournisseur de signature avancée/qualifiée (option du compte)

const crypto = require('node:crypto');
const fs = require('node:fs');

const TIMEOUT_MS = 30_000;
const RETRY_MAX = 1;

const hoteOAuth = () => (process.env.DOCUSIGN_ENV === 'prod' ? 'account.docusign.com' : 'account-d.docusign.com');

function clePrivee() {
  if (process.env.DOCUSIGN_PRIVATE_KEY) return process.env.DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n');
  if (process.env.DOCUSIGN_PRIVATE_KEY_PATH) return fs.readFileSync(process.env.DOCUSIGN_PRIVATE_KEY_PATH, 'utf8');
  return null;
}

function configure() {
  return Boolean(process.env.DOCUSIGN_INTEGRATION_KEY && process.env.DOCUSIGN_USER_ID
    && (process.env.DOCUSIGN_PRIVATE_KEY || process.env.DOCUSIGN_PRIVATE_KEY_PATH));
}

function erreurConfig() {
  const err = new Error('DocuSign n’est pas configuré (DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, clé privée) — voir SETUP-DOCUSIGN.md');
  err.status = 500;
  err.code = 'docusign_not_configured';
  return err;
}

async function fetchWithTimeout(url, init) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Jeton JWT Grant + compte (base_uri) ──────────────────────────
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

let session = null; // { jeton, exp, compte, base }

async function ouvrirSession() {
  if (session && session.exp > Date.now() + 5 * 60_000) return session;
  if (!configure()) throw erreurConfig();
  const maintenant = Math.floor(Date.now() / 1000);
  const entete = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corps = b64url(JSON.stringify({
    iss: process.env.DOCUSIGN_INTEGRATION_KEY,
    sub: process.env.DOCUSIGN_USER_ID,
    aud: hoteOAuth(),
    iat: maintenant,
    exp: maintenant + 3600,
    scope: 'signature impersonation',
  }));
  const signature = b64url(crypto.createSign('RSA-SHA256').update(`${entete}.${corps}`).sign(clePrivee()));
  const res = await fetchWithTimeout(`https://${hoteOAuth()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${entete}.${corps}.${signature}` }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // consent_required : l'utilisateur doit autoriser l'application une fois (URL dans SETUP-DOCUSIGN.md)
    const err = new Error(`docusign auth ${res.status}: ${json.error || ''} ${json.error_description || ''}`.trim());
    err.status = res.status === 400 ? 502 : res.status;
    err.code = json.error === 'consent_required' ? 'docusign_consent_required' : 'docusign_auth_failed';
    throw err;
  }
  const info = await fetchWithTimeout(`https://${hoteOAuth()}/oauth/userinfo`, { headers: { Authorization: `Bearer ${json.access_token}` } })
    .then((r) => r.json());
  const comptes = info?.accounts || [];
  const compte = comptes.find((a) => a.account_id === process.env.DOCUSIGN_ACCOUNT_ID) || comptes.find((a) => a.is_default) || comptes[0];
  if (!compte) throw Object.assign(new Error('docusign : aucun compte accessible pour cet utilisateur'), { status: 502 });
  session = { jeton: json.access_token, exp: Date.now() + (json.expires_in || 3600) * 1000, compte: compte.account_id, base: `${compte.base_uri}/restapi/v2.1/accounts/${compte.account_id}` };
  return session;
}

async function dsFetch(chemin, { method = 'GET', body, raw = false } = {}) {
  for (let essai = 0; ; essai += 1) {
    const s = await ouvrirSession();
    let res;
    try {
      res = await fetchWithTimeout(`${s.base}${chemin}`, {
        method,
        headers: { Authorization: `Bearer ${s.jeton}`, Accept: raw ? 'application/pdf' : 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      if (essai < RETRY_MAX) continue;
      throw Object.assign(new Error(`docusign_network_error: ${e.message}`), { status: 0, cause: e });
    }
    if (res.status === 401 && essai < RETRY_MAX) { session = null; continue; } // jeton révoqué : on en redemande un
    if (res.status >= 500 && essai < RETRY_MAX) continue;
    if (raw && res.ok) return Buffer.from(await res.arrayBuffer());
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(`docusign ${res.status}: ${JSON.stringify(payload).slice(0, 500)}`);
      err.status = res.status;
      err.payload = payload;
      throw err;
    }
    return payload;
  }
}

// ─── Numérotation des documents et destinataires d'une enveloppe ──
// Les appels d'une même demande se suivent dans la même requête HTTP : un compteur en
// mémoire suffit (les identifiants DocuSign sont des entiers propres à l'enveloppe).
const brouillons = new Map(); // envelopeId → { doc, dest, integree }
const brouillon = (id) => {
  if (!brouillons.has(id)) brouillons.set(id, { doc: 0, dest: 0, integree: false });
  return brouillons.get(id);
};

// Nombre de pages d'un PDF (pour placer la signature sur la dernière page)
function compterPages(buf) {
  const texte = buf.toString('latin1');
  const n = (texte.match(/\/Type\s*\/Page(?![a-z])/g) || []).length;
  return n || 1;
}

// ─── Endpoints (interface Yousign) ────────────────────────────────
// Enveloppe brouillon : documents et signataires sont ajoutés ensuite, l'envoi se fait à activate()
async function createSignatureRequest({ name, deliveryMode = 'email' }) {
  if (!name) throw new Error('createSignatureRequest: name required');
  const env = await dsFetch('/envelopes', { method: 'POST', body: { emailSubject: String(name).slice(0, 100), status: 'created' } });
  // deliveryMode 'none' (Yousign) = signature intégrée : pas d'e-mail, lien ouvert par l'utilisateur
  // GUID en minuscules : c'est sous cette forme qu'il est cherché dans les métadonnées (webhook)
  const id = String(env.envelopeId).toLowerCase();
  brouillon(id).integree = deliveryMode === 'none';
  return { id, status: 'draft' };
}

async function uploadDocument(envelopeId, { filename, base64Pdf }) {
  if (!envelopeId || !base64Pdf || !filename) throw new Error('uploadDocument: envelopeId, filename, base64Pdf required');
  const documentId = String((brouillon(envelopeId).doc += 1));
  await dsFetch(`/envelopes/${encodeURIComponent(envelopeId)}/documents`, {
    method: 'PUT',
    body: { documents: [{ documentId, name: String(filename).replace(/\.pdf$/i, ''), fileExtension: 'pdf', documentBase64: base64Pdf }] },
  });
  return { id: documentId, total_pages: compterPages(Buffer.from(base64Pdf, 'base64')) };
}

// fields : champs au format Yousign { document_id, page, x, y } (points, origine en haut à gauche, comme DocuSign)
async function addSigner(envelopeId, { firstName, lastName, email, fields = [] }) {
  if (!envelopeId) throw new Error('addSigner: envelopeId required');
  if (!firstName || !lastName || !email) throw new Error('addSigner: firstName, lastName, email required');
  const b = brouillon(envelopeId);
  const recipientId = String((b.dest += 1));
  const signataire = {
    email, name: `${firstName} ${lastName}`, recipientId, routingOrder: '1',
    ...(b.integree ? { clientUserId: recipientId } : {}),
    tabs: { signHereTabs: fields.map((f) => ({ documentId: String(f.document_id), pageNumber: String(f.page || 1), xPosition: String(Math.round(f.x)), yPosition: String(Math.round(f.y)) })) },
    ...(process.env.DOCUSIGN_SIGNATURE_PROVIDER ? { recipientSignatureProviders: [{ signatureProviderName: process.env.DOCUSIGN_SIGNATURE_PROVIDER }] } : {}),
  };
  await dsFetch(`/envelopes/${encodeURIComponent(envelopeId)}/recipients`, { method: 'POST', body: { signers: [signataire] } });
  return { id: recipientId, signature_link: null };
}

// Lien de signature intégrée (valable quelques minutes, à usage unique : toujours en redemander un)
async function lienSignature(envelopeId) {
  const r = await dsFetch(`/envelopes/${encodeURIComponent(envelopeId)}/recipients`);
  const s = (r.signers || []).find((x) => x.clientUserId);
  if (!s) return null;
  const vue = await dsFetch(`/envelopes/${encodeURIComponent(envelopeId)}/views/recipient`, {
    method: 'POST',
    body: {
      returnUrl: process.env.DOCUSIGN_RETURN_URL || 'https://compta-navy.vercel.app/signature-terminee',
      authenticationMethod: 'none', email: s.email, userName: s.name, clientUserId: s.clientUserId, recipientId: s.recipientId,
    },
  });
  return vue.url || null;
}

async function activate(envelopeId) {
  if (!envelopeId) throw new Error('activate: envelopeId required');
  await dsFetch(`/envelopes/${encodeURIComponent(envelopeId)}`, { method: 'PUT', body: { status: 'sent' } });
  const integree = brouillons.get(envelopeId)?.integree;
  brouillons.delete(envelopeId);
  if (!integree) return { status: 'ongoing', signers: [] };
  const r = await dsFetch(`/envelopes/${encodeURIComponent(envelopeId)}/recipients`);
  const lien = await lienSignature(envelopeId);
  return { status: 'ongoing', signers: (r.signers || []).filter((s) => s.clientUserId).map((s) => ({ id: s.recipientId, signature_link: lien })) };
}

// Statuts DocuSign → statuts Yousign attendus par l'appelant
function statutYousign(env) {
  switch (env.status) {
    case 'completed': return 'done';
    case 'declined': return 'declined';
    case 'voided': return /expir/i.test(env.voidedReason || '') ? 'expired' : 'canceled';
    case 'created': return 'draft';
    default: return 'ongoing'; // sent, delivered, signed, correct
  }
}

async function getStatus(envelopeId) {
  if (!envelopeId) throw new Error('getStatus: envelopeId required');
  const id = encodeURIComponent(envelopeId);
  const [env, docs] = await Promise.all([dsFetch(`/envelopes/${id}`), dsFetch(`/envelopes/${id}/documents`)]);
  return {
    id: envelopeId,
    status: statutYousign(env),
    // Le certificat de signature (documentId « certificate ») n'est pas un document signé
    documents: (docs.envelopeDocuments || []).filter((d) => d.type === 'content').map((d) => ({ id: d.documentId, nature: 'signable_document', name: d.name })),
  };
}

async function downloadSignedDocument(envelopeId, documentId) {
  if (!envelopeId || !documentId) throw new Error('downloadSignedDocument: envelopeId and documentId required');
  return dsFetch(`/envelopes/${encodeURIComponent(envelopeId)}/documents/${encodeURIComponent(documentId)}`, { raw: true });
}

async function cancel(envelopeId, reason = 'Demande annulée par le cabinet') {
  return dsFetch(`/envelopes/${encodeURIComponent(envelopeId)}`, { method: 'PUT', body: { status: 'voided', voidedReason: reason } });
}

module.exports = {
  nom: 'DocuSign',
  configure,
  cancel,
  createSignatureRequest,
  uploadDocument,
  addSigner,
  activate,
  getStatus,
  downloadSignedDocument,
  lienSignature,
  _interne: { statutYousign, compterPages },
};
