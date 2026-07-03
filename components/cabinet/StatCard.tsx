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

const TONE_CLASSES: Record<NonNullable<StatCardProps['tone']>, string> = {
  gray: 'bg-muted text-foreground',
  violet: 'bg-primary text-primary-foreground',
  blue: 'bg-blue-500 text-white',
  orange: 'bg-orange-500 text-white',
  amber: 'bg-amber-500 text-white',
  green: 'bg-emerald-500 text-white',
  red: 'bg-red-500 text-white',
};

export function StatCard({ count, label, sublabel, tone = 'gray', href }: StatCardProps) {
  const content = (
    <Card className={cn('h-full py-0', href && 'transition-shadow hover:shadow-md')}>
      <CardContent className="flex items-center gap-4 px-5 py-4">
        <span
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-full text-lg font-semibold',
            TONE_CLASSES[tone],
          )}
        >
          {count}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {sublabel && <p className="truncate text-sm font-medium">{sublabel}</p>}
        </div>
        {href && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
      </CardContent>
    </Card>
  );
  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {content}
      </Link>
    );
  }
  return content;
}
