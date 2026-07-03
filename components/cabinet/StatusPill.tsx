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
  gray: 'bg-muted text-muted-foreground',
  blue: 'bg-blue-50 text-blue-700 [a&]:hover:bg-blue-100',
  amber: 'bg-amber-50 text-amber-700 [a&]:hover:bg-amber-100',
  orange: 'bg-orange-50 text-orange-700 [a&]:hover:bg-orange-100',
  green: 'bg-emerald-50 text-emerald-700 [a&]:hover:bg-emerald-100',
  red: 'bg-red-50 text-red-700 [a&]:hover:bg-red-100',
  violet: 'bg-accent text-accent-foreground',
};

const DOT_CLASSES: Record<Tone, string> = {
  gray: 'bg-muted-foreground/60',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  green: 'bg-emerald-500',
  red: 'bg-red-500',
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
      variant="secondary"
      className={cn('gap-1.5 rounded-full border-transparent font-medium', TONE_CLASSES[meta.tone])}
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
