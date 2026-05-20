import { Check, Sparkle, Arrow } from '@/components/icons';

const PLANS = [
  {
    name: 'Cabinet',
    desc: 'Pour les petits cabinets et formalistes indépendants.',
    price: '79 €',
    suffix: ' / mois HT',
    cta: 'Démarrer',
    accent: false,
    features: [
      'Jusqu\'à 3 collaborateurs',
      "Jusqu'à 50 dossiers / mois",
      'Toutes les formalités INPI',
      'Espace client + signature',
      'Support email sous 24 h',
    ],
  },
  {
    name: 'Cabinet Pro',
    desc: 'Pour les cabinets en croissance avec plusieurs collaborateurs.',
    price: '199 €',
    suffix: ' / mois HT',
    cta: 'Démarrer 30 jours',
    accent: true,
    highlight: 'Le plus choisi',
    features: [
      'Jusqu\'à 10 collaborateurs',
      'Volume de dossiers illimité',
      'CRM intégré + import Pappers',
      'Automatisation des relances',
      'Support prioritaire 7j/7',
      'Marque blanche (logo + couleurs)',
    ],
  },
  {
    name: 'Enterprise',
    desc: 'Pour les groupes et legaltechs avec besoins API.',
    price: 'Sur devis',
    suffix: '',
    cta: 'Nous contacter',
    accent: false,
    features: [
      'Collaborateurs illimités',
      'API publique + webhooks',
      'Sous-domaine personnalisé',
      'SLA contractuel 99,9 %',
      'Onboarding dédié + account manager',
      'SSO (SAML, OIDC)',
    ],
  },
];

export function Pricing() {
  return (
    <section id="tarifs" className="section section-tarifs">
      <div className="tarifs-bg" aria-hidden="true" />
      <div className="container" style={{ position: 'relative' }}>
        <div className="sec-head">
          <span className="eyebrow"><span className="dot" />Tarifs cabinets</span>
          <h2>Une plateforme par cabinet.<br />Pas de surprise.</h2>
          <p className="lead">
            Abonnement mensuel sans engagement. Les frais légaux INPI éventuels
            sont refacturés au coût réel à votre client.
          </p>
        </div>
        <div className="grid-3 pricing-grid">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`pricing-card ${p.accent ? 'highlighted card-elev' : 'card'}`}
              style={{
                padding: 28,
                border: p.accent ? '2px solid var(--accent)' : undefined,
                position: 'relative',
                background: p.accent ? 'linear-gradient(180deg, var(--violet-50), white 30%)' : 'white',
              }}
            >
              {p.accent && p.highlight && (
                <span
                  className="pill violet"
                  style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--accent)',
                    color: 'white',
                    fontSize: 11,
                    padding: '4px 12px',
                  }}
                >
                  <Sparkle size={11} />
                  {p.highlight.toUpperCase()}
                </span>
              )}
              <h3 style={{ fontSize: 22, marginBottom: 6 }}>{p.name}</h3>
              <p style={{ fontSize: 14, minHeight: 40 }}>{p.desc}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '20px 0 24px' }}>
                <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink-900)' }}>
                  {p.price}
                </span>
                <span style={{ fontSize: 14, color: 'var(--ink-500)' }}>{p.suffix}</span>
              </div>
              <a
                href="/auth/signup"
                className={`btn ${p.accent ? 'btn-accent' : 'btn-ghost'}`}
                style={{ width: '100%', marginBottom: 24, justifyContent: 'center' }}
              >
                {p.cta}
                <Arrow size={16} />
              </a>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                {p.features.map((f) => (
                  <li
                    key={f}
                    style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'var(--ink-700)' }}
                  >
                    <Check size={16} style={{ color: 'var(--accent)', marginTop: 3, flexShrink: 0 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
