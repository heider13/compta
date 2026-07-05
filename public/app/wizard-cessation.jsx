/* eslint-disable */
// Wizard de cessation d'activité (radiation) auto-entrepreneur — INPI Guichet Unique
// Format API : typeFormalite = "R", typePersonne = "P"
// Exposé via window.WizardCessation
//
// 5 étapes :
//   1. Identification entreprise (SIREN + dénomination)
//   2. Identité du déclarant (preuve d'identité)
//   3. Motif et date de cessation
//   4. Pièces jointes (CNI obligatoire + conditionnelles)
//   5. Récapitulatif + avertissement signature RGS
//
// NB : la cessation requiert une signature électronique avancée (RGS qualifié).
//      Le wizard prépare le dossier en interne ; la signature est traitée par l'admin.

const CESSATION_MOTIFS = [
  { code: 'VOLONTAIRE',   label: 'Cessation volontaire',                      requiresExtraDoc: false },
  { code: 'INVALIDITE',   label: 'Invalidité / incapacité',                   requiresExtraDoc: true,  extraDoc: "Attestation d'invalidité (médecin / CPAM)" },
  { code: 'DECES',        label: 'Décès du déclarant',                        requiresExtraDoc: true,  extraDoc: 'Acte de décès' },
  { code: 'RETRAITE',     label: 'Départ à la retraite',                      requiresExtraDoc: true,  extraDoc: 'Notification de retraite (CARSAT / SSI)' },
  { code: 'VENTE',        label: "Vente / cession du fonds",                  requiresExtraDoc: true,  extraDoc: 'Acte de cession / vente du fonds' },
  { code: 'AUTRE',        label: 'Autre motif (à préciser)',                  requiresExtraDoc: false },
];

const CESSATION_STEPS = [
  { id: 1, label: 'Entreprise' },
  { id: 2, label: 'Déclarant' },
  { id: 3, label: 'Motif' },
  { id: 4, label: 'Pièces' },
  { id: 5, label: 'Récapitulatif' },
];

const RGS_BANNER_TEXT =
  "Cette formalité de cessation nécessite une signature électronique avancée " +
  "avec certificat RGS qualifié. L'étape de signature sera effectuée après validation interne par l'admin.";

// Pièces jointes obligatoires / conditionnelles
const PJ_TYPES_BASE = [
  { code: 'PJ_01', label: "Pièce d'identité (CNI ou passeport)", required: true },
];

function buildPjList(motif) {
  const list = [...PJ_TYPES_BASE];
  const m = CESSATION_MOTIFS.find(x => x.code === motif);
  if (m && m.requiresExtraDoc) {
    list.push({ code: 'PJ_MOTIF', label: m.extraDoc, required: true });
  }
  return list;
}

