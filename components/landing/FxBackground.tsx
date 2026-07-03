// Couche d'effets de fond animés — pur CSS (voir globals.css .fx-*).
// Orbes lumineuses dérivantes (corail/indigo/magenta), ligne de scan,
// particules flottantes. pointer-events: none, aria-hidden : purement
// décoratif, sans impact sur l'interaction ni l'accessibilité.

const PARTICLES: Array<{ left: string; delay: string; variant?: string }> = [
  { left: '8%', delay: '0s' },
  { left: '18%', delay: '3.5s', variant: 'coral' },
  { left: '31%', delay: '7s', variant: 'magenta' },
  { left: '44%', delay: '1.8s' },
  { left: '57%', delay: '5.2s', variant: 'coral' },
  { left: '69%', delay: '9s' },
  { left: '81%', delay: '2.6s', variant: 'magenta' },
  { left: '92%', delay: '6.4s', variant: 'coral' },
];

export function FxBackground({ scanline = true }: { scanline?: boolean }) {
  return (
    <div className="fx-layer" aria-hidden="true">
      <span className="fx-orb o1" />
      <span className="fx-orb o2" />
      <span className="fx-orb o3" />
      {scanline && <span className="fx-scanline" />}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className={`fx-particle${p.variant ? ` ${p.variant}` : ''}`}
          style={{ left: p.left, animationDelay: p.delay }}
        />
      ))}
    </div>
  );
}
