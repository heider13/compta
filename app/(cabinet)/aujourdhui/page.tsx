import Link from 'next/link';
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Landmark,
  ListChecks,
  Megaphone,
  PenLine,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDate, typeFormaliteLabel } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageShell } from '@/components/cabinet/PageHeader';
import { Propositions, type Proposition } from '@/components/cabinet/aujourdhui/Propositions';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Vue « Aujourd'hui » : sur un seul écran, ce qui attend une action du cabinet. Lue dans les
// données déjà enregistrées (statuts des dossiers, parcours de signature et d'annonce, tâches),
// plus les échéances préparées chaque lundi (propositions, décidées par le cabinet).

type Ton = 'urgent' | 'attente' | 'info';
type Ligne = { cle: string; href: string; titre: string; detail: string; badge: string; ton: Ton; date?: string | null };

type Signature = { statut?: string; envoyee_le?: string; signee_le?: string; erreur?: string };
type Publication = { reference: string; statut: string; journal?: { nom?: string } | null };
type Meta = {
  parcours?: {
    signature_client?: Signature;
    signature_inpi?: Signature;
    annonce?: { publications?: Publication[] };
  };
} | null;

type DossierRow = {
  id: string;
  reference: string | null;
  client_name: string;
  type_formalite: string;
  statut: string;
  updated_at: string | null;
  tags: string[] | null;
  metadata: Meta;
};

type TacheRow = {
  id: string;
  title: string;
  due_date: string | null;
  dossiers: { id: string; reference: string | null; client_name: string } | null;
};

const TON: Record<Ton, string> = {
  urgent: 'bg-destructive/10 text-destructive',
  attente: 'bg-warning/15 text-warning',
  info: 'bg-brand-soft text-brand-soft-foreground',
};

const GUICHET: Record<string, { badge: string; detail: string; ton: Ton }> = {
  REJECTED: { badge: 'Rejetée', detail: 'Rejetée par le greffe : voir les motifs et préparer la suite.', ton: 'urgent' },
  AMENDMENT_PENDING: { badge: 'Régularisation', detail: 'Le greffe demande une régularisation.', ton: 'urgent' },
  SIGNATURE_PENDING: { badge: 'À signer', detail: 'Formalité à signer sur le Guichet unique.', ton: 'attente' },
  PAYMENT_PENDING: { badge: 'À payer', detail: 'Frais du Guichet unique à régler.', ton: 'attente' },
};

const JOUR_MS = 86400000;
const ilYa = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / JOUR_MS);
const depuis = (iso?: string) => {
  if (!iso) return '';
  const j = ilYa(iso);
  return j <= 0 ? "aujourd'hui" : j === 1 ? 'hier' : `il y a ${j} jours`;
};
const sousTitre = (d: DossierRow) => `${d.client_name}${d.reference ? ` · ${d.reference}` : ''} · ${typeFormaliteLabel(d.type_formalite)}`;

