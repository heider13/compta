'use server';

// Server Actions du back-office admin (super admin Compta SAS).
// - Mutations sur les dossiers (validate, request amendment, ajout d'observation)
// - Mutation profile.role (changeUserRole)
// Toutes vérifient que l'utilisateur courant est bien admin avant d'agir.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const VPS_BACKEND_URL =
  process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://vps-84ac2579.vps.ovh.net';

export interface AdminActionResult {
  ok: boolean;
  message?: string;
  inpiId?: string;
  inpiError?: string;
}

async function assertAdmin(): Promise<{
  userId: string;
  accessToken: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  // On garde aussi l'access_token pour relayer au backend VPS quand nécessaire.
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token ?? null;

  return { userId: user.id, accessToken };
}

async function logAudit(opts: {
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  organizationId?: string | null;
}) {
  try {
    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      user_id: opts.userId,
      action: opts.action,
      resource_type: opts.resourceType ?? null,
      resource_id: opts.resourceId ?? null,
      metadata: opts.metadata ?? null,
      organization_id: opts.organizationId ?? null,
    });
  } catch {
    // best-effort
  }
}

// ─── validateDossier ────────────────────────────────────────────
// Si sendToInpi=true → relaie l'appel au VPS qui détient les creds INPI mandataires.
// Sinon → met juste statut=VALIDATED_INTERNAL côté Supabase.
export async function validateDossier(
  dossierId: string,
  sendToInpi: boolean,
): Promise<AdminActionResult> {
  const { userId, accessToken } = await assertAdmin();
  const supabase = await createClient();

  if (sendToInpi) {
    if (!accessToken) {
      return { ok: false, message: 'Session expirée — reconnectez-vous.' };
    }
    try {
      const res = await fetch(
        `${VPS_BACKEND_URL}/api/admin/dossiers/${dossierId}/validate?sendToInpi=true`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ sendToInpi: true }),
          cache: 'no-store',
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        inpi?: { id?: string };
        inpiError?: string;
        error?: string;
      };
      if (!res.ok) {
        return { ok: false, message: body.error ?? `HTTP ${res.status}` };
      }
      await logAudit({
        userId,
        action: 'dossier.validate.inpi',
        resourceType: 'dossier',
        resourceId: dossierId,
        metadata: { inpiId: body.inpi?.id, inpiError: body.inpiError },
      });
      revalidatePath(`/admin/dossiers/${dossierId}`);
      revalidatePath('/admin/queue');
      revalidatePath('/admin');
      return {
        ok: true,
        inpiId: body.inpi?.id,
        inpiError: body.inpiError,
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Erreur réseau VPS',
      };
    }
  }

  // Validation interne seule (sans INPI) → on update directement Supabase.
  const { error } = await supabase
    .from('dossiers')
    .update({ statut: 'VALIDATED_INTERNAL' })
    .eq('id', dossierId);

  if (error) return { ok: false, message: error.message };

  await logAudit({
    userId,
    action: 'dossier.validate.internal',
    resourceType: 'dossier',
    resourceId: dossierId,
  });

  revalidatePath(`/admin/dossiers/${dossierId}`);
  revalidatePath('/admin/queue');
  revalidatePath('/admin');
  return { ok: true };
}

// ─── requestAmendment ───────────────────────────────────────────
// Insère une observation admin + repasse le dossier en INTERNAL_AMENDMENT_PENDING.
export async function requestAmendment(
  dossierId: string,
  message: string,
): Promise<AdminActionResult> {
  const trimmed = message.trim();
  if (!trimmed) {
    return { ok: false, message: 'Le message est obligatoire.' };
  }
  const { userId } = await assertAdmin();
  const supabase = await createClient();

  const { error: obsErr } = await supabase.from('dossier_observations').insert({
    dossier_id: dossierId,
    author_id: userId,
    author_role: 'admin',
    message: trimmed,
    resolved: false,
  });
  if (obsErr) return { ok: false, message: obsErr.message };

  const { error: dossErr } = await supabase
    .from('dossiers')
    .update({ statut: 'INTERNAL_AMENDMENT_PENDING' })
    .eq('id', dossierId);
  if (dossErr) return { ok: false, message: dossErr.message };

  await logAudit({
    userId,
    action: 'dossier.request_amendment',
    resourceType: 'dossier',
    resourceId: dossierId,
  });

  revalidatePath(`/admin/dossiers/${dossierId}`);
  revalidatePath('/admin/queue');
  return { ok: true };
}

// ─── addObservation ─────────────────────────────────────────────
export async function addObservation(
  dossierId: string,
  message: string,
): Promise<AdminActionResult> {
  const trimmed = message.trim();
  if (!trimmed) {
    return { ok: false, message: 'Le message est vide.' };
  }
  const { userId } = await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from('dossier_observations').insert({
    dossier_id: dossierId,
    author_id: userId,
    author_role: 'admin',
    message: trimmed,
    resolved: false,
  });
  if (error) return { ok: false, message: error.message };

  await logAudit({
    userId,
    action: 'dossier.add_observation',
    resourceType: 'dossier',
    resourceId: dossierId,
  });
  revalidatePath(`/admin/dossiers/${dossierId}`);
  return { ok: true };
}

// ─── changeUserRole ─────────────────────────────────────────────
export async function changeUserRole(
  targetUserId: string,
  newRole: 'admin' | 'client',
): Promise<AdminActionResult> {
  if (newRole !== 'admin' && newRole !== 'client') {
    return { ok: false, message: 'Rôle invalide.' };
  }
  const { userId } = await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId);
  if (error) return { ok: false, message: error.message };

  await logAudit({
    userId,
    action: 'user.change_role',
    resourceType: 'profile',
    resourceId: targetUserId,
    metadata: { newRole },
  });
  revalidatePath('/admin/users');
  return { ok: true };
}

// ─── Form-action wrappers (à utiliser dans des <form action={...}>) ─────────
// Ces wrappers acceptent FormData pour faciliter l'usage dans des <form>.

export async function validateDossierForm(formData: FormData) {
  const dossierId = String(formData.get('dossierId') ?? '');
  const sendToInpi = formData.get('sendToInpi') === 'true';
  if (!dossierId) return;
  await validateDossier(dossierId, sendToInpi);
}

export async function requestAmendmentForm(formData: FormData) {
  const dossierId = String(formData.get('dossierId') ?? '');
  const message = String(formData.get('message') ?? '');
  if (!dossierId) return;
  await requestAmendment(dossierId, message);
}

export async function addObservationForm(formData: FormData) {
  const dossierId = String(formData.get('dossierId') ?? '');
  const message = String(formData.get('message') ?? '');
  if (!dossierId) return;
  await addObservation(dossierId, message);
}

export async function changeUserRoleForm(formData: FormData) {
  const targetUserId = String(formData.get('userId') ?? '');
  const newRole = String(formData.get('role') ?? '') as 'admin' | 'client';
  if (!targetUserId) return;
  await changeUserRole(targetUserId, newRole);
}
