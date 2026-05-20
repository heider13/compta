import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import type { OrganizationForOnboarding } from '@/lib/types/onboarding';

// Server Component : garde d'auth + redirection si onboarding déjà fait,
// puis rend le wizard côté client avec les données pré-chargées.
export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pas connecté → page legacy de login
  if (!user) {
    redirect('/auth/login');
  }

  // Récupère l'org du user via memberships join organizations.
  // Le trigger DB `handle_new_user` crée déjà une org + membership 'owner' au signup,
  // donc on s'attend à une (et une seule) org ici.
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select(
      `
        organization_id,
        role,
        organizations:organization_id (
          id,
          name,
          siren,
          contact_email,
          contact_phone,
          inpi_username,
          inpi_password_encrypted,
          inpi_env,
          plan,
          white_label_config
        )
      `,
    )
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership || !membership.organizations) {
    // Cas anormal : le trigger devrait avoir créé l'org. On laisse l'utilisateur
    // retomber sur le login legacy pour resignifier l'état.
    redirect('/auth/login');
  }

  // Supabase typings retournent parfois un array pour la relation : on normalise.
  const orgRaw = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;

  const org = orgRaw as unknown as OrganizationForOnboarding;

  // Onboarding déjà finalisé → on évite de reposer les questions.
  if (org.siren && org.inpi_username) {
    redirect('/dashboard');
  }

  return <OnboardingWizard org={org} userId={user.id} />;
}
