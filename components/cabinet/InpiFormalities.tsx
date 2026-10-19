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
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/cabinet/EmptyState';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FormalitesTabs } from '@/components/cabinet/FormalitesTabs';
import { PaiementBadge, euros, type Paiement } from '@/components/cabinet/Paiement';

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
  paiement?: Paiement | null;
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
    { key: 'todo' as FilterKey, label: 'À traiter', hint: 'Régularisation, signature ou paiement', value: counts.todo, icon: AlertTriangle, highlight: true },
    { key: 'progress' as FilterKey, label: 'En cours', hint: 'Reçues ou en validation', value: counts.progress, icon: Hourglass, highlight: false },
    { key: 'validated' as FilterKey, label: 'Validées', hint: 'Acceptées par le greffe', value: counts.validated, icon: CheckCircle2, highlight: false },
    { key: 'rejected' as FilterKey, label: 'Rejetées', hint: 'Refusées', value: counts.rejected, icon: XCircle, highlight: false },
  ];

  const enAttente = items.filter((f) => f.paiement && (f.paiement.statut === 'a_payer' || f.paiement.statut === 'delegation_en_attente'));
  const totalAttente = enAttente.reduce((s, f) => s + (f.paiement?.a_payer_cents ?? 0), 0);
  const enRetard = enAttente.filter((f) => (f.paiement?.jours_attente ?? 0) >= 3).length;

  return (
    <div className="space-y-6">
      <FormalitesTabs
        description="Toutes les formalités de votre compte mandataire au Guichet unique, en temps réel. Cliquez sur une ligne pour voir ses pièces et ses régularisations."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            Actualiser
          </Button>
        }
      />

      {enAttente.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          <span>
            <span className="font-medium">{enAttente.length} formalité(s) en attente de paiement</span>{' '}
            <span className="font-mono tabular-nums">({euros(totalAttente)})</span>
          </span>
          {enRetard > 0 && <span className="text-muted-foreground">· dont {enRetard} depuis plus de 3 jours</span>}
          <span className="text-muted-foreground">· {enAttente.filter((f) => f.paiement?.statut === 'delegation_en_attente').length} délégation(s) envoyée(s) au client</span>
        </div>
      )}

      {/* Bande d'indicateurs cliquables : filtre rapide */}
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card shadow-xs lg:grid-cols-4 [&>*]:border-border max-lg:[&>*:nth-child(-n+2)]:border-b max-lg:[&>*:nth-child(odd)]:border-r lg:[&>*:not(:last-child)]:border-r">
        {kpis.map(({ key, label, hint, value, icon: Icon, highlight }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(filter === key ? 'all' : key)}
              aria-pressed={active}
              className={cn(
                'relative flex min-w-0 flex-col gap-3 p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:p-5',
                active && 'bg-muted/40 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary',
              )}
            >
              <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                <Icon className={cn('size-4 shrink-0', highlight ? 'text-primary' : 'text-muted-foreground/70')} />
                <span className="truncate">{label}</span>
              </span>
              <span className="flex items-baseline gap-2">
                {loading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
                )}
                {highlight && !loading && value > 0 && <span className="live-dot size-1.5 text-primary" />}
              </span>
              <span className="truncate text-xs text-muted-foreground">{hint}</span>
            </button>
          );
        })}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-52 flex-1 basis-60">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une société, un n° de liasse…"
              aria-label="Rechercher une formalité"
              className="bg-background pl-8"
            />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-9 min-w-0 flex-1 cursor-pointer rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-none"
            aria-label="Type de formalité"
          >
            <option value="">Tous les types</option>
            <option value="C">Création</option>
            <option value="M">Modification</option>
            <option value="R">Radiation</option>
          </select>
          <div className="flex w-full max-w-full overflow-x-auto rounded-md border bg-muted p-0.5 sm:w-auto" role="group" aria-label="Filtrer par état">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  filter === f.key ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
                {f.key !== 'all' && !loading && (
                  <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{counts[f.key as Exclude<FilterKey, 'all'>]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="m-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        {loading ? (
          <div className="space-y-0 divide-y" aria-busy="true" aria-label="Lecture du Guichet unique INPI">
            <p className="flex items-center gap-2 px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
              <span className="live-dot size-1.5 text-success" />
              Lecture du Guichet unique INPI…
            </p>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="hidden h-3 w-24 sm:block" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title={items.length === 0 ? 'Aucune formalité trouvée sur votre compte INPI.' : 'Aucune formalité ne correspond aux filtres.'}
          />
        ) : (
          <>
            <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2 font-mono text-[11px] text-muted-foreground">
              <span className="live-dot size-1.5 text-success" />
              Guichet unique · <span className="text-foreground tabular-nums">{visible.length}</span>
              {visible.length !== total && <span className="tabular-nums">/ {total}</span>} formalité{total > 1 ? 's' : ''}
            </div>
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4 text-xs">Date</TableHead>
                  <TableHead className="px-4 text-xs">Société / dossier</TableHead>
                  <TableHead className="px-4 text-xs">Type</TableHead>
                  <TableHead className="px-4 text-xs">Statut</TableHead>
                  <TableHead className="px-4 text-xs">Paiement</TableHead>
                  <TableHead className="px-4 text-xs">N° de liasse</TableHead>
                  <TableHead className="px-4"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((f) => (
                  <TableRow
                    key={String(f.id)}
                    onClick={() => router.push(`/inpi/${f.id}`)}
                    className={cn('cursor-pointer hover:bg-muted/50', TO_HANDLE.includes(f.status ?? '') && 'bg-warning/5')}
                  >
                    <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground tabular-nums">
                      {TO_HANDLE.includes(f.status ?? '') && <span className="mr-2 inline-block size-1.5 rounded-full bg-warning align-middle" aria-hidden="true" />}
                      {formatDate(f.statusDate)}
                    </TableCell>
                    <TableCell className="max-w-64 px-4 py-3">
                      <span className="block truncate font-medium">{f.companyName || f.nomDossier || '(sans nom)'}</span>
                      {f.referenceMandataire && (
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">Réf. {f.referenceMandataire}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">{TYPE_LABELS[f.typeFormalite ?? ''] ?? f.typeFormalite ?? '—'}</TableCell>
                    <TableCell className="px-4 py-3"><StatusBadge statut={f.status ?? ''} /></TableCell>
                    <TableCell className="px-4 py-3"><PaiementBadge p={f.paiement} /></TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs tabular-nums">{f.liasseNumber ?? '—'}</TableCell>
                    <TableCell className="px-4 py-3 text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Card>
    </div>
  );
}
