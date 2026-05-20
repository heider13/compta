// app/(cabinet)/billing/success/page.tsx
// Atterrissage post-checkout Stripe. À ce stade :
//   - Stripe a redirigé l'utilisateur ICI avec ?session_id=cs_xxx
//   - Le webhook est PROBABLEMENT déjà passé (mais peut prendre quelques secondes
//     en mode test). On affiche donc le plan trouvé en DB (peut être encore
//     l'ancien) + on rassure l'utilisateur en lui disant que c'est OK.
//
// On NE met PAS à jour la DB depuis cette page (single source of truth = webhook).

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { BillingPlan } from '@/lib/types/billing';

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
    <div
      className="app-card app-card-pad"
      style={{
        maxWidth: 560,
        margin: '40px auto',
        textAlign: 'center',
        padding: '40px 32px',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--status-green, #16a34a)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 32,
          fontWeight: 600,
        }}
        aria-hidden="true"
      >
        ✓
      </div>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>
        Merci, votre abonnement est actif
      </h1>
      <p
        style={{
          fontSize: 14,
          color: 'var(--ink-600)',
          marginBottom: 18,
          maxWidth: 420,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        Le paiement a été enregistré. Votre cabinet bascule sur le plan&nbsp;
        <strong>{planName}</strong> dès que Stripe nous confirme la transaction
        (quelques secondes maximum).
      </p>
      <p
        style={{
          fontSize: 12,
          color: 'var(--ink-500)',
          marginBottom: 24,
        }}
      >
        Un reçu a été envoyé à votre adresse email. La première facture
        apparaîtra dans l&apos;onglet Facturation.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <Link href="/" className="btn btn-accent">
          Aller au tableau de bord
        </Link>
        <Link href="/billing" className="btn btn-ghost">
          Voir mes factures
        </Link>
      </div>
    </div>
  );
}
