'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDef {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  filters: FilterDef[];
  searchPlaceholder?: string;
}

export function FilterBar({ filters, searchPlaceholder = 'Rechercher…' }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [, startTransition] = useTransition();

  function applyFilter(key: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams(params.toString());
    if (search) sp.set('q', search);
    else sp.delete('q');
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  function resetAll() {
    setSearch('');
    startTransition(() => router.push(pathname));
  }

  const hasActiveFilters = filters.some((f) => params.get(f.key)) || params.get('q');

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 18 }}>
      <form onSubmit={applySearch} style={{ flex: '1 1 240px', minWidth: 200 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'white',
          border: '1px solid var(--ink-200)',
          borderRadius: 10,
          padding: '8px 12px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ink-400)' }} aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', background: 'transparent' }}
          />
        </div>
      </form>

      {filters.map((f) => {
        const current = params.get(f.key) ?? '';
        return (
          <select
            key={f.key}
            value={current}
            onChange={(e) => applyFilter(f.key, e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--ink-200)',
              borderRadius: 10,
              background: current ? 'var(--accent-soft)' : 'white',
              color: current ? 'var(--accent-ink)' : 'var(--ink-700)',
              fontWeight: current ? 500 : 400,
              fontSize: 13,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <option value="">{f.label}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        );
      })}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={resetAll}
          style={{
            padding: '8px 12px',
            border: 'none',
            background: 'transparent',
            color: 'var(--ink-500)',
            fontSize: 12,
            cursor: 'pointer',
            textDecoration: 'underline',
            fontFamily: 'inherit',
          }}
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
