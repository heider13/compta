// Marque Legaly AI — un « L » formé de deux pans, comme un livre ouvert vu de
// profil : pan vertical violet (dégradé lilas → violet nuit) et pan incliné
// rose → pêche. Wordmark « Legaly » violet nuit, « AI » en dégradé rose → pêche.

import { useId } from 'react';
import { cn } from '@/lib/utils';

export const BRAND = {
  violetFrom: '#9d6cf2',
  violetTo: '#3b1a8f',
  pinkFrom: '#ff5f9e',
  peachTo: '#ffad7a',
  ink: '#241143',
};

// Symbole seul (favicon, avatars, petites surfaces).
export function LogoMark({
  size = 28,
  onDark = false,
  className,
}: {
  size?: number;
  onDark?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  // Sur fond très sombre, le bas du pan violet remonte un peu pour garder le contraste.
  const violetTo = onDark ? '#5b36d6' : BRAND.violetTo;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={`${id}-v`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={BRAND.violetFrom} />
          <stop offset="1" stopColor={violetTo} />
        </linearGradient>
        <linearGradient id={`${id}-p`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={BRAND.pinkFrom} />
          <stop offset="1" stopColor={BRAND.peachTo} />
        </linearGradient>
      </defs>
      {/* Pan vertical (dos du livre) */}
      <path
        d="M11 12 L32 4 L32 50 L11 59 Z"
        fill={`url(#${id}-v)`}
        stroke={`url(#${id}-v)`}
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      {/* Pan incliné (page qui s'ouvre) */}
      <path
        d="M19 45 Q19 42 22 41 L52 30 L52 44 L24 56 Q19 58 19 53 Z"
        fill={`url(#${id}-p)`}
        stroke={`url(#${id}-p)`}
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Logo complet : symbole + wordmark « Legaly AI ».
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
          'font-[Sora] font-bold leading-none tracking-tight',
          onDark ? 'text-white' : 'text-[#241143]',
          textClassName,
        )}
      >
        Legaly{' '}
        <span className="bg-gradient-to-r from-[#ff5f9e] to-[#ffad7a] bg-clip-text text-transparent">AI</span>
      </span>
    </span>
  );
}