function Section({ titre, description, icon: Icon, lignes }: { titre: string; description: string; icon: LucideIcon; lignes: Ligne[] }) {
  if (!lignes.length) return null;
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center gap-3 border-b px-5 py-4 [.border-b]:pb-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-soft-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <CardTitle className="text-sm">{titre}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{lignes.length}</span>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {lignes.map((l) => (
          <Link key={l.cle} href={l.href} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/50">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{l.titre}</span>
              <span className="block truncate text-xs text-muted-foreground">{l.detail}</span>
            </span>
            <Badge className={cn('shrink-0', TON[l.ton])}>{l.badge}</Badge>
            {l.date !== undefined && (
              <span className="hidden w-20 shrink-0 text-right text-xs text-muted-foreground md:block">{l.date ?? ''}</span>
            )}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function AujourdhuiPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const demain = new Date(Date.now() + JOUR_MS).toISOString().slice(0, 10);

  let tachesQuery = supabase
    .from('dossier_tasks')
    .select('id, title, due_date, dossiers(id, reference, client_name)')
    .eq('done', false)
    .not('due_date', 'is', null)
    .lte('due_date', demain)
    .order('due_date', { ascending: true })
    .limit(50);
  if (user) tachesQuery = tachesQuery.or(`assigned_to.eq.${user.id},assigned_to.is.null`);

  const [dossiersRes, tachesRes, propositionsRes] = await Promise.all([
    supabase
      .from('dossiers')
      .select('id, reference, client_name, type_formalite, statut, updated_at, tags, metadata')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(300),
    tachesQuery,
    supabase
      .from('propositions')
      .select('id, type, titre, detail, echeance, statut, demande_agent, client_id, dossier_id')
      .in('statut', ['proposee', 'acceptee'])
      .order('echeance', { ascending: true, nullsFirst: false })
      .limit(100),
  ]);

  const dossiers = ((dossiersRes.data ?? []) as DossierRow[]).filter((d) => !(d.tags ?? []).includes('archived'));
  const aValider: Ligne[] = [];
  const guichet: Ligne[] = [];
  const signatures: Ligne[] = [];
  const annonces: Ligne[] = [];

  for (const d of dossiers) {
    const href = `/dossiers/${d.id}`;
    const p = d.metadata?.parcours ?? {};
    if (d.statut === 'AWAITING_VALIDATION') {
      aValider.push({ cle: `v-${d.id}`, href, titre: d.client_name, detail: `${typeFormaliteLabel(d.type_formalite)}${d.reference ? ` · ${d.reference}` : ''} : brouillon prêt, à relire puis valider`, badge: 'À valider', ton: 'attente', date: d.updated_at ? formatDate(d.updated_at) : null });
    }
    const gu = GUICHET[d.statut];
    // Un rejet ancien n'attend plus d'action : 30 jours au plus
    if (gu && !(d.statut === 'REJECTED' && d.updated_at && ilYa(d.updated_at) > 30)) {
      guichet.push({ cle: `g-${d.id}`, href, titre: gu.detail, detail: sousTitre(d), badge: gu.badge, ton: gu.ton, date: d.updated_at ? formatDate(d.updated_at) : null });
    }
    if (p.signature_inpi?.statut === 'erreur_inpi') {
      guichet.push({ cle: `gs-${d.id}`, href, titre: 'Signature non acceptée par le Guichet unique', detail: sousTitre(d), badge: 'Erreur', ton: 'urgent' });
    }
    if (p.signature_client?.statut === 'versement_incomplet') {
      guichet.push({ cle: `gv-${d.id}`, href, titre: 'Actes signés à reverser au Guichet unique', detail: sousTitre(d), badge: 'À reprendre', ton: 'urgent' });
    }
    for (const [nature, s] of [['documents', p.signature_client], ['formalité', p.signature_inpi]] as const) {
      if (!s?.statut) continue;
      if (s.statut === 'envoyee' || s.statut === 'en_cours') {
        signatures.push({ cle: `s-${nature}-${d.id}`, href, titre: `Signature des ${nature === 'documents' ? 'documents' : 'la formalité'} — ${d.client_name}`, detail: `Envoyée ${depuis(s.envoyee_le)}, en attente du signataire`, badge: 'En attente', ton: 'info', date: s.envoyee_le ? formatDate(s.envoyee_le) : null });
      } else if (s.statut === 'refusee' || s.statut === 'expiree') {
        signatures.push({ cle: `s-${nature}-${d.id}`, href, titre: `Signature ${s.statut === 'refusee' ? 'refusée' : 'expirée'} — ${d.client_name}`, detail: 'À renvoyer depuis l’étape « Signature » du dossier', badge: s.statut === 'refusee' ? 'Refusée' : 'Expirée', ton: 'urgent' });
      }
    }
    for (const pub of p.annonce?.publications ?? []) {
      if (pub.statut === 'refused') {
        annonces.push({ cle: `a-${pub.reference}`, href, titre: `Annonce refusée par ${pub.journal?.nom ?? 'le journal'} — ${d.client_name}`, detail: `Référence ${pub.reference} : corriger l’annonce puis la commander à nouveau`, badge: 'Refusée', ton: 'urgent' });
      }
    }
  }

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const taches: Ligne[] = ((tachesRes.data ?? []) as unknown as TacheRow[]).map((t) => ({
    cle: `t-${t.id}`,
    href: t.dossiers ? `/dossiers/${t.dossiers.id}` : '/tasks',
    titre: t.title,
    detail: t.dossiers ? `${t.dossiers.client_name}${t.dossiers.reference ? ` · ${t.dossiers.reference}` : ''}` : 'Tâche',
    badge: (t.due_date ?? '') < aujourdhui ? 'En retard' : t.due_date === aujourdhui ? "Aujourd'hui" : 'Demain',
    ton: (t.due_date ?? '') < aujourdhui ? 'urgent' : 'attente',
    date: t.due_date ? formatDate(t.due_date) : null,
  }));

  const propositions = (propositionsRes.data ?? []) as Proposition[];
  const propositionsIndisponibles = Boolean(propositionsRes.error);
  const urgents = [...guichet, ...signatures, ...annonces, ...taches].filter((l) => l.ton === 'urgent').length;
  const total = aValider.length + guichet.length + signatures.length + annonces.length + taches.length;

  return (
    <PageShell className="max-w-5xl">
      <PageHeader
        eyebrow="Pilotage"
        title="Aujourd'hui"
        description={
          total === 0
            ? 'Rien n’attend votre action pour le moment.'
            : `${total} élément${total > 1 ? 's' : ''} attend${total > 1 ? 'ent' : ''} une action${urgents ? `, dont ${urgents} urgent${urgents > 1 ? 's' : ''}` : ''}.`
        }
      />

      <Propositions propositions={propositions} indisponible={propositionsIndisponibles} />

      {total === 0 ? (
        <Card className="items-center gap-2 px-6 py-12 text-center">
          <CheckCircle2 className="size-8 text-success" aria-hidden />
          <p className="text-sm font-medium">Tout est à jour</p>
          <p className="max-w-sm text-sm text-muted-foreground">Aucun brouillon à valider, aucune signature bloquée, aucune erreur du Guichet unique.</p>
        </Card>
      ) : (
        <div className="space-y-5">
          <Section titre="Guichet unique" description="Rejets, régularisations, signatures et paiements en attente" icon={Landmark} lignes={guichet} />
          <Section titre="Brouillons à valider" description="Préparés par l’agent, en attente de votre relecture" icon={ClipboardCheck} lignes={aValider} />
          <Section titre="Signatures" description="Refusées ou expirées à renvoyer, envoyées en attente du client" icon={PenLine} lignes={signatures} />
          <Section titre="Annonces légales" description="Annonces refusées par le journal" icon={Megaphone} lignes={annonces} />
          <Section titre="Tâches" description="En retard, du jour et de demain (les vôtres et les non assignées)" icon={ListChecks} lignes={taches} />
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="size-3.5" aria-hidden />
        Les échéances de la semaine sont préparées chaque lundi matin. Legaly ne fait que proposer : vous décidez.
      </p>
    </PageShell>
  );
}
