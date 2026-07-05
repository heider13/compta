/* eslint-disable */
// Wizard dépôt des comptes annuels — 4 étapes
// type_formalite='MODIFICATION', inpi_content={depotComptes: {...}}
// Signature électronique avancée RGS requise.

const STEPS_COMPTES = ['Société & exercice', 'Confidentialité', 'Pièces', 'Récap'];

const TYPE_COMPTES_OPTS = [
  { value: 'COMPTES_ANNUELS', label: 'Comptes annuels' },
  { value: 'COMPTES_CONSOLIDES', label: 'Comptes consolidés' },
];

const NATURE_COMPTES_OPTS = [
  { value: 'COMPLETS', label: 'Complets' },
  { value: 'SIMPLIFIES', label: 'Simplifiés' },
  { value: 'ABREGES', label: 'Abrégés (TPE)' },
];

const initComptesContent = () => ({
  entreprise: { siren: '', denomination: '' },
  exerciceClos: '',
  typeComptes: 'COMPTES_ANNUELS',
  natureComptes: 'COMPLETS',
  optionConfidentialite: false,
  optionConfidentialiteCompteResultat: false,
  dateAssemblee: '',
  approbationComptes: true,
});

const validateSirenC = (s) => /^\d{9}$/.test((s || '').replace(/\s/g, ''));

