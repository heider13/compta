/* eslint-disable */
// Wizard de création d'auto-entrepreneur — 6 étapes, save DRAFT par étape, conforme schema INPI

const STEPS_CREA = ['Identité', 'Domicile', 'Activité', 'Établissement', 'Options', 'Récap'];

const NATIONALITES = [
  { code: 'FRA', label: 'Française' }, { code: 'BEL', label: 'Belge' }, { code: 'CHE', label: 'Suisse' },
  { code: 'ITA', label: 'Italienne' }, { code: 'ESP', label: 'Espagnole' }, { code: 'PRT', label: 'Portugaise' },
  { code: 'DEU', label: 'Allemande' }, { code: 'MAR', label: 'Marocaine' }, { code: 'DZA', label: 'Algérienne' },
  { code: 'TUN', label: 'Tunisienne' }, { code: 'GBR', label: 'Britannique' }, { code: 'USA', label: 'Américaine' },
];

const SIT_MATRIMONIALE = [
  { code: 'C', label: 'Célibataire' }, { code: 'M', label: 'Marié(e)' }, { code: 'P', label: 'Pacsé(e)' },
  { code: 'D', label: 'Divorcé(e)' }, { code: 'V', label: 'Veuf/Veuve' },
];

const initContent = () => ({
  personnePhysique: {
    ppRubriqueIdentiteEntreprise: {
      identificationPersonnePhysique: {
        nomNaissance: '', nomUsage: '', prenoms: [''],
        dateDeNaissance: '', lieuDeNaissance: { commune: '', codePostal: '', codePays: 'FRA', paysNaissance: 'France' },
        codeNationalite: 'FRA', sexe: 'M',
        blocAdresse: {
          adresse: { voie: '', complement: '', codePostal: '', commune: '', codePays: 'FRA', codeInseeCommune: '' },
          domiciliataire: false,
        },
      },
      descriptionPersonne: { situationMatrimoniale: 'C', nirAvis: '' },
    },
    ppRubriqueComposition: {
      optionMicroSocial: { dateEffet: '', indicateurMicroSocial: true },
      optionMicroFiscal: { indicateurMicroFiscal: false, dateEffet: '' },
      indicateurACRE: false,
    },
    ppRubriqueEtablissement: {
      etablissementPrincipal: {
        descriptionEtablissement: { rolePourEntreprise: 2, indicateurEtablissementPrincipal: true, indicateurPrincipal: true },
        adresse: { voie: '', complement: '', codePostal: '', commune: '', codePays: 'FRA', codeInseeCommune: '' },
        adresseIdentiqueDomicile: true,
        activites: [{ codeApe: '', descriptionDetaillee: '', dateDebutActivite: '', indicateurAmbulant: false, indicateurPrincipal: true }],
        caracteristiques: { indicateurExerciceADomicile: true, indicateurEntrepriseDomiciliataire: false },
      },
    },
    ppRubriqueOptionsFiscales: {
      regimeFiscal: { regime: 'BIC', classification: 'MICRO' },
      optionTVA: { regimeTVA: 'FRANCHISE_BASE' },
    },
  },
});

