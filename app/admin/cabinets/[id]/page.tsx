import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatusPill } from '@/components/cabinet/StatusPill';
import { formatDateFr, formatSiren } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  siren: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  inpi_username: string | null;
  inpi_env: string | null;
  plan: string | null;
  created_at: string;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  joined_at: string | null;
}

interface MemberProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface OrgDossierRow {
  id: string;
  reference: string | null;
  client_name: string;
  type_formalite: string;
  statut: string;
  created_at: string;
}

export default async function AdminCabinetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: org }, { data: members }, { data: dossiers }] =
    await Promise.all([
      supabase
        .from('organizations')
        .select(
          'id, name, slug, siren, contact_email, contact_phone, inpi_username, inpi_env, plan, created_at',
        )
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('memberships')
        .select('id, user_id, role, joined_at')
        .eq('organization_id', id)
        .order('joined_at', { ascending: true }),
      supabase
        .from('dossiers')
        .select(
          'id, reference, client_name, type_formalite, statut, created_at',
        )
        .eq('organization_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

  if (!org) notFound();
  const o = org as OrgDetail;
  const memberRows = (members ?? []) as MemberRow[];
  const dossierRows = (dossiers ?? []) as OrgDossierRow[];

  // Lookup profiles séparément (pas de FK directe memberships → profiles)
  const memberIds = memberRows.map((m) => m.user_id);
  const profileById = new Map<string, MemberProfile>();
  if (memberIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', memberIds);
    for (const p of (profs ?? []) as MemberProfile[]) {
      profileById.set(p.id, p);
    }
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          fontSize: 13,
          color: 'var(--ink-500)',
        }}
      >
        <Link href="/admin/cabinets" style={{ color: 'var(--ink-500)' }}>
          ← Cabinets
        </Link>
        <span>/</span>
        <span>{o.name}</span>
      </div>

      <div className="page-head">
        <div>
          <h1 style={{ margin: 0 }}>{o.name}</h1>
          <p style={{ marginTop: 4 }}>
            <span className="mono">{o.slug}</span>
            {' · '}
            <span className="mono">{formatSiren(o.siren)}</span>
            {' · Inscrit le '}
            {formatDateFr(o.created_at)}
          </p>
        </div>
        <button
          type="button"
          disabled
          className="btn btn-ghost"
          title="TODO : ajouter colonne archived_at à organizations"
          style={{
            cursor: 'not-allowed',
            opacity: 0.6,
            borderColor: 'var(--status-red)',
            color: 'var(--status-red)',
          }}
        >
          Désactiver
        </button>
      </div>

      <div className="detail-grid">
        <div style={{ display: 'grid', gap: 20 }}>
          <div className="app-card">
            <div className="app-card-head">
              <h3>Informations</h3>
            </div>
            <div>
              <KvRow label="Plan" value={o.plan ?? 'cabinet'} />
              <KvRow label="Email contact" value={o.contact_email ?? '—'} />
              <KvRow
                label="Téléphone"
                value={o.contact_phone ?? '—'}
              />
              <KvRow
                label="INPI mandataire"
                value={o.inpi_username ? `${o.inpi_username} (${o.inpi_env ?? 'prod'})` : 'non configuré'}
              />
              <KvRow
                label="Inscrit le"
                value={formatDateFr(o.created_at)}
                last
              />
            </div>
          </div>

          <div className="app-card">
            <div className="app-card-head">
              <h3>Membres ({memberRows.length})</h3>
            </div>
            {memberRows.length === 0 ? (
              <div
                style={{
                  padding: 32,
                  textAlign: 'center',
                  color: 'var(--ink-500)',
                  fontSize: 13,
                }}
              >
                Aucun membre.
              </div>
            ) : (
              <div
                className="app-table-head"
                style={{ gridTemplateColumns: '1fr 140px 140px' }}
              >
                <span>Membre</span>
                <span>Rôle</span>
                <span>Rejoint le</span>
              </div>
            )}
            {memberRows.map((m) => {
              const prof = profileById.get(m.user_id);
              const fullName = [prof?.first_name, prof?.last_name]
                .filter(Boolean)
                .join(' ');
              return (
                <div
                  key={m.id}
                  className="app-table-row"
                  style={{ gridTemplateColumns: '1fr 140px 140px' }}
                >
                  <span style={{ fontSize: 13 }}>
                    {fullName || (
                      <span className="mono">{m.user_id.slice(0, 8)}</span>
                    )}
                  </span>
                  <span>
                    <span className="pill violet" style={{ fontSize: 11 }}>
                      {m.role}
                    </span>
                  </span>
                  <span
                    className="mono"
                    style={{ fontSize: 11, color: 'var(--ink-500)' }}
                  >
                    {formatDateFr(m.joined_at)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="app-card">
            <div className="app-card-head">
              <h3>Derniers dossiers ({dossierRows.length})</h3>
            </div>
            {dossierRows.length === 0 ? (
              <div
                style={{
                  padding: 32,
                  textAlign: 'center',
                  color: 'var(--ink-500)',
                  fontSize: 13,
                }}
              >
                Aucun dossier pour ce cabinet.
              </div>
            ) : (
              <>
                <div
                  className="app-table-head"
                  style={{
                    gridTemplateColumns: '100px 1.4fr 1fr 120px 130px',
                  }}
                >
                  <span>Référence</span>
                  <span>Client</span>
                  <span>Type</span>
                  <span>Créé</span>
                  <span>Statut</span>
                </div>
                {dossierRows.map((d) => (
                  <Link
                    key={d.id}
                    href={`/admin/dossiers/${d.id}`}
                    className="app-table-row"
                    style={{
                      gridTemplateColumns: '100px 1.4fr 1fr 120px 130px',
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
                ))}
              </>
            )}
          </div>
        </div>

        <aside style={{ display: 'grid', gap: 20 }}>
          <div className="app-card">
            <div className="app-card-head">
              <h3>Stats</h3>
            </div>
            <div style={{ padding: 18, display: 'grid', gap: 12 }}>
              <Stat label="Membres" value={memberRows.length} />
              <Stat label="Dossiers (50 derniers)" value={dossierRows.length} />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function KvRow({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 22px',
        borderBottom: last ? 'none' : '1px solid var(--ink-100)',
        fontSize: 13,
        gap: 12,
      }}
    >
      <span style={{ color: 'var(--ink-500)' }}>{label}</span>
      <span
        style={{
          color: 'var(--ink-900)',
          fontWeight: 500,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--ink-500)', fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: 14 }}>{value}</span>
    </div>
  );
}
