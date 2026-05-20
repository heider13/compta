import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/cabinet/StatCard';
import { FilterBar } from '@/components/cabinet/FilterBar';
import { StatusPill } from '@/components/cabinet/StatusPill';
import { formatDate, typeFormaliteLabel, formeJuridiqueLabel } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

const TYPE_OPTIONS = [
  { value: 'CREATION',     label: 'Création' },
  { value: 'MODIFICATION', label: 'Modification' },
  { value: 'RADIATION',    label: 'Radiation' },
];

const STATUT_OPTIONS = [
  { value: 'DRAFT',                       label: 'Brouillon' },
  { value: 'AWAITING_VALIDATION',         label: 'À valider' },
  { value: 'INTERNAL_AMENDMENT_PENDING',  label: 'En correction' },
  { value: 'VALIDATED_INTERNAL',          label: 'Validé interne' },
  { value: 'RECEIVED',                    label: 'Reçu INPI' },
  { value: 'VALIDATION_PENDING',          label: 'Validation INPI' },
  { value: 'AMENDMENT_PENDING',           label: 'Régularisation' },
  { value: 'SIGNATURE_PENDING',           label: 'En signature' },
  { value: 'PAYMENT_PENDING',             label: 'En paiement' },
  { value: 'VALIDATED',                   label: 'Validé INPI' },
  { value: 'REJECTED',                    label: 'Rejeté' },
];

const FORME_OPTIONS = [
  { value: 'AE',      label: 'Auto-entreprise' },
  { value: 'SASU',    label: 'SASU' },
  { value: 'SAS',     label: 'SAS' },
  { value: 'EURL',    label: 'EURL' },
  { value: 'SARL',    label: 'SARL' },
  { value: 'SCI',     label: 'SCI' },
  { value: 'HOLDING', label: 'Holding' },
];

interface SearchParams {
  type?: string;
  statut?: string;
  forme?: string;
  q?: string;
  view?: 'table' | 'kanban';
}

interface DossierRow {
  id: string;
  reference: string;
  client_name: string;
  type_formalite: string;
  forme_juridique: string | null;
  statut: string;
  updated_at: string;
}

export default async function DossiersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase.from('dossiers').select('*').order('updated_at', { ascending: false });
  if (sp.type) query = query.eq('type_formalite', sp.type);
  if (sp.statut) query = query.eq('statut', sp.statut);
  if (sp.forme) query = query.eq('forme_juridique', sp.forme);
  if (sp.q) query = query.ilike('client_name', `%${sp.q}%`);

  const { data: items } = await query;
  const rows = (items ?? []) as DossierRow[];

  const { data: all } = await supabase.from('dossiers').select('statut');
  const allRows = all ?? [];
  const counts = {
    enCours: allRows.filter((d) => ['DRAFT', 'AWAITING_VALIDATION', 'INTERNAL_AMENDMENT_PENDING', 'VALIDATED_INTERNAL'].includes(d.statut)).length,
    enSignature: allRows.filter((d) => d.statut === 'SIGNATURE_PENDING').length,
    enTraitement: allRows.filter((d) => ['RECEIVED', 'VALIDATION_PENDING', 'AMENDMENT_PENDING'].includes(d.statut)).length,
    enAttente: allRows.filter((d) => d.statut === 'PAYMENT_PENDING').length,
  };

  const view: 'table' | 'kanban' = sp.view === 'kanban' ? 'kanban' : 'table';

  return (
    <div className="app-content with-bg">
      <div className="page-head">
        <div>
          <h1>Dossiers</h1>
          <p>{rows.length} dossier{rows.length > 1 ? 's' : ''}{(sp.type || sp.statut || sp.forme || sp.q) ? ' (filtré)' : ''}.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ViewToggle current={view} />
          <Link href="/dossiers/new" className="btn btn-accent">+ Nouvelle formalité</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard count={counts.enCours}     label="Formalités" sublabel="En cours"               tone="gray"   href="/dossiers?statut=AWAITING_VALIDATION" />
        <StatCard count={counts.enSignature} label="Formalités" sublabel="En signature"           tone="violet" href="/dossiers?statut=SIGNATURE_PENDING" />
        <StatCard count={counts.enTraitement} label="Formalités" sublabel="En cours de traitement" tone="amber"  href="/dossiers?statut=AMENDMENT_PENDING" />
        <StatCard count={counts.enAttente}   label="Formalités" sublabel="En attente du greffe"    tone="orange" href="/dossiers?statut=PAYMENT_PENDING" />
      </div>

      <FilterBar
        searchPlaceholder="Rechercher par client…"
        filters={[
          { key: 'type', label: 'Type', options: TYPE_OPTIONS },
          { key: 'statut', label: 'Statut', options: STATUT_OPTIONS },
          { key: 'forme', label: 'Forme jur.', options: FORME_OPTIONS },
        ]}
      />

      {view === 'table' ? <TableView rows={rows} /> : <KanbanView rows={rows} />}
    </div>
  );
}

