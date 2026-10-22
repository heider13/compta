'use client';

// « La différence Legaly AI » : texte à gauche avec flèches, carrousel des
// agents à droite (cartes étroites et hautes façon Lovable : bande de couleur floue,
// titre en haut, description et bouton en bas). Les cartes défilent
// seules, lentement et en continu ; un peu plus lentement au survol ; une pause
// après un clic sur les flèches ; retour au début une fois au bout.

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Container } from '../ui';
import { Degrade } from './Couleurs';

const AGENTS = [
  { key: 'formalites', titre: 'Agent Formalités', texte: 'Décrivez l’opération : il pose les bonnes questions, crée le dossier, rédige les statuts et les actes, puis prépare le brouillon au Guichet unique.' },
  { key: 'regularisation', titre: 'Agent Régularisation', texte: 'Il lit la demande du greffe et les pièces déjà déposées, identifie ce qui bloque et prépare la correction ou le courrier de réponse.' },
  { key: 'annonces', titre: 'Agent Annonces légales', texte: 'Il rédige l’avis à publier à partir de la fiche RNE et vérifie chaque mention obligatoire du Code de commerce.' },
  { key: 'lots', titre: 'Agent Lots', texte: 'Collez une liste ou un tableur : il découpe en formalités et prépare chacune dans son propre dossier, en parallèle.' },
  { key: 'rne', titre: 'Agent Documents RNE', texte: 'Il retrouve les statuts en vigueur, les derniers PV et les comptes déposés pour rédiger à partir du texte officiel.' },
];

// Bandes de couleur des cartes (palette Legaly), placées et inclinées différemment
const bande = (left: string, top: string, w: string, h: string, r: string, fond: string): React.CSSProperties =>
  ({ left, top, width: w, height: h, ['--r' as string]: r, background: fond });
const BANDES = [
  bande('-80%', '40%', '260%', '42%', '-16deg', 'linear-gradient(100deg, #361fab 0%, #7551e8 35%, #ea42fd 70%, #ff887b 100%)'),
  bande('-30%', '-22%', '210%', '48%', '22deg', 'linear-gradient(100deg, #7551e8 0%, #4a6cf7 40%, #ea42fd 75%, #ff5f9e 100%)'),
  bande('-70%', '46%', '250%', '40%', '12deg', 'linear-gradient(100deg, #ff887b 0%, #ffbe8c 30%, #ea42fd 70%, #7551e8 100%)'),
  bande('-60%', '30%', '240%', '46%', '-24deg', 'linear-gradient(100deg, #ea42fd 0%, #ff5f9e 40%, #ff887b 70%, #ffbe8c 100%)'),
  bande('-40%', '-18%', '220%', '44%', '-14deg', 'linear-gradient(100deg, #ffbe8c 0%, #ff887b 30%, #c13ad6 65%, #361fab 100%)'),
];

export function AgentsCarousel() {
  const rail = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const vitesse = useRef(1); // 1 = normal, ralentie au survol
  const reprise = useRef(0); // horodatage avant lequel le défilement auto attend (après un clic)

  useEffect(() => {
    const el = rail.current;
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let id = 0;
    let avant = performance.now();
    let pos = el.scrollLeft;
    let v = 1;
    const boucle = (now: number) => {
      const dt = Math.min(0.5, (now - avant) / 1000);
      avant = now;
      v += (vitesse.current - v) * (1 - Math.exp(-dt / 0.3)); // changement de vitesse en douceur
      const fin = el.scrollWidth - el.clientWidth - 1;
      if (now < reprise.current) {
        pos = el.scrollLeft; // l'utilisateur navigue : on suit sa position
      } else if (pos >= fin) {
        reprise.current = now + 2200; // au bout : pause, retour au premier agent
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        pos += 30 * v * dt; // ≈ 30 px par seconde
        el.scrollLeft = pos;
      }
      id = requestAnimationFrame(boucle);
    };
    id = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(id);
  }, []);

  const aller = (i: number) => {
    const n = Math.max(0, Math.min(AGENTS.length - 1, i));
    setIndex(n);
    reprise.current = performance.now() + 4000;
    const carte = rail.current?.children[n] as HTMLElement | undefined;
    if (carte && rail.current) rail.current.scrollTo({ left: carte.offsetLeft - rail.current.offsetLeft, behavior: 'smooth' });
  };

  return (
    <section id="agents" className="scroll-mt-24 bg-gradient-to-b from-[#fff8f3] to-[#fff5fb] px-3 py-6 sm:px-6">
      <div className="theme-fixe relative mx-auto max-w-[1400px] overflow-hidden rounded-[32px] bg-[#140d2e] py-20 shadow-[0_30px_80px_rgba(54,31,171,0.25)] sm:rounded-[44px] sm:py-24">
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
          onMouseEnter={() => { vitesse.current = 0.35; }}
          onMouseLeave={() => { vitesse.current = 1; }}
          onTouchStart={() => { reprise.current = performance.now() + 4000; }}
          className="-mr-[50vw] flex gap-5 overflow-x-auto pb-2 pr-[50vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            const w = (el.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1;
            setIndex(Math.round(el.scrollLeft / (w + 20)));
          }}
        >
          {AGENTS.map((a, i) => (
            <article
              key={a.key}
              className={`relative flex h-[440px] w-[248px] shrink-0 snap-start flex-col overflow-hidden rounded-[22px] bg-[#0a0524] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.08] transition-opacity duration-500 sm:w-[264px] ${i === index ? 'opacity-100' : 'opacity-75'}`}
            >
              {/* Bande de couleur floue et courbe (esprit Lovable), une par agent */}
              <div aria-hidden="true" className="agent-bande pointer-events-none absolute" style={{ ...BANDES[i % BANDES.length], animationDelay: `${-i * 3}s` }} />
              <h3 className="relative font-[Sora] !text-[19px] !font-semibold !leading-snug !text-white">{a.titre}</h3>
              <div className="flex-1" />
              <p className="relative text-[14px] font-semibold !leading-snug !text-white [text-shadow:0_1px_14px_rgba(8,3,49,0.5)]">{a.texte}</p>
              <a
                href="/auth/signup"
                className="relative mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg bg-[#080331] px-4 py-2.5 text-[13.5px] font-semibold !text-white no-underline ring-1 ring-white/10 transition-colors hover:bg-[#140b4a]"
              >
                Essayer l’agent <ArrowRight className="size-4" />
              </a>
            </article>
          ))}
        </div>
      </Container>
      </div>
      <style>{`
        .agent-bande { filter: blur(18px); border-radius: 50%; animation: agent-bande 15s ease-in-out infinite alternate; }
        @keyframes agent-bande { from { transform: rotate(var(--r)) translateX(-5%); } to { transform: rotate(var(--r)) translateX(5%); } }
        @media (prefers-reduced-motion: reduce) { .agent-bande { animation: none; transform: rotate(var(--r)); } }
      `}</style>
    </section>
  );
}
