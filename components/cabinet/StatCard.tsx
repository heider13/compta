// Ancien compteur compact (pastille + libellé). Pour une bande d'indicateurs,
// préférer StatCard/StatStrip de components/cabinet/dashboard/StatCard.
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  count: number;
  label: string;
  sublabel?: string;
  tone?: 'gray' | 'violet' | 'blue' | 'orange' | 'amber' | 'green' | 'red';
  href?: string;
}

// Tons ramenés aux tokens de la charte (marque, états, graphiques)
const TONE_CLASSES: Record<NonNullable<StatCardProps['tone']>, string> = {
  gray: 'border bg-muted text-foreground',
  violet: 'border border-brand-border bg-brand-soft text-brand-soft-foreground',
  blue: 'border border-chart-1/30 bg-chart-1/10 text-chart-1',
  orange: 'border border-warning/40 bg-warning/10 text-warning',
  amber: 'border border-warning/40 bg-warning/10 text-warning',
  green: 'border border-success/30 bg-success/10 text-success',
  red: 'border border-destructive/30 bg-destructive/10 text-destructive',
};

export function StatCard({ count, label, sublabel, tone = 'gray', href }: StatCardProps) {
  const content = (
    <Card className={cn('h-full gap-0 py-0', href && 'transition-colors hover:bg-muted/40')}>
      <CardContent className="flex items-center gap-4 p-4">
        <span
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-lg font-mono text-lg font-semibold tabular-nums',
            TONE_CLASSES[tone],
          )}
        >
          {count}
        </span>
        <div className="min-w-0 flex-1">
          <p className="label-mono">{label}</p>
          {sublabel && <p className="truncate text-sm font-medium">{sublabel}</p>}
        </div>
        {href && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
      </CardContent>
    </Card>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </Link>
    );
  }
  return content;
}
