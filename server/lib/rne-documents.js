// Documents publics du RNE (API INPI) : actes déposés (statuts, PV, décisions…) et
// comptes annuels non confidentiels, plus l'avis de situation SIRENE de l'INSEE.
// Lecture seule, avec les identifiants INPI du cabinet.

const { rneToken, getCompany } = require('./inpi-rne');

const RNE_BASE = 'https://registre-national-entreprises.inpi.fr';
const INSEE_AVIS = 'https://api-avis-situation-sirene.insee.fr/identification/pdf';

const TYPES_BILAN = { C: 'Comptes annuels (complets)', S: 'Comptes annuels (simplifiés)', K: 'Comptes consolidés', B: 'Comptes de banque', A: "Comptes d'assurance" };

const cleanSiren = (s) => {
  const v = String(s || '').replace(/\D/g, '');
  if (v.length !== 9) throw Object.assign(new Error(`SIREN invalide : ${s}`), { status: 400 });
  return v;
};

async function rneFetch(orgId, path) {
  const token = await rneToken(orgId);
  const r = await fetch(`${RNE_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60000) });
  if (r.status === 404) throw Object.assign(new Error('Document introuvable au RNE.'), { status: 404 });
  if (!r.ok) throw Object.assign(new Error(`Lecture RNE impossible (HTTP ${r.status}).`), { status: 502 });
  return r;
}

function libelleActe(a) {
  const t = a.typeRdd;
  const types = Array.isArray(t) ? t.map((x) => x?.typeActe || x?.decision || x).filter((x) => typeof x === 'string') : (typeof t === 'string' ? [t] : []);
  const decisions = Array.isArray(t) ? t.map((x) => x?.decision).filter(Boolean) : [];
  return { libelle: a.libelle || types[0] || a.nomDocument || 'Acte', types, decisions, liasse: a.numNat || null };
}

// Siège : SIRET de l'établissement siège d'après la fiche RNE.
function siretSiege(company) {
  const b = company?.formality?.content?.personneMorale || company?.formality?.content?.personnePhysique || {};
  const etabs = [b.etablissementPrincipal, ...(b.autresEtablissements || [])].filter(Boolean);
  const siege = etabs.find((e) => ['1', '2'].includes(String(e.descriptionEtablissement?.rolePourEntreprise))) || etabs[0];
  return siege?.descriptionEtablissement?.siret || null;
}

async function listDocuments(orgId, siren) {
  const s = cleanSiren(siren);
  const [r, company] = await Promise.all([
    rneFetch(orgId, `/api/companies/${s}/attachments`).then((x) => x.json()),
    getCompany(orgId, s).catch(() => null),
  ]);
  const ident = company?.formality?.content?.personneMorale?.identite || company?.formality?.content?.personnePhysique?.identite || {};
  const actes = (r.actes || [])
    .filter((a) => !a.deleted)
    .map((a) => ({
      id: a.id,
      kind: 'acte',
      ...libelleActe(a),
      dateDepot: a.dateDepot || null,
      confidentiel: a.confidentiality && a.confidentiality !== 'Public',
    }))
    .sort((x, y) => String(y.dateDepot).localeCompare(String(x.dateDepot)));
  const bilans = (r.bilans || [])
    .filter((b) => !b.deleted)
    .map((b) => ({
      id: b.id,
      kind: 'bilan',
      libelle: `${TYPES_BILAN[b.typeBilan] || 'Comptes annuels'} — clôture ${b.dateCloture || '?'}`,
      dateCloture: b.dateCloture || null,
      dateDepot: b.dateDepot || null,
      typeBilan: b.typeBilan || null,
      confidentiel: b.confidentiality && b.confidentiality !== 'Public',
    }))
    .sort((x, y) => String(y.dateCloture).localeCompare(String(x.dateCloture)));
  return {
    siren: s,
    denomination: ident.entreprise?.denomination || null,
    siretSiege: siretSiege(company),
    actes,
    bilans,
  };
}

// kind : acte | bilan | insee (id = SIRET pour l'avis INSEE)
async function downloadDocument(orgId, kind, id) {
  if (kind === 'acte' || kind === 'bilan') {
    if (!/^[a-f0-9]{24}$/i.test(String(id))) throw Object.assign(new Error('Identifiant de document invalide.'), { status: 400 });
    const r = await rneFetch(orgId, `/api/${kind === 'acte' ? 'actes' : 'bilans'}/${id}/download`);
    return { buffer: Buffer.from(await r.arrayBuffer()), contentType: r.headers.get('content-type') || 'application/pdf' };
  }
  if (kind === 'insee') {
    const siret = String(id || '').replace(/\D/g, '');
    if (siret.length !== 14) throw Object.assign(new Error('SIRET invalide pour l’avis de situation INSEE.'), { status: 400 });
    const r = await fetch(`${INSEE_AVIS}/${siret}`, { signal: AbortSignal.timeout(30000) }).catch(() => null);
    if (!r?.ok || !/pdf/i.test(r.headers.get('content-type') || '')) {
      throw Object.assign(new Error("Le service INSEE de l'avis de situation ne répond pas ; réessayer plus tard ou passer par avis-situation-sirene.insee.fr."), { status: 502 });
    }
    return { buffer: Buffer.from(await r.arrayBuffer()), contentType: 'application/pdf' };
  }
  throw Object.assign(new Error(`Type de document inconnu : ${kind}`), { status: 400 });
}

module.exports = { listDocuments, downloadDocument, siretSiege };
