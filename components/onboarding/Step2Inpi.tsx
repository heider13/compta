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

export function Step2Inpi({ data, onUpdate, onNext, onPrev }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    data.inpiUsername.trim().length > 0 && data.inpiPassword.trim().length > 0;

  async function handleNext() {
    if (!isValid) {
      setError('Username et password INPI sont requis.');
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
      <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
        Credentials INPI mandataire
      </h2>
      <p
        style={{
          color: 'var(--ink-500)',
          marginTop: 6,
          marginBottom: 20,
          fontSize: 14,
        }}
      >
        Ces identifiants permettront à Compta de soumettre vos formalités au Guichet Unique INPI au nom de
        votre cabinet.
      </p>

      <div
        style={{
          padding: '12px 14px',
          borderRadius: 'var(--r-md)',
          background: 'var(--violet-50)',
          border: '1px solid var(--violet-100)',
          color: 'var(--accent-ink)',
          fontSize: 13,
          marginBottom: 20,
        }}
      >
        Ces credentials seront chiffrés côté serveur. Vous pouvez créer un compte mandataire sur{' '}
        <a
          href="https://procedures.inpi.fr"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'underline', fontWeight: 500 }}
        >
          procedures.inpi.fr
        </a>
        .
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="inpiUsername">
            Username mandataire INPI <span style={{ color: 'var(--status-red)' }}>*</span>
          </label>
          <input
            id="inpiUsername"
            type="text"
            autoComplete="off"
            style={fieldStyle}
            value={data.inpiUsername}
            onChange={(e) => onUpdate({ inpiUsername: e.target.value })}
            placeholder="mandataire@cabinet.fr"
            required
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="inpiPassword">
            Password mandataire INPI <span style={{ color: 'var(--status-red)' }}>*</span>
          </label>
          <input
            id="inpiPassword"
            type="password"
            autoComplete="new-password"
            style={fieldStyle}
            value={data.inpiPassword}
            onChange={(e) => onUpdate({ inpiPassword: e.target.value })}
            placeholder="••••••••"
            required
          />
        </div>

        <div>
          <span style={labelStyle}>Environnement</span>
          <div style={{ display: 'flex', gap: 12 }}>
            <label
              style={{
                flex: 1,
                padding: '12px 14px',
                border: `1px solid ${data.inpiEnv === 'prod' ? 'var(--accent)' : 'var(--ink-200)'}`,
                borderRadius: 'var(--r-md)',
                background: data.inpiEnv === 'prod' ? 'var(--violet-50)' : 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 14,
              }}
            >
              <input
                type="radio"
                name="inpiEnv"
                value="prod"
                checked={data.inpiEnv === 'prod'}
                onChange={() => onUpdate({ inpiEnv: 'prod' })}
              />
              <span>
                <strong>Production</strong>
                <span
                  style={{ display: 'block', fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}
                >
                  Dépôts réels au RNE
                </span>
              </span>
            </label>
            <label
              style={{
                flex: 1,
                padding: '12px 14px',
                border: `1px solid ${data.inpiEnv === 'demo' ? 'var(--accent)' : 'var(--ink-200)'}`,
                borderRadius: 'var(--r-md)',
                background: data.inpiEnv === 'demo' ? 'var(--violet-50)' : 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 14,
              }}
            >
              <input
                type="radio"
                name="inpiEnv"
                value="demo"
                checked={data.inpiEnv === 'demo'}
                onChange={() => onUpdate({ inpiEnv: 'demo' })}
              />
              <span>
                <strong>Démo</strong>
                <span
                  style={{ display: 'block', fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}
                >
                  Bac à sable INPI
                </span>
              </span>
            </label>
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
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <button type="button" onClick={onPrev} className="btn btn-ghost">
          ← Précédent
        </button>
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
