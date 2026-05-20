'use client';

import { useState } from 'react';
import type { OnboardingData, OrgPlan } from '@/lib/types/onboarding';

type Props = {
  data: OnboardingData;
  onUpdate: (patch: Partial<OnboardingData>) => void;
  onNext: () => void | Promise<void>;
  onPrev: () => void;
};

type PlanCard = {
  value: OrgPlan;
  name: string;
  price: string;
  priceSuffix: string;
  tagline: string;
  features: string[];
  highlighted?: boolean;
};

const PLANS: PlanCard[] = [
  {
    value: 'cabinet',
    name: 'Cabinet',
    price: '79 €',
    priceSuffix: '/mois HT',
    tagline: 'Pour les cabinets indépendants qui démarrent.',
    features: ['Jusqu’à 3 utilisateurs', '50 dossiers actifs', 'Dépôts INPI illimités', 'Support email'],
  },
  {
    value: 'pro',
    name: 'Pro',
    price: '199 €',
    priceSuffix: '/mois HT',
    tagline: 'Le standard des cabinets en croissance.',
    features: [
      'Jusqu’à 10 utilisateurs',
      'Dossiers illimités',
      'API & webhooks',
      'Support prioritaire',
    ],
    highlighted: true,
  },
  {
    value: 'enterprise',
    name: 'Enterprise',
    price: 'Sur devis',
    priceSuffix: '',
    tagline: 'Pour les groupes et les très gros cabinets.',
    features: [
      'Utilisateurs illimités',
      'SSO / SAML',
      'SLA & onboarding dédié',
      'Marque blanche',
    ],
  },
];

export function Step4Plan({ data, onUpdate, onNext, onPrev }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinish() {
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
        Choisissez un plan
      </h2>
      <p
        style={{
          color: 'var(--ink-500)',
          marginTop: 6,
          marginBottom: 24,
          fontSize: 14,
        }}
      >
        Vous pouvez changer ou passer à la facturation plus tard. Aucun paiement requis maintenant.
      </p>

      <div className="grid-3" style={{ gap: 16 }}>
        {PLANS.map((plan) => {
          const isSelected = data.plan === plan.value;
          return (
            <label
              key={plan.value}
              className="card"
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--accent)' : 'var(--ink-150)',
                boxShadow: isSelected ? '0 6px 20px rgba(91,54,214,0.12)' : 'none',
                background: isSelected ? 'var(--violet-50)' : 'white',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                transition:
                  'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
              }}
            >
              <input
                type="radio"
                name="plan"
                value={plan.value}
                checked={isSelected}
                onChange={() => onUpdate({ plan: plan.value })}
                style={{ position: 'absolute', top: 14, right: 14 }}
              />
              {plan.highlighted && (
                <span
                  className="pill violet"
                  style={{ alignSelf: 'flex-start', fontSize: 11 }}
                >
                  Recommandé
                </span>
              )}
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{plan.name}</h3>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 13,
                    color: 'var(--ink-500)',
                    minHeight: 36,
                  }}
                >
                  {plan.tagline}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>
                  {plan.price}
                </span>
                <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>{plan.priceSuffix}</span>
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'grid',
                  gap: 6,
                  fontSize: 13,
                  color: 'var(--ink-700)',
                }}
              >
                {plan.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--accent)' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </label>
          );
        })}
      </div>

      <p
        style={{
          marginTop: 16,
          fontSize: 12,
          color: 'var(--ink-500)',
          fontStyle: 'italic',
        }}
      >
        Stripe n&apos;est pas encore branché — votre choix est sauvegardé et nous reviendrons vers vous
        pour la facturation.
      </p>

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
          onClick={handleFinish}
          disabled={submitting}
          className="btn btn-accent"
          style={{ opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? 'Finalisation…' : 'Terminer & accéder au dashboard'}
        </button>
      </div>
    </div>
  );
}
