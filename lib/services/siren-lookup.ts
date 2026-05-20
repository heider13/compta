// Lookup d'un SIREN via l'API publique recherche-entreprises.api.gouv.fr.
// API publique, sans clé, CORS-friendly → on peut l'appeler depuis le navigateur.
// Doc : https://api.gouv.fr/documentation/api-recherche-entreprises

export type SirenLookupResult = {
  siren: string;
  nomComplet: string; // raison sociale ou dénomination
  sigle: string | null;
  formeJuridique: string | null; // libellé "Société par actions simplifiée", etc.
  natureJuridiqueCode: string | null; // code à 4 chiffres (ex "5710")
  etatAdministratif: 'A' | 'C' | null; // A = active, C = cessée
  dateCreation: string | null; // YYYY-MM-DD
  trancheEffectifs: string | null;
  activitePrincipale: string | null; // libellé NAF
  // Coordonnées du siège
  siege: {
    siret: string | null;
    adresseLigne1: string | null;
    codePostal: string | null;
    commune: string | null;
    departement: string | null;
    region: string | null;
    adresseComplete: string | null;
  };
};

const ENDPOINT = 'https://recherche-entreprises.api.gouv.fr/search';

type ApiResponse = {
  results?: Array<{
    siren?: string;
    nom_complet?: string;
    nom_raison_sociale?: string;
    sigle?: string;
    nature_juridique?: string;
    libelle_nature_juridique?: string;
    etat_administratif?: string;
    date_creation?: string;
    tranche_effectif_salarie?: string;
    libelle_tranche_effectif_salarie?: string;
    activite_principale?: string;
    libelle_activite_principale?: string;
    siege?: {
      siret?: string;
      adresse?: string;
      code_postal?: string;
      libelle_commune?: string;
      commune?: string;
      departement?: string;
      libelle_departement?: string;
      region?: string;
      libelle_region?: string;
      etat_administratif?: string;
      numero_voie?: string;
      type_voie?: string;
      libelle_voie?: string;
      complement_adresse?: string;
    };
  }>;
};

export async function lookupSiren(
  siren: string,
  signal?: AbortSignal,
): Promise<SirenLookupResult | null> {
  const digits = siren.replace(/\D/g, '');
  if (digits.length !== 9) return null;

  const url = `${ENDPOINT}?q=${digits}&page=1&per_page=1`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Recherche entreprises a répondu ${res.status}`);

  const json = (await res.json()) as ApiResponse;
  const hit = json.results?.[0];
  if (!hit || hit.siren !== digits) return null;

  const siege = hit.siege ?? {};

  const etatRaw = siege.etat_administratif ?? hit.etat_administratif ?? null;
  const etatAdministratif: 'A' | 'C' | null =
    etatRaw === 'A' ? 'A' : etatRaw === 'C' ? 'C' : null;

  // Construit une adresse "ligne 1" lisible si l'API ne fournit pas directement `adresse`.
  const ligne1 = siege.adresse
    ? siege.adresse
    : [siege.numero_voie, siege.type_voie, siege.libelle_voie]
        .filter(Boolean)
        .join(' ')
        .trim() || null;

  const adresseComplete = [
    ligne1,
    [siege.code_postal, siege.libelle_commune ?? siege.commune].filter(Boolean).join(' '),
  ]
    .filter((x) => x && x.trim())
    .join(', ')
    .trim();

  return {
    siren: digits,
    nomComplet: hit.nom_complet ?? hit.nom_raison_sociale ?? '',
    sigle: hit.sigle ?? null,
    formeJuridique: hit.libelle_nature_juridique ?? null,
    natureJuridiqueCode: hit.nature_juridique ?? null,
    etatAdministratif,
    dateCreation: hit.date_creation ?? null,
    trancheEffectifs:
      hit.libelle_tranche_effectif_salarie ?? hit.tranche_effectif_salarie ?? null,
    activitePrincipale: hit.libelle_activite_principale ?? hit.activite_principale ?? null,
    siege: {
      siret: siege.siret ?? null,
      adresseLigne1: ligne1,
      codePostal: siege.code_postal ?? null,
      commune: siege.libelle_commune ?? siege.commune ?? null,
      departement: siege.libelle_departement ?? siege.departement ?? null,
      region: siege.libelle_region ?? siege.region ?? null,
      adresseComplete: adresseComplete || null,
    },
  };
}
