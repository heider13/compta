// Types partagés — module CRM (clients) et dossiers

export type FormeJuridique =
  | 'AE'
  | 'EI'
  | 'SASU'
  | 'SAS'
  | 'EURL'
  | 'SARL'
  | 'SCI'
  | 'SA'
  | 'SNC'
  | 'HOLDING'
  | 'AUTRE';

export const FORMES_JURIDIQUES: FormeJuridique[] = [
  'AE',
  'EI',
  'SASU',
  'SAS',
  'EURL',
  'SARL',
  'SCI',
  'SA',
  'SNC',
  'HOLDING',
  'AUTRE',
];

export type ClientSource = 'manual' | 'pappers' | 'rne' | 'import' | 'api';

export interface AdresseSiege {
  numero_voie?: string;
  type_voie?: string;
  libelle_voie?: string;
  complement?: string;
  code_postal?: string;
  commune?: string;
  pays?: string;
  // libellé brut éventuel
  libelle?: string;
  [key: string]: unknown;
}

export interface Client {
  id: string;
  organization_id: string;
  siren: string | null;
  denomination: string;
  forme_juridique: FormeJuridique | null;
  code_naf: string | null;
  capital_social_cents: number | null;
  date_immatriculation: string | null;
  adresse_siege: AdresseSiege | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  pappers_data: Record<string, unknown> | null;
  source: ClientSource;
  metadata: Record<string, unknown>;
  archived_at: string | null;
  created_at: string;
  updated_at?: string;
}

export type DossierStatut =
  | 'RECEIVED'
  | 'IN_PROGRESS'
  | 'WAITING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | string;

export interface Dossier {
  id: string;
  organization_id: string | null;
  client_id: string | null;
  reference: string | null;
  client_name: string;
  type_formalite: string;
  forme_juridique: FormeJuridique | null;
  statut: DossierStatut;
  assigned_to: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent' | null;
  internal_due_date: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at?: string;
}

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'collaborator' | 'readonly';
  joined_at: string;
}

// Réponse de l'API recherche-entreprises.api.gouv.fr
export interface PappersDirigeant {
  nom?: string;
  prenoms?: string;
  qualite?: string;
  type_dirigeant?: 'personne physique' | 'personne morale' | string;
  [key: string]: unknown;
}

export interface PappersEtablissementSiege {
  siret?: string;
  adresse?: string;
  code_postal?: string;
  libelle_commune?: string;
  [key: string]: unknown;
}

export interface PappersResult {
  siren: string;
  nom_complet: string;
  nom_raison_sociale?: string;
  nature_juridique?: string; // code court ex. "5710"
  libelle_nature_juridique?: string;
  activite_principale?: string;
  date_creation?: string;
  tranche_effectif_salarie?: string;
  etablissement_siege?: PappersEtablissementSiege;
  dirigeants?: PappersDirigeant[];
  [key: string]: unknown;
}

export interface PappersSearchResponse {
  results: PappersResult[];
  total_results?: number;
  page?: number;
  per_page?: number;
}

// Petits helpers d'affichage
export function getInitials(input: string | null | undefined): string {
  if (!input) return '?';
  const cleaned = input
    .trim()
    .replace(/[^a-zA-ZÀ-ÿ0-9\s-]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (cleaned.length === 0) return '?';
  if (cleaned.length === 1) return cleaned[0].slice(0, 2).toUpperCase();
  return (cleaned[0][0] + cleaned[1][0]).toUpperCase();
}

export function formatSiren(siren: string | null | undefined): string {
  if (!siren) return '—';
  const s = siren.replace(/\s+/g, '');
  if (s.length !== 9) return s;
  return `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6, 9)}`;
}

export function formatCapital(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatAdresse(addr: AdresseSiege | null | undefined): string {
  if (!addr) return '—';
  if (addr.libelle) return String(addr.libelle);
  const parts: string[] = [];
  const line1 = [addr.numero_voie, addr.type_voie, addr.libelle_voie]
    .filter(Boolean)
    .join(' ');
  if (line1) parts.push(line1);
  if (addr.complement) parts.push(String(addr.complement));
  const line2 = [addr.code_postal, addr.commune].filter(Boolean).join(' ');
  if (line2) parts.push(line2);
  if (addr.pays) parts.push(String(addr.pays));
  return parts.length > 0 ? parts.join(', ') : '—';
}

// Mapping code INSEE → forme juridique (best-effort)
export function mapNatureJuridiqueToForme(
  code: string | undefined,
): FormeJuridique | null {
  if (!code) return null;
  const c = code.trim();
  // Codes catégorie juridique INSEE
  // https://www.insee.fr/fr/information/2028129
  if (c.startsWith('1')) return 'EI'; // entrepreneur individuel
  if (c === '5485') return 'EURL';
  if (c === '5410' || c === '5498' || c === '5499') return 'SARL';
  if (c === '5710' || c === '5720') return 'SAS';
  if (c === '5505' || c === '5599') return 'SA';
  if (c === '5660') return 'SNC';
  if (c === '5800') return 'SCI';
  if (c.startsWith('65')) return 'SCI';
  if (c.startsWith('5')) return 'AUTRE';
  return 'AUTRE';
}
