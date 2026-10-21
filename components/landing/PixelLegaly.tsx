// « LEGALY » qui s'écrit en pixels, en fond du hero (remplace le signe infini).
// Police bitmap 5×7 ; chaque pixel s'allume colonne par colonne (écriture de gauche
// à droite), reste affiché, puis s'efface vite dans le même sens, en boucle. Pur CSS
// (opacité + transform) : aucune boucle JS. Figé, mot entier, si l'animation est réduite.
// L'écriture est portée par chaque <rect>, l'effacement (plus rapide) par son <g>.

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
const EFFACEMENT = 0.7; // durée pour effacer tout le mot (bien plus rapide)

// Dégradé riche des couleurs de la marque, en diagonale : indigo → violet → magenta → rose → corail → pêche
const STOPS = [[54, 31, 171], [157, 108, 242], [234, 66, 253], [255, 95, 158], [255, 136, 123], [255, 190, 140]];
function melange(t: number): number[] {
  const x = Math.max(0, Math.min(1, t)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x));
  const f = x - i;
  return STOPS[i].map((v, k) => Math.round(v + (STOPS[i + 1][k] - v) * f));
}
const rgb = (c: number[]) => `rgb(${c.join(',')})`;
const eclaircir = (c: number[], a: number) => c.map((v) => Math.round(v + (255 - v) * a));

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
          /* masqué juste après l'effacement du groupe : pas de réapparition en fin de cycle */
          69.9% { opacity: 1; transform: scale(1); }
          70%, 100% { opacity: 0; transform: scale(1); }
        }
        @keyframes pixel-efface {
          0%, 66% { opacity: 1; transform: scale(1); }
          69%, 100% { opacity: 0; transform: scale(0.25); }
        }
        .pixel-legaly rect, .pixel-legaly g {
          transform-box: fill-box;
          transform-origin: center;
        }
        .pixel-legaly rect { animation: pixel-ecrit ${CYCLE}s cubic-bezier(0.3, 0.7, 0.4, 1) infinite backwards; }
        .pixel-legaly g { animation: pixel-efface ${CYCLE}s ease-in infinite backwards; }
        @media (prefers-reduced-motion: reduce) {
          .pixel-legaly rect, .pixel-legaly g { animation: none; opacity: 1; }
        }
      `}</style>
      <svg viewBox={`-0.5 -0.5 ${COLS + 1} 8`} className="pixel-legaly size-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          {PIXELS.map(({ x, y }) => {
            // Teinte en diagonale (surtout de gauche à droite, un peu de haut en bas)
            const c = melange((x / (COLS - 1)) * 0.82 + (y / 6) * 0.18);
            return (
              <linearGradient key={`${x}-${y}`} id={`px-${x}-${y}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={rgb(eclaircir(c, 0.38))} />
                <stop offset="1" stopColor={rgb(c)} />
              </linearGradient>
            );
          })}
        </defs>
        {PIXELS.map(({ x, y }) => (
          // Effacement rapide (groupe), écriture colonne par colonne (carré)
          <g key={`${x}-${y}`} style={{ animationDelay: `${((x / COLS) * EFFACEMENT).toFixed(3)}s` }}>
            <rect
              x={x + 0.08}
              y={y + 0.08}
              width={0.84}
              height={0.84}
              rx={0.14}
              fill={`url(#px-${x}-${y})`}
              style={{ animationDelay: `${((x / COLS) * ECRITURE + y * 0.025).toFixed(3)}s` }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
