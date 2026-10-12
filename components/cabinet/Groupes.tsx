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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
    <div className="space-y-5">
      <div>
        <h1>Groupes</h1>
        <p className="!m-0 mt-1 text-sm text-muted-foreground">
          Holdings, filiales et sous-filiales de vos clients : l’arbre du groupe, les détentions, les points d’attention et le suivi de chaque société.
        </p>
      </div>

      <Card className="border-[#e4dcff] bg-[#f7f4ff]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Network className="size-4 text-primary" /> Nouveau groupe</CardTitle>
          <CardDescription>
            Saisissez le SIREN de la société de tête. Les sociétés qu’elle dirige sont retrouvées au RNE, sur trois niveaux ; vous complétez ensuite les pourcentages de détention.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={creer} className="flex flex-col gap-2 sm:flex-row">
            <Input value={siren} onChange={(e) => setSiren(e.target.value)} placeholder="SIREN de la holding (9 chiffres)" inputMode="numeric" className="sm:w-64" disabled={creation} />
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom du groupe (facultatif)" className="sm:w-64" disabled={creation} />
            <Button type="submit" disabled={creation}>
              {creation ? <><Loader2 className="size-4 animate-spin" /> Recherche des filiales au RNE…</> : <><Search className="size-4" /> Construire l’arbre</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {erreur && <p className="rounded-md bg-[#fff1ef] p-3 text-sm text-[#c2410c]">{erreur}</p>}

      {!groupes && !erreur && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Chargement…</div>}
      {groupes && !groupes.length && <p className="text-sm text-muted-foreground">Aucun groupe pour l’instant.</p>}
      {groupes && groupes.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groupes.map((g) => (
            <Link key={g.id} href={`/groupes/${g.id}`} className="no-underline">
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardContent className="space-y-1 py-4">
                  <div className="flex items-center gap-2 font-medium text-foreground"><Network className="size-4 text-primary" /> {g.nom}</div>
                  <p className="!m-0 text-xs text-muted-foreground">Tête : {g.tete || '—'}</p>
                  <p className="!m-0 text-xs text-muted-foreground">{g.nb_entites} société(s) · mis à jour le {dateFr(g.updated_at)}</p>
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

  if (erreur && !d) return <p className="rounded-md bg-[#fff1ef] p-3 text-sm text-[#c2410c]">{erreur}</p>;
  if (!d || !arbre) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Chargement du groupe…</div>;

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
        <div className={cn('group flex flex-col gap-2 border-b px-3 py-2.5 last:border-0 lg:flex-row lg:items-center', !e.active && 'opacity-60')}>
          <div className="flex min-w-0 flex-1 items-start gap-1.5" style={{ paddingLeft: niveau * 22 }}>
            {fils.length > 0 && premier && !cyclique ? (
              <button type="button" onClick={() => setReplies((p) => { const n = new Set(p); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n; })} className="mt-0.5 text-muted-foreground hover:text-foreground" aria-label={replie ? 'Déplier' : 'Replier'}>
                {replie ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
            ) : <span className="w-4 shrink-0" />}
            <span className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-md', e.tete ? 'bg-primary text-primary-foreground' : 'bg-[#ede7ff] text-primary')}>
              <Building2 className="size-3.5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium">{e.denomination}</span>
                {e.forme && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{e.forme}</span>}
                {!e.active && <span className="rounded bg-[#fff1ef] px-1.5 py-0.5 text-[10px] text-[#c2410c]">cessée</span>}
                {e.a_verifier && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800">à vérifier</span>}
                {alertes.length > 0 && <span title={alertes.map((a) => a.texte).join('\n')} className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800"><AlertTriangle className="size-3" /> {alertes.length}</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {sirenFmt(e.siren)}{e.ville ? ` · ${e.ville}` : ''}
                {!premier && ' · détaillée plus haut'}
                {premier && autresMeres.length > 0 && ` · aussi détenue par ${autresMeres.map((l) => arbre.parId.get(l.parent_id)?.denomination).join(', ')}`}
              </div>
            </div>
          </div>

          {lien && (
            <LienEditeur lien={lien} occupe={occupe === lien.id} onSave={(patch) => action(lien.id, () => api(`/${id}/liens`, { method: 'PUT', body: { parent_id: lien.parent_id, enfant_id: lien.enfant_id, ...patch } }))} />
          )}

          <div className="flex shrink-0 items-center gap-3 text-xs lg:w-[300px] lg:justify-end">
            {!e.tete && d.detentions[e.id] != null && <span className="text-muted-foreground" title="Détention indirecte par la tête du groupe">Tête : <strong className="text-foreground">{d.detentions[e.id]} %</strong></span>}
            {s?.echeance_comptes && (
              <span className={cn('inline-flex items-center gap-1', s.echeance_comptes.en_retard ? 'text-[#c2410c]' : s.echeance_comptes.a_faire ? 'text-amber-700' : 'text-muted-foreground')} title={`Clôture ${dateFr(s.echeance_comptes.cloture)}`}>
                <CalendarClock className="size-3.5" />
                {s.echeance_comptes.premier_exercice ? `1re clôture ${dateFr(s.echeance_comptes.cloture)}` : s.echeance_comptes.a_faire ? `Comptes avant le ${dateFr(s.echeance_comptes.limite)}` : `Comptes à jour`}
              </span>
            )}
            {s?.verification_en_attente && <span className="text-muted-foreground" title="Les comptes déposés sont relus au registre en arrière-plan">Comptes : vérification au RNE…</span>}
            {s?.formalites_en_cours && s.formalites_en_cours.length > 0 && (
              <Link href={`/inpi/${s.formalites_en_cours[0].id}`} className="text-primary">{s.formalites_en_cours.length} formalité(s)</Link>
            )}
            {premier && (
              <button type="button" onClick={() => setAjout({ parent: e.id })} className="text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100" title="Ajouter une filiale"><Plus className="size-4" /></button>
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
    <div className="space-y-5">
      <Link href="/groupes" className="inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground"><ArrowLeft className="size-4" /> Tous les groupes</Link>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <NomGroupe nom={d.groupe.nom} onSave={(nom) => action('nom', () => api(`/${id}`, { method: 'PATCH', body: { nom } }))} />
          <p className="!m-0 mt-1 text-sm text-muted-foreground">
            {d.entites.length} société(s) · {d.liens.length} lien(s)
            {manquants > 0 && <> · <span className="text-amber-700">{manquants} pourcentage(s) à compléter</span></>}
            {aVerifier > 0 && <> · {aVerifier} lien(s) à vérifier</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm"><Link href={`/dashboard?demande=${demande}`}><Bot className="size-4" /> Agir sur le groupe</Link></Button>
          <Button size="sm" variant="outline" onClick={() => void chargerSuivi()} disabled={chargeSuivi}>
            {chargeSuivi ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />} {suivi ? 'Actualiser le suivi' : 'Charger le suivi'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => action('redecouvrir', () => api(`/${id}/redecouvrir`, { method: 'POST', body: {} }))} disabled={occupe === 'redecouvrir'}>
            <RefreshCw className={cn('size-4', occupe === 'redecouvrir' && 'animate-spin')} /> Rechercher de nouvelles filiales
          </Button>
          <SupprimerBouton libelle="Supprimer le groupe" occupe={occupe === 'suppr'} onConfirm={() => action('suppr', async () => { await api(`/${id}`, { method: 'DELETE' }); router.push('/groupes'); })} />
        </div>
      </div>

      {erreur && <p className="rounded-md bg-[#fff1ef] p-3 text-sm text-[#c2410c]">{erreur}</p>}

      {suivi && retards > 0 && (
        <p className="flex items-center gap-2 rounded-md bg-[#fff1ef] p-3 text-sm text-[#c2410c]"><AlertTriangle className="size-4" /> {retards} société(s) du groupe ont un dépôt de comptes en retard.</p>
      )}

      {suivi && [...suivi.values()].some((x) => x.verification_en_attente) && (
        <p className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {[...suivi.values()].filter((x) => x.verification_en_attente).length} société(s) en cours de vérification au registre (comptes déposés), une toutes les 10 secondes pour respecter les limites du RNE. Actualisez le suivi dans quelques minutes.
        </p>
      )}

      <div className="grid gap-5 2xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Arbre du groupe</CardTitle>
            <CardDescription>Liens trouvés au RNE à partir des mandats exercés par les sociétés du groupe. Complétez les pourcentages de détention (non publics) : ils servent aux contrôles et à la détention indirecte.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t">{arbre.racines.map((r) => rendu(r, null, 0, new Set(), true))}</div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Points d’attention</CardTitle></CardHeader>
            <CardContent className="space-y-2 pt-0">
              {!d.controles.length && <p className="text-sm text-muted-foreground">Aucun point relevé.</p>}
              {manquants > 0 && (
                <div className="flex gap-2 text-sm"><Info className="mt-0.5 size-4 shrink-0 text-primary" /><span>{manquants} pourcentage(s) de détention à compléter dans l’arbre (non publics : statuts, PV, liste des filiales et participations).</span></div>
              )}
              {d.controles.filter((c) => !/non renseigné/.test(c.texte)).sort((a, b) => ['erreur', 'attention', 'info'].indexOf(a.niveau) - ['erreur', 'attention', 'info'].indexOf(b.niveau)).slice(0, 25).map((c, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  {c.niveau === 'erreur' ? <XCircle className="mt-0.5 size-4 shrink-0 text-[#c2410c]" /> : c.niveau === 'attention' ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" /> : <Info className="mt-0.5 size-4 shrink-0 text-primary" />}
                  <span>{c.texte}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          {!!d.groupe.metadata?.meres_possibles?.length && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Société mère possible</CardTitle>
                <CardDescription>Dirigeant personne morale de la tête : le groupe peut remonter plus haut.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 pt-0 text-sm">
                {d.groupe.metadata.meres_possibles.map((m) => <div key={m.siren}>{m.denomination} <span className="text-xs text-muted-foreground">({sirenFmt(m.siren)}{m.qualite ? ` · ${m.qualite}` : ''})</span></div>)}
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
          className={cn('h-7 w-16 rounded-md border bg-background px-2 text-right tabular-nums outline-none focus:border-primary', lien.pourcentage == null && 'border-amber-300 bg-amber-50/60')}
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
    <button type="button" onClick={() => (confirme ? onConfirm() : setConfirme(true))} className={cn('text-xs', confirme ? 'font-medium text-destructive' : 'text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100')} title="Retirer du groupe">
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
      className="flex flex-col gap-2 border-b bg-muted/30 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center"
      style={{ paddingLeft: 12 + niveau * 22 }}
    >
      <span className="text-xs text-muted-foreground">Filiale de {parent.denomination} :</span>
      <Input value={siren} onChange={(e) => setSiren(e.target.value)} placeholder="SIREN" inputMode="numeric" className="h-8 sm:w-32" />
      <Input value={denomination} onChange={(e) => setDenomination(e.target.value)} placeholder="ou dénomination (société étrangère…)" className="h-8 sm:w-60" />
      <Input value={pourcentage} onChange={(e) => setPourcentage(e.target.value)} placeholder="% détenu" inputMode="decimal" className="h-8 sm:w-24" />
      <Input value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="Mandat (facultatif)" className="h-8 sm:w-40" />
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
    return <h1 className="!m-0 cursor-text" onClick={() => setEdition(true)} title="Renommer">{nom}</h1>;
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); setEdition(false); if (v.trim() && v.trim() !== nom) onSave(v.trim()); }}>
      <Input autoFocus value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { setEdition(false); if (v.trim() && v.trim() !== nom) onSave(v.trim()); }} className="h-10 text-lg font-semibold sm:w-96" />
    </form>
  );
}
