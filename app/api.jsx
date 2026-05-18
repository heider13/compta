/* eslint-disable */
// Client API pour le backend VPS (proxy INPI).
// Expose window.ComptaAPI avec fetchFormalites, et des helpers de mapping
// pour transformer la réponse INPI vers la forme utilisée par dossiers.jsx.

const COMPTA_API_BASE = window.COMPTA_API_BASE || 'https://vps-84ac2579.vps.ovh.net';

async function getJwt() {
  if (!window.supabaseClient) return null;
  const { data } = await window.supabaseClient.auth.getSession();
  return data?.session?.access_token || null;
}

async function apiFetch(path, opts = {}) {
  const jwt = await getJwt();
  if (!jwt) throw new Error('not_authenticated');
  const res = await fetch(`${COMPTA_API_BASE}${path}`, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`api ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ─── mapping INPI → forme "dossier" attendue par DossiersList ────────────
const TYPE_FORMALITE_LABELS = {
  C: 'Création AE',
  M: 'Modification',
  R: 'Radiation',
};

const STATUT_DISPLAY = {
  RECEIVED:                    { label: 'Reçu',                 tone: 'blue'   },
  VALIDATION_PENDING:          { label: 'En validation',        tone: 'blue'   },
  AMENDMENT_PENDING:           { label: 'Régularisation',       tone: 'orange' },
  AMENDMENT_SIGNATURE_PENDING: { label: 'Signature régul.',     tone: 'amber'  },
  AMENDMENT_PAYMENT_PENDING:   { label: 'Paiement régul.',      tone: 'amber'  },
  PAYMENT_PENDING:             { label: 'En attente paiement',  tone: 'amber'  },
  SIGNATURE_PENDING:           { label: 'Signature requise',    tone: 'amber'  },
  VALIDATED:                   { label: 'Validée',              tone: 'green'  },
  REJECTED:                    { label: 'Rejetée',              tone: 'red'    },
};

function initialsFromName(name) {
  if (!name) return '??';
  const words = String(name).trim().split(/\s+/).slice(0, 2);
  return words.map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '??';
}

function formatDateFR(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

function mapFormaliteToDossier(f) {
  const display = STATUT_DISPLAY[f.status] || { label: f.status || '—', tone: 'gray' };
  return {
    id: f.liasseNumber || `INPI-${f.id}`,
    inpiId: f.id,
    client: f.companyName || f.nomDossier || '(sans nom)',
    initials: initialsFromName(f.companyName || f.nomDossier),
    type: TYPE_FORMALITE_LABELS[f.typeFormalite] || 'Formalité',
    date: formatDateFR(f.statusDate),
    dateISO: f.statusDate ? f.statusDate.slice(0, 10) : null,
    statut: f.status,
    label: display.label,
    tone: display.tone,
    siren: null,
    naf: f.nomDossier || '',
  };
}

async function fetchFormalites({ itemsPerPage = 100 } = {}) {
  const data = await apiFetch(`/api/formalites?itemsPerPage=${itemsPerPage}`);
  return (data.items || []).map(mapFormaliteToDossier);
}

window.ComptaAPI = {
  base: COMPTA_API_BASE,
  fetchFormalites,
  mapFormaliteToDossier,
  apiFetch,
};
