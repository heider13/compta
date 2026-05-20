'use client';

import { useState } from 'react';
import type { OnboardingData } from '@/lib/types/onboarding';

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

export function Step1Cabinet({ data, onUpdate, onNext }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sirenDigits = data.siren.replace(/\D/g, '');
  const sirenValid = sirenDigits.length === 9;

  const isValid =
    data.cabinetName.trim().length > 1 &&
    sirenValid &&
    /^\S+@\S+\.\S+$/.test(data.contactEmail);

  async function handleNext() {
    if (!isValid) {
      setError('Merci de renseigner le nom, un SIREN à 9 chiffres et un email valide.');
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
            onChange={(e) => onUpdate({ cabinetName: e.target.value })}
            placeholder="Cabinet Dupont & Associés"
            required
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="siren">
            SIREN du cabinet <span style={{ color: 'var(--status-red)' }}>*</span>
          </label>
          <input
            id="siren"
            type="text"
            inputMode="numeric"
            maxLength={11}
            style={fieldStyle}
            value={data.siren}
            onChange={(e) => onUpdate({ siren: e.target.value })}
            placeholder="123 456 789"
            required
          />
          <span style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4, display: 'block' }}>
            9 chiffres — visible sur votre Kbis.
          </span>
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
