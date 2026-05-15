/* eslint-disable */
// Nouveau dossier — choose type + run wizard

const FORMALITY_TYPES = [
  {
    id: 'creation',
    icon: 'DocPlus',
    title: 'Créer une auto-entreprise',
    desc: "Immatriculation au RNE et obtention de votre Kbis.",
    duration: '~ 4 min',
    price: '49 €',
    pieces: ['Pièce d\'identité', 'Justificatif de domicile (< 3 mois)'],
    signature: 'Simple',
  },
  {
    id: 'modification',
    icon: 'DocEdit',
    title: 'Modifier mon entreprise',
    desc: "Changement d'adresse, d'activité, de dénomination.",
    duration: '~ 6 min',
    price: '39 €',
    pieces: ['Selon le type de modification'],
    signature: 'Avancée (certificat RGS)',
  },
  {
    id: 'radiation',
    icon: 'DocX',
    title: 'Radier mon entreprise',
    desc: "Cessation d'activité volontaire ou subie.",
    duration: '~ 3 min',
    price: '29 €',
    pieces: ['Aucune (cas général)'],
    signature: 'Simple',
  },
];

const Nouveau = ({ setRoute, setActiveDossier }) => {
  const [choice, setChoice] = React.useState(null);

  if (!choice) {
    return (
      <div className="app-content with-bg">
        <div className="page-head">
          <div>
            <h1>Nouveau dossier</h1>
            <p>Choisissez le type de formalité à déposer au Guichet Unique INPI.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {FORMALITY_TYPES.map(t => (
            <button key={t.id}
                    onClick={() => setChoice(t.id)}
                    className="app-card"
                    style={{
                      textAlign: 'left', cursor: 'pointer',
                      padding: 24, border: '1px solid var(--ink-150)',
                      transition: 'all .15s', background: 'white',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ink-150)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div className="icon-tile-lg">
                  {React.createElement(I[t.icon], { size: 24 })}
                </div>
                <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--accent-ink)' }}>{t.price}</span>
              </div>
              <h3 style={{ fontSize: 19, marginBottom: 8 }}>{t.title}</h3>
              <p style={{ fontSize: 14, minHeight: 42, marginBottom: 16 }}>{t.desc}</p>
              <div style={{ display: 'grid', gap: 8, fontSize: 13, color: 'var(--ink-600)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <I.Clock size={14} style={{ color: 'var(--ink-400)' }} />
                  <span>{t.duration}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <I.Doc size={14} style={{ color: 'var(--ink-400)', marginTop: 2 }} />
                  <span>{t.pieces.join(' · ')}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <I.Lock size={14} style={{ color: 'var(--ink-400)' }} />
                  <span>Signature {t.signature.toLowerCase()}</span>
                </div>
              </div>
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', color: 'var(--accent-ink)', fontSize: 14, fontWeight: 500 }}>
                Commencer <I.Arrow size={15} style={{ marginLeft: 6 }} />
              </div>
            </button>
          ))}
        </div>

        {/* Pappers lookup */}
        <div style={{ marginTop: 32 }} className="app-card">
          <div className="app-card-head">
            <h3>Vous avez déjà une entreprise ?</h3>
            <span className="pill violet">via Pappers</span>
          </div>
          <div style={{ padding: 22, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <p style={{ fontSize: 14 }}>Renseignez votre numéro SIREN. Nous récupérons toutes vos informations depuis l'API Pappers pour pré-remplir la modification ou la radiation.</p>
            </div>
            <div className="app-topbar-search" style={{ background: 'white', border: '1px solid var(--ink-150)', width: 280 }}>
              <span className="mono" style={{ fontSize: 12, color: 'var(--ink-400)' }}>SIREN</span>
              <input placeholder="123 456 789" maxLength={11} />
            </div>
            <button className="btn btn-primary">
              <I.Search size={16} /> Rechercher
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render the wizard
  const tConfig = FORMALITY_TYPES.find(t => t.id === choice);
  return (
    <div className="app-content with-bg">
      <button onClick={() => setChoice(null)} className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
        <I.ChevRight size={14} style={{ transform: 'rotate(180deg)' }} /> Retour au choix
      </button>
      <div className="page-head">
        <div>
          <h1>{tConfig.title}</h1>
          <p>Vos informations sont sauvegardées au fur et à mesure. Vous pouvez reprendre quand vous voulez.</p>
        </div>
      </div>
      {choice === 'creation' && (
        <div style={{ maxWidth: 900 }}>
          <Simulateur />
        </div>
      )}
      {choice === 'modification' && <ModificationWizard setRoute={setRoute} setActiveDossier={setActiveDossier} />}
      {choice === 'radiation' && <RadiationWizard setRoute={setRoute} setActiveDossier={setActiveDossier} />}
    </div>
  );
};

// ─── MODIFICATION WIZARD ──────────────────────────────────

const MOD_TYPES = [
  { id: 'adresse', label: "Changement d'adresse", icon: 'Pin' },
  { id: 'activite', label: "Changement d'activité", icon: 'Doc' },
  { id: 'denom', label: "Dénomination", icon: 'Building' },
];

const ModificationWizard = () => {
  const [siren, setSiren] = React.useState('');
  const [found, setFound] = React.useState(false);
  const [modType, setModType] = React.useState('adresse');
  const [data, setData] = React.useState({ voie: '', cp: '', commune: '', dateEffet: '' });
  const [submitted, setSubmitted] = React.useState(false);

  const update = (k, v) => setData(d => ({ ...d, [k]: v }));

  if (submitted) {
    return (
      <div className="app-card" style={{ padding: 48, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <div className="icon-tile-lg" style={{ margin: '0 auto 20px' }}><I.Lock size={24} /></div>
        <h3 style={{ marginBottom: 8 }}>Lien de signature envoyé</h3>
        <p style={{ maxWidth: 420, margin: '0 auto 20px' }}>
          La modification nécessite une signature avancée (certificat RGS).
          Un lien Universign vous attend dans votre boîte mail.
        </p>
        <div className="mono" style={{ fontSize: 12, color: 'var(--ink-500)', background: 'var(--ink-50)', padding: '8px 14px', borderRadius: 999, display: 'inline-block' }}>
          Dossier #CMP-{Math.floor(Math.random() * 90000 + 10000)}
        </div>
      </div>
    );
  }

  return (
    <div className="app-card" style={{ maxWidth: 900 }}>
      <div className="app-card-pad" style={{ padding: 28 }}>
        {!found ? (
          <>
            <h3 style={{ marginBottom: 6 }}>Quelle entreprise modifier ?</h3>
            <p style={{ marginBottom: 20 }}>Saisissez votre SIREN. Nous récupérons les informations actuelles via l'API RNE du GU.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input className="input" style={{ flex: 1, minWidth: 240 }}
                     placeholder="123 456 789"
                     value={siren} onChange={e => setSiren(e.target.value.replace(/\D/g, '').slice(0, 9))} />
              <button className="btn btn-accent" onClick={() => setFound(siren.length === 9)} disabled={siren.length !== 9} style={{ opacity: siren.length === 9 ? 1 : 0.5 }}>
                <I.Search size={16} /> Rechercher
              </button>
            </div>
            <div style={{ marginTop: 20, padding: 16, background: 'var(--ink-50)', borderRadius: 10, fontSize: 13, color: 'var(--ink-600)' }}>
              <strong>Exemple :</strong> 521 884 322 (essayez)
            </div>
          </>
        ) : (
          <>
            <div style={{
              padding: 14, background: 'var(--accent-soft)', borderRadius: 10, marginBottom: 24,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <I.Check size={20} style={{ color: 'var(--accent-ink)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Karim Benali — EI</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--accent-ink)' }}>SIREN {siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')} · NAF 4332A</div>
              </div>
              <button onClick={() => { setFound(false); setSiren(''); }} className="btn btn-link btn-sm">Changer</button>
            </div>

            <h3 style={{ marginBottom: 14 }}>Type de modification</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
              {MOD_TYPES.map(m => (
                <button key={m.id} onClick={() => setModType(m.id)}
                        className="app-card" style={{
                          padding: 14, textAlign: 'center', cursor: 'pointer',
                          border: `1.5px solid ${modType === m.id ? 'var(--accent)' : 'var(--ink-150)'}`,
                          background: modType === m.id ? 'var(--accent-soft)' : 'white',
                          display: 'grid', gap: 8, justifyItems: 'center',
                        }}>
                  {React.createElement(I[m.icon], { size: 22, color: modType === m.id ? 'var(--accent-ink)' : 'var(--ink-600)' })}
                  <span style={{ fontSize: 13, fontWeight: 500, color: modType === m.id ? 'var(--accent-ink)' : 'var(--ink-700)' }}>{m.label}</span>
                </button>
              ))}
            </div>

            {modType === 'adresse' && (
              <div style={{ display: 'grid', gap: 14 }}>
                <h3 style={{ fontSize: 18 }}>Nouvelle adresse</h3>
                <div style={{ display: 'grid', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>Adresse</label>
                  <input className="input" placeholder="42 avenue de la République" value={data.voie} onChange={e => update('voie', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12 }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>CP</label>
                    <input className="input" placeholder="69001" value={data.cp} onChange={e => update('cp', e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>Commune</label>
                    <input className="input" placeholder="Lyon" value={data.commune} onChange={e => update('commune', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>Date d'effet</label>
                  <input className="input" type="date" value={data.dateEffet} onChange={e => update('dateEffet', e.target.value)} />
                </div>
              </div>
            )}
            {modType !== 'adresse' && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-500)', background: 'var(--ink-50)', borderRadius: 10 }}>
                Le formulaire pour ce type de modification arrive bientôt.
              </div>
            )}
          </>
        )}
      </div>
      {found && modType === 'adresse' && (
        <div style={{
          padding: '16px 28px', borderTop: '1px solid var(--ink-150)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-500)' }}>
            <I.Lock size={14} />
            Signature avancée requise (certificat RGS)
          </div>
          <button
            className="btn btn-accent"
            disabled={!data.voie || !/^\d{5}$/.test(data.cp) || !data.commune || !data.dateEffet}
            style={{ opacity: (data.voie && /^\d{5}$/.test(data.cp) && data.commune && data.dateEffet) ? 1 : 0.5 }}
            onClick={() => setSubmitted(true)}>
            Continuer vers la signature <I.Arrow size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

// ─── RADIATION WIZARD ──────────────────────────────────────

const RadiationWizard = () => {
  const [siren, setSiren] = React.useState('');
  const [found, setFound] = React.useState(false);
  const [motif, setMotif] = React.useState('VOLONTAIRE');
  const [dateCessation, setDateCessation] = React.useState('');
  const [confirmCA, setConfirmCA] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  if (submitted) {
    return (
      <div className="app-card" style={{ padding: 48, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <div className="icon-tile-lg" style={{ margin: '0 auto 20px' }}><I.Check size={24} /></div>
        <h3 style={{ marginBottom: 8 }}>Radiation déposée</h3>
        <p style={{ maxWidth: 420, margin: '0 auto 20px' }}>
          Votre demande de radiation est en route vers le Guichet Unique INPI. Vous recevrez la confirmation sous 24h ouvrées.
        </p>
        <div className="mono" style={{ fontSize: 12, color: 'var(--ink-500)', background: 'var(--ink-50)', padding: '8px 14px', borderRadius: 999, display: 'inline-block' }}>
          Dossier #CMP-{Math.floor(Math.random() * 90000 + 10000)}
        </div>
      </div>
    );
  }

  return (
    <div className="app-card" style={{ maxWidth: 900 }}>
      <div className="app-card-pad" style={{ padding: 28 }}>
        {!found ? (
          <>
            <h3 style={{ marginBottom: 6 }}>Quelle entreprise radier ?</h3>
            <p style={{ marginBottom: 20 }}>Saisissez votre SIREN.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input className="input" style={{ flex: 1, minWidth: 240 }} placeholder="123 456 789"
                     value={siren} onChange={e => setSiren(e.target.value.replace(/\D/g, '').slice(0, 9))} />
              <button className="btn btn-accent" onClick={() => setFound(siren.length === 9)} disabled={siren.length !== 9} style={{ opacity: siren.length === 9 ? 1 : 0.5 }}>
                <I.Search size={16} /> Rechercher
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{
              padding: 14, background: 'var(--accent-soft)', borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <I.Check size={20} style={{ color: 'var(--accent-ink)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Léa Moreau — EI</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--accent-ink)' }}>SIREN {siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')} · NAF 9602A</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>Motif de cessation</label>
              <select className="input" value={motif} onChange={e => setMotif(e.target.value)}>
                <option value="VOLONTAIRE">Cessation volontaire</option>
                <option value="RETRAITE">Départ en retraite</option>
                <option value="MALADIE">Cause de santé</option>
                <option value="JUDICIAIRE">Procédure judiciaire</option>
              </select>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>Date de cessation</label>
              <input className="input" type="date" value={dateCessation} onChange={e => setDateCessation(e.target.value)} />
              <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>Au plus 30 jours dans le passé, ou aujourd'hui.</span>
            </div>

            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14,
              border: '1px solid var(--ink-150)', borderRadius: 10, cursor: 'pointer',
              background: confirmCA ? 'var(--accent-soft)' : 'white',
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: 6, marginTop: 1,
                border: `1.5px solid ${confirmCA ? 'var(--accent)' : 'var(--ink-300)'}`,
                background: confirmCA ? 'var(--accent)' : 'white',
                display: 'grid', placeItems: 'center', color: 'white', flexShrink: 0,
              }}>
                {confirmCA && <I.Check size={13} />}
              </span>
              <span style={{ fontSize: 13, color: 'var(--ink-700)' }}>
                Je confirme avoir effectué (ou m'engage à effectuer) ma dernière déclaration de chiffre d'affaires URSSAF.
              </span>
              <input type="checkbox" checked={confirmCA} onChange={e => setConfirmCA(e.target.checked)} style={{ display: 'none' }} />
            </label>
          </div>
        )}
      </div>
      {found && (
        <div style={{
          padding: '16px 28px', borderTop: '1px solid var(--ink-150)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: 'var(--ink-500)' }}>Aucune pièce requise · Signature simple</span>
          <button className="btn btn-accent"
                  disabled={!dateCessation || !confirmCA}
                  style={{ opacity: (dateCessation && confirmCA) ? 1 : 0.5 }}
                  onClick={() => setSubmitted(true)}>
            Déposer la radiation <I.Send size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

window.Nouveau = Nouveau;
