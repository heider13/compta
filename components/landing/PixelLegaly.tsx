// « LEGALY » qui s'écrit en pixels, en fond du hero (remplace le signe infini).
// Police bitmap 5×7 ; chaque pixel s'allume colonne par colonne (écriture de gauche
// à droite), reste affiché, puis s'efface dans le même sens, en boucle. Pur CSS
// (opacité + transform) : aucune boucle JS. Figé, mot entier, si l'animation est réduite.

const LETTRES: Record<string, string[]> = {
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  G: ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
};
const MOT = 'LEGALY';
const COLS = MOT.length * 6 - 1; // 5 colonnes par lettre + 1 d'espace
const CYCLE = 10; // secondes
const ECRITURE = 3.2; // durée pour écrire tout le mot

// Dégradé de la marque, de gauche à droite : indigo → rose → corail
function teinte(t: number) {
  const stops = [[54, 31, 171], [234, 66, 253], [255, 136, 123]];
  const x = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f));
  return `rgb(${c.join(',')})`;
}

const PIXELS = [...MOT].flatMap((lettre, li) =>
  LETTRES[lettre].flatMap((ligne, y) =>
    [...ligne].flatMap((bit, x) => (bit === '1' ? [{ x: li * 6 + x, y }] : [])),
  ),
);

export function PixelLegaly({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={className}>
      <style>{`
        @keyframes pixel-ecrit {
          0% { opacity: 0; transform: scale(0.4); }
          5% { opacity: 1; transform: scale(1.12); }
          8% { opacity: 1; transform: scale(1); }
          68% { opacity: 1; transform: scale(1); }
          76% { opacity: 0; transform: scale(0.6); }
          100% { opacity: 0; transform: scale(0.6); }
        }
        .pixel-legaly rect {
          transform-box: fill-box;
          transform-origin: center;
          animation: pixel-ecrit ${CYCLE}s cubic-bezier(0.3, 0.7, 0.4, 1) infinite backwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .pixel-legaly rect { animation: none; opacity: 1; }
        }
      `}</style>
      <svg viewBox={`-0.5 -0.5 ${COLS + 1} 8`} className="pixel-legaly size-full" preserveAspectRatio="xMidYMid meet">
        {PIXELS.map(({ x, y }) => (
          <rect
            key={`${x}-${y}`}
            x={x + 0.08}
            y={y + 0.08}
            width={0.84}
            height={0.84}
            rx={0.14}
            fill={teinte(x / (COLS - 1))}
            // Écriture colonne par colonne, avec un léger décalage par ligne
            style={{ animationDelay: `${((x / COLS) * ECRITURE + y * 0.025).toFixed(3)}s` }}
          />
        ))}
      </svg>
    </div>
  );
}
