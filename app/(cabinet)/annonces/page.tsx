import Link from 'next/link';
import { ArrowRight, FileUp, Megaphone } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader, PageShell } from '@/components/cabinet/PageHeader';
import { EmptyState } from '@/components/cabinet/EmptyState';

export const dynamic = 'force-dynamic';

// Annonces légales rédigées par l'agent, tous dossiers du cabinet confondus
// (dossiers.metadata.annonces_legales : redigee → commandee → parue).
type Annonce = { type?: string; label?: string; statut?: string; created_at?: string; annonces?: { departement?: string }[]; a_completer?: string[] };
type Ligne = Annonce & { dossierId: string; reference: string | null; client: string };

const STATUTS: Record<string, { label: string; className: string }> = {
  redigee: { label: 'Rédigée', className: 'bg-brand-soft text-brand-soft-foreground' },
  commandee: { label: 'Commandée', className: 'bg-warning/15 text-warning' },
  parue: { label: 'Parue', className: 'bg-success/15 text-success' },
};

const DEMANDE = encodeURIComponent('Rédige uniquement l’annonce légale pour une société cliente, sans formalité au Guichet unique.');
const DEPUIS_DOCUMENT = encodeURIComponent('Rédige uniquement l’annonce légale à partir du document que je joins (statuts ou PV d’assemblée générale), sans formalité au Guichet unique.');

export default async function AnnoncesPage() {
  const supabase = await createClient();
  const { data: dossiers } = await supabase
    .from('dossiers')
    .select('id, reference, client_name, metadata')
    .order('created_at', { ascending: false })
    .limit(500);

  const lignes: Ligne[] = (dossiers ?? [])
    .flatMap((d) =>
      ((d.metadata as { annonces_legales?: Annonce[] } | null)?.annonces_legales ?? []).map((a) => ({
        ...a, dossierId: d.id as string, reference: d.reference as string | null, client: d.client_name as string,
      })),
    )
    .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));

  return (
    <PageShell>
      <PageHeader
        eyebrow="Intelligence"
        title="Annonces légales"
        description="Les annonces rédigées par l’IA pour vos dossiers, mentions obligatoires contrôlées. Rédigez-en une seule, sans formalité, ou à partir d’un document : statuts, PV d’AG."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/dashboard?demande=${DEPUIS_DOCUMENT}`}>
                <FileUp className="size-4" /> À partir d’un document
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/dashboard?demande=${DEMANDE}`}>
                Rédiger une annonce <ArrowRight className="size-4" />
              </Link>
            </Button>
          </>
        }
      />

      {lignes.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Aucune annonce légale pour le moment"
          description="Demandez une annonce à l’agent (constitution, modification, transfert de siège, dissolution…), ou joignez des statuts ou un PV d’AG : l’IA la rédige à partir du document. Elle apparaîtra ici."
          action={
            <Button asChild>
              <Link href={`/dashboard?demande=${DEMANDE}`}>Rédiger une annonce</Link>
            </Button>
          }
        />
      ) : (
        <Card className="gap-0 py-0">
          <CardContent className="divide-y p-0">
            {lignes.map((a, i) => {
              const s = STATUTS[a.statut ?? 'redigee'] ?? STATUTS.redigee;
              const departements = [...new Set((a.annonces ?? []).map((x) => x.departement).filter(Boolean))];
              return (
                <Link key={`${a.dossierId}-${i}`} href={`/dossiers/${a.dossierId}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-soft-foreground">
                    <Megaphone className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.label ?? 'Annonce légale'}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.client}{a.reference ? ` · ${a.reference}` : ''}{departements.length ? ` · département ${departements.join(', ')}` : ''}
                    </span>
                  </span>
                  {a.a_completer?.length ? <Badge variant="outline" className="hidden sm:inline-flex">{a.a_completer.length} à compléter</Badge> : null}
                  <Badge className={s.className}>{s.label}</Badge>
                  <span className="hidden w-24 text-right text-xs text-muted-foreground md:block">{a.created_at ? formatDate(a.created_at) : ''}</span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
