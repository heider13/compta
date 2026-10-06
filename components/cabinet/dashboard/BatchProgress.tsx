'use client';

// Suivi d'un lot de formalités, affiché dans la conversation de l'Agent
// Formalités : avancement de chaque formalité (actualisé tant que la préparation
// tourne) et ouverture de chacune dans le même chat pour la compléter.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AlertTriangle, Check, Clock, Layers, Loader2, MessageSquare, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://0dao73k.cserverhost.cloud';

export async function vpsApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Session expirée, reconnectez-vous.');
  const res = await fetch(`${VPS}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { detail?: string }).detail || `Erreur ${res.status}`);
  return body as T;
}

// Ouverture d'une formalité du lot dans le chat (fourni par FormalityAgent).
export const OpenFormaliteContext = createContext<((dossierId: string) => Promise<void>) | null>(null);

type Item = {
  dossier_id: string;
  reference: string;
  societe: string;
  index: number;
  type_label: string;
  status: 'en_attente' | 'en_cours' | 'pret' | 'erreur';
  manquants: string[];
  documents: number;
  erreur: string | null;
  reprise: boolean;
};

const STATUTS: Record<Item['status'], { label: string; cls: string; icon: typeof Check }> = {
  en_attente: { label: 'En attente', cls: 'bg-muted text-muted-foreground', icon: Clock },
  en_cours: { label: 'En préparation', cls: 'bg-[#ede7ff] text-primary', icon: Loader2 },
  pret: { label: 'Prête', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', icon: Check },
  erreur: { label: 'Erreur', cls: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
};

export function BatchProgress({ batch }: { batch: { id: string; label: string; total: number } }) {
  const open = useContext(OpenFormaliteContext);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await vpsApi<{ items: Item[] }>(`/api/lots/${batch.id}`);
      setItems(r.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suivi indisponible.');
    }
  }, [batch.id]);

  const actif = !items || items.some((i) => i.status === 'en_cours' || i.status === 'en_attente');
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!actif) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [actif, load]);

  const prets = items?.filter((i) => i.status === 'pret').length ?? 0;
  const total = items?.length ?? batch.total;

  return (
    <div className="ml-9 rounded-lg border bg-card text-xs">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Layers className="size-4 text-primary" />
        <span className="min-w-0 flex-1 truncate font-medium">{batch.label}</span>
        <span className="text-muted-foreground">{prets}/{total} prête(s)</span>
      </div>
      <div className="h-1 bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${(prets / Math.max(1, total)) * 100}%` }} />
      </div>
      {error && <p className="px-3 py-2 text-destructive">{error}</p>}
      {!items ? (
        <p className="flex items-center gap-2 px-3 py-2 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Chargement du suivi…</p>
      ) : (
        <ul className="divide-y">
          {items.map((it) => {
            const s = STATUTS[it.status] ?? STATUTS.en_attente;
            return (
              <li key={it.dossier_id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="w-4 text-muted-foreground">{it.index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{it.societe}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {it.type_label}
                    {it.documents > 0 && ` · ${it.documents} document(s)`}
                    {it.erreur ? ` · ${it.erreur}` : it.manquants.length ? ` · ${it.manquants.length} info(s) à compléter` : ''}
                  </span>
                </span>
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', s.cls)}>
                  <s.icon className={cn('size-3', it.status === 'en_cours' && 'animate-spin')} /> {s.label}
                </span>
                {it.reprise && open && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px]"
                    disabled={busy !== null}
                    onClick={async () => {
                      setBusy(it.dossier_id);
                      try {
                        await open(it.dossier_id);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Ouverture impossible.');
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    {busy === it.dossier_id ? <Loader2 className="size-3.5 animate-spin" /> : <MessageSquare className="size-3.5" />}
                    Ouvrir
                  </Button>
                )}
                {it.status === 'erreur' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    title="Relancer la préparation"
                    disabled={busy !== null}
                    onClick={async () => {
                      setBusy(it.dossier_id);
                      try {
                        await vpsApi(`/api/lots/formalites/${it.dossier_id}/relancer`, { method: 'POST' });
                        await load();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Relance impossible.');
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
