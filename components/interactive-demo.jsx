/* eslint-disable */
// Démo interactive unifiée : Tableau de bord · Simulateur · Calculateur
// Fusion des 3 sections séparées en une seule expérience à onglets.

const InteractiveDemo = () => {
  const [tab, setTab] = React.useState('dashboard');

  const tabs = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: 'Grid',
      eyebrow: 'Pilotage temps réel',
      heading: 'Tous vos dossiers et déclarations.\nAu même endroit, en temps réel.',
      lead: "Statuts INPI synchronisés à la seconde, déclarations URSSAF préremplies, alertes intelligentes. Votre AE sans paperasse.",
    },
    {
      id: 'simulateur',
      label: 'Simulateur',
      icon: 'Sparkle',
      eyebrow: 'Simulateur interactif',
      heading: 'Commencez votre déclaration.\nPas de compte requis.',
      lead: "Cinq étapes guidées, sauvegarde locale. Vous reprenez quand vous voulez et vous voyez exactement ce qui sera envoyé à l'INPI.",
    },
    {
      id: 'calculateur',
      label: 'Calculateur',
      icon: 'Chart',
      eyebrow: 'Charges & seuils',
      heading: "Combien vous restera-t-il\nréellement chaque mois ?",
      lead: "Cotisations sociales, impôt, TVA, seuils micro : tout est calculé en direct selon votre activité et votre CA prévisionnel.",
    },
  ];

  const current = tabs.find(t => t.id === tab);

  return (
    <section id="demo" className="section section-demo">
      <div className="demo-bg" aria-hidden="true" />
      <div className="container" style={{ position: 'relative' }}>
        <div className="sec-head">
          <span className="eyebrow"><span className="dot" />{current.eyebrow}</span>
          <h2 style={{ whiteSpace: 'pre-line' }}>{current.heading}</h2>
          <p className="lead">{current.lead}</p>
        </div>

        <div className="demo-tabs" role="tablist">
          {tabs.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`demo-tab ${tab === t.id ? 'active' : ''}`}
            >
              {I[t.icon] && React.createElement(I[t.icon], { size: 16 })}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="demo-stage">
          {tab === 'dashboard' && <DemoStageDashboard />}
          {tab === 'simulateur' && <DemoStageSimulateur />}
          {tab === 'calculateur' && <DemoStageCalculateur />}
        </div>

        <div className="demo-meta">
          <span><I.Check size={14} /> Aperçu réel du produit</span>
          <span><I.Lock size={14} /> Données factices · pas besoin de s'inscrire</span>
          <a href="auth/signup.html" className="btn btn-accent btn-sm" style={{ marginLeft: 'auto' }}>
            Démarrer maintenant <I.Arrow size={14} />
          </a>
        </div>
      </div>
    </section>
  );
};

// ── Stage : Tableau de bord (frame "navigateur" + dashboard interne) ──
const DemoStageDashboard = () => (
  <div className="demo-frame">
    <BrowserChrome url="app.compta.fr/dossiers" />
    <Dashboard />
  </div>
);

// ── Stage : Simulateur (le wizard de l'espace client en mode démo + compact) ──
const DemoStageSimulateur = () => (
  <div className="demo-frame demo-frame-light demo-frame-compact">
    <div style={{ padding: '22px 22px 18px' }}>
      {window.WizardCreation
        ? <window.WizardCreation demoMode={true} />
        : <p style={{ padding: 32, color: 'var(--ink-500)', textAlign: 'center' }}>Chargement du simulateur…</p>}
    </div>
  </div>
);

// ── Stage : Calculateur officiel URSSAF (iframe direct, plus fiable) ──
const DemoStageCalculateur = () => (
  <div className="demo-frame">
    <iframe
      title="Simulateur auto-entrepreneur URSSAF"
      src="https://mon-entreprise.urssaf.fr/iframes/simulateur-autoentrepreneur?couleur=7d29e5"
      style={{
        width: '100%', height: 760, border: 'none', display: 'block', background: 'white',
      }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allow="clipboard-write"
    />
    <div style={{
      padding: '12px 18px',
      borderTop: '1px solid var(--ink-150)',
      background: 'var(--ink-50)',
      fontSize: 12, color: 'var(--ink-500)',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <I.Shield size={14} />
      Calculateur officiel URSSAF · <a href="https://mon-entreprise.urssaf.fr/simulateurs/auto-entrepreneur" target="_blank" rel="noopener" style={{ color: 'var(--accent-ink)' }}>ouvrir en plein écran</a>
    </div>
  </div>
);

const BrowserChrome = ({ url }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px', borderBottom: '1px solid var(--ink-150)',
    background: 'var(--ink-50)',
  }}>
    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C940' }} />
    <div className="mono" style={{
      fontSize: 12, color: 'var(--ink-500)',
      background: 'white', border: '1px solid var(--ink-150)',
      borderRadius: 6, padding: '4px 12px', margin: '0 auto',
    }}>{url}</div>
    <span style={{ width: 60 }} />
  </div>
);

window.InteractiveDemo = InteractiveDemo;