function ViewToggle({ current }: { current: 'table' | 'kanban' }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--ink-100)', borderRadius: 8, padding: 3 }}>
      <Link href="/dossiers?view=table" style={tStyle(current === 'table')}>Liste</Link>
      <Link href="/dossiers?view=kanban" style={tStyle(current === 'kanban')}>Kanban</Link>
    </div>
  );
}

function tStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    background: active ? 'white' : 'transparent',
    color: active ? 'var(--ink-900)' : 'var(--ink-600)',
    textDecoration: 'none',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
  };
}

function TableView({ rows }: { rows: DossierRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="app-card" style={{ padding: 48, textAlign: 'center', color: 'var(--ink-500)', fontSize: 14 }}>
        Aucun dossier ne correspond. <Link href="/dossiers/new" style={{ color: 'var(--accent-ink)' }}>Créer un dossier</Link>.
      </div>
    );
  }
  return (
    <div className="app-card" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1.4fr 0.9fr 0.7fr 0.9fr 110px', padding: '12px 18px', background: 'var(--ink-50)', borderBottom: '1px solid var(--ink-150)', fontSize: 11, fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <span>Référence</span><span>Client</span><span>Type</span><span>Forme</span><span>Statut</span><span>MAJ</span>
      </div>
      {rows.map((d) => (
        <Link
          key={d.id}
          href={`/dossiers/${d.id}`}
          style={{
            display: 'grid',
            gridTemplateColumns: '140px 1.4fr 0.9fr 0.7fr 0.9fr 110px',
            padding: '14px 18px',
            alignItems: 'center',
            gap: 12,
            borderBottom: '1px solid var(--ink-100)',
            fontSize: 13,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <span className="mono" style={{ fontSize: 12, color: 'var(--ink-500)' }}>{d.reference}</span>
          <span style={{ fontWeight: 500, color: 'var(--ink-900)' }}>{d.client_name}</span>
          <span style={{ color: 'var(--ink-700)' }}>{typeFormaliteLabel(d.type_formalite)}</span>
          <span style={{ color: 'var(--ink-600)' }}>{formeJuridiqueLabel(d.forme_juridique || undefined) || '—'}</span>
          <StatusPill statut={d.statut} />
          <span className="mono" style={{ color: 'var(--ink-500)', fontSize: 11 }}>{formatDate(d.updated_at)}</span>
        </Link>
      ))}
    </div>
  );
}

function KanbanView({ rows }: { rows: DossierRow[] }) {
  const columns = [
    { id: 'DRAFT',                title: 'Brouillons',     statuts: ['DRAFT'] },
    { id: 'AWAITING_VALIDATION',  title: 'À valider',      statuts: ['AWAITING_VALIDATION'] },
    { id: 'CORRECTION',           title: 'En correction',  statuts: ['INTERNAL_AMENDMENT_PENDING'] },
    { id: 'INPI',                 title: "À l'INPI",       statuts: ['RECEIVED', 'VALIDATION_PENDING', 'AMENDMENT_PENDING', 'SIGNATURE_PENDING', 'PAYMENT_PENDING'] },
    { id: 'DONE',                 title: 'Validés',        statuts: ['VALIDATED'] },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, overflow: 'auto' }}>
      {columns.map((col) => {
        const items = rows.filter((r) => col.statuts.includes(r.statut));
        return (
          <div key={col.id} style={{ background: 'var(--ink-50)', borderRadius: 12, padding: 12, minHeight: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '0 4px' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-700)' }}>{col.title}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>{items.length}</span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {items.map((d) => (
                <Link key={d.id} href={`/dossiers/${d.id}`} className="app-card" style={{ padding: 12, textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-900)', marginBottom: 4 }}>{d.client_name}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{d.reference}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 6 }}>
                    {typeFormaliteLabel(d.type_formalite)}{d.forme_juridique && ` · ${formeJuridiqueLabel(d.forme_juridique)}`}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
