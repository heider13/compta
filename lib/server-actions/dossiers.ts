'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateDossier(id: string, patch: Record<string, unknown>) {
  const supabase = await createClient();
  const allowed = ['client_id', 'type_formalite', 'forme_juridique', 'priority', 'internal_due_date', 'tags', 'assigned_to', 'naf_code', 'siren'];
  const safe = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
  const { error } = await supabase.from('dossiers').update(safe).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/dossiers/${id}`);
  return { ok: true };
}

export async function addObservation(formData: FormData) {
  const dossierId = String(formData.get('dossier_id'));
  const message = String(formData.get('message') || '').trim();
  if (!message) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  await supabase.from('dossier_observations').insert({
    dossier_id: dossierId,
    author_id: user.id,
    author_role: profile?.role === 'admin' ? 'admin' : 'client',
    message,
  });
  revalidatePath(`/dossiers/${dossierId}`);
}

export async function toggleTask(taskId: string, done: boolean) {
  const supabase = await createClient();
  await supabase.from('dossier_tasks').update({ done, done_at: done ? new Date().toISOString() : null }).eq('id', taskId);
  revalidatePath('/tasks');
}

export async function submitToAdmin(dossierId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('dossiers')
    .update({ statut: 'AWAITING_VALIDATION' })
    .eq('id', dossierId)
    .in('statut', ['DRAFT', 'INTERNAL_AMENDMENT_PENDING']);
  if (error) return { error: error.message };
  revalidatePath(`/dossiers/${dossierId}`);
  return { ok: true };
}

export async function archiveDossier(dossierId: string) {
  const supabase = await createClient();
  await supabase.from('dossiers').update({ tags: ['archived'] }).eq('id', dossierId);
  revalidatePath('/dossiers');
}

export async function prepareNewDossier(formData: FormData) {
  const clientId = String(formData.get('client_id') || '') || null;
  const type = String(formData.get('type') || 'AE');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: m } = await supabase.from('memberships').select('organization_id').eq('user_id', user.id).limit(1).single();
  if (!m) redirect('/onboarding');

  // Détermine forme_juridique + type_formalite
  const isCreation = ['AE','SASU','SAS','EURL','SARL','SCI','HOLDING'].includes(type);
  const typeFormalite = isCreation ? 'CREATION' : type === 'MODIFICATION' ? 'MODIFICATION' : type === 'BE' || type === 'COMPTES' ? 'MODIFICATION' : 'RADIATION';
  const formeJuridique = isCreation ? type : null;

  let clientName = 'Nouveau dossier';
  if (clientId) {
    const { data: c } = await supabase.from('clients').select('denomination').eq('id', clientId).single();
    if (c) clientName = c.denomination;
  }

  const ref = `CMP-${Date.now().toString(36).toUpperCase()}`;
  const { data: dossier, error } = await supabase
    .from('dossiers')
    .insert({
      user_id: user.id,
      organization_id: m.organization_id,
      reference: ref,
      client_id: clientId,
      client_name: clientName,
      type_formalite: typeFormalite,
      forme_juridique: formeJuridique,
      statut: 'DRAFT',
    })
    .select()
    .single();
  if (error || !dossier) redirect('/dossiers?e=' + encodeURIComponent(error?.message || 'create_failed'));

  // Redirect vers le wizard legacy en mode édition
  redirect(`/app.html?route=nouveau&type=${type}&d=${dossier.id}`);
}
