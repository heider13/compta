'use client';

// Hero de la page Indépendants et TPE : l'entrepreneur écrit ce qu'il veut faire.
// À l'envoi, une fenêtre lui demande de créer son compte (e-mail ou Google), puis
// le grand chat s'ouvre (/espace/demarrer) : formalité identifiée, paiement,
// puis l'assistant réalise la formalité étape par étape.

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { FaisceauLignes } from './FaisceauLignes';
import { BoiteChat } from './BoiteChat';
import { ModaleCompte } from '@/components/espace/ModaleCompte';
import { createClient } from '@/lib/supabase/client';

export function HeroEntrepreneur({
  kicker, ligne1, ligne2, sousTitre, exemples,
}: { kicker: string; ligne1: string; ligne2: string; sousTitre: string; exemples: string[] }) {
  const [saisie, setSaisie] = useState('');
  const [modale, setModale] = useState<{ demande: string; suite: string } | null>(null);

  async function demarrer(texte: string) {
    const demande = texte.trim().slice(0, 500);
    const suite = `/espace/demarrer${demande ? `?demande=${encodeURIComponent(demande)}` : ''}`;
    // Déjà connecté : directement le chat ; sinon, création du compte d'abord
    const { data } = await createClient().auth.getSession();
    if (data.session) { window.location.href = suite; return; }
    setModale({ demande: demande || 'Être guidé pas à pas', suite });
  }

  return (
    <section className="relative overflow-hidden bg-[#fcfbff]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 900px 600px at 50% 10%, rgba(117,81,232,0.14), transparent 65%), radial-gradient(ellipse 600px 420px at 0% 100%, rgba(255,136,123,0.10), transparent 60%)' }} />
      <FaisceauLignes className="pointer-events-none absolute inset-x-0 top-0 h-[700px] sm:h-[720px]" />
      <div className="relative mx-auto w-full max-w-3xl px-4 pb-20 pt-32 sm:px-6 sm:pt-36">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--violet-200)] bg-[var(--violet-50)] px-3 py-1 text-xs font-semibold text-[var(--violet-700)]"><Sparkles className="size-3.5" /> {kicker}</span>
          <h1 className="!mt-5 font-[Sora] !text-[clamp(2.1rem,4.6vw,3.4rem)] !font-bold !leading-[1.05] !tracking-[-0.03em] !text-[var(--violet-900)]">
            {ligne1}<br /><span className="bg-gradient-to-r from-[#4a2bc4] via-[#7551e8] to-[#c13ad6] bg-clip-text text-transparent">{ligne2}</span>
          </h1>
          <p className="!mx-auto !mt-4 max-w-xl text-base !leading-relaxed !text-[var(--ink-600)]">{sousTitre}</p>
        </div>

        <BoiteChat
          className="mt-9"
          value={saisie}
          onChange={setSaisie}
          onSubmit={() => void demarrer(saisie)}
          maxLength={500}
          mode="Assistant création"
          placeholder="Décrivez votre projet : « Je veux créer ma micro-entreprise de graphisme »…"
          ariaLabel="Décrivez votre projet"
        />
        <p className="!mt-4 text-center">
          <button type="button" onClick={() => void demarrer('')} className="text-sm font-medium text-[#7551e8] hover:underline">
            Ou laissez-vous guider pas à pas →
          </button>
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {exemples.map((x) => (
            <button key={x} type="button" onClick={() => void demarrer(x)} className="rounded-full border border-[var(--ink-150)] bg-white px-3.5 py-1.5 text-sm !text-[var(--ink-600)] transition-colors hover:border-[var(--violet-400)] hover:!text-[var(--violet-900)]">{x}</button>
          ))}
        </div>
        <p className="!mx-auto !mt-5 max-w-lg text-center text-xs !text-[var(--ink-500)]">
          Créez votre compte en quelques secondes : l’assistant identifie votre formalité et son prix, puis la réalise avec vous une fois réglée.
        </p>
      </div>

      {modale && <ModaleCompte demande={modale.demande} suite={modale.suite} onFermer={() => setModale(null)} />}
    </section>
  );
}
