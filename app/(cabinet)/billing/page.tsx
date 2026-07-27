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
import { AlertTriangle, Download, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  getStripe,
  PLANS,
  isStripeConfigured,
} from '@/lib/stripe';
import { PlanCard } from '@/components/cabinet/PlanCard';
import { createPortalSessionForm } from '@/lib/server-actions/billing';
import type { BillingPlan, Invoice, SubscriptionInfo } from '@/lib/types/billing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

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

function statusBadge(status: Invoice['status']): { label: string; className: string } {
  switch (status) {
    case 'paid':
      return { label: 'Payée', className: 'bg-[#ede7ff] text-[#2b1769]' };
    case 'overdue':
      return { label: 'En retard', className: 'bg-red-100 text-red-800' };
    case 'sent':
      return { label: 'Envoyée', className: 'bg-blue-100 text-blue-800' };
    case 'draft':
      return { label: 'Brouillon', className: 'bg-muted text-muted-foreground' };
    case 'cancelled':
      return { label: 'Annulée', className: 'bg-muted text-muted-foreground/70' };
    default:
      return { label: status, className: 'bg-muted text-muted-foreground' };
  }
}

function planLabel(plan: BillingPlan): string {
  switch (plan) {
    case 'cabinet':
      return 'Cabinet';
    case 'pro':
      return 'Cabinet Pro';
    case 'enterprise':
      return 'Enterprise';
    default:
      return plan;
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
      <div className="mx-auto w-full max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Aucun cabinet</CardTitle>
            <CardDescription>Votre compte n&apos;est rattaché à aucun cabinet.</CardDescription>
          </CardHeader>
        </Card>
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
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="min-w-0">
        <h1>Facturation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez votre abonnement Legaly AI et consultez l&apos;historique de
          facturation de votre cabinet.
        </p>
      </div>

      {!stripeConfigured && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-3 py-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Stripe non configuré.</p>
              <p className="mt-1 text-amber-800/90">
                La variable d&apos;environnement{' '}
                <code className="rounded bg-white/70 px-1 font-mono text-xs">STRIPE_SECRET_KEY</code>{' '}
                est manquante. Le checkout et le portail client sont désactivés. Voir{' '}
                <code className="rounded bg-white/70 px-1 font-mono text-xs">SETUP-STRIPE.md</code>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {stripeFetchError && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-3 py-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Lecture Stripe impossible.</p>
              <p className="mt-1 text-amber-800/90">{stripeFetchError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Bloc abonnement actif ─────────────────────────────────── */}
      {sub.hasActiveSubscription ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Abonnement</CardTitle>
            <Badge className="bg-primary text-primary-foreground hover:bg-primary">Plan actif</Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-lg font-semibold">{planLabel(sub.plan)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Statut</p>
                <p className="text-lg font-semibold">
                  {sub.status === 'trialing'
                    ? 'Période d’essai'
                    : sub.status === 'active'
                      ? 'Actif'
                      : (sub.status ?? '—')}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {sub.cancelAtPeriodEnd ? 'Fin de l’abonnement' : 'Prochain renouvellement'}
                </p>
                <p className="text-lg font-semibold">{formatDateFr(sub.currentPeriodEnd)}</p>
              </div>
            </div>

            {sub.cancelAtPeriodEnd && (
              <p className="text-sm font-medium text-destructive">
                Votre abonnement sera annulé le {formatDateFr(sub.currentPeriodEnd)}.
              </p>
            )}

            <div className="space-y-2">
              <form action={createPortalSessionForm}>
                <Button type="submit" disabled={!stripeConfigured}>
                  Gérer mon abonnement
                  <ExternalLink className="size-4" />
                </Button>
              </form>
              <p className="text-xs text-muted-foreground">
                Vous serez redirigé vers le portail client Stripe pour modifier votre
                moyen de paiement, changer de plan ou télécharger vos factures.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Choisissez un plan</h2>
            <p className="text-sm text-muted-foreground">
              Sans engagement. Annulable à tout moment depuis le portail client.
            </p>
          </div>
          <div className="grid gap-5 pt-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            <div className="min-w-0">
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
            </div>
            <div className="min-w-0">
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
            </div>
            <div className="min-w-0">
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
          </div>
        </section>
      )}

      {/* ─── Tableau des factures ──────────────────────────────────── */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Factures</CardTitle>
          <span className="text-xs text-muted-foreground">Facturation Legaly AI → cabinet</span>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucune facture pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const meta = (inv.metadata ?? {}) as Record<string, unknown>;
                  const pdfUrl =
                    (meta.invoice_pdf as string | undefined) ??
                    (meta.hosted_invoice_url as string | undefined) ??
                    null;
                  const sBadge = statusBadge(inv.status);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDateFr(inv.created_at)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {inv.number ?? inv.stripe_invoice_id ?? '—'}
                      </TableCell>
                      <TableCell>
                        Abonnement Legaly AI
                        {inv.due_date ? ` — échéance ${formatDateFr(inv.due_date)}` : ''}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(inv.amount_cents, inv.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('font-normal', sBadge.className)}>
                          {sBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {pdfUrl ? (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="size-3.5" />
                              Télécharger
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Une question ?{' '}
        <Link href="mailto:support@legaly.ai" className="font-medium text-primary hover:underline">
          Contactez le support
        </Link>
      </p>
    </div>
  );
}
