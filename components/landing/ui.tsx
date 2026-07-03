// Atomes partagés de la landing — Tailwind, thème piloté par les CSS vars
// du wrapper .landing-theme (indigo/corail, voir globals.css).

import { cn } from '@/lib/utils';

export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-5 sm:px-8', className)}>
      {children}
    </div>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-[var(--ink-150)] bg-white/80 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[var(--ink-600)]',
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />
      {children}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
}) {
  return (
    <div className="mx-auto mb-14 flex max-w-2xl flex-col items-center gap-4 text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-3xl leading-[1.12] tracking-tight sm:text-4xl lg:text-[44px]">
        {title}
      </h2>
      {lead && <p className="text-base leading-relaxed text-[var(--ink-600)] sm:text-lg">{lead}</p>}
    </div>
  );
}

// Boutons pill du thème legit — corail plein / fantôme.
export const btnCta =
  'inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-[15px] font-semibold text-[#080331] shadow-[0_10px_28px_rgba(255,136,123,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#ffaca3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]';

export const btnCtaSm =
  'inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#080331] transition-all duration-200 hover:bg-[#ffaca3]';

export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-full border border-[var(--ink-200)] bg-white/70 px-6 py-3 text-[15px] font-medium text-[var(--ink-900)] transition-colors duration-200 hover:border-[var(--ink-300)] hover:bg-[var(--ink-50)]';

export const btnGhostSm =
  'inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--ink-200)] px-4 py-2 text-sm font-medium text-[var(--ink-900)] transition-colors duration-200 hover:border-[var(--ink-300)] hover:bg-[var(--ink-50)]';
