/* eslint-disable */
// Wizard de création SARL — 7 étapes, personne morale, save DRAFT par étape, conforme schema INPI

const STEPS_SARL = ['Société', 'Siège', 'Activité', 'Gérant(s)', 'Associés', 'Pièces', 'Récap'];

const NATIONALITES_SARL = [
  { code: 'FRA', label: 'Française' }, { code: 'BEL', label: 'Belge' }, { code: 'CHE', label: 'Suisse' },
  { code: 'ITA', label: 'Italienne' }, { code: 'ESP', label: 'Espagnole' }, { code: 'PRT', label: 'Portugaise' },
  { code: 'DEU', label: 'Allemande' }, { code: 'MAR', label: 'Marocaine' }, { code: 'DZA', label: 'Algérienne' },
  { code: 'TUN', label: 'Tunisienne' }, { code: 'GBR', label: 'Britannique' }, { code: 'USA', label: 'Américaine' },
];

const emptyGerantSarl = () => ({
  descriptionPersonne: {
    nomNaissance: '', prenoms: [''], dateDeNaissance: '', lieuDeNaissance: '',
    codeNationalite: 'FRA', sexe: 'M',
  },
  adresseDomicile: { voie: '', codePostal: '', commune: '', codePays: 'FRA' },
  role: 'GERANT',
});

const emptyAssocieSarl = () => ({
  type: 'PHYSIQUE',
  individu: {
    nomNaissance: '', prenoms: [''], dateDeNaissance: '', lieuDeNaissance: '',
    adresseDomicile: { voie: '', codePostal: '', commune: '', codePays: 'FRA' },
  },
  apports: { numeraire: 0, nature: 0 },
  partsSociales: 0,
  pourcentageDetention: 0,
});

const initSarlContent = () => ({
  personneMorale: {
    identite: {
      entreprise: {
        denomination: '', formeJuridique: 'SARL',
        capital: 1000, deviseCapital: 'EUR',
        objet: '', dureeSociete: 99,
        dateClotureExercice: '12-31', datePremiereCloture: '',
      },
      description: {
        sigle: '', nomCommercial: '', capitalVariable: false,
      },
    },
    composition: {
      pouvoirs: [{ individu: emptyGerantSarl() }],
      associes: [emptyAssocieSarl(), emptyAssocieSarl()],
    },
    etablissementPrincipal: {
      descriptionEtablissement: { rolePourEntreprise: 2, indicateurEtablissementPrincipal: true },
      adresse: { voie: '', codePostal: '', commune: '', codePays: 'FRA' },
      activites: [{ codeApe: '', descriptionDetaillee: '', dateDebutActivite: '', indicateurPrincipal: true }],
      caracteristiques: { indicateurExerciceADomicile: false },
    },
    optionsFiscales: {
      regimeImposition: 'IS',
      optionTVA: { regimeTVA: 'REEL_SIMPLIFIE' },
    },
  },
});

