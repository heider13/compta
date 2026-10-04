'use client';

// Formalités déposées au Guichet unique INPI — lues en direct via le proxy VPS
// (GET /api/formalites, identifiants INPI du cabinet). Toutes les pages sont
// chargées (100 par page) puis filtrées côté client.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, FileDown, Hourglass, Landmark, Loader2, RefreshCw, Search, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/cabinet/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://0dao73k.cserverhost.cloud';
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

type Formality = {
  id: number | string;
  liasseNumber: string | null;
  companyName: string | null;
  typeFormalite: string | null;
  status: string | null;
  statusDate: string | null;
  signedDate: string | null;
  referenceMandataire: string | null;
  nomDossier: string | null;
  amount: number | null;
  updated: string | null;
};

const TYPE_LABELS: Record<string, string> = { C: 'Création', M: 'Modification', R: 'Radiation' };

const TO_HANDLE = ['AMENDMENT_PENDING', 'AMENDMENT_SIGNATURE_PENDING', 'AMENDMENT_PAYMENT_PENDING', 'SIGNATURE_PENDING', 'PAYMENT_PENDING'];
const IN_PROGRESS = ['RECEIVED', 'VALIDATION_PENDING'];

const FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'todo', label: 'À traiter' },
  { key: 'progress', label: 'En cours' },
  { key: 'validated', label: 'Validées' },
  { key: 'rejected', label: 'Rejetées' },
] as const;
type FilterKey = (typeof FILTERS)[number]['key'];

