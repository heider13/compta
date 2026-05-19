import { Check } from '@/components/icons';

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
    <section id="formalites" className="section">
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow"><span className="dot" />Formalités couvertes</span>
          <h2>Toutes les formalités INPI,<br />en un seul endroit.</h2>
          <p className="lead">
            Compta couvre l&apos;intégralité du cycle de vie des sociétés françaises
            disponibles via le Guichet Unique. Aucune dépendance à des outils tiers.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {TYPES.map((g) => (
            <div key={g.group} className="card" style={{ padding: 26, background: 'white' }}>
              <h3 style={{ fontSize: 18, marginBottom: 16 }}>{g.group}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                {g.items.map((item) => (
                  <li
                    key={item}
                    style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'var(--ink-700)' }}
                  >
                    <Check size={16} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: 'var(--ink-500)' }}>
          Toute formalité disponible via l&apos;API INPI Guichet Unique est intégrable. Hors associations.
        </p>
      </div>
    </section>
  );
}
