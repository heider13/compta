'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { OnboardingData, OrgPlan } from '@/lib/types/onboarding';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      <h2 className="text-[22px] font-semibold tracking-tight text-foreground">
        Choisissez un plan
      </h2>
      <p className="mb-6 mt-1.5 text-sm text-muted-foreground">
        Vous pouvez changer ou passer à la facturation plus tard. Aucun paiement requis maintenant.
      </p>

      <div
        role="radiogroup"
        aria-label="Plan d'abonnement"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {PLANS.map((plan) => {
          const isSelected = data.plan === plan.value;
          return (
            <label
              key={plan.value}
              className={cn(
                'relative flex cursor-pointer flex-col gap-2.5 rounded-xl border bg-card p-5 transition-all',
                isSelected
                  ? 'border-primary bg-accent/40 shadow-[0_6px_20px_rgba(91,54,214,0.12)] ring-1 ring-primary'
                  : 'hover:border-ring/60',
              )}
            >
              <input
                type="radio"
                name="plan"
                value={plan.value}
                checked={isSelected}
                onChange={() => onUpdate({ plan: plan.value })}
                className="absolute right-4 top-4 accent-primary"
              />
              {plan.highlighted && (
                <Badge className="w-fit">Recommandé</Badge>
              )}
              <div>
                <h3 className="text-[17px] font-semibold text-foreground">{plan.name}</h3>
                <p className="mt-1 min-h-9 text-[13px] text-muted-foreground">{plan.tagline}</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold tracking-tight text-foreground">
                  {plan.price}
                </span>
                <span className="text-xs text-muted-foreground">{plan.priceSuffix}</span>
              </div>
              <ul className="grid gap-1.5 text-[13px] text-foreground/80">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </label>
          );
        })}
      </div>

      <p className="mt-4 text-xs italic text-muted-foreground">
        Stripe n&apos;est pas encore branché — votre choix est sauvegardé et nous reviendrons vers
        vous pour la facturation.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="mt-8 flex justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onPrev}>
          ← Précédent
        </Button>
        <Button type="button" onClick={handleFinish} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Finalisation…
            </>
          ) : (
            'Terminer & accéder au dashboard'
          )}
        </Button>
      </div>
    </div>
  );
}
