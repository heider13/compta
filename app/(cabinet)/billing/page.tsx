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
import { AlertTriangle, Building2, Download, ExternalLink, FileText, Receipt } from 'lucide-react';
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
  CardFooter,
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
import { PageHeader, PageShell } from '@/components/cabinet/PageHeader';
import { EmptyState } from '@/components/cabinet/EmptyState';

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
      return { label: 'Payée', className: 'border-success/30 bg-success/10 text-success' };
    case 'overdue':
      return { label: 'En retard', className: 'border-destructive/30 bg-destructive/10 text-destructive' };
    case 'sent':
      return { label: 'Envoyée', className: 'border-brand-border bg-brand-soft text-brand-soft-foreground' };
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
      <PageShell className="max-w-3xl">
        <Card className="py-0">
          <EmptyState
            icon={Building2}
            title="Aucun cabinet"
            description="Votre compte n'est rattaché à aucun cabinet."
          />
        </Card>
      </PageShell>
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

  // Factures clients : refacturation des frais officiels de formalités (débours)
  const { data: clientInvoicesData } = await supabase
    .from('invoices')
    .select('id, organization_id, direction, number, amount_cents, vat_cents, currency, status, due_date, paid_at, stripe_invoice_id, metadata, created_at, dossier_id')
    .eq('organization_id', org.id)
    .eq('direction', 'cabinet_to_client')
    .order('created_at', { ascending: false })
    .limit(50);
  const clientInvoices = (clientInvoicesData ?? []) as unknown as (Invoice & { dossier_id: string | null })[];

  const stripeConfigured = isStripeConfigured();

  return (
    <PageShell className="max-w-5xl">
      <PageHeader
        eyebrow="Compte"
        title="Facturation"
        description="Gérez votre abonnement Legaly AI et consultez l'historique de facturation de votre cabinet."
      />

      {!stripeConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium">Stripe non configuré.</p>
            <p className="mt-1 text-muted-foreground">
              La variable d&apos;environnement{' '}
              <code className="rounded bg-background px-1 font-mono text-xs text-foreground">STRIPE_SECRET_KEY</code>{' '}
              est manquante. Le checkout et le portail client sont désactivés. Voir{' '}
              <code className="rounded bg-background px-1 font-mono text-xs text-foreground">SETUP-STRIPE.md</code>.
            </p>
          </div>
        </div>
      )}

      {stripeFetchError && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium">Lecture Stripe impossible.</p>
            <p className="mt-1 break-words font-mono text-xs text-muted-foreground">{stripeFetchError}</p>
          </div>
        </div>
      )}

      {/* ─── Bloc abonnement actif ─────────────────────────────────── */}
      {sub.hasActiveSubscription ? (
        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between gap-2 border-b px-5 py-4 [.border-b]:pb-4">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-sm">Abonnement</CardTitle>
              <CardDescription className="text-xs">Géré par Stripe</CardDescription>
            </div>
            <Badge variant="outline" className="gap-1.5 border-success/30 bg-success/10 font-normal text-success">
              <span className="live-dot size-1.5" aria-hidden="true" />
              Plan actif
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <dl className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="min-w-0 space-y-1.5 p-5">
                <dt className="label-mono">Plan</dt>
                <dd className="text-lg font-semibold">{planLabel(sub.plan)}</dd>
              </div>
              <div className="min-w-0 space-y-1.5 p-5">
                <dt className="label-mono">Statut</dt>
                <dd className="text-lg font-semibold">
                  {sub.status === 'trialing'
                    ? 'Période d’essai'
                    : sub.status === 'active'
                      ? 'Actif'
                      : (sub.status ?? '—')}
                </dd>
              </div>
              <div className="min-w-0 space-y-1.5 p-5">
                <dt className="label-mono">
                  {sub.cancelAtPeriodEnd ? 'Fin de l’abonnement' : 'Prochain renouvellement'}
                </dt>
                <dd className="font-mono text-lg font-semibold tabular-nums">{formatDateFr(sub.currentPeriodEnd)}</dd>
              </div>
            </dl>

            {sub.cancelAtPeriodEnd && (
              <p className="flex items-center gap-2 border-t bg-destructive/10 px-5 py-3 text-sm font-medium text-destructive">
                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                Votre abonnement sera annulé le {formatDateFr(sub.currentPeriodEnd)}.
              </p>
            )}
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-3 border-t bg-muted/40 px-5 py-3 [.border-t]:pt-3">
            <p className="max-w-md text-xs text-muted-foreground">
              Vous serez redirigé vers le portail client Stripe pour modifier votre
              moyen de paiement, changer de plan ou télécharger vos factures.
            </p>
            <form action={createPortalSessionForm}>
              <Button type="submit" size="sm" disabled={!stripeConfigured}>
                Gérer mon abonnement
                <ExternalLink className="size-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      ) : (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">Choisissez un plan</h2>
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
      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b px-5 py-4 [.border-b]:pb-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-sm">Factures</CardTitle>
            <CardDescription className="text-xs">Facturation Legaly AI → cabinet</CardDescription>
          </div>
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{invoices.length}</span>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <EmptyState icon={Receipt} title="Aucune facture pour le moment" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5 text-xs">Date</TableHead>
                    <TableHead className="text-xs">Numéro</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-right text-xs">Montant</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="pr-5 text-right text-xs">PDF</TableHead>
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
                      <TableRow key={inv.id} className="hover:bg-muted/50">
                        <TableCell className="pl-5 font-mono text-xs text-muted-foreground tabular-nums">
                          {formatDateFr(inv.created_at)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {inv.number ?? inv.stripe_invoice_id ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          Abonnement Legaly AI
                          {inv.due_date ? ` — échéance ${formatDateFr(inv.due_date)}` : ''}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-medium tabular-nums">
                          {formatMoney(inv.amount_cents, inv.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('font-normal', sBadge.className)}>
                            {sBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-5 text-right">
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Factures clients (débours de formalités) ───────────────── */}
      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b px-5 py-4 [.border-b]:pb-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-sm">Factures clients</CardTitle>
            <CardDescription className="text-xs">Frais officiels refacturés (débours)</CardDescription>
          </div>
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{clientInvoices.length}</span>
        </CardHeader>
        <CardContent className="p-0">
          {clientInvoices.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucune facture client"
              description="Depuis une formalité déposée à l'INPI, « Refacturer les frais au client » crée une facture en brouillon."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5 text-xs">Date</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-right text-xs">Montant</TableHead>
                    <TableHead className="pr-5 text-xs">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientInvoices.map((inv) => {
                    const meta = (inv.metadata ?? {}) as Record<string, unknown>;
                    const sBadge = statusBadge(inv.status);
                    return (
                      <TableRow key={inv.id} className="hover:bg-muted/50">
                        <TableCell className="pl-5 font-mono text-xs text-muted-foreground tabular-nums">
                          {formatDateFr(inv.created_at)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {(meta.libelle as string | undefined) ?? 'Frais de formalité'}
                          {inv.dossier_id && (
                            <Link href={`/dossiers/${inv.dossier_id}`} className="ml-2 text-xs text-primary hover:underline">
                              dossier
                            </Link>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-medium tabular-nums">
                          {formatMoney(inv.amount_cents, inv.currency)}
                        </TableCell>
                        <TableCell className="pr-5">
                          <Badge variant="outline" className={cn('font-normal', sBadge.className)}>
                            {sBadge.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Une question ?{' '}
        <Link href="mailto:support@legaly.ai" className="font-medium text-primary hover:underline">
          Contactez le support
        </Link>
      </p>
    </PageShell>
  );
}
