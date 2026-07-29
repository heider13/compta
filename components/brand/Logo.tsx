// Marque Legaly AI — monogramme juridique : un « L » monumental blanc dont le
// montant sert de pilier à une balance de la justice (fléau + plateaux corail),
// posé dans une tuile violette dégradée. Wordmark « Legaly AI », L capital
// corail — le L et le AI en corail se lisent ensemble : « L…AI » (l'IA).

import { cn } from '@/lib/utils';

// Pastille seule (favicon, avatars, petites surfaces).
export function LogoMark({
  size = 28,
  onDark = false,
  className,
}: {
  size?: number;
  onDark?: boolean;
  className?: string;
}) {
  // La tuile dégradée fonctionne telle quelle sur fond clair comme sombre ;
  // onDark éclaircit légèrement le dégradé pour garder du relief sur les
  // surfaces très sombres (sidebar, footer).
  const from = onDark ? '#7551e8' : '#5b36d6';
  const to = onDark ? '#957af5' : '#7551e8';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="legaly-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#legaly-tile)" />
      {/* Balance de la justice : fléau, suspentes et plateaux en coupelle (corail) */}
      <rect x="15" y="14" width="34" height="4" rx="2" fill="#ff887b" />
      <rect x="17.2" y="18" width="1.6" height="5" fill="#ff887b" />
      <rect x="45.2" y="18" width="1.6" height="5" fill="#ff887b" />
      <path d="M12 23 A 6 6 0 0 0 24 23 Z" fill="#ff887b" />
      <path d="M40 23 A 6 6 0 0 0 52 23 Z" fill="#ff887b" />
      {/* L monumental (blanc) — son montant est le pilier de la balance */}
      <rect x="28" y="14" width="8" height="34" rx="2" fill="#ffffff" />
      <rect x="28" y="40" width="21" height="8" rx="2" fill="#ffffff" />
    </svg>
  );
}

// Logo complet : pastille + wordmark « Legaly AI » (L capital marqué).
export function Logo({
  size = 26,
  onDark = false,
  className,
  textClassName,
}: {
  size?: number;
  onDark?: boolean;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={size} onDark={onDark} />
      <span
        className={cn(
          'font-semibold leading-none tracking-tight',
          onDark ? 'text-white' : 'text-[#2b1769]',
          textClassName,
        )}
      >
        <span className="font-bold text-[#ff887b]">L</span>egaly&nbsp;
        <span className="font-bold text-[#ff887b]">AI</span>
      </span>
    </span>
  );
}
