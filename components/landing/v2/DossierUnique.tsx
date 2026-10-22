'use client';

// « Sans / avec Legaly AI » (esprit Frankenstack de light.inc) : des carrés éparpillés
// en outils séparés (statuts dans Word, bail, formulaire INPI saisi à la main…)
// qui se rassemblent d'un coup en une seule interface ordonnée, pilotée par les
// agents. Se déclenche à l'arrivée à l'écran ; curseur et bouton « rejouer ».

import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Grille (en unités ; 1 unité = un carré + son espace) ───
const LARG = 27.5;
const HAUT = 12.6;
const TAILLE = 0.74;
const u = (v: number) => `${((v / LARG) * 100).toFixed(3)}cqw`;

type Bloc = { label: string; x: number; y: number; w: number; h: number };
type Case = { x: number; y: number; ton: number }; // ton : 0 → 1, nuance du carré

// Sans Legaly AI (comme le « Frankenstack » de light.inc) : chaque étape vit dans
// son propre outil. Même grille que l'interface rangée, mais des blocs troués de
// façon irrégulière, en nuances de gris.
const EPARS: Bloc[] = [
  { label: 'Échanges par e-mail', x: 1, y: 0.7, w: 25, h: 2 },
  { label: 'Statuts sous Word', x: 0, y: 3.6, w: 6, h: 4 },
  { label: 'Bail commercial', x: 7, y: 3.6, w: 6, h: 4 },
  { label: 'Annonce au journal', x: 14, y: 3.6, w: 6, h: 4 },
  { label: 'Formulaire INPI à la main', x: 21, y: 3.6, w: 6, h: 4 },
  { label: 'Pièces scannées', x: 0, y: 8.4, w: 6, h: 4 },
  { label: 'Signatures papier', x: 7, y: 8.4, w: 6, h: 4 },
  { label: 'Tableur de suivi', x: 14, y: 8.4, w: 6, h: 4 },
  { label: 'Relances client', x: 21, y: 8.4, w: 6, h: 4 },
];

// Avec Legaly AI : une ligne d'agents, les modules alignés, les registres branchés
const AGENTS: Bloc = { label: 'Agents IA Legaly', x: 0, y: 0.7, w: 20, h: 2 };
const MODULES: Bloc[] = [
  { label: 'Statuts et actes', x: 0, y: 3.9, w: 6, h: 3 },
  { label: 'Pièces et bail', x: 7, y: 3.9, w: 6, h: 3 },
  { label: 'Annonce légale', x: 14, y: 3.9, w: 6, h: 3 },
  { label: 'Formulaire Guichet unique', x: 0, y: 8.3, w: 6, h: 3 },
  { label: 'Signature', x: 7, y: 8.3, w: 6, h: 3 },
  { label: 'Suivi du dossier', x: 14, y: 8.3, w: 6, h: 3 },
];
const REGISTRES: Bloc[] = [
  { label: 'Guichet unique INPI', x: 23.5, y: 3.9, w: 3, h: 3 },
  { label: 'RNE', x: 23.5, y: 8.3, w: 3, h: 3 },
];

// Pseudo-aléatoire déterministe (même rendu serveur / client)
function alea(graine: number) {
  let s = graine;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function cases(b: Bloc): Case[] {
  const out: Case[] = [];
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) out.push({ x: b.x + i, y: b.y + j + 0.5, ton: 0 });
  return out;
}

function construire() {
  const r = alea(42);
  const ordre = [
    ...cases(AGENTS).map((c) => ({ ...c, ton: 2 })), // 2 = corail (agents)
    ...MODULES.flatMap(cases).map((c) => ({ ...c, ton: r() < 0.18 ? 0.8 : 1 })),
    ...REGISTRES.flatMap(cases).map((c) => ({ ...c, ton: 3 })), // 3 = registres branchés
  ];
  // Outils séparés : sur chaque ligne de chaque bloc, 0 à 2 trous de 1 à 3 carrés,
  // puis on ajuste pour avoir exactement autant de carrés que l'interface rangée
  const gardes: Case[] = [];
  const retires: Case[] = [];
  for (const b of EPARS) {
    for (let j = 0; j < b.h; j++) {
      const trous = new Set<number>();
      const n = Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const debut = Math.floor(r() * b.w);
        const long = 1 + Math.floor(r() * 3);
        for (let i = debut; i < Math.min(b.w, debut + long); i++) trous.add(i);
      }
      for (let i = 0; i < b.w; i++) (trous.has(i) ? retires : gardes).push({ x: b.x + i, y: b.y + j + 0.5, ton: 0 });
    }
  }
  while (gardes.length > ordre.length) gardes.splice(Math.floor(r() * gardes.length), 1);
  while (gardes.length < ordre.length && retires.length) gardes.push(retires.splice(Math.floor(r() * retires.length), 1)[0]);
  const epars = gardes.map((c) => ({ ...c, ton: 0.22 + r() * 0.68 }));
  // Chaque carré rejoint la place correspondante, colonne par colonne :
  // le mouvement reste ordonné, en vague de gauche à droite
  const parColonne = (p: Case, q: Case) => p.x - q.x || p.y - q.y;
  epars.sort(parColonne);
  const cibles = [...ordre].sort(parColonne);
  return cibles.map((o, i) => ({ de: epars[i], vers: o, delai: Math.round((o.x / LARG) * 1100 + r() * 120) }));
}

