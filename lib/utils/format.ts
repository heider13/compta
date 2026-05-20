// Helpers de formatage (dates, libellés FR) pour le dashboard cabinet.

const MS_MINUTE = 60 * 1000;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;

function parseDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Format relatif court FR (style Twitter) :
 *   < 1 min  → "à l'instant"
 *   < 60 min → "il y a N min"
 *   < 24 h   → "il y a Nh"
 *   < 48 h   → "hier"
 *   < 7 j    → "il y a N j"
 *   sinon    → "5 mai" (date courte)
 */
export function formatRelative(date: string | Date | null | undefined): string {
  const d = parseDate(date);
  if (!d) return '—';

  const now = Date.now();
  const diff = now - d.getTime();

  if (diff < 0) {
    // Date future — on retourne la date formatée
    return formatDate(d.toISOString());
  }

  if (diff < MS_MINUTE) return "à l'instant";
  if (diff < MS_HOUR) {
    const m = Math.floor(diff / MS_MINUTE);
    return `il y a ${m} min`;
  }
  if (diff < MS_DAY) {
    const h = Math.floor(diff / MS_HOUR);
    return `il y a ${h} h`;
  }
  if (diff < 2 * MS_DAY) return 'hier';
  if (diff < 7 * MS_DAY) {
    const d2 = Math.floor(diff / MS_DAY);
    return `il y a ${d2} j`;
  }

  return formatDate(d.toISOString());
}

/**
 * Format date FR courte : "5 mai" (jour + mois) ou "5 mai 2024" si withYear.
 */
export function formatDate(
  date: string | Date | null | undefined,
  withYear = false,
): string {
  const d = parseDate(date);
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: withYear ? 'numeric' : undefined,
    }).format(d);
  } catch {
    return String(date);
  }
}

const TYPE_FORMALITE_LABELS: Record<string, string> = {
  CREATION: 'Création',
  MODIFICATION: 'Modification',
  RADIATION: 'Radiation',
};

export function typeFormaliteLabel(t: string | null | undefined): string {
  if (!t) return '—';
  return TYPE_FORMALITE_LABELS[t] ?? t;
}

const FORME_JURIDIQUE_LABELS: Record<string, string> = {
  AE: 'Auto-entreprise',
  EI: 'Entreprise individuelle',
  SASU: 'SASU',
  SAS: 'SAS',
  EURL: 'EURL',
  SARL: 'SARL',
  SCI: 'SCI',
  SA: 'SA',
  SNC: 'SNC',
  HOLDING: 'Holding',
  AUTRE: 'Autre',
};

export function formeJuridiqueLabel(f: string | null | undefined): string {
  if (!f) return '';
  return FORME_JURIDIQUE_LABELS[f] ?? f;
}
