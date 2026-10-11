// Palette « vivante » de la landing : teintes maison (violet, magenta, corail,
// pêche) déclinées pour les cartes, fonds et mots en dégradé.

import { cn } from '@/lib/utils';

export const TEINTES = [
  { nom: 'violet', fond: '#efe9ff', fort: '#7551e8', texte: '#4a2bc4', ombre: 'rgba(117,81,232,0.35)' },
  { nom: 'magenta', fond: '#fde8fb', fort: '#ea42fd', texte: '#a21caf', ombre: 'rgba(234,66,253,0.32)' },
  { nom: 'corail', fond: '#ffeae6', fort: '#ff887b', texte: '#d0412f', ombre: 'rgba(255,136,123,0.38)' },
  { nom: 'peche', fond: '#fff1e4', fort: '#ffbe8c', texte: '#c2410c', ombre: 'rgba(255,190,140,0.45)' },
] as const;

export const teinte = (i: number) => TEINTES[i % TEINTES.length];

export const DEGRADE = 'linear-gradient(90deg, #ffbe8c 0%, #ff887b 35%, #ea42fd 70%, #7551e8 100%)';

export function Degrade({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('bg-gradient-to-r from-[#ff887b] via-[#ea42fd] to-[#7551e8] bg-clip-text text-transparent', className)}>{children}</span>;
}

// Masque qui estompe un calque en haut et en bas de sa section
export const FONDU_VERTICAL = 'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)';

// Fond d'une section sombre qui se fond dans les sections voisines (couleurs de bord)
export function fondSombre(couleur: string, avant: string, apres: string, zone = 180) {
  return `linear-gradient(to bottom, ${avant} 0px, ${couleur} ${zone}px, ${couleur} calc(100% - ${zone}px), ${apres} 100%)`;
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
