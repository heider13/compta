'use server';

// Création de compte et connexion de l'entrepreneur depuis la fenêtre ouverte sur
// la page Indépendants et TPE (compte « entrepreneur » : aucun cabinet créé).
// Renvoient un état au lieu de rediriger : la fenêtre enchaîne vers le chat.

import { createClient } from '@/lib/supabase/server';

export type EtatCompte = { ok: true } | { ok: false; erreur?: string; info?: string };

export async function creerCompteEntrepreneur(donnees: { prenom: string; nom: string; email: string; motDePasse: string }): Promise<EtatCompte> {
  const prenom = donnees.prenom.trim();
  const nom = donnees.nom.trim();
  const email = donnees.email.trim();
  const password = donnees.motDePasse;
  if (!prenom || !nom || !email || password.length < 8) {
    return { ok: false, erreur: 'Renseignez votre prénom, votre nom, votre e-mail et un mot de passe de 8 caractères au moins.' };
  }
  const supabase = await createClient();
  const { error, data } = await supabase.auth.signUp({
    email, password,
    options: { data: { first_name: prenom, last_name: nom, compte: 'entrepreneur' } },
  });
  if (error) return { ok: false, erreur: /registered|already/i.test(error.message) ? 'Un compte existe déjà avec cet e-mail : connectez-vous.' : error.message };
  if (!data.session) {
    const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
    if (e2) return { ok: false, info: 'Compte créé : confirmez votre e-mail (lien reçu), puis connectez-vous ici.' };
  }
  return { ok: true };
}

export async function connecterEntrepreneur(donnees: { email: string; motDePasse: string }): Promise<EtatCompte> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: donnees.email.trim(), password: donnees.motDePasse });
  return error ? { ok: false, erreur: 'E-mail ou mot de passe incorrect.' } : { ok: true };
}
