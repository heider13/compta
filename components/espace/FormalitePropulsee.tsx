'use client';

// Animation de fin : la formalité est « propulsée ». Une grille en perspective file
// vers l'horizon, traversée de lignes aux couleurs Legaly qui convergent vers le
// point de fuite (métaphore du dossier lancé vers le Guichet unique).

import { ArrowRight } from 'lucide-react';

const LIGNES = [
  { x: -40, c: '#361fab' }, { x: 8, c: '#9d6cf2' }, { x: 30, c: '#ea42fd' },
  { x: 62, c: '#ff5f9e' }, { x: 88, c: '#ff887b' }, { x: 120, c: '#ffbe8c' },
];

export function FormalitePropulsee({ libelle, onFermer }: { libelle: string; onFermer: () => void }) {
  return (
    <div className="theme-clair fixed inset-0 z-[70] overflow-hidden bg-[#f7f4fd] animate-in fade-in-0 duration-700" role="dialog" aria-modal="true" aria-labelledby="titre-propulsee">
      <style>{`
        @keyframes sol-defile { from { background-position: 0 0; } to { background-position: 0 64px; } }
        @keyframes trait-file { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -260; } }
        .sol-propulse { animation: sol-defile 0.9s linear infinite; }
        .trait-propulse { stroke-dasharray: 120 140; animation: trait-file 1.4s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .sol-propulse, .trait-propulse { animation: none; } }
      `}</style>

      {/* Sol quadrillé en perspective, qui défile vers le spectateur */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] [perspective:420px]">
        <div
          className="sol-propulse absolute inset-x-[-50%] bottom-0 h-[220%] origin-bottom [transform:rotateX(72deg)]"
          style={{
            backgroundImage: 'linear-gradient(rgba(54,31,171,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(54,31,171,0.16) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'linear-gradient(to top, black 30%, transparent 95%)',
            WebkitMaskImage: 'linear-gradient(to top, black 30%, transparent 95%)',
          }}
        />
      </div>
      {/* Lignes colorées vers le point de fuite */}
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {LIGNES.map((l) => (
          <g key={l.c}>
            <line x1="50" y1="0" x2={l.x} y2="100" stroke={l.c} strokeOpacity="0.35" strokeWidth="0.25" vectorEffect="non-scaling-stroke" />
            <line x1={l.x} y1="100" x2="50" y2="0" stroke={l.c} strokeWidth="2.5" vectorEffect="non-scaling-stroke" className="trait-propulse" pathLength={260} />
          </g>
        ))}
      </svg>
      {/* Lueur à l'horizon */}
      <div className="pointer-events-none absolute inset-x-0 top-[44%] h-24 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(234,66,253,0.18),transparent_70%)]" />

      <div className="relative flex h-[50%] flex-col items-center justify-end px-6 pb-10 text-center">
        <p className="!m-0 font-mono text-[12px] uppercase tracking-[0.28em] !text-[#6b6385]">Formalité propulsée</p>
        <h2 id="titre-propulsee" className="!m-0 mt-4 font-[Sora] !text-[clamp(1.8rem,4vw,2.8rem)] !font-semibold !leading-tight !text-[#241143]">
          Votre dossier file vers le Guichet unique…
        </h2>
        <p className="!m-0 mt-3 max-w-md font-mono text-[13px] !text-[#6b6385]">{libelle} · un formaliste Legaly vérifie et dépose. Vous pouvez fermer cette page : on s’occupe de la suite.</p>
        <button type="button" onClick={onFermer} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ff887b] px-5 py-2.5 text-sm font-semibold text-[#080331] shadow-[0_10px_24px_-10px_rgba(255,136,123,0.9)] hover:bg-[#ffaca3]">
          Voir mon dossier <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
