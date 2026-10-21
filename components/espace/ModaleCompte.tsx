'use client';

// Fenêtre de création de compte (ou de connexion) ouverte dès que l'entrepreneur
// envoie sa demande sur la page Indépendants et TPE : e-mail ou Google, puis on
// enchaîne vers le chat (`suite`).

import { useState, useTransition } from 'react';
import { Loader2, Lock, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { connecterEntrepreneur, creerCompteEntrepreneur } from '@/lib/espace/auth-actions';
import { cn } from '@/lib/utils';

function LogoGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

export function ModaleCompte({ demande, suite, onFermer }: { demande: string; suite: string; onFermer: () => void }) {
  const [mode, setMode] = useState<'creer' | 'connexion'>('creer');
  const [champs, setChamps] = useState({ prenom: '', nom: '', email: '', motDePasse: '' });
  const [message, setMessage] = useState<{ type: 'erreur' | 'info'; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const [google, setGoogle] = useState(false);

  const maj = (k: keyof typeof champs) => (e: React.ChangeEvent<HTMLInputElement>) => setChamps({ ...champs, [k]: e.target.value });

  function valider(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    demarrer(async () => {
      const r = mode === 'creer' ? await creerCompteEntrepreneur(champs) : await connecterEntrepreneur(champs);
      if (r.ok) { window.location.href = suite; return; }
      if (r.info) { setMode('connexion'); setMessage({ type: 'info', texte: r.info }); return; }
      setMessage({ type: 'erreur', texte: r.erreur || 'Une erreur est survenue.' });
    });
  }

  async function avecGoogle() {
    setGoogle(true); setMessage(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(suite)}` },
    });
    if (error) {
      setGoogle(false);
      setMessage({ type: 'info', texte: 'La connexion avec Google arrive très bientôt : créez votre compte avec votre e-mail en attendant.' });
    }
  }

  const champ = 'h-11 w-full rounded-xl border border-[#e4dcff] bg-white px-3.5 text-[15px] text-[#241143] outline-none transition-colors placeholder:text-[#a59fc0] focus:border-[#7551e8]';

  return (
    <div className="theme-clair fixed inset-0 z-[60] grid place-items-center bg-[#080331]/55 p-4 backdrop-blur-sm animate-in fade-in-0" role="dialog" aria-modal="true" aria-labelledby="titre-compte">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_40px_100px_rgba(8,3,49,0.35)] animate-in zoom-in-95 slide-in-from-bottom-2">
        <div className="h-1.5 bg-gradient-to-r from-[#361fab] via-[#ea42fd] to-[#ff887b]" />
        <button type="button" onClick={onFermer} aria-label="Fermer" className="absolute right-4 top-5 grid size-8 place-items-center rounded-full text-[#8a83a3] hover:bg-[#f4f1fb] hover:text-[#241143]">
          <X className="size-4" />
        </button>
        <div className="px-6 pb-6 pt-6 sm:px-8">
          <h2 id="titre-compte" className="!m-0 font-[Sora] !text-[22px] !font-semibold !text-[#241143]">
            {mode === 'creer' ? 'Créez votre compte pour continuer' : 'Connectez-vous pour continuer'}
          </h2>
          <p className="!m-0 mt-1.5 text-sm !text-[#6b6385]">Votre assistant reprend votre demande et vous guide étape par étape.</p>
          <div className="mt-4 rounded-xl bg-[#f6f3fd] px-3.5 py-2.5 text-sm text-[#3d3558]">
            <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wider text-[#7551e8]">Votre demande</span>
            <span className="line-clamp-2">{demande}</span>
          </div>

          <button
            type="button"
            onClick={() => void avecGoogle()}
            disabled={google}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#e4dcff] bg-white text-[15px] font-medium text-[#241143] transition-colors hover:bg-[#f8f6fd] disabled:opacity-60"
          >
            {google ? <Loader2 className="size-4 animate-spin" /> : <LogoGoogle />} Continuer avec Google
          </button>
          <div className="my-4 flex items-center gap-3 text-xs text-[#a59fc0]"><span className="h-px flex-1 bg-[#ece8f7]" /> ou avec votre e-mail <span className="h-px flex-1 bg-[#ece8f7]" /></div>

          <form onSubmit={valider} className="space-y-2.5">
            {mode === 'creer' && (
              <div className="grid grid-cols-2 gap-2.5">
                <input className={champ} placeholder="Prénom" autoComplete="given-name" value={champs.prenom} onChange={maj('prenom')} required />
                <input className={champ} placeholder="Nom" autoComplete="family-name" value={champs.nom} onChange={maj('nom')} required />
              </div>
            )}
            <input className={champ} type="email" placeholder="E-mail" autoComplete="email" value={champs.email} onChange={maj('email')} required />
            <input className={champ} type="password" placeholder={mode === 'creer' ? 'Mot de passe (8 caractères minimum)' : 'Mot de passe'} autoComplete={mode === 'creer' ? 'new-password' : 'current-password'} value={champs.motDePasse} onChange={maj('motDePasse')} required minLength={mode === 'creer' ? 8 : undefined} />
            {message && (
              <p className={cn('!m-0 rounded-lg px-3 py-2 text-sm', message.type === 'erreur' ? 'bg-[#fff1ef] !text-[#c2410c]' : 'bg-[#f4efff] !text-[#361fab]')}>{message.texte}</p>
            )}
            <button type="submit" disabled={enCours} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ff887b] text-[15px] font-semibold text-[#080331] shadow-[0_10px_24px_-10px_rgba(255,136,123,0.9)] transition-colors hover:bg-[#ffaca3] disabled:opacity-60">
              {enCours && <Loader2 className="size-4 animate-spin" />}
              {mode === 'creer' ? 'Créer mon compte et continuer' : 'Me connecter et continuer'}
            </button>
          </form>

          <p className="!m-0 mt-4 text-center text-sm !text-[#6b6385]">
            {mode === 'creer' ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
            <button type="button" onClick={() => { setMode(mode === 'creer' ? 'connexion' : 'creer'); setMessage(null); }} className="font-semibold text-[#361fab] hover:underline">
              {mode === 'creer' ? 'Se connecter' : 'Créer un compte'}
            </button>
          </p>
          <p className="!m-0 mt-3 flex items-center justify-center gap-1.5 text-[11px] !text-[#a59fc0]"><Lock className="size-3" /> Vos données restent confidentielles. Rien n’est déposé sans votre validation.</p>
        </div>
      </div>
    </div>
  );
}
