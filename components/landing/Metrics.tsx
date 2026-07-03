// Bande de métriques produit sous le hero — inspirée des landing legaltech
// (chiffres courts + explication). Uniquement des faits produit vérifiables,
// pas de chiffres d'usage inventés.

import { Container } from './ui';

const METRICS = [
  {
    value: '90 %',
    label: 'de champs préremplis',
    detail: "OCR de la pièce d'identité + lecture SIREN au registre national",
  },
  {
    value: '15-20 min',
    label: 'gagnées par dossier',
    detail: 'Questionnaire interactif, zéro ressaisie entre vos outils et le Guichet Unique',
  },
  {
    value: '11',
    label: 'types de formalités',
    detail: 'Créations (AE → holding), modifications, cessations, BE, comptes annuels',
  },
  {
    value: '100 %',
    label: 'Guichet Unique INPI',
    detail: 'Dépôt via l’API officielle, statuts synchronisés en temps réel',
  },
];

export function Metrics() {
  return (
    <section className="border-b border-[var(--ink-100)] py-14">
      <Container>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {METRICS.map((m) => (
            <div key={m.label} className="px-2 text-center">
              <div className="font-[Sora] text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--accent-ink)] sm:text-[40px]">
                {m.value}
              </div>
              <div className="mt-1 text-[15px] font-semibold text-[var(--ink-900)]">{m.label}</div>
              <p className="mx-auto mt-1.5 max-w-[260px] text-[13px] leading-relaxed text-[var(--ink-500)]">
                {m.detail}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
