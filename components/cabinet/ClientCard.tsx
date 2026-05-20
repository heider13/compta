import Link from 'next/link';
import { formatSiren, getInitials, type Client } from '@/lib/types';

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
      className="app-card app-card-pad"
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color .12s, box-shadow .12s',
      }}
    >
      <div className="avatar avatar-lg">{initials}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontWeight: 600,
            color: 'var(--ink-900)',
            fontSize: 15,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {client.denomination}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 2 }}>
          {client.forme_juridique ?? '—'} · SIREN {formatSiren(client.siren)}
        </div>
      </div>
      {showBadge && (
        <span className={`pill ${isArchived ? 'gray' : 'violet'}`}>
          <span className="dot"></span>
          {isArchived ? 'Archivé' : 'Actif'}
        </span>
      )}
    </Link>
  );
}
