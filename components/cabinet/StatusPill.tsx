// Badge de statut dossier — mapping label FR + tonalité couleur (Tailwind/shadcn)

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Tone = 'blue' | 'amber' | 'orange' | 'green' | 'red' | 'gray' | 'violet';

interface StatusMeta {
  label: string;
  tone: Tone;
}

const STATUS_MAP: Record<string, StatusMeta> = {
  DRAFT: { label: 'Brouillon', tone: 'gray' },
  AWAITING_VALIDATION: { label: 'À valider', tone: 'blue' },
  INTERNAL_AMENDMENT_PENDING: { label: 'Correction', tone: 'orange' },
  VALIDATED_INTERNAL: { label: 'Validé int.', tone: 'green' },
  RECEIVED: { label: 'Reçu INPI', tone: 'blue' },
  VALIDATION_PENDING: { label: 'Val. INPI', tone: 'blue' },
  AMENDMENT_PENDING: { label: 'Régul.', tone: 'orange' },
  PAYMENT_PENDING: { label: 'Paiement', tone: 'amber' },
  SIGNATURE_PENDING: { label: 'Signature', tone: 'amber' },
  VALIDATED: { label: 'Validé INPI', tone: 'green' },
  REJECTED: { label: 'Rejeté', tone: 'red' },
};

const TONE_CLASSES: Record<Tone, string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
  amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  orange: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300',
  green: 'border-success/30 bg-success/10 text-success',
  red: 'border-destructive/30 bg-destructive/10 text-destructive',
  gray: 'border-border bg-muted text-muted-foreground',
  violet: 'border-brand-border bg-brand-soft text-brand-soft-foreground',
};

const DOT_CLASSES: Record<Tone, string> = {
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  green: 'bg-success',
  red: 'bg-destructive',
  gray: 'bg-muted-foreground/60',
  violet: 'bg-primary',
};

interface StatusPillProps {
  statut: string;
  withDot?: boolean;
}

export function StatusPill({ statut, withDot = true }: StatusPillProps) {
  const meta = STATUS_MAP[statut] ?? { label: statut, tone: 'gray' as const };
  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 font-medium', TONE_CLASSES[meta.tone])}
    >
      {withDot && (
        <span
          aria-hidden="true"
          className={cn('size-1.5 shrink-0 rounded-full', DOT_CLASSES[meta.tone])}
        />
      )}
      {meta.label}
    </Badge>
  );
}

export function statusLabel(statut: string): string {
  return STATUS_MAP[statut]?.label ?? statut;
}
