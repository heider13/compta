// lib/stripe.ts
// Singleton Stripe SDK (server-side) + helper navigateur (loadStripe).
//
// Dépendances :
//   - stripe (server)               → process.env.STRIPE_SECRET_KEY
//   - @stripe/stripe-js (browser)   → process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
//
// IMPORTANT : Ne PAS importer ce fichier depuis un Client Component (sauf pour
// `getStripeClient` qui est isomorphique mais ne fait rien d'utile côté server).
// L'instance `Stripe` server lit STRIPE_SECRET_KEY ; si elle manque, getStripe()
// throw → on attrape l'erreur dans les Server Actions pour renvoyer un message
// clean au lieu de crasher l'app.

import Stripe from 'stripe';
import { loadStripe, type Stripe as StripeBrowser } from '@stripe/stripe-js';

// ─── Server-side singleton ──────────────────────────────────────────────
// Évite de recréer le client à chaque requête. En dev, Next.js peut hot-reload
// ce module → on tag globalThis pour préserver l'instance.

declare global {
  // eslint-disable-next-line no-var
  var __stripeClient: Stripe | undefined;
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY manquante. Ajoutez-la dans .env.local (dev) ou Vercel Env (prod). Voir SETUP-STRIPE.md.',
    );
  }
  if (globalThis.__stripeClient) return globalThis.__stripeClient;
  // On laisse Stripe utiliser sa apiVersion par défaut (celle de la lib
  // installée) plutôt que de la pinner ici. Override possible via env.
  const apiVersion = process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion | undefined;
  const client = new Stripe(key, {
    ...(apiVersion ? { apiVersion } : {}),
    typescript: true,
    appInfo: {
      name: 'Legaly AI',
      version: '0.1.0',
    },
  });
  globalThis.__stripeClient = client;
  return client;
}

// Indique si Stripe est configuré (utilisé pour afficher un message d'erreur
// propre dans le UI au lieu de crasher avant que la page rende).
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// ─── Plans mapping ──────────────────────────────────────────────────────
// `enterprise` n'est PAS dans ce mapping — il est traité côté UI comme "contact
// commercial" (pas de checkout Stripe).

export type BillingPlanId = 'cabinet' | 'pro';

export interface PlanConfig {
  id: BillingPlanId;
  name: string;
  priceId: string | undefined; // peut être undefined si env var pas set
  amount: number; // en euros HT, pour affichage
  amountCents: number; // pour comparaisons / facturation interne
  currency: 'EUR';
  description: string;
  features: string[];
}

export const PLANS: Record<BillingPlanId, PlanConfig> = {
  cabinet: {
    id: 'cabinet',
    name: 'Cabinet',
    priceId: process.env.STRIPE_PRICE_CABINET,
    amount: 79,
    amountCents: 7900,
    currency: 'EUR',
    description: 'Pour les petits cabinets et formalistes indépendants.',
    features: [
      "Jusqu'à 3 collaborateurs",
      "Jusqu'à 50 dossiers / mois",
      'Toutes les formalités INPI',
      'Espace client + signature',
      'Support email sous 24 h',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Cabinet Pro',
    priceId: process.env.STRIPE_PRICE_PRO,
    amount: 199,
    amountCents: 19900,
    currency: 'EUR',
    description: 'Pour les cabinets en croissance avec plusieurs collaborateurs.',
    features: [
      "Jusqu'à 10 collaborateurs",
      'Volume de dossiers illimité',
      'CRM intégré + import Pappers',
      'Automatisation des relances',
      'Support prioritaire 7j/7',
      'Marque blanche (logo + couleurs)',
    ],
  },
};

export function getPlanConfig(plan: BillingPlanId): PlanConfig {
  return PLANS[plan];
}

// Retrouve un plan à partir d'un Stripe price ID (utilisé dans le webhook).
export function planFromPriceId(priceId: string | null | undefined): BillingPlanId | null {
  if (!priceId) return null;
  if (PLANS.cabinet.priceId && PLANS.cabinet.priceId === priceId) return 'cabinet';
  if (PLANS.pro.priceId && PLANS.pro.priceId === priceId) return 'pro';
  return null;
}

// ─── Browser-side singleton ─────────────────────────────────────────────
// loadStripe() est un import dynamique idempotent ; on le wrap simplement.

let _stripeBrowserPromise: Promise<StripeBrowser | null> | null = null;

export function getStripeClient(): Promise<StripeBrowser | null> {
  if (_stripeBrowserPromise) return _stripeBrowserPromise;
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!pk) {
    console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY manquante — getStripeClient() retournera null.');
    _stripeBrowserPromise = Promise.resolve(null);
    return _stripeBrowserPromise;
  }
  _stripeBrowserPromise = loadStripe(pk);
  return _stripeBrowserPromise;
}
