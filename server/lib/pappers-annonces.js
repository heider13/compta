// Client des API Pappers pour les annonces légales.
// Deux bases (découvertes en inspectant le SPA services.pappers.fr) :
//   • DATA    api.pappers.fr/v2          → suivi des jetons (solde). Auth: ?api_token=
//   • SERVICES api-services.pappers.fr   → annonces légales.        Auth: Authorization: Bearer
//
// Workflow annonce légale (endpoints /annonces-front/*) :
//   formes-juridiques → journaux(departement,type_id) → draft(POST) →
//   preview / devis → (publication, facturée au jeton) → status/:id → attestation/:id
//
// Token propre au compte Pappers Services (facturé au jeton) → variable
// d'environnement PAPPERS_ANNONCES_TOKEN sur le VPS (jamais commité).

const DATA_BASE = process.env.PAPPERS_DATA_BASE || 'https://api.pappers.fr/v2';
const SERVICES_BASE = process.env.PAPPERS_SERVICES_BASE || 'https://api-services.pappers.fr';
const TOKEN = process.env.PAPPERS_ANNONCES_TOKEN || '';

function isConfigured() {
  return Boolean(TOKEN);
}

async function request(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { Accept: 'application/json', ...(opts.headers || {}) },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text; // certains endpoints renvoient du texte brut sur erreur
  }
  if (!res.ok) {
    const msg =
      (json && typeof json === 'object' && (json.error || json.message)) ||
      (typeof json === 'string' ? json.slice(0, 200) : `pappers_${res.status}`);
    const err = new Error(msg);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

// Requête sur l'API Services (annonces) — auth par header Bearer.
function servicesGet(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${SERVICES_BASE}${path}${qs ? `?${qs}` : ''}`;
  return request(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
}

function servicesPost(path, body) {
  return request(`${SERVICES_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
}

// ─── Solde de jetons (API DATA) ──────────────────────────
// GET api.pappers.fr/v2/suivi-jetons?api_token=...
async function getBalance() {
  if (!isConfigured()) {
    const e = new Error('pappers_annonces_not_configured');
    e.status = 503;
    throw e;
  }
  return request(`${DATA_BASE}/suivi-jetons?api_token=${encodeURIComponent(TOKEN)}`);
}

// ─── Référentiels annonces (API SERVICES) ────────────────
// Formes juridiques supportées : ex ["sas","sasu","sarl","sci","sc"]
function getFormesJuridiques() {
  return servicesGet('/annonces-front/formes-juridiques');
}

// Journaux habilités pour un département + type d'annonce.
function getJournaux(departement, typeId) {
  return servicesGet('/annonces-front/journaux', { departement, type_id: typeId });
}

module.exports = {
  isConfigured,
  getBalance,
  getFormesJuridiques,
  getJournaux,
  servicesGet,
  servicesPost,
  DATA_BASE,
  SERVICES_BASE,
};
