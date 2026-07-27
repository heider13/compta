'use server';

import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/client';
import * as templates from '@/lib/email/templates';
import { revalidatePath } from 'next/cache';

async function getOrgContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('memberships')
    .select('organization_id, organizations(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single();
  const { data: profile } = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single();
  const o = data?.organizations as { name?: string } | undefined;
  return { orgId: data?.organization_id, cabinetName: o?.name || 'Legaly AI', inviterName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Un collègue' };
}

export async function sendInvitationEmail(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  if (!email) return { error: 'Email requis' };
  const ctx = await getOrgContext();
  if (!ctx?.orgId) return { error: 'Pas de cabinet' };

  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://compta-navy.vercel.app';
  const acceptUrl = `${base}/auth/signup?invite=${ctx.orgId}&email=${encodeURIComponent(email)}`;

  const { subject, html, text } = templates.cabinetInvitation({
    cabinetName: ctx.cabinetName,
    inviterName: ctx.inviterName,
    acceptUrl,
  });

  try {
    await sendEmail({ to: email, subject, html, text });
  } catch (e) {
    return { error: (e as Error).message };
  }
  return { ok: true };
}

export async function notifyDossierSubmitted(dossierId: string) {
  const supabase = await createClient();
  const { data: d } = await supabase
    .from('dossiers')
    .select('reference, client_name, type_formalite, organization_id')
    .eq('id', dossierId)
    .single();
  if (!d) return;
  // Récupère tous les admins/owners de l'org
  const { data: members } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('organization_id', d.organization_id)
    .in('role', ['owner', 'admin']);
  if (!members?.length) return;
  const userIds = members.map((m) => m.user_id);
  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const emails = (users?.users ?? []).filter((u) => userIds.includes(u.id)).map((u) => u.email).filter(Boolean) as string[];
  if (!emails.length) return;

  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://compta-navy.vercel.app';
  const tpl = templates.dossierSubmitted({
    clientName: d.client_name,
    dossierRef: d.reference,
    formaliteType: d.type_formalite,
    viewUrl: `${base}/admin/dossiers/${dossierId}`,
  });

  await sendEmail({ to: emails, ...tpl }).catch(() => null);
  revalidatePath('/admin/queue');
}
