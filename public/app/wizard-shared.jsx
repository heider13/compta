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

// Tabs cliquables avec indicateurs de complétion (○ pour à faire, ✓ pour fait).
// Le step courant est surligné, les steps précédents sont marqués complétés
// et restent cliquables. Les steps futurs sont cliquables aussi (navigation libre).
const ProgressBar = ({ steps, current, onStepClick, completedSteps }) => (
  <div style={{
    display: 'flex',
    gap: 2,
    marginBottom: 24,
    borderBottom: '1px solid var(--ink-150)',
    overflow: 'auto',
  }}>
    {steps.map((label, i) => {
      const isActive = i === current;
      const isCompleted = completedSteps ? completedSteps.includes(i) : i < current;
      const isClickable = !!onStepClick;
      return (
        <button
          key={i}
          type="button"
          onClick={isClickable ? () => onStepClick(i) : undefined}
          disabled={!isClickable}
          style={{
            flex: '0 0 auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1,
            cursor: isClickable ? 'pointer' : 'default',
            color: isActive ? 'var(--accent-ink)' : 'var(--ink-600)',
            fontSize: 13,
            fontWeight: isActive ? 600 : 500,
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            transition: 'color .12s ease, border-color .12s ease',
          }}
        >
          <span style={{
            display: 'inline-grid',
            placeItems: 'center',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: isCompleted ? 'var(--accent)' : isActive ? 'var(--accent-soft)' : 'var(--ink-100)',
            color: isCompleted ? 'white' : isActive ? 'var(--accent-ink)' : 'var(--ink-500)',
            fontSize: 11,
            fontWeight: 600,
          }}>
            {isCompleted ? '✓' : (i + 1)}
          </span>
          <span>{label}</span>
        </button>
      );
    })}
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

// ─── Scan de pièce d'identité (OCR) — recto + verso ────────────────────
// Deux emplacements : recto (infos imprimées) et verso (zone MRZ sur la CNI
// 2021). Chaque face est analysée dès son upload ; les résultats sont
// fusionnés avec priorité au MRZ (méthode la plus fiable), et
// onExtracted(fieldsFusionnés) est rappelé après chaque analyse.
// Les images ne sont PAS conservées côté serveur.
const OCR_METHOD_SCORE = { mrz: 3, mrz_partial: 2, heuristic: 1, none: 0 };

const OcrSlot = ({ side, label, state, onPick }) => {
  const inputRef = React.useRef(null);
  const icons = { idle: '📷', loading: '⏳', done: '✅', error: '⚠️' };
  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment"
        style={{ display: 'none' }} ref={inputRef}
        onChange={e => { onPick(side, e.target.files[0]); e.target.value = ''; }} />
      <button type="button" className="btn btn-ghost"
        onClick={() => inputRef.current?.click()}
        disabled={state.status === 'loading'}
        style={{
          width: '100%', justifyContent: 'center', padding: '13px 12px', fontSize: 13,
          border: `1.5px dashed ${state.status === 'done' ? 'var(--status-green, #137333)' : 'var(--accent)'}`,
          color: state.status === 'done' ? 'var(--status-green, #137333)' : 'var(--accent-ink)',
        }}>
        {icons[state.status]} {state.status === 'loading' ? 'Analyse…' : state.status === 'done' ? `${label} lu` : label}
      </button>
    </div>
  );
};