function matchesFilter(f: Formality, key: FilterKey) {
  const s = f.status ?? '';
  if (key === 'todo') return TO_HANDLE.includes(s);
  if (key === 'progress') return IN_PROGRESS.includes(s);
  if (key === 'validated') return s === 'VALIDATED';
  if (key === 'rejected') return s === 'REJECTED';
  return true;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function authToken() {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Session expirée, reconnectez-vous.');
  return token;
}

export function InpiFormalities() {
  const router = useRouter();
  const [items, setItems] = useState<Formality[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [type, setType] = useState<string>('');
  const [query, setQuery] = useState('');
  const [downloading, setDownloading] = useState<string | number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = await authToken();
      const all: Formality[] = [];
      let count = 0;
      for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await fetch(`${VPS}/api/formalites?itemsPerPage=${PAGE_SIZE}&page=${page}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const code = (body as { error?: string }).error;
          throw new Error(
            code === 'inpi_creds_missing' || res.status === 403
              ? 'Identifiants INPI non configurés pour ce cabinet (menu Connexion INPI).'
              : (body as { detail?: string }).detail || code || `Erreur ${res.status}`,
          );
        }
        const pageItems = ((body as { items?: Formality[] }).items ?? []);
        count = (body as { total?: number }).total ?? pageItems.length;
        all.push(...pageItems);
        if (all.length >= count || pageItems.length < PAGE_SIZE) break;
      }
      setItems(all);
      setTotal(count);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openSynthesis(f: Formality) {
    setDownloading(f.id);
    try {
      const token = await authToken();
      const res = await fetch(`${VPS}/api/formalites/${encodeURIComponent(String(f.id))}/synthesis`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) throw new Error("L'INPI ne fournit pas encore de synthèse pour cette formalité.");
      if (!res.ok) throw new Error(`Synthèse indisponible (erreur ${res.status}).`);
      const url = URL.createObjectURL(await res.blob());
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Synthèse indisponible.');
    } finally {
      setDownloading(null);
    }
  }

  const counts = useMemo(() => ({
    todo: items.filter((f) => matchesFilter(f, 'todo')).length,
    progress: items.filter((f) => matchesFilter(f, 'progress')).length,
    validated: items.filter((f) => matchesFilter(f, 'validated')).length,
    rejected: items.filter((f) => matchesFilter(f, 'rejected')).length,
  }), [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((f) =>
      matchesFilter(f, filter) &&
      (!type || f.typeFormalite === type) &&
      (!q || [f.companyName, f.nomDossier, f.liasseNumber, f.referenceMandataire]
        .some((v) => String(v ?? '').toLowerCase().includes(q))),
    );
  }, [items, filter, type, query]);

  const kpis = [
    { key: 'todo' as FilterKey, label: 'À traiter', hint: 'Régularisation, signature ou paiement', value: counts.todo, icon: AlertTriangle, tone: 'text-[#ff887b] bg-[#fff3f1]' },
    { key: 'progress' as FilterKey, label: 'En cours', hint: 'Reçues ou en validation', value: counts.progress, icon: Hourglass, tone: 'text-primary bg-[#ede7ff]' },
    { key: 'validated' as FilterKey, label: 'Validées', hint: 'Acceptées par le greffe', value: counts.validated, icon: CheckCircle2, tone: 'text-green-700 bg-green-50' },
    { key: 'rejected' as FilterKey, label: 'Rejetées', hint: 'Refusées', value: counts.rejected, icon: XCircle, tone: 'text-red-700 bg-red-50' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2">
            <Landmark className="size-6 text-primary" />
            Déposées à l&apos;INPI
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Toutes les formalités de votre compte mandataire au Guichet unique, en temps réel. Cliquez sur une ligne pour voir ses pièces et ses régularisations.
            {!loading && !error && ` ${total} formalité${total > 1 ? 's' : ''}.`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        {kpis.map(({ key, label, hint, value, icon: Icon, tone }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(filter === key ? 'all' : key)}
            className={cn(
              'flex min-w-0 items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40',
              filter === key && 'border-primary ring-[3px] ring-primary/15',
            )}
          >
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', tone)}>
              <Icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-2xl font-semibold tabular-nums">{loading ? '…' : value}</span>
              <span className="block truncate text-sm font-medium">{label}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>
            </span>
          </button>
        ))}
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une société, un n° de liasse…"
                className="pl-9"
              />
            </div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-9 cursor-pointer rounded-md border bg-card px-3 text-sm"
              aria-label="Type de formalité"
            >
              <option value="">Tous les types</option>
              <option value="C">Création</option>
              <option value="M">Modification</option>
              <option value="R">Radiation</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  filter === f.key ? 'border-primary bg-accent text-foreground' : 'bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
                {f.key !== 'all' && !loading && ` (${counts[f.key as Exclude<FilterKey, 'all'>]})`}
              </button>
            ))}
          </div>
        </CardContent>

        {error && (
          <p className="mx-4 mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 border-t py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Lecture du Guichet unique INPI…
          </div>
        ) : visible.length === 0 ? (
          <p className="border-t py-16 text-center text-sm text-muted-foreground">
            {items.length === 0 ? 'Aucune formalité trouvée sur votre compte INPI.' : 'Aucune formalité ne correspond aux filtres.'}
          </p>
        ) : (
          <div className="overflow-x-auto border-t">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Société / dossier</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Statut</th>
                  <th className="px-4 py-2.5 font-medium">N° de liasse</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((f) => (
                  <tr
                    key={String(f.id)}
                    onClick={() => router.push(`/inpi/${f.id}`)}
                    className={cn('cursor-pointer hover:bg-[#f8f6fd]', TO_HANDLE.includes(f.status ?? '') && 'bg-[#fff8f6]')}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(f.statusDate)}</td>
                    <td className="max-w-64 px-4 py-3">
                      <span className="block truncate font-medium">{f.companyName || f.nomDossier || '(sans nom)'}</span>
                      {f.referenceMandataire && (
                        <span className="block truncate text-[11px] text-muted-foreground">Réf. {f.referenceMandataire}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{TYPE_LABELS[f.typeFormalite ?? ''] ?? f.typeFormalite ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3"><StatusBadge statut={f.status ?? ''} /></td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{f.liasseNumber ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSynthesis(f);
                        }}
                        disabled={downloading === f.id}
                        title="Synthèse PDF officielle de l'INPI"
                      >
                        {downloading === f.id ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
                        Synthèse
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
