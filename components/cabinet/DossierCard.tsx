import Link from 'next/link';
import { StatusPill } from '@/components/cabinet/StatusPill';
import { formatRelative, typeFormaliteLabel } from '@/lib/utils/format';

export interface DossierCardData {
  id: string;
  reference: string | null;
  client_name: string;
  type_formalite: string;
  forme_juridique?: string | null;
  statut: string;
  updated_at?: string | null;
  created_at?: string | null;
}

interface DossierCardProps {
  dossier: DossierCardData;
  showStatus?: boolean;
}

export function DossierCard({ dossier, showStatus = false }: DossierCardProps) {
  const dateRef = dossier.updated_at ?? dossier.created_at ?? null;

  return (
    <Link
      href={`/dossiers/${dossier.id}`}
      className="app-card app-card-pad"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        textDecoration: 'none',
        color: 'inherit',
        padding: '12px 14px',
        transition: 'border-color .12s, box-shadow .12s, transform .12s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--ink-500)',
            letterSpacing: '0.02em',
          }}
        >
          {dossier.reference ?? '—'}
        </span>
        {dossier.forme_juridique && (
          <span className="pill violet" style={{ fontSize: 10, padding: '2px 8px' }}>
            {dossier.forme_juridique}
          </span>
        )}
      </div>

      <div
        style={{
          fontWeight: 600,
          fontSize: 14,
          color: 'var(--ink-900)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {dossier.client_name}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: 12,
          color: 'var(--ink-500)',
        }}
      >
        <span>{typeFormaliteLabel(dossier.type_formalite)}</span>
        <span>{formatRelative(dateRef)}</span>
      </div>

      {showStatus && (
        <div style={{ marginTop: 2 }}>
          <StatusPill statut={dossier.statut} />
        </div>
      )}
    </Link>
  );
}
