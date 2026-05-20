'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Statut côté serveur des identifiants INPI d'une organisation.
// Permet aux pages serveur de décider si on autorise les démarches.
export type InpiCredentialsStatus = {
  configured: boolean;
  username: string | null;
  env: 'prod' | 'demo';
};

export async function getInpiCredentialsStatus(): Promise<InpiCredentialsStatus | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: m } = await supabase
    .from('memberships')
    .select(
      'organization_id, organizations(inpi_username, inpi_password_encrypted, inpi_env)',
    )
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  const orgRaw = m?.organizations;
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
  if (!org) return null;

  const username = (org as { inpi_username?: string | null }).inpi_username ?? null;
  const password =
    (org as { inpi_password_encrypted?: string | null }).inpi_password_encrypted ?? null;
  const env = ((org as { inpi_env?: string | null }).inpi_env ?? 'prod') === 'demo' ? 'demo' : 'prod';

  return {
    configured: Boolean(username && password),
    username,
    env,
  };
}

// Sauvegarde des identifiants INPI du cabinet courant.
// TODO: chiffrement côté backend OVH (AES-256-GCM avec MASTER_ENCRYPTION_KEY)
// avant écriture dans `inpi_password_encrypted`. Aujourd'hui : MVP en clair.
export async function saveInpiCredentials(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/auth/login');
  }

  const username = String(formData.get('inpi_username') || '').trim();
  const password = String(formData.get('inpi_password') || '');
  const env = String(formData.get('inpi_env') || 'prod') === 'demo' ? 'demo' : 'prod';
  const next = String(formData.get('next') || '/dashboard');

  if (!username || !password) {
    const params = new URLSearchParams({ e: 'missing_fields', next });
    redirect(`/settings/inpi?${params.toString()}`);
  }

  const { data: m, error: mErr } = await supabase
    .from('memberships')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (mErr || !m) {
    const params = new URLSearchParams({ e: 'no_org', next });
    redirect(`/settings/inpi?${params.toString()}`);
  }

  // Seuls les owners/admins peuvent modifier les creds du cabinet.
  if (m.role !== 'owner' && m.role !== 'admin') {
    const params = new URLSearchParams({ e: 'forbidden', next });
    redirect(`/settings/inpi?${params.toString()}`);
  }

  const { error: updateError } = await supabase
    .from('organizations')
    .update({
      inpi_username: username,
      inpi_password_encrypted: password,
      inpi_env: env,
    })
    .eq('id', m.organization_id);

  if (updateError) {
    const params = new URLSearchParams({
      e: encodeURIComponent(updateError.message),
      next,
    });
    redirect(`/settings/inpi?${params.toString()}`);
  }

  revalidatePath('/dashboard');
  revalidatePath('/dossiers/new');
  revalidatePath('/settings/inpi');

  redirect(next);
}
