// lib/types/billing.ts
// Types miroir DB + DTO pour la facturation cabinet (abonnement Stripe).
// Conserve une seule source de vérité côté code : ces interfaces correspondent
// aux colonnes des tables `organizations` et `invoices` (schema-v3.sql).

// ─── Plans supportés ────────────────────────────────────────────────────
// `cabinet` et `pro` sont gérés via Stripe.
// `enterprise` est géré hors-Stripe (devis + contrat).

export type BillingPlan = 'cabinet' | 'pro' | 'enterprise';

export const STRIPE_MANAGED_PLANS: ReadonlyArray<Exclude<BillingPlan, 'enterprise'>> = [
  'cabinet',
  'pro',
] as const;

// ─── État d'abonnement côté UI ──────────────────────────────────────────
// Construit à partir de la ligne `organizations` + d'un fetch Stripe SSR.

export interface SubscriptionInfo {
  plan: BillingPlan;
  hasActiveSubscription: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  // Stripe subscription status (ex. 'active', 'trialing', 'past_due', 'canceled')
  status: string | null;
  // Date de prochain renouvellement (timestamp ms) — null si pas d'abonnement
  currentPeriodEnd: number | null;
  // Si true, l'abonnement sera annulé à la fin de la période courante
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
}

// ─── Invoice (miroir de la table public.invoices) ───────────────────────
// On ne réplique ici que les champs utiles à l'affichage cabinet.

export type InvoiceDirection = 'platform_to_cabinet' | 'cabinet_to_client';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  organization_id: string;
  client_id: string | null;
  dossier_id: string | null;
  direction: InvoiceDirection;
  number: string | null;
  amount_cents: number;
  vat_cents: number;
  currency: string; // 'EUR' par défaut
  status: InvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  stripe_invoice_id: string | null;
  pdf_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
}

// ─── Résultats Server Actions billing ───────────────────────────────────

export interface BillingActionResult {
  ok: boolean;
  message?: string;
  // Quand ok=true et qu'une redirection vers Stripe est attendue, on peut
  // renvoyer l'URL (utile pour debug / fallback) — en pratique le Server
  // Action appelle redirect(session.url) directement.
  url?: string;
}
