'use client';

// Boîte de saisie des héros (esprit Lovable) : grands arrondis, saisie aérée, bouton
// « + » rond à gauche, mode et envoi à droite ; l'envoi s'allume dès qu'on écrit.
// Un halo flou aux couleurs Legaly éclaire la boîte par-derrière.

import { ArrowUp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BoiteChat({
  value, onChange, onSubmit, placeholder, ariaLabel, mode = 'Agent formalités', onFocus, onBlur, maxLength, className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  ariaLabel: string;
  mode?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  maxLength?: number;
  className?: string;
}) {
  const plein = value.trim().length > 0;
  return (
    <div className={cn('relative', className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-10 -inset-y-8 rounded-[48px] opacity-70 blur-3xl"
        style={{ background: 'radial-gradient(ellipse 50% 60% at 18% 60%, rgba(117,81,232,0.45), transparent 70%), radial-gradient(ellipse 45% 60% at 82% 40%, rgba(234,66,253,0.32), transparent 70%), radial-gradient(ellipse 40% 50% at 50% 100%, rgba(255,136,123,0.35), transparent 70%)' }}
      />
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="relative rounded-[28px] border border-[#080331]/[0.08] bg-white text-left shadow-[0_12px_40px_rgba(43,23,105,0.12)] transition-shadow focus-within:shadow-[0_16px_50px_rgba(54,31,171,0.20)]"
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
          rows={2}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="block w-full resize-none rounded-t-[28px] bg-transparent px-6 pt-5 text-[16px] leading-relaxed text-[var(--violet-900)] outline-none placeholder:text-[var(--ink-400)]"
        />
        <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-1">
          <span
            title="Pièces d’identité, PV d’AG, statuts, annonces…"
            className="grid size-9 place-items-center rounded-full border border-[#080331]/10 text-[var(--ink-500)] transition-colors hover:bg-[var(--ink-50)]"
          >
            <Plus className="size-[18px]" strokeWidth={1.75} />
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden text-[14px] text-[var(--ink-500)] sm:inline">{mode}</span>
            <button
              type="submit"
              aria-label="Envoyer"
              className={cn(
                'grid size-9 place-items-center rounded-full transition-all duration-300',
                plein
                  ? 'bg-gradient-to-br from-[#7551e8] via-[#c13ad6] to-[#ff887b] text-white shadow-[0_8px_20px_rgba(193,58,214,0.35)]'
                  : 'bg-[#080331]/[0.06] text-[var(--ink-400)]',
              )}
            >
              <ArrowUp className="size-[18px]" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
