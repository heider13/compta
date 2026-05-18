/* eslint-disable */
// Nouveau dossier — choix du type + form + upload + soumission pour validation admin

const FORMALITY_TYPES = [
  { id: 'CREATION',     icon: 'DocPlus', title: 'Créer une auto-entreprise', desc: "Immatriculation au RNE et obtention de votre Kbis.", duration: '~ 4 min', pieces: ['Pièce d\'identité', 'Justificatif de domicile (< 3 mois)'] },
  { id: 'MODIFICATION', icon: 'DocEdit', title: 'Modifier mon entreprise',   desc: "Changement d'adresse, d'activité, de dénomination.",   duration: '~ 6 min', pieces: ['Pièce justifiant la modification'] },
  { id: 'RADIATION',    icon: 'DocX',    title: 'Radier mon entreprise',     desc: "Cessation d'activité volontaire ou subie.",            duration: '~ 3 min', pieces: ['Aucune (cas général)'] },
];

const Nouveau = ({ setRoute, setActiveDossier }) => {
  const [step, setStep] = React.useState('choose');   // choose | form
  const [type, setType] = React.useState(null);
  const [form, setForm] = React.useState({ client_name: '', siren: '', naf_code: '', notes: '' });
  const [files, setFiles] = React.useState([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const fileInputRef = React.useRef(null);

  const update = (k, v) => setForm(s => ({ ...s, [k]: v }));

  if (step === 'choose') {
    return (
      <div className="app-content with-bg">
        <div className="page-head">
          <div>
            <h1>Nouveau dossier</h1>
            <p>Choisis le type de formalité. Tu pourras compléter et téléverser les pièces ensuite.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {FORMALITY_TYPES.map(t => (
            <button key={t.id}
                    onClick={() => { setType(t.id); setStep('form'); }}
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

  // Step: form
  const tConfig = FORMALITY_TYPES.find(t => t.id === type);
  const needsSiren = type === 'MODIFICATION' || type === 'RADIATION';

  const onFilesChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...newFiles.map(f => ({ file: f, name: f.name, size: f.size, uploaded: false, error: null }))]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const onSubmit = async () => {
    setError(null);
    if (!form.client_name.trim()) return setError('Nom du client requis');
    if (needsSiren && !form.siren.trim()) return setError('SIREN requis pour ce type de formalité');
    setSubmitting(true);

    try {
      // 1. Create draft
      const r = await window.ComptaAPI.apiFetch('/api/dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: form.client_name.trim(),
          type_formalite: type,
          inpi_content: {
            _meta: { siren: form.siren || null, naf_code: form.naf_code || null, notes: form.notes || null, source: 'simple_form_v1' },
          },
        }),
      });
      const dossierId = r.dossier.id;

      // 2. Upload files to Supabase Storage
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const path = `${dossierId}/${Date.now()}-${f.file.name.replace(/[^\w.\-]/g, '_')}`;
        const { error: upErr } = await window.supabaseClient.storage
          .from('dossier-docs')
          .upload(path, f.file, { upsert: false, contentType: f.file.type || 'application/pdf' });
        if (upErr) {
          setFiles(prev => prev.map((x, idx) => idx === i ? { ...x, error: upErr.message } : x));
          continue;
        }
        await window.ComptaAPI.apiFetch(`/api/dossiers/${dossierId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: f.file.name, storage_path: path, size_bytes: f.size, mime_type: f.file.type }),
        });
        setFiles(prev => prev.map((x, idx) => idx === i ? { ...x, uploaded: true } : x));
      }

      // 3. Submit for validation
      await window.ComptaAPI.apiFetch(`/api/dossiers/${dossierId}/submit`, { method: 'POST' });

      // 4. Redirect to dossiers list
      setRoute('dossiers');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-content with-bg">
      <button onClick={() => setStep('choose')} className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
        <I.ChevRight size={14} style={{ transform: 'rotate(180deg)' }} /> Retour au choix
      </button>
      <div className="page-head">
        <div>
          <h1>{tConfig.title}</h1>
          <p>Renseigne les informations et téléverse les pièces. Tu vas soumettre pour validation interne avant envoi à l'INPI.</p>
        </div>
      </div>

      <div style={{ maxWidth: 720 }}>
        <div className="app-card" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>Informations</h3>
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Nom du client (ou société)" value={form.client_name} onChange={v => update('client_name', v)} required />
            {needsSiren && <Field label="SIREN" value={form.siren} onChange={v => update('siren', v)} required mono />}
            <Field label="Code NAF (optionnel)" value={form.naf_code} onChange={v => update('naf_code', v)} mono placeholder="6202A" />
            <div>
              <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>Notes / contexte (optionnel)</label>
              <textarea
                value={form.notes}
                onChange={e => update('notes', e.target.value)}
                placeholder="Tout ce qui aidera l'admin à valider…"
                rows={3}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--ink-200)', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        <div className="app-card" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>Pièces jointes</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 16 }}>PDF uniquement, max 10 Mo par fichier. Pièces requises : {tConfig.pieces.join(', ')}.</p>
          <input ref={fileInputRef} type="file" accept="application/pdf" multiple onChange={onFilesChange} style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current?.click()} className="btn btn-ghost" style={{ marginBottom: files.length ? 12 : 0 }}>
            <I.DocPlus size={16} /> Ajouter un fichier
          </button>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--ink-150)', borderRadius: 8, marginTop: 8 }}>
              <I.Doc size={16} style={{ color: 'var(--ink-500)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{(f.size / 1024).toFixed(0)} Ko {f.uploaded && '· téléversé'} {f.error && `· erreur : ${f.error}`}</div>
              </div>
              {!submitting && <button onClick={() => removeFile(i)} className="btn btn-ghost btn-sm">Retirer</button>}
            </div>
          ))}
        </div>

        {error && <div style={{ color: '#b42318', padding: 12, marginBottom: 16, fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={() => setStep('choose')} className="btn btn-ghost" disabled={submitting}>Annuler</button>
          <button onClick={onSubmit} className="btn btn-accent btn-lg" disabled={submitting}>
            {submitting ? 'Envoi…' : 'Soumettre pour validation'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, required, mono, placeholder }) => (
  <div>
    <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>{label}{required && ' *'}</label>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || ''}
      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--ink-200)', borderRadius: 8, fontFamily: mono ? 'Geist Mono, monospace' : 'inherit', fontSize: 14 }}
    />
  </div>
);

window.Nouveau = Nouveau;
