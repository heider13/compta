/* eslint-disable */
// Wizard création EURL (Entreprise Unipersonnelle à Responsabilité Limitée) — 7 étapes
// Schema INPI personneMorale, forme_juridique='EURL', save DRAFT par étape

const STEPS_EURL = ['Société', 'Siège', 'Activité', 'Gérant', 'Associé unique', 'Pièces', 'Récap'];

const EURL_NATIONALITES = [
  { code: 'FRA', label: 'Française' }, { code: 'BEL', label: 'Belge' }, { code: 'CHE', label: 'Suisse' },
  { code: 'ITA', label: 'Italienne' }, { code: 'ESP', label: 'Espagnole' }, { code: 'PRT', label: 'Portugaise' },
  { code: 'DEU', label: 'Allemande' }, { code: 'MAR', label: 'Marocaine' }, { code: 'DZA', label: 'Algérienne' },
  { code: 'TUN', label: 'Tunisienne' }, { code: 'GBR', label: 'Britannique' }, { code: 'USA', label: 'Américaine' },
];

const EURL_SIT_MATRIMONIALE = [
  { code: 'C', label: 'Célibataire' }, { code: 'M', label: 'Marié(e)' }, { code: 'P', label: 'Pacsé(e)' },
  { code: 'D', label: 'Divorcé(e)' }, { code: 'V', label: 'Veuf/Veuve' },
];

