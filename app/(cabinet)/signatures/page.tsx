import Link from 'next/link';
import { ArrowRight, FileSignature, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader, PageShell } from '@/components/cabinet/PageHeader';
import { EmptyState } from '@/components/cabinet/EmptyState';

export const dynamic = 'force-dynamic';

// Signatures électroniques de tous les dossiers du cabinet (dossiers.metadata.parcours) :
// signature des documents par le client, et signature de la formalité (qualifiée si exigée).
type Signature = { statut?: string; envoyee_le?: string; signee_le?: string; mode?: string; signataires?: unknown[]; documents?: unknown[] };
type Ligne = { dossierId: string; reference: string | null; client: string; nature: 'documents' | 'formalite'; s: Signature };

const STATUTS: Record<string, { label: string; className: string }> = {
  envoyee: { label: 'Envoyée', className: 'bg-warning/15 text-warning' },
  en_cours: { label: 'En cours', className: 'bg-warning/15 text-warning' },
  signee: { label: 'Signée', className: 'bg-success/15 text-success' },
  refusee: { label: 'Refusée', className: 'bg-destructive/10 text-destructive' },
  expiree: { label: 'Expirée', className: 'bg-destructive/10 text-destructive' },
  annulee: { label: 'Annulée', className: 'bg-muted text-muted-foreground' },
  versement_incomplet: { label: 'Signée · versement à reprendre', className: 'bg-warning/15 text-warning' },
  erreur_inpi: { label: 'Erreur Guichet unique', className: 'bg-destructive/10 text-destructive' },
};

const DEMANDE = encodeURIComponent('Rédige uniquement les documents (statuts, PV, pouvoir…) pour un client et prépare-les pour la signature électronique, sans formalité au Guichet unique.');

export default async function SignaturesPage() {
  const supabase = await createClient();
  const { data: dossiers } = await supabase
    .from('dossiers')
    .select('id, reference, client_name, metadata')
    .order('created_at', { ascending: false })
    .limit(500);

  const lignes: Ligne[] = [];
  for (const d of dossiers ?? []) {
    const p = (d.metadata as { parcours?: { signature_client?: Signature; signature_inpi?: Signature } } | null)?.parcours ?? {};
    const base = { dossierId: d.id as string, reference: d.reference as string | null, client: d.client_name as string };
    if (p.signature_client?.statut) lignes.push({ ...base, nature: 'documents', s: p.signature_client });
    if (p.signature_inpi?.statut) lignes.push({ ...base, nature: 'formalite', s: p.signature_inpi });
  }
  const date = (l: Ligne) => l.s.signee_le ?? l.s.envoyee_le ?? '';
  lignes.sort((a, b) => date(b).localeCompare(date(a)));

  return (
    <PageShell>
      <PageHeader
        eyebrow="Intelligence"
        title="Signature électronique"
        description="Les documents envoyés en signature à vos clients et les formalités signées électroniquement, qualifiée (eIDAS) quand la formalité l’exige."
        actions={
          <Button asChild>
            <Link href={`/dashboard?demande=${DEMANDE}`}>
              Préparer des documents à signer <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="gap-1 px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><FileSignature className="size-4 text-primary" /> Signature des documents</p>
          <p className="text-sm text-muted-foreground">Statuts, PV, pouvoirs : envoyés au client depuis l’étape « Signature » d’un dossier, signés à distance.</p>
        </Card>
        <Card className="gap-1 px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-primary" /> Signature de la formalité</p>
          <p className="text-sm text-muted-foreground">La déclaration au Guichet unique, signée au niveau exigé : simple, avancée ou qualifiée (eIDAS).</p>
        </Card>
      </div>

      {lignes.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="Aucune signature pour le moment"
          description="Les demandes de signature partent depuis les étapes d’un dossier, à droite du chat de l’agent. Elles apparaîtront ici avec leur suivi."
        />
      ) : (
        <Card className="gap-0 py-0">
          <CardContent className="divide-y p-0">
            {lignes.map((l) => {
              const st = STATUTS[l.s.statut ?? ''] ?? { label: l.s.statut ?? '—', className: 'bg-muted text-muted-foreground' };
              const quand = date(l);
              return (
                <Link key={`${l.dossierId}-${l.nature}`} href={`/dossiers/${l.dossierId}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-soft-foreground">
                    {l.nature === 'documents' ? <FileSignature className="size-4" /> : <ShieldCheck className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {l.nature === 'documents' ? 'Signature des documents' : 'Signature de la formalité'}
                      {l.nature === 'documents' && l.s.documents?.length ? ` · ${l.s.documents.length} document(s)` : ''}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{l.client}{l.reference ? ` · ${l.reference}` : ''}</span>
                  </span>
                  <Badge className={st.className}>{st.label}</Badge>
                  <span className="hidden w-24 text-right text-xs text-muted-foreground md:block">{quand ? formatDate(quand) : ''}</span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
