import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Hub d'aiguillage post-login : décide où envoyer l'utilisateur
// selon son onboarding et son rôle.
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Charge l'organisation principale (memberships JOIN organizations)
  const { data: memberships } = await supabase
    .from('memberships')
    .select('role, organization_id, organizations(id, name, siren, inpi_username)')
    .eq('user_id', user.id)
    .limit(1);

  const m = (memberships?.[0] as { role?: string; organizations?: { siren?: string; inpi_username?: string } } | undefined);

  // Pas d'org → forcer onboarding
  if (!m) redirect('/onboarding');

  // Org pas finalisée → onboarding
  if (!m.organizations?.siren || !m.organizations?.inpi_username) {
    redirect('/onboarding');
  }

  // Sinon → espace cabinet
  redirect('/cabinet/clients');
}
