// Bandeau confiance / distinctions — façon Brevo (badges G2, notes, agréments).
// Ici : agréments et certifications propres au métier des formalités juridiques.

import { Star, ShieldCheck, Landmark, Lock } from 'lucide-react';
import { Container } from './ui';

const BADGES = [
  { icon: Landmark, label: 'Mandataire INPI agréé', sub: 'Guichet Unique' },
  { icon: ShieldCheck, label: 'ISO 27001', sub: 'Sécurité des données' },
  { icon: Lock, label: 'RGPD', sub: 'Hébergement en France' },
  { icon: Star, label: '4,8/5', sub: 'Satisfaction cabinets' },
];

export function Awards() {
  return (
    <section className="border-b border-[var(--ink-100)] py-12">
      <Container>
        <p className="mb-8 text-center text-sm font-semibold uppercase tracking-wide text-[var(--ink-500)]">
          La confiance des cabinets, la rigueur des institutions
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {BADGES.map((b) => (
            <div
              key={b.label}
              className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--ink-150)] bg-white px-4 py-6 text-center"
            >
              <b.icon className="size-6 text-[var(--accent-ink)]" />
              <span className="font-[Sora] text-base font-semibold text-[var(--violet-900)]">
                {b.label}
              </span>
              <span className="text-xs text-[var(--ink-500)]">{b.sub}</span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
