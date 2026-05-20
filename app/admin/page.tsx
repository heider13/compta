import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatusPill } from '@/components/cabinet/StatusPill';
import { formatDateFr } from '@/lib/types';

export const dynamic = 'force-dynamic';

const INPI_STATUSES = [
  'RECEIVED',
  'VALIDATION_PENDING',
  'VALIDATED',
  'AMENDMENT_PENDING',
];

interface RecentDossierRow {
  id: string;
  reference: string | null;
  client_name: string;
  type_formalite: string;
  statut: string;
  created_at: string;
  updated_at: string | null;
  organizations: { name: string } | null;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: cabinetsCount },
    { count: awaitingCount },
    { count: amendmentCount },
    { count: inpiCount },
    { data: recent },
  ] = await Promise.all([
    supabase.from('organizations').select('id', { count: 'exact', head: true }),
    supabase
      .from('dossiers')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'AWAITING_VALIDATION'),
    supabase
      .from('dossiers')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'INTERNAL_AMENDMENT_PENDING'),
    supabase
      .from('dossiers')
      .select('id', { count: 'exact', head: true })
      .in('statut', INPI_STATUSES),
    supabase
      .from('dossiers')
      .select(
        'id, reference, client_name, type_formalite, statut, created_at, updated_at, organizations(name)',
      )
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const recentRows = (recent ?? []) as unknown as RecentDossierRow[];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tableau de bord</h1>
          <p>Activité globale de la plateforme — tous cabinets confondus.</p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <KpiCard
          label="Cabinets actifs"
          value={cabinetsCount ?? 0}
          accent="#8B5CF6"
          href="/admin/cabinets"
        />
        <KpiCard
          label="Dossiers à valider"
          value={awaitingCount ?? 0}
          accent="#3B82F6"
          href="/admin/queue"
        />
        <KpiCard
          label="En correction"
          value={amendmentCount ?? 0}
          accent="#F59E0B"
          href="/admin/queue"
        />
        <KpiCard
          label="Total formalités déposées"
          value={inpiCount ?? 0}
          accent="#10B981"
          href="/admin/dossiers"
        />
      </div>

      <div className="app-card">
        <div className="app-card-head">
          <h3>Activité récente</h3>
          <Link href="/admin/dossiers" className="btn-link" style={{ fontSize: 13 }}>
            Voir tout →
          </Link>
        </div>
        <div>
          <div
            className="app-table-head"
            style={{
              gridTemplateColumns: '110px 1.4fr 1fr 0.8fr 130px 130px',
            }}
          >
            <span>Référence</span>
            <span>Client</span>
            <span>Cabinet</span>
            <span>Type</span>
            <span>Mis à jour</span>
            <span>Statut</span>
          </div>
          {recentRows.length === 0 ? (
            <div
              style={{
                padding: 48,
                textAlign: 'center',
                color: 'var(--ink-500)',
                fontSize: 14,
              }}
            >
              Aucun dossier pour l&apos;instant.
            </div>
          ) : (
            recentRows.map((d) => (
              <Link
                key={d.id}
                href={`/admin/dossiers/${d.id}`}
                className="app-table-row"
                style={{
                  gridTemplateColumns: '110px 1.4fr 1fr 0.8fr 130px 130px',
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
                <span style={{ color: 'var(--ink-700)', fontSize: 13 }}>
                  {d.type_formalite}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: 'var(--ink-500)' }}
                >
                  {formatDateFr(d.updated_at ?? d.created_at)}
                </span>
                <StatusPill statut={d.statut} />
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function KpiCard({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: number;
  accent: string;
  href?: string;
}) {
  const body = (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--ink-150)',
        borderRadius: 12,
        padding: 18,
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--ink-500)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 500,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: 'var(--ink-900)',
        }}
      >
        {value}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: 'none' }}>
      {body}
    </Link>
  ) : (
    body
  );
}
