import Link from 'next/link';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  href?: string | null;
  /** Met la valeur en avant (ex. éléments qui attendent une action) */
  highlight?: boolean;
  /** @deprecated ignoré depuis la refonte (bande d'indicateurs neutre) */
  tileClass?: string;
}

// Cellule d'une bande d'indicateurs (voir StatStrip)
export function StatCard({ label, value, hint, icon: Icon, href, highlight }: StatCardProps) {
  const inner = (
    <div className="group relative flex h-full flex-col gap-3 p-4 transition-colors sm:p-5 [a>&]:hover:bg-muted/40">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <Icon className={cn('size-4 shrink-0', highlight ? 'text-primary' : 'text-muted-foreground/70')} />
          <span className="truncate">{label}</span>
        </span>
        {href && (
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
        {highlight && Number(value) > 0 && <span className="live-dot size-1.5 text-primary" />}
      </div>
      {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function StatStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 divide-border overflow-hidden rounded-xl border bg-card shadow-xs lg:grid-cols-4 [&>*]:border-border max-lg:[&>*:nth-child(-n+2)]:border-b max-lg:[&>*:nth-child(odd)]:border-r lg:[&>*:not(:last-child)]:border-r">
      {children}
    </div>
  );
}
