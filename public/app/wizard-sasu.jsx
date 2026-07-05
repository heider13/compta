/* eslint-disable */
// Wizard création SASU (Société par Actions Simplifiée Unipersonnelle) — 7 étapes
// Schema INPI personneMorale, forme_juridique='SASU', save DRAFT par étape

const STEPS_SASU = ['Société', 'Siège', 'Activité', 'Président', 'Associé unique', 'Pièces', 'Récap'];

const SASU_NATIONALITES = [
  { code: 'FRA', label: 'Française' }, { code: 'BEL', label: 'Belge' }, { code: 'CHE', label: 'Suisse' },
  { code: 'ITA', label: 'Italienne' }, { code: 'ESP', label: 'Espagnole' }, { code: 'PRT', label: 'Portugaise' },
  { code: 'DEU', label: 'Allemande' }, { code: 'MAR', label: 'Marocaine' }, { code: 'DZA', label: 'Algérienne' },
  { code: 'TUN', label: 'Tunisienne' }, { code: 'GBR', label: 'Britannique' }, { code: 'USA', label: 'Américaine' },
];

const SASU_SIT_MATRIMONIALE = [
  { code: 'C', label: 'Célibataire' }, { code: 'M', label: 'Marié(e)' }, { code: 'P', label: 'Pacsé(e)' },
  { code: 'D', label: 'Divorcé(e)' }, { code: 'V', label: 'Veuf/Veuve' },
];

const initSasuContent = () => ({
  personneMorale: {
    identite: {
      entreprise: {
        denomination: '', formeJuridique: 'SASU',
        capital: 1, deviseCapital: 'EUR',
        objet: '', dureeSociete: 99,
        dateClotureExercice: '12-31',
        datePremiereCloture: '',
      },
      description: {
        sigle: '', nomCommercial: '',
        capitalVariable: false,
        capitalMinimum: 0, capitalMaximum: 0,
      },
    },
    composition: {
      pouvoirs: [{
        individu: {
          descriptionPersonne: {
            nomNaissance: '', nomUsage: '', prenoms: [''],
            dateDeNaissance: '',
            lieuDeNaissance: { commune: '', codePostal: '', codePays: 'FRA', paysNaissance: 'France' },
            codeNationalite: 'FRA', sexe: 'M',
            situationMatrimoniale: 'C',
          },
          adresseDomicile: { voie: '', complement: '', codePostal: '', commune: '', codePays: 'FRA' },
          role: 'PRESIDENT',
          pieceJointes: [],
        },
      }],
      associes: [{
        type: 'PHYSIQUE',
        individu: {
          nomNaissance: '', prenoms: [''], dateDeNaissance: '',
          lieuDeNaissance: { commune: '', codePostal: '', codePays: 'FRA', paysNaissance: 'France' },
          adresseDomicile: { voie: '', complement: '', codePostal: '', commune: '', codePays: 'FRA' },
        },
        apports: { numeraire: 1, nature: 0 },
        partsSociales: 100,
        pourcentageDetention: 100,
      }],
      _dirigeantEstAssocie: true,
    },
    etablissementPrincipal: {
      descriptionEtablissement: { rolePourEntreprise: 2, indicateurEtablissementPrincipal: true, indicateurPrincipal: true },
      adresse: { voie: '', complement: '', codePostal: '', commune: '', codePays: 'FRA' },
      activites: [{ codeApe: '', descriptionDetaillee: '', dateDebutActivite: '', indicateurAmbulant: false, indicateurPrincipal: true }],
      caracteristiques: { indicateurExerciceADomicile: false, indicateurEntrepriseDomiciliataire: false },
    },
    optionsFiscales: {
      regimeImposition: 'IS',
      optionTVA: { regimeTVA: 'FRANCHISE_BASE' },
    },
  },
});

