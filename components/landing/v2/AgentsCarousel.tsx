'use client';

// « La différence Legaly AI » : texte à gauche avec flèches, carrousel des
// agents à droite (illustration, titre, description, bouton).

import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Container } from '../ui';
import { ILLUS_AGENTS } from './Illus';

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
    <section id="agents" className="scroll-mt-24 overflow-hidden bg-white pb-20 sm:pb-24">
      <Container className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--violet-200)] bg-[var(--violet-50)] px-3 py-1 text-xs font-semibold text-[var(--violet-700)]">
            <Sparkles className="size-3.5 text-[var(--accent)]" /> La différence Legaly AI
          </span>
          <h2 className="!mt-5 font-[Sora] !text-[clamp(1.9rem,3.2vw,2.6rem)] !font-semibold !leading-[1.1] !text-[var(--violet-900)]">
            Des agents IA qui préparent vos formalités, avec vous.
          </h2>
          <p className="!mt-5 max-w-lg text-[15px] !leading-relaxed !text-[var(--ink-600)]">
            Ils travaillent comme une équipe de formalistes : ils lisent vos pièces, rédigent, contrôlent et préparent le dépôt.
            Vous gardez la main sur ce qui compte : la validation, la signature et le paiement.
          </p>
          <div className="mt-8 flex gap-2">
            <button
              type="button"
              onClick={() => aller(index - 1)}
              disabled={index === 0}
              aria-label="Agent précédent"
              className="grid size-11 place-items-center rounded-xl bg-[var(--violet-900)] !text-white transition-opacity disabled:opacity-30"
            >
              <ArrowLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => aller(index + 1)}
              disabled={index === AGENTS.length - 1}
              aria-label="Agent suivant"
              className="grid size-11 place-items-center rounded-xl bg-[var(--violet-900)] !text-white transition-opacity disabled:opacity-30"
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
              className={`flex w-[300px] shrink-0 snap-start flex-col rounded-3xl border bg-white p-4 transition-opacity sm:w-[330px] ${i === index ? 'border-[var(--ink-150)] opacity-100' : 'border-[var(--ink-100)] opacity-60'}`}
            >
              <div className="grid h-52 place-items-center rounded-2xl border border-[var(--violet-100)] bg-gradient-to-br from-[var(--violet-50)] via-white to-[#fff3ee]">
                {ILLUS_AGENTS[a.key]}
              </div>
              <h3 className="!mt-5 font-[Sora] !text-xl !font-semibold !text-[var(--violet-900)]">{a.titre}</h3>
              <p className="!mt-2 text-sm !leading-relaxed !text-[var(--ink-600)]">{a.texte}</p>
              <a
                href="/auth/signup"
                className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--violet-900)] px-4 py-2 text-sm font-semibold !text-white no-underline transition-colors hover:bg-[var(--violet-600)]"
              >
                Essayer l’agent <ArrowRight className="size-4" />
              </a>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
