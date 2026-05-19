/* eslint-disable */
// Wizard modification d'auto-entreprise — 5 étapes
// POST /formality_updates → body { previousFormality, newFormality }
// Signature RGS qualifiée requise (warning affiché)

const STEPS_MOD = ['Entreprise', 'Type de modif', 'Détails', 'Pièces', 'Récap'];

const MODIF_TYPES = [
  { id: 'ADRESSE',     label: "Changement d'adresse",         trigger: 'adresseEntrepriseTriggered' },
  { id: 'ACTIVITE',    label: "Changement d'activité",        trigger: 'activiteTriggered' },
  { id: 'DENOMINATION',label: "Dénomination / nom commercial",trigger: 'denominationTriggered' },
  { id: 'FISCAL',      label: "Options fiscales",             trigger: 'optionFiscaleTriggered' },
  { id: 'ETABL_SEC',   label: "Établissement secondaire",     trigger: 'etablissementTriggered' },
];

const initModContent = () => ({
  previousFormality: {
    companyName: '', typePersonne: 'P',
    content: { personnePhysique: { ppRubriqueIdentiteEntreprise: { identificationPersonnePhysique: { siren: '', nomNaissance: '', prenoms: [''] } } } },
  },
  newFormality: {
    companyName: '', typePersonne: 'P',
    content: { personnePhysique: {} },
  },
  _modType: 'ADRESSE',
  _details: {
    adresse: { voie: '', complement: '', codePostal: '', commune: '', codePays: 'FRA', codeInseeCommune: '' },
    activite: { codeApe: '', descriptionDetaillee: '' },
    denomination: { nomCommercial: '' },
    fiscal: { regime: 'BIC', tva: 'FRANCHISE_BASE', versementLiberatoire: false },
    etablSec: { adresseVoie: '', codePostal: '', commune: '', activiteDescription: '' },
  },
});

