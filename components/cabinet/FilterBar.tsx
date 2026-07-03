'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={applySearch} className="min-w-52 flex-1 basis-60">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="bg-card pl-8"
          />
        </div>
      </form>

      {filters.map((f) => {
        const current = params.get(f.key) ?? '';
        return (
          // Select natif : navigation par query params, pas besoin de Radix.
          <select
            key={f.key}
            value={current}
            onChange={(e) => applyFilter(f.key, e.target.value)}
            className={cn(
              'h-9 cursor-pointer rounded-md border border-input px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
              current
                ? 'border-primary/40 bg-accent font-medium text-accent-foreground'
                : 'bg-card text-foreground',
            )}
          >
            <option value="">{f.label}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      })}

      {hasActiveFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={resetAll} className="text-muted-foreground">
          <X className="size-3.5" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
