'use client';

// « La différence Legaly AI » : texte à gauche avec flèches, carrousel des
// agents à droite (illustration, titre, description, bouton).

import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Container } from '../ui';
import { ILLUS_AGENTS } from './Illus';
import { Degrade, teinte } from './Couleurs';

const AGENTS = [
  { key: 'formalites', titre: 'Agent Formalités', texte: 'Décrivez l’opération : il pose les bonnes questions, crée le dossier, rédige les statuts et les actes, puis prépare le brouillon au Guichet unique.' },
  { key: 'regularisation', titre: 'Agent Régularisation', texte: 'Il lit la demande du greffe et les pièces déjà déposées, identifie ce qui bloque et prépare la correction ou le courrier de réponse.' },
  { key: 'annonces', titre: 'Agent Annonces légales', texte: 'Il rédige l’avis à publier à partir de la fiche RNE et vérifie chaque mention obligatoire du Code de commerce.' },
  { key: 'lots', titre: 'Agent Lots', texte: 'Collez une liste ou un tableur : il découpe en formalités et prépare chacune dans son propre dossier, en parallèle.' },
  { key: 'rne', titre: 'Agent Documents RNE', texte: 'Il retrouve les statuts en vigueur, les derniers PV et les comptes déposés pour rédiger à partir du texte officiel.' },
];

export function AgentsCarousel() {
  const rail = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const aller = (i: number) => {
    const n = Math.max(0, Math.min(AGENTS.length - 1, i));
    setIndex(n);
    const carte = rail.current?.children[n] as HTMLElement | undefined;
    if (carte && rail.current) rail.current.scrollTo({ left: carte.offsetLeft - rail.current.offsetLeft, behavior: 'smooth' });
  };

  return (
    <section id="agents" className="scroll-mt-24 bg-gradient-to-b from-[#fff8f3] to-[#fff5fb] px-3 py-6 sm:px-6">
      <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[32px] bg-[#140d2e] py-20 shadow-[0_30px_80px_rgba(54,31,171,0.25)] sm:rounded-[44px] sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 620px 460px at 0% 0%, rgba(255,190,140,0.35), transparent 62%),' +
              'radial-gradient(ellipse 760px 560px at 85% 20%, rgba(234,66,253,0.32), transparent 62%),' +
              'radial-gradient(ellipse 820px 520px at 45% 115%, rgba(117,81,232,0.55), transparent 65%)',
          }}
        />
      <Container className="relative grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            <Sparkles className="size-3.5 text-[var(--accent)]" /> La différence Legaly AI
          </span>
          <h2 className="!mt-5 font-[Sora] !text-[clamp(1.9rem,3.2vw,2.6rem)] !font-semibold !leading-[1.1] !text-white">
            Des agents IA qui préparent vos formalités, <Degrade className="from-[#ffbe8c] via-[#ff887b] to-[#ea42fd]">avec vous.</Degrade>
          </h2>
          <p className="!mt-5 max-w-lg text-[15px] !leading-relaxed !text-white/75">
            Ils travaillent comme une équipe de formalistes : ils lisent vos pièces, rédigent, contrôlent et préparent le dépôt.
            Vous gardez la main sur ce qui compte : la validation, la signature et le paiement.
          </p>
          <div className="mt-8 flex gap-2">
            <button
              type="button"
              onClick={() => aller(index - 1)}
              disabled={index === 0}
              aria-label="Agent précédent"
              className="grid size-11 place-items-center rounded-xl bg-white/15 !text-white transition-opacity hover:bg-white/25 disabled:opacity-30"
            >
              <ArrowLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => aller(index + 1)}
              disabled={index === AGENTS.length - 1}
              aria-label="Agent suivant"
              className="grid size-11 place-items-center rounded-xl bg-gradient-to-r from-[#ff887b] to-[#ea42fd] !text-white shadow-[0_8px_22px_rgba(234,66,253,0.45)] transition-opacity disabled:opacity-30"
            >
              <ArrowRight className="size-5" />
            </button>
          </div>
        </div>

        <div
          ref={rail}
          className="-mr-[50vw] flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 pr-[50vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            const w = (el.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1;
            setIndex(Math.round(el.scrollLeft / (w + 20)));
          }}
        >
          {AGENTS.map((a, i) => (
            <article
              key={a.key}
              className={`flex w-[300px] shrink-0 snap-start flex-col rounded-3xl bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)] transition-opacity sm:w-[330px] ${i === index ? 'opacity-100' : 'opacity-70'}`}
            >
              <div className="grid h-52 place-items-center rounded-2xl" style={{ background: `linear-gradient(135deg, ${teinte(i).fond}, #ffffff 55%, ${teinte(i + 1).fond})` }}>
                {ILLUS_AGENTS[a.key]}
              </div>
              <h3 className="!mt-5 font-[Sora] !text-xl !font-semibold !text-[var(--violet-900)]">{a.titre}</h3>
              <p className="!mt-2 text-sm !leading-relaxed !text-[var(--ink-600)]">{a.texte}</p>
              <a
                href="/auth/signup"
                className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7551e8] to-[#ea42fd] px-4 py-2 text-sm font-semibold !text-white no-underline shadow-[0_8px_20px_rgba(117,81,232,0.35)] transition-transform hover:-translate-y-0.5"
              >
                Essayer l’agent <ArrowRight className="size-4" />
              </a>
            </article>
          ))}
        </div>
      </Container>
      </div>
    </section>
  );
}
