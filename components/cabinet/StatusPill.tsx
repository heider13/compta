// Pill de statut dossier — mapping label FR + tonalité couleur (palette globals.css)

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

interface StatusPillProps {
  statut: string;
  withDot?: boolean;
}

export function StatusPill({ statut, withDot = true }: StatusPillProps) {
  const meta = STATUS_MAP[statut] ?? { label: statut, tone: 'gray' as const };
  return (
    <span className={`pill ${meta.tone}`}>
      {withDot && <span className="dot" />}
      {meta.label}
    </span>
  );
}

export function statusLabel(statut: string): string {
  return STATUS_MAP[statut]?.label ?? statut;
}
