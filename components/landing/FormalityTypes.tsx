import { Check } from '@/components/icons';
import { Container, SectionHead } from './ui';

const TYPES = [
  {
    group: 'Création',
    items: ['Auto-entreprise', 'SASU', 'SAS', 'EURL', 'SARL', 'SCI', 'Holding'],
  },
  {
    group: 'Modification',
    items: [
      'Transfert de siège',
      'Changement de dirigeant',
      'Augmentation de capital',
      "Changement d'objet social",
      "Modification de dénomination",
    ],
  },
  {
    group: 'Cessation',
    items: [
      "Dissolution",
      'Liquidation amiable',
      'Radiation auto-entrepreneur',
      "Cessation d'activité",
    ],
  },
  {
    group: 'Conformité',
    items: ['Dépôt des bénéficiaires effectifs', 'Dépôt des comptes annuels'],
  },
];

export function FormalityTypes() {
  return (
    <section id="formalites" className="scroll-mt-20 py-20 sm:py-24">
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
              Compta couvre l&apos;intégralité du cycle de vie des sociétés françaises
              disponibles via le Guichet Unique. Aucune dépendance à des outils tiers.
            </>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TYPES.map((g) => (
            <div
              key={g.group}
              className="rounded-2xl border border-[var(--ink-150)] bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(8,3,49,0.08)]"
            >
              <h3 className="mb-4 text-lg font-semibold">{g.group}</h3>
              <ul className="grid gap-2.5">
                {g.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-[var(--ink-700)]">
                    <Check size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-7 text-center text-[13px] text-[var(--ink-500)]">
          Toute formalité disponible via l&apos;API INPI Guichet Unique est intégrable. Hors associations.
        </p>
      </Container>
    </section>
  );
}
