'use client';

// Dépôts de comptes annuels du compte Guichet unique du cabinet (lecture via le
// proxy VPS : GET /api/inpi/comptes). Liste filtrable et fiche détaillée
// (statut, greffe, observations, pièces, paiement, historique).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowLeft, BookOpenCheck, Bot, CheckCircle2, ExternalLink, FileText, Hourglass, Lock, RefreshCw, Search, XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/cabinet/PageHeader';
import { EmptyState } from '@/components/cabinet/EmptyState';
import { FormalitesTabs } from '@/components/cabinet/FormalitesTabs';
import { PaiementBadge, PaiementCard, type Paiement } from '@/components/cabinet/Paiement';

const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://0dao73k.cserverhost.cloud';

type Depot = {
  id: number;
  liasse: string | null;
  denomination: string | null;
  siren: string | null;
  annee: number | null;
  statut: string;
  statut_libelle: string;
  date_statut: string | null;
  cree_le: string | null;
  cloture: string | null;
  confidentialite: 'aucune' | 'totale' | 'compte_resultat' | 'simplifiee' | null;
  greffe: string | null;
  observation_greffe: string | null;
  motifs_rejet: string[];
  pieces: { type: string; libelle: string; confidentiel: boolean; conformite: string | null }[];
  paiement: Paiement | null;
  lien_guichet_unique: string;
  dossier?: { id: string; reference: string } | null;
  historique?: { statut: string; libelle: string; date: string }[];
};

const CONFIDENTIALITE: Record<string, string> = {
  aucune: 'Comptes publics',
  totale: 'Confidentialité totale',
  compte_resultat: 'Compte de résultat confidentiel',
  simplifiee: 'Présentation simplifiée',
};

const A_TRAITER = ['SIGNATURE_PENDING', 'PAYMENT_PENDING', 'AMENDMENT_PENDING', 'AMENDMENT_SIGNATURE_PENDING', 'AMENDMENT_PAYMENT_PENDING'];
const EN_COURS = ['RECEIVED', 'SIGNED', 'PAID', 'PAYMENT_VALIDATION_PENDING', 'VALIDATION_PENDING', 'AMENDED', 'AMENDMENT_PAID', 'AMENDMENT_PAYMENT_VALIDATION_PENDING'];

const FILTRES = [
  { key: 'tous', label: 'Tous' },
  { key: 'traiter', label: 'À traiter' },
  { key: 'cours', label: 'Chez le greffe' },
  { key: 'valides', label: 'Déposés' },
  { key: 'rejetes', label: 'Rejetés' },
] as const;
type Filtre = (typeof FILTRES)[number]['key'];

function filtrer(d: Depot, f: Filtre) {
  if (f === 'traiter') return A_TRAITER.includes(d.statut);
  if (f === 'cours') return EN_COURS.includes(d.statut);
  if (f === 'valides') return d.statut === 'VALIDATED';
  if (f === 'rejetes') return d.statut === 'REJECTED';
  return true;
}

const date = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

