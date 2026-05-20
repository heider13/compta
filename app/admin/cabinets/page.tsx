import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDateFr, formatSiren } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  siren: string | null;
  plan: string | null;
  created_at: string;
  memberships: { id: string }[] | null;
  dossiers: { id: string }[] | null;
}

const GRID = '1.6fr 1fr 140px 110px 110px 110px 130px';

export default async function AdminCabinetsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organizations')
    .select(
      'id, name, slug, siren, plan, created_at, memberships(id), dossiers(id)',
    )
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as unknown as OrgRow[];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Cabinets</h1>
          <p>
            {rows.length} cabinet{rows.length > 1 ? 's' : ''} inscrits sur la
            plateforme.
          </p>
        </div>
      </div>

      {error && (
        <div className="form-error" style={{ marginBottom: 16 }}>
          {error.message}
        </div>
      )}

      <div className="app-card">
        <div className="app-table-head" style={{ gridTemplateColumns: GRID }}>
          <span>Nom</span>
          <span>Slug</span>
          <span>SIREN</span>
          <span>Plan</span>
          <span>Membres</span>
          <span>Dossiers</span>
          <span>Inscrit le</span>
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
            Aucun cabinet pour l&apos;instant.
          </div>
        ) : (
          rows.map((o) => (
            <Link
              key={o.id}
              href={`/admin/cabinets/${o.id}`}
              className="app-table-row"
              style={{
                gridTemplateColumns: GRID,
                textDecoration: 'none',
              }}
            >
              <span style={{ fontWeight: 500 }}>{o.name}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--ink-500)' }}>
                {o.slug}
              </span>
              <span className="mono" style={{ fontSize: 12 }}>
                {formatSiren(o.siren)}
              </span>
              <span>
                <span className="pill gray" style={{ fontSize: 11 }}>
                  {o.plan ?? 'cabinet'}
                </span>
              </span>
              <span className="mono" style={{ fontSize: 12 }}>
                {o.memberships?.length ?? 0}
              </span>
              <span className="mono" style={{ fontSize: 12 }}>
                {o.dossiers?.length ?? 0}
              </span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>
                {formatDateFr(o.created_at)}
              </span>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
