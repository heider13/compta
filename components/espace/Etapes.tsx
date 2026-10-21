'use client';

// Étapes de la formalité de l'entrepreneur, à gauche du chat (esprit NanoCorp) :
// numérotées, l'étape en cours mise en avant, les étapes faites cochées.

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ETAPES_ENTREPRENEUR = ['Votre projet', 'Paiement', 'Documents', 'Annonce légale', 'Signature', 'Dépôt au Guichet unique'] as const;

export function Etapes({ faites, courante }: { faites: boolean[]; courante: number }) {
  return (
    <nav aria-label="Étapes de votre formalité" className="space-y-1.5">
      {ETAPES_ENTREPRENEUR.map((e, i) => {
        const fait = faites[i];
        const actif = i === courante;
        return (
          <div
            key={e}
            aria-current={actif ? 'step' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-300',
              actif ? 'bg-white shadow-[0_6px_18px_rgba(54,31,171,0.10)] ring-1 ring-[#e4dcff]' : '',
            )}
          >
            <span
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors duration-300',
                fait ? 'bg-emerald-100 text-emerald-700' : actif ? 'bg-gradient-to-br from-[#361fab] to-[#7551e8] text-white' : 'border border-[#e4dcff] text-[#a59fc0]',
              )}
            >
              {fait ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn('text-sm', actif ? 'font-semibold text-[#241143]' : fait ? 'text-[#3d3558]' : 'text-[#8a83a3]')}>{e}</span>
          </div>
        );
      })}
    </nav>
  );
}
