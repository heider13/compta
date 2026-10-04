'use client';

// Formalités en lot : coller une liste (ou joindre un tableur) → l'IA la découpe
// en formalités → aperçu modifiable → lancement. Chaque formalité est préparée
// par l'Agent Formalités dans son propre dossier.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, FileSpreadsheet, Layers, Loader2, Play, Sparkles, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://0dao73k.cserverhost.cloud';

export const TYPES_LOT: Record<string, string> = {
  creation: 'Création',
  transfert_siege: 'Transfert de siège',
  changement_dirigeant: 'Changement de dirigeant',
  modification: 'Modification',
  mise_en_sommeil: 'Mise en sommeil',
  dissolution: 'Dissolution',
  cloture_liquidation: 'Clôture de liquidation',
  cessation_ei: 'Cessation d’EI',
  autre: 'Autre',
};

type Formalite = { type: string; societe: string; siren: string; consigne: string; manquants: string[] };
type Lot = { id: string; label: string; created_at: string; total: number; pret?: number; erreur?: number; en_cours?: number; en_attente?: number };

export async function authToken() {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Session expirée, reconnectez-vous.');
  return token;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await authToken();
  const res = await fetch(`${VPS}${path}`, {
    ...init,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { detail?: string }).detail || `Erreur ${res.status}`);
  return body as T;
}

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(new Error(`Lecture impossible : ${file.name}`));
    r.readAsDataURL(file);
  });
}

const EXEMPLE = `Créer 3 SASU de conseil, capital 1 000 €, clôture au 31/12 :
- ALPHA CONSEIL, siège 12 rue de Rome 13001 Marseille, président Jean Martin
- BETA STRATEGIE, siège 4 cours Mirabeau 13100 Aix-en-Provence, présidente Claire Durand
- GAMMA FINANCE, siège 8 quai du Port 13002 Marseille, président Karim Benali
Mettre en sommeil la SARL DELTA (SIREN 123 456 789) au 31/10.`;

export function Batches() {
  const router = useRouter();
  const [lots, setLots] = useState<Lot[] | null>(null);
  const [texte, setTexte] = useState('');
  const [fichier, setFichier] = useState<{ name: string; data: string } | null>(null);
  const [label, setLabel] = useState('');
  const [plan, setPlan] = useState<Formalite[] | null>(null);
  const [observations, setObservations] = useState('');
  const [busy, setBusy] = useState<'plan' | 'lancer' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ lots: Lot[] }>('/api/lots').then((r) => setLots(r.lots)).catch(() => setLots([]));
  }, []);

  async function analyser() {
    setBusy('plan');
    setError(null);
    try {
      const r = await api<{ formalites: Formalite[]; observations: string }>('/api/lots/plan', {
        method: 'POST',
        body: JSON.stringify({ texte, fichier }),
      });
      if (!r.formalites.length) throw new Error('Aucune formalité reconnue dans la liste.');
      setPlan(r.formalites);
      setObservations(r.observations);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analyse impossible.');
    } finally {
      setBusy(null);
    }
  }

  async function lancer() {
    if (!plan?.length) return;
    setBusy('lancer');
    setError(null);
    try {
      const r = await api<{ batchId: string }>('/api/lots', { method: 'POST', body: JSON.stringify({ label, formalites: plan }) });
      router.push(`/lots/${r.batchId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lancement impossible.');
      setBusy(null);
    }
  }

  const maj = (i: number, patch: Partial<Formalite>) => setPlan((p) => p && p.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2">
          <Layers className="size-6" /> Formalités en lot
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Plusieurs créations, modifications ou fermetures en une fois : collez la liste ou joignez un tableur. L’agent prépare chaque
          formalité dans son propre dossier (actes, annonce, aperçu INPI). Rien n’est déposé : vous validez chaque brouillon.
        </p>
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}

      {!plan ? (
        <Card>
          <CardHeader>
            <CardTitle>Nouveau lot</CardTitle>
            <CardDescription>Texte libre, tableau copié depuis Excel, ou fichier .xlsx / .csv — une ligne par société.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              rows={9}
              placeholder={EXEMPLE}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Liste des formalités"
            />
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.ods,.csv,.txt"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 5 * 1024 * 1024) return setError('Fichier trop lourd (5 Mo max).');
                  setFichier({ name: f.name, data: await readBase64(f) });
                  e.target.value = '';
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <FileSpreadsheet className="size-4" /> Joindre un tableur
              </Button>
              {fichier && (
                <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
                  {fichier.name}
                  <button type="button" onClick={() => setFichier(null)} aria-label="Retirer le fichier">
                    <X className="size-3.5" />
                  </button>
                </span>
              )}
              {!texte && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setTexte(EXEMPLE)}>
                  Utiliser l’exemple
                </Button>
              )}
              <div className="ml-auto">
                <Button type="button" size="sm" onClick={analyser} disabled={busy !== null || (!texte.trim() && !fichier)}>
                  {busy === 'plan' ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Analyser la liste
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{plan.length} formalité(s) reconnue(s)</CardTitle>
            <CardDescription>Vérifiez et corrigez avant de lancer. Chaque ligne deviendra un dossier.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {observations && <p className="rounded-md bg-muted px-3 py-2 text-sm">{observations}</p>}
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Nom du lot (facultatif) — ex. Créations client Dupont"
              className="h-9 w-full max-w-md rounded-md border bg-background px-3 text-sm"
              aria-label="Nom du lot"
            />
            <ul className="divide-y rounded-md border">
              {plan.map((f, i) => (
                <li key={i} className="space-y-2 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-6 text-xs text-muted-foreground">{i + 1}</span>
                    <select
                      value={f.type}
                      onChange={(e) => maj(i, { type: e.target.value })}
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      aria-label="Type de formalité"
                    >
                      {Object.entries(TYPES_LOT).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <input
                      value={f.societe}
                      onChange={(e) => maj(i, { societe: e.target.value })}
                      className="h-8 min-w-[12rem] flex-1 rounded-md border bg-background px-2 text-sm font-medium"
                      aria-label="Société"
                    />
                    {f.siren && <span className="font-mono text-xs text-muted-foreground">SIREN {f.siren}</span>}
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPlan((p) => p && p.filter((_, j) => j !== i))} aria-label="Retirer">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <textarea
                    value={f.consigne}
                    onChange={(e) => maj(i, { consigne: e.target.value })}
                    rows={2}
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-xs text-muted-foreground"
                    aria-label="Consigne pour l’agent"
                  />
                  {f.manquants.length > 0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">À compléter : {f.manquants.join(' ; ')}</p>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPlan(null)} disabled={busy !== null}>
                Modifier la liste
              </Button>
              <Button type="button" size="sm" onClick={lancer} disabled={busy !== null || !plan.length}>
                {busy === 'lancer' ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                Lancer {plan.length} formalité(s)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lots du cabinet</CardTitle>
        </CardHeader>
        <CardContent>
          {lots === null ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Chargement…</p>
          ) : !lots.length ? (
            <p className="text-sm text-muted-foreground">Aucun lot pour le moment.</p>
          ) : (
            <ul className="divide-y">
              {lots.map((l) => (
                <li key={l.id}>
                  <Link href={`/lots/${l.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 no-underline hover:opacity-80">
                    <span className="font-medium">{l.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleDateString('fr-FR')} · {l.pret ?? 0}/{l.total} prête(s)
                      {(l.en_cours ?? 0) + (l.en_attente ?? 0) > 0 && ` · ${(l.en_cours ?? 0) + (l.en_attente ?? 0)} en préparation`}
                      {(l.erreur ?? 0) > 0 && ` · ${l.erreur} en erreur`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