const IdentityOcrUpload = ({ onExtracted, label = 'Scanner une pièce d\'identité' }) => {
  const [slots, setSlots] = React.useState({
    recto: { status: 'idle' },
    verso: { status: 'idle' },
  });
  const [message, setMessage] = React.useState(null);
  // Résultats par face pour la fusion — ref pour éviter les courses entre
  // deux analyses simultanées.
  const resultsRef = React.useRef({});

  const setSlot = (side, patch) =>
    setSlots(s => ({ ...s, [side]: { ...s[side], ...patch } }));

  const mergeAndEmit = () => {
    // Trie les faces par fiabilité croissante puis superpose : les champs
    // de la méthode la plus fiable (MRZ) écrasent ceux du texte libre.
    const parts = Object.values(resultsRef.current)
      .filter(r => r && r.fields)
      .sort((a, b) => (OCR_METHOD_SCORE[a.method] || 0) - (OCR_METHOD_SCORE[b.method] || 0));
    if (!parts.length) return null;
    const merged = {};
    for (const p of parts) {
      for (const [k, v] of Object.entries(p.fields)) {
        if (v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)) {
          merged[k] = v;
        }
      }
    }
    onExtracted(merged);
    return merged;
  };

  const onPick = async (side, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ tone: 'error', text: 'Fichier trop lourd (max 10 Mo).' });
      return;
    }
    setSlot(side, { status: 'loading' });
    setMessage({ tone: 'info', text: `Analyse du ${side} en cours… (10-20 s)` });
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await window.ComptaAPI.apiFetch('/api/ocr/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      resultsRef.current[side] = result;
      setSlot(side, { status: 'done' });
      const merged = mergeAndEmit();
      const nomComplet = merged ? [merged.prenoms?.join(' '), merged.nom].filter(Boolean).join(' ') : '';
      setMessage({
        tone: 'ok',
        text: `✓ ${side.charAt(0).toUpperCase() + side.slice(1)} lu${nomComplet ? ` — ${nomComplet}` : ''}. Vérifiez les champs préremplis.`,
      });
    } catch (e) {
      console.warn(`[ocr] échec extraction ${side} :`, e.message || e);
      setSlot(side, { status: 'error' });
      const detail = e.status === 422
        ? `Lecture du ${side} impossible. Photo nette, à plat${side === 'verso' ? ', les lignes MRZ (chevrons <<<) bien visibles' : ''}. Vous pouvez réessayer ou scanner l'autre face.`
        : (e.message || 'Erreur inconnue');
      setMessage({ tone: 'error', text: detail });
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-700)', marginBottom: 8 }}>
        📷 {label} <span style={{ fontWeight: 400, color: 'var(--ink-500)' }}>— photo ou PDF, chaque face analysée automatiquement</span>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <OcrSlot side="recto" label="Recto" state={slots.recto} onPick={onPick} />
        <OcrSlot side="verso" label="Verso (lignes <<< )" state={slots.verso} onPick={onPick} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 6 }}>
        CNI récente : la zone MRZ (la plus fiable) est au <strong>verso</strong>. Passeport : tout est sur la page photo → utilisez « Recto ».
      </div>
      {message && (
        <div style={{
          marginTop: 8, fontSize: 12, padding: '8px 10px', borderRadius: 6,
          background: message.tone === 'error' ? '#FEE2E2' : message.tone === 'ok' ? 'rgba(19,115,51,0.08)' : 'var(--ink-50)',
          color: message.tone === 'error' ? '#b42318' : message.tone === 'ok' ? 'var(--status-green, #137333)' : 'var(--ink-600)',
        }}>
          {message.text}
        </div>
      )}
    </div>
  );
};

