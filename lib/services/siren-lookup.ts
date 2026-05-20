// Lookup d'un SIREN via l'API publique recherche-entreprises.api.gouv.fr.
// API publique, sans clé, CORS-friendly → on peut l'appeler depuis le navigateur.
// Doc : https://api.gouv.fr/documentation/api-recherche-entreprises

export type SirenLookupResult = {
  siren: string;
  nomComplet: string; // raison sociale ou dénomination
  formeJuridique: string | null;
  etatAdministratif: 'A' | 'C' | null; // A = active, C = cessée
  adresse: string | null;
};

const ENDPOINT = 'https://recherche-entreprises.api.gouv.fr/search';

type ApiResponse = {
  results?: Array<{
    siren?: string;
    nom_complet?: string;
    nom_raison_sociale?: string;
    nature_juridique?: string;
    siege?: {
      adresse?: string;
      etat_administratif?: string;
    };
    etat_administratif?: string;
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

  const etat = hit.siege?.etat_administratif ?? hit.etat_administratif ?? null;
  const etatNormalized: 'A' | 'C' | null =
    etat === 'A' ? 'A' : etat === 'C' ? 'C' : null;

  return {
    siren: digits,
    nomComplet: hit.nom_complet ?? hit.nom_raison_sociale ?? '',
    formeJuridique: hit.nature_juridique ?? null,
    etatAdministratif: etatNormalized,
    adresse: hit.siege?.adresse ?? null,
  };
}
