'use client';

import { useState } from 'react';
import type { InvitationRole, OnboardingData, PendingInvitation } from '@/lib/types/onboarding';

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

const ROLES: { value: InvitationRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'collaborator', label: 'Collaborator' },
  { value: 'readonly', label: 'Readonly' },
];

export function Step3Team({ data, onUpdate, onNext, onPrev }: Props) {
  const [draftEmail, setDraftEmail] = useState('');
  const [draftRole, setDraftRole] = useState<InvitationRole>('collaborator');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmailValid = /^\S+@\S+\.\S+$/.test(draftEmail);
  const alreadyExists = data.invitations.some(
    (i) => i.email.toLowerCase() === draftEmail.trim().toLowerCase(),
  );

  function addInvitation() {
    if (!isEmailValid) {
      setError('Email invalide.');
      return;
    }
    if (alreadyExists) {
      setError('Cet email est déjà dans la liste.');
      return;
    }
    setError(null);
    const next: PendingInvitation[] = [
      ...data.invitations,
      { email: draftEmail.trim(), role: draftRole },
    ];
    onUpdate({ invitations: next });
    setDraftEmail('');
    setDraftRole('collaborator');
  }

  function removeInvitation(email: string) {
    onUpdate({
      invitations: data.invitations.filter((i) => i.email !== email),
    });
  }

  function changeRole(email: string, role: InvitationRole) {
    onUpdate({
      invitations: data.invitations.map((i) => (i.email === email ? { ...i, role } : i)),
    });
  }

  async function handleNext() {
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
        Invitez votre équipe
      </h2>
      <p
        style={{
          color: 'var(--ink-500)',
          marginTop: 6,
          marginBottom: 20,
          fontSize: 14,
        }}
      >
        Ajoutez les emails de vos collaborateurs. Les invitations seront stockées et envoyées dans une
        phase future (MVP : pas d&apos;envoi d&apos;email).
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle} htmlFor="inviteEmail">
            Inviter par email
          </label>
          <input
            id="inviteEmail"
            type="email"
            style={fieldStyle}
            value={draftEmail}
            onChange={(e) => setDraftEmail(e.target.value)}
            placeholder="collaborateur@cabinet.fr"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addInvitation();
              }
            }}
          />
        </div>
        <div style={{ width: 160 }}>
          <label style={labelStyle} htmlFor="inviteRole">
            Rôle
          </label>
          <select
            id="inviteRole"
            style={fieldStyle}
            value={draftRole}
            onChange={(e) => setDraftRole(e.target.value as InvitationRole)}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={addInvitation}
          disabled={!isEmailValid}
          className="btn btn-ghost"
          style={{ opacity: !isEmailValid ? 0.6 : 1, height: 42 }}
        >
          + Ajouter
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: 'var(--r-md)',
            background: '#FDEAEA',
            color: 'var(--status-red)',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {data.invitations.length > 0 ? (
        <div
          style={{
            marginTop: 20,
            border: '1px solid var(--ink-150)',
            borderRadius: 'var(--r-md)',
            overflow: 'hidden',
            background: 'white',
          }}
        >
          {data.invitations.map((inv, idx) => (
            <div
              key={inv.email}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderTop: idx === 0 ? 'none' : '1px solid var(--ink-100)',
                fontSize: 14,
              }}
            >
              <span style={{ flex: 1, color: 'var(--ink-900)' }}>{inv.email}</span>
              <select
                value={inv.role}
                onChange={(e) => changeRole(inv.email, e.target.value as InvitationRole)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--ink-200)',
                  background: 'white',
                  fontSize: 13,
                }}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeInvitation(inv.email)}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--status-red)' }}
                aria-label={`Retirer ${inv.email}`}
              >
                Retirer
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p
          style={{
            marginTop: 20,
            color: 'var(--ink-500)',
            fontSize: 13,
            fontStyle: 'italic',
          }}
        >
          Aucune invitation en attente. Vous pouvez passer cette étape et inviter plus tard depuis les
          réglages.
        </p>
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
          disabled={submitting}
          className="btn btn-accent"
          style={{ opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? 'Sauvegarde…' : 'Suivant →'}
        </button>
      </div>
    </div>
  );
}