function couleur(c: Case) {
  if (c.ton === 2) return '#ff887b';
  if (c.ton === 3) return '#9a8fd5';
  if (c.ton >= 0.8 && c.ton <= 1) return c.ton === 1 ? '#ffffff' : '#d9d4ee';
  return `rgba(255,255,255,${c.ton.toFixed(2)})`;
}

const REMPLACE = [
  'Les modèles de statuts et de PV sous Word',
  'Le formulaire du Guichet unique saisi à la main',
  'Les pièces qui circulent par e-mail',
  'Le tableur de suivi des dossiers',
];
const AGENTS_FONT = [
  'La rédaction des statuts, PV et actes',
  'L’annonce légale et ses mentions obligatoires',
  'Le contrôle des pièces justificatives',
  'Le brouillon prêt sur le Guichet unique',
];
const CONNECTE = ['Guichet unique de l’INPI', 'Registre national des entreprises (RNE)', 'Votre espace client et vos signataires'];

// Cartes : une bande de couleur Legaly, floue et courbe, différente pour chacune
const CARTES: { titre: string; liste: string[]; bande: React.CSSProperties }[] = [
  {
    titre: 'Remplace', liste: REMPLACE,
    bande: { left: '-70%', top: '42%', width: '240%', height: '62%', ['--r' as string]: '-14deg', background: 'linear-gradient(100deg, #361fab 0%, #7551e8 35%, #ea42fd 68%, #ff887b 100%)' },
  },
  {
    titre: 'Fait par les agents', liste: AGENTS_FONT,
    bande: { left: '-60%', top: '50%', width: '230%', height: '58%', ['--r' as string]: '10deg', background: 'linear-gradient(100deg, #ff887b 0%, #ffbe8c 30%, #ea42fd 70%, #7551e8 100%)' },
  },
  {
    titre: 'Se connecte', liste: CONNECTE,
    bande: { left: '-20%', top: '-38%', width: '200%', height: '70%', ['--r' as string]: '24deg', background: 'linear-gradient(100deg, #7551e8 0%, #4a6cf7 40%, #ea42fd 75%, #ff5f9e 100%)' },
  },
];

