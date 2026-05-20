// Client pour l'API publique "Recherche d'entreprises" data.gouv.fr.
// Gratuite, sans clé. Documentation : https://recherche-entreprises.api.gouv.fr/
//
// On expose deux fonctions :
//   - searchBySiren(siren)         → fiche normalisée ou null
//   - searchByName(query, limit)   → { items: [...] } (résumé léger)

const BASE = 'https://recherche-entreprises.api.gouv.fr';

const DEFAULT_HEADERS = {
  'User-Agent': 'compta-proxy/0.1 (+https://compta-navy.vercel.app)',
  Accept: 'application/json',
};

// Mapping nature_juridique (code officiel INSEE) → enum forme_juridique
function mapFormeJuridique(natureJuridique) {
  if (!natureJuridique) return 'AUTRE';
  const code = String(natureJuridique).trim();
  const n = parseInt(code, 10);
  if (Number.isNaN(n)) return 'AUTRE';

  // Cas particuliers d'abord (codes exacts)
  if (code === '5499') return 'EURL';
  if (code === '5710') return 'SASU';
  if (code === '6540') return 'SCI';

  // Tranches
  if (n >= 1000 && n <= 1899) return 'EI'; // entreprise individuelle (incl. AE)
  if (n >= 5400 && n <= 5499) return 'SARL';
  if (n >= 5700 && n <= 5799) return 'SAS';
  if (n >= 5500 && n <= 5599) return 'SA';
  return 'AUTRE';
}

function buildAdresseSiege(s) {
  if (!s) return null;
  return {
    numero_voie: s.numero_voie || null,
    type_voie: s.type_voie || null,
    libelle_voie: s.libelle_voie || null,
    code_postal: s.code_postal || null,
    libelle_commune: s.libelle_commune || null,
    pays: s.libelle_pays_etranger || 'France',
    adresse_complete: s.adresse || null,
  };
}

function mapDirigeants(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((d) => ({
    nom: d.nom || null,
    prenoms: d.prenoms || null,
    qualite: d.qualite || null,
    date_naissance: d.date_de_naissance || null,
    type: d.type_dirigeant || null,
  }));
}

function mapEntreprise(e) {
  if (!e) return null;
  const siege = e.siege || {};
  return {
    siren: e.siren,
    denomination: e.nom_complet || e.nom_raison_sociale || siege.nom_commercial || null,
    forme_juridique: mapFormeJuridique(e.nature_juridique),
    nature_juridique_code: e.nature_juridique || null,
    code_naf: e.activite_principale || siege.activite_principale || null,
    adresse_siege: buildAdresseSiege(siege),
    date_immatriculation: e.date_creation || null,
    dirigeants: mapDirigeants(e.dirigeants),
    raw: e,
  };
}

async function apiGet(pathAndQuery) {
  const url = `${BASE}${pathAndQuery}`;
  const res = await fetch(url, { headers: DEFAULT_HEADERS });
  if (res.status === 404) return null;
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    const err = new Error(`recherche-entreprises ${res.status}: ${txt.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function searchBySiren(siren) {
  if (!siren) return null;
  const clean = String(siren).replace(/\s+/g, '');
  if (!/^\d{9}$/.test(clean)) {
    const err = new Error('siren_invalid');
    err.status = 400;
    throw err;
  }
  const data = await apiGet(`/search?q=${encodeURIComponent(clean)}&per_page=1`);
  const results = data?.results || [];
  // L'API peut renvoyer plusieurs résultats sur une requête texte ; on filtre sur le SIREN exact.
  const match = results.find((r) => r.siren === clean) || results[0] || null;
  return mapEntreprise(match);
}

async function searchByName(query, limit = 10) {
  if (!query || !String(query).trim()) return { items: [] };
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 25);
  const data = await apiGet(
    `/search?q=${encodeURIComponent(String(query).trim())}&per_page=${perPage}`,
  );
  const results = data?.results || [];
  const items = results.map((e) => {
    const siege = e.siege || {};
    return {
      siren: e.siren,
      denomination: e.nom_complet || e.nom_raison_sociale || null,
      forme_juridique: mapFormeJuridique(e.nature_juridique),
      code_naf: e.activite_principale || null,
      ville_siege: siege.libelle_commune || null,
    };
  });
  return { items };
}

module.exports = { searchBySiren, searchByName, mapFormeJuridique };
