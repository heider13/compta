// Marque Legaly AI — logo inspiré du langage Pennylane (anneau circulaire
// contenant deux disques qui se chevauchent), transposé dans notre identité :
// disque corail (le cabinet) + disque violet (l'agent IA) qui se rejoignent,
// cerclés d'un anneau violet profond. Wordmark bas-de-casse « legaly » + AI.

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
  const ring = onDark ? '#ffffff' : '#2b1769';
  const coral = '#ff887b';
  const violet = onDark ? '#957af5' : '#5b36d6';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="32" cy="32" r="28" stroke={ring} strokeWidth="7" />
      {/* disque corail (gauche) puis disque violet par-dessus — le
          chevauchement lit violet, comme l'éclipse du logo Pennylane */}
      <circle cx="25.5" cy="32" r="11.5" fill={coral} />
      <circle cx="38.5" cy="32" r="11.5" fill={violet} />
    </svg>
  );
}

// Logo complet : pastille + wordmark « legaly AI ».
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
        legaly&nbsp;<span className="text-[#ff887b]">AI</span>
      </span>
    </span>
  );
}
