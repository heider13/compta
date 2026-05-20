'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { randomBytes, createHash } from 'crypto';

const VPS_BASE = process.env.NEXT_PUBLIC_VPS_BACKEND_URL || 'https://vps-84ac2579.vps.ovh.net';

async function getCurrentOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('memberships').select('organization_id').eq('user_id', user.id).limit(1).single();
  return data?.organization_id ?? null;
}

export async function createApiKey(formData: FormData): Promise<{ token?: string; prefix?: string; error?: string }> {
  const name = String(formData.get('name') || '').trim();
  if (!name) return { error: 'Nom requis' };
  const orgId = await getCurrentOrgId();
  if (!orgId) return { error: 'Pas de cabinet' };

  // Génération token
  const random = randomBytes(24).toString('base64url');
  const token = `sk_live_${random}`;
  const prefix = token.slice(0, 11);
  const keyHash = createHash('sha256').update(token).digest('hex');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('api_keys').insert({
    organization_id: orgId,
    name,
    key_hash: keyHash,
    prefix,
    scopes: ['read', 'write'],
    created_by: user?.id,
  });
  if (error) return { error: error.message };
  revalidatePath('/settings/api-keys');
  return { token, prefix };
}

export async function revokeApiKey(id: string) {
  const supabase = await createClient();
  await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/settings/api-keys');
}

export async function createWebhook(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const url = String(formData.get('url') || '').trim();
  const events = (formData.getAll('events') as string[]).filter(Boolean);
  if (!url || events.length === 0) return { error: 'URL et événements requis' };
  const orgId = await getCurrentOrgId();
  if (!orgId) return { error: 'Pas de cabinet' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const secret = randomBytes(32).toString('hex');
  const { error } = await supabase.from('webhooks').insert({
    organization_id: orgId,
    url,
    events,
    secret,
    created_by: user?.id,
  });
  if (error) return { error: error.message };
  revalidatePath('/settings/webhooks');
  return { ok: true };
}

export async function deleteWebhook(id: string) {
  const supabase = await createClient();
  await supabase.from('webhooks').delete().eq('id', id);
  revalidatePath('/settings/webhooks');
}

export async function toggleWebhook(id: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from('webhooks').update({ active }).eq('id', id);
  revalidatePath('/settings/webhooks');
}