const WizardCreation = ({ setRoute, dossierId: initialDossierId, onCreated, demoMode = false }) => {
  const [step, setStep] = React.useState(0);
  const [content, setContent] = React.useState(() => {
    if (demoMode) {
      try {
        const saved = localStorage.getItem('compta_demo_wizard_creation');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return initContent();
  });
  const [dossierId, setDossierId] = React.useState(initialDossierId || null);
  const [reference, setReference] = React.useState(null);
  const [documents, setDocuments] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  // Reprise d'un brouillon (mode authentifié uniquement)
  React.useEffect(() => {
    if (demoMode || !initialDossierId) return;
    (async () => {
      try {
        const { dossier, documents: docs } = await window.ComptaAPI.fetchDossierDetail(initialDossierId);
        if (dossier.inpi_content?.personnePhysique) setContent(dossier.inpi_content);
        setReference(dossier.reference);
        setDocuments(docs || []);
      } catch (e) { console.error(e); }
    })();
  }, [initialDossierId, demoMode]);

  const id = content.personnePhysique.ppRubriqueIdentiteEntreprise.identificationPersonnePhysique;
  const ident = content.personnePhysique.ppRubriqueIdentiteEntreprise.identificationPersonnePhysique;
  const desc = content.personnePhysique.ppRubriqueIdentiteEntreprise.descriptionPersonne;
  const compo = content.personnePhysique.ppRubriqueComposition;
  const etab = content.personnePhysique.ppRubriqueEtablissement.etablissementPrincipal;
  const fisc = content.personnePhysique.ppRubriqueOptionsFiscales;

  const setIdent = (patch) => setContent(c => ({ ...c, personnePhysique: { ...c.personnePhysique,
    ppRubriqueIdentiteEntreprise: { ...c.personnePhysique.ppRubriqueIdentiteEntreprise,
      identificationPersonnePhysique: { ...c.personnePhysique.ppRubriqueIdentiteEntreprise.identificationPersonnePhysique, ...patch }
    } } }));
  const setIdentAdresse = (patch) => setIdent({ blocAdresse: { ...ident.blocAdresse, adresse: { ...ident.blocAdresse.adresse, ...patch } } });
  const setLieuNaissance = (patch) => setIdent({ lieuDeNaissance: { ...ident.lieuDeNaissance, ...patch } });
  const setDesc = (patch) => setContent(c => ({ ...c, personnePhysique: { ...c.personnePhysique,
    ppRubriqueIdentiteEntreprise: { ...c.personnePhysique.ppRubriqueIdentiteEntreprise,
      descriptionPersonne: { ...c.personnePhysique.ppRubriqueIdentiteEntreprise.descriptionPersonne, ...patch }
    } } }));
  const setCompo = (patch) => setContent(c => ({ ...c, personnePhysique: { ...c.personnePhysique,
    ppRubriqueComposition: { ...c.personnePhysique.ppRubriqueComposition, ...patch } } }));
  const setEtab = (patch) => setContent(c => ({ ...c, personnePhysique: { ...c.personnePhysique,
    ppRubriqueEtablissement: { etablissementPrincipal: { ...c.personnePhysique.ppRubriqueEtablissement.etablissementPrincipal, ...patch } } } }));
  const setEtabAdresse = (patch) => setEtab({ adresse: { ...etab.adresse, ...patch } });
  const setEtabActivite = (patch) => setEtab({ activites: [{ ...etab.activites[0], ...patch }] });
  const setFisc = (patch) => setContent(c => ({ ...c, personnePhysique: { ...c.personnePhysique, ppRubriqueOptionsFiscales: { ...c.personnePhysique.ppRubriqueOptionsFiscales, ...patch } } }));

  const computedClientName = () => {
    const fn = (ident.prenoms[0] || '').trim();
    const ln = (ident.nomUsage || ident.nomNaissance || '').trim();
    return (fn || ln) ? `${fn} ${ln}`.trim() : '';
  };

  const saveDraft = async () => {
    setSaving(true); setError(null);
    try {
      let payload = content;
      if (etab.adresseIdentiqueDomicile) {
        payload = { ...content, personnePhysique: { ...content.personnePhysique,
          ppRubriqueEtablissement: { etablissementPrincipal: { ...etab, adresse: { ...ident.blocAdresse.adresse } } } } };
      }
      if (demoMode) {
        try { localStorage.setItem('compta_demo_wizard_creation', JSON.stringify(payload)); } catch {}
      } else if (!dossierId) {
        const cn = computedClientName() || 'Nouveau dossier';
        const r = await window.ComptaAPI.apiFetch('/api/dossiers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: cn, type_formalite: 'CREATION', inpi_content: payload }),
        });
        setDossierId(r.dossier.id); setReference(r.dossier.reference);
      } else {
        await window.ComptaAPI.apiFetch(`/api/dossiers/${dossierId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: computedClientName(), inpi_content: payload }),
        });
      }
    } catch (e) { setError(e.message); throw e; }
    finally { setSaving(false); }
  };

  const next = async () => { try { await saveDraft(); setStep(s => s + 1); } catch {} };
  const prev = () => setStep(s => Math.max(0, s - 1));

  const submit = async () => {
    if (demoMode) {
      try { localStorage.setItem('compta_demo_wizard_creation', JSON.stringify(content)); } catch {}
      window.location.href = 'auth/signup.html';
      return;
    }
    if (!dossierId) return setError('Sauvegarde requise avant soumission');
    setSubmitting(true); setError(null);
    try {
      await saveDraft();
      await window.ComptaAPI.apiFetch(`/api/dossiers/${dossierId}/submit`, { method: 'POST' });
      if (onCreated) onCreated();
      else setRoute('dossiers');
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ maxWidth: 820 }}>
      <ProgressBar steps={STEPS_CREA} current={step} onStepClick={async (i) => { try { await saveDraft(); } catch {} setStep(i); }} />
      {error && <div style={{ color: '#b42318', padding: 12, marginBottom: 12, fontSize: 13, background: '#FEE2E2', borderRadius: 8 }}>{error}</div>}

      {step === 0 && (
        <Section title="Identité du déclarant">
          <Row>
            <FieldText label="Nom de naissance *" value={ident.nomNaissance} onChange={v => setIdent({ nomNaissance: v.toUpperCase() })} />
            <FieldText label="Nom d'usage (si différent)" value={ident.nomUsage} onChange={v => setIdent({ nomUsage: v.toUpperCase() })} />
          </Row>
          <FieldList label="Prénom(s) *" values={ident.prenoms} onChange={vs => setIdent({ prenoms: vs })} />
          <Row>
            <FieldDate label="Date de naissance *" value={ident.dateDeNaissance} onChange={v => setIdent({ dateDeNaissance: v })} />
            <FieldSelect label="Sexe *" value={ident.sexe} onChange={v => setIdent({ sexe: v })} options={[{ value: 'M', label: 'Homme' }, { value: 'F', label: 'Femme' }]} />
          </Row>
          <Row>
            <FieldText label="Commune de naissance *" value={ident.lieuDeNaissance.commune} onChange={v => setLieuNaissance({ commune: v })} />
            <FieldText label="Code postal naissance" value={ident.lieuDeNaissance.codePostal} onChange={v => setLieuNaissance({ codePostal: v })} mono />
          </Row>
          <Row>
            <FieldText label="Pays de naissance *" value={ident.lieuDeNaissance.paysNaissance} onChange={v => setLieuNaissance({ paysNaissance: v })} />
            <FieldSelect label="Nationalité *" value={ident.codeNationalite} onChange={v => setIdent({ codeNationalite: v })} options={NATIONALITES.map(n => ({ value: n.code, label: n.label }))} />
          </Row>
          <Row>
            <FieldSelect label="Situation matrimoniale" value={desc.situationMatrimoniale} onChange={v => setDesc({ situationMatrimoniale: v })} options={SIT_MATRIMONIALE.map(s => ({ value: s.code, label: s.label }))} />
            <FieldText label="NIR (n° sécurité sociale)" value={desc.nirAvis} onChange={v => setDesc({ nirAvis: v.replace(/\s/g, '') })} mono maxLength={15} />
          </Row>
        </Section>
      )}

      {step === 1 && (
        <Section title="Domicile personnel" subtitle="Adresse où vous résidez. Cette adresse peut servir d'adresse d'établissement.">
          <FieldText label="N° et voie *" value={ident.blocAdresse.adresse.voie} onChange={v => setIdentAdresse({ voie: v })} />
          <FieldText label="Complément (bât, étage…)" value={ident.blocAdresse.adresse.complement} onChange={v => setIdentAdresse({ complement: v })} />
          <Row>
            <FieldText label="Code postal *" value={ident.blocAdresse.adresse.codePostal} onChange={v => setIdentAdresse({ codePostal: v })} mono maxLength={5} />
            <FieldText label="Commune *" value={ident.blocAdresse.adresse.commune} onChange={v => setIdentAdresse({ commune: v })} />
          </Row>
          <FieldText label="Code INSEE commune (optionnel)" value={ident.blocAdresse.adresse.codeInseeCommune} onChange={v => setIdentAdresse({ codeInseeCommune: v })} mono maxLength={5} />
          <DocumentUploadList dossierId={dossierId} documents={documents} setDocuments={setDocuments} demoMode={demoMode} required={[
            { typeDocument: 'PJ_01', label: "Pièce d'identité (CNI, passeport)" },
            { typeDocument: 'PJ_02', label: "Justificatif de domicile (< 3 mois)" },
            { typeDocument: 'PJ_03', label: "Déclaration sur l'honneur de non-condamnation" },
          ]} />
        </Section>
      )}

      {step === 2 && (
        <Section title="Activité">
          <FieldText label="Code APE/NAF *" value={etab.activites[0].codeApe} onChange={v => setEtabActivite({ codeApe: v.toUpperCase().replace(/\s/g, '') })} mono maxLength={5} placeholder="6202A" />
          <div>
            <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>Description détaillée de l'activité *</label>
            <textarea
              value={etab.activites[0].descriptionDetaillee}
              onChange={e => setEtabActivite({ descriptionDetaillee: e.target.value })}
              rows={3} placeholder="Ex: Conseil en stratégie informatique pour PME…"
              style={{ width: '100%', padding: 10, border: '1px solid var(--ink-200)', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, resize: 'vertical' }}
            />
          </div>
          <Row>
            <FieldDate label="Date de début d'activité *" value={etab.activites[0].dateDebutActivite} onChange={v => setEtabActivite({ dateDebutActivite: v })} />
            <FieldCheckbox label="Activité ambulante" checked={etab.activites[0].indicateurAmbulant} onChange={v => setEtabActivite({ indicateurAmbulant: v })} />
          </Row>
        </Section>
      )}

      {step === 3 && (
        <Section title="Adresse d'exercice" subtitle="Là où vous exercez votre activité.">
          <FieldCheckbox label="Identique à mon domicile personnel" checked={etab.adresseIdentiqueDomicile} onChange={v => setEtab({ adresseIdentiqueDomicile: v, caracteristiques: { ...etab.caracteristiques, indicateurExerciceADomicile: v } })} />
          {!etab.adresseIdentiqueDomicile && (
            <>
              <FieldText label="N° et voie *" value={etab.adresse.voie} onChange={v => setEtabAdresse({ voie: v })} />
              <FieldText label="Complément" value={etab.adresse.complement} onChange={v => setEtabAdresse({ complement: v })} />
              <Row>
                <FieldText label="Code postal *" value={etab.adresse.codePostal} onChange={v => setEtabAdresse({ codePostal: v })} mono maxLength={5} />
                <FieldText label="Commune *" value={etab.adresse.commune} onChange={v => setEtabAdresse({ commune: v })} />
              </Row>
            </>
          )}
          <FieldCheckbox label="Exerce à mon domicile" checked={etab.caracteristiques.indicateurExerciceADomicile} onChange={v => setEtab({ caracteristiques: { ...etab.caracteristiques, indicateurExerciceADomicile: v } })} />
        </Section>
      )}

      {step === 4 && (
        <Section title="Options fiscales et sociales">
          <FieldSelect label="Régime fiscal" value={fisc.regimeFiscal.regime} onChange={v => setFisc({ regimeFiscal: { ...fisc.regimeFiscal, regime: v } })} options={[{ value: 'BIC', label: 'BIC (Bénéfices Industriels et Commerciaux)' }, { value: 'BNC', label: 'BNC (Bénéfices Non Commerciaux)' }]} />
          <FieldCheckbox label="Régime micro-social" checked={compo.optionMicroSocial.indicateurMicroSocial} onChange={v => setCompo({ optionMicroSocial: { ...compo.optionMicroSocial, indicateurMicroSocial: v } })} />
          <FieldCheckbox label="Versement libératoire de l'impôt sur le revenu (option micro-fiscal)" checked={compo.optionMicroFiscal.indicateurMicroFiscal} onChange={v => setCompo({ optionMicroFiscal: { ...compo.optionMicroFiscal, indicateurMicroFiscal: v } })} />
          <FieldCheckbox label="Bénéfice de l'ACRE (exonération début d'activité)" checked={compo.indicateurACRE} onChange={v => setCompo({ indicateurACRE: v })} />
          <FieldSelect label="Régime TVA" value={fisc.optionTVA.regimeTVA} onChange={v => setFisc({ optionTVA: { ...fisc.optionTVA, regimeTVA: v } })} options={[
            { value: 'FRANCHISE_BASE', label: 'Franchise en base de TVA (par défaut en micro)' },
            { value: 'REEL_SIMPLIFIE', label: 'Réel simplifié' },
            { value: 'REEL_NORMAL', label: 'Réel normal' },
          ]} />
        </Section>
      )}

      {step === 5 && (
        <Section title="Récapitulatif" subtitle={`Ton dossier ${reference || ''} sera soumis à l'admin pour validation interne avant envoi à l'INPI.`}>
          <RecapBlock label="Identité"
            rows={[
              ['Nom de naissance', ident.nomNaissance],
              ['Nom d\'usage', ident.nomUsage || '—'],
              ['Prénom(s)', ident.prenoms.filter(Boolean).join(', ')],
              ['Né(e) le', ident.dateDeNaissance],
              ['À', `${ident.lieuDeNaissance.commune} (${ident.lieuDeNaissance.paysNaissance})`],
              ['Nationalité', NATIONALITES.find(n => n.code === ident.codeNationalite)?.label || ident.codeNationalite],
              ['NIR', desc.nirAvis ? '••• masqué' : '—'],
            ]} />
          <RecapBlock label="Domicile" rows={[
            ['Adresse', `${ident.blocAdresse.adresse.voie}${ident.blocAdresse.adresse.complement ? ', ' + ident.blocAdresse.adresse.complement : ''}`],
            ['Ville', `${ident.blocAdresse.adresse.codePostal} ${ident.blocAdresse.adresse.commune}`],
          ]} />
          <RecapBlock label="Activité" rows={[
            ['Code APE', etab.activites[0].codeApe],
            ['Description', etab.activites[0].descriptionDetaillee],
            ['Début', etab.activites[0].dateDebutActivite],
            ['Ambulant', etab.activites[0].indicateurAmbulant ? 'Oui' : 'Non'],
            ['À domicile', etab.caracteristiques.indicateurExerciceADomicile ? 'Oui' : 'Non'],
          ]} />
          <RecapBlock label="Options" rows={[
            ['Régime fiscal', fisc.regimeFiscal.regime],
            ['Micro-social', compo.optionMicroSocial.indicateurMicroSocial ? 'Oui' : 'Non'],
            ['Versement libératoire', compo.optionMicroFiscal.indicateurMicroFiscal ? 'Oui' : 'Non'],
            ['ACRE', compo.indicateurACRE ? 'Oui' : 'Non'],
            ['TVA', fisc.optionTVA.regimeTVA],
          ]} />
          <RecapBlock label="Pièces jointes" rows={documents.length ? documents.map(d => [d.name, (d.size_bytes/1024).toFixed(0) + ' Ko']) : [['—', 'Aucune pièce']]} />
        </Section>
      )}

      <Nav step={step} max={STEPS_CREA.length - 1} onPrev={prev} onNext={next} onSubmit={submit} saving={saving} submitting={submitting}
        submitLabel={demoMode ? 'Créer un compte pour soumettre →' : 'Soumettre pour validation'} />
    </div>
  );
};

// ─── Sous-composants partagés ────────────────────────────────────────
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

const FieldList = ({ label, values, onChange }) => {
  const add = () => onChange([...values, '']);
  const set = (i, v) => onChange(values.map((x, idx) => idx === i ? v : x));
  const rm = (i) => onChange(values.filter((_, idx) => idx !== i));
  return (
    <div>
      <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
      {values.map((v, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input value={v} onChange={e => set(i, e.target.value)}
            style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--ink-200)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }} />
          {values.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => rm(i)}>−</button>}
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={add}>+ Ajouter un prénom</button>
    </div>
  );
};

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

const ProgressBar = ({ steps, current, onStepClick }) => (
  <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid var(--ink-150)', overflow: 'auto' }}>
    {steps.map((label, i) => {
      const isActive = i === current;
      const isCompleted = i < current;
      const clickable = !!onStepClick;
      return (
        <button
          key={i}
          type="button"
          onClick={clickable ? () => onStepClick(i) : undefined}
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
          }}>{isCompleted ? '✓' : (i + 1)}</span>
          <span>{label}</span>
        </button>
      );
    })}
  </div>
);

const Nav = ({ step, max, onPrev, onNext, onSubmit, saving, submitting }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
    <button className="btn btn-ghost" onClick={onPrev} disabled={step === 0 || saving || submitting}>← Précédent</button>
    {step < max
      ? <button className="btn btn-accent" onClick={onNext} disabled={saving}>{saving ? 'Sauvegarde…' : 'Suivant →'}</button>
      : <button className="btn btn-accent btn-lg" onClick={onSubmit} disabled={submitting}>{submitting ? 'Envoi…' : 'Soumettre pour validation'}</button>}
  </div>
);

const DocumentUploadList = ({ dossierId, documents, setDocuments, required, demoMode = false }) => {
  const [uploading, setUploading] = React.useState(null);
  const fileInputs = React.useRef({});

  if (demoMode) {
    return (
      <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
        {required.map(req => (
          <div key={req.typeDocument} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px dashed var(--ink-200)', borderRadius: 8, background: 'var(--ink-50)' }}>
            <I.Doc size={18} style={{ color: 'var(--ink-400)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>{req.label}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>Upload disponible après inscription</div>
            </div>
            <span className="pill" style={{ fontSize: 10, background: 'var(--ink-100)', color: 'var(--ink-600)' }}>DÉMO</span>
          </div>
        ))}
      </div>
    );
  }

  const onPick = async (typeDocument, label, file) => {
    if (!dossierId) return alert('Le dossier sera créé à l\'étape suivante. Pour télé-verser maintenant, sauvegarde d\'abord (Suivant).');
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

window.WizardCreation = WizardCreation;
