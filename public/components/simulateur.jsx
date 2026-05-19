/* eslint-disable */
// Simulateur création AE — multi-étapes, interactif et fonctionnel

const NAF_CODES = [
  { code: '6202A', label: 'Conseil en informatique', nature: 'LIBERALE' },
  { code: '7022Z', label: 'Conseil pour les affaires & gestion', nature: 'LIBERALE' },
  { code: '7430Z', label: 'Traduction et interprétation', nature: 'LIBERALE' },
  { code: '7410Z', label: 'Activités spécialisées de design', nature: 'LIBERALE' },
  { code: '8559A', label: 'Formation continue d\'adultes', nature: 'LIBERALE' },
  { code: '9602A', label: 'Coiffure', nature: 'ARTISANALE' },
  { code: '4791A', label: 'Vente à distance sur catalogue général', nature: 'COMMERCIALE' },
  { code: '5610A', label: 'Restauration traditionnelle', nature: 'COMMERCIALE' },
  { code: '4332A', label: 'Travaux de menuiserie bois et PVC', nature: 'ARTISANALE' },
  { code: '4321A', label: 'Travaux d\'installation électrique', nature: 'ARTISANALE' },
];

const STEPS = [
  { id: 'activite', label: 'Activité', icon: 'Doc' },
  { id: 'identite', label: 'Identité', icon: 'User' },
  { id: 'adresse', label: 'Adresse', icon: 'Pin' },
  { id: 'options', label: 'Options', icon: 'Sparkle' },
  { id: 'recap', label: 'Récapitulatif', icon: 'Check' },
];

const NAFAutocomplete = ({ value, onChange }) => {
  const [q, setQ] = React.useState(value?.label || '');
  const [open, setOpen] = React.useState(false);
  const filtered = q.length > 0
    ? NAF_CODES.filter(n => n.label.toLowerCase().includes(q.toLowerCase()) || n.code.includes(q))
    : NAF_CODES.slice(0, 6);
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-400)' }}>
          <I.Search size={18} />
        </div>
        <input
          type="text"
          className="input"
          placeholder="Ex: conseil en informatique, coiffure..."
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          style={{ paddingLeft: 42 }}
        />
      </div>
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'white', border: '1px solid var(--ink-150)', borderRadius: 12,
          boxShadow: 'var(--shadow-lg)', zIndex: 10,
          maxHeight: 280, overflowY: 'auto', padding: 6,
        }}>
          {filtered.map(n => (
            <button
              key={n.code}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(n); setQ(n.label); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '10px 12px', textAlign: 'left',
                border: 'none', background: 'transparent', borderRadius: 8,
                cursor: 'pointer', color: 'var(--ink-900)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-50)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{n.label}</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>NAF {n.code}</div>
              </span>
              <span className="pill violet" style={{ fontSize: 11 }}>{n.nature}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const TextInput = ({ label, hint, error, ...props }) => (
  <label style={{ display: 'grid', gap: 6 }}>
    {label && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>{label}</span>}
    <input className="input" {...props} />
    {hint && !error && <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>{hint}</span>}
    {error && <span style={{ fontSize: 12, color: 'var(--status-red)' }}>{error}</span>}
  </label>
);

const Toggle = ({ checked, onChange, label, sublabel }) => (
  <label style={{
    display: 'flex', alignItems: 'flex-start', gap: 14,
    padding: 16, border: `1px solid ${checked ? 'var(--accent)' : 'var(--ink-150)'}`,
    borderRadius: 12, cursor: 'pointer',
    background: checked ? 'var(--accent-soft)' : 'white',
    transition: 'all .15s ease',
  }}>
    <span style={{
      width: 20, height: 20, borderRadius: 6, marginTop: 2,
      border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--ink-300)'}`,
      background: checked ? 'var(--accent)' : 'white',
      display: 'grid', placeItems: 'center', flexShrink: 0,
      color: 'white',
    }}>
      {checked && <I.Check size={14} />}
    </span>
    <span style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-900)' }}>{label}</div>
      {sublabel && <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 4 }}>{sublabel}</div>}
    </span>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
  </label>
);

