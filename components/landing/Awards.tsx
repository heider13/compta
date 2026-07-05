// Bandeau confiance / conformité — façon Brevo « Made in Europe ».
// Identité maison : indigo/violet profond + accent corail (aucun vert).

import { Landmark, ShieldCheck, Lock, Star } from 'lucide-react';
import { Container } from './ui';
import { Reveal } from './Reveal';

const BADGES = [
  { icon: Landmark, label: 'Mandataire INPI agréé', sub: 'Guichet Unique' },
  { icon: ShieldCheck, label: 'ISO 27001', sub: 'Sécurité des données' },
  { icon: Lock, label: 'RGPD', sub: 'Hébergement France' },
  { icon: Star, label: '4,8/5', sub: 'Satisfaction cabinets' },
];

export function Awards() {
  return (
    <section className="bg-[var(--violet-900)] py-16 sm:py-20">
      <Container>
        <Reveal>
          <h2 className="text-center font-[Sora] text-2xl font-bold text-white sm:text-3xl">
            Conçu en France. Hébergé en France.
            <br />
            Conforme, nativement.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-white/70">
            La confiance des cabinets, la rigueur des institutions. Vos données
            restent en France, la plateforme est agréée pour dialoguer avec le
            Guichet Unique INPI.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {BADGES.map((b, i) => (
            <Reveal key={b.label} delay={i * 80}>
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-6 text-center">
                <b.icon className="size-6 text-[var(--accent)]" />
                <span className="font-[Sora] text-base font-semibold text-white">
                  {b.label}
                </span>
                <span className="text-white/60">{b.sub}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