const initEurlContent = () => ({
  personneMorale: {
    identite: {
      entreprise: {
        denomination: '', formeJuridique: 'EURL',
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
          role: 'GERANT',
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
      _gerantEstAssocie: true,
    },
    etablissementPrincipal: {
      descriptionEtablissement: { rolePourEntreprise: 2, indicateurEtablissementPrincipal: true, indicateurPrincipal: true },
      adresse: { voie: '', complement: '', codePostal: '', commune: '', codePays: 'FRA' },
      activites: [{ codeApe: '', descriptionDetaillee: '', dateDebutActivite: '', indicateurAmbulant: false, indicateurPrincipal: true }],
      caracteristiques: { indicateurExerciceADomicile: false, indicateurEntrepriseDomiciliataire: false },
    },
    optionsFiscales: {
      regimeImposition: 'IR',
      optionTVA: { regimeTVA: 'FRANCHISE_BASE' },
    },
  },
});

const WizardEURL = ({ setRoute, dossierId: initialDossierId, onCreated, demoMode = false }) => {
  const W = window.WC;
  const [step, setStep] = React.useState(0);
  const [content, setContent] = React.useState(() => {
    if (demoMode) {
      try {
        const saved = localStorage.getItem('compta_demo_wizard_eurl');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return initEurlContent();
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
  const ger = pm.composition.pouvoirs[0].individu;
  const gerDesc = ger.descriptionPersonne;
  const gerAdr = ger.adresseDomicile;
  const gerLieu = gerDesc.lieuDeNaissance;
  const assoc = pm.composition.associes[0];
  const etab = pm.etablissementPrincipal;
  const fisc = pm.optionsFiscales;

  const setEntreprise = (patch) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale, identite: { ...c.personneMorale.identite, entreprise: { ...c.personneMorale.identite.entreprise, ...patch } } } }));
  const setDescription = (patch) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale, identite: { ...c.personneMorale.identite, description: { ...c.personneMorale.identite.description, ...patch } } } }));
  const setGerant = (patch) => setContent(c => {
    const p = c.personneMorale.composition.pouvoirs[0];
    return { ...c, personneMorale: { ...c.personneMorale, composition: { ...c.personneMorale.composition, pouvoirs: [{ ...p, individu: { ...p.individu, ...patch } }] } } };
  });
  const setGerDesc = (patch) => setGerant({ descriptionPersonne: { ...gerDesc, ...patch } });
  const setGerLieu = (patch) => setGerDesc({ lieuDeNaissance: { ...gerLieu, ...patch } });
  const setGerAdr = (patch) => setGerant({ adresseDomicile: { ...gerAdr, ...patch } });
  const setAssocie = (patch) => setContent(c => {
    const arr = c.personneMorale.composition.associes.slice();
    arr[0] = { ...arr[0], ...patch };
    return { ...c, personneMorale: { ...c.personneMorale, composition: { ...c.personneMorale.composition, associes: arr } } };
  });
  const setAssocieIndividu = (patch) => setAssocie({ individu: { ...assoc.individu, ...patch } });
  const setAssocieApports = (patch) => setAssocie({ apports: { ...assoc.apports, ...patch } });
  const setGerantEstAssocie = (v) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale, composition: { ...c.personneMorale.composition, _gerantEstAssocie: v } } }));
  const setEtab = (patch) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale, etablissementPrincipal: { ...c.personneMorale.etablissementPrincipal, ...patch } } }));
  const setEtabAdresse = (patch) => setEtab({ adresse: { ...etab.adresse, ...patch } });
  const setEtabActivite = (patch) => setEtab({ activites: [{ ...etab.activites[0], ...patch }] });
  const setEtabCarac = (patch) => setEtab({ caracteristiques: { ...etab.caracteristiques, ...patch } });
  const setFisc = (patch) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale, optionsFiscales: { ...c.personneMorale.optionsFiscales, ...patch } } }));

  const buildPayload = () => {
    let payload = content;
    if (payload.personneMorale.composition._gerantEstAssocie) {
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
                nomNaissance: gerDesc.nomNaissance,
                prenoms: gerDesc.prenoms,
                dateDeNaissance: gerDesc.dateDeNaissance,
                lieuDeNaissance: gerLieu,
                adresseDomicile: gerAdr,
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

  const computedClientName = () => (ent.denomination || '').trim() || (gerDesc.prenoms[0] && gerDesc.nomNaissance ? `${gerDesc.prenoms[0]} ${gerDesc.nomNaissance}`.trim() : '');

  const saveDraft = async () => {
    setSaving(true); setError(null);
    try {
      const payload = buildPayload();
      if (demoMode) {
        try { localStorage.setItem('compta_demo_wizard_eurl', JSON.stringify(payload)); } catch {}
      } else if (!dossierId) {
        const cn = computedClientName() || 'Nouvelle EURL';
        const r = await window.ComptaAPI.apiFetch('/api/dossiers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: cn, type_formalite: 'CREATION', forme_juridique: 'EURL', inpi_content: payload }),
        });
        setDossierId(r.dossier.id); setReference(r.dossier.reference);
      } else {
        await window.ComptaAPI.apiFetch(`/api/dossiers/${dossierId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: computedClientName(), forme_juridique: 'EURL', inpi_content: payload }),
        });
      }
    } catch (e) { setError(e.message); throw e; }
    finally { setSaving(false); }
  };

  const next = async () => { try { await saveDraft(); setStep(s => s + 1); } catch {} };
  const prev = () => setStep(s => Math.max(0, s - 1));

  const submit = async () => {
    if (demoMode) {
      try { localStorage.setItem('compta_demo_wizard_eurl', JSON.stringify(buildPayload())); } catch {}
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

  const setGerPrenom = (i, v) => {
    const arr = gerDesc.prenoms.slice(); arr[i] = v;
    setGerDesc({ prenoms: arr });
  };
  const addGerPrenom = () => setGerDesc({ prenoms: [...gerDesc.prenoms, ''] });
  const rmGerPrenom = (i) => setGerDesc({ prenoms: gerDesc.prenoms.filter((_, idx) => idx !== i) });

  return (
    <div style={{ maxWidth: 820 }}>
      <W.ProgressBar steps={STEPS_EURL} current={step} onStepClick={async (i) => { try { await saveDraft(); } catch {} setStep(i); }} />
      <W.RgsWarning />
      {error && <div style={{ color: '#b42318', padding: 12, marginBottom: 12, fontSize: 13, background: '#FEE2E2', borderRadius: 8 }}>{error}</div>}

      {step === 0 && (
        <W.Section title="Votre société" subtitle="Une EURL : vous êtes seul aux commandes, à la fois associé unique et gérant. Déjà pré-rempli si vous avez utilisé l'assistant — vérifiez simplement.">
          <W.AiLaunchpad formeJuridique="EURL" onPrefill={(d) => {
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
            if (dir.nom) setGerDesc({ nomNaissance: dir.nom.toUpperCase() });
            if (dir.prenoms?.length) setGerDesc({ prenoms: dir.prenoms });
            if (dir.dateNaissance) setGerDesc({ dateDeNaissance: dir.dateNaissance });
            if (dir.sexe) setGerDesc({ sexe: dir.sexe });
            if (dir.nationalite) setGerDesc({ codeNationalite: dir.nationalite });
            if (dir.lieuNaissance) setGerLieu({ commune: dir.lieuNaissance });
          }} />
          <W.Row>
            <W.FieldText label="Dénomination sociale *" value={ent.denomination} onChange={v => setEntreprise({ denomination: v })} placeholder="Ex: ACME CONSEIL EURL" />
            <W.FieldText label="Sigle (optionnel)" value={dsc.sigle} onChange={v => setDescription({ sigle: v })} />
          </W.Row>
          <W.FieldText label="Nom commercial (optionnel)" value={dsc.nomCommercial} onChange={v => setDescription({ nomCommercial: v })} />
          <W.Row>
            <W.FieldText label="Forme juridique" value="EURL" onChange={() => {}} />
            <W.FieldText label="Devise" value={ent.deviseCapital} onChange={v => setEntreprise({ deviseCapital: v })} mono maxLength={3} />
          </W.Row>
          <W.Row>
            <W.FieldText label="Capital social (€) *" value={String(ent.capital || '')} onChange={v => setEntreprise({ capital: Number(v.replace(/[^\d.]/g, '')) || 0 })} mono placeholder="1" />
            <W.FieldText label="Durée (années) *" value={String(ent.dureeSociete || '')} onChange={v => setEntreprise({ dureeSociete: Number(v.replace(/[^\d]/g, '')) || 99 })} mono maxLength={3} />
          </W.Row>
          <W.FieldTextarea label="Objet social *" value={ent.objet} onChange={v => setEntreprise({ objet: v })} rows={3} placeholder="Ex: Conseil, formation et toutes activités connexes…" />
          <W.Row>
            <W.FieldText label="Date clôture exercice (MM-DD) *" value={ent.dateClotureExercice} onChange={v => setEntreprise({ dateClotureExercice: v })} mono maxLength={5} placeholder="12-31" />
            <W.FieldDate label="Date première clôture" value={ent.datePremiereCloture} onChange={v => setEntreprise({ datePremiereCloture: v })} />
          </W.Row>
        </W.Section>
      )}

      {step === 1 && (
        <W.Section title="L'adresse de votre société" subtitle="Où votre société sera domiciliée. Ça peut être chez vous.">
          <W.FieldText label="N° et voie *" value={etab.adresse.voie} onChange={v => setEtabAdresse({ voie: v })} />
          <W.FieldText label="Complément (bât, étage…)" value={etab.adresse.complement} onChange={v => setEtabAdresse({ complement: v })} />
          <W.Row>
            <W.FieldText label="Code postal *" value={etab.adresse.codePostal} onChange={v => setEtabAdresse({ codePostal: v })} mono maxLength={5} />
            <W.FieldText label="Commune *" value={etab.adresse.commune} onChange={v => setEtabAdresse({ commune: v })} />
          </W.Row>
          <W.FieldCheckbox label="Siège au domicile du gérant" checked={etab.caracteristiques.indicateurExerciceADomicile} onChange={v => setEtabCarac({ indicateurExerciceADomicile: v })} />
          <W.DocumentUploadList dossierId={dossierId} documents={documents} setDocuments={setDocuments} demoMode={demoMode} required={[
            { typeDocument: 'PJ_02', label: "Justificatif du local (bail, facture ou attestation d'hébergement)" },
          ]} />
        </W.Section>
      )}

      {step === 2 && (
        <W.Section title="Votre activité" subtitle="Ce que votre société va faire au quotidien. Déjà pré-rempli si vous avez utilisé l'assistant — vérifiez simplement.">
          <W.FieldText label="Activité — code APE *" value={etab.activites[0].codeApe} onChange={v => setEtabActivite({ codeApe: v.toUpperCase().replace(/\s/g, '') })} mono maxLength={5} placeholder="Ex: 6820A — l'IA le déduit de votre description" />
          <W.FieldTextarea label="Description détaillée de l'activité *" value={etab.activites[0].descriptionDetaillee} onChange={v => setEtabActivite({ descriptionDetaillee: v })} rows={3} placeholder="Ex: Conseil en gestion d'entreprise…" />
          <W.Row>
            <W.FieldDate label="Date de début d'activité *" value={etab.activites[0].dateDebutActivite} onChange={v => setEtabActivite({ dateDebutActivite: v })} />
            <W.FieldCheckbox label="Activité ambulante" checked={etab.activites[0].indicateurAmbulant} onChange={v => setEtabActivite({ indicateurAmbulant: v })} />
          </W.Row>
          <W.FieldCheckbox label="Exerce à domicile" checked={etab.caracteristiques.indicateurExerciceADomicile} onChange={v => setEtabCarac({ indicateurExerciceADomicile: v })} />
        </W.Section>
      )}

      {step === 3 && (
        <W.Section title="Le gérant" subtitle="La personne qui dirige la société — c'est souvent vous. Scannez une pièce d'identité, on remplit le reste.">
          <W.IdentityOcrUpload label="Scanner la pièce d'identité du gérant" onExtracted={(f) => {
            const patch = {};
            if (f.nom) patch.nomNaissance = f.nom.toUpperCase();
            if (f.prenoms?.length) patch.prenoms = f.prenoms;
            if (f.dateNaissance) patch.dateDeNaissance = f.dateNaissance;
            if (f.sexe) patch.sexe = f.sexe;
            if (f.nationalite) patch.codeNationalite = f.nationalite;
            setGerDesc(patch);
            if (f.lieuNaissance) setGerLieu({ commune: f.lieuNaissance });
          }} />
          <W.Row>
            <W.FieldText label="Nom de naissance *" value={gerDesc.nomNaissance} onChange={v => setGerDesc({ nomNaissance: v.toUpperCase() })} />
            <W.FieldText label="Nom d'usage" value={gerDesc.nomUsage} onChange={v => setGerDesc({ nomUsage: v.toUpperCase() })} />
          </W.Row>
          <div>
            <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>Prénom(s) *</label>
            {gerDesc.prenoms.map((v, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input value={v} onChange={e => setGerPrenom(i, e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--ink-200)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }} />
                {gerDesc.prenoms.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => rmGerPrenom(i)}>−</button>}
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={addGerPrenom}>+ Ajouter un prénom</button>
          </div>
          <W.Row>
            <W.FieldDate label="Date de naissance *" value={gerDesc.dateDeNaissance} onChange={v => setGerDesc({ dateDeNaissance: v })} />
            <W.FieldSelect label="Sexe *" value={gerDesc.sexe} onChange={v => setGerDesc({ sexe: v })} options={[{ value: 'M', label: 'Homme' }, { value: 'F', label: 'Femme' }]} />
          </W.Row>
          <W.Row>
            <W.FieldText label="Commune de naissance *" value={gerLieu.commune} onChange={v => setGerLieu({ commune: v })} />
            <W.FieldText label="Code postal naissance" value={gerLieu.codePostal} onChange={v => setGerLieu({ codePostal: v })} mono />
          </W.Row>
          <W.Row>
            <W.FieldText label="Pays de naissance *" value={gerLieu.paysNaissance} onChange={v => setGerLieu({ paysNaissance: v })} />
            <W.FieldSelect label="Nationalité *" value={gerDesc.codeNationalite} onChange={v => setGerDesc({ codeNationalite: v })} options={EURL_NATIONALITES.map(n => ({ value: n.code, label: n.label }))} />
          </W.Row>
          <W.FieldSelect label="Situation matrimoniale" value={gerDesc.situationMatrimoniale} onChange={v => setGerDesc({ situationMatrimoniale: v })} options={EURL_SIT_MATRIMONIALE.map(s => ({ value: s.code, label: s.label }))} />
          <h4 style={{ fontSize: 14, marginTop: 4, marginBottom: 0 }}>Adresse personnelle du gérant</h4>
          <W.FieldText label="N° et voie *" value={gerAdr.voie} onChange={v => setGerAdr({ voie: v })} />
          <W.FieldText label="Complément" value={gerAdr.complement} onChange={v => setGerAdr({ complement: v })} />
          <W.Row>
            <W.FieldText label="Code postal *" value={gerAdr.codePostal} onChange={v => setGerAdr({ codePostal: v })} mono maxLength={5} />
            <W.FieldText label="Commune *" value={gerAdr.commune} onChange={v => setGerAdr({ commune: v })} />
          </W.Row>
        </W.Section>
      )}

      {step === 4 && (
        <W.Section title="L'associé unique" subtitle="Dans une EURL, une seule personne détient la totalité de la société — 100 % des parts.">
          <W.FieldCheckbox label="Le gérant est aussi l'associé unique" checked={!!pm.composition._gerantEstAssocie} onChange={setGerantEstAssocie} />
          {!pm.composition._gerantEstAssocie && (
            <>
              <W.IdentityOcrUpload label="Scanner la pièce d'identité de l'associé" onExtracted={(f) => {
                const patch = {};
                if (f.nom) patch.nomNaissance = f.nom.toUpperCase();
                if (f.prenoms?.length) patch.prenoms = f.prenoms;
                if (f.dateNaissance) patch.dateDeNaissance = f.dateNaissance;
                if (f.lieuNaissance) patch.lieuDeNaissance = { ...assoc.individu.lieuDeNaissance, commune: f.lieuNaissance };
                setAssocieIndividu(patch);
              }} />
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
          <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>L'associé unique détient 100 % des parts sociales (EURL).</div>
        </W.Section>
      )}

      {step === 5 && (
        <W.Section title="Vos documents" subtitle="Les quelques pièces à joindre. Glissez-les ici, on s'occupe du classement.">
          <W.DocumentUploadList dossierId={dossierId} documents={documents} setDocuments={setDocuments} demoMode={demoMode} required={[
            { typeDocument: 'PJ_01', label: "Pièce d'identité du gérant (carte d'identité ou passeport)" },
            { typeDocument: 'PJ_04', label: "Statuts signés de la société" },
            { typeDocument: 'PJ_06', label: "Attestation de dépôt du capital (banque)" },
            { typeDocument: 'PJ_05', label: "Nomination du gérant (si elle n'est pas dans les statuts)" },
            { typeDocument: 'PJ_07', label: "Liste des bénéficiaires effectifs" },
          ]} />
        </W.Section>
      )}

      {step === 6 && (
        <W.Section title="On y est presque" subtitle={`Vérifiez votre dossier ${reference || ''} en un coup d'œil. Notre équipe le relit et se charge des démarches pour vous.`}>
          <W.RecapBlock label="Société" rows={[
            ['Dénomination', ent.denomination],
            ['Sigle', dsc.sigle || '—'],
            ['Forme', 'EURL'],
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
          <W.RecapBlock label="Gérant" rows={[
            ['Nom', gerDesc.nomNaissance],
            ['Prénom(s)', (gerDesc.prenoms || []).filter(Boolean).join(', ')],
            ['Né(e) le', gerDesc.dateDeNaissance],
            ['À', `${gerLieu.commune} (${gerLieu.paysNaissance})`],
            ['Nationalité', EURL_NATIONALITES.find(n => n.code === gerDesc.codeNationalite)?.label || gerDesc.codeNationalite],
            ['Adresse', `${gerAdr.voie}, ${gerAdr.codePostal} ${gerAdr.commune}`],
          ]} />
          <W.RecapBlock label="Associé unique" rows={[
            ['Identique au gérant', pm.composition._gerantEstAssocie ? 'Oui' : 'Non'],
            ['Apport numéraire', `${assoc.apports.numeraire} €`],
            ['Apport nature', `${assoc.apports.nature || 0} €`],
            ['Détention', '100 % des parts sociales'],
          ]} />
          <W.RecapBlock label="Fiscalité" rows={[
            ['Régime', fisc.regimeImposition],
            ['TVA', fisc.optionTVA.regimeTVA],
          ]} />
          <W.RecapBlock label="Pièces jointes" rows={documents.length ? documents.map(d => [d.name, (d.size_bytes/1024).toFixed(0) + ' Ko']) : [['—', 'Aucune pièce']]} />
          <W.FieldSelect label="Régime fiscal" value={fisc.regimeImposition} onChange={v => setFisc({ regimeImposition: v })} options={[
            { value: 'IR', label: "Impôt sur le revenu (IR) — par défaut pour EURL" },
            { value: 'IS', label: "Impôt sur les sociétés (IS) — option" },
          ]} />
          <W.FieldSelect label="Régime TVA" value={fisc.optionTVA.regimeTVA} onChange={v => setFisc({ optionTVA: { regimeTVA: v } })} options={[
            { value: 'FRANCHISE_BASE', label: 'Franchise en base' },
            { value: 'REEL_SIMPLIFIE', label: 'Réel simplifié' },
            { value: 'REEL_NORMAL', label: 'Réel normal' },
          ]} />
        </W.Section>
      )}

      <W.Nav step={step} max={STEPS_EURL.length - 1} onPrev={prev} onNext={next} onSubmit={submit} saving={saving} submitting={submitting}
        submitLabel={demoMode ? 'Créer un compte pour soumettre →' : 'Soumettre pour validation'} />
    </div>
  );
};

window.WizardEURL = WizardEURL;
