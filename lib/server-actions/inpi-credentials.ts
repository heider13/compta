'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// URL du backend OVH qui chiffre AES-256-GCM avant écriture des creds INPI.
const VPS_BACKEND_URL =
  process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://vps-84ac2579.vps.ovh.net';

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

// Sauvegarde des identifiants INPI via le backend OVH (qui chiffre AES-256-GCM
// avant écriture). Le password ne touche jamais Supabase directement depuis
// Next.js — il transite via une requête HTTPS authentifiée vers le proxy VPS.
//
// Le backend valide aussi le rôle (owner/admin) et peut tester les creds
// (endpoint POST /test) si on veut un ping login. Ici on déclenche le test
// systématique après la sauvegarde pour donner un feedback utilisateur fiable.
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

  const fail = (errKey: string) => {
    const params = new URLSearchParams({ e: errKey, next });
    redirect(`/settings/inpi?${params.toString()}`);
  };

  if (!username || !password) return fail('missing_fields');

  const { data: m, error: mErr } = await supabase
    .from('memberships')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (mErr || !m) return fail('no_org');

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return fail('no_session');

  // 1) PUT chiffré côté VPS
  let putRes: Response;
  try {
    putRes = await fetch(`${VPS_BACKEND_URL}/api/cabinet/inpi-creds`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'x-organization-id': m.organization_id,
      },
      body: JSON.stringify({ username, password, env }),
      cache: 'no-store',
    });
  } catch (e) {
    return fail(
      encodeURIComponent(
        `vps_unreachable:${e instanceof Error ? e.message : 'unknown'}`,
      ),
    );
  }

  if (!putRes.ok) {
    const body = await putRes.json().catch(() => ({}));
    const code = (body as { error?: string }).error ?? `http_${putRes.status}`;
    return fail(code);
  }

  // 2) Ping login INPI pour valider que les creds fonctionnent vraiment.
  // En cas d'échec, on revient sur la page avec l'erreur — les creds ont été
  // écrites mais on prévient l'utilisateur que l'INPI ne les accepte pas.
  try {
    const testRes = await fetch(`${VPS_BACKEND_URL}/api/cabinet/inpi-creds/test`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-organization-id': m.organization_id,
      },
      cache: 'no-store',
    });
    const testBody = await testRes.json().catch(() => ({}));
    if (!testRes.ok || !(testBody as { ok?: boolean }).ok) {
      const detail = (testBody as { error?: string }).error ?? 'unknown';
      return fail(`inpi_test_failed:${detail}`);
    }
  } catch {
    // Le test n'est pas bloquant pour la sauvegarde côté DB. On affiche un
    // warning au user mais on laisse passer.
    const params = new URLSearchParams({ e: 'inpi_test_unreachable', next });
    redirect(`/settings/inpi?${params.toString()}`);
  }

  revalidatePath('/dashboard');
  revalidatePath('/dossiers/new');
  revalidatePath('/settings/inpi');

  redirect(next);
}
