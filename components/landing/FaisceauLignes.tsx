// Fond du hero (esprit Lovable) : un faisceau de fines courbes qui partent d'un même
// point sous le chat et s'ouvrent vers le haut et les côtés ; des traits aux couleurs
// Legaly filent le long de certaines lignes, comme des dossiers qui partent.
// Pur SVG + CSS (stroke-dashoffset) ; figé si l'animation est réduite.

const W = 1600;
const H = 900;
const OX = W / 2;
const OY = H - 10; // point de départ, en bas au centre
const N = 3;

const COULEURS = ['#ff887b', '#ea42fd', '#361fab', '#ffbe8c', '#9d6cf2', '#ff5f9e'];

// Courbe i : monte d'abord à la verticale puis s'ouvre vers son point d'arrivée
const COURBES = Array.from({ length: N }, (_, i) => {
  const a = Math.PI * (0.22 + (0.56 * i) / (N - 1)); // éventail : droite, centre, gauche
  const portee = 1180 + (i % 3) * 90;
  const ex = OX + Math.cos(a) * portee * 1.15;
  const ey = OY - Math.sin(a) * portee;
  const d = `M${OX},${OY} C${OX},${OY - 330} ${OX + (ex - OX) * 0.35},${OY - 520} ${ex.toFixed(1)},${ey.toFixed(1)}`;
  return { d, i };
});

// Traits colorés : quelques courbes, durées et départs décalés
const TRAITS = [0, 1, 2].map((i, k) => ({
  d: COURBES[i].d,
  couleur: COULEURS[k % COULEURS.length],
  duree: 5.5 + (k % 4) * 1.4,
  delai: -((k * 1.7) % 7),
}));

export function FaisceauLignes({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={className}>
      <style>{`
        @keyframes faisceau-file { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: -140; } }
        .faisceau-trait { stroke-dasharray: 140 1000; animation: faisceau-file linear infinite; }
        .faisceau-ligne { stroke: rgba(54, 31, 171, 0.11); }
        html[data-landing='dark'] .faisceau-ligne { stroke: rgba(201, 191, 255, 0.14); }
        @media (prefers-reduced-motion: reduce) { .faisceau-trait { animation: none; stroke-dashoffset: 420; } }
      `}</style>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className="size-full">
        <defs>
          <radialGradient id="faisceau-source" cx="50%" cy="100%" r="40%">
            <stop offset="0" stopColor="#9d6cf2" stopOpacity="0.35" />
            <stop offset="1" stopColor="#9d6cf2" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={OX} cy={OY} rx="260" ry="120" fill="url(#faisceau-source)" />
        {COURBES.map((c) => (
          <path key={c.i} d={c.d} fill="none" strokeWidth="1.2" className="faisceau-ligne" vectorEffect="non-scaling-stroke" />
        ))}
        {TRAITS.map((t, k) => (
          <path
            key={k}
            d={t.d}
            pathLength={1000}
            fill="none"
            stroke={t.couleur}
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="faisceau-trait" strokeOpacity={0.85}
            style={{ animationDuration: `${t.duree}s`, animationDelay: `${t.delai}s` }}
          />
        ))}
      </svg>
    </div>
  );
}
