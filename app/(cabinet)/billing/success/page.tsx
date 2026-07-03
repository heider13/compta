// app/(cabinet)/billing/success/page.tsx
// Atterrissage post-checkout Stripe. À ce stade :
//   - Stripe a redirigé l'utilisateur ICI avec ?session_id=cs_xxx
//   - Le webhook est PROBABLEMENT déjà passé (mais peut prendre quelques secondes
//     en mode test). On affiche donc le plan trouvé en DB (peut être encore
//     l'ancien) + on rassure l'utilisateur en lui disant que c'est OK.
//
// On NE met PAS à jour la DB depuis cette page (single source of truth = webhook).

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { BillingPlan } from '@/lib/types/billing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

interface OrgRow {
  id: string;
  name: string;
  plan: BillingPlan;
}

interface MembershipRow {
  organization_id: string;
  organizations: OrgRow | null;
}

function planLabel(plan: BillingPlan): string {
  switch (plan) {
    case 'cabinet':
      return 'Cabinet (79 € HT / mois)';
    case 'pro':
      return 'Cabinet Pro (199 € HT / mois)';
    case 'enterprise':
      return 'Enterprise';
    default:
      return plan;
  }
}

export default async function BillingSuccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let planName = '—';
  if (user) {
    const { data: membership } = await supabase
      .from('memberships')
      .select('organization_id, organizations(id, name, plan)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    const org = (membership as unknown as MembershipRow | null)?.organizations;
    if (org) planName = planLabel(org.plan);
  }

  return (
    <div className="mx-auto w-full max-w-xl p-6">
      <Card className="mt-10">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <span className="mb-5 grid size-16 place-items-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="size-9" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            Merci, votre abonnement est actif
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Le paiement a été enregistré. Votre cabinet bascule sur le plan{' '}
            <strong className="text-foreground">{planName}</strong> dès que Stripe nous
            confirme la transaction (quelques secondes maximum).
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Un reçu a été envoyé à votre adresse email. La première facture apparaîtra
            dans l&apos;onglet Facturation.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/dashboard">Aller au tableau de bord</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/billing">Voir mes factures</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
