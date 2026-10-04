'use client';

// Suivi d'un lot : avancement de chaque formalité (actualisé tant que des
// préparations tournent), accès au dossier et reprise de la conversation de
// l'agent pour compléter puis créer le brouillon INPI.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Check, Clock, FolderOpen, Loader2, MessageSquare, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormalityAgent, type AgentResume } from '@/components/cabinet/dashboard/FormalityAgent';
import { api } from '@/components/cabinet/Batches';
import { cn } from '@/lib/utils';

type Item = {
  dossier_id: string;
  reference: string;
  societe: string;
  siren: string | null;
  index: number;
  type_label: string;
  status: 'en_attente' | 'en_cours' | 'pret' | 'erreur';
  manquants: string[];
  documents: number;
  resume: string | null;
  erreur: string | null;
  reprise: boolean;
};
type Lot = { id: string; label: string; created_at: string; items: Item[] };

const STATUTS: Record<Item['status'], { label: string; cls: string; icon: typeof Check }> = {
  en_attente: { label: 'En attente', cls: 'bg-muted text-muted-foreground', icon: Clock },
  en_cours: { label: 'En préparation', cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-300', icon: Loader2 },
  pret: { label: 'Prête à valider', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', icon: Check },
  erreur: { label: 'Erreur', cls: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
};

export function BatchDetail({ id }: { id: string }) {
  const [lot, setLot] = useState<Lot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [resume, setResume] = useState<AgentResume | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLot(await api<Lot>(`/api/lots/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.');
    }
  }, [id]);

  const actif = lot?.items.some((i) => i.status === 'en_cours' || i.status === 'en_attente');
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!actif) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [actif, load]);

  async function reprendre(item: Item) {
    setBusy(item.dossier_id);
    setError(null);
    try {
      const h = await api<AgentResume>(`/api/lots/formalites/${item.dossier_id}/historique`);
      setResume(h);
      setTimeout(() => document.getElementById('agent-lot')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reprise impossible.');
    } finally {
      setBusy(null);
    }
  }

  async function relancer(item: Item) {
    setBusy(item.dossier_id);
    try {
      await api(`/api/lots/formalites/${item.dossier_id}/relancer`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Relance impossible.');
    } finally {
      setBusy(null);
    }
  }

  if (!lot) {
    return error ? (
      <p className="text-sm text-destructive">{error}</p>
    ) : (
      <p className="flex items-center gap-2 py-20 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Chargement du lot…</p>
    );
  }

  const prets = lot.items.filter((i) => i.status === 'pret').length;

  return (
    <div className="space-y-5">
      <Link href="/lots" className="inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground">
        <ArrowLeft className="size-4" /> Formalités en lot
      </Link>
      <div>
        <h1>{lot.label}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {prets}/{lot.items.length} formalité(s) prête(s) à valider
          {actif && ' · préparation en cours, actualisation automatique'}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${(prets / lot.items.length) * 100}%` }} />
        </div>
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {lot.items.map((it) => {
              const s = STATUTS[it.status] ?? STATUTS.en_attente;
              return (
                <li key={it.dossier_id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="w-6 text-xs text-muted-foreground">{it.index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{it.societe}</p>
                      <p className="text-xs text-muted-foreground">
                        {it.type_label} · {it.reference}
                        {it.siren && <> · SIREN {it.siren}</>}
                        {it.documents > 0 && <> · {it.documents} document(s)</>}
                      </p>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', s.cls)}>
                      <s.icon className={cn('size-3.5', it.status === 'en_cours' && 'animate-spin')} /> {s.label}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dossiers/${it.dossier_id}`}><FolderOpen className="size-4" /> Dossier</Link>
                      </Button>
                      {it.reprise && (
                        <Button variant="outline" size="sm" onClick={() => reprendre(it)} disabled={busy !== null}>
                          {busy === it.dossier_id ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />}
                          Reprendre avec l’agent
                        </Button>
                      )}
                      {(it.status === 'erreur' || it.status === 'pret') && (
                        <Button variant="ghost" size="sm" onClick={() => relancer(it)} disabled={busy !== null} title="Relancer la préparation">
                          <RotateCcw className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {it.erreur && <p className="pl-9 text-xs text-destructive">{it.erreur}</p>}
                  {it.manquants.length > 0 && it.status !== 'erreur' && (
                    <p className="pl-9 text-xs text-amber-700 dark:text-amber-400">À compléter : {it.manquants.join(' ; ')}</p>
                  )}
                  {it.resume && (
                    <div className="pl-9">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                        onClick={() => setOuvert((o) => (o === it.dossier_id ? null : it.dossier_id))}
                      >
                        {ouvert === it.dossier_id ? 'Masquer le récapitulatif' : 'Voir le récapitulatif de l’agent'}
                      </button>
                      {ouvert === it.dossier_id && (
                        <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted px-3 py-2 text-xs">{it.resume}</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {resume && (
        <div id="agent-lot" className="scroll-mt-6">
          <FormalityAgent key={resume.dossier.id} resume={resume} />
        </div>
      )}
    </div>
  );
}
