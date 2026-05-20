'use client';

import { useState } from 'react';
import {
  formatSiren,
  type PappersResult,
  type PappersSearchResponse,
} from '@/lib/types';

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
    <div className="form-grid">
      <form
        onSubmit={handleSearch}
        style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}
      >
        <div className="form-field" style={{ flex: 1 }}>
          <label htmlFor="siren-input">SIREN</label>
          <input
            id="siren-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="123 456 789"
            value={siren}
            onChange={(e) => setSiren(e.target.value)}
            maxLength={11}
          />
          <span className="form-help">9 chiffres, espaces ignorés.</span>
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || siren.replace(/\D+/g, '').length !== 9}
        >
          {loading ? 'Recherche…' : 'Rechercher'}
        </button>
      </form>

      {error && <div className="form-error">{error}</div>}

      {result && (
        <div className="app-card app-card-pad" style={{ background: 'var(--ink-50)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink-900)' }}>
                {result.nom_complet}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 4 }}>
                SIREN {formatSiren(result.siren)}
                {result.libelle_nature_juridique
                  ? ` · ${result.libelle_nature_juridique}`
                  : ''}
                {result.activite_principale
                  ? ` · NAF ${result.activite_principale}`
                  : ''}
              </div>
              {result.etablissement_siege?.adresse && (
                <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 6 }}>
                  {result.etablissement_siege.adresse}
                </div>
              )}
              {result.date_creation && (
                <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 6 }}>
                  Créée le {result.date_creation}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSelect}
              className="btn btn-accent btn-sm"
            >
              Sélectionner
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
