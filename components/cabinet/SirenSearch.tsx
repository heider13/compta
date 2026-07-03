'use client';

import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import {
  formatSiren,
  type PappersResult,
  type PappersSearchResponse,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex items-end gap-2.5">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="siren-input">SIREN</Label>
          <Input
            id="siren-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="123 456 789"
            value={siren}
            onChange={(e) => setSiren(e.target.value)}
            maxLength={11}
          />
          <p className="text-xs text-muted-foreground">9 chiffres, espaces ignorés.</p>
        </div>
        <Button
          type="submit"
          className="mb-6"
          disabled={loading || siren.replace(/\D+/g, '').length !== 9}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          {loading ? 'Recherche…' : 'Rechercher'}
        </Button>
      </form>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {result && (
        <Card className="bg-muted/50">
          <CardContent className="flex items-start gap-4 pt-5">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">{result.nom_complet}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                SIREN {formatSiren(result.siren)}
                {result.libelle_nature_juridique ? ` · ${result.libelle_nature_juridique}` : ''}
                {result.activite_principale ? ` · NAF ${result.activite_principale}` : ''}
              </p>
              {result.etablissement_siege?.adresse && (
                <p className="mt-1.5 text-[13px]">{result.etablissement_siege.adresse}</p>
              )}
              {result.date_creation && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Créée le {result.date_creation}
                </p>
              )}
            </div>
            <Button type="button" size="sm" onClick={handleSelect} className="shrink-0">
              Sélectionner
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
