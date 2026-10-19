import { FormalitesTabs } from '@/components/cabinet/FormalitesTabs';
import Link from 'next/link';
import {
  CheckCircle2,
  ClipboardCheck,
  Columns3,
  FolderOpen,
  List,
  Loader2,
  Plus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StatCard, StatStrip } from '@/components/cabinet/StatStrip';
import { PageShell } from '@/components/cabinet/PageHeader';
import { EmptyState } from '@/components/cabinet/EmptyState';
import { FilterBar } from '@/components/cabinet/FilterBar';
import { StatusBadge } from '@/components/cabinet/StatusBadge';
import { PaiementBadge, type Paiement } from '@/components/cabinet/Paiement';
import {
  formatDate,
  formatRelative,
  typeFormaliteLabel,
  formeJuridiqueLabel,
} from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const IN_PROGRESS_STATUSES = [
  'DRAFT',
  'AWAITING_VALIDATION',
  'INTERNAL_AMENDMENT_PENDING',
  'VALIDATED_INTERNAL',
  'RECEIVED',
  'VALIDATION_PENDING',
  'AMENDMENT_PENDING',
  'SIGNATURE_PENDING',
  'PAYMENT_PENDING',
];

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
  // Paiement au Guichet unique, recopié par le suivi des paiements (formalités déposées)
  metadata?: { inpi_paiement?: Paiement | null } | null;
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
  const total = allRows.length;
  const counts = {
    aValider: allRows.filter((d) => d.statut === 'AWAITING_VALIDATION').length,
    enCours: allRows.filter((d) => IN_PROGRESS_STATUSES.includes(d.statut)).length,
    valides: allRows.filter((d) => d.statut === 'VALIDATED').length,
  };

  const stats = [
    {
      label: 'Tous les dossiers',
      value: total,
      hint: 'Toutes formalités confondues',
      icon: FolderOpen,
      href: '/dossiers',
    },
    {
      label: 'À valider',
      value: counts.aValider,
      hint: 'En attente de validation',
      icon: ClipboardCheck,
      href: '/dossiers?statut=AWAITING_VALIDATION',
      highlight: true,
    },
    {
      label: 'En cours',
      value: counts.enCours,
      hint: 'Tous statuts actifs',
      icon: Loader2,
      href: '/dossiers',
    },
    {
      label: 'Validés',
      value: counts.valides,
      hint: 'Acceptés par l’INPI',
      icon: CheckCircle2,
      href: '/dossiers?statut=VALIDATED',
    },
  ];

  const isFiltered = Boolean(sp.type || sp.statut || sp.forme || sp.q);
  const view: 'table' | 'kanban' = sp.view === 'kanban' ? 'kanban' : 'table';

  return (
    <PageShell>
      <FormalitesTabs
        description="Toutes les formalités du cabinet : création, modification et radiation, du brouillon jusqu’à la validation INPI."
        actions={
          <Button asChild size="sm">
            <Link href="/dossiers/new">
              <Plus className="size-4" />
              Nouvelle formalité
            </Link>
          </Button>
        }
      />

      <StatStrip>
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </StatStrip>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground tabular-nums">
            <span className="text-foreground">{rows.length}</span> dossier{rows.length > 1 ? 's' : ''}
            {isFiltered && <span className="rounded border bg-muted px-1.5 py-px text-[10px] uppercase tracking-wide">filtré</span>}
          </p>
          <ViewToggle current={view} />
        </div>
        <FilterBar
          searchPlaceholder="Rechercher par client…"
          filters={[
            { key: 'type', label: 'Type', options: TYPE_OPTIONS },
            { key: 'statut', label: 'Statut', options: STATUT_OPTIONS },
            { key: 'forme', label: 'Forme jur.', options: FORME_OPTIONS },
          ]}
        />
      </div>

      {view === 'table' ? <ListView rows={rows} /> : <KanbanView rows={rows} />}
    </PageShell>
  );
}

