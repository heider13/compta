import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface AuditRow {
  id: string;
  created_at: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  organization_id: string | null;
  metadata: Record<string, unknown> | null;
  organizations: { name: string } | null;
}

interface AuditProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

const GRID = '160px 1fr 1fr 1fr 160px 100px';

interface SearchParams {
  org?: string;
  user?: string;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('audit_logs')
    .select(
      'id, created_at, user_id, action, resource_type, resource_id, organization_id, metadata, organizations(name)',
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (sp.org) query = query.eq('organization_id', sp.org);
  if (sp.user) query = query.eq('user_id', sp.user);

  const { data, error } = await query;
  const rows = (data ?? []) as unknown as AuditRow[];

  // Lookup profiles séparément
  const userIds = Array.from(
    new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id)),
  );
  const profileById = new Map<string, AuditProfile>();
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds);
    for (const p of (profs ?? []) as AuditProfile[]) {
      profileById.set(p.id, p);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Audit logs</h1>
          <p>
            {rows.length} évènement{rows.length > 1 ? 's' : ''} récent
            {rows.length > 1 ? 's' : ''}.
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
        <div className="form-field" style={{ minWidth: 240 }}>
          <label>Filtrer par organization_id</label>
          <input name="org" defaultValue={sp.org ?? ''} placeholder="UUID" />
        </div>
        <div className="form-field" style={{ minWidth: 240 }}>
          <label>Filtrer par user_id</label>
          <input name="user" defaultValue={sp.user ?? ''} placeholder="UUID" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-accent btn-sm">
            Filtrer
          </button>
          <Link href="/admin/audit" className="btn btn-ghost btn-sm">
            Reset
          </Link>
        </div>
      </form>

      <div className="app-card">
        <div className="app-table-head" style={{ gridTemplateColumns: GRID }}>
          <span>Quand</span>
          <span>Utilisateur</span>
          <span>Cabinet</span>
          <span>Action</span>
          <span>Resource</span>
          <span>Détails</span>
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
            Aucun évènement d&apos;audit.
          </div>
        ) : (
          rows.map((r) => {
            const prof = r.user_id ? profileById.get(r.user_id) : undefined;
            const fullName = [prof?.first_name, prof?.last_name]
              .filter(Boolean)
              .join(' ');
            return (
              <div
                key={r.id}
                className="app-table-row"
                style={{
                  gridTemplateColumns: GRID,
                  fontSize: 12,
                }}
              >
                <span
                  className="mono"
                  style={{ fontSize: 11, color: 'var(--ink-500)' }}
                >
                  {new Date(r.created_at).toLocaleString('fr-FR')}
                </span>
                <span>
                  {fullName ? (
                    fullName
                  ) : r.user_id ? (
                    <span className="mono">{r.user_id.slice(0, 8)}</span>
                  ) : (
                    '—'
                  )}
                </span>
                <span>{r.organizations?.name ?? '—'}</span>
                <span style={{ fontWeight: 500 }}>{r.action}</span>
                <span style={{ color: 'var(--ink-600)' }}>
                  {r.resource_type ?? '—'}
                  {r.resource_id ? (
                    <>
                      {' '}
                      <span className="mono" style={{ fontSize: 10 }}>
                        {r.resource_id.slice(0, 8)}
                      </span>
                    </>
                  ) : null}
                </span>
                <span>
                  {r.metadata ? (
                    <details>
                      <summary
                        style={{
                          cursor: 'pointer',
                          fontSize: 11,
                          color: 'var(--accent-ink)',
                        }}
                      >
                        Voir
                      </summary>
                      <pre
                        style={{
                          background: 'var(--ink-50)',
                          padding: 8,
                          fontSize: 10,
                          borderRadius: 6,
                          marginTop: 4,
                          overflow: 'auto',
                          maxWidth: 200,
                        }}
                      >
                        {JSON.stringify(r.metadata, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