const WizardSASU = ({ setRoute, dossierId: initialDossierId, onCreated, demoMode = false }) => {
  const W = window.WC;
  const [step, setStep] = React.useState(0);
  const [content, setContent] = React.useState(() => {
    if (demoMode) {
      try {
        const saved = localStorage.getItem('compta_demo_wizard_sasu');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return initSasuContent();
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
  const ent = pm.identite.entreprise;
  const dsc = pm.identite.description;
  const pres = pm.composition.pouvoirs[0].individu;
  const presDesc = pres.descriptionPersonne;
  const presAdr = pres.adresseDomicile;
  const presLieu = presDesc.lieuDeNaissance;
  const assoc = pm.composition.associes[0];
  const etab = pm.etablissementPrincipal;
  const fisc = pm.optionsFiscales;

  const setEntreprise = (patch) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale, identite: { ...c.personneMorale.identite, entreprise: { ...c.personneMorale.identite.entreprise, ...patch } } } }));
  const setDescription = (patch) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale, identite: { ...c.personneMorale.identite, description: { ...c.personneMorale.identite.description, ...patch } } } }));
  const setPresident = (patch) => setContent(c => {
    const p = c.personneMorale.composition.pouvoirs[0];
    return { ...c, personneMorale: { ...c.personneMorale, composition: { ...c.personneMorale.composition, pouvoirs: [{ ...p, individu: { ...p.individu, ...patch } }] } } };
  });
  const setPresDesc = (patch) => setPresident({ descriptionPersonne: { ...presDesc, ...patch } });
  const setPresLieu = (patch) => setPresDesc({ lieuDeNaissance: { ...presLieu, ...patch } });
  const setPresAdr = (patch) => setPresident({ adresseDomicile: { ...presAdr, ...patch } });
  const setAssocie = (patch) => setContent(c => {
    const arr = c.personneMorale.composition.associes.slice();
    arr[0] = { ...arr[0], ...patch };
    return { ...c, personneMorale: { ...c.personneMorale, composition: { ...c.personneMorale.composition, associes: arr } } };
  });
  const setAssocieIndividu = (patch) => setAssocie({ individu: { ...assoc.individu, ...patch } });
  const setAssocieApports = (patch) => setAssocie({ apports: { ...assoc.apports, ...patch } });
  const setDirigeantEstAssocie = (v) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale, composition: { ...c.personneMorale.composition, _dirigeantEstAssocie: v } } }));
  const setEtab = (patch) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale, etablissementPrincipal: { ...c.personneMorale.etablissementPrincipal, ...patch } } }));
  const setEtabAdresse = (patch) => setEtab({ adresse: { ...etab.adresse, ...patch } });
  const setEtabActivite = (patch) => setEtab({ activites: [{ ...etab.activites[0], ...patch }] });
  const setEtabCarac = (patch) => setEtab({ caracteristiques: { ...etab.caracteristiques, ...patch } });
  const setFisc = (patch) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale, optionsFiscales: { ...c.personneMorale.optionsFiscales, ...patch } } }));

  const buildPayload = () => {
    let payload = content;
    if (payload.personneMorale.composition._dirigeantEstAssocie) {
      const totalCap = Number(ent.capital) || 1;
      payload = {
        ...payload,
        personneMorale: {
          ...payload.personneMorale,
          composition: {
            ...payload.personneMorale.composition,
            associes: [{
              ...payload.personneMorale.composition.associes[0],
              type: 'PHYSIQUE',
              individu: {
                nomNaissance: presDesc.nomNaissance,
                prenoms: presDesc.prenoms,
                dateDeNaissance: presDesc.dateDeNaissance,
                lieuDeNaissance: presLieu,
                adresseDomicile: presAdr,
              },
              apports: { numeraire: totalCap, nature: 0 },
              partsSociales: 100,
              pourcentageDetention: 100,
            }],
          },
        },
      };
    }
    return payload;
  };

  const computedClientName = () => (ent.denomination || '').trim() || (presDesc.prenoms[0] && presDesc.nomNaissance ? `${presDesc.prenoms[0]} ${presDesc.nomNaissance}`.trim() : '');

  const saveDraft = async () => {
    setSaving(true); setError(null);
    try {
      const payload = buildPayload();
      if (demoMode) {
        try { localStorage.setItem('compta_demo_wizard_sasu', JSON.stringify(payload)); } catch {}
      } else if (!dossierId) {
        const cn = computedClientName() || 'Nouvelle SASU';
        const r = await window.ComptaAPI.apiFetch('/api/dossiers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: cn, type_formalite: 'CREATION', forme_juridique: 'SASU', inpi_content: payload }),
        });
        setDossierId(r.dossier.id); setReference(r.dossier.reference);
      } else {
        await window.ComptaAPI.apiFetch(`/api/dossiers/${dossierId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: computedClientName(), forme_juridique: 'SASU', inpi_content: payload }),
        });
      }
    } catch (e) { setError(e.message); throw e; }
    finally { setSaving(false); }
  };

  const next = async () => { try { await saveDraft(); setStep(s => s + 1); } catch {} };
  const prev = () => setStep(s => Math.max(0, s - 1));

  const submit = async () => {
    if (demoMode) {
      try { localStorage.setItem('compta_demo_wizard_sasu', JSON.stringify(buildPayload())); } catch {}
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

  const setPresPrenom = (i, v) => {
    const arr = presDesc.prenoms.slice(); arr[i] = v;
    setPresDesc({ prenoms: arr });
  };
  const addPresPrenom = () => setPresDesc({ prenoms: [...presDesc.prenoms, ''] });
  const rmPresPrenom = (i) => setPresDesc({ prenoms: presDesc.prenoms.filter((_, idx) => idx !== i) });

  return (
    <div style={{ maxWidth: 820 }}>
      <W.ProgressBar steps={STEPS_SASU} current={step} onStepClick={async (i) => { try { await saveDraft(); } catch {} setStep(i); }} />
      <W.RgsWarning />
      {error && <div style={{ color: '#b42318', padding: 12, marginBottom: 12, fontSize: 13, background: '#FEE2E2', borderRadius: 8 }}>{error}</div>}

      {step === 0 && (
        <W.Section title="Société (SASU)" subtitle="Société par Actions Simplifiée Unipersonnelle — un associé unique, président, actions.">
          <W.AiLaunchpad formeJuridique="SASU" onPrefill={(d) => {
            if (d.denomination) setEntreprise({ denomination: d.denomination.toUpperCase() });
            if (d.sigle) setDescription({ sigle: d.sigle });
            if (d.objet) setEntreprise({ objet: d.objet });
            if (d.capitalEuros) setEntreprise({ capital: d.capitalEuros });
            if (d.dureeAnnees) setEntreprise({ dureeSociete: d.dureeAnnees });
            if (d.siege?.voie) setEtabAdresse({ voie: d.siege.voie });
            if (d.siege?.codePostal) setEtabAdresse({ codePostal: d.siege.codePostal });
            if (d.siege?.commune) setEtabAdresse({ commune: d.siege.commune });
            if (d.codeApe) setEtabActivite({ codeApe: d.codeApe });
            if (d.objet) setEtabActivite({ descriptionDetaillee: d.objet });
            if (d.dateDebutActivite) setEtabActivite({ dateDebutActivite: d.dateDebutActivite });
            const dir = d.dirigeant || {};
            if (dir.nom) setPresDesc({ nomNaissance: dir.nom.toUpperCase() });
            if (dir.prenoms?.length) setPresDesc({ prenoms: dir.prenoms });
            if (dir.dateNaissance) setPresDesc({ dateDeNaissance: dir.dateNaissance });
            if (dir.sexe) setPresDesc({ sexe: dir.sexe });
            if (dir.nationalite) setPresDesc({ codeNationalite: dir.nationalite });
            if (dir.lieuNaissance) setPresLieu({ commune: dir.lieuNaissance });
          }} />
          <W.Row>
            <W.FieldText label="Dénomination sociale *" value={ent.denomination} onChange={v => setEntreprise({ denomination: v })} placeholder="Ex: ACME CONSEIL" />
            <W.FieldText label="Sigle (optionnel)" value={dsc.sigle} onChange={v => setDescription({ sigle: v })} />
          </W.Row>
          <W.FieldText label="Nom commercial (optionnel)" value={dsc.nomCommercial} onChange={v => setDescription({ nomCommercial: v })} />
          <W.Row>
            <W.FieldText label="Forme juridique" value="SASU" onChange={() => {}} />
            <W.FieldText label="Devise" value={ent.deviseCapital} onChange={v => setEntreprise({ deviseCapital: v })} mono maxLength={3} />
          </W.Row>
          <W.Row>
            <W.FieldText label="Capital social (€) *" value={String(ent.capital || '')} onChange={v => setEntreprise({ capital: Number(v.replace(/[^\d.]/g, '')) || 0 })} mono placeholder="1" />
            <W.FieldText label="Durée (années) *" value={String(ent.dureeSociete || '')} onChange={v => setEntreprise({ dureeSociete: Number(v.replace(/[^\d]/g, '')) || 99 })} mono maxLength={3} />
          </W.Row>
          <W.FieldTextarea label="Objet social *" value={ent.objet} onChange={v => setEntreprise({ objet: v })} rows={3} placeholder="Ex: Conseil en stratégie d'entreprise et toutes activités connexes…" />
          <W.Row>
            <W.FieldText label="Date clôture exercice (MM-DD) *" value={ent.dateClotureExercice} onChange={v => setEntreprise({ dateClotureExercice: v })} mono maxLength={5} placeholder="12-31" />
            <W.FieldDate label="Date première clôture" value={ent.datePremiereCloture} onChange={v => setEntreprise({ datePremiereCloture: v })} />
          </W.Row>
        </W.Section>
      )}

      {step === 1 && (
        <W.Section title="Siège social" subtitle="Adresse du siège de la société.">
          <W.FieldText label="N° et voie *" value={etab.adresse.voie} onChange={v => setEtabAdresse({ voie: v })} />
          <W.FieldText label="Complément (bât, étage…)" value={etab.adresse.complement} onChange={v => setEtabAdresse({ complement: v })} />
          <W.Row>
            <W.FieldText label="Code postal *" value={etab.adresse.codePostal} onChange={v => setEtabAdresse({ codePostal: v })} mono maxLength={5} />
            <W.FieldText label="Commune *" value={etab.adresse.commune} onChange={v => setEtabAdresse({ commune: v })} />
          </W.Row>
          <W.FieldCheckbox label="Siège au domicile du président" checked={etab.caracteristiques.indicateurExerciceADomicile} onChange={v => setEtabCarac({ indicateurExerciceADomicile: v })} />
          <W.DocumentUploadList dossierId={dossierId} documents={documents} setDocuments={setDocuments} demoMode={demoMode} required={[
            { typeDocument: 'PJ_02', label: "Justificatif de jouissance du siège (bail, attestation hébergement)" },
          ]} />
        </W.Section>
      )}

      {step === 2 && (
        <W.Section title="Activité principale">
          <W.FieldText label="Code APE/NAF *" value={etab.activites[0].codeApe} onChange={v => setEtabActivite({ codeApe: v.toUpperCase().replace(/\s/g, '') })} mono maxLength={5} placeholder="7022Z" />
          <W.FieldTextarea label="Description détaillée de l'activité *" value={etab.activites[0].descriptionDetaillee} onChange={v => setEtabActivite({ descriptionDetaillee: v })} rows={3} placeholder="Ex: Conseil en stratégie informatique…" />
          <W.Row>
            <W.FieldDate label="Date de début d'activité *" value={etab.activites[0].dateDebutActivite} onChange={v => setEtabActivite({ dateDebutActivite: v })} />
            <W.FieldCheckbox label="Activité ambulante" checked={etab.activites[0].indicateurAmbulant} onChange={v => setEtabActivite({ indicateurAmbulant: v })} />
          </W.Row>
          <W.FieldCheckbox label="Exerce à domicile" checked={etab.caracteristiques.indicateurExerciceADomicile} onChange={v => setEtabCarac({ indicateurExerciceADomicile: v })} />
        </W.Section>
      )}

      {step === 3 && (
        <W.Section title="Président de la SASU" subtitle="Le président représente légalement la société. Peut être l'associé unique.">
          <W.IdentityOcrUpload label="Scanner la pièce d'identité du président" onExtracted={(f) => {
            const patch = {};
            if (f.nom) patch.nomNaissance = f.nom.toUpperCase();
            if (f.prenoms?.length) patch.prenoms = f.prenoms;
            if (f.dateNaissance) patch.dateDeNaissance = f.dateNaissance;
            if (f.sexe) patch.sexe = f.sexe;
            if (f.nationalite) patch.codeNationalite = f.nationalite;
            if (f.lieuNaissance) patch.lieuDeNaissance = { ...presDesc.lieuDeNaissance, commune: f.lieuNaissance };
            setPresDesc(patch);
          }} />
          <W.Row>
            <W.FieldText label="Nom de naissance *" value={presDesc.nomNaissance} onChange={v => setPresDesc({ nomNaissance: v.toUpperCase() })} />
            <W.FieldText label="Nom d'usage" value={presDesc.nomUsage} onChange={v => setPresDesc({ nomUsage: v.toUpperCase() })} />
          </W.Row>
          <div>
            <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>Prénom(s) *</label>
            {presDesc.prenoms.map((v, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input value={v} onChange={e => setPresPrenom(i, e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--ink-200)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }} />
                {presDesc.prenoms.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => rmPresPrenom(i)}>−</button>}
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={addPresPrenom}>+ Ajouter un prénom</button>
          </div>
          <W.Row>
            <W.FieldDate label="Date de naissance *" value={presDesc.dateDeNaissance} onChange={v => setPresDesc({ dateDeNaissance: v })} />
            <W.FieldSelect label="Sexe *" value={presDesc.sexe} onChange={v => setPresDesc({ sexe: v })} options={[{ value: 'M', label: 'Homme' }, { value: 'F', label: 'Femme' }]} />
          </W.Row>
          <W.Row>
            <W.FieldText label="Commune de naissance *" value={presLieu.commune} onChange={v => setPresLieu({ commune: v })} />
            <W.FieldText label="Code postal naissance" value={presLieu.codePostal} onChange={v => setPresLieu({ codePostal: v })} mono />
          </W.Row>
          <W.Row>
            <W.FieldText label="Pays de naissance *" value={presLieu.paysNaissance} onChange={v => setPresLieu({ paysNaissance: v })} />
            <W.FieldSelect label="Nationalité *" value={presDesc.codeNationalite} onChange={v => setPresDesc({ codeNationalite: v })} options={SASU_NATIONALITES.map(n => ({ value: n.code, label: n.label }))} />
          </W.Row>
          <W.FieldSelect label="Situation matrimoniale" value={presDesc.situationMatrimoniale} onChange={v => setPresDesc({ situationMatrimoniale: v })} options={SASU_SIT_MATRIMONIALE.map(s => ({ value: s.code, label: s.label }))} />
          <h4 style={{ fontSize: 14, marginTop: 4, marginBottom: 0 }}>Adresse personnelle du président</h4>
          <W.FieldText label="N° et voie *" value={presAdr.voie} onChange={v => setPresAdr({ voie: v })} />
          <W.FieldText label="Complément" value={presAdr.complement} onChange={v => setPresAdr({ complement: v })} />
          <W.Row>
            <W.FieldText label="Code postal *" value={presAdr.codePostal} onChange={v => setPresAdr({ codePostal: v })} mono maxLength={5} />
            <W.FieldText label="Commune *" value={presAdr.commune} onChange={v => setPresAdr({ commune: v })} />
          </W.Row>
        </W.Section>
      )}

      {step === 4 && (
        <W.Section title="Associé unique" subtitle="Une SASU n'a qu'un seul associé, détenant 100 % des actions.">
          <W.FieldCheckbox label="Le président est aussi l'associé unique" checked={!!pm.composition._dirigeantEstAssocie} onChange={setDirigeantEstAssocie} />
          {!pm.composition._dirigeantEstAssocie && (
            <>
              <W.Row>
                <W.FieldText label="Nom de naissance *" value={assoc.individu.nomNaissance} onChange={v => setAssocieIndividu({ nomNaissance: v.toUpperCase() })} />
                <W.FieldText label="Prénom *" value={(assoc.individu.prenoms || [''])[0]} onChange={v => setAssocieIndividu({ prenoms: [v] })} />
              </W.Row>
              <W.Row>
                <W.FieldDate label="Date de naissance *" value={assoc.individu.dateDeNaissance} onChange={v => setAssocieIndividu({ dateDeNaissance: v })} />
                <W.FieldText label="Commune de naissance *" value={assoc.individu.lieuDeNaissance.commune} onChange={v => setAssocieIndividu({ lieuDeNaissance: { ...assoc.individu.lieuDeNaissance, commune: v } })} />
              </W.Row>
              <W.FieldText label="Adresse de l'associé *" value={assoc.individu.adresseDomicile.voie} onChange={v => setAssocieIndividu({ adresseDomicile: { ...assoc.individu.adresseDomicile, voie: v } })} />
              <W.Row>
                <W.FieldText label="Code postal *" value={assoc.individu.adresseDomicile.codePostal} onChange={v => setAssocieIndividu({ adresseDomicile: { ...assoc.individu.adresseDomicile, codePostal: v } })} mono maxLength={5} />
                <W.FieldText label="Commune *" value={assoc.individu.adresseDomicile.commune} onChange={v => setAssocieIndividu({ adresseDomicile: { ...assoc.individu.adresseDomicile, commune: v } })} />
              </W.Row>
            </>
          )}
          <W.Row>
            <W.FieldText label="Apport en numéraire (€) *" value={String(assoc.apports.numeraire || '')} onChange={v => setAssocieApports({ numeraire: Number(v.replace(/[^\d.]/g, '')) || 0 })} mono />
            <W.FieldText label="Apport en nature (€)" value={String(assoc.apports.nature || '')} onChange={v => setAssocieApports({ nature: Number(v.replace(/[^\d.]/g, '')) || 0 })} mono />
          </W.Row>
          <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>L'associé unique détient 100 % des actions (SASU).</div>
        </W.Section>
      )}

      {step === 5 && (
        <W.Section title="Pièces justificatives">
          <W.DocumentUploadList dossierId={dossierId} documents={documents} setDocuments={setDocuments} demoMode={demoMode} required={[
            { typeDocument: 'PJ_01', label: "Pièce d'identité du président (CNI, passeport)" },
            { typeDocument: 'PJ_04', label: "Statuts signés de la SASU" },
            { typeDocument: 'PJ_06', label: "Attestation de dépôt des fonds (capital)" },
            { typeDocument: 'PJ_05', label: "Acte de nomination du président (si pas dans statuts)" },
            { typeDocument: 'PJ_07', label: "Liste des bénéficiaires effectifs" },
          ]} />
        </W.Section>
      )}

      {step === 6 && (
        <W.Section title="Récapitulatif" subtitle={`Ton dossier ${reference || ''} sera soumis à l'admin pour validation interne avant envoi à l'INPI.`}>
          <W.RecapBlock label="Société" rows={[
            ['Dénomination', ent.denomination],
            ['Sigle', dsc.sigle || '—'],
            ['Forme', 'SASU'],
            ['Capital', `${ent.capital} ${ent.deviseCapital}`],
            ['Durée', `${ent.dureeSociete} ans`],
            ['Clôture', ent.dateClotureExercice],
            ['Objet', ent.objet],
          ]} />
          <W.RecapBlock label="Siège social" rows={[
            ['Adresse', `${etab.adresse.voie}${etab.adresse.complement ? ', ' + etab.adresse.complement : ''}`],
            ['Ville', `${etab.adresse.codePostal} ${etab.adresse.commune}`],
          ]} />
          <W.RecapBlock label="Activité" rows={[
            ['Code APE', etab.activites[0].codeApe],
            ['Description', etab.activites[0].descriptionDetaillee],
            ['Début', etab.activites[0].dateDebutActivite],
            ['À domicile', etab.caracteristiques.indicateurExerciceADomicile ? 'Oui' : 'Non'],
          ]} />
          <W.RecapBlock label="Président" rows={[
            ['Nom', presDesc.nomNaissance],
            ['Prénom(s)', (presDesc.prenoms || []).filter(Boolean).join(', ')],
            ['Né(e) le', presDesc.dateDeNaissance],
            ['À', `${presLieu.commune} (${presLieu.paysNaissance})`],
            ['Nationalité', SASU_NATIONALITES.find(n => n.code === presDesc.codeNationalite)?.label || presDesc.codeNationalite],
            ['Adresse', `${presAdr.voie}, ${presAdr.codePostal} ${presAdr.commune}`],
          ]} />
          <W.RecapBlock label="Associé unique" rows={[
            ['Identique au président', pm.composition._dirigeantEstAssocie ? 'Oui' : 'Non'],
            ['Apport numéraire', `${assoc.apports.numeraire} €`],
            ['Apport nature', `${assoc.apports.nature || 0} €`],
            ['Détention', '100 %'],
          ]} />
          <W.RecapBlock label="Fiscalité" rows={[
            ['Régime', fisc.regimeImposition],
            ['TVA', fisc.optionTVA.regimeTVA],
          ]} />
          <W.RecapBlock label="Pièces jointes" rows={documents.length ? documents.map(d => [d.name, (d.size_bytes/1024).toFixed(0) + ' Ko']) : [['—', 'Aucune pièce']]} />
          <W.FieldSelect label="Régime fiscal" value={fisc.regimeImposition} onChange={v => setFisc({ regimeImposition: v })} options={[
            { value: 'IS', label: 'Impôt sur les sociétés (IS) — par défaut' },
            { value: 'IR', label: 'Impôt sur le revenu (IR) — option 5 ans' },
          ]} />
          <W.FieldSelect label="Régime TVA" value={fisc.optionTVA.regimeTVA} onChange={v => setFisc({ optionTVA: { regimeTVA: v } })} options={[
            { value: 'FRANCHISE_BASE', label: 'Franchise en base' },
            { value: 'REEL_SIMPLIFIE', label: 'Réel simplifié' },
            { value: 'REEL_NORMAL', label: 'Réel normal' },
          ]} />
        </W.Section>
      )}

      <W.Nav step={step} max={STEPS_SASU.length - 1} onPrev={prev} onNext={next} onSubmit={submit} saving={saving} submitting={submitting}
        submitLabel={demoMode ? 'Créer un compte pour soumettre →' : 'Soumettre pour validation'} />
    </div>
  );
};

window.WizardSASU = WizardSASU;
