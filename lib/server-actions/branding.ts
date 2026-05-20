'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { WhiteLabelConfig } from '@/lib/white-label';

async function getOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('memberships').select('organization_id').eq('user_id', user.id).limit(1).single();
  return data?.organization_id ?? null;
}

export async function updateBranding(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const orgId = await getOrgId();
  if (!orgId) return { error: 'Pas de cabinet' };

  const patch: WhiteLabelConfig = {
    company_name: (String(formData.get('company_name') || '').trim()) || null,
    logo_url: (String(formData.get('logo_url') || '').trim()) || null,
    primary_color: (String(formData.get('primary_color') || '').trim()) || null,
    secondary_color: (String(formData.get('secondary_color') || '').trim()) || null,
    custom_domain: (String(formData.get('custom_domain') || '').trim()) || null,
    custom_email_from: (String(formData.get('custom_email_from') || '').trim()) || null,
  };

  const supabase = await createClient();
  const updates: Record<string, unknown> = { white_label_config: patch };
  if (patch.company_name) updates.name = patch.company_name;
  const { error } = await supabase.from('organizations').update(updates).eq('id', orgId);
  if (error) return { error: error.message };
  revalidatePath('/settings/branding');
  return { ok: true };
}

export async function uploadLogo(formData: FormData): Promise<{ url?: string; error?: string }> {
  const file = formData.get('logo') as File | null;
  if (!file || file.size === 0) return { error: 'Aucun fichier' };
  const orgId = await getOrgId();
  if (!orgId) return { error: 'Pas de cabinet' };
  const supabase = await createClient();
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `branding/${orgId}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('dossier-docs').upload(path, file, { contentType: file.type, upsert: true });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from('dossier-docs').getPublicUrl(path);
  return { url: data.publicUrl };
}
