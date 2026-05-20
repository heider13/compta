/* eslint-disable */
// Nouveau dossier — choix du type puis délégation au wizard approprié
// Pivot B2B : supporte toutes les formes juridiques INPI

const FORMALITY_TYPES = [
  // ─── Créations ──────────────────────────────────────
  { id: 'AE',       category: 'Création', icon: 'DocPlus', title: 'Auto-entreprise',          desc: "Immatriculation simplifiée au RNE, dispense de capital social.",        pieces: 3, signature: 'Simple' },
  { id: 'SASU',     category: 'Création', icon: 'DocPlus', title: 'SASU',                     desc: "Société par Actions Simplifiée Unipersonnelle. 1 associé, président.",  pieces: 5, signature: 'Simple' },
  { id: 'SAS',      category: 'Création', icon: 'DocPlus', title: 'SAS',                      desc: "Société par Actions Simplifiée. Plusieurs associés, président.",        pieces: 5, signature: 'Simple' },
  { id: 'EURL',     category: 'Création', icon: 'DocPlus', title: 'EURL',                     desc: "Entreprise Unipersonnelle à Responsabilité Limitée. 1 associé, gérant.", pieces: 5, signature: 'Simple' },
  { id: 'SARL',     category: 'Création', icon: 'DocPlus', title: 'SARL',                     desc: "Société À Responsabilité Limitée. 2 à 100 associés, gérant(s).",        pieces: 5, signature: 'Simple' },
  { id: 'SCI',      category: 'Création', icon: 'Building', title: 'SCI',                     desc: "Société Civile Immobilière. Gestion d'un patrimoine immobilier.",       pieces: 5, signature: 'Simple' },
  { id: 'HOLDING',  category: 'Création', icon: 'Building', title: 'Holding',                 desc: "Société de tête (SAS, SASU ou SARL) pour prise de participation.",      pieces: 5, signature: 'Simple' },
  // ─── Modification / Cessation ───────────────────────
  { id: 'MODIFICATION', category: 'Modification', icon: 'DocEdit', title: 'Modification',     desc: "Changement d'adresse, dirigeant, activité, capital, dénomination.",     pieces: 2, signature: 'Avancée (RGS qualifié)' },
  { id: 'RADIATION',    category: 'Cessation',    icon: 'DocX',    title: 'Cessation / radiation', desc: "Cessation d'activité volontaire ou subie, dissolution, liquidation.", pieces: 1, signature: 'Avancée (RGS qualifié)' },
];

const CATEGORIES = ['Création', 'Modification', 'Cessation'];

const WIZARDS = {
  AE:           () => window.WizardCreation,
  SASU:         () => window.WizardSASU,
  SAS:          () => window.WizardSAS,
  EURL:         () => window.WizardEURL,
  SARL:         () => window.WizardSARL,
  SCI:          () => window.WizardSCI,
  HOLDING:      () => window.WizardHolding,
  MODIFICATION: () => window.WizardModification,
  RADIATION:    () => window.WizardCessation,
};

const Nouveau = ({ setRoute, setActiveDossier }) => {
  const [choice, setChoice] = React.useState(null);

  React.useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const type = sp.get('type');
    if (type && WIZARDS[type] && sp.get('d')) {
      setChoice(type);
    }
  }, []);

  if (!choice) {
    return (
      <div className="app-content with-bg">
        <div className="page-head">
          <div>
            <h1>Nouveau dossier</h1>
            <p>Choisis le type de formalité. Toutes les formalités passent par le Guichet Unique INPI.</p>
          </div>
        </div>

        {CATEGORIES.map((cat) => {
          const items = FORMALITY_TYPES.filter((t) => t.category === cat);
          return (
            <div key={cat} style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                {cat}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                {items.map((t) => (
                  <button key={t.id}
                          onClick={() => setChoice(t.id)}
                          className="app-card"
                          style={{ textAlign: 'left', cursor: 'pointer', padding: 20, border: '1px solid var(--ink-150)', background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div className="icon-tile-lg">
                        {React.createElement(I[t.icon], { size: 22 })}
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                        {t.signature.startsWith('Avancée') ? 'RGS' : 'Simple'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 17, marginBottom: 6 }}>{t.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--ink-600)', minHeight: 52, margin: 0 }}>{t.desc}</p>
                    <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--ink-500)' }}>
                      <span>{t.pieces} pièce{t.pieces > 1 ? 's' : ''} jointe{t.pieces > 1 ? 's' : ''}</span>
                      <span style={{ color: 'var(--accent-ink)', fontWeight: 500 }}>Commencer →</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const dossierId = new URLSearchParams(window.location.search).get('d') || null;
  const goBack = () => { setChoice(null); window.history.replaceState(null, '', window.location.pathname + '?route=nouveau'); };
  const onCreated = () => setRoute('dossiers');

  const Back = () => (
    <button onClick={goBack} className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
      <I.ChevRight size={14} style={{ transform: 'rotate(180deg)' }} /> Retour au choix
    </button>
  );

  const WizardComp = WIZARDS[choice] && WIZARDS[choice]();

  if (!WizardComp) {
    return (
      <div className="app-content with-bg">
        <Back />
        <div className="app-card" style={{ padding: 24 }}>
          <p style={{ color: '#b42318' }}>Wizard pour "{choice}" non chargé. Recharge la page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-content with-bg">
      <Back />
      <WizardComp dossierId={dossierId} setRoute={setRoute} onCreated={onCreated} />
    </div>
  );
};

window.Nouveau = Nouveau;
