// Client de l'API Pappers Services — publication d'annonces légales.
// https://services.pappers.fr/api/documentation
//
// L'API génère une annonce légale conforme à partir des données de la formalité
// (forme juridique, dénomination, capital, objet, type d'annonce…), la publie
// dans un journal habilité et renvoie une attestation de parution.
//
// Auth : paramètre de requête `api_token`. Le token est propre au compte
// Pappers Services (facturé au jeton) → défini en variable d'environnement
// PAPPERS_ANNONCES_TOKEN sur le VPS (jamais commité).

const BASE = process.env.PAPPERS_ANNONCES_BASE || 'https://services.pappers.fr/api';
const TOKEN = process.env.PAPPERS_ANNONCES_TOKEN || '';

function isConfigured() {
  return Boolean(TOKEN);
}

function withToken(path, params = {}) {
  const usp = new URLSearchParams({ api_token: TOKEN, ...params });
  return `${BASE}${path}?${usp.toString()}`;
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
    json = null;
  }
  if (!res.ok) {
    const err = new Error(
      (json && (json.error || json.message)) || `pappers_annonces_${res.status}`,
    );
    err.status = res.status;
    err.body = json || text.slice(0, 300);
    throw err;
  }
  return json;
}

// Suivi des jetons (solde) — endpoint documenté. Sert aussi à valider le token.
//   GET {BASE}/suivi-jetons?api_token=...
async function getBalance() {
  if (!isConfigured()) {
    const e = new Error('pappers_annonces_not_configured');
    e.status = 503;
    throw e;
  }
  return request(withToken('/suivi-jetons'));
}

module.exports = { isConfigured, getBalance, BASE, withToken, request };
