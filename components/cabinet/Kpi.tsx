import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiProps {
  label: string;
  value: number | string;
  accent?: string; // Couleur CSS d'accent (ex. 'var(--status-blue)'), affichée en pastille
  href?: string;
  hint?: string;
}

export function Kpi({ label, value, accent, href, hint }: KpiProps) {
  const inner = (
    <Card className={cn('h-full min-h-28 gap-0 py-0', href && 'transition-colors hover:bg-muted/40')}>
      <CardContent className="flex flex-col gap-2 p-5">
        <p className="label-mono flex items-center gap-1.5">
          {accent && (
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: accent }}
              aria-hidden="true"
            />
          )}
          {label}
        </p>
        <p className="font-mono text-3xl leading-tight font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
