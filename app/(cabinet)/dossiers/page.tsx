import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/cabinet/StatCard';
import { FilterBar } from '@/components/cabinet/FilterBar';
import { StatusBadge } from '@/components/cabinet/StatusBadge';
import { formatDate, typeFormaliteLabel, formeJuridiqueLabel } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

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
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dossiers</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} dossier{rows.length > 1 ? 's' : ''}
            {(sp.type || sp.statut || sp.forme || sp.q) ? ' (filtré)' : ''}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle current={view} />
          <Button asChild>
            <Link href="/dossiers/new">
              <Plus className="size-4" />
              Nouvelle formalité
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <StatCard count={counts.enCours}      label="Formalités" sublabel="En cours"                tone="gray"   href="/dossiers?statut=AWAITING_VALIDATION" />
        <StatCard count={counts.enSignature}  label="Formalités" sublabel="En signature"            tone="violet" href="/dossiers?statut=SIGNATURE_PENDING" />
        <StatCard count={counts.enTraitement} label="Formalités" sublabel="En cours de traitement"  tone="amber"  href="/dossiers?statut=AMENDMENT_PENDING" />
        <StatCard count={counts.enAttente}    label="Formalités" sublabel="En attente du greffe"    tone="orange" href="/dossiers?statut=PAYMENT_PENDING" />
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
  const linkClass = (active: boolean) =>
    cn(
      'rounded-md px-3.5 py-1.5 text-xs font-medium no-underline transition-colors',
      active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
    );
  return (
    <div className="inline-flex rounded-lg bg-muted p-0.5">
      <Link href="/dossiers?view=table" className={linkClass(current === 'table')}>
        Liste
      </Link>
      <Link href="/dossiers?view=kanban" className={linkClass(current === 'kanban')}>
        Kanban
      </Link>
    </div>
  );
}

function TableView({ rows }: { rows: DossierRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Aucun dossier ne correspond.{' '}
          <Link href="/dossiers/new" className="font-medium text-primary hover:underline">
            Créer un dossier
          </Link>
          .
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-36">Référence</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Forme</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-28 text-right">MAJ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((d) => (
            <TableRow key={d.id} className="relative">
              <TableCell className="font-mono text-xs text-muted-foreground">
                {/* Lien plein-rang : couvre toute la ligne via l'overlay */}
                <Link href={`/dossiers/${d.id}`} className="absolute inset-0" aria-label={d.client_name} />
                {d.reference}
              </TableCell>
              <TableCell className="font-medium">{d.client_name}</TableCell>
              <TableCell className="text-muted-foreground">{typeFormaliteLabel(d.type_formalite)}</TableCell>
              <TableCell className="text-muted-foreground">
                {formeJuridiqueLabel(d.forme_juridique || undefined) || '—'}
              </TableCell>
              <TableCell>
                <StatusBadge statut={d.statut} />
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {formatDate(d.updated_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
    <div className="grid gap-3.5 overflow-x-auto md:grid-cols-3 xl:grid-cols-5">
      {columns.map((col) => {
        const items = rows.filter((r) => col.statuts.includes(r.statut));
        return (
          <div key={col.id} className="min-h-52 rounded-xl bg-muted/60 p-3">
            <div className="mb-2.5 flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-foreground/80">{col.title}</span>
              <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="grid gap-2">
              {items.map((d) => (
                <Link
                  key={d.id}
                  href={`/dossiers/${d.id}`}
                  className="block rounded-lg border bg-card p-3 no-underline transition-shadow hover:shadow-md"
                >
                  <p className="mb-1 text-xs font-medium text-foreground">{d.client_name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{d.reference}</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {typeFormaliteLabel(d.type_formalite)}
                    {d.forme_juridique && ` · ${formeJuridiqueLabel(d.forme_juridique)}`}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
