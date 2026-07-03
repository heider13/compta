// Badge de statut dossier — version shadcn/Tailwind du StatusPill legacy.
// Duplique le mapping statut→ton de StatusPill.tsx (source de vérité métier)
// le temps de la migration ; StatusPill reste utilisé par les pages legacy.

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Tone = 'blue' | 'amber' | 'orange' | 'green' | 'red' | 'gray' | 'violet';

const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
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
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  orange: 'border-orange-200 bg-orange-50 text-orange-700',
  green: 'border-green-200 bg-green-50 text-green-700',
  red: 'border-red-200 bg-red-50 text-red-700',
  gray: 'border-border bg-muted text-muted-foreground',
  violet: 'border-accent bg-accent text-accent-foreground',
};

const DOT_CLASSES: Record<Tone, string> = {
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  gray: 'bg-muted-foreground',
  violet: 'bg-primary',
};

export function StatusBadge({ statut, withDot = true }: { statut: string; withDot?: boolean }) {
  const meta = STATUS_MAP[statut] ?? { label: statut, tone: 'gray' as const };
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', TONE_CLASSES[meta.tone])}>
      {withDot && <span className={cn('size-1.5 rounded-full', DOT_CLASSES[meta.tone])} />}
      {meta.label}
    </Badge>
  );
}