const Simulateur = () => {
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState({
    naf: null,
    civilite: 'M',
    nom: '', prenom: '', dateNaissance: '', email: '',
    voie: '', codePostal: '', commune: '',
    aDomicile: true, versementLiberatoireIR: false, demandeAccre: false,
    dateDebut: '',
  });
  const [submitted, setSubmitted] = React.useState(false);

  const update = (k, v) => setData(d => ({ ...d, [k]: v }));

  const canNext = () => {
    if (step === 0) return !!data.naf;
    if (step === 1) return data.nom && data.prenom && data.dateNaissance && data.email.includes('@');
    if (step === 2) return data.voie && /^\d{5}$/.test(data.codePostal) && data.commune;
    if (step === 3) return !!data.dateDebut;
    return true;
  };

  const progress = ((step) / (STEPS.length - 1)) * 100;

  if (submitted) {
    return (
      <div className="card-elev" style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--accent-soft)',
                      color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
          <I.Check size={32} />
        </div>
        <h3 style={{ marginBottom: 8 }}>Votre dossier est prêt à être déposé</h3>
        <p style={{ maxWidth: 480, margin: '0 auto 24px' }}>
          On vous envoie un récap par email sur <strong>{data.email}</strong>.
          Un conseiller vous appelle sous 24h pour valider les pièces et déposer le dossier au Guichet Unique INPI.
        </p>
        <div className="mono" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', background: 'var(--ink-50)', border: '1px solid var(--ink-150)',
          borderRadius: 999, fontSize: 13, color: 'var(--ink-700)',
        }}>
          <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-green)' }} />
          Dossier #CMP-{Math.floor(Math.random() * 90000 + 10000)}
        </div>
        <div style={{ marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={() => { setSubmitted(false); setStep(0); }}>
            Refaire une simulation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elev" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Stepper header */}
      <div style={{
        padding: '24px 28px', borderBottom: '1px solid var(--ink-150)',
        background: 'var(--ink-50)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>Étape {step + 1} sur {STEPS.length}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-900)', marginTop: 2 }}>
              {STEPS[step].label}
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>
            <I.Clock size={14} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 6 }} />
            ~ {Math.max(1, 4 - step)} min restantes
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--ink-150)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: 'var(--accent)', transition: 'width .35s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: i <= step ? 'var(--accent-ink)' : 'var(--ink-400)',
              fontSize: 12, fontWeight: 500,
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%',
                background: i < step ? 'var(--accent)' : i === step ? 'var(--accent-soft)' : 'var(--ink-100)',
                color: i < step ? 'white' : i === step ? 'var(--accent-ink)' : 'var(--ink-500)',
                display: 'grid', placeItems: 'center',
                fontSize: 11, fontWeight: 600,
                border: i === step ? '1.5px solid var(--accent)' : 'none',
              }}>
                {i < step ? <I.Check size={11} /> : i + 1}
              </span>
              <span style={{ display: window.innerWidth < 700 ? 'none' : 'inline' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 32 }}>
        {step === 0 && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <h3 style={{ marginBottom: 6 }}>Quelle activité allez-vous exercer ?</h3>
              <p>Tapez le nom de votre métier. Nous trouvons le code NAF qui correspond.</p>
            </div>
            <NAFAutocomplete value={data.naf} onChange={(n) => update('naf', n)} />
            {data.naf && (
              <div style={{
                padding: 16, background: 'var(--accent-soft)', borderRadius: 12,
                border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div className="icon-tile">
                  <I.Check size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{data.naf.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--accent-ink)', marginTop: 2 }}>
                    Code NAF <strong className="mono">{data.naf.code}</strong> · Nature {data.naf.nature.toLowerCase()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <h3 style={{ marginBottom: 6 }}>Vos informations personnelles</h3>
              <p>Tel qu'écrit sur votre pièce d'identité.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>Civilité</span>
                <select className="input" value={data.civilite} onChange={e => update('civilite', e.target.value)}>
                  <option value="M">M.</option>
                  <option value="Mme">Mme</option>
                </select>
              </label>
              <TextInput label="Prénom" value={data.prenom} onChange={e => update('prenom', e.target.value)} placeholder="Jean" />
              <TextInput label="Nom de naissance" value={data.nom} onChange={e => update('nom', e.target.value)} placeholder="Dupont" />
            </div>
            <div className="form-grid-2">
              <TextInput label="Date de naissance" type="date" value={data.dateNaissance} onChange={e => update('dateNaissance', e.target.value)} />
              <TextInput label="Email" type="email" value={data.email} onChange={e => update('email', e.target.value)} placeholder="jean.dupont@email.fr" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <h3 style={{ marginBottom: 6 }}>Adresse du domicile</h3>
              <p>Adresse à laquelle vous résidez. Pour l'instant, ce sera aussi celle de votre activité.</p>
            </div>
            <TextInput label="Adresse" value={data.voie} onChange={e => update('voie', e.target.value)} placeholder="12 rue de la Paix" />
            <div className="form-grid-2">
              <TextInput label="Code postal" value={data.codePostal} onChange={e => update('codePostal', e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="75001" />
              <TextInput label="Commune" value={data.commune} onChange={e => update('commune', e.target.value)} placeholder="Paris" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <h3 style={{ marginBottom: 6 }}>Options</h3>
              <p>Quelques choix qui peuvent réduire vos impôts ou cotisations.</p>
            </div>
            <TextInput label="Date de début d'activité" type="date" value={data.dateDebut} onChange={e => update('dateDebut', e.target.value)} />
            <Toggle
              checked={data.aDomicile}
              onChange={v => update('aDomicile', v)}
              label="J'exerce à mon domicile"
              sublabel="Cas le plus fréquent. Sinon, vous renseignerez une adresse pro plus tard."
            />
            <Toggle
              checked={data.versementLiberatoireIR}
              onChange={v => update('versementLiberatoireIR', v)}
              label="Versement libératoire de l'impôt"
              sublabel="Payez votre impôt en même temps que vos cotisations URSSAF. Sous conditions de revenu fiscal."
            />
            <Toggle
              checked={data.demandeAccre}
              onChange={v => update('demandeAccre', v)}
              label="Demander l'ACRE"
              sublabel="Exonération partielle de charges sociales la 1ʳᵉ année. Sous conditions."
            />
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <h3 style={{ marginBottom: 6 }}>Tout est prêt</h3>
              <p>Vérifiez les informations, puis nous déposons le dossier au Guichet Unique INPI.</p>
            </div>
            <div style={{
              border: '1px solid var(--ink-150)', borderRadius: 14, overflow: 'hidden',
            }}>
              {[
                ['Activité', data.naf?.label, `NAF ${data.naf?.code}`],
                ['Nom', `${data.civilite}. ${data.prenom} ${data.nom}`, data.dateNaissance],
                ['Adresse', data.voie, `${data.codePostal} ${data.commune}`],
                ['Début d\'activité', data.dateDebut, ''],
                ['Options', [
                  data.aDomicile && 'À domicile',
                  data.versementLiberatoireIR && 'Versement libératoire',
                  data.demandeAccre && 'ACRE',
                ].filter(Boolean).join(' · ') || '—', ''],
              ].map(([k, v, sub], i, arr) => (
                <div key={k} style={{
                  display: 'grid', gridTemplateColumns: '180px 1fr auto',
                  padding: '14px 18px', gap: 12,
                  borderBottom: i < arr.length - 1 ? '1px solid var(--ink-150)' : 'none',
                  alignItems: 'center', background: i % 2 === 0 ? 'var(--ink-50)' : 'white',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-500)' }}>{k}</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{v || '—'}</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--ink-500)' }}>{sub}</span>
                </div>
              ))}
            </div>
            <div style={{
              padding: 16, background: 'var(--violet-50)', borderRadius: 12,
              display: 'flex', gap: 12, fontSize: 13,
            }}>
              <I.Shield size={18} style={{ color: 'var(--accent-ink)', flexShrink: 0, marginTop: 2 }} />
              <div style={{ color: 'var(--ink-700)' }}>
                Vos données sont chiffrées et transmises exclusivement au Guichet Unique INPI.
                Compta est mandataire INPI agréé.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '20px 28px', borderTop: '1px solid var(--ink-150)',
        background: 'var(--white)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap'
      }}>
        <button
          className="btn btn-ghost"
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          style={{ opacity: step === 0 ? 0.4 : 1, pointerEvents: step === 0 ? 'none' : 'auto' }}
        >
          Retour
        </button>
        {step < STEPS.length - 1 ? (
          <button
            className="btn btn-accent"
            onClick={() => canNext() && setStep(s => s + 1)}
            disabled={!canNext()}
            style={{ opacity: canNext() ? 1 : 0.5 }}
          >
            Continuer
            <I.Arrow size={16} />
          </button>
        ) : (
          <button className="btn btn-accent" onClick={() => setSubmitted(true)}>
            Déposer mon dossier
            <I.Send size={16} />
          </button>
        )}
      </div>

      <style>{`
        .input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--ink-200);
          border-radius: 10px;
          background: white;
          font-size: 15px;
          color: var(--ink-900);
          transition: border-color .15s ease, box-shadow .15s ease;
          outline: none;
        }
        .input::placeholder { color: var(--ink-400); }
        .input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 18%, transparent);
        }
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 600px) {
          .form-grid-2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

window.Simulateur = Simulateur;