// ─── Sous-composant UploadField ───────────────────────────────────────
const UploadField = ({ dossierId, pj, onUploaded, uploaded }) => {
  const inputRef = React.useRef(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);

  const onPick = async (e) => {
    setError(null);
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('PDF uniquement');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Fichier > 10 Mo');
      e.target.value = '';
      return;
    }
    if (!dossierId) {
      setError("Brouillon non sauvegardé : remplis l'étape 1 d'abord.");
      e.target.value = '';
      return;
    }
    setBusy(true);
    try {
      const cleanName = file.name.replace(/[^\w.\-]/g, '_');
      const storagePath = `${dossierId}/${Date.now()}-${cleanName}`;
      const { error: upErr } = await window.supabaseClient.storage
        .from('dossier-docs')
        .upload(storagePath, file, { upsert: false, contentType: file.type || 'application/pdf' });
      if (upErr) throw new Error(upErr.message);
      await window.ComptaAPI.apiFetch(`/api/dossiers/${dossierId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          storage_path: storagePath,
          size_bytes: file.size,
          mime_type: file.type || 'application/pdf',
          pj_type: pj.code,
        }),
      });
      onUploaded({ pj_code: pj.code, name: file.name, storage_path: storagePath, size_bytes: file.size });
    } catch (err) {
      setError(err.message || 'Erreur upload');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div style={{ padding: 14, border: '1px solid var(--ink-150)', borderRadius: 10, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {pj.label}{pj.required && <span style={{ color: '#b42318' }}> *</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>
            <span className="mono">{pj.code}</span> · PDF, max 10 Mo
          </div>
          {uploaded && (
            <div style={{ fontSize: 12, color: '#047857', marginTop: 6 }}>
              Téléversé : {uploaded.name} ({(uploaded.size_bytes / 1024).toFixed(0)} Ko)
            </div>
          )}
          {error && <div style={{ fontSize: 12, color: '#b42318', marginTop: 6 }}>{error}</div>}
        </div>
        <input ref={inputRef} type="file" accept="application/pdf" onChange={onPick} style={{ display: 'none' }} />
        <button
          onClick={() => inputRef.current && inputRef.current.click()}
          disabled={busy || !dossierId}
          className={uploaded ? 'btn btn-ghost btn-sm' : 'btn btn-accent btn-sm'}
        >
          {busy ? 'Envoi…' : uploaded ? 'Remplacer' : 'Choisir un fichier'}
        </button>
      </div>
    </div>
  );
};

// ─── Sous-composant Field (réutilisable) ──────────────────────────────
const CField = ({ label, value, onChange, required, mono, placeholder, type, maxLength }) => (
  <div>
    <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>
      {label}{required && <span style={{ color: '#b42318' }}> *</span>}
    </label>
    <input
      type={type || 'text'}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || ''}
      maxLength={maxLength}
      style={{
        width: '100%', padding: '10px 12px',
        border: '1px solid var(--ink-200)', borderRadius: 8,
        fontFamily: mono ? 'Geist Mono, monospace' : 'inherit', fontSize: 14,
      }}
    />
  </div>
);

// ─── Barre de progression ─────────────────────────────────────────────
const ProgressBar = ({ step, onStepClick }) => (
  <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid var(--ink-150)', overflow: 'auto' }}>
    {CESSATION_STEPS.map((s) => {
      const isActive = s.id === step;
      const isCompleted = s.id < step;
      const clickable = !!onStepClick;
      return (
        <button
          key={s.id}
          type="button"
          onClick={clickable ? () => onStepClick(s.id) : undefined}
          disabled={!clickable}
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
            cursor: clickable ? 'pointer' : 'default',
            color: isActive ? 'var(--accent-ink)' : 'var(--ink-600)',
            fontSize: 13,
            fontWeight: isActive ? 600 : 500,
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{
            display: 'inline-grid', placeItems: 'center',
            width: 22, height: 22, borderRadius: '50%',
            background: isCompleted ? 'var(--accent)' : isActive ? 'var(--accent-soft)' : 'var(--ink-100)',
            color: isCompleted ? 'white' : isActive ? 'var(--accent-ink)' : 'var(--ink-500)',
            fontSize: 11, fontWeight: 600,
          }}>{isCompleted ? '✓' : s.id}</span>
          <span>{s.label}</span>
        </button>
      );
    })}
  </div>
);

// ─── Avertissement signature RGS ──────────────────────────────────────
const RgsBanner = ({ large }) => (
  <div style={{
    padding: large ? 20 : 14,
    background: '#FEF3C7',
    border: '1px solid #F59E0B',
    borderRadius: 10,
    marginBottom: 20,
    display: 'flex', gap: 12, alignItems: 'flex-start',
  }}>
    <div style={{ flexShrink: 0, marginTop: 2 }}>
      <svg width={large ? 22 : 18} height={large ? 22 : 18} viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, color: '#92400E', fontSize: large ? 15 : 14, marginBottom: 4 }}>
        Signature électronique avancée requise
      </div>
      <div style={{ fontSize: large ? 14 : 13, color: '#78350F', lineHeight: 1.5 }}>
        {RGS_BANNER_TEXT}
      </div>
    </div>
  </div>
);

// ─── Composant principal ──────────────────────────────────────────────
const WizardCessation = ({ setRoute, dossierId: initialDossierId, onCreated }) => {
  const [step, setStep] = React.useState(1);
  const [dossierId, setDossierId] = React.useState(initialDossierId || null);
  const [savingDraft, setSavingDraft] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [loadingExisting, setLoadingExisting] = React.useState(Boolean(initialDossierId));

  // Données formulaire
  const [form, setForm] = React.useState({
    // Étape 1 — entreprise
    siren: '',
    denomination: '',
    // Étape 2 — déclarant
    nomNaissance: '',
    prenoms: '',
    dateDeNaissance: '',
    lieuNaissanceVille: '',
    lieuNaissancePays: 'FRANCE',
    // Étape 3 — motif & date
    dateCessation: '',
    motifCessation: '',
    descriptionMotif: '',
    persistanceActiviteAgricole: false,
    indicateurMaintienActiviteEnEntreprise: false,
  });

  // Pièces téléversées : { PJ_01: { name, storage_path, size_bytes }, ... }
  const [uploads, setUploads] = React.useState({});

  const update = (k, v) => setForm(s => ({ ...s, [k]: v }));

  // ─── Reprise d'un brouillon ─────────────────────────────────────────
  React.useEffect(() => {
    if (!initialDossierId) return;
    (async () => {
      try {
        const detail = await window.ComptaAPI.fetchDossierDetail(initialDossierId);
        const d = detail.dossier || {};
        const content = d.inpi_content || {};
        const pp = content.personnePhysique || {};
        const ident = (pp.ppRubriqueIdentiteEntreprise && pp.ppRubriqueIdentiteEntreprise.identificationPersonnePhysique) || {};
        const cess = pp.cessationEntreprise || {};
        setForm(prev => ({
          ...prev,
          siren: d.siren || (content._meta && content._meta.siren) || '',
          denomination: d.client_name || '',
          nomNaissance: ident.nomNaissance || '',
          prenoms: Array.isArray(ident.prenoms) ? ident.prenoms.join(' ') : (ident.prenoms || ''),
          dateDeNaissance: ident.dateDeNaissance || '',
          lieuNaissanceVille: (ident.lieuDeNaissance && ident.lieuDeNaissance.ville) || '',
          lieuNaissancePays: (ident.lieuDeNaissance && ident.lieuDeNaissance.pays) || 'FRANCE',
          dateCessation: cess.dateCessation || '',
          motifCessation: cess.motifCessation || '',
          descriptionMotif: cess.descriptionMotif || '',
          persistanceActiviteAgricole: Boolean(cess.persistanceActiviteAgricole),
          indicateurMaintienActiviteEnEntreprise: Boolean(cess.indicateurMaintienActiviteEnEntreprise),
        }));
        // Documents déjà uploadés
        const docs = detail.documents || [];
        const u = {};
        docs.forEach(doc => {
          if (doc.pj_type) {
            u[doc.pj_type] = {
              name: doc.name,
              storage_path: doc.file_path || doc.storage_path,
              size_bytes: doc.size_bytes || 0,
            };
          }
        });
        setUploads(u);
      } catch (e) {
        setError("Impossible de charger le brouillon : " + e.message);
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [initialDossierId]);

  // ─── Construction du payload INPI ───────────────────────────────────
  const buildInpiContent = () => {
    const prenoms = form.prenoms.split(/\s+/).map(p => p.trim()).filter(Boolean);
    return {
      personnePhysique: {
        ppRubriqueIdentiteEntreprise: {
          identificationPersonnePhysique: {
            nomNaissance: form.nomNaissance.trim().toUpperCase(),
            prenoms: prenoms,
            dateDeNaissance: form.dateDeNaissance,
            lieuDeNaissance: {
              ville: form.lieuNaissanceVille.trim(),
              pays: form.lieuNaissancePays.trim().toUpperCase(),
            },
          },
        },
        cessationEntreprise: {
          dateCessation: form.dateCessation,
          motifCessation: form.motifCessation,
          persistanceActiviteAgricole: Boolean(form.persistanceActiviteAgricole),
          indicateurMaintienActiviteEnEntreprise: Boolean(form.indicateurMaintienActiviteEnEntreprise),
          descriptionMotif: form.descriptionMotif || '',
        },
      },
      _meta: {
        siren: form.siren,
        denomination: form.denomination,
        source: 'wizard_cessation_v1',
      },
    };
  };

  // ─── Sauvegarde du brouillon ────────────────────────────────────────
  const saveDraft = async () => {
    setError(null);
    setSavingDraft(true);
    try {
      const inpiContent = buildInpiContent();
      const body = {
        client_name: form.denomination || form.nomNaissance || 'Cessation',
        type_formalite: 'RADIATION',
        siren: form.siren || null,
        inpi_content: inpiContent,
      };
      if (!dossierId) {
        const r = await window.ComptaAPI.apiFetch('/api/dossiers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const newId = r.dossier && r.dossier.id;
        setDossierId(newId);
        return newId;
      } else {
        await window.ComptaAPI.apiFetch(`/api/dossiers/${dossierId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        return dossierId;
      }
    } catch (e) {
      setError("Sauvegarde impossible : " + e.message);
      return null;
    } finally {
      setSavingDraft(false);
    }
  };

  // ─── Validation par étape ───────────────────────────────────────────
  const validateStep = (s) => {
    if (s === 1) {
      if (!/^\d{9}$/.test((form.siren || '').replace(/\s+/g, ''))) return 'SIREN invalide (9 chiffres requis).';
      if (!form.denomination.trim()) return "Dénomination ou nom de l'entrepreneur requis.";
    }
    if (s === 2) {
      if (!form.nomNaissance.trim()) return 'Nom de naissance requis.';
      if (!form.prenoms.trim()) return 'Au moins un prénom requis.';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateDeNaissance || '')) return 'Date de naissance au format YYYY-MM-DD.';
      if (!form.lieuNaissanceVille.trim()) return 'Ville de naissance requise.';
    }
    if (s === 3) {
      if (!form.motifCessation) return 'Motif de cessation requis.';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateCessation || '')) return "Date de cessation au format YYYY-MM-DD.";
      if (form.motifCessation === 'AUTRE' && !form.descriptionMotif.trim()) {
        return "Description requise pour le motif 'Autre'.";
      }
    }
    if (s === 4) {
      const required = buildPjList(form.motifCessation).filter(p => p.required);
      for (const p of required) {
        if (!uploads[p.code]) return `Pièce obligatoire manquante : ${p.label}`;
      }
    }
    return null;
  };

  const onNext = async () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(null);
    // Save draft (après étape 1 surtout pour avoir un dossierId pour les uploads)
    const id = await saveDraft();
    if (!id && !dossierId) return; // bloqué
    setStep(step + 1);
  };

  const onPrev = () => {
    setError(null);
    if (step > 1) setStep(step - 1);
  };

  // ─── Submit final ───────────────────────────────────────────────────
  const onSubmit = async () => {
    setError(null);
    // Toutes les étapes
    for (let s = 1; s <= 4; s++) {
      const err = validateStep(s);
      if (err) { setError(`Étape ${s} : ${err}`); setStep(s); return; }
    }
    setSubmitting(true);
    try {
      const id = await saveDraft();
      if (!id) throw new Error('Sauvegarde brouillon impossible');
      await window.ComptaAPI.apiFetch(`/api/dossiers/${id}/submit`, { method: 'POST' });
      if (typeof onCreated === 'function') onCreated(id);
      else setRoute && setRoute('dossiers');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Rendu ──────────────────────────────────────────────────────────
  if (loadingExisting) {
    return <div className="app-content"><p>Chargement du brouillon…</p></div>;
  }

  return (
    <div className="app-content with-bg">
      <button
        onClick={() => setRoute && setRoute('dossiers')}
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 12 }}
      >
        {window.I && window.I.ChevRight
          ? <window.I.ChevRight size={14} style={{ transform: 'rotate(180deg)' }} />
          : null}
        {' '}Retour à mes dossiers
      </button>

      <div className="page-head">
        <div>
          <h1>Radiation / Cessation d'activité</h1>
          <p>Auto-entrepreneur — on vous accompagne pas à pas (étape {step} / {CESSATION_STEPS.length})</p>
        </div>
      </div>

      <div style={{ maxWidth: 760 }}>
        <ProgressBar step={step} onStepClick={async (i) => { try { await saveDraft(); } catch {} setStep(i); }} />

        {step === 1 && <RgsBanner />}

        {error && (
          <div style={{
            color: '#b42318',
            background: '#FEE4E2',
            border: '1px solid #FECDCA',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* ─── Étape 1 ─── */}
        {step === 1 && (
          <div className="app-card" style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>Votre entreprise</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 18 }}>
              Indiquez le SIREN et le nom : ce sont les seules infos nécessaires pour retrouver l'entreprise.
            </p>
            <div style={{ display: 'grid', gap: 14 }}>
              <CField
                label="SIREN"
                value={form.siren}
                onChange={v => update('siren', v.replace(/\D/g, '').slice(0, 9))}
                required
                mono
                placeholder="9 chiffres — ex : 123456789"
                maxLength={9}
              />
              <CField
                label="Dénomination ou nom de l'entrepreneur (auto-entrepreneur)"
                value={form.denomination}
                onChange={v => update('denomination', v)}
                required
                placeholder="Ex : Jean Dupont"
              />
            </div>
          </div>
        )}

        {/* ─── Étape 2 ─── */}
        {step === 2 && (
          <div className="app-card" style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>Identité du déclarant</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 18 }}>
              Ces informations servent de preuve d'identité et doivent correspondre à la pièce d'identité jointe.
            </p>
            <div style={{ display: 'grid', gap: 14 }}>
              <CField
                label="Nom de naissance"
                value={form.nomNaissance}
                onChange={v => update('nomNaissance', v)}
                required
                placeholder="DUPONT"
              />
              <CField
                label="Prénom(s) (séparés par un espace)"
                value={form.prenoms}
                onChange={v => update('prenoms', v)}
                required
                placeholder="Jean Pierre"
              />
              <CField
                label="Date de naissance"
                value={form.dateDeNaissance}
                onChange={v => update('dateDeNaissance', v)}
                required
                type="date"
                mono
              />
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <CField
                  label="Ville de naissance"
                  value={form.lieuNaissanceVille}
                  onChange={v => update('lieuNaissanceVille', v)}
                  required
                  placeholder="Paris"
                />
                <CField
                  label="Pays"
                  value={form.lieuNaissancePays}
                  onChange={v => update('lieuNaissancePays', v)}
                  placeholder="FRANCE"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── Étape 3 ─── */}
        {step === 3 && (
          <div className="app-card" style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>Motif et date de cessation</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 18 }}>
              Indiquez la date à laquelle l'activité s'arrête, et pourquoi.
            </p>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>
                  Motif de cessation <span style={{ color: '#b42318' }}>*</span>
                </label>
                <select
                  value={form.motifCessation}
                  onChange={e => update('motifCessation', e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: '1px solid var(--ink-200)', borderRadius: 8,
                    fontFamily: 'inherit', fontSize: 14, background: 'white',
                  }}
                >
                  <option value="">— Sélectionner un motif —</option>
                  {CESSATION_MOTIFS.map(m => (
                    <option key={m.code} value={m.code}>{m.label}</option>
                  ))}
                </select>
              </div>

              <CField
                label="Date d'effet de la cessation"
                value={form.dateCessation}
                onChange={v => update('dateCessation', v)}
                required
                type="date"
                mono
              />

              {form.motifCessation === 'AUTRE' && (
                <div>
                  <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>
                    Description du motif <span style={{ color: '#b42318' }}>*</span>
                  </label>
                  <textarea
                    value={form.descriptionMotif}
                    onChange={e => update('descriptionMotif', e.target.value)}
                    placeholder="Précisez le motif…"
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 12px',
                      border: '1px solid var(--ink-200)', borderRadius: 8,
                      fontFamily: 'inherit', fontSize: 14, resize: 'vertical',
                    }}
                  />
                </div>
              )}

              {form.motifCessation && form.motifCessation !== 'AUTRE' && (
                <div>
                  <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>
                    Complément d'information (optionnel)
                  </label>
                  <textarea
                    value={form.descriptionMotif}
                    onChange={e => update('descriptionMotif', e.target.value)}
                    placeholder="Précisions éventuelles…"
                    rows={2}
                    style={{
                      width: '100%', padding: '10px 12px',
                      border: '1px solid var(--ink-200)', borderRadius: 8,
                      fontFamily: 'inherit', fontSize: 14, resize: 'vertical',
                    }}
                  />
                </div>
              )}

              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: 12, border: '1px solid var(--ink-150)', borderRadius: 8, cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={form.persistanceActiviteAgricole}
                  onChange={e => update('persistanceActiviteAgricole', e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Maintien d'une activité agricole (MSA)</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>
                    Cocher si le déclarant conserve une activité agricole déclarée à la MSA après la cessation.
                  </div>
                </div>
              </label>

              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: 12, border: '1px solid var(--ink-150)', borderRadius: 8, cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={form.indicateurMaintienActiviteEnEntreprise}
                  onChange={e => update('indicateurMaintienActiviteEnEntreprise', e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Maintien d'une activité en entreprise</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>
                    Cas particulier : l'entrepreneur conserve une activité non radiée (rare).
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ─── Étape 4 ─── */}
        {step === 4 && (
          <div className="app-card" style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>Pièces jointes</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 18 }}>
              PDF uniquement, 10 Mo maximum par fichier. Les pièces marquées d'un{' '}
              <span style={{ color: '#b42318' }}>*</span> sont obligatoires.
            </p>
            {!dossierId && (
              <div style={{
                padding: 10, marginBottom: 12, fontSize: 13,
                background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, color: '#92400E',
              }}>
                Le brouillon n'a pas pu être créé. Reviens à l'étape 1 et valide-la pour permettre l'upload.
              </div>
            )}
            {buildPjList(form.motifCessation).map(pj => (
              <UploadField
                key={pj.code}
                dossierId={dossierId}
                pj={pj}
                uploaded={uploads[pj.code]}
                onUploaded={(u) => setUploads(prev => ({ ...prev, [pj.code]: u }))}
              />
            ))}
          </div>
        )}

        {/* ─── Étape 5 — Récap ─── */}
        {step === 5 && (
          <div>
            <RgsBanner large />

            <div className="app-card" style={{ padding: 24, marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, marginBottom: 18 }}>Récapitulatif de la cessation</h3>

              <SummarySection title="Entreprise">
                <SummaryRow label="SIREN" value={<span className="mono">{form.siren || '—'}</span>} />
                <SummaryRow label="Dénomination" value={form.denomination || '—'} />
              </SummarySection>

              <SummarySection title="Déclarant">
                <SummaryRow label="Nom de naissance" value={form.nomNaissance || '—'} />
                <SummaryRow label="Prénom(s)" value={form.prenoms || '—'} />
                <SummaryRow label="Date de naissance" value={form.dateDeNaissance || '—'} />
                <SummaryRow label="Lieu de naissance" value={`${form.lieuNaissanceVille || '—'} (${form.lieuNaissancePays || '—'})`} />
              </SummarySection>

              <SummarySection title="Cessation">
                <SummaryRow
                  label="Motif"
                  value={(CESSATION_MOTIFS.find(m => m.code === form.motifCessation) || {}).label || '—'}
                />
                <SummaryRow label="Date d'effet" value={form.dateCessation || '—'} />
                {form.descriptionMotif && <SummaryRow label="Description" value={form.descriptionMotif} />}
                <SummaryRow
                  label="Activité agricole maintenue"
                  value={form.persistanceActiviteAgricole ? 'Oui' : 'Non'}
                />
                <SummaryRow
                  label="Activité entreprise maintenue"
                  value={form.indicateurMaintienActiviteEnEntreprise ? 'Oui' : 'Non'}
                />
              </SummarySection>

              <SummarySection title="Pièces jointes" last>
                {buildPjList(form.motifCessation).map(pj => (
                  <SummaryRow
                    key={pj.code}
                    label={<span><span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{pj.code}</span> {pj.label}</span>}
                    value={uploads[pj.code]
                      ? <span style={{ color: '#047857' }}>{uploads[pj.code].name}</span>
                      : <span style={{ color: '#b42318' }}>Manquante</span>}
                  />
                ))}
              </SummarySection>
            </div>

            <div className="app-card" style={{ padding: 18, marginBottom: 16, background: 'var(--ink-50)' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.5 }}>
                En cliquant sur <strong>Soumettre pour validation</strong>, ton dossier sera transmis à un
                administrateur pour contrôle. La <strong>signature électronique avancée (RGS)</strong> sera
                réalisée après cette validation interne, avant transmission à l'INPI.
              </div>
            </div>
          </div>
        )}

        {/* ─── Boutons navigation ─── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8 }}>
          <button
            onClick={onPrev}
            disabled={step === 1 || submitting || savingDraft}
            className="btn btn-ghost"
          >
            Précédent
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
            {step < CESSATION_STEPS.length && (
              <button
                onClick={onNext}
                disabled={submitting || savingDraft}
                className="btn btn-accent btn-lg"
              >
                {savingDraft ? 'Sauvegarde…' : 'Étape suivante'}
              </button>
            )}
            {step === CESSATION_STEPS.length && (
              <button
                onClick={onSubmit}
                disabled={submitting || savingDraft}
                className="btn btn-accent btn-lg"
              >
                {submitting ? 'Envoi…' : 'Soumettre pour validation'}
              </button>
            )}
          </div>
        </div>

        {dossierId && (
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--ink-500)', textAlign: 'right' }}>
            Brouillon sauvegardé · <span className="mono">{dossierId.slice(0, 8)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sous-composants récap ────────────────────────────────────────────
const SummarySection = ({ title, children, last }) => (
  <div style={{ marginBottom: last ? 0 : 20, paddingBottom: last ? 0 : 16, borderBottom: last ? 'none' : '1px solid var(--ink-150)' }}>
    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-500)', fontWeight: 600, marginBottom: 10 }}>
      {title}
    </div>
    <div style={{ display: 'grid', gap: 8 }}>{children}</div>
  </div>
);

const SummaryRow = ({ label, value }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, fontSize: 14 }}>
    <div style={{ color: 'var(--ink-500)' }}>{label}</div>
    <div style={{ color: 'var(--ink-900)' }}>{value}</div>
  </div>
);

window.WizardCessation = WizardCessation;
