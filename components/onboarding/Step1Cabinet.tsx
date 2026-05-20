'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { OnboardingData } from '@/lib/types/onboarding';
import { formatSiren, validateSiren } from '@/lib/validators/siren';
import { lookupSiren, type SirenLookupResult } from '@/lib/services/siren-lookup';

type Props = {
  data: OnboardingData;
  onUpdate: (patch: Partial<OnboardingData>) => void;
  onNext: () => void | Promise<void>;
  onPrev: () => void;
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--r-md)',
  border: '1px solid var(--ink-200)',
  background: 'white',
  fontSize: 14,
  color: 'var(--ink-900)',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--ink-700)',
  marginBottom: 6,
};

type SirenStatus =
  | { kind: 'idle' }
  | { kind: 'too_short' }
  | { kind: 'bad_checksum' }
  | { kind: 'looking_up' }
  | { kind: 'not_found' }
  | { kind: 'closed'; info: SirenLookupResult }
  | { kind: 'verified'; info: SirenLookupResult }
  | { kind: 'lookup_error'; message: string };

export function Step1Cabinet({ data, onUpdate, onNext }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sirenStatus, setSirenStatus] = useState<SirenStatus>({ kind: 'idle' });
  const lookupSeq = useRef(0);
  const nameAutoFilled = useRef(false);

  const validation = useMemo(() => validateSiren(data.siren), [data.siren]);

  // Vérification distante : déclenchée 400 ms après le dernier changement,
  // uniquement si le SIREN passe la validation locale.
  useEffect(() => {
    if (validation.kind === 'empty') {
      setSirenStatus({ kind: 'idle' });
      return;
    }
    if (validation.kind === 'too_short') {
      setSirenStatus({ kind: 'too_short' });
      return;
    }
    if (validation.kind === 'bad_checksum') {
      setSirenStatus({ kind: 'bad_checksum' });
      return;
    }

    const mySeq = ++lookupSeq.current;
    setSirenStatus({ kind: 'looking_up' });
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const result = await lookupSiren(validation.digits, controller.signal);
        if (mySeq !== lookupSeq.current) return; // une saisie plus récente a invalidé celle-ci
        if (!result) {
          setSirenStatus({ kind: 'not_found' });
          return;
        }
        if (result.etatAdministratif === 'C') {
          setSirenStatus({ kind: 'closed', info: result });
          return;
        }
        setSirenStatus({ kind: 'verified', info: result });
        // Préremplit le nom du cabinet si l'utilisateur n'a rien saisi (ou si on l'avait
        // déjà rempli automatiquement) et qu'on a une raison sociale.
        if (result.nomComplet && (!data.cabinetName.trim() || nameAutoFilled.current)) {
          nameAutoFilled.current = true;
          onUpdate({ cabinetName: result.nomComplet });
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (mySeq !== lookupSeq.current) return;
        setSirenStatus({
          kind: 'lookup_error',
          message: err instanceof Error ? err.message : 'Vérification impossible.',
        });
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // On ne dépend que de la version normalisée du SIREN — pas du nom du cabinet
    // pour éviter de re-déclencher la vérif à chaque frappe dans ce champ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation.kind, validation.kind === 'ok' ? validation.digits : '']);

  const sirenOk = sirenStatus.kind === 'verified';
  const isValid =
    data.cabinetName.trim().length > 1 &&
    sirenOk &&
    /^\S+@\S+\.\S+$/.test(data.contactEmail);

  async function handleNext() {
    if (!isValid) {
      setError(
        sirenStatus.kind === 'verified'
          ? 'Merci de renseigner le nom du cabinet et un email valide.'
          : 'Le SIREN doit être vérifié avant de continuer.',
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 600,
          margin: 0,
          letterSpacing: '-0.01em',
        }}
      >
        Votre cabinet
      </h2>
      <p
        style={{
          color: 'var(--ink-500)',
          marginTop: 6,
          marginBottom: 24,
          fontSize: 14,
        }}
      >
        Personnalisez le nom et renseignez le SIREN de votre cabinet.
      </p>

      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="cabinetName">
            Nom du cabinet <span style={{ color: 'var(--status-red)' }}>*</span>
          </label>
          <input
            id="cabinetName"
            type="text"
            style={fieldStyle}
            value={data.cabinetName}
            onChange={(e) => {
              nameAutoFilled.current = false;
              onUpdate({ cabinetName: e.target.value });
            }}
            placeholder="Cabinet Dupont & Associés"
            required
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="siren">
            SIREN du cabinet <span style={{ color: 'var(--status-red)' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="siren"
              type="text"
              inputMode="numeric"
              maxLength={11}
              style={{
                ...fieldStyle,
                paddingRight: 36,
                borderColor: sirenBorderColor(sirenStatus),
              }}
              value={data.siren}
              onChange={(e) => onUpdate({ siren: formatSiren(e.target.value) })}
              placeholder="123 456 789"
              required
              aria-invalid={isSirenInvalid(sirenStatus)}
            />
            <SirenStatusIcon status={sirenStatus} />
          </div>
          <SirenStatusMessage status={sirenStatus} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle} htmlFor="contactEmail">
              Email de contact <span style={{ color: 'var(--status-red)' }}>*</span>
            </label>
            <input
              id="contactEmail"
              type="email"
              style={fieldStyle}
              value={data.contactEmail}
              onChange={(e) => onUpdate({ contactEmail: e.target.value })}
              placeholder="contact@cabinet.fr"
              required
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="contactPhone">
              Téléphone
            </label>
            <input
              id="contactPhone"
              type="tel"
              style={fieldStyle}
              value={data.contactPhone}
              onChange={(e) => onUpdate({ contactPhone: e.target.value })}
              placeholder="+33 1 23 45 67 89"
            />
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: '10px 12px',
            borderRadius: 'var(--r-md)',
            background: '#FDEAEA',
            color: 'var(--status-red)',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          marginTop: 32,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={handleNext}
          disabled={submitting || !isValid}
          className="btn btn-accent"
          style={{ opacity: submitting || !isValid ? 0.6 : 1 }}
        >
          {submitting ? 'Sauvegarde…' : 'Suivant →'}
        </button>
      </div>
    </div>
  );
}

function sirenBorderColor(status: SirenStatus): string {
  switch (status.kind) {
    case 'verified':
      return 'var(--status-green, #137333)';
    case 'bad_checksum':
    case 'not_found':
    case 'closed':
      return 'var(--status-red)';
    case 'lookup_error':
      return 'var(--status-amber, #b54708)';
    default:
      return 'var(--ink-200)';
  }
}

function isSirenInvalid(status: SirenStatus): boolean {
  return (
    status.kind === 'bad_checksum' ||
    status.kind === 'not_found' ||
    status.kind === 'closed'
  );
}

function SirenStatusIcon({ status }: { status: SirenStatus }) {
  const base: React.CSSProperties = {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 18,
    height: 18,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    borderRadius: '50%',
    color: 'white',
  };
  switch (status.kind) {
    case 'looking_up':
      return (
        <span
          style={{
            ...base,
            background: 'transparent',
            color: 'var(--ink-500)',
          }}
          aria-label="Vérification en cours"
        >
          <span
            style={{
              width: 14,
              height: 14,
              border: '2px solid var(--ink-200)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </span>
      );
    case 'verified':
      return (
        <span style={{ ...base, background: 'var(--status-green, #137333)' }} aria-label="SIREN vérifié">
          ✓
        </span>
      );
    case 'bad_checksum':
    case 'not_found':
    case 'closed':
      return (
        <span style={{ ...base, background: 'var(--status-red)' }} aria-label="SIREN invalide">
          ✕
        </span>
      );
    case 'lookup_error':
      return (
        <span
          style={{ ...base, background: 'var(--status-amber, #b54708)' }}
          aria-label="Vérification impossible"
        >
          !
        </span>
      );
    default:
      return null;
  }
}

function SirenStatusMessage({ status }: { status: SirenStatus }) {
  const baseStyle: React.CSSProperties = {
    fontSize: 12,
    marginTop: 4,
    display: 'block',
  };
  switch (status.kind) {
    case 'idle':
      return (
        <span style={{ ...baseStyle, color: 'var(--ink-500)' }}>
          9 chiffres — visible sur votre Kbis.
        </span>
      );
    case 'too_short':
      return (
        <span style={{ ...baseStyle, color: 'var(--ink-500)' }}>
          Encore quelques chiffres…
        </span>
      );
    case 'bad_checksum':
      return (
        <span style={{ ...baseStyle, color: 'var(--status-red)' }}>
          Numéro invalide — la clé de contrôle ne correspond pas.
        </span>
      );
    case 'looking_up':
      return (
        <span style={{ ...baseStyle, color: 'var(--ink-500)' }}>
          Vérification auprès du registre national…
        </span>
      );
    case 'not_found':
      return (
        <span style={{ ...baseStyle, color: 'var(--status-red)' }}>
          Aucune entreprise trouvée avec ce SIREN.
        </span>
      );
    case 'closed':
      return (
        <span style={{ ...baseStyle, color: 'var(--status-red)' }}>
          {status.info.nomComplet || 'Cette entreprise'} est marquée comme cessée au registre.
        </span>
      );
    case 'verified':
      return (
        <span style={{ ...baseStyle, color: 'var(--status-green, #137333)' }}>
          ✓ {status.info.nomComplet}
          {status.info.adresse ? ` — ${status.info.adresse}` : ''}
        </span>
      );
    case 'lookup_error':
      return (
        <span style={{ ...baseStyle, color: 'var(--status-amber, #b54708)' }}>
          Vérification impossible : {status.message}
        </span>
      );
  }
}