const WizardSARL = ({ setRoute, dossierId: initialDossierId, onCreated, demoMode = false }) => {
  const W = window.WC;
  const [step, setStep] = React.useState(0);
  const [content, setContent] = React.useState(() => {
    if (demoMode) {
      try {
        const saved = localStorage.getItem('compta_demo_wizard_sarl');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return initSarlContent();
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
        if (dossier.inpi_content?.personneMorale) setContent(dossier.inpi_content);
        setReference(dossier.reference);
        setDocuments(docs || []);
      } catch (e) { console.error(e); }
    })();
  }, [initialDossierId, demoMode]);

  const pm = content.personneMorale;
  const entreprise = pm.identite.entreprise;
  const descPM = pm.identite.description;
  const etab = pm.etablissementPrincipal;
  const fisc = pm.optionsFiscales;
  const pouvoirs = pm.composition.pouvoirs;
  const associes = pm.composition.associes;

  const setEntreprise = (patch) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale,
    identite: { ...c.personneMorale.identite, entreprise: { ...c.personneMorale.identite.entreprise, ...patch } } } }));
  const setDescPM = (patch) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale,
    identite: { ...c.personneMorale.identite, description: { ...c.personneMorale.identite.description, ...patch } } } }));
  const setEtab = (patch) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale,
    etablissementPrincipal: { ...c.personneMorale.etablissementPrincipal, ...patch } } }));
  const setEtabAdresse = (patch) => setEtab({ adresse: { ...etab.adresse, ...patch } });
  const setEtabActivite = (patch) => setEtab({ activites: [{ ...etab.activites[0], ...patch }] });
  const setFisc = (patch) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale,
    optionsFiscales: { ...c.personneMorale.optionsFiscales, ...patch } } }));

  const updateGerant = (i, patch) => setContent(c => {
    const arr = c.personneMorale.composition.pouvoirs.map((p, idx) => idx === i ? { ...p, individu: { ...p.individu, ...patch } } : p);
    return { ...c, personneMorale: { ...c.personneMorale, composition: { ...c.personneMorale.composition, pouvoirs: arr } } };
  });
  const updateGerantDesc = (i, patch) => updateGerant(i, { descriptionPersonne: { ...pouvoirs[i].individu.descriptionPersonne, ...patch } });
  const updateGerantAdr = (i, patch) => updateGerant(i, { adresseDomicile: { ...pouvoirs[i].individu.adresseDomicile, ...patch } });
  const addGerant = () => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale,
    composition: { ...c.personneMorale.composition, pouvoirs: [...c.personneMorale.composition.pouvoirs, { individu: emptyGerantSarl() }] } } }));
  const rmGerant = (i) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale,
    composition: { ...c.personneMorale.composition, pouvoirs: c.personneMorale.composition.pouvoirs.filter((_, idx) => idx !== i) } } }));

  const updateAssocie = (i, patch) => setContent(c => {
    const arr = c.personneMorale.composition.associes.map((a, idx) => idx === i ? { ...a, ...patch } : a);
    return { ...c, personneMorale: { ...c.personneMorale, composition: { ...c.personneMorale.composition, associes: arr } } };
  });
  const updateAssocieIndividu = (i, patch) => updateAssocie(i, { individu: { ...associes[i].individu, ...patch } });
  const updateAssocieAdr = (i, patch) => updateAssocieIndividu(i, { adresseDomicile: { ...associes[i].individu.adresseDomicile, ...patch } });
  const updateAssocieApports = (i, patch) => updateAssocie(i, { apports: { ...associes[i].apports, ...patch } });
  const addAssocie = () => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale,
    composition: { ...c.personneMorale.composition, associes: [...c.personneMorale.composition.associes, emptyAssocieSarl()] } } }));
  const rmAssocie = (i) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale,
    composition: { ...c.personneMorale.composition, associes: c.personneMorale.composition.associes.filter((_, idx) => idx !== i) } } }));

  const computedClientName = () => entreprise.denomination?.trim() || 'Nouvelle SARL';

  const saveDraft = async () => {
    setSaving(true); setError(null);
    try {
      if (demoMode) {
        try { localStorage.setItem('compta_demo_wizard_sarl', JSON.stringify(content)); } catch {}
      } else if (!dossierId) {
        const r = await window.ComptaAPI.apiFetch('/api/dossiers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: computedClientName(), type_formalite: 'CREATION', forme_juridique: 'SARL', inpi_content: content }),
        });
        setDossierId(r.dossier.id); setReference(r.dossier.reference);
      } else {
        await window.ComptaAPI.apiFetch(`/api/dossiers/${dossierId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: computedClientName(), forme_juridique: 'SARL', inpi_content: content }),
        });
      }
    } catch (e) { setError(e.message); throw e; }
    finally { setSaving(false); }
  };

  const next = async () => { try { await saveDraft(); setStep(s => s + 1); } catch {} };
  const prev = () => setStep(s => Math.max(0, s - 1));

  const submit = async () => {
    if (demoMode) {
      try { localStorage.setItem('compta_demo_wizard_sarl', JSON.stringify(content)); } catch {}
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

  const setPrenoms = (current, patch, vs) => patch({ prenoms: vs });

  return (
    <div style={{ maxWidth: 820 }}>
      <W.ProgressBar steps={STEPS_SARL} current={step} onStepClick={async (i) => { try { await saveDraft(); } catch {} setStep(i); }} />
      {error && <div style={{ color: '#b42318', padding: 12, marginBottom: 12, fontSize: 13, background: '#FEE2E2', borderRadius: 8 }}>{error}</div>}

      {step === 0 && (
        <W.Section title="La société" subtitle="Identité de la SARL à créer.">
          <W.FieldText label="Dénomination sociale *" value={entreprise.denomination} onChange={v => setEntreprise({ denomination: v })} placeholder="Ex: DUPONT & FILS SARL" />
          <W.Row>
            <W.FieldText label="Sigle (optionnel)" value={descPM.sigle} onChange={v => setDescPM({ sigle: v })} />
            <W.FieldText label="Nom commercial (optionnel)" value={descPM.nomCommercial} onChange={v => setDescPM({ nomCommercial: v })} />
          </W.Row>
          <W.Row>
            <W.FieldText label="Capital social (€) *" value={String(entreprise.capital)} onChange={v => setEntreprise({ capital: Number((v || '').replace(/[^0-9.]/g, '')) || 0 })} mono />
            <W.FieldText label="Durée de la société (années)" value={String(entreprise.dureeSociete)} onChange={v => setEntreprise({ dureeSociete: Number(v) || 99 })} mono maxLength={3} />
          </W.Row>
          <W.FieldCheckbox label="Capital variable" checked={descPM.capitalVariable} onChange={v => setDescPM({ capitalVariable: v })} />
          <W.FieldTextarea label="Objet social *" value={entreprise.objet} onChange={v => setEntreprise({ objet: v })} rows={3} placeholder="Ex: La prestation de services informatiques, le conseil aux entreprises…" />
          <W.Row>
            <W.FieldText label="Clôture exercice (MM-DD)" value={entreprise.dateClotureExercice} onChange={v => setEntreprise({ dateClotureExercice: v })} mono placeholder="12-31" maxLength={5} />
            <W.FieldDate label="1re clôture (date)" value={entreprise.datePremiereCloture} onChange={v => setEntreprise({ datePremiereCloture: v })} />
          </W.Row>
        </W.Section>
      )}

      {step === 1 && (
        <W.Section title="Siège social" subtitle="Adresse du siège — souvent identique à l'établissement principal.">
          <W.FieldText label="N° et voie *" value={etab.adresse.voie} onChange={v => setEtabAdresse({ voie: v })} />
          <W.Row>
            <W.FieldText label="Code postal *" value={etab.adresse.codePostal} onChange={v => setEtabAdresse({ codePostal: v })} mono maxLength={5} />
            <W.FieldText label="Commune *" value={etab.adresse.commune} onChange={v => setEtabAdresse({ commune: v })} />
          </W.Row>
          <W.FieldCheckbox label="Exercice à domicile du gérant" checked={etab.caracteristiques.indicateurExerciceADomicile} onChange={v => setEtab({ caracteristiques: { ...etab.caracteristiques, indicateurExerciceADomicile: v } })} />
        </W.Section>
      )}

      {step === 2 && (
        <W.Section title="Activité principale">
          <W.FieldText label="Code APE/NAF *" value={etab.activites[0].codeApe} onChange={v => setEtabActivite({ codeApe: v.toUpperCase().replace(/\s/g, '') })} mono maxLength={5} placeholder="6202A" />
          <W.FieldTextarea label="Description détaillée de l'activité *" value={etab.activites[0].descriptionDetaillee} onChange={v => setEtabActivite({ descriptionDetaillee: v })} rows={3} placeholder="Ex: Conseil et prestations informatiques pour PME…" />
          <W.FieldDate label="Date de début d'activité *" value={etab.activites[0].dateDebutActivite} onChange={v => setEtabActivite({ dateDebutActivite: v })} />
        </W.Section>
      )}

      {step === 3 && (
        <W.Section title="Gérant(s)" subtitle="Un gérant minimum. Peut être ou non associé de la société.">
          {pouvoirs.map((p, i) => {
            const g = p.individu;
            return (
              <div key={i} style={{ border: '1px solid var(--ink-200)', borderRadius: 10, padding: 14, display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13 }}>Gérant #{i + 1}</strong>
                  {pouvoirs.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => rmGerant(i)}>Supprimer</button>}
                </div>
                <W.IdentityOcrUpload label="Scanner la pièce d'identité du gérant" onExtracted={(f) => {
                  const patch = {};
                  if (f.nom) patch.nomNaissance = f.nom.toUpperCase();
                  if (f.prenoms?.length) patch.prenoms = f.prenoms;
                  if (f.dateNaissance) patch.dateDeNaissance = f.dateNaissance;
                  if (f.sexe) patch.sexe = f.sexe;
                  if (f.nationalite) patch.codeNationalite = f.nationalite;
                  if (f.lieuNaissance) patch.lieuDeNaissance = f.lieuNaissance;
                  updateGerantDesc(i, patch);
                }} />
                <W.Row>
                  <W.FieldText label="Nom de naissance *" value={g.descriptionPersonne.nomNaissance} onChange={v => updateGerantDesc(i, { nomNaissance: v.toUpperCase() })} />
                  <W.FieldText label="Prénom(s) *" value={(g.descriptionPersonne.prenoms || []).join(' ')} onChange={v => updateGerantDesc(i, { prenoms: v.split(/\s+/).filter(Boolean) })} placeholder="Jean Marie" />
                </W.Row>
                <W.Row>
                  <W.FieldDate label="Date de naissance *" value={g.descriptionPersonne.dateDeNaissance} onChange={v => updateGerantDesc(i, { dateDeNaissance: v })} />
                  <W.FieldSelect label="Sexe" value={g.descriptionPersonne.sexe} onChange={v => updateGerantDesc(i, { sexe: v })} options={[{ value: 'M', label: 'Homme' }, { value: 'F', label: 'Femme' }]} />
                </W.Row>
                <W.Row>
                  <W.FieldText label="Lieu de naissance *" value={g.descriptionPersonne.lieuDeNaissance} onChange={v => updateGerantDesc(i, { lieuDeNaissance: v })} />
                  <W.FieldSelect label="Nationalité" value={g.descriptionPersonne.codeNationalite} onChange={v => updateGerantDesc(i, { codeNationalite: v })} options={NATIONALITES_SARL.map(n => ({ value: n.code, label: n.label }))} />
                </W.Row>
                <W.FieldText label="Adresse — N° et voie *" value={g.adresseDomicile.voie} onChange={v => updateGerantAdr(i, { voie: v })} />
                <W.Row>
                  <W.FieldText label="Code postal *" value={g.adresseDomicile.codePostal} onChange={v => updateGerantAdr(i, { codePostal: v })} mono maxLength={5} />
                  <W.FieldText label="Commune *" value={g.adresseDomicile.commune} onChange={v => updateGerantAdr(i, { commune: v })} />
                </W.Row>
              </div>
            );
          })}
          <button className="btn btn-ghost btn-sm" onClick={addGerant}>+ Ajouter un gérant</button>
        </W.Section>
      )}

      {step === 4 && (
        <W.Section title="Associés" subtitle="2 à 100 associés (personnes physiques ou morales). Les parts sociales doivent totaliser 100 %.">
          {associes.map((a, i) => (
            <div key={i} style={{ border: '1px solid var(--ink-200)', borderRadius: 10, padding: 14, display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 13 }}>Associé #{i + 1}</strong>
                {associes.length > 2 && <button className="btn btn-ghost btn-sm" onClick={() => rmAssocie(i)}>Supprimer</button>}
              </div>
              <W.FieldSelect label="Type" value={a.type} onChange={v => updateAssocie(i, { type: v })} options={[{ value: 'PHYSIQUE', label: 'Personne physique' }, { value: 'MORALE', label: 'Personne morale' }]} />
              {a.type === 'PHYSIQUE' && (
                <W.IdentityOcrUpload label="Scanner la pièce d'identité de l'associé" onExtracted={(f) => {
                  const patch = {};
                  if (f.nom) patch.nomNaissance = f.nom.toUpperCase();
                  if (f.prenoms?.length) patch.prenoms = f.prenoms;
                  if (f.dateNaissance) patch.dateDeNaissance = f.dateNaissance;
                  if (f.lieuNaissance) patch.lieuDeNaissance = f.lieuNaissance;
                  updateAssocieIndividu(i, patch);
                }} />
              )}
              <W.Row>
                <W.FieldText label={a.type === 'MORALE' ? 'Dénomination *' : 'Nom de naissance *'} value={a.individu.nomNaissance} onChange={v => updateAssocieIndividu(i, { nomNaissance: v.toUpperCase() })} />
                {a.type === 'PHYSIQUE' && (
                  <W.FieldText label="Prénom(s) *" value={(a.individu.prenoms || []).join(' ')} onChange={v => updateAssocieIndividu(i, { prenoms: v.split(/\s+/).filter(Boolean) })} />
                )}
              </W.Row>
              {a.type === 'PHYSIQUE' && (
                <W.Row>
                  <W.FieldDate label="Date de naissance" value={a.individu.dateDeNaissance} onChange={v => updateAssocieIndividu(i, { dateDeNaissance: v })} />
                  <W.FieldText label="Lieu de naissance" value={a.individu.lieuDeNaissance} onChange={v => updateAssocieIndividu(i, { lieuDeNaissance: v })} />
                </W.Row>
              )}
              <W.FieldText label="Adresse *" value={a.individu.adresseDomicile.voie} onChange={v => updateAssocieAdr(i, { voie: v })} />
              <W.Row>
                <W.FieldText label="Code postal *" value={a.individu.adresseDomicile.codePostal} onChange={v => updateAssocieAdr(i, { codePostal: v })} mono maxLength={5} />
                <W.FieldText label="Commune *" value={a.individu.adresseDomicile.commune} onChange={v => updateAssocieAdr(i, { commune: v })} />
              </W.Row>
              <W.Row>
                <W.FieldText label="Apport numéraire (€)" value={String(a.apports.numeraire)} onChange={v => updateAssocieApports(i, { numeraire: Number((v || '').replace(/[^0-9.]/g, '')) || 0 })} mono />
                <W.FieldText label="Apport nature (€)" value={String(a.apports.nature)} onChange={v => updateAssocieApports(i, { nature: Number((v || '').replace(/[^0-9.]/g, '')) || 0 })} mono />
              </W.Row>
              <W.Row>
                <W.FieldText label="Parts sociales (nb)" value={String(a.partsSociales)} onChange={v => updateAssocie(i, { partsSociales: Number(v) || 0 })} mono />
                <W.FieldText label="% détention" value={String(a.pourcentageDetention)} onChange={v => updateAssocie(i, { pourcentageDetention: Number(v) || 0 })} mono />
              </W.Row>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={addAssocie}>+ Ajouter un associé</button>
        </W.Section>
      )}

      {step === 5 && (
        <W.Section title="Pièces jointes" subtitle="Documents requis pour l'immatriculation de la SARL.">
          {demoMode ? (
            <div style={{ padding: 14, background: 'var(--ink-50)', borderRadius: 8, fontSize: 13, color: 'var(--ink-600)' }}>
              Upload des pièces disponible après création du compte. <span className="pill" style={{ fontSize: 10 }}>DÉMO</span>
            </div>
          ) : (
            <W.DocumentUploadList dossierId={dossierId} documents={documents} setDocuments={setDocuments} required={[
              { typeDocument: 'PJ_01', label: "Pièce d'identité du gérant (CNI, passeport)" },
              { typeDocument: 'PJ_02', label: "Justificatif de siège social (bail, attestation…)" },
              { typeDocument: 'PJ_04', label: "Statuts signés de la SARL" },
              { typeDocument: 'PJ_06', label: "Attestation de dépôt des fonds (capital numéraire)" },
              { typeDocument: 'PJ_07', label: "Liste des bénéficiaires effectifs" },
            ]} />
          )}
        </W.Section>
      )}

      {step === 6 && (
        <W.Section title="Récapitulatif" subtitle={`Dossier ${reference || ''} — création SARL pour validation interne avant envoi INPI.`}>
          <W.RecapBlock label="Société" rows={[
            ['Dénomination', entreprise.denomination],
            ['Forme', 'SARL'],
            ['Capital', `${entreprise.capital} €${descPM.capitalVariable ? ' (variable)' : ''}`],
            ['Objet', entreprise.objet],
            ['Durée', `${entreprise.dureeSociete} ans`],
            ['Clôture', entreprise.dateClotureExercice],
          ]} />
          <W.RecapBlock label="Siège" rows={[
            ['Adresse', etab.adresse.voie],
            ['Ville', `${etab.adresse.codePostal} ${etab.adresse.commune}`],
          ]} />
          <W.RecapBlock label="Activité" rows={[
            ['Code APE', etab.activites[0].codeApe],
            ['Description', etab.activites[0].descriptionDetaillee],
            ['Début', etab.activites[0].dateDebutActivite],
          ]} />
          <W.RecapBlock label={`Gérant(s) (${pouvoirs.length})`} rows={pouvoirs.map((p, i) => [
            `#${i + 1}`,
            `${(p.individu.descriptionPersonne.prenoms || []).join(' ')} ${p.individu.descriptionPersonne.nomNaissance}`.trim() || '—',
          ])} />
          <W.RecapBlock label={`Associés (${associes.length})`} rows={associes.map((a, i) => [
            `#${i + 1} (${a.type === 'MORALE' ? 'PM' : 'PP'})`,
            `${a.individu.nomNaissance} — ${a.pourcentageDetention}%`,
          ])} />
          <W.RecapBlock label="Fiscal" rows={[
            ['Régime', fisc.regimeImposition],
            ['TVA', fisc.optionTVA.regimeTVA],
          ]} />
          <W.RecapBlock label="Pièces jointes" rows={documents.length ? documents.map(d => [d.name, (d.size_bytes/1024).toFixed(0) + ' Ko']) : [['—', 'Aucune pièce']]} />
        </W.Section>
      )}

      <W.Nav step={step} max={STEPS_SARL.length - 1} onPrev={prev} onNext={next} onSubmit={submit} saving={saving} submitting={submitting}
        submitLabel={demoMode ? 'Créer un compte pour soumettre →' : 'Soumettre pour validation'} />
    </div>
  );
};

window.WizardSARL = WizardSARL;
