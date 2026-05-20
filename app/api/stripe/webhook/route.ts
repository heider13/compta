// app/api/stripe/webhook/route.ts
//
// Webhook Stripe : reçoit les events asynchrones (checkout terminé, paiement
// réussi/échoué, abonnement updated/cancelled) et synchronise la DB Supabase.
//
// IMPORTANT :
//   - On lit le body en RAW via request.text() (PAS request.json()) car la
//     signature HMAC Stripe est calculée sur les bytes exacts.
//   - On utilise un client Supabase service_role (NEXT_PUBLIC_SUPABASE_URL +
//     SUPABASE_SERVICE_ROLE_KEY) car le webhook n'a pas de session user et
//     doit pouvoir écrire sur `organizations` et `invoices` même sous RLS.
//   - On répond TOUJOURS rapidement (200 ou 400) ; Stripe retry sinon.
//
// Configuration locale :
//   stripe listen --forward-to localhost:3000/api/stripe/webhook
//   → copie le `whsec_...` dans STRIPE_WEBHOOK_SECRET.

import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { getStripe, planFromPriceId, type BillingPlanId } from '@/lib/stripe';

// Force le runtime Node.js (le webhook a besoin du SDK Stripe complet).
export const runtime = 'nodejs';
// Pas de cache, jamais.
export const dynamic = 'force-dynamic';

// ─── Supabase admin (service role) ──────────────────────────────────────
// On ne passe PAS par lib/supabase/server.ts (qui dépend du cookie store).
// Le webhook est un POST machine-to-machine sans cookies utilisateur.

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquant — webhook ne peut pas écrire en DB.',
    );
  }
  return createSupabaseAdminClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── Handlers par type d'event ──────────────────────────────────────────

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const organizationId =
    (session.metadata?.organization_id as string | undefined) ?? null;
  const planFromMeta =
    (session.metadata?.plan as BillingPlanId | undefined) ?? null;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id ?? null;
  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id ?? null;

  if (!organizationId) {
    console.warn('checkout.session.completed sans organization_id en metadata', session.id);
    return;
  }

  const update: Record<string, string | null> = {
    stripe_subscription_id: subscriptionId,
  };
  if (customerId) update.stripe_customer_id = customerId;
  if (planFromMeta === 'cabinet' || planFromMeta === 'pro') {
    update.plan = planFromMeta;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('organizations')
    .update(update)
    .eq('id', organizationId);
  if (error) {
    throw new Error(`Update organizations failed: ${error.message}`);
  }
}

async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
): Promise<void> {
  const organizationId =
    (subscription.metadata?.organization_id as string | undefined) ?? null;
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  // Détermine le plan à partir du price ID actif.
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const planId = planFromPriceId(priceId);

  const supabase = getSupabaseAdmin();

  // Trouve l'organisation : par metadata sinon par stripe_customer_id.
  let targetOrgId = organizationId;
  if (!targetOrgId && customerId) {
    const { data } = await supabase
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    targetOrgId = (data as { id: string } | null)?.id ?? null;
  }
  if (!targetOrgId) {
    console.warn('subscription event : organisation introuvable', subscription.id);
    return;
  }

  // Statut Stripe → plan en DB.
  // - 'canceled' / 'incomplete_expired' / 'unpaid' → on retombe sur 'cabinet'
  //   (plan free-tier par défaut, conforme au schema check).
  // - sinon on garde le plan déduit du price ID.
  let nextPlan: BillingPlanId = 'cabinet';
  const status = subscription.status;
  const isInactive =
    status === 'canceled' ||
    status === 'incomplete_expired' ||
    status === 'unpaid';

  if (!isInactive && planId) {
    nextPlan = planId;
  }

  const update: Record<string, string | null> = {
    plan: nextPlan,
    stripe_subscription_id: isInactive ? null : subscription.id,
  };

  const { error } = await supabase
    .from('organizations')
    .update(update)
    .eq('id', targetOrgId);
  if (error) {
    throw new Error(`Update organizations (sub change) failed: ${error.message}`);
  }
}

async function handleInvoiceEvent(
  invoice: Stripe.Invoice,
  status: 'paid' | 'overdue',
): Promise<void> {
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id ?? null;
  if (!customerId) {
    console.warn('invoice event sans customer', invoice.id);
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: orgRow } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  const organizationId = (orgRow as { id: string } | null)?.id ?? null;
  if (!organizationId) {
    console.warn('invoice event : organisation introuvable pour customer', customerId);
    return;
  }

  // Idempotence : si on a déjà inséré cette facture, on update au lieu de
  // dupliquer (Stripe peut renvoyer le même event en retry).
  const stripeInvoiceId = invoice.id;
  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('stripe_invoice_id', stripeInvoiceId)
    .maybeSingle();

  const amountCents =
    invoice.amount_paid && invoice.amount_paid > 0
      ? invoice.amount_paid
      : invoice.amount_due ?? invoice.total ?? 0;
  const vatCents = invoice.tax ?? 0;
  const currency = (invoice.currency ?? 'eur').toUpperCase();
  const paidAt =
    status === 'paid' && invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : null;
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date * 1000).toISOString().slice(0, 10)
    : null;

  if (existing) {
    const { error } = await supabase
      .from('invoices')
      .update({
        status,
        amount_cents: amountCents,
        vat_cents: vatCents,
        currency,
        paid_at: paidAt,
        due_date: dueDate,
        number: invoice.number ?? null,
      })
      .eq('id', (existing as { id: string }).id);
    if (error) throw new Error(`Update invoice failed: ${error.message}`);
    return;
  }

  const { error } = await supabase.from('invoices').insert({
    organization_id: organizationId,
    direction: 'platform_to_cabinet',
    number: invoice.number ?? null,
    amount_cents: amountCents,
    vat_cents: vatCents,
    currency,
    status,
    due_date: dueDate,
    paid_at: paidAt,
    stripe_invoice_id: stripeInvoiceId,
    metadata: {
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      invoice_pdf: invoice.invoice_pdf ?? null,
    },
  });
  if (error) throw new Error(`Insert invoice failed: ${error.message}`);
}

// ─── Route Handler POST ─────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET non configuré' },
      { status: 500 },
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
  }

  // RAW BODY — indispensable pour la vérification de signature.
  const rawBody = await request.text();

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Stripe non configuré' },
      { status: 500 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Signature invalide';
    return NextResponse.json({ error: `Signature invalide: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoiceEvent(event.data.object as Stripe.Invoice, 'paid');
        break;

      case 'invoice.payment_failed':
        await handleInvoiceEvent(event.data.object as Stripe.Invoice, 'overdue');
        break;

      default:
        // Event non géré → on log et on répond 200 (sinon Stripe retry).
        console.log(`[stripe webhook] event non géré : ${event.type}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur traitement webhook';
    console.error('[stripe webhook] error:', msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
