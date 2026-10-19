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
      className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card px-3.5 py-3 text-foreground no-underline shadow-xs transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[11px] tracking-wide text-muted-foreground">
          {dossier.reference ?? '—'}
        </span>
        {dossier.forme_juridique && (
          <span className="shrink-0 rounded-md border border-brand-border bg-brand-soft px-1.5 py-px font-mono text-[10px] font-medium text-brand-soft-foreground">
            {dossier.forme_juridique}
          </span>
        )}
      </div>

      <div className="truncate text-sm font-semibold">{dossier.client_name}</div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{typeFormaliteLabel(dossier.type_formalite)}</span>
        <span className="shrink-0 font-mono text-[11px] tabular-nums">{formatRelative(dateRef)}</span>
      </div>

      {showStatus && (
        <div className="mt-0.5">
          <StatusPill statut={dossier.statut} />
        </div>
      )}
    </Link>
  );
}
