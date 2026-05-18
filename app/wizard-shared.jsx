/* eslint-disable */
// Composants partagés pour les 3 wizards (création / modification / cessation)
// Exposés via window.WC

const Section = ({ title, subtitle, children }) => (
  <div className="app-card" style={{ padding: 24, marginBottom: 16 }}>
    <h3 style={{ fontSize: 17, margin: 0, marginBottom: subtitle ? 4 : 16 }}>{title}</h3>
    {subtitle && <p style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 16 }}>{subtitle}</p>}
    <div style={{ display: 'grid', gap: 14 }}>{children}</div>
  </div>
);

const Row = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>{children}</div>
);

const FieldText = ({ label, value, onChange, mono, maxLength, placeholder }) => (
  <div>
    <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
    <input value={value || ''} onChange={e => onChange(e.target.value)} maxLength={maxLength} placeholder={placeholder || ''}
      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--ink-200)', borderRadius: 8, fontFamily: mono ? 'Geist Mono, monospace' : 'inherit', fontSize: 14 }} />
  </div>
);

const FieldTextarea = ({ label, value, onChange, rows = 3, placeholder }) => (
  <div>
    <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder || ''}
      style={{ width: '100%', padding: 10, border: '1px solid var(--ink-200)', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, resize: 'vertical' }} />
  </div>
);

const FieldDate = ({ label, value, onChange }) => (
  <div>
    <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
    <input type="date" value={value || ''} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--ink-200)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }} />
  </div>
);

const FieldSelect = ({ label, value, onChange, options }) => (
  <div>
    <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--ink-200)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: 'white' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const FieldCheckbox = ({ label, checked, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
    <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
    {label}
  </label>
);

const RecapBlock = ({ label, rows }) => (
  <div style={{ background: 'var(--ink-50)', padding: 14, borderRadius: 10 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-700)', textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 8 }}>{label}</div>
    {rows.map(([k, v], i) => (
      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderTop: i > 0 ? '1px solid var(--ink-150)' : 'none' }}>
        <span style={{ color: 'var(--ink-500)' }}>{k}</span>
        <span style={{ color: 'var(--ink-900)', textAlign: 'right', maxWidth: '60%' }}>{v || '—'}</span>
      </div>
    ))}
  </div>
);

const ProgressBar = ({ steps, current }) => (
  <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
    {steps.map((label, i) => (
      <div key={i} style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ height: 4, background: i <= current ? 'var(--accent)' : 'var(--ink-200)', borderRadius: 2, marginBottom: 6 }} />
        <span style={{ fontSize: 11, color: i === current ? 'var(--accent-ink)' : 'var(--ink-500)', fontWeight: i === current ? 600 : 400 }}>{label}</span>
      </div>
    ))}
  </div>
);

const Nav = ({ step, max, onPrev, onNext, onSubmit, saving, submitting, submitLabel = 'Soumettre pour validation' }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
    <button className="btn btn-ghost" onClick={onPrev} disabled={step === 0 || saving || submitting}>← Précédent</button>
    {step < max
      ? <button className="btn btn-accent" onClick={onNext} disabled={saving}>{saving ? 'Sauvegarde…' : 'Suivant →'}</button>
      : <button className="btn btn-accent btn-lg" onClick={onSubmit} disabled={submitting}>{submitting ? 'Envoi…' : submitLabel}</button>}
  </div>
);

const DocumentUploadList = ({ dossierId, documents, setDocuments, required }) => {
  const [uploading, setUploading] = React.useState(null);
  const fileInputs = React.useRef({});

  const onPick = async (typeDocument, label, file) => {
    if (!dossierId) return alert("Le dossier sera créé en cliquant 'Suivant'. Sauvegarde d'abord, puis reviens pour téléverser les pièces.");
    if (!file) return;
    setUploading(typeDocument);
    try {
      const path = `${dossierId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
      const { error } = await window.supabaseClient.storage.from('dossier-docs').upload(path, file, { contentType: file.type || 'application/pdf' });
      if (error) throw error;
      const doc = await window.ComptaAPI.apiFetch(`/api/dossiers/${dossierId}/documents`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, storage_path: path, size_bytes: file.size, mime_type: file.type, doc_type: typeDocument }),
      });
      setDocuments(d => [...d, { ...doc, _label: label }]);
    } catch (e) { alert('Upload échoué : ' + (e.message || e)); }
    finally { setUploading(null); }
  };

  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
      {required.map(req => {
        const uploaded = documents.find(d => d.doc_type === req.typeDocument);
        return (
          <div key={req.typeDocument} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--ink-150)', borderRadius: 8 }}>
            <I.Doc size={18} style={{ color: uploaded ? 'var(--status-green)' : 'var(--ink-400)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{req.label}</div>
              {uploaded
                ? <div style={{ fontSize: 11, color: 'var(--status-green)' }}>✓ {uploaded.name}</div>
                : <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>PDF — Aucun fichier</div>}
            </div>
            <input type="file" accept="application/pdf" style={{ display: 'none' }}
              ref={el => fileInputs.current[req.typeDocument] = el}
              onChange={e => onPick(req.typeDocument, req.label, e.target.files[0])} />
            <button className="btn btn-ghost btn-sm" onClick={() => fileInputs.current[req.typeDocument]?.click()} disabled={uploading === req.typeDocument || !dossierId}>
              {uploading === req.typeDocument ? '…' : uploaded ? 'Remplacer' : 'Choisir'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

const RgsWarning = () => (
  <div style={{ padding: 14, background: '#FEF3C7', borderLeft: '3px solid #F59E0B', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
    <strong>⚠ Signature électronique avancée requise.</strong> Une fois validée en interne, cette formalité nécessite une signature électronique avec un certificat RGS qualifié. L'admin s'en occupera (ou te demandera de signer le PDF de synthèse).
  </div>
);

window.WC = {
  Section, Row, FieldText, FieldTextarea, FieldDate, FieldSelect, FieldCheckbox,
  RecapBlock, ProgressBar, Nav, DocumentUploadList, RgsWarning,
};
