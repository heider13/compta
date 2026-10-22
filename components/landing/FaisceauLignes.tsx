// Fond du hero (esprit Lovable) : des tuiles flottantes autour du titre — logos
// officiels INPI, RNE, Légifrance, Insee, Yousign, et les formalités en lot — chacune reliée
// par une fine courbe au point de départ, sous le chat. Des traits aux couleurs
// Legaly filent le long des lignes. Tuiles masquées sur petit écran.
// Les lignes sont calculées à la taille réelle de la zone (traits nets, sans déformation).

'use client';

import { useEffect, useRef, useState } from 'react';
import { Layers } from 'lucide-react';

type Tuile = { cle: string; x: number; y: number; rot: number; couleur: string; large?: boolean; contenu: React.ReactNode };

// Logos officiels (public/logos : INPI depuis inpi.fr, les autres depuis Wikimedia Commons — crédits dans le pied de page)
const Logo = ({ src, alt, h = 30 }: { src: string; alt: string; h?: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={alt} style={{ height: h }} className="w-auto max-w-[104px] object-contain" />
);

// Positions en % de la zone (x, y) ; le point de départ est en bas au centre (50 %, 100 %)
const TUILES: Tuile[] = [
  { cle: 'inpi', x: 11, y: 30, rot: -6, couleur: '#361fab', large: true, contenu: <Logo src="/logos/inpi.svg" alt="INPI" h={42} /> },
  {
    cle: 'rne', x: 18, y: 53, rot: 4, couleur: '#ea42fd', large: true,
    contenu: (
      <span className="grid place-items-center gap-1">
        <Logo src="/logos/inpi.svg" alt="INPI" h={26} />
        <span className="text-[8px] font-semibold uppercase leading-tight tracking-wide text-[#3d3558]">Registre national<br />des entreprises</span>
      </span>
    ),
  },
  { cle: 'lots', x: 10, y: 76, rot: -4, couleur: '#ff887b', contenu: <Layers className="size-8 text-[#361fab]" strokeWidth={2.2} /> },
  { cle: 'legifrance', x: 88, y: 28, rot: 5, couleur: '#9d6cf2', large: true, contenu: <Logo src="/logos/legifrance.jpg" alt="Légifrance" h={34} /> },
  { cle: 'insee', x: 82, y: 51, rot: -5, couleur: '#ffbe8c', large: true, contenu: <Logo src="/logos/insee.png" alt="Insee" h={34} /> },
  { cle: 'yousign', x: 89, y: 74, rot: 4, couleur: '#ff5f9e', large: true, contenu: <Logo src="/logos/yousign.png" alt="Yousign" h={22} /> },
];

// Courbe en pixels : part du bas au centre, monte d'abord à la verticale puis rejoint la tuile
function courbe(t: Tuile, w: number, h: number) {
  const ox = w / 2, oy = h;
  const x = (t.x / 100) * w, y = (t.y / 100) * h;
  return `M${ox},${oy} C${ox},${oy - h * 0.38} ${ox + (x - ox) * 0.35},${y + h * 0.22} ${x},${y}`;
}

export function FaisceauLignes({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [taille, setTaille] = useState({ w: 1440, h: 760 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setTaille({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { w, h } = taille;
  return (
    <div ref={ref} aria-hidden="true" className={className}>
      <style>{`
        @keyframes faisceau-file { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: -160; } }
        @keyframes tuile-flotte { 0%, 100% { transform: translate(-50%, -50%) rotate(var(--rot)) translateY(0); } 50% { transform: translate(-50%, -50%) rotate(var(--rot)) translateY(-6px); } }
        .faisceau-trait { stroke-dasharray: 160 1000; animation: faisceau-file linear infinite; }
        .faisceau-ligne { stroke: rgba(54, 31, 171, 0.14); }
        html[data-landing='dark'] .faisceau-ligne { stroke: rgba(201, 191, 255, 0.16); }
        .tuile-flottante { transform: translate(-50%, -50%) rotate(var(--rot)); animation: tuile-flotte 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .faisceau-trait, .tuile-flottante { animation: none; } .faisceau-trait { stroke-dashoffset: 420; } }
      `}</style>
      <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 size-full">
        {TUILES.map((t) => (
          <path key={t.cle} d={courbe(t, w, h)} fill="none" strokeWidth="1.2" className="faisceau-ligne" />
        ))}
        {TUILES.map((t, k) => (
          <path
            key={`${t.cle}-trait`}
            d={courbe(t, w, h)}
            pathLength={1000}
            fill="none"
            stroke={t.couleur}
            strokeWidth="2"
            strokeLinecap="round"
            strokeOpacity={0.9}
           
            className="faisceau-trait"
            style={{ animationDuration: `${5 + (k % 3) * 1.3}s`, animationDelay: `${-k * 1.6}s` }}
          />
        ))}
      </svg>
      {/* Tuiles (grand écran seulement : elles chevaucheraient le titre sur mobile) */}
      {TUILES.map((t, k) => (
        <span
          key={t.cle}
          className={`theme-fixe tuile-flottante absolute hidden place-items-center rounded-[20px] bg-white shadow-[0_14px_34px_rgba(8,3,49,0.14)] ring-1 ring-[#080331]/[0.06] xl:grid ${t.large ? 'h-[70px] w-[128px] px-3' : 'size-[74px]'}`}
          style={{ left: `${t.x}%`, top: `${t.y}%`, ['--rot' as string]: `${t.rot}deg`, animationDelay: `${-k * 1.1}s` }}
        >
          {t.contenu}
        </span>
      ))}
    </div>
  );
}
