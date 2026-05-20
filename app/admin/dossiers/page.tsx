import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatusPill } from '@/components/cabinet/StatusPill';
import { formatDateFr, FORMES_JURIDIQUES } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface DossierRow {
  id: string;
  reference: string | null;
  client_name: string;
  type_formalite: string;
  forme_juridique: string | null;
  statut: string;
  created_at: string;
  updated_at: string | null;
  organizations: { name: string } | null;
}

const STATUSES = [
  'DRAFT',
  'AWAITING_VALIDATION',
  'INTERNAL_AMENDMENT_PENDING',
  'VALIDATED_INTERNAL',
  'RECEIVED',
  'VALIDATION_PENDING',
  'AMENDMENT_PENDING',
  'PAYMENT_PENDING',
  'SIGNATURE_PENDING',
  'VALIDATED',
  'REJECTED',
];

const TYPES = ['CREATION', 'MODIFICATION', 'RADIATION'];

const GRID = '100px 1.4fr 1fr 90px 1fr 120px 120px';

interface SearchParams {
  statut?: string;
  type?: string;
  forme?: string;
}

export default async function AdminDossiersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('dossiers')
    .select(
      'id, reference, client_name, type_formalite, forme_juridique, statut, created_at, updated_at, organizations(name)',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (sp.statut) query = query.eq('statut', sp.statut);
  if (sp.type) query = query.eq('type_formalite', sp.type);
  if (sp.forme) query = query.eq('forme_juridique', sp.forme);

  const { data, error } = await query;
  const rows = (data ?? []) as unknown as DossierRow[];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tous les dossiers</h1>
          <p>
            {rows.length} résultat{rows.length > 1 ? 's' : ''} — tous cabinets.
          </p>
        </div>
      </div>

      {error && (
        <div className="form-error" style={{ marginBottom: 16 }}>
          {error.message}
        </div>
      )}

      <form
        method="get"
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
          alignItems: 'flex-end',
        }}
      >
        <Filter name="statut" label="Statut" current={sp.statut} options={STATUSES} />
        <Filter name="type" label="Type" current={sp.type} options={TYPES} />
        <Filter
          name="forme"
          label="Forme juridique"
          current={sp.forme}
          options={[...FORMES_JURIDIQUES]}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-accent btn-sm">
            Appliquer
          </button>
          <Link href="/admin/dossiers" className="btn btn-ghost btn-sm">
            Réinitialiser
          </Link>
        </div>
      </form>

      <div className="app-card">
        <div
          className="app-table-head"
          style={{ gridTemplateColumns: GRID }}
        >
          <span>Référence</span>
          <span>Client</span>
          <span>Cabinet</span>
          <span>Forme</span>
          <span>Type</span>
          <span>Créé</span>
          <span>Statut</span>
        </div>
        {rows.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: 'center',
              color: 'var(--ink-500)',
              fontSize: 14,
            }}
          >
            Aucun dossier ne correspond.
          </div>
        ) : (
          rows.map((d) => (
            <Link
              key={d.id}
              href={`/admin/dossiers/${d.id}`}
              className="app-table-row"
              style={{
                gridTemplateColumns: GRID,
                textDecoration: 'none',
              }}
            >
              <span
                className="mono"
                style={{ fontSize: 11, color: 'var(--ink-500)' }}
              >
                {d.reference ?? d.id.slice(0, 8)}
              </span>
              <span style={{ fontWeight: 500 }}>{d.client_name}</span>
              <span style={{ color: 'var(--ink-600)', fontSize: 13 }}>
                {d.organizations?.name ?? '—'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--ink-700)' }}>
                {d.forme_juridique ?? '—'}
              </span>
              <span style={{ color: 'var(--ink-700)', fontSize: 13 }}>
                {d.type_formalite}
              </span>
              <span
                className="mono"
                style={{ fontSize: 11, color: 'var(--ink-500)' }}
              >
                {formatDateFr(d.created_at)}
              </span>
              <StatusPill statut={d.statut} />
            </Link>
          ))
        )}
      </div>
    </>
  );
}

function Filter({
  name,
  label,
  current,
  options,
}: {
  name: string;
  label: string;
  current?: string;
  options: string[];
}) {
  return (
    <div className="form-field" style={{ minWidth: 180 }}>
      <label>{label}</label>
      <select name={name} defaultValue={current ?? ''}>
        <option value="">— Tous —</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