// ─── Analyse d'un document déposé (PV d'AG, statuts…) ──────────────────
// Le formaliste dépose un PDF / image / Word ; l'agent en extrait les données
// structurées (décisions, dirigeants, capital, siège…) via /api/ocr/document.
// onExtracted(fields) reçoit l'objet structuré pour pré-remplir le wizard.
const DocExtractUpload = ({ label, docType, onExtracted }) => {
  const [state, setState] = React.useState({ status: 'idle', message: null, result: null });
  const inputRef = React.useRef(null);

  const onPick = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setState({ status: 'error', message: 'Fichier trop lourd (max 20 Mo).', result: null });
      return;
    }
    setState({ status: 'loading', message: `Analyse de « ${file.name} »… (10-30 s)`, result: null });
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await window.ComptaAPI.apiFetch('/api/ocr/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, filename: file.name, docType: docType || undefined }),
      });
      const fields = res.fields || {};
      const nbDecisions = (fields.decisions || []).length;
      const typeLabel = { statuts: 'Statuts', pv_ag: "PV d'assemblée", traite_cession: 'Traité de cession' }[res.documentType] || 'Document';
      if (onExtracted) onExtracted(fields, res);
      setState({
        status: 'done',
        result: fields,
        message: `✓ ${typeLabel} analysé (${{ 'pdf-text': 'PDF', 'pdf-ocr': 'PDF scanné OCR', 'image-ocr': 'image OCR', docx: 'Word' }[res.source] || res.source})${nbDecisions ? ` — ${nbDecisions} décision(s) détectée(s)` : ''}. Vérifiez les champs.`,
      });
    } catch (err) {
      const detail = err.data?.detail || err.message || 'Analyse impossible.';
      const hint = err.status === 503 ? ' (service IA non configuré — rechargez le crédit Anthropic)' : '';
      setState({ status: 'error', message: detail + hint, result: null });
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const r = state.result;
  return (
    <div style={{
      marginBottom: 20, padding: 16, borderRadius: 12,
      background: 'linear-gradient(135deg, var(--accent-soft, #ECE6FF), #F5F2FF)',
      border: '1px solid var(--accent, #5B36D6)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, fontWeight: 700, color: 'var(--accent-ink, #4827B0)' }}>
        📎 {label || 'Analyser un document (PV, statuts…)'}
        <span style={{ fontWeight: 400, color: 'var(--ink-500)' }}>— PDF, image ou Word</span>
      </div>
      <label className="btn btn-accent btn-sm" style={{ cursor: 'pointer', display: 'inline-flex' }}>
        {state.status === 'loading' ? '⏳ Analyse…' : 'Déposer un document'}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.docx,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: 'none' }}
          disabled={state.status === 'loading'}
          onChange={onPick}
        />
      </label>
      {state.message && (
        <div style={{
          marginTop: 8, fontSize: 12, padding: '8px 10px', borderRadius: 6,
          background: state.status === 'error' ? '#FEE2E2' : state.status === 'done' ? 'rgba(19,115,51,0.08)' : 'var(--ink-50)',
          color: state.status === 'error' ? '#b42318' : state.status === 'done' ? 'var(--status-green, #137333)' : 'var(--ink-600)',
        }}>
          {state.message}
        </div>
      )}
      {r && (r.decisions || []).length > 0 && (
        <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--ink-700)' }}>
          {r.decisions.slice(0, 6).map((d, i) => (
            <li key={i}><strong>{d.type}</strong> — {d.resume}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ─── Pré-remplissage IA de la formalité ────────────────────────────────
// L'utilisateur décrit l'opération en langage naturel ; l'agent extrait un
// JSON normalisé que le wizard mappe dans son état via onPrefill(data).
// Affiché en tête du wizard pour minimiser la saisie manuelle.
const AiPrefill = ({ formeJuridique, onPrefill }) => {
  const [brief, setBrief] = React.useState('');
  const [state, setState] = React.useState({ status: 'idle', message: null });

  const run = async () => {
    if (!brief.trim() || state.status === 'loading') return;
    setState({ status: 'loading', message: "L'agent analyse votre description…" });
    try {
      const res = await window.ComptaAPI.apiFetch('/api/ai/prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formeJuridique, brief }),
      });
      const data = res.data || {};
      onPrefill(data);
      const manque = (data.champsManquants || []).length;
      setState({
        status: 'done',
        message: `✓ Champs pré-remplis.${manque ? ' À compléter : ' + data.champsManquants.slice(0, 6).join(', ') + '.' : ''} Vérifiez avant de continuer.`,
      });
    } catch (e) {
      setState({ status: 'error', message: e.message || 'Analyse impossible.' });
    }
  };

  return (
    <div style={{
      marginBottom: 20, padding: 16, borderRadius: 12,
      background: 'linear-gradient(135deg, var(--accent-soft, #ECE6FF), #F5F2FF)',
      border: '1px solid var(--accent, #5B36D6)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, fontWeight: 700, color: 'var(--accent-ink, #4827B0)' }}>
        ✨ Pré-remplissage par l'IA
        <span style={{ fontWeight: 400, color: 'var(--ink-500)' }}>— décrivez l'opération, l'agent remplit</span>
      </div>
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={3}
        placeholder="Ex : Créer une SASU pour Jean Dupont, capital 1000 €, activité de conseil en informatique, siège au 12 rue de la Paix 75002 Paris, président Jean Dupont."
        style={{ width: '100%', padding: 10, border: '1px solid var(--ink-200)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, resize: 'vertical' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <button type="button" className="btn btn-accent btn-sm" onClick={run} disabled={state.status === 'loading' || !brief.trim()}>
          {state.status === 'loading' ? '⏳ Analyse…' : 'Remplir avec l\'IA'}
        </button>
        {state.message && (
          <span style={{ fontSize: 12, color: state.status === 'error' ? '#b42318' : state.status === 'done' ? 'var(--status-green, #137333)' : 'var(--ink-600)' }}>
            {state.message}
          </span>
        )}
      </div>
    </div>
  );
};

window.WC = {
  Section, Row, FieldText, FieldTextarea, FieldDate, FieldSelect, FieldCheckbox,
  RecapBlock, ProgressBar, Nav, DocumentUploadList, RgsWarning, IdentityOcrUpload, AiPrefill,
  DocExtractUpload,
};
