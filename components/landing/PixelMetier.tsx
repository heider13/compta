// Icônes en pixels des métiers (menu Solutions) : grille 9×9, dégradé de la marque
// en diagonale (indigo → magenta → corail), même esprit que « LEGALY » en pixels.

const ICONES: Record<string, string[]> = {
  // Fusée : lancer son entreprise
  'independants-tpe': [
    '....#....',
    '...###...',
    '...#.#...',
    '...###...',
    '..#####..',
    '..#####..',
    '.##.#.##.',
    '.#..#..#.',
    '...#.#...',
  ],
  // Calculatrice : le chiffre
  'experts-comptables': [
    '.#######.',
    '.#.....#.',
    '.#######.',
    '.#.#.#.#.',
    '.#######.',
    '.#.#.#.#.',
    '.#######.',
    '.#.#.#.#.',
    '.#######.',
  ],
  // Balance : le droit
  avocats: [
    '....#....',
    '.#######.',
    '.#..#..#.',
    '#.#.#.#.#',
    '#.#.#.#.#',
    '###.#.###',
    '....#....',
    '...###...',
    '.#######.',
  ],
  // Immeuble : le groupe et ses filiales
  'directions-juridiques': [
    '..#####..',
    '..#.#.#..',
    '..#####..',
    '#########',
    '#.#.#.#.#',
    '#########',
    '#.#.#.#.#',
    '#########',
    '###...###',
  ],
};

const STOPS = [[54, 31, 171], [157, 108, 242], [234, 66, 253], [255, 95, 158], [255, 136, 123]];
function teinte(t: number) {
  const x = Math.max(0, Math.min(1, t)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x));
  const f = x - i;
  return `rgb(${STOPS[i].map((v, k) => Math.round(v + (STOPS[i + 1][k] - v) * f)).join(',')})`;
}

export function PixelMetier({ metier, className }: { metier: string; className?: string }) {
  const grille = ICONES[metier];
  if (!grille) return null;
  return (
    <svg viewBox="0 0 9 9" className={className} aria-hidden="true" shapeRendering="crispEdges">
      {grille.flatMap((ligne, y) =>
        [...ligne].map((c, x) =>
          c === '#' ? <rect key={`${x}-${y}`} x={x + 0.06} y={y + 0.06} width={0.88} height={0.88} rx={0.12} fill={teinte((x + y) / 16)} /> : null,
        ),
      )}
    </svg>
  );
}
