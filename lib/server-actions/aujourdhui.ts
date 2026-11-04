'use server';

// Vue « Aujourd'hui » et mémoire client : écritures du cabinet (protégées par RLS).

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const DECISIONS = ['acceptee', 'ignoree', 'faite', 'proposee'] as const;
type Decision = (typeof DECISIONS)[number];

export async function deciderProposition(id: string, statut: Decision) {
  if (!DECISIONS.includes(statut)) return { error: 'Décision inconnue.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Session expirée, reconnectez-vous.' };
  const { error } = await supabase
    .from('propositions')
    .update({ statut, decided_by: statut === 'proposee' ? null : user.id, decided_at: statut === 'proposee' ? null : new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/aujourdhui');
  return { ok: true };
}

const MAX_NOTE = 500;
const nettoyer = (t: string) => t.trim().replace(/\s+/g, ' ');

export async function ajouterNoteClient(clientId: string, contenu: string) {
  const texte = nettoyer(contenu);
  if (!texte) return { error: 'Note vide.' };
  if (texte.length > MAX_NOTE) return { error: `${MAX_NOTE} caractères au plus.` };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Session expirée, reconnectez-vous.' };
  const { data: client } = await supabase.from('clients').select('organization_id').eq('id', clientId).maybeSingle();
  if (!client) return { error: 'Client introuvable.' };
  const { error } = await supabase.from('memoire_client').insert({
    organization_id: client.organization_id, client_id: clientId, contenu: texte, source: 'cabinet', created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

export async function modifierNoteClient(id: string, clientId: string, contenu: string) {
  const texte = nettoyer(contenu);
  if (!texte) return { error: 'Note vide.' };
  if (texte.length > MAX_NOTE) return { error: `${MAX_NOTE} caractères au plus.` };
  const supabase = await createClient();
  // Une note corrigée par le cabinet devient la sienne
  const { error } = await supabase.from('memoire_client').update({ contenu: texte, source: 'cabinet' }).eq('id', id).eq('client_id', clientId);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

export async function supprimerNoteClient(id: string, clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('memoire_client').delete().eq('id', id).eq('client_id', clientId);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}
