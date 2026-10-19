import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { formatSiren, getInitials, type Client } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface ClientCardProps {
  client: Pick<
    Client,
    'id' | 'denomination' | 'siren' | 'forme_juridique' | 'archived_at' | 'source'
  >;
  href?: string;
  showBadge?: boolean;
}

export function ClientCard({ client, href, showBadge = true }: ClientCardProps) {
  const initials = getInitials(client.denomination);
  const linkHref = href ?? `/clients/${client.id}`;
  const isArchived = !!client.archived_at;

  return (
    <Link
      href={linkHref}
      className="group flex items-center gap-3 rounded-xl border bg-card p-4 text-inherit no-underline shadow-xs transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-md border bg-background text-xs font-semibold text-muted-foreground">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{client.denomination}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {client.forme_juridique ?? '—'} ·{' '}
          <span className="font-mono tabular-nums">SIREN {formatSiren(client.siren)}</span>
        </p>
      </div>
      {showBadge && (
        <Badge
          variant="outline"
          className={
            isArchived
              ? 'gap-1.5 text-muted-foreground'
              : 'gap-1.5 border-brand-border bg-brand-soft text-brand-soft-foreground'
          }
        >
          <span
            className={isArchived ? 'size-1.5 rounded-full bg-muted-foreground/50' : 'live-dot size-1.5 text-primary'}
            aria-hidden="true"
          />
          {isArchived ? 'Archivé' : 'Actif'}
        </Badge>
      )}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
    </Link>
  );
}
