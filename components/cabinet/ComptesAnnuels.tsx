'use client';

// Dépôts de comptes annuels du compte Guichet unique du cabinet (lecture via le
// proxy VPS : GET /api/inpi/comptes). Liste filtrable et fiche détaillée
// (statut, greffe, observations, pièces, paiement, historique).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowLeft, Bot, CheckCircle2, ExternalLink, FileText, Hourglass, Loader2, Lock, RefreshCw, Search, XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
    s === 'VALIDATED' ? { cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 }
      : s === 'REJECTED' || s === 'EXPIRED' || s === 'CANCELED' ? { cls: 'bg-[#fff1ef] text-[#c2410c]', icon: XCircle }
        : A_TRAITER.includes(s) ? { cls: 'bg-amber-50 text-amber-800', icon: AlertTriangle }
          : { cls: 'bg-[#ede7ff] text-primary', icon: Hourglass };
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium', conf.cls)}>
      <conf.icon className="size-3" /> {d.statut_libelle}
    </span>
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
    <div className="space-y-5">
      <FormalitesTabs />

      <Card className="border-[#e4dcff] bg-[#f7f4ff]">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Bot className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="!m-0 text-sm text-foreground">
              Pour déposer des comptes, demandez-le à l’agent du tableau de bord en joignant le bilan, le compte de résultat et le PV d’approbation.
              Il vérifie les comptes (signature, équilibre actif/passif, résultat), la confidentialité et les délais, puis prépare le brouillon.
              Plusieurs sociétés ? Donnez-lui la liste.
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/dashboard">Ouvrir l’agent</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {FILTRES.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltre(f.key)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filtre === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
              {f.key === 'traiter' && nbTraiter > 0 && <span className="ml-1 opacity-80">({nbTraiter})</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Société, SIREN, liasse…" className="h-9 w-56 pl-8" />
          </div>
          <Button variant="outline" size="icon" onClick={() => void charger()} aria-label="Actualiser" disabled={chargement}>
            <RefreshCw className={cn('size-4', chargement && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {erreur && <p className="rounded-md bg-[#fff1ef] p-3 text-sm text-[#c2410c]">{erreur}</p>}

      <Card>
        <CardContent className="p-0">
          {chargement ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Lecture du Guichet unique…</div>
          ) : !visibles.length ? (
            <p className="p-10 text-center text-sm text-muted-foreground">Aucun dépôt de comptes{filtre !== 'tous' ? ' dans cette catégorie' : ''}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Société</th>
                    <th className="px-4 py-2 font-medium">Exercice</th>
                    <th className="px-4 py-2 font-medium">Confidentialité</th>
                    <th className="px-4 py-2 font-medium">Statut</th>
                    <th className="px-4 py-2 font-medium">Paiement</th>
                    <th className="px-4 py-2 font-medium">Mis à jour</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((d) => (
                    <tr key={d.id} onClick={() => router.push(`/inpi/comptes/${d.id}`)} className="cursor-pointer border-b last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{d.denomination || '—'}</div>
                        <div className="text-xs text-muted-foreground">{d.siren ? d.siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : ''}{d.liasse ? ` · ${d.liasse}` : ''}</div>
                      </td>
                      <td className="px-4 py-2.5">{d.cloture ? `Clôture ${date(d.cloture)}` : d.annee || '—'}</td>
                      <td className="px-4 py-2.5 text-xs">
                        {d.confidentialite && d.confidentialite !== 'aucune' && <Lock className="mr-1 inline size-3 text-primary" />}
                        {CONFIDENTIALITE[d.confidentialite || ''] || '—'}
                      </td>
                      <td className="px-4 py-2.5"><StatutBadge d={d} /></td>
                      <td className="px-4 py-2.5"><PaiementBadge p={d.paiement} /></td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{date(d.date_statut)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
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

  return (
    <div className="space-y-5">
      <FormalitesTabs />
      <Link href="/inpi/comptes" className="inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground">
        <ArrowLeft className="size-4" /> Tous les dépôts de comptes
      </Link>
      {erreur && <p className="rounded-md bg-[#fff1ef] p-3 text-sm text-[#c2410c]">{erreur}</p>}
      {!d && !erreur && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Chargement…</div>}
      {d && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="!m-0 text-xl font-semibold">{d.denomination}</h2>
              <p className="!m-0 mt-1 text-sm text-muted-foreground">
                Comptes {d.cloture ? `clos le ${date(d.cloture)}` : d.annee} · {d.liasse || `dépôt ${d.id}`}{d.greffe ? ` · Greffe de ${d.greffe}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatutBadge d={d} />
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {d.confidentialite && d.confidentialite !== 'aucune' && <Lock className="size-3" />} {CONFIDENTIALITE[d.confidentialite || ''] || 'Confidentialité non précisée'}
                </span>
                {d.dossier && (
                  <Link href={`/dossiers/${d.dossier.id}`} className="text-xs text-primary">Dossier {d.dossier.reference}</Link>
                )}
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href={d.lien_guichet_unique} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> Ouvrir sur le Guichet unique</a>
            </Button>
          </div>

          {(d.observation_greffe || d.motifs_rejet.length > 0) && (
            <Card className={cn(d.statut === 'REJECTED' ? 'border-[#ffd2c8] bg-[#fff8f6]' : 'border-amber-200 bg-amber-50/50')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Retour du greffe</CardTitle>
                {d.motifs_rejet.length > 0 && <CardDescription>{d.motifs_rejet.join(' · ')}</CardDescription>}
              </CardHeader>
              {d.observation_greffe && <CardContent className="pt-0 text-sm whitespace-pre-line">{d.observation_greffe}</CardContent>}
            </Card>
          )}

          <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
            <div className="space-y-5">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Pièces déposées</CardTitle></CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {!d.pieces.length && <p className="text-sm text-muted-foreground">Aucune pièce.</p>}
                  {d.pieces.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                      <span className="flex items-center gap-2"><FileText className="size-4 text-muted-foreground" /> {p.libelle}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {p.confidentiel && <span className="inline-flex items-center gap-1"><Lock className="size-3" /> confidentielle</span>}
                        {p.conformite === 'VALID' ? <span className="text-emerald-700">conforme</span> : p.conformite === 'NEW' ? 'à contrôler' : p.conformite?.toLowerCase()}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              {!!d.historique?.length && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Historique</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    <ol className="!m-0 space-y-1.5 !p-0">
                      {d.historique.map((h, i) => (
                        <li key={i} className="flex justify-between gap-3 text-sm">
                          <span>{h.libelle}</span>
                          <span className="text-xs text-muted-foreground">{date(h.date)}</span>
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
