import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatusPill } from '@/components/cabinet/StatusPill';
import { formatDateFr } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface QueueRow {
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

const GRID = '100px 1.3fr 1fr 90px 1fr 120px 130px';

export default async function AdminQueuePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dossiers')
    .select(
      'id, reference, client_name, type_formalite, forme_juridique, statut, created_at, updated_at, organizations(name)',
    )
    .in('statut', ['AWAITING_VALIDATION', 'INTERNAL_AMENDMENT_PENDING'])
    .order('created_at', { ascending: true });

  const rows = (data ?? []) as unknown as QueueRow[];
  const awaiting = rows.filter((r) => r.statut === 'AWAITING_VALIDATION');
  const amendment = rows.filter((r) => r.statut === 'INTERNAL_AMENDMENT_PENDING');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>À valider</h1>
          <p>
            {awaiting.length} dossier{awaiting.length > 1 ? 's' : ''} en attente
            · {amendment.length} en correction.
          </p>
        </div>
      </div>

      {error && (
        <div className="form-error" style={{ marginBottom: 16 }}>
          {error.message}
        </div>
      )}

      <Section title={`En attente de validation (${awaiting.length})`}>
        {awaiting.length === 0 ? (
          <Empty label="Aucun dossier en attente." />
        ) : (
          awaiting.map((d) => <QueueRowItem key={d.id} dossier={d} />)
        )}
      </Section>

      <div style={{ height: 20 }} />

      <Section title={`En correction (${amendment.length})`}>
        {amendment.length === 0 ? (
          <Empty label="Aucun dossier en correction." />
        ) : (
          amendment.map((d) => <QueueRowItem key={d.id} dossier={d} />)
        )}
      </Section>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-card">
      <div className="app-card-head">
        <h3>{title}</h3>
      </div>
      <div
        className="app-table-head"
        style={{ gridTemplateColumns: GRID }}
      >
        <span>Référence</span>
        <span>Client</span>
        <span>Cabinet</span>
        <span>Forme</span>
        <span>Type</span>
        <span>Soumis</span>
        <span>Statut</span>
      </div>
      {children}
    </div>
  );
}

function QueueRowItem({ dossier: d }: { dossier: QueueRow }) {
  return (
    <Link
      href={`/admin/dossiers/${d.id}`}
      className="app-table-row"
      style={{ gridTemplateColumns: GRID, textDecoration: 'none' }}
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
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: 40,
        textAlign: 'center',
        color: 'var(--ink-500)',
        fontSize: 13,
      }}
    >
      {label}
    </div>
  );
}
