'use client';

// Groupes de sociétés (holding, filiales, sous-filiales) : liste, création à
// partir du SIREN de la tête (arbre découvert au RNE par le serveur), arbre
// éditable (pourcentages, mandats), points d'attention et suivi consolidé.

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowLeft, Bot, Building2, CalendarClock, Check, ChevronDown, ChevronRight, Info, Loader2, Network,
  Plus, RefreshCw, Search, Trash2, XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/cabinet/PageHeader';
import { EmptyState } from '@/components/cabinet/EmptyState';
import { cn } from '@/lib/utils';

// Bandeau d'erreur commun (tokens d'état, plus de couleurs en dur)
function Erreur({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="!m-0 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <XCircle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://0dao73k.cserverhost.cloud';

type GroupeResume = { id: string; nom: string; nb_entites: number; tete: string | null; updated_at: string };
type Entite = {
  id: string; siren: string | null; denomination: string; forme: string | null; ville: string | null;
  active: boolean; tete: boolean; source: string; a_verifier: boolean;
};
type Lien = {
  id: string; parent_id: string; enfant_id: string; pourcentage: string | number | null; droits_vote: string | number | null;
  direction: string | null; source: string; a_verifier: boolean;
};
type Controle = { niveau: 'erreur' | 'attention' | 'info'; entite_id: string; texte: string };
type Detail = {
  groupe: { id: string; nom: string; metadata?: { meres_possibles?: { siren: string; denomination: string; qualite: string | null }[]; tronque?: boolean } };
  entites: Entite[]; liens: Lien[]; controles: Controle[]; detentions: Record<string, number>;
};
type Suivi = {
  entite_id: string; siren: string | null;
  formalites_en_cours?: { id: number; liasse: string; type: string; statut: string }[];
  comptes?: { id: number; statut: string; annee: number; dernier_valide: number | null } | null;
  echeance_comptes?: { cloture: string; limite: string | null; en_retard: boolean; a_faire: boolean; premier_exercice?: boolean } | null;
  dossiers?: { id: string; reference: string; statut: string }[];
  erreur?: string;
  verification_en_attente?: boolean;
};

async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Session expirée, reconnectez-vous.');
  const r = await fetch(`${VPS}/api/groupes${path}`, {
    method: init?.method ?? 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.detail || j.error || `Erreur ${r.status}`), { groupe_id: j.groupe_id });
  return j as T;
}

const sirenFmt = (s: string | null) => (s ? s.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : 'sans SIREN');
const pct = (v: string | number | null | undefined) => (v == null || v === '' ? null : Math.round(Number(v) * 100) / 100);
const dateFr = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

// ─── Liste ────────────────────────────────────────────────────────

export function GroupesListe() {
  const router = useRouter();
  const [groupes, setGroupes] = useState<GroupeResume[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [siren, setSiren] = useState('');
  const [nom, setNom] = useState('');
  const [creation, setCreation] = useState(false);

  useEffect(() => {
    api<{ groupes: GroupeResume[] }>('').then((r) => setGroupes(r.groupes)).catch((e) => setErreur(e.message));
  }, []);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    const s = siren.replace(/\D/g, '');
    if (s.length !== 9) return setErreur('Le SIREN doit compter 9 chiffres.');
    setCreation(true);
    setErreur(null);
    try {
      const r = await api<{ groupe: { id: string } }>('', { method: 'POST', body: { siren: s, nom: nom.trim() || undefined } });
      router.push(`/groupes/${r.groupe.id}`);
    } catch (err) {
      const ge = (err as { groupe_id?: string }).groupe_id;
      if (ge) return router.push(`/groupes/${ge}`);
      setErreur((err as Error).message);
      setCreation(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Portefeuille"
        title="Groupes"
        description="Holdings, filiales et sous-filiales de vos clients : l’arbre du groupe, les détentions, les points d’attention et le suivi de chaque société."
      />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
          <CardTitle className="flex items-center gap-2 text-sm"><Network className="size-4 text-primary" /> Nouveau groupe</CardTitle>
          <CardDescription className="text-xs">
            Saisissez le SIREN de la société de tête. Les sociétés qu’elle dirige sont retrouvées au RNE, sur trois niveaux ; vous complétez ensuite les pourcentages de détention.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={creer} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={siren} onChange={(e) => setSiren(e.target.value)} placeholder="SIREN de la holding (9 chiffres)" aria-label="SIREN de la société de tête" inputMode="numeric" className="pl-9 font-mono tabular-nums placeholder:font-sans" disabled={creation} />
            </div>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom du groupe (facultatif)" aria-label="Nom du groupe" className="sm:w-64" disabled={creation} />
            <Button type="submit" disabled={creation}>
              {creation ? <><Loader2 className="size-4 animate-spin" /> Recherche des filiales au RNE…</> : <><Network className="size-4" /> Construire l’arbre</>}
            </Button>
          </form>
          {creation && (
            <p className="!m-0 mt-3 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="live-dot size-1.5 text-primary" aria-hidden="true" />
              Interrogation du RNE · mandats sur 3 niveaux
            </p>
          )}
        </CardContent>
      </Card>

      {erreur && <Erreur>{erreur}</Erreur>}

      {!groupes && !erreur && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-live="polite">
          <span className="sr-only">Chargement…</span>
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2 rounded-xl border bg-card p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      )}
      {groupes && !groupes.length && (
        <Card className="py-0">
          <EmptyState icon={Network} title="Aucun groupe pour l’instant" description="Saisissez le SIREN d’une holding ci-dessus pour construire son arbre." />
        </Card>
      )}
      {groupes && groupes.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groupes.map((g) => (
            <Link key={g.id} href={`/groupes/${g.id}`} className="group no-underline focus-visible:outline-none">
              <Card className="h-full gap-0 py-0 transition-colors group-hover:bg-muted/40 group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-md border bg-background">
                      <Network className="size-4 text-primary" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{g.nom}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
                  </div>
                  <p className="!m-0 truncate text-xs text-muted-foreground">Tête : {g.tete || '—'}</p>
                  <p className="!m-0 flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
                    <span className="tabular-nums">{g.nb_entites} société(s)</span>
                    <span className="tabular-nums">MAJ {dateFr(g.updated_at)}</span>
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Détail ───────────────────────────────────────────────────────

export function GroupeDetail({ id }: { id: string }) {
  const router = useRouter();
  const [d, setD] = useState<Detail | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [suivi, setSuivi] = useState<Map<string, Suivi> | null>(null);
  const [chargeSuivi, setChargeSuivi] = useState(false);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [replies, setReplies] = useState<Set<string>>(new Set());
  const [ajout, setAjout] = useState<{ parent: string } | null>(null);

  const recharger = () => api<Detail>(`/${id}`).then(setD).catch((e) => setErreur(e.message));
  useEffect(() => { void recharger(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function action(cle: string, fn: () => Promise<unknown>) {
    setOccupe(cle);
    setErreur(null);
    try { await fn(); await recharger(); } catch (e) { setErreur((e as Error).message); } finally { setOccupe(null); }
  }

  async function chargerSuivi() {
    setChargeSuivi(true);
    try {
      const r = await api<{ suivi: Suivi[] }>(`/${id}/suivi`);
      setSuivi(new Map(r.suivi.map((s) => [s.entite_id, s])));
    } catch (e) { setErreur((e as Error).message); } finally { setChargeSuivi(false); }
  }

  const arbre = useMemo(() => {
    if (!d) return null;
    const enfants = new Map<string, Lien[]>();
    const parents = new Map<string, Lien[]>();
    for (const l of d.liens) {
      enfants.set(l.parent_id, [...(enfants.get(l.parent_id) ?? []), l]);
      parents.set(l.enfant_id, [...(parents.get(l.enfant_id) ?? []), l]);
    }
    const parId = new Map(d.entites.map((e) => [e.id, e]));
    // Filiales par ordre alphabétique (sociétés cessées en dernier) : affichage stable
    const nomDe = (id: string) => `${parId.get(id)?.active === false ? '1' : '0'}${parId.get(id)?.denomination ?? ''}`;
    for (const l of enfants.values()) l.sort((a, b) => nomDe(a.enfant_id).localeCompare(nomDe(b.enfant_id), 'fr'));
    const racines = d.entites.filter((e) => e.tete || !parents.has(e.id));
    return { enfants, parents, parId, racines };
  }, [d]);

  const alertesPar = useMemo(() => {
    const m = new Map<string, Controle[]>();
    for (const c of d?.controles ?? []) if (c.niveau !== 'info') m.set(c.entite_id, [...(m.get(c.entite_id) ?? []), c]);
    return m;
  }, [d]);

  if (erreur && !d) return <Erreur>{erreur}</Erreur>;
  if (!d || !arbre) {
    return (
      <div className="space-y-6" role="status" aria-live="polite">
        <span className="sr-only">Chargement du groupe…</span>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="space-y-0 overflow-hidden rounded-xl border bg-card">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2 border-b px-4 py-3 last:border-0" style={{ paddingLeft: 16 + (i === 0 ? 0 : i < 3 ? 22 : 44) }}>
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="ml-auto h-6 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const manquants = d.liens.filter((l) => l.pourcentage == null).length;
  const aVerifier = d.liens.filter((l) => l.a_verifier).length;
  const retards = suivi ? [...suivi.values()].filter((s) => s.echeance_comptes?.en_retard).length : 0;
  const demande = encodeURIComponent(`Pour le groupe « ${d.groupe.nom} » : `);

  // Ligne d'une société dans l'arbre (récursive). `vu` évite les cycles ; une société
  // détenue par plusieurs mères est développée sous la première, rappelée ailleurs.
  const rendu = (e: Entite, lien: Lien | null, niveau: number, vu: Set<string>, premier: boolean): React.ReactNode => {
    const fils = arbre.enfants.get(e.id) ?? [];
    const replie = replies.has(e.id);
    const autresMeres = (arbre.parents.get(e.id) ?? []).filter((l) => l.parent_id !== lien?.parent_id);
    const s = suivi?.get(e.id);
    const alertes = alertesPar.get(e.id) ?? [];
    const cyclique = vu.has(e.id);
    return (
      <Fragment key={`${lien?.id ?? 'r'}-${e.id}`}>
        <div className={cn('group flex flex-col gap-2 border-b px-4 py-2.5 transition-colors last:border-0 hover:bg-muted/50 lg:flex-row lg:items-center', !e.active && 'opacity-60')}>
          <div className="flex min-w-0 flex-1 items-start gap-1.5" style={{ paddingLeft: niveau * 22 }}>
            {fils.length > 0 && premier && !cyclique ? (
              <button type="button" onClick={() => setReplies((p) => { const n = new Set(p); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n; })} className="mt-0.5 text-muted-foreground hover:text-foreground" aria-label={replie ? 'Déplier' : 'Replier'}>
                {replie ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
            ) : <span className="w-4 shrink-0" />}
            <span className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border', e.tete ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground')}>
              <Building2 className="size-3.5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium">{e.denomination}</span>
                {e.tete && <Badge variant="outline" className="h-5 border-brand-border bg-brand-soft px-1.5 text-[10px] text-brand-soft-foreground">tête</Badge>}
                {e.forme && <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal text-muted-foreground">{e.forme}</Badge>}
                {!e.active && <Badge variant="outline" className="h-5 border-destructive/30 bg-destructive/10 px-1.5 text-[10px] text-destructive">cessée</Badge>}
                {e.a_verifier && <Badge variant="outline" className="h-5 border-warning/40 bg-warning/10 px-1.5 text-[10px] text-warning">à vérifier</Badge>}
                {alertes.length > 0 && <span title={alertes.map((a) => a.texte).join('\n')} className="inline-flex h-5 items-center gap-0.5 rounded-md border border-warning/40 bg-warning/10 px-1.5 font-mono text-[10px] text-warning"><AlertTriangle className="size-3" /> {alertes.length}</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">{sirenFmt(e.siren)}</span>{e.ville ? ` · ${e.ville}` : ''}
                {!premier && ' · détaillée plus haut'}
                {premier && autresMeres.length > 0 && ` · aussi détenue par ${autresMeres.map((l) => arbre.parId.get(l.parent_id)?.denomination).join(', ')}`}
              </div>
            </div>
          </div>

          {lien && (
            <LienEditeur lien={lien} occupe={occupe === lien.id} onSave={(patch) => action(lien.id, () => api(`/${id}/liens`, { method: 'PUT', body: { parent_id: lien.parent_id, enfant_id: lien.enfant_id, ...patch } }))} />
          )}

          <div className="flex min-w-0 flex-wrap items-center gap-3 text-xs lg:max-w-[260px] lg:justify-end">
            {!e.tete && d.detentions[e.id] != null && <span className="text-muted-foreground" title="Détention indirecte par la tête du groupe">Tête : <strong className="font-mono font-semibold tabular-nums text-foreground">{d.detentions[e.id]} %</strong></span>}
            {s?.echeance_comptes && (
              <span className={cn('inline-flex items-center gap-1', s.echeance_comptes.en_retard ? 'text-destructive' : s.echeance_comptes.a_faire ? 'text-warning' : 'text-muted-foreground')} title={`Clôture ${dateFr(s.echeance_comptes.cloture)}`}>
                <CalendarClock className="size-3.5" />
                {s.echeance_comptes.premier_exercice ? `1re clôture ${dateFr(s.echeance_comptes.cloture)}` : s.echeance_comptes.a_faire ? `Comptes avant le ${dateFr(s.echeance_comptes.limite)}` : `Comptes à jour`}
              </span>
            )}
            {s?.verification_en_attente && <span className="inline-flex items-center gap-1.5 text-muted-foreground" title="Les comptes déposés sont relus au registre en arrière-plan"><span className="live-dot size-1.5 text-primary" aria-hidden="true" />Comptes : vérification au RNE…</span>}
            {s?.formalites_en_cours && s.formalites_en_cours.length > 0 && (
              <Link href={`/inpi/${s.formalites_en_cours[0].id}`} className="font-mono text-primary tabular-nums hover:underline">{s.formalites_en_cours.length} formalité(s)</Link>
            )}
            {premier && (
              <button type="button" onClick={() => setAjout({ parent: e.id })} className="rounded text-muted-foreground opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 group-hover:opacity-100" title="Ajouter une filiale" aria-label={`Ajouter une filiale à ${e.denomination}`}><Plus className="size-4" /></button>
            )}
            {!e.tete && premier && (
              <SupprimerBouton occupe={occupe === e.id} onConfirm={() => action(e.id, () => api(`/${id}/entites/${e.id}`, { method: 'DELETE' }))} />
            )}
          </div>
        </div>
        {ajout?.parent === e.id && (
          <AjoutFiliale
            parent={e} niveau={niveau + 1} occupe={occupe === 'ajout'}
            onAnnuler={() => setAjout(null)}
            onAjouter={(v) => action('ajout', async () => { await api(`/${id}/entites`, { method: 'POST', body: { ...v, parent_id: e.id } }); setAjout(null); })}
          />
        )}
        {premier && !replie && !cyclique && fils.map((l) => {
          const enf = arbre.parId.get(l.enfant_id);
          if (!enf) return null;
          const premierParent = (arbre.parents.get(enf.id) ?? [])[0]?.id === l.id;
          return rendu(enf, l, niveau + 1, new Set([...vu, e.id]), premierParent);
        })}
      </Fragment>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 space-y-1.5">
          <Link href="/groupes" className="label-mono inline-flex items-center gap-1 no-underline hover:text-foreground"><ArrowLeft className="size-3" /> Tous les groupes</Link>
          <NomGroupe nom={d.groupe.nom} onSave={(nom) => action('nom', () => api(`/${id}`, { method: 'PATCH', body: { nom } }))} />
          <p className="!m-0 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted-foreground tabular-nums">
            <span>{d.entites.length} société(s)</span>
            <span aria-hidden="true">·</span>
            <span>{d.liens.length} lien(s)</span>
            {manquants > 0 && <><span aria-hidden="true">·</span><span className="text-warning">{manquants} pourcentage(s) à compléter</span></>}
            {aVerifier > 0 && <><span aria-hidden="true">·</span><span>{aVerifier} lien(s) à vérifier</span></>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm"><Link href={`/dashboard?demande=${demande}`}><Bot className="size-4" /> Agir sur le groupe</Link></Button>
          <Button size="sm" variant="outline" onClick={() => void chargerSuivi()} disabled={chargeSuivi}>
            {chargeSuivi ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />} {suivi ? 'Actualiser le suivi' : 'Charger le suivi'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => action('redecouvrir', () => api(`/${id}/redecouvrir`, { method: 'POST', body: {} }))} disabled={occupe === 'redecouvrir'}>
            <RefreshCw className={cn('size-4', occupe === 'redecouvrir' && 'animate-spin')} /> Rechercher de nouvelles filiales
          </Button>
          <SupprimerBouton libelle="Supprimer le groupe" occupe={occupe === 'suppr'} onConfirm={() => action('suppr', async () => { await api(`/${id}`, { method: 'DELETE' }); router.push('/groupes'); })} />
        </div>
      </header>

      {erreur && <Erreur>{erreur}</Erreur>}

      {suivi && retards > 0 && (
        <p className="!m-0 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><AlertTriangle className="size-4 shrink-0" /> {retards} société(s) du groupe ont un dépôt de comptes en retard.</p>
      )}

      {suivi && [...suivi.values()].some((x) => x.verification_en_attente) && (
        <p className="!m-0 flex items-start gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <span className="live-dot mt-1.5 size-1.5 shrink-0 text-primary" aria-hidden="true" /> <span><span className="font-mono tabular-nums text-foreground">{[...suivi.values()].filter((x) => x.verification_en_attente).length}</span> société(s) en cours de vérification au registre (comptes déposés), une toutes les 10 secondes pour respecter les limites du RNE. Actualisez le suivi dans quelques minutes.</span>
        </p>
      )}

      <div className="grid gap-6 2xl:grid-cols-[1fr_360px]">
        <Card className="min-w-0 gap-0 py-0">
          <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
            <CardTitle className="text-sm">Arbre du groupe</CardTitle>
            <CardDescription className="text-xs">Liens trouvés au RNE à partir des mandats exercés par les sociétés du groupe. Complétez les pourcentages de détention (non publics) : ils servent aux contrôles et à la détention indirecte.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <div>{arbre.racines.map((r) => rendu(r, null, 0, new Set(), true))}</div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4"><CardTitle className="text-sm">Points d’attention</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 p-5">
              {!d.controles.length && <p className="!m-0 flex items-center gap-2 text-sm text-muted-foreground"><Check className="size-4 text-success" /> Aucun point relevé.</p>}
              {manquants > 0 && (
                <div className="flex gap-2 text-sm"><Info className="mt-0.5 size-4 shrink-0 text-primary" /><span>{manquants} pourcentage(s) de détention à compléter dans l’arbre (non publics : statuts, PV, liste des filiales et participations).</span></div>
              )}
              {d.controles.filter((c) => !/non renseigné/.test(c.texte)).sort((a, b) => ['erreur', 'attention', 'info'].indexOf(a.niveau) - ['erreur', 'attention', 'info'].indexOf(b.niveau)).slice(0, 25).map((c, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  {c.niveau === 'erreur' ? <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" /> : c.niveau === 'attention' ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> : <Info className="mt-0.5 size-4 shrink-0 text-primary" />}
                  <span>{c.texte}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          {!!d.groupe.metadata?.meres_possibles?.length && (
            <Card className="gap-0 py-0">
              <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
                <CardTitle className="text-sm">Société mère possible</CardTitle>
                <CardDescription className="text-xs">Dirigeant personne morale de la tête : le groupe peut remonter plus haut.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y p-0 text-sm">
                {d.groupe.metadata.meres_possibles.map((m) => <div key={m.siren} className="px-5 py-3">{m.denomination} <span className="text-xs text-muted-foreground">(<span className="font-mono tabular-nums">{sirenFmt(m.siren)}</span>{m.qualite ? ` · ${m.qualite}` : ''})</span></div>)}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Petits composants ────────────────────────────────────────────

function LienEditeur({ lien, occupe, onSave }: { lien: Lien; occupe: boolean; onSave: (p: { pourcentage?: number | null; direction?: string | null }) => void }) {
  const [valeur, setValeur] = useState(pct(lien.pourcentage)?.toString() ?? '');
  useEffect(() => setValeur(pct(lien.pourcentage)?.toString() ?? ''), [lien.pourcentage]);
  const enregistrer = () => {
    const v = valeur.trim() === '' ? null : Number(valeur.replace(',', '.'));
    if (v !== null && (Number.isNaN(v) || v < 0 || v > 100)) return setValeur(pct(lien.pourcentage)?.toString() ?? '');
    if (v !== pct(lien.pourcentage)) onSave({ pourcentage: v });
  };
  return (
    <div className="flex shrink-0 items-center gap-2 text-xs lg:w-[330px]">
      <label className="flex items-center gap-1">
        <span className="whitespace-nowrap text-muted-foreground">Détenue à</span>
        <input
          value={valeur} onChange={(e) => setValeur(e.target.value)} onBlur={enregistrer} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          inputMode="decimal" placeholder="?" aria-label="Pourcentage de détention"
          className={cn('h-7 w-16 rounded-md border bg-background px-2 text-right font-mono tabular-nums shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50', lien.pourcentage == null && 'border-warning/40 bg-warning/10')}
        />
        <span>%</span>
      </label>
      {lien.direction && <span className="truncate text-muted-foreground" title={`Mandat : ${lien.direction}`}>{lien.direction}</span>}
      {occupe ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : lien.a_verifier && (
        <button type="button" onClick={() => onSave({})} className="inline-flex items-center gap-0.5 text-primary hover:underline" title="Le lien trouvé au RNE est exact"><Check className="size-3.5" /> Confirmer le lien</button>
      )}
    </div>
  );
}

function SupprimerBouton({ onConfirm, occupe, libelle }: { onConfirm: () => void; occupe: boolean; libelle?: string }) {
  const [confirme, setConfirme] = useState(false);
  useEffect(() => { if (!confirme) return; const t = setTimeout(() => setConfirme(false), 4000); return () => clearTimeout(t); }, [confirme]);
  if (occupe) return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  if (libelle) {
    return (
      <Button size="sm" variant={confirme ? 'destructive' : 'ghost'} onClick={() => (confirme ? onConfirm() : setConfirme(true))}>
        <Trash2 className="size-4" /> {confirme ? 'Confirmer la suppression' : libelle}
      </Button>
    );
  }
  return (
    <button type="button" onClick={() => (confirme ? onConfirm() : setConfirme(true))} className={cn('rounded text-xs', confirme ? 'font-medium text-destructive' : 'text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100')} title="Retirer du groupe" aria-label="Retirer du groupe">
      {confirme ? 'Retirer ?' : <Trash2 className="size-4" />}
    </button>
  );
}

function AjoutFiliale({ parent, niveau, occupe, onAnnuler, onAjouter }: {
  parent: Entite; niveau: number; occupe: boolean; onAnnuler: () => void;
  onAjouter: (v: { siren?: string; denomination?: string; pourcentage?: number | null; direction?: string }) => void;
}) {
  const [siren, setSiren] = useState('');
  const [denomination, setDenomination] = useState('');
  const [pourcentage, setPourcentage] = useState('');
  const [direction, setDirection] = useState('');
  const s = siren.replace(/\D/g, '');
  const valide = s.length === 9 || (!s && denomination.trim().length > 1);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (valide) onAjouter({ siren: s || undefined, denomination: denomination.trim() || undefined, pourcentage: pourcentage ? Number(pourcentage.replace(',', '.')) : null, direction: direction.trim() || undefined }); }}
      className="flex flex-col gap-2 border-b bg-muted/40 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center"
      style={{ paddingLeft: 16 + niveau * 22 }}
    >
      <span className="label-mono">Filiale de {parent.denomination}</span>
      <Input value={siren} onChange={(e) => setSiren(e.target.value)} placeholder="SIREN" aria-label="SIREN de la filiale" inputMode="numeric" className="h-8 bg-background font-mono tabular-nums placeholder:font-sans sm:w-32" />
      <Input value={denomination} onChange={(e) => setDenomination(e.target.value)} placeholder="ou dénomination (société étrangère…)" aria-label="Dénomination de la filiale" className="h-8 bg-background sm:w-60" />
      <Input value={pourcentage} onChange={(e) => setPourcentage(e.target.value)} placeholder="% détenu" aria-label="Pourcentage détenu" inputMode="decimal" className="h-8 bg-background font-mono tabular-nums placeholder:font-sans sm:w-24" />
      <Input value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="Mandat (facultatif)" aria-label="Mandat" className="h-8 bg-background sm:w-40" />
      <div className="flex gap-2">
        <Button size="sm" type="submit" disabled={!valide || occupe}>{occupe ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Ajouter</Button>
        <Button size="sm" type="button" variant="ghost" onClick={onAnnuler}>Annuler</Button>
      </div>
    </form>
  );
}

function NomGroupe({ nom, onSave }: { nom: string; onSave: (nom: string) => void }) {
  const [edition, setEdition] = useState(false);
  const [v, setV] = useState(nom);
  useEffect(() => setV(nom), [nom]);
  if (!edition) {
    return <h1 className="!m-0 cursor-text text-balance decoration-muted-foreground/40 decoration-dashed underline-offset-4 hover:underline" onClick={() => setEdition(true)} title="Renommer">{nom}</h1>;
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); setEdition(false); if (v.trim() && v.trim() !== nom) onSave(v.trim()); }}>
      <Input autoFocus value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { setEdition(false); if (v.trim() && v.trim() !== nom) onSave(v.trim()); }} className="h-10 text-lg font-semibold sm:w-96" />
    </form>
  );
}
