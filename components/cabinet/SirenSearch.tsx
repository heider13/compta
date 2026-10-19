'use client';

import { useState } from 'react';
import { ArrowRight, Building2, Check, Search } from 'lucide-react';
import {
  formatSiren,
  type PappersResult,
  type PappersSearchResponse,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SirenSearchProps {
  onSelect: (result: PappersResult) => void;
  initialValue?: string;
}

const SIREN_API = 'https://recherche-entreprises.api.gouv.fr/search';

function normalizeSiren(input: string): string {
  return input.replace(/\D+/g, '').slice(0, 9);
}

export function SirenSearch({ onSelect, initialValue = '' }: SirenSearchProps) {
  const [siren, setSiren] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PappersResult | null>(null);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setResult(null);

    const clean = normalizeSiren(siren);
    if (clean.length !== 9) {
      setError('Le SIREN doit comporter 9 chiffres.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${SIREN_API}?q=${clean}&per_page=1`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`API gouv ${res.status}`);
      }
      const data = (await res.json()) as PappersSearchResponse;
      const first = data.results?.[0];
      if (!first) {
        setError('Aucune entreprise trouvée pour ce SIREN.');
      } else {
        setResult(first);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Erreur de recherche : ${err.message}`
          : 'Erreur de recherche.',
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSelect() {
    if (result) onSelect(result);
  }

  // Indicateur purement visuel : nombre de chiffres saisis
  const digits = siren.replace(/\D+/g, '').length;
  const complete = digits === 9;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="space-y-1.5">
        <Label htmlFor="siren-input" className="label-mono">
          SIREN
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="siren-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="123 456 789"
              value={siren}
              onChange={(e) => setSiren(e.target.value)}
              maxLength={11}
              aria-describedby="siren-hint"
              className="h-10 pr-16 pl-9 font-mono text-base tracking-wider tabular-nums sm:text-sm"
            />
            <span
              className={cn(
                'pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[11px] tabular-nums',
                complete ? 'text-success' : 'text-muted-foreground',
              )}
              aria-hidden="true"
            >
              {complete ? <Check className="size-4" /> : `${digits}/9`}
            </span>
          </div>
          <Button
            type="submit"
            className="h-10"
            disabled={loading || siren.replace(/\D+/g, '').length !== 9}
          >
            {loading ? 'Recherche…' : 'Rechercher'}
            {!loading && <Kbd className="hidden border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground sm:inline-flex">↵</Kbd>}
          </Button>
        </div>
        <p id="siren-hint" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="live-dot size-1.5 text-success" aria-hidden="true" />
          Registre national des entreprises · 9 chiffres, espaces ignorés.
        </p>
      </form>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {loading && (
        <div
          className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4"
          role="status"
          aria-live="polite"
        >
          <span className="sr-only">Recherche en cours…</span>
          <Skeleton className="size-9 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="hidden h-8 w-24 sm:block" />
        </div>
      )}

      {result && !loading && (
        <div className="flex flex-col gap-4 rounded-lg border border-brand-border bg-brand-soft/40 p-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 sm:flex-row sm:items-start">
          <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-background">
            <Building2 className="size-4 text-primary" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="truncate text-sm font-semibold">{result.nom_complet}</p>
            <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <dt className="label-mono">SIREN</dt>
                <dd className="font-mono tabular-nums text-foreground">{formatSiren(result.siren)}</dd>
              </div>
              {result.activite_principale && (
                <div className="flex items-center gap-1.5">
                  <dt className="label-mono">NAF</dt>
                  <dd className="font-mono text-foreground">{result.activite_principale}</dd>
                </div>
              )}
              {result.date_creation && (
                <div className="flex items-center gap-1.5">
                  <dt className="label-mono">Créée le</dt>
                  <dd className="font-mono tabular-nums text-foreground">{result.date_creation}</dd>
                </div>
              )}
            </dl>
            {result.libelle_nature_juridique && (
              <p className="text-xs text-muted-foreground">{result.libelle_nature_juridique}</p>
            )}
            {result.etablissement_siege?.adresse && (
              <p className="text-xs">{result.etablissement_siege.adresse}</p>
            )}
          </div>
          <Button type="button" size="sm" onClick={handleSelect} className="shrink-0 self-start">
            Sélectionner
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