const WizardComptes = ({ setRoute, dossierId: initialDossierId, onCreated, demoMode = false }) => {
  const W = window.WC;
  const [step, setStep] = React.useState(0);
  const [content, setContent] = React.useState(() => {
    if (demoMode) {
      try {
        const saved = localStorage.getItem('compta_demo_wizard_comptes');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return initComptesContent();
  });
  const [dossierId, setDossierId] = React.useState(initialDossierId || null);
  const [reference, setReference] = React.useState(null);
  const [documents, setDocuments] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (demoMode || !initialDossierId) return;
    (async () => {
      try {
        const { dossier, documents: docs } = await window.ComptaAPI.fetchDossierDetail(initialDossierId);
        if (dossier.inpi_content?.depotComptes) {
          setContent({ ...initComptesContent(), ...dossier.inpi_content.depotComptes });
        }
        setReference(dossier.reference);
        setDocuments(docs || []);
      } catch (e) { console.error(e); }
    })();
  }, [initialDossierId, demoMode]);

  const set = (patch) => setContent(c => ({ ...c, ...patch }));
  const setEnt = (patch) => setContent(c => ({ ...c, entreprise: { ...c.entreprise, ...patch } }));
  const ent = content.entreprise;

  const buildPayload = () => ({ depotComptes: { ...content } });

  const computedClientName = () => (ent.denomination || '').trim() || (ent.siren ? `SIREN ${ent.siren}` : 'Dépôt comptes');

  const saveDraft = async () => {
    setSaving(true); setError(null);
    try {
      const payload = buildPayload();
      if (demoMode) {
        try { localStorage.setItem('compta_demo_wizard_comptes', JSON.stringify(content)); } catch {}
      } else if (!dossierId) {
        const r = await window.ComptaAPI.apiFetch('/api/dossiers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: computedClientName(), type_formalite: 'MODIFICATION', forme_juridique: null, inpi_content: payload, siren: ent.siren || null }),
        });
        setDossierId(r.dossier.id); setReference(r.dossier.reference);
      } else {
        await window.ComptaAPI.apiFetch(`/api/dossiers/${dossierId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: computedClientName(), siren: ent.siren || null, inpi_content: payload }),
        });
      }
    } catch (e) { setError(e.message); throw e; }
    finally { setSaving(false); }
  };

  const validateStep = () => {
    if (step === 0) {
      if (!validateSirenC(ent.siren)) return 'Le SIREN doit comporter exactement 9 chiffres.';
      if (!ent.denomination.trim()) return 'Dénomination requise.';
      if (!content.exerciceClos) return 'Date de clôture de l\'exercice requise.';
      if (!content.dateAssemblee) return 'Date de l\'assemblée d\'approbation requise.';
      if (content.dateAssemblee < content.exerciceClos) return 'L\'assemblée doit être postérieure à la clôture.';
    }
    if (step === 2) {
      const required = ['PJ_99', 'PJ_100', 'PJ_101', 'PJ_102'];
      const missing = required.filter(t => !documents.find(d => d.doc_type === t));
      if (missing.length && !demoMode) return `Pièces obligatoires manquantes : ${missing.join(', ')}.`;
    }
    return null;
  };

  const next = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    try { await saveDraft(); setStep(s => s + 1); } catch {}
  };
  const prev = () => setStep(s => Math.max(0, s - 1));

  const submit = async () => {
    if (demoMode) {
      try { localStorage.setItem('compta_demo_wizard_comptes', JSON.stringify(content)); } catch {}
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
      <W.ProgressBar steps={STEPS_COMPTES} current={step} onStepClick={async (i) => { try { await saveDraft(); } catch {} setStep(i); }} />
      <W.RgsWarning />
      {error && <div style={{ color: '#b42318', padding: 12, marginBottom: 12, fontSize: 13, background: '#FEE2E2', borderRadius: 8 }}>{error}</div>}

      {step === 0 && (
        <W.Section title="Société & exercice clos" subtitle="Identifie la société et l'exercice comptable à déposer.">
          <W.DocExtractUpload
            label="Analyser le PV d'approbation des comptes"
            docType="pv_ag"
            onExtracted={(f) => {
              if (f.societe?.siren) setEnt({ siren: String(f.societe.siren).replace(/\D/g, '').slice(0, 9) });
              if (f.societe?.denomination) setEnt({ denomination: f.societe.denomination });
              if (f.exercice?.dateCloture) set({ exerciceClos: f.exercice.dateCloture });
              if (f.dateActe) set({ dateAssemblee: f.dateActe });
            }}
          />
          <W.Row>
            <W.FieldText label="SIREN *" value={ent.siren} onChange={v => setEnt({ siren: v.replace(/\s/g, '').replace(/\D/g, '').slice(0, 9) })} mono maxLength={9} placeholder="123456789" />
            <W.FieldText label="Dénomination sociale *" value={ent.denomination} onChange={v => setEnt({ denomination: v })} placeholder="Ex: ACME SAS" />
          </W.Row>
          <W.Row>
            <W.FieldDate label="Date de clôture de l'exercice *" value={content.exerciceClos} onChange={v => set({ exerciceClos: v })} />
            <W.FieldDate label="Date de l'assemblée d'approbation *" value={content.dateAssemblee} onChange={v => set({ dateAssemblee: v })} />
          </W.Row>
          <W.Row>
            <W.FieldSelect label="Type de comptes *" value={content.typeComptes} onChange={v => set({ typeComptes: v })} options={TYPE_COMPTES_OPTS} />
            <W.FieldSelect label="Nature des comptes *" value={content.natureComptes} onChange={v => set({ natureComptes: v })} options={NATURE_COMPTES_OPTS} />
          </W.Row>
          <W.FieldCheckbox label="Les comptes ont été approuvés par l'assemblée" checked={content.approbationComptes} onChange={v => set({ approbationComptes: v })} />
          <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>Le dépôt doit intervenir dans le mois suivant l'approbation des comptes (deux mois si dépôt électronique).</div>
        </W.Section>
      )}

      {step === 1 && (
        <W.Section title="Options de confidentialité" subtitle="Options réservées aux TPE et PME selon les seuils en vigueur. Si vous ne savez pas, laissez décoché.">
          <W.FieldCheckbox label="Option de confidentialité globale des comptes (TPE)" checked={content.optionConfidentialite} onChange={v => set({ optionConfidentialite: v })} />
          <W.FieldCheckbox label="Option de confidentialité du compte de résultat (PME)" checked={content.optionConfidentialiteCompteResultat} onChange={v => set({ optionConfidentialiteCompteResultat: v })} />
          <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>
            <strong>TPE</strong> : bilan ≤ 350 k€, CA ≤ 700 k€, ≤ 10 salariés → confidentialité globale possible.
            <br /><strong>PME</strong> : bilan ≤ 6 M€, CA ≤ 12 M€, ≤ 50 salariés → confidentialité du compte de résultat possible.
          </div>
        </W.Section>
      )}

      {step === 2 && (
        <W.Section title="Pièces justificatives" subtitle="Documents comptables au format PDF. Bilan, compte de résultat, annexe et PV d'AG sont obligatoires.">
          <W.DocumentUploadList dossierId={dossierId} documents={documents} setDocuments={setDocuments} demoMode={demoMode} required={[
            { typeDocument: 'PJ_99', label: 'Bilan (obligatoire)' },
            { typeDocument: 'PJ_100', label: 'Compte de résultat (obligatoire)' },
            { typeDocument: 'PJ_101', label: 'Annexe (obligatoire)' },
            { typeDocument: 'PJ_102', label: "PV d'assemblée générale d'approbation (obligatoire)" },
            { typeDocument: 'PJ_103', label: 'Rapport de gestion (optionnel — SA/SAS de grande taille)' },
          ]} />
        </W.Section>
      )}

      {step === 3 && (
        <W.Section title="Récapitulatif" subtitle={`Dossier ${reference || ''} — soumission pour validation interne avant transmission INPI.`}>
          <W.RecapBlock label="Société" rows={[
            ['SIREN', ent.siren || '—'],
            ['Dénomination', ent.denomination || '—'],
          ]} />
          <W.RecapBlock label="Exercice" rows={[
            ['Clôture', content.exerciceClos || '—'],
            ['Assemblée', content.dateAssemblee || '—'],
            ['Type', TYPE_COMPTES_OPTS.find(o => o.value === content.typeComptes)?.label],
            ['Nature', NATURE_COMPTES_OPTS.find(o => o.value === content.natureComptes)?.label],
            ['Approuvés', content.approbationComptes ? 'Oui' : 'Non'],
          ]} />
          <W.RecapBlock label="Confidentialité" rows={[
            ['Globale (TPE)', content.optionConfidentialite ? 'Oui' : 'Non'],
            ['Compte de résultat (PME)', content.optionConfidentialiteCompteResultat ? 'Oui' : 'Non'],
          ]} />
          <W.RecapBlock label="Pièces jointes" rows={documents.length ? documents.map(d => [d.name, (d.size_bytes/1024).toFixed(0) + ' Ko']) : [['—', 'Aucune pièce']]} />
        </W.Section>
      )}

      <W.Nav step={step} max={STEPS_COMPTES.length - 1} onPrev={prev} onNext={next} onSubmit={submit} saving={saving} submitting={submitting}
        submitLabel={demoMode ? 'Créer un compte pour soumettre →' : 'Soumettre pour validation'} />
    </div>
  );
};

window.WizardComptes = WizardComptes;