function ViewToggle({ current }: { current: 'table' | 'kanban' }) {
  const linkClass = (active: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-medium no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      active ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
    );
  return (
    <div className="inline-flex rounded-md border bg-muted p-0.5" role="group" aria-label="Affichage">
      <Link href="/dossiers?view=table" className={linkClass(current === 'table')} aria-current={current === 'table' ? 'page' : undefined}>
        <List className="size-3.5" />
        Liste
      </Link>
      <Link href="/dossiers?view=kanban" className={linkClass(current === 'kanban')} aria-current={current === 'kanban' ? 'page' : undefined}>
        <Columns3 className="size-3.5" />
        Kanban
      </Link>
    </div>
  );
}

function ListView({ rows }: { rows: DossierRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="py-0">
        <EmptyState
          icon={FolderOpen}
          title="Aucun dossier ne correspond"
          description="Modifiez les filtres ou créez une nouvelle formalité."
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/dossiers/new">
                <Plus className="size-4" />
                Créer un dossier
              </Link>
            </Button>
          }
        />
      </Card>
    );
  }
  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      <div className="hidden items-center gap-3 border-b bg-muted/40 px-5 py-2 sm:flex">
        <span className="label-mono w-28 shrink-0">Référence</span>
        <span className="label-mono flex-1">Client · formalité</span>
        <span className="label-mono shrink-0">Statut</span>
        <span className="label-mono w-24 shrink-0 text-right">Mis à jour</span>
      </div>
      <ul className="divide-y">
        {rows.map((d) => (
          <li key={d.id}>
            <Link
              href={`/dossiers/${d.id}`}
              className="flex items-center gap-3 px-5 py-3 no-underline transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
            >
              <span className="hidden w-28 shrink-0 truncate font-mono text-xs text-muted-foreground sm:block">
                {d.reference ?? '—'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {d.client_name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {typeFormaliteLabel(d.type_formalite)}
                  {d.forme_juridique && ` · ${formeJuridiqueLabel(d.forme_juridique)}`}
                </span>
              </span>
              {d.metadata?.inpi_paiement && d.metadata.inpi_paiement.statut !== 'aucun' && (
                <span className="hidden shrink-0 md:block">
                  <PaiementBadge p={d.metadata.inpi_paiement} />
                </span>
              )}
              <span className="shrink-0">
                <StatusBadge statut={d.statut} />
              </span>
              <span
                className="hidden w-24 shrink-0 text-right font-mono text-[11px] text-muted-foreground tabular-nums sm:block"
                title={formatDate(d.updated_at)}
              >
                {formatRelative(d.updated_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
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
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
      {columns.map((col) => {
        const items = rows.filter((r) => col.statuts.includes(r.statut));
        return (
          <div key={col.id} className="min-h-52 min-w-0 rounded-xl border bg-muted/40 p-2">
            <div className="mb-2 flex items-center justify-between px-2 pt-1">
              <span className="label-mono">{col.title}</span>
              <span className="rounded-md border bg-background px-1.5 py-px font-mono text-[11px] text-muted-foreground tabular-nums">
                {items.length}
              </span>
            </div>
            <div className="grid gap-2">
              {items.map((d) => (
                <Link
                  key={d.id}
                  href={`/dossiers/${d.id}`}
                  className="block min-w-0 rounded-lg border bg-card p-3 no-underline shadow-xs transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="truncate text-sm font-medium text-foreground">{d.client_name}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{d.reference}</p>
                  <p className="mt-2 truncate text-[11px] text-muted-foreground">
                    {typeFormaliteLabel(d.type_formalite)}
                    {d.forme_juridique && ` · ${formeJuridiqueLabel(d.forme_juridique)}`}
                  </p>
                </Link>
              ))}
              {items.length === 0 && (
                <p className="rounded-lg border border-dashed px-3 py-6 text-center text-[11px] text-muted-foreground">Vide</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
