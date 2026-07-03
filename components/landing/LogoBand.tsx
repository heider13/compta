// Bande "intégrations" sous le hero — style bande logos legaltech.
// On affiche les intégrations RÉELLES de la plateforme (pas de faux logos
// clients) : c'est vérifiable et ça rassure autant.

import { Container } from './ui';

const INTEGRATIONS = [
  'INPI Guichet Unique',
  'Registre National (RNE)',
  'Yousign — signature eIDAS',
  'Stripe',
  'Pappers',
  'API publique & webhooks',
];

export function LogoBand() {
  return (
    <section className="border-b border-[var(--ink-100)] bg-white">
      <Container>
        <p className="mt-5 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-400)]">
          Connecté à vos outils et registres officiels
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-7 opacity-80">
          {INTEGRATIONS.map((name) => (
            <span
              key={name}
              className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold tracking-wide text-[var(--ink-500)]"
            >
              <span
                aria-hidden="true"
                className="inline-block h-[7px] w-[7px] rounded-full bg-[var(--accent)]"
              />
              {name}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
