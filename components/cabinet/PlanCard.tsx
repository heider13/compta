// components/cabinet/PlanCard.tsx
// Card de plan affichée sur /billing. Sert pour les 3 plans (cabinet, pro,
// enterprise). Le bouton de souscription est un <form action={...}> qui
// pointe vers le Server Action createCheckoutSessionForm (ne nécessite donc
// pas que ce composant soit Client — il reste Server Component).
//
// Pour `enterprise` (pas de Stripe), on passe `mode="contact"` : le bouton
// devient un mailto:.

import { Check, Sparkle, Arrow } from '@/components/icons';
import { createCheckoutSessionForm } from '@/lib/server-actions/billing';

interface PlanCardProps {
  planId: 'cabinet' | 'pro' | 'enterprise';
  name: string;
  description: string;
  price: string; // ex. "79 €" ou "Sur devis"
  priceSuffix?: string; // ex. " / mois HT"
  features: string[];
  highlight?: string; // badge violet en haut, ex. "Le plus choisi"
  accent?: boolean; // applique le style accent (carte centrale)
  isCurrent?: boolean; // l'org courante est déjà sur ce plan
  // Mode :
  //   - 'subscribe' (par défaut) → form action Server Action Stripe
  //   - 'contact'                → mailto: pour Enterprise
  mode?: 'subscribe' | 'contact';
  contactEmail?: string;
  disabled?: boolean; // ex. si STRIPE_PRICE_* manquant
}

export function PlanCard({
  planId,
  name,
  description,
  price,
  priceSuffix,
  features,
  highlight,
  accent = false,
  isCurrent = false,
  mode = 'subscribe',
  contactEmail = 'contact@compta.app',
  disabled = false,
}: PlanCardProps) {
  return (
    <div
      className={`pricing-card ${accent ? 'highlighted card-elev' : 'card'}`}
      style={{
        padding: 28,
        border: accent ? '2px solid var(--accent)' : undefined,
        position: 'relative',
        background: accent
          ? 'linear-gradient(180deg, var(--violet-50), white 30%)'
          : 'white',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {accent && highlight && (
        <span
          className="pill violet"
          style={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--accent)',
            color: 'white',
            fontSize: 11,
            padding: '4px 12px',
          }}
        >
          <Sparkle size={11} />
          {highlight.toUpperCase()}
        </span>
      )}

      {isCurrent && (
        <span
          className="pill"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'var(--status-green, #16a34a)',
            color: 'white',
            fontSize: 11,
            padding: '3px 10px',
          }}
        >
          Plan actuel
        </span>
      )}

      <h3 style={{ fontSize: 22, marginBottom: 6 }}>{name}</h3>
      <p style={{ fontSize: 14, minHeight: 40, color: 'var(--ink-600)' }}>
        {description}
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
          margin: '20px 0 24px',
        }}
      >
        <span
          style={{
            fontSize: 40,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            color: 'var(--ink-900)',
          }}
        >
          {price}
        </span>
        {priceSuffix && (
          <span style={{ fontSize: 14, color: 'var(--ink-500)' }}>
            {priceSuffix}
          </span>
        )}
      </div>

      {mode === 'subscribe' && !isCurrent && (
        <form action={createCheckoutSessionForm}>
          <input type="hidden" name="plan" value={planId} />
          <button
            type="submit"
            disabled={disabled}
            className={`btn ${accent ? 'btn-accent' : 'btn-ghost'}`}
            style={{
              width: '100%',
              marginBottom: 24,
              justifyContent: 'center',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            Souscrire
            <Arrow size={16} />
          </button>
        </form>
      )}

      {mode === 'subscribe' && isCurrent && (
        <div
          style={{
            width: '100%',
            marginBottom: 24,
            padding: '10px 16px',
            background: 'var(--ink-50)',
            borderRadius: 8,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--ink-600)',
          }}
        >
          Vous êtes sur ce plan
        </div>
      )}

      {mode === 'contact' && (
        <a
          href={`mailto:${contactEmail}?subject=Demande%20de%20devis%20Enterprise%20-%20Compta`}
          className={`btn ${accent ? 'btn-accent' : 'btn-ghost'}`}
          style={{
            width: '100%',
            marginBottom: 24,
            justifyContent: 'center',
          }}
        >
          Nous contacter
          <Arrow size={16} />
        </a>
      )}

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'grid',
          gap: 10,
        }}
      >
        {features.map((f) => (
          <li
            key={f}
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              fontSize: 14,
              color: 'var(--ink-700)',
            }}
          >
            <Check
              size={16}
              style={{ color: 'var(--accent)', marginTop: 3, flexShrink: 0 }}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
