// app/(cabinet)/billing/page.tsx
// Page facturation du cabinet courant.
// - Si pas d'abonnement Stripe actif → 3 PlanCard (Cabinet / Pro / Enterprise)
// - Si abonné → bloc "Plan actif" + prochaine échéance + bouton Customer Portal
// - Toujours : tableau des factures (table `invoices` direction='platform_to_cabinet')
//
// Server Component → fait du SSR : appelle Stripe directement pour récupérer
// le statut de l'abonnement (single source of truth pour le date de
// renouvellement). On lit aussi `organizations.plan` en DB pour le cas où
// Stripe est indispo (graceful degradation).

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  getStripe,
  PLANS,
  isStripeConfigured,
  type BillingPlanId,
} from '@/lib/stripe';
import { PlanCard } from '@/components/cabinet/PlanCard';
import {
  createPortalSessionForm,
} from '@/lib/server-actions/billing';
import type { BillingPlan, Invoice, SubscriptionInfo } from '@/lib/types/billing';

export const dynamic = 'force-dynamic';

interface OrgRow {
  id: string;
  name: string;
  plan: BillingPlan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
}

interface MembershipRow {
  organization_id: string;
  organizations: OrgRow | null;
}

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function formatDateFr(input: string | number | null): string {
  if (input === null || input === undefined) return '—';
  const d = typeof input === 'number' ? new Date(input) : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

function statusLabel(status: Invoice['status']): { label: string; color: string } {
  switch (status) {
    case 'paid':
      return { label: 'Payée', color: 'var(--status-green, #16a34a)' };
    case 'overdue':
      return { label: 'En retard', color: 'var(--status-red, #dc2626)' };
    case 'sent':
      return { label: 'Envoyée', color: 'var(--status-blue, #2563eb)' };
    case 'draft':
      return { label: 'Brouillon', color: 'var(--ink-500)' };
    case 'cancelled':
      return { label: 'Annulée', color: 'var(--ink-400)' };
    default:
      return { label: status, color: 'var(--ink-500)' };
  }
}

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null; // le layout aura déjà redirigé
  }

  // ─── Récupère l'org courante ───────────────────────────────────────
  const { data: membership } = await supabase
    .from('memberships')
    .select(
      'organization_id, organizations(id, name, plan, stripe_customer_id, stripe_subscription_id, trial_ends_at)',
    )
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const org = (membership as unknown as MembershipRow | null)?.organizations ?? null;
  if (!org) {
    return (
      <div className="app-card app-card-pad">
        <h2>Aucun cabinet</h2>
        <p>Votre compte n&apos;est rattaché à aucun cabinet.</p>
      </div>
    );
  }

  // ─── État abonnement (Stripe en SSR si possible) ───────────────────
  const sub: SubscriptionInfo = {
    plan: org.plan,
    hasActiveSubscription: false,
    stripeCustomerId: org.stripe_customer_id,
    stripeSubscriptionId: org.stripe_subscription_id,
    status: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    trialEndsAt: org.trial_ends_at,
  };

  let stripeFetchError: string | null = null;
  if (isStripeConfigured() && org.stripe_subscription_id) {
    try {
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(
        org.stripe_subscription_id,
      );
      sub.status = subscription.status;
      sub.cancelAtPeriodEnd = subscription.cancel_at_period_end;
      // current_period_end est en secondes Unix
      const cpeRaw = (subscription as unknown as { current_period_end?: number })
        .current_period_end;
      sub.currentPeriodEnd = cpeRaw ? cpeRaw * 1000 : null;
      sub.hasActiveSubscription =
        subscription.status === 'active' || subscription.status === 'trialing';
    } catch (err) {
      stripeFetchError =
        err instanceof Error ? err.message : 'Erreur lecture Stripe';
    }
  }

  // ─── Factures ──────────────────────────────────────────────────────
  const { data: invoicesData } = await supabase
    .from('invoices')
    .select(
      'id, organization_id, direction, number, amount_cents, vat_cents, currency, status, due_date, paid_at, stripe_invoice_id, metadata, created_at',
    )
    .eq('organization_id', org.id)
    .eq('direction', 'platform_to_cabinet')
    .order('created_at', { ascending: false })
    .limit(24);

  const invoices = (invoicesData ?? []) as unknown as Invoice[];

  const stripeConfigured = isStripeConfigured();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Facturation</h1>
          <p>
            Gérez votre abonnement Compta et consultez l&apos;historique de
            facturation de votre cabinet.
          </p>
        </div>
      </div>

      {!stripeConfigured && (
        <div
          className="app-card app-card-pad"
          style={{
            marginBottom: 24,
            background: 'var(--amber-50, #fffbeb)',
            border: '1px solid var(--amber-200, #fde68a)',
          }}
        >
          <strong>Stripe non configuré.</strong>
          <p style={{ margin: '6px 0 0', fontSize: 13 }}>
            La variable d&apos;environnement <code>STRIPE_SECRET_KEY</code> est
            manquante. Le checkout et le portail client sont désactivés. Voir{' '}
            <code>SETUP-STRIPE.md</code>.
          </p>
        </div>
      )}

      {stripeFetchError && (
        <div
          className="app-card app-card-pad"
          style={{
            marginBottom: 24,
            background: 'var(--amber-50, #fffbeb)',
            border: '1px solid var(--amber-200, #fde68a)',
          }}
        >
          <strong>Lecture Stripe impossible.</strong>
          <p style={{ margin: '6px 0 0', fontSize: 13 }}>{stripeFetchError}</p>
        </div>
      )}

      {/* ─── Bloc abonnement actif ─────────────────────────────────── */}
      {sub.hasActiveSubscription ? (
        <section className="app-card" style={{ marginBottom: 28 }}>
          <div className="app-card-head">
            <h3>Abonnement</h3>
            <span
              className="pill"
              style={{
                background: 'var(--status-green, #16a34a)',
                color: 'white',
                fontSize: 11,
                padding: '3px 10px',
              }}
            >
              Plan actif
            </span>
          </div>
          <div style={{ padding: '6px 22px 22px' }}>
            <div
              style={{
                display: 'grid',
                gap: 20,
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-500)',
                    marginBottom: 4,
                  }}
                >
                  Plan
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {sub.plan === 'cabinet'
                    ? 'Cabinet'
                    : sub.plan === 'pro'
                      ? 'Cabinet Pro'
                      : sub.plan === 'enterprise'
                        ? 'Enterprise'
                        : sub.plan}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-500)',
                    marginBottom: 4,
                  }}
                >
                  Statut
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {sub.status === 'trialing'
                    ? 'Période d’essai'
                    : sub.status === 'active'
                      ? 'Actif'
                      : (sub.status ?? '—')}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-500)',
                    marginBottom: 4,
                  }}
                >
                  {sub.cancelAtPeriodEnd ? 'Fin de l’abonnement' : 'Prochain renouvellement'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {formatDateFr(sub.currentPeriodEnd)}
                </div>
              </div>
            </div>

            {sub.cancelAtPeriodEnd && (
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--status-red, #dc2626)',
                  marginBottom: 14,
                }}
              >
                Votre abonnement sera annulé le {formatDateFr(sub.currentPeriodEnd)}.
              </p>
            )}

            <form action={createPortalSessionForm}>
              <button
                type="submit"
                className="btn btn-accent"
                disabled={!stripeConfigured}
              >
                Gérer mon abonnement
              </button>
            </form>
            <p style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-500)' }}>
              Vous serez redirigé vers le portail client Stripe pour modifier votre
              moyen de paiement, changer de plan ou télécharger vos factures.
            </p>
          </div>
        </section>
      ) : (
        <section style={{ marginBottom: 28 }}>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 20, marginBottom: 4 }}>Choisissez un plan</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-500)' }}>
              Sans engagement. Annulable à tout moment depuis le portail client.
            </p>
          </div>
          <div
            className="grid-3 pricing-grid"
            style={{
              display: 'grid',
              gap: 18,
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            }}
          >
            <PlanCard
              planId="cabinet"
              name={PLANS.cabinet.name}
              description={PLANS.cabinet.description}
              price={`${PLANS.cabinet.amount} €`}
              priceSuffix=" / mois HT"
              features={PLANS.cabinet.features}
              // Dans cette branche : pas d'abonnement actif → aucun plan n'est "current"
              disabled={!stripeConfigured || !PLANS.cabinet.priceId}
            />
            <PlanCard
              planId="pro"
              name={PLANS.pro.name}
              description={PLANS.pro.description}
              price={`${PLANS.pro.amount} €`}
              priceSuffix=" / mois HT"
              features={PLANS.pro.features}
              accent
              highlight="Le plus choisi"
              disabled={!stripeConfigured || !PLANS.pro.priceId}
            />
            <PlanCard
              planId="enterprise"
              name="Enterprise"
              description="Pour les groupes et legaltechs avec besoins API."
              price="Sur devis"
              features={[
                'Collaborateurs illimités',
                'API publique + webhooks',
                'Sous-domaine personnalisé',
                'SLA contractuel 99,9 %',
                'Onboarding dédié',
                'SSO (SAML, OIDC)',
              ]}
              mode="contact"
            />
          </div>
        </section>
      )}

      {/* ─── Tableau des factures ──────────────────────────────────── */}
      <section className="app-card">
        <div className="app-card-head">
          <h3>Factures</h3>
          <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>
            Facturation Compta → cabinet
          </span>
        </div>

        {invoices.length === 0 ? (
          <div
            style={{
              padding: '48px 22px',
              textAlign: 'center',
              color: 'var(--ink-500)',
              fontSize: 14,
            }}
          >
            Aucune facture pour le moment.
          </div>
        ) : (
          <div className="app-table">
            <div
              className="app-table-head"
              style={{
                gridTemplateColumns: '120px 130px 1fr 110px 110px 130px',
              }}
            >
              <div>Date</div>
              <div>Numéro</div>
              <div>Description</div>
              <div style={{ textAlign: 'right' }}>Montant</div>
              <div>Statut</div>
              <div style={{ textAlign: 'right' }}>PDF</div>
            </div>
            {invoices.map((inv) => {
              const meta = (inv.metadata ?? {}) as Record<string, unknown>;
              const pdfUrl =
                (meta.invoice_pdf as string | undefined) ??
                (meta.hosted_invoice_url as string | undefined) ??
                null;
              const sLab = statusLabel(inv.status);
              return (
                <div
                  key={inv.id}
                  className="app-table-row"
                  style={{
                    gridTemplateColumns: '120px 130px 1fr 110px 110px 130px',
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--ink-600)' }}>
                    {formatDateFr(inv.created_at)}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 12, color: 'var(--ink-600)' }}
                  >
                    {inv.number ?? inv.stripe_invoice_id ?? '—'}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    Abonnement Compta
                    {inv.due_date ? ` — échéance ${formatDateFr(inv.due_date)}` : ''}
                  </div>
                  <div
                    style={{
                      textAlign: 'right',
                      fontWeight: 500,
                    }}
                  >
                    {formatMoney(inv.amount_cents, inv.currency)}
                  </div>
                  <div>
                    <span
                      className="pill"
                      style={{
                        background: sLab.color,
                        color: 'white',
                        fontSize: 11,
                        padding: '2px 8px',
                      }}
                    >
                      {sLab.label}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {pdfUrl ? (
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-link btn-sm"
                      >
                        Télécharger
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>
                        —
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p
        style={{
          marginTop: 24,
          fontSize: 12,
          color: 'var(--ink-500)',
          textAlign: 'center',
        }}
      >
        Une question ?{' '}
        <Link href="mailto:support@compta.app" className="btn-link">
          Contactez le support
        </Link>
      </p>
    </>
  );
}
