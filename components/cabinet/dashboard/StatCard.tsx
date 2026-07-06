import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  href?: string | null;
  /** Tailwind classes for the icon tile, e.g. "text-primary bg-[#ede7ff]". */
  tileClass: string;
}

export function StatCard({ label, value, hint, icon: Icon, href, tileClass }: StatCardProps) {
  const inner = (
    <Card className="h-full gap-0 py-0 transition-shadow hover:shadow-md">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tileClass}`}>
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
