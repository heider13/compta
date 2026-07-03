// Bande "intégrations" sous le hero — style bande logos legaltech.
// On affiche les intégrations RÉELLES de la plateforme (pas de faux logos
// clients) : c'est vérifiable et ça rassure autant.

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
    <section style={{ borderBottom: '1px solid var(--ink-100)', background: 'white' }}>
      <div className="container">
        <p
          style={{
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-400)',
            margin: '20px 0 0',
          }}
        >
          Connecté à vos outils et registres officiels
        </p>
        <div className="logo-band">
          {INTEGRATIONS.map((name) => (
            <span key={name} className="logo-item">
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  display: 'inline-block',
                }}
              />
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
