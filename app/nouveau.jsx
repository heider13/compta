/* eslint-disable */
// Nouveau dossier — choix du type puis délégation au wizard approprié

const FORMALITY_TYPES = [
  { id: 'CREATION',     icon: 'DocPlus', title: 'Créer une auto-entreprise', desc: "Immatriculation au RNE et obtention de votre Kbis.", duration: '~ 4 min', pieces: ['Pièce d\'identité', 'Justificatif de domicile (< 3 mois)', 'Déclaration de non-condamnation'], signature: 'Simple' },
  { id: 'MODIFICATION', icon: 'DocEdit', title: 'Modifier mon entreprise',   desc: "Changement d'adresse, d'activité, de dénomination.",   duration: '~ 6 min', pieces: ['Pièce d\'identité', 'Justificatif de la modification'],                                signature: 'Avancée (RGS qualifié)' },
  { id: 'RADIATION',    icon: 'DocX',    title: 'Radier mon entreprise',     desc: "Cessation d'activité volontaire ou subie.",            duration: '~ 3 min', pieces: ['Pièce d\'identité', 'Selon le motif'],                                                  signature: 'Avancée (RGS qualifié)' },
];

const Nouveau = ({ setRoute, setActiveDossier }) => {
  const [choice, setChoice] = React.useState(null);

  // On accepte de reprendre un brouillon via ?d=<localId>&type=<TYPE>
  React.useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const type = sp.get('type');
    if (['CREATION', 'MODIFICATION', 'RADIATION'].includes(type) && sp.get('d')) {
      setChoice(type);
    }
  }, []);

  if (!choice) {
    return (
      <div className="app-content with-bg">
        <div className="page-head">
          <div>
            <h1>Nouveau dossier</h1>
            <p>Choisis le type de formalité. Tu pourras compléter et téléverser les pièces étape par étape.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {FORMALITY_TYPES.map(t => (
            <button key={t.id}
                    onClick={() => setChoice(t.id)}
                    className="app-card"
                    style={{ textAlign: 'left', cursor: 'pointer', padding: 24, border: '1px solid var(--ink-150)', background: 'white' }}>
              <div className="icon-tile-lg" style={{ marginBottom: 16 }}>
                {React.createElement(I[t.icon], { size: 24 })}
              </div>
              <h3 style={{ fontSize: 19, marginBottom: 8 }}>{t.title}</h3>
              <p style={{ fontSize: 14, minHeight: 42, marginBottom: 16, color: 'var(--ink-600)' }}>{t.desc}</p>
              <div style={{ display: 'grid', gap: 8, fontSize: 13, color: 'var(--ink-600)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <I.Clock size={14} style={{ color: 'var(--ink-400)' }} /><span>{t.duration}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <I.Doc size={14} style={{ color: 'var(--ink-400)', marginTop: 2 }} /><span>{t.pieces.join(' · ')}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <I.Lock size={14} style={{ color: 'var(--ink-400)' }} /><span>Signature {t.signature.toLowerCase()}</span>
                </div>
              </div>
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', color: 'var(--accent-ink)', fontSize: 14, fontWeight: 500 }}>
                Commencer <I.Arrow size={15} style={{ marginLeft: 6 }} />
              </div>
            </button>
          ))}
        </div>
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

  const WizardComp = choice === 'CREATION' ? window.WizardCreation
                   : choice === 'MODIFICATION' ? window.WizardModification
                   : window.WizardCessation;

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
