import { Building2, PencilLine, PowerOff, ShieldCheck, Check } from 'lucide-react';
import { Container, SectionHead } from './ui';
import { Reveal } from './Reveal';

const TYPES = [
  {
    group: 'Création',
    icon: Building2,
    items: ['Auto-entreprise', 'SASU', 'SAS', 'EURL', 'SARL', 'SCI', 'Holding'],
  },
  {
    group: 'Modification',
    icon: PencilLine,
    items: [
      'Transfert de siège',
      'Changement de dirigeant',
      'Augmentation de capital',
      "Changement d'objet social",
      'Modification de dénomination',
    ],
  },
  {
    group: 'Cessation',
    icon: PowerOff,
    items: ['Dissolution', 'Liquidation amiable', 'Radiation auto-entrepreneur', "Cessation d'activité"],
  },
  {
    group: 'Conformité',
    icon: ShieldCheck,
    items: ['Dépôt des bénéficiaires effectifs', 'Dépôt des comptes annuels'],
  },
];

export function FormalityTypes() {
  return (
    <section id="formalites" className="scroll-mt-20 border-b border-[var(--ink-100)] bg-white py-20 sm:py-24">
      <Container>
        <SectionHead
          eyebrow="Formalités couvertes"
          title={
            <>
              Toutes les formalités INPI,
              <br />
              en un seul endroit.
            </>
          }
          lead={
            <>
              Legaly AI couvre l&apos;intégralité du cycle de vie des sociétés françaises
              disponibles via le Guichet Unique. Aucune dépendance à des outils tiers.
            </>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TYPES.map((g, i) => {
            const coral = i % 2 === 0;
            return (
              <Reveal key={g.group} delay={i * 80}>
                <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--ink-150)] bg-white transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[0_18px_44px_rgba(43,23,105,0.12)]">
                  {/* Bandeau d'en-tête coloré */}
                  <div
                    className={
                      'flex items-center justify-between gap-3 px-6 pb-4 pt-6 ' +
                      (coral ? 'bg-[var(--accent-soft)]' : 'bg-[var(--violet-100)]')
                    }
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={
                          'grid size-10 place-items-center rounded-xl bg-white shadow-sm ' +
                          (coral ? 'text-[var(--accent-ink)]' : 'text-[var(--violet-700)]')
                        }
                      >
                        <g.icon className="size-5" />
                      </span>
                      <h3 className="font-[Sora] text-lg font-semibold text-[var(--violet-900)]">
                        {g.group}
                      </h3>
                    </div>
                    <span
                      className={
                        'rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold ' +
                        (coral ? 'text-[var(--accent-ink)]' : 'text-[var(--violet-700)]')
                      }
                    >
                      {g.items.length}
                    </span>
                  </div>

                  {/* Liste */}
                  <ul className="grid gap-2.5 px-6 py-5">
                    {g.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-[var(--ink-700)]">
                        <span
                          className={
                            'mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full ' +
                            (coral
                              ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                              : 'bg-[var(--violet-100)] text-[var(--violet-700)]')
                          }
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
        <p className="mt-8 text-center text-[13px] text-[var(--ink-500)]">
          Toute formalité disponible via l&apos;API INPI Guichet Unique est intégrable. Hors associations.
        </p>
      </Container>
    </section>
  );
}