const WizardModification = ({ setRoute, dossierId: initialDossierId, onCreated }) => {
  const W = window.WC;
  const [step, setStep] = React.useState(0);
  const [state, setState] = React.useState(initModContent());
  const [dossierId, setDossierId] = React.useState(initialDossierId || null);
  const [reference, setReference] = React.useState(null);
  const [documents, setDocuments] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!initialDossierId) return;
    (async () => {
      try {
        const { dossier, documents: docs } = await window.ComptaAPI.fetchDossierDetail(initialDossierId);
        if (dossier.inpi_content?.previousFormality) setState({ ...initModContent(), ...dossier.inpi_content });
        setReference(dossier.reference);
        setDocuments(docs || []);
      } catch (e) { console.error(e); }
    })();
  }, [initialDossierId]);

  const idPrev = state.previousFormality.content.personnePhysique.ppRubriqueIdentiteEntreprise.identificationPersonnePhysique;
  const setSiren = (v) => setState(s => ({ ...s,
    previousFormality: { ...s.previousFormality, content: { personnePhysique: { ppRubriqueIdentiteEntreprise: { identificationPersonnePhysique: { ...idPrev, siren: v } } } } },
    newFormality: { ...s.newFormality, content: { personnePhysique: { ...s.newFormality.content.personnePhysique, ppRubriqueIdentiteEntreprise: { identificationPersonnePhysique: { ...idPrev, siren: v } } } } },
  }));
  const setEntName = (v) => setState(s => ({ ...s,
    previousFormality: { ...s.previousFormality, companyName: v },
    newFormality: { ...s.newFormality, companyName: v },
  }));
  const setDeclarantName = (v) => setState(s => ({ ...s,
    previousFormality: { ...s.previousFormality, content: { personnePhysique: { ppRubriqueIdentiteEntreprise: { identificationPersonnePhysique: { ...idPrev, nomNaissance: v.toUpperCase() } } } } },
  }));

  const setModType = (t) => setState(s => ({ ...s, _modType: t }));
  const setDetails = (key, patch) => setState(s => ({ ...s, _details: { ...s._details, [key]: { ...s._details[key], ...patch } } }));

  // Construit le newFormality.content selon le type choisi, avec le bon trigger
  const buildNewContent = () => {
    const tConfig = MODIF_TYPES.find(t => t.id === state._modType);
    const trigger = { [tConfig.trigger]: true };
    const pp = { ppRubriqueIdentiteEntreprise: { identificationPersonnePhysique: { ...idPrev, ...trigger } } };

    if (state._modType === 'ADRESSE') {
      pp.ppRubriqueEtablissement = { etablissementPrincipal: { adresse: state._details.adresse } };
    }
    if (state._modType === 'ACTIVITE') {
      pp.ppRubriqueEtablissement = { etablissementPrincipal: { activites: [state._details.activite] } };
    }
    if (state._modType === 'DENOMINATION') {
      pp.ppRubriqueEtablissement = { etablissementPrincipal: { nomCommercial: state._details.denomination.nomCommercial } };
    }
    if (state._modType === 'FISCAL') {
      pp.ppRubriqueOptionsFiscales = { regimeFiscal: { regime: state._details.fiscal.regime, classification: 'MICRO' }, optionTVA: { regimeTVA: state._details.fiscal.tva } };
    }
    if (state._modType === 'ETABL_SEC') {
      pp.ppRubriqueEtablissement = { autresEtablissements: [{
        descriptionEtablissement: { rolePourEntreprise: 4 },
        adresse: { voie: state._details.etablSec.adresseVoie, codePostal: state._details.etablSec.codePostal, commune: state._details.etablSec.commune, codePays: 'FRA' },
        activites: [{ descriptionDetaillee: state._details.etablSec.activiteDescription }],
      }] };
    }
    return { personnePhysique: pp };
  };

  const computedClientName = () => state.previousFormality.companyName || idPrev.nomNaissance || 'Modification';

  const saveDraft = async () => {
    setSaving(true); setError(null);
    try {
      const payload = { ...state, newFormality: { ...state.newFormality, content: buildNewContent() } };
      if (!dossierId) {
        const r = await window.ComptaAPI.apiFetch('/api/dossiers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: computedClientName(), type_formalite: 'MODIFICATION', inpi_content: payload, siren: idPrev.siren || null }),
        });
        setDossierId(r.dossier.id); setReference(r.dossier.reference);
      } else {
        await window.ComptaAPI.apiFetch(`/api/dossiers/${dossierId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: computedClientName(), siren: idPrev.siren || null, inpi_content: payload }),
        });
      }
    } catch (e) { setError(e.message); throw e; }
    finally { setSaving(false); }
  };

  const next = async () => { try { await saveDraft(); setStep(s => s + 1); } catch {} };
  const prev = () => setStep(s => Math.max(0, s - 1));

  const submit = async () => {
    if (!dossierId) return setError('Sauvegarde requise');
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
      <W.ProgressBar steps={STEPS_MOD} current={step} />
      <W.RgsWarning />
      {error && <div style={{ color: '#b42318', padding: 12, marginBottom: 12, fontSize: 13, background: '#FEE2E2', borderRadius: 8 }}>{error}</div>}

      {step === 0 && (
        <W.Section title="Identification de l'entreprise" subtitle="Renseigne le SIREN et le nom de l'entrepreneur — l'INPI les utilisera pour récupérer l'état actuel.">
          <W.Row>
            <W.FieldText label="SIREN *" value={idPrev.siren} onChange={v => setSiren(v.replace(/\s/g, ''))} mono maxLength={9} placeholder="123456789" />
            <W.FieldText label="Dénomination / nom" value={state.previousFormality.companyName} onChange={setEntName} placeholder="DUPONT Jean" />
          </W.Row>
          <W.FieldText label="Nom de naissance du déclarant" value={idPrev.nomNaissance} onChange={setDeclarantName} />
        </W.Section>
      )}

      {step === 1 && (
        <W.Section title="Type de modification" subtitle="Une seule modification par dossier. Pour plusieurs, dépose plusieurs formalités.">
          <div style={{ display: 'grid', gap: 8 }}>
            {MODIF_TYPES.map(t => (
              <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: `1px solid ${state._modType === t.id ? 'var(--accent)' : 'var(--ink-200)'}`, borderRadius: 8, cursor: 'pointer', background: state._modType === t.id ? 'rgba(91, 54, 214, 0.05)' : 'white' }}>
                <input type="radio" name="modType" checked={state._modType === t.id} onChange={() => setModType(t.id)} style={{ accentColor: 'var(--accent)' }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{t.label}</span>
              </label>
            ))}
          </div>
        </W.Section>
      )}

      {step === 2 && state._modType === 'ADRESSE' && (
        <W.Section title="Nouvelle adresse">
          <W.FieldText label="N° et voie *" value={state._details.adresse.voie} onChange={v => setDetails('adresse', { voie: v })} />
          <W.FieldText label="Complément" value={state._details.adresse.complement} onChange={v => setDetails('adresse', { complement: v })} />
          <W.Row>
            <W.FieldText label="Code postal *" value={state._details.adresse.codePostal} onChange={v => setDetails('adresse', { codePostal: v })} mono maxLength={5} />
            <W.FieldText label="Commune *" value={state._details.adresse.commune} onChange={v => setDetails('adresse', { commune: v })} />
          </W.Row>
        </W.Section>
      )}

      {step === 2 && state._modType === 'ACTIVITE' && (
        <W.Section title="Nouvelle activité">
          <W.FieldText label="Code APE/NAF *" value={state._details.activite.codeApe} onChange={v => setDetails('activite', { codeApe: v.toUpperCase().replace(/\s/g, '') })} mono maxLength={5} />
          <W.FieldTextarea label="Description détaillée *" value={state._details.activite.descriptionDetaillee} onChange={v => setDetails('activite', { descriptionDetaillee: v })} />
        </W.Section>
      )}

      {step === 2 && state._modType === 'DENOMINATION' && (
        <W.Section title="Nouvelle dénomination">
          <W.FieldText label="Nouveau nom commercial *" value={state._details.denomination.nomCommercial} onChange={v => setDetails('denomination', { nomCommercial: v })} />
        </W.Section>
      )}

      {step === 2 && state._modType === 'FISCAL' && (
        <W.Section title="Nouvelles options fiscales">
          <W.FieldSelect label="Régime fiscal" value={state._details.fiscal.regime} onChange={v => setDetails('fiscal', { regime: v })} options={[{ value: 'BIC', label: 'BIC' }, { value: 'BNC', label: 'BNC' }]} />
          <W.FieldSelect label="Régime TVA" value={state._details.fiscal.tva} onChange={v => setDetails('fiscal', { tva: v })} options={[
            { value: 'FRANCHISE_BASE', label: 'Franchise en base' },
            { value: 'REEL_SIMPLIFIE', label: 'Réel simplifié' },
            { value: 'REEL_NORMAL', label: 'Réel normal' },
          ]} />
          <W.FieldCheckbox label="Versement libératoire" checked={state._details.fiscal.versementLiberatoire} onChange={v => setDetails('fiscal', { versementLiberatoire: v })} />
        </W.Section>
      )}

      {step === 2 && state._modType === 'ETABL_SEC' && (
        <W.Section title="Nouvel établissement secondaire">
          <W.FieldText label="N° et voie *" value={state._details.etablSec.adresseVoie} onChange={v => setDetails('etablSec', { adresseVoie: v })} />
          <W.Row>
            <W.FieldText label="Code postal *" value={state._details.etablSec.codePostal} onChange={v => setDetails('etablSec', { codePostal: v })} mono maxLength={5} />
            <W.FieldText label="Commune *" value={state._details.etablSec.commune} onChange={v => setDetails('etablSec', { commune: v })} />
          </W.Row>
          <W.FieldTextarea label="Description de l'activité de cet établissement *" value={state._details.etablSec.activiteDescription} onChange={v => setDetails('etablSec', { activiteDescription: v })} />
        </W.Section>
      )}

      {step === 3 && (
        <W.Section title="Pièces jointes">
          <W.DocumentUploadList dossierId={dossierId} documents={documents} setDocuments={setDocuments} required={[
            { typeDocument: 'PJ_01', label: "Pièce d'identité du déclarant" },
            ...(state._modType === 'ADRESSE' ? [{ typeDocument: 'PJ_02', label: "Justificatif de la nouvelle adresse (< 3 mois)" }] : []),
            ...(state._modType === 'ETABL_SEC' ? [{ typeDocument: 'PJ_06', label: "Justificatif d'occupation du local (bail, attestation…)" }] : []),
          ]} />
        </W.Section>
      )}

      {step === 4 && (
        <W.Section title="Récapitulatif" subtitle={`Dossier ${reference || ''} — soumission pour validation interne avant envoi INPI.`}>
          <W.RecapBlock label="Entreprise" rows={[
            ['SIREN', idPrev.siren || '—'],
            ['Nom', state.previousFormality.companyName || idPrev.nomNaissance || '—'],
          ]} />
          <W.RecapBlock label="Type de modification" rows={[['Type', MODIF_TYPES.find(t => t.id === state._modType)?.label]]} />
          {state._modType === 'ADRESSE' && (
            <W.RecapBlock label="Nouvelle adresse" rows={[
              ['Voie', state._details.adresse.voie],
              ['Ville', `${state._details.adresse.codePostal} ${state._details.adresse.commune}`],
            ]} />
          )}
          {state._modType === 'ACTIVITE' && (
            <W.RecapBlock label="Nouvelle activité" rows={[
              ['Code APE', state._details.activite.codeApe],
              ['Description', state._details.activite.descriptionDetaillee],
            ]} />
          )}
          {state._modType === 'DENOMINATION' && (
            <W.RecapBlock label="Nouveau nom" rows={[['Nom commercial', state._details.denomination.nomCommercial]]} />
          )}
          {state._modType === 'FISCAL' && (
            <W.RecapBlock label="Nouvelles options" rows={[
              ['Régime', state._details.fiscal.regime],
              ['TVA', state._details.fiscal.tva],
              ['Versement libératoire', state._details.fiscal.versementLiberatoire ? 'Oui' : 'Non'],
            ]} />
          )}
          {state._modType === 'ETABL_SEC' && (
            <W.RecapBlock label="Nouvel établissement" rows={[
              ['Adresse', `${state._details.etablSec.adresseVoie}, ${state._details.etablSec.codePostal} ${state._details.etablSec.commune}`],
              ['Activité', state._details.etablSec.activiteDescription],
            ]} />
          )}
          <W.RecapBlock label="Pièces jointes" rows={documents.length ? documents.map(d => [d.name, (d.size_bytes/1024).toFixed(0) + ' Ko']) : [['—', 'Aucune pièce']]} />
        </W.Section>
      )}

      <W.Nav step={step} max={STEPS_MOD.length - 1} onPrev={prev} onNext={next} onSubmit={submit} saving={saving} submitting={submitting} />
    </div>
  );
};

window.WizardModification = WizardModification;