async function vps<T>(path: string): Promise<T> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Session expirée, reconnectez-vous.');
  const r = await fetch(`${VPS}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail || j.error || `Erreur ${r.status}`);
  return j as T;
}

function StatutBadge({ d }: { d: Pick<Depot, 'statut' | 'statut_libelle'> }) {
  const s = d.statut;
  const conf =
    s === 'VALIDATED' ? { cls: 'border-success/30 bg-success/10 text-success', icon: CheckCircle2 }
      : s === 'REJECTED' || s === 'EXPIRED' || s === 'CANCELED' ? { cls: 'border-destructive/30 bg-destructive/10 text-destructive', icon: XCircle }
        : A_TRAITER.includes(s) ? { cls: 'border-warning/40 bg-warning/10 text-warning', icon: AlertTriangle }
          : { cls: 'border-brand-border bg-brand-soft text-brand-soft-foreground', icon: Hourglass };
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium', conf.cls)}>
      <conf.icon className="size-3" /> {d.statut_libelle}
    </span>
  );
}

function Erreur({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}

export function ComptesAnnuels() {
  const router = useRouter();
  const [depots, setDepots] = useState<Depot[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [q, setQ] = useState('');

  const charger = async () => {
    setChargement(true);
    setErreur(null);
    try {
      const r = await vps<{ depots: Depot[] }>('/api/inpi/comptes?parPage=100');
      setDepots(r.depots);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  };
  useEffect(() => { void charger(); }, []);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return depots.filter((d) => filtrer(d, filtre) && (!t || [d.denomination, d.siren, d.liasse].some((v) => String(v ?? '').toLowerCase().includes(t))));
  }, [depots, filtre, q]);
  const nbTraiter = depots.filter((d) => A_TRAITER.includes(d.statut)).length;

  return (
    <div className="space-y-6">
      <FormalitesTabs
        description="Dépôts de comptes annuels de votre compte Guichet unique : statut au greffe, confidentialité et paiement."
        actions={
          <Button variant="outline" size="sm" onClick={() => void charger()} aria-label="Actualiser" disabled={chargement}>
            <RefreshCw className={cn('size-4', chargement && 'animate-spin')} />
            Actualiser
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-brand-border bg-brand-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-brand-border bg-background">
            <Bot className="size-4 text-primary" />
          </span>
          <p className="!m-0 text-sm text-foreground">
            Pour déposer des comptes, demandez-le à l’agent du tableau de bord en joignant le bilan, le compte de résultat et le PV d’approbation.
            Il vérifie les comptes (signature, équilibre actif/passif, résultat), la confidentialité et les délais, puis prépare le brouillon.
            Plusieurs sociétés ? Donnez-lui la liste.
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/dashboard">Ouvrir l’agent</Link>
        </Button>
      </div>

      {erreur && <Erreur>{erreur}</Erreur>}

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex max-w-full overflow-x-auto rounded-md border bg-muted p-0.5" role="group" aria-label="Filtrer les dépôts">
            {FILTRES.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFiltre(f.key)}
                aria-pressed={filtre === f.key}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  filtre === f.key ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
                {f.key === 'traiter' && nbTraiter > 0 && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] tabular-nums text-warning">
                    <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
                    {nbTraiter}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Société, SIREN, liasse…" aria-label="Rechercher un dépôt" className="h-9 bg-background pl-8" />
          </div>
        </div>

        {chargement ? (
          <div className="divide-y" aria-busy="true" aria-label="Lecture du Guichet unique">
            <p className="flex items-center gap-2 px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
              <span className="live-dot size-1.5 text-success" />
              Lecture du Guichet unique…
            </p>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="hidden h-3 w-20 sm:block" />
              </div>
            ))}
          </div>
        ) : !visibles.length ? (
          <EmptyState icon={BookOpenCheck} title={`Aucun dépôt de comptes${filtre !== 'tous' ? ' dans cette catégorie' : ''}.`} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 text-xs">Société</TableHead>
                <TableHead className="px-4 text-xs">Exercice</TableHead>
                <TableHead className="px-4 text-xs">Confidentialité</TableHead>
                <TableHead className="px-4 text-xs">Statut</TableHead>
                <TableHead className="px-4 text-xs">Paiement</TableHead>
                <TableHead className="px-4 text-xs">Mis à jour</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.map((d) => (
                <TableRow key={d.id} onClick={() => router.push(`/inpi/comptes/${d.id}`)} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="px-4 py-2.5">
                    <div className="font-medium">{d.denomination || '—'}</div>
                    <div className="font-mono text-[11px] text-muted-foreground tabular-nums">{d.siren ? d.siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : ''}{d.liasse ? ` · ${d.liasse}` : ''}</div>
                  </TableCell>
                  <TableCell className="px-4 py-2.5 text-xs">{d.cloture ? <>Clôture <span className="font-mono tabular-nums">{date(d.cloture)}</span></> : <span className="font-mono tabular-nums">{d.annee || '—'}</span>}</TableCell>
                  <TableCell className="px-4 py-2.5 text-xs">
                    {d.confidentialite && d.confidentialite !== 'aucune' && <Lock className="mr-1 inline size-3 text-primary" />}
                    {CONFIDENTIALITE[d.confidentialite || ''] || '—'}
                  </TableCell>
                  <TableCell className="px-4 py-2.5"><StatutBadge d={d} /></TableCell>
                  <TableCell className="px-4 py-2.5"><PaiementBadge p={d.paiement} /></TableCell>
                  <TableCell className="px-4 py-2.5 font-mono text-xs text-muted-foreground tabular-nums">{date(d.date_statut)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

export function ComptesAnnuelsDetail({ id }: { id: string }) {
  const [d, setD] = useState<Depot | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    vps<Depot>(`/api/inpi/comptes/${encodeURIComponent(id)}`).then(setD).catch((e) => setErreur((e as Error).message));
  }, [id]);

  const retour = (
    <Link href="/inpi/comptes" className="inline-flex items-center gap-1.5 text-inherit no-underline hover:text-foreground">
      <ArrowLeft className="size-3" /> Tous les dépôts de comptes
    </Link>
  );

  return (
    <div className="space-y-6">
      {!d && (
        <PageHeader eyebrow={retour} title="Dépôt de comptes annuels" />
      )}
      {erreur && <Erreur>{erreur}</Erreur>}
      {!d && !erreur && (
        <div className="space-y-3" aria-busy="true" aria-label="Chargement">
          <Skeleton className="h-4 w-64 max-w-full" />
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      )}
      {d && (
        <>
          <PageHeader
            eyebrow={retour}
            title={d.denomination || '—'}
            actions={
              <Button asChild variant="outline" size="sm">
                <a href={d.lien_guichet_unique} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> Ouvrir sur le Guichet unique</a>
              </Button>
            }
          >
            <p className="!m-0 text-sm text-muted-foreground">
              Comptes {d.cloture ? <>clos le <span className="font-mono tabular-nums">{date(d.cloture)}</span></> : <span className="font-mono tabular-nums">{d.annee}</span>} · <span className="font-mono">{d.liasse || `dépôt ${d.id}`}</span>{d.greffe ? ` · Greffe de ${d.greffe}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <StatutBadge d={d} />
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {d.confidentialite && d.confidentialite !== 'aucune' && <Lock className="size-3" />} {CONFIDENTIALITE[d.confidentialite || ''] || 'Confidentialité non précisée'}
              </span>
              {d.dossier && (
                <Link href={`/dossiers/${d.dossier.id}`} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] text-primary no-underline hover:bg-muted/50">
                  Dossier {d.dossier.reference}
                </Link>
              )}
            </div>
          </PageHeader>

          {(d.observation_greffe || d.motifs_rejet.length > 0) && (
            <Card className={cn('gap-0 py-0', d.statut === 'REJECTED' ? 'border-destructive/30 bg-destructive/10' : 'border-warning/40 bg-warning/10')}>
              <CardHeader className="px-5 pt-4 pb-2">
                <CardTitle className={cn('flex items-center gap-2 text-sm', d.statut === 'REJECTED' && 'text-destructive')}>
                  <AlertTriangle className={cn('size-4', d.statut === 'REJECTED' ? 'text-destructive' : 'text-warning')} />
                  Retour du greffe
                </CardTitle>
                {d.motifs_rejet.length > 0 && <CardDescription className="text-xs">{d.motifs_rejet.join(' · ')}</CardDescription>}
              </CardHeader>
              {d.observation_greffe && <CardContent className="px-5 pt-0 pb-4 text-sm whitespace-pre-line">{d.observation_greffe}</CardContent>}
              {!d.observation_greffe && <div className="pb-2" />}
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="min-w-0 space-y-6">
              <Card className="gap-0 py-0">
                <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    Pièces déposées
                    <span className="rounded-md border bg-muted px-1.5 py-px font-mono text-[11px] font-normal text-muted-foreground tabular-nums">{d.pieces.length}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {!d.pieces.length && <EmptyState icon={FileText} title="Aucune pièce." compact />}
                  <ul className="divide-y">
                    {d.pieces.map((p, i) => (
                      <li key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-muted-foreground" /> <span className="min-w-0">{p.libelle}</span></span>
                        <span className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                          {p.confidentiel && <span className="inline-flex items-center gap-1"><Lock className="size-3" /> confidentielle</span>}
                          {p.conformite === 'VALID' ? <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="size-3" />conforme</span> : p.conformite === 'NEW' ? 'à contrôler' : p.conformite?.toLowerCase()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              {!!d.historique?.length && (
                <Card className="gap-0 py-0">
                  <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4"><CardTitle className="text-sm">Historique</CardTitle></CardHeader>
                  <CardContent className="p-5">
                    <ol className="!m-0 space-y-3 !p-0">
                      {d.historique.map((h, i) => (
                        <li key={i} className="relative flex justify-between gap-3 border-l pl-4 text-sm">
                          <span className={cn('absolute -left-[3.5px] top-1.5 size-1.5 rounded-full', i === 0 ? 'bg-primary' : 'bg-muted-foreground/40')} aria-hidden="true" />
                          <span>{h.libelle}</span>
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">{date(h.date)}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              )}
            </div>
            {d.paiement && <PaiementCard p={{ ...d.paiement, guichet: { url: d.lien_guichet_unique, direct: true } }} liasse={d.liasse || String(d.id)} formalityId={d.id} comptes />}
          </div>
        </>
      )}
    </div>
  );
}
