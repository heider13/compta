// Palette « vivante » de la landing : teintes maison (violet, magenta, corail,
// pêche) déclinées pour les cartes, fonds et mots en dégradé.

import { cn } from '@/lib/utils';

export const TEINTES = [
  { nom: 'violet', fond: 'var(--teinte-violet, #efe9ff)', fort: '#7551e8', texte: '#4a2bc4', ombre: 'rgba(117,81,232,0.35)' },
  { nom: 'magenta', fond: 'var(--teinte-magenta, #fde8fb)', fort: '#ea42fd', texte: '#a21caf', ombre: 'rgba(234,66,253,0.32)' },
  { nom: 'corail', fond: 'var(--teinte-corail, #ffeae6)', fort: '#ff887b', texte: '#d0412f', ombre: 'rgba(255,136,123,0.38)' },
  { nom: 'peche', fond: 'var(--teinte-peche, #fff1e4)', fort: '#ffbe8c', texte: '#c2410c', ombre: 'rgba(255,190,140,0.45)' },
] as const;

export const teinte = (i: number) => TEINTES[i % TEINTES.length];

export const DEGRADE = 'linear-gradient(90deg, #ffbe8c 0%, #ff887b 35%, #ea42fd 70%, #7551e8 100%)';

export function Degrade({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('bg-gradient-to-r from-[#ff887b] via-[#ea42fd] to-[#7551e8] bg-clip-text text-transparent', className)}>{children}</span>;
}

// Masque qui estompe un calque en haut et en bas de sa section
export const FONDU_VERTICAL = 'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)';

// Fond d'une section sombre qui se fond dans les sections voisines (couleurs de bord)
// Le fondu passe par des violets (lavande puis violet profond) pour ne jamais tirer sur le gris.
export function fondSombre(couleur: string, avant: string, apres: string, zone = 240) {
  const z = (f: number) => `${Math.round(zone * f)}px`;
  return `linear-gradient(to bottom, ${avant} 0px, #efe4ff ${z(0.2)}, #a98be8 ${z(0.45)}, #4b2a8f ${z(0.72)}, ${couleur} ${zone}px, ` +
    `${couleur} calc(100% - ${zone}px), #4b2a8f calc(100% - ${z(0.72)}), #a98be8 calc(100% - ${z(0.45)}), #efe4ff calc(100% - ${z(0.2)}), ${apres} 100%)`;
}

// Halos colorés flous en fond de section
export function Halos({ variante = 'clair' }: { variante?: 'clair' | 'sombre' }) {
  const a = variante === 'sombre' ? 0.45 : 0.22;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        maskImage: FONDU_VERTICAL,
        WebkitMaskImage: FONDU_VERTICAL,
        background:
          `radial-gradient(ellipse 620px 420px at 6% 8%, rgba(255,190,140,${a}), transparent 62%),` +
          `radial-gradient(ellipse 720px 520px at 92% 18%, rgba(234,66,253,${a * 0.8}), transparent 62%),` +
          `radial-gradient(ellipse 760px 520px at 50% 110%, rgba(117,81,232,${a}), transparent 65%)`,
      }}
    />
  );
}
