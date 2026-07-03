// Bande de métriques produit sous le hero — inspirée des landing legaltech
// (chiffres courts + explication). Uniquement des faits produit vérifiables,
// pas de chiffres d'usage inventés.

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
    <section className="section-tight" style={{ borderBottom: '1px solid var(--ink-100)' }}>
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 24,
          }}
        >
          {METRICS.map((m) => (
            <div key={m.label} style={{ textAlign: 'center', padding: '8px 12px' }}>
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 600,
                  letterSpacing: '-0.03em',
                  color: 'var(--accent-ink)',
                  lineHeight: 1.1,
                }}
              >
                {m.value}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-900)', marginTop: 4 }}>
                {m.label}
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-500)', margin: '6px auto 0', maxWidth: 260 }}>
                {m.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
