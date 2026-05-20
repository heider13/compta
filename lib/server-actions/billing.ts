'use server';

// Server Actions billing : checkout Stripe + Customer Portal + (optionnel) cancel.
//
// Flot type :
//   1. Cabinet clique "Souscrire au plan Pro"
//   2. <form action={createCheckoutSessionForm}> envoie plan='pro'
//   3. createCheckoutSession() :
//        - récupère user + organization courante (premier membership)
//        - crée (ou récupère) le Stripe Customer, sauve customer_id sur l'org
//        - crée la Checkout Session (mode=subscription)
//        - redirect() vers session.url → Stripe Hosted Checkout
//   4. Stripe redirige le user vers success_url ou cancel_url
//   5. En parallèle, Stripe envoie webhook → /api/stripe/webhook
//        → c'est LE webhook qui met à jour `organizations.plan` et
//          `stripe_subscription_id` (la success page ne fait pas confiance au
//          query string, elle relit Supabase).

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getStripe, PLANS, isStripeConfigured, type BillingPlanId } from '@/lib/stripe';
import type { BillingActionResult } from '@/lib/types/billing';

// ─── Helpers internes ───────────────────────────────────────────────────

interface CurrentContext {
  userId: string;
  userEmail: string | null;
  organizationId: string;
  organizationName: string;
  stripeCustomerId: string | null;
}

async function getCurrentContext(): Promise<
  { ok: true; ctx: CurrentContext } | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Non authentifié.' };
  }

  // Récupère la première organisation (cohérent avec le layout cabinet).
  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id, organizations(id, name, stripe_customer_id)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const org = (membership as unknown as {
    organization_id: string;
    organizations: { id: string; name: string; stripe_customer_id: string | null } | null;
  } | null)?.organizations;

  if (!org) {
    return { ok: false, message: "Aucun cabinet associé à ce compte." };
  }

  return {
    ok: true,
    ctx: {
      userId: user.id,
      userEmail: user.email ?? null,
      organizationId: org.id,
      organizationName: org.name,
      stripeCustomerId: org.stripe_customer_id,
    },
  };
}

// Si pas de customer_id en DB → on crée le Customer Stripe puis on le sauve.
async function ensureStripeCustomer(ctx: CurrentContext): Promise<string> {
  if (ctx.stripeCustomerId) return ctx.stripeCustomerId;
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: ctx.userEmail ?? undefined,
    name: ctx.organizationName,
    metadata: {
      organization_id: ctx.organizationId,
      user_id: ctx.userId,
    },
  });
  const supabase = await createClient();
  await supabase
    .from('organizations')
    .update({ stripe_customer_id: customer.id })
    .eq('id', ctx.organizationId);
  return customer.id;
}

function getBaseUrl(): string {
  // Priorité : variable explicite > Vercel auto > localhost dev.
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

// ─── createCheckoutSession ──────────────────────────────────────────────

export async function createCheckoutSession(
  plan: BillingPlanId,
): Promise<BillingActionResult> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      message:
        'Stripe n’est pas configuré côté serveur (STRIPE_SECRET_KEY manquante). Voir SETUP-STRIPE.md.',
    };
  }

  if (plan !== 'cabinet' && plan !== 'pro') {
    return { ok: false, message: 'Plan invalide.' };
  }

  const planConfig = PLANS[plan];
  if (!planConfig.priceId) {
    return {
      ok: false,
      message: `Stripe price ID manquant pour le plan « ${plan} ». Vérifier STRIPE_PRICE_${plan.toUpperCase()}.`,
    };
  }

  const ctxResult = await getCurrentContext();
  if (!ctxResult.ok) return { ok: false, message: ctxResult.message };
  const ctx = ctxResult.ctx;

  let sessionUrl: string;
  try {
    const customerId = await ensureStripeCustomer(ctx);
    const stripe = getStripe();
    const baseUrl = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing/cancel`,
      allow_promotion_codes: true,
      // Métadonnées récupérées dans le webhook checkout.session.completed.
      metadata: {
        organization_id: ctx.organizationId,
        plan,
      },
      subscription_data: {
        metadata: {
          organization_id: ctx.organizationId,
          plan,
        },
      },
    });

    if (!session.url) {
      return { ok: false, message: 'Stripe n’a pas renvoyé d’URL de checkout.' };
    }
    sessionUrl = session.url;
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Erreur Stripe inconnue.',
    };
  }

  // redirect() throw un NEXT_REDIRECT — DOIT être appelé hors try/catch sinon
  // l'erreur de redirection est avalée.
  redirect(sessionUrl);
}

// ─── createPortalSession ────────────────────────────────────────────────

export async function createPortalSession(): Promise<BillingActionResult> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      message:
        'Stripe n’est pas configuré côté serveur (STRIPE_SECRET_KEY manquante). Voir SETUP-STRIPE.md.',
    };
  }

  const ctxResult = await getCurrentContext();
  if (!ctxResult.ok) return { ok: false, message: ctxResult.message };
  const ctx = ctxResult.ctx;

  if (!ctx.stripeCustomerId) {
    return {
      ok: false,
      message: "Aucun Customer Stripe lié à ce cabinet — souscrivez d'abord un plan.",
    };
  }

  let url: string;
  try {
    const stripe = getStripe();
    const baseUrl = getBaseUrl();
    const session = await stripe.billingPortal.sessions.create({
      customer: ctx.stripeCustomerId,
      return_url: `${baseUrl}/billing`,
    });
    url = session.url;
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Erreur Stripe inconnue.',
    };
  }

  redirect(url);
}

// ─── cancelSubscription (optionnel) ─────────────────────────────────────
// Le Customer Portal le fait déjà ; on l'expose au cas où le UI propose un
// bouton « Annuler à la fin de la période » direct.

export async function cancelSubscription(): Promise<BillingActionResult> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      message: 'Stripe n’est pas configuré côté serveur.',
    };
  }

  const ctxResult = await getCurrentContext();
  if (!ctxResult.ok) return { ok: false, message: ctxResult.message };
  const ctx = ctxResult.ctx;

  const supabase = await createClient();
  const { data: orgRow } = await supabase
    .from('organizations')
    .select('stripe_subscription_id')
    .eq('id', ctx.organizationId)
    .maybeSingle();

  const subscriptionId = (orgRow as { stripe_subscription_id: string | null } | null)
    ?.stripe_subscription_id;
  if (!subscriptionId) {
    return { ok: false, message: 'Aucun abonnement Stripe actif.' };
  }

  try {
    const stripe = getStripe();
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Erreur Stripe inconnue.',
    };
  }

  revalidatePath('/billing');
  return {
    ok: true,
    message: 'Abonnement programmé pour annulation à la fin de la période en cours.',
  };
}

// ─── Form-action wrappers (pour <form action={...}>) ────────────────────
// Les Server Actions appelées depuis <form> reçoivent FormData. On wrap.

export async function createCheckoutSessionForm(formData: FormData): Promise<void> {
  const plan = String(formData.get('plan') ?? '') as BillingPlanId;
  await createCheckoutSession(plan);
}

export async function createPortalSessionForm(): Promise<void> {
  await createPortalSession();
}

export async function cancelSubscriptionForm(): Promise<void> {
  await cancelSubscription();
  revalidatePath('/billing');
}