export function DossierUnique() {
  const carres = useMemo(construire, []);
  const ref = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState(false);
  const [vu, setVu] = useState(false);
  const [reduit, setReduit] = useState(false);

  useEffect(() => {
    const red = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    setReduit(red);
    if (red) { setRange(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVu(true); io.disconnect(); } }, { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!vu) return;
    const t = setTimeout(() => setRange(true), 1400);
    return () => clearTimeout(t);
  }, [vu]);

  // Le compteur bascule au milieu du mouvement, pas avant
  const [compte, setCompte] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCompte(range), range && !reduit ? 1500 : 0);
    return () => clearTimeout(t);
  }, [range, reduit]);

  function rejouer() {
    setRange(false);
    setTimeout(() => setRange(true), 2600);
  }

  const libelles = (blocs: Bloc[], visible: boolean, accent = false) =>
    blocs.map((b) => (
      <span
        key={b.label}
        className={cn(
          'absolute whitespace-nowrap font-mono uppercase tracking-[0.12em] transition-opacity duration-700',
          accent ? 'text-[#ff887b]' : 'text-white/55',
          visible ? 'opacity-100 delay-[1800ms]' : 'opacity-0',
        )}
        style={{ left: u(b.x), top: u(b.y - 0.15), fontSize: 'clamp(7px, 0.85cqw, 11px)' }}
      >
        {b.label}
      </span>
    ));

  return (
    <section className="bg-[#fbfaff] px-3 py-16 sm:px-5 sm:py-20">
      <div className="theme-fixe relative mx-auto max-w-[1400px] overflow-hidden rounded-[28px] bg-[#080331] px-5 pb-8 pt-10 text-white sm:px-10 sm:pt-11">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 700px 420px at 100% 0%, rgba(255,136,123,0.13), transparent 62%), radial-gradient(ellipse 760px 520px at 0% 100%, rgba(54,31,171,0.4), transparent 65%)' }}
        />

        {/* Titre et texte côte à côte : le panneau reste en format paysage */}
        <div className="relative grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-12">
          <div>
            <p className="font-mono !text-[12px] uppercase tracking-[0.18em] !text-white/50">Ce que Legaly AI remplace</p>
            <h2 className="!mt-3 font-[Sora] !text-[clamp(1.75rem,3.2vw,2.6rem)] !font-semibold !leading-[1.1] !tracking-[-0.02em] !text-white">
              Fini le dossier en morceaux.
              <br />
              <span className="bg-gradient-to-r from-[#ffbe8c] via-[#ff887b] to-[#ea42fd] bg-clip-text text-transparent">Tout sur une seule interface.</span>
            </h2>
          </div>
          <p className="text-[15px] leading-relaxed !text-white/65">
            Les statuts dans Word, le bail dans un e-mail, le formulaire INPI saisi à la main, l’annonce chez un journal… Legaly AI rassemble tout dans un seul dossier, préparé par des agents IA.
          </p>
        </div>

        <div className="relative mt-8 grid gap-10 border-t border-white/10 pt-8 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
          {/* Grille de carrés + curseur sans / avec */}
          <div>
            <div
              ref={ref}
              className="relative w-full [container-type:inline-size]"
              style={{ aspectRatio: `${LARG} / ${HAUT + 0.6}` }}
              role="img"
              aria-label={`Sans Legaly AI : ${EPARS.map((b) => b.label).join(', ')}. Avec Legaly AI : une seule interface, ${MODULES.map((b) => b.label).join(', ')}, pilotée par les agents IA.`}
            >
              {libelles(EPARS, !range)}
              {libelles([AGENTS], range, true)}
              {libelles([...MODULES, ...REGISTRES], range)}

              {/* Branchement des registres */}
              {REGISTRES.map((b) => (
                <span
                  key={b.label}
                  className={cn('absolute h-px bg-white/30 transition-opacity duration-500', range ? 'opacity-100 delay-[2400ms]' : 'opacity-0')}
                  style={{ left: u(20.4), width: u(2.8), top: u(b.y + 0.5 + b.h / 2 - 0.15) }}
                />
              ))}

              {carres.map((c, i) => {
                const p = range ? c.vers : c.de;
                return (
                  <span
                    key={i}
                    className="absolute left-0 top-0 rounded-[18%]"
                    style={{
                      width: u(TAILLE),
                      height: u(TAILLE),
                      background: couleur(p),
                      transform: `translate(${u(p.x)}, ${u(p.y)})`,
                      transition: reduit ? 'none' : `transform 1.9s cubic-bezier(0.65,0,0.25,1) ${c.delai}ms, background-color 0.9s ease ${c.delai + 1000}ms`,
                    }}
                  />
                );
              })}
            </div>

            <div className="mt-6 flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.16em]">
              <span className="flex shrink-0 items-baseline gap-1.5 normal-case tracking-normal">
                <span className="font-[Sora] text-[28px] font-light leading-none text-white">{compte ? 1 : EPARS.length}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/50">{compte ? 'interface' : 'outils'}</span>
              </span>
              <button type="button" onClick={() => setRange(false)} className={cn('transition-colors', range ? 'text-white/45 hover:text-white' : 'text-white')}>
                Sans Legaly AI
              </button>
              <button type="button" onClick={() => setRange((v) => !v)} className="relative h-px flex-1 bg-white/25" aria-label={range ? 'Voir sans Legaly AI' : 'Voir avec Legaly AI'}>
                <span
                  className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.12)] transition-[left] duration-700 ease-[cubic-bezier(0.7,0,0.2,1)]"
                  style={{ left: range ? '100%' : '0%' }}
                />
              </button>
              <button type="button" onClick={() => setRange(true)} className={cn('transition-colors', range ? 'text-[#ff887b]' : 'text-white/45 hover:text-white')}>
                Avec Legaly AI
              </button>
              <button type="button" onClick={rejouer} className="grid size-8 place-items-center rounded-full border border-white/20 text-white/70 transition-colors hover:bg-white/10 hover:text-white" aria-label="Rejouer l’animation">
                <RotateCcw className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Ce qui change : cartes étroites et hautes (esprit Lovable), bande de couleur floue */}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-rows-[1fr]">
            {CARTES.map((c, k) => (
              <article key={c.titre} className="relative flex min-h-[300px] flex-col overflow-hidden rounded-[20px] bg-[#0d0838] p-5 ring-1 ring-white/[0.06] lg:min-h-0">
                <div aria-hidden="true" className="carte-bande pointer-events-none absolute" style={{ ...c.bande, animationDelay: `${-k * 4}s` }} />
                <h3 className="relative font-[Sora] !text-[18px] !font-semibold !text-white">{c.titre}</h3>
                <ul className="relative mt-auto space-y-2 pt-24">
                  {c.liste.map((l) => (
                    <li key={l} className="text-[13.5px] font-semibold leading-snug !text-white [text-shadow:0_1px_12px_rgba(8,3,49,0.45)]">{l}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .carte-bande { filter: blur(16px); border-radius: 50%; animation: carte-bande 16s ease-in-out infinite alternate; }
        @keyframes carte-bande { from { transform: rotate(var(--r)) translateX(-4%); } to { transform: rotate(var(--r)) translateX(4%); } }
        @media (prefers-reduced-motion: reduce) { .carte-bande { animation: none; transform: rotate(var(--r)); } }
      `}</style>
    </section>
  );
}
