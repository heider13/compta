import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiProps {
  label: string;
  value: number | string;
  accent?: string; // Couleur CSS pour la bordure gauche (ex. 'var(--status-blue)')
  href?: string;
  hint?: string;
}

export function Kpi({ label, value, accent, href, hint }: KpiProps) {
  const inner = (
    <Card
      className={cn('h-full min-h-28 py-0', href && 'transition-shadow hover:shadow-md')}
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
    >
      <CardContent className="flex flex-col gap-1.5 px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-3xl font-semibold leading-tight tracking-tight">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {inner}
      </Link>
    );
  }
  return inner;
}
