/* eslint-disable */
// Wizard de création Holding (SAS / SASU / SARL) — 7 étapes, personne morale, save DRAFT par étape
// Étape 0 : choix de la forme sous-jacente, puis on suit le pattern PM standard.

const STEPS_HOLDING = ['Forme', 'Société', 'Siège', 'Objet', 'Dirigeant', 'Associé(s)', 'Pièces & Récap'];

const NATIONALITES_HOLD = [
  { code: 'FRA', label: 'Française' }, { code: 'BEL', label: 'Belge' }, { code: 'CHE', label: 'Suisse' },
  { code: 'ITA', label: 'Italienne' }, { code: 'ESP', label: 'Espagnole' }, { code: 'PRT', label: 'Portugaise' },
  { code: 'DEU', label: 'Allemande' }, { code: 'MAR', label: 'Marocaine' }, { code: 'DZA', label: 'Algérienne' },
  { code: 'TUN', label: 'Tunisienne' }, { code: 'GBR', label: 'Britannique' }, { code: 'USA', label: 'Américaine' },
];

const FORMES_SOUS_JACENTES = [
  { id: 'SAS',  label: 'SAS — Société par Actions Simplifiée', desc: 'Forme privilégiée pour holding : souplesse statutaire, plusieurs associés.' },
  { id: 'SASU', label: 'SASU — SAS Unipersonnelle',             desc: 'Un seul associé. Idéal pour holding patrimoniale individuelle.' },
  { id: 'SARL', label: 'SARL — Société À Responsabilité Limitée', desc: 'Cadre plus rigide, possibilité d\'option SARL de famille.' },
];

const ROLE_LABEL = (forme) => (forme === 'SARL' ? 'GERANT' : 'PRESIDENT');

const emptyDirigeantHolding = (forme) => ({
  descriptionPersonne: {
    nomNaissance: '', prenoms: [''], dateDeNaissance: '', lieuDeNaissance: '',
    codeNationalite: 'FRA', sexe: 'M',
  },
  adresseDomicile: { voie: '', codePostal: '', commune: '', codePays: 'FRA' },
  role: ROLE_LABEL(forme),
});

const emptyAssocieHolding = () => ({
  type: 'PHYSIQUE',
  individu: {
    nomNaissance: '', prenoms: [''], dateDeNaissance: '', lieuDeNaissance: '',
    adresseDomicile: { voie: '', codePostal: '', commune: '', codePays: 'FRA' },
  },
  apports: { numeraire: 0, nature: 0 },
  partsSociales: 0,
  pourcentageDetention: 0,
});

const initHoldingContent = () => ({
  personneMorale: {
    identite: {
      entreprise: {
        denomination: '', formeJuridique: 'SAS',
        capital: 1000, deviseCapital: 'EUR',
        objet: 'La prise de participations dans toutes sociétés françaises ou étrangères, la gestion d\'un portefeuille de titres et la fourniture de prestations administratives, comptables et financières aux filiales.',
        dureeSociete: 99,
        dateClotureExercice: '12-31', datePremiereCloture: '',
      },
      description: {
        sigle: '', nomCommercial: '', capitalVariable: false,
      },
    },
    composition: {
      pouvoirs: [{ individu: emptyDirigeantHolding('SAS') }],
      associes: [emptyAssocieHolding()],
    },
    etablissementPrincipal: {
      descriptionEtablissement: { rolePourEntreprise: 2, indicateurEtablissementPrincipal: true },
      adresse: { voie: '', codePostal: '', commune: '', codePays: 'FRA' },
      activites: [{ codeApe: '6420Z', descriptionDetaillee: 'Activités des sociétés holding', dateDebutActivite: '', indicateurPrincipal: true }],
      caracteristiques: { indicateurExerciceADomicile: false },
    },
    optionsFiscales: {
      regimeImposition: 'IS',
      optionTVA: { regimeTVA: 'REEL_NORMAL' },
    },
    _holdingType: 'PARTICIPATION', // PARTICIPATION | PORTEFEUILLE | MIXTE
    _formeSousJacente: 'SAS',
  },
});

const WizardHolding = ({ setRoute, dossierId: initialDossierId, onCreated, demoMode = false }) => {
  const W = window.WC;
  const [step, setStep] = React.useState(0);
  const [content, setContent] = React.useState(() => {
    if (demoMode) {
      try {
        const saved = localStorage.getItem('compta_demo_wizard_holding');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return initHoldingContent();
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
  const formeSJ = pm._formeSousJacente || 'SAS';

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
  const setPmField = (key, val) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale, [key]: val } }));

  const chooseForme = (forme) => setContent(c => {
    const nextRole = ROLE_LABEL(forme);
    const newPouvoirs = c.personneMorale.composition.pouvoirs.map(p => ({ ...p, individu: { ...p.individu, role: nextRole } }));
    let associesArr = c.personneMorale.composition.associes;
    if (forme === 'SASU' && associesArr.length > 1) associesArr = [associesArr[0]];
    if (forme !== 'SASU' && associesArr.length < 2) associesArr = [...associesArr, emptyAssocieHolding()];
    return { ...c, personneMorale: { ...c.personneMorale,
      _formeSousJacente: forme,
      identite: { ...c.personneMorale.identite, entreprise: { ...c.personneMorale.identite.entreprise, formeJuridique: forme } },
      composition: { ...c.personneMorale.composition, pouvoirs: newPouvoirs, associes: associesArr },
    } };
  });

  const updateDirigeant = (i, patch) => setContent(c => {
    const arr = c.personneMorale.composition.pouvoirs.map((p, idx) => idx === i ? { ...p, individu: { ...p.individu, ...patch } } : p);
    return { ...c, personneMorale: { ...c.personneMorale, composition: { ...c.personneMorale.composition, pouvoirs: arr } } };
  });
  const updateDirigeantDesc = (i, patch) => updateDirigeant(i, { descriptionPersonne: { ...pouvoirs[i].individu.descriptionPersonne, ...patch } });
  const updateDirigeantAdr = (i, patch) => updateDirigeant(i, { adresseDomicile: { ...pouvoirs[i].individu.adresseDomicile, ...patch } });

  const updateAssocie = (i, patch) => setContent(c => {
    const arr = c.personneMorale.composition.associes.map((a, idx) => idx === i ? { ...a, ...patch } : a);
    return { ...c, personneMorale: { ...c.personneMorale, composition: { ...c.personneMorale.composition, associes: arr } } };
  });
  const updateAssocieIndividu = (i, patch) => updateAssocie(i, { individu: { ...associes[i].individu, ...patch } });
  const updateAssocieAdr = (i, patch) => updateAssocieIndividu(i, { adresseDomicile: { ...associes[i].individu.adresseDomicile, ...patch } });
  const updateAssocieApports = (i, patch) => updateAssocie(i, { apports: { ...associes[i].apports, ...patch } });
  const addAssocie = () => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale,
    composition: { ...c.personneMorale.composition, associes: [...c.personneMorale.composition.associes, emptyAssocieHolding()] } } }));
  const rmAssocie = (i) => setContent(c => ({ ...c, personneMorale: { ...c.personneMorale,
    composition: { ...c.personneMorale.composition, associes: c.personneMorale.composition.associes.filter((_, idx) => idx !== i) } } }));

  const minAssocies = formeSJ === 'SASU' ? 1 : (formeSJ === 'SARL' ? 2 : 1);

  const computedClientName = () => entreprise.denomination?.trim() || `Nouvelle Holding (${formeSJ})`;

  const saveDraft = async () => {
    setSaving(true); setError(null);
    try {
      if (demoMode) {
        try { localStorage.setItem('compta_demo_wizard_holding', JSON.stringify(content)); } catch {}
      } else if (!dossierId) {
        const r = await window.ComptaAPI.apiFetch('/api/dossiers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: computedClientName(), type_formalite: 'CREATION', forme_juridique: 'HOLDING', inpi_content: content }),
        });
        setDossierId(r.dossier.id); setReference(r.dossier.reference);
      } else {
        await window.ComptaAPI.apiFetch(`/api/dossiers/${dossierId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: computedClientName(), forme_juridique: 'HOLDING', inpi_content: content }),
        });
      }
    } catch (e) { setError(e.message); throw e; }
    finally { setSaving(false); }
  };

  const next = async () => { try { await saveDraft(); setStep(s => s + 1); } catch {} };
  const prev = () => setStep(s => Math.max(0, s - 1));

  const submit = async () => {
    if (demoMode) {
      try { localStorage.setItem('compta_demo_wizard_holding', JSON.stringify(content)); } catch {}
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
      <W.ProgressBar steps={STEPS_HOLDING} current={step} onStepClick={async (i) => { try { await saveDraft(); } catch {} setStep(i); }} />
      {error && <div style={{ color: '#b42318', padding: 12, marginBottom: 12, fontSize: 13, background: '#FEE2E2', borderRadius: 8 }}>{error}</div>}

      {step === 0 && (
        <W.Section title="Forme juridique sous-jacente" subtitle="Une holding n'est pas une forme juridique en soi. Choisis la forme qui portera l'activité de holding.">
          <div style={{ display: 'grid', gap: 8 }}>
            {FORMES_SOUS_JACENTES.map(f => (
              <label key={f.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, border: `1px solid ${formeSJ === f.id ? 'var(--accent)' : 'var(--ink-200)'}`, borderRadius: 8, cursor: 'pointer', background: formeSJ === f.id ? 'rgba(91, 54, 214, 0.05)' : 'white' }}>
                <input type="radio" name="formeSJ" checked={formeSJ === f.id} onChange={() => chooseForme(f.id)} style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{f.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </W.Section>
      )}

      {step === 1 && (
        <W.Section title={`La holding (${formeSJ})`} subtitle="Identité de la société holding à créer.">
          <W.FieldText label="Dénomination sociale *" value={entreprise.denomination} onChange={v => setEntreprise({ denomination: v })} placeholder="Ex: HOLDING DUPONT" />
          <W.Row>
            <W.FieldText label="Sigle (optionnel)" value={descPM.sigle} onChange={v => setDescPM({ sigle: v })} />
            <W.FieldText label="Nom commercial (optionnel)" value={descPM.nomCommercial} onChange={v => setDescPM({ nomCommercial: v })} />
          </W.Row>
          <W.Row>
            <W.FieldText label="Capital social (€) *" value={String(entreprise.capital)} onChange={v => setEntreprise({ capital: Number((v || '').replace(/[^0-9.]/g, '')) || 0 })} mono />
            <W.FieldText label="Durée (années)" value={String(entreprise.dureeSociete)} onChange={v => setEntreprise({ dureeSociete: Number(v) || 99 })} mono maxLength={3} />
          </W.Row>
          <W.FieldCheckbox label="Capital variable" checked={descPM.capitalVariable} onChange={v => setDescPM({ capitalVariable: v })} />
          <W.Row>
            <W.FieldText label="Clôture exercice (MM-DD)" value={entreprise.dateClotureExercice} onChange={v => setEntreprise({ dateClotureExercice: v })} mono placeholder="12-31" maxLength={5} />
            <W.FieldDate label="1re clôture (date)" value={entreprise.datePremiereCloture} onChange={v => setEntreprise({ datePremiereCloture: v })} />
          </W.Row>
          <W.Row>
            <W.FieldSelect label="Régime fiscal" value={fisc.regimeImposition} onChange={v => setFisc({ regimeImposition: v })} options={[
              { value: 'IS', label: 'IS (par défaut)' },
              { value: 'IR', label: 'IR (option)' },
            ]} />
            <W.FieldSelect label="Régime TVA" value={fisc.optionTVA.regimeTVA} onChange={v => setFisc({ optionTVA: { ...fisc.optionTVA, regimeTVA: v } })} options={[
              { value: 'FRANCHISE_BASE', label: 'Franchise en base' },
              { value: 'REEL_SIMPLIFIE', label: 'Réel simplifié' },
              { value: 'REEL_NORMAL', label: 'Réel normal' },
            ]} />
          </W.Row>
        </W.Section>
      )}

      {step === 2 && (
        <W.Section title="Siège social" subtitle="Adresse administrative de la holding.">
          <W.FieldText label="N° et voie *" value={etab.adresse.voie} onChange={v => setEtabAdresse({ voie: v })} />
          <W.Row>
            <W.FieldText label="Code postal *" value={etab.adresse.codePostal} onChange={v => setEtabAdresse({ codePostal: v })} mono maxLength={5} />
            <W.FieldText label="Commune *" value={etab.adresse.commune} onChange={v => setEtabAdresse({ commune: v })} />
          </W.Row>
          <W.FieldCheckbox label="Siège chez le dirigeant" checked={etab.caracteristiques.indicateurExerciceADomicile} onChange={v => setEtab({ caracteristiques: { ...etab.caracteristiques, indicateurExerciceADomicile: v } })} />
        </W.Section>
      )}

      {step === 3 && (
        <W.Section title="Objet de la holding" subtitle="Précise le type d'activité financière et patrimoniale.">
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              { id: 'PARTICIPATION', label: 'Prise de participation (holding animatrice)' },
              { id: 'PORTEFEUILLE', label: 'Gestion de portefeuille (holding patrimoniale)' },
              { id: 'MIXTE', label: 'Mixte (participation + portefeuille + prestations)' },
            ].map(o => (
              <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, border: `1px solid ${pm._holdingType === o.id ? 'var(--accent)' : 'var(--ink-200)'}`, borderRadius: 8, cursor: 'pointer', background: pm._holdingType === o.id ? 'rgba(91, 54, 214, 0.05)' : 'white' }}>
                <input type="radio" name="holdType" checked={pm._holdingType === o.id} onChange={() => setPmField('_holdingType', o.id)} style={{ accentColor: 'var(--accent)' }} />
                <span style={{ fontSize: 14 }}>{o.label}</span>
              </label>
            ))}
          </div>
          <W.FieldTextarea label="Objet social (texte des statuts) *" value={entreprise.objet} onChange={v => setEntreprise({ objet: v })} rows={4} />
          <W.Row>
            <W.FieldText label="Code APE/NAF *" value={etab.activites[0].codeApe} onChange={v => setEtabActivite({ codeApe: v.toUpperCase().replace(/\s/g, '') })} mono maxLength={5} placeholder="6420Z" />
            <W.FieldDate label="Date de début d'activité *" value={etab.activites[0].dateDebutActivite} onChange={v => setEtabActivite({ dateDebutActivite: v })} />
          </W.Row>
          <W.FieldTextarea label="Description détaillée de l'activité" value={etab.activites[0].descriptionDetaillee} onChange={v => setEtabActivite({ descriptionDetaillee: v })} rows={2} />
        </W.Section>
      )}

      {step === 4 && (
        <W.Section title={`Dirigeant — ${ROLE_LABEL(formeSJ)}`} subtitle={`Le ${ROLE_LABEL(formeSJ).toLowerCase()} représente légalement la holding.`}>
          {pouvoirs.map((p, i) => {
            const d = p.individu;
            return (
              <div key={i} style={{ border: '1px solid var(--ink-200)', borderRadius: 10, padding: 14, display: 'grid', gap: 12 }}>
                <strong style={{ fontSize: 13 }}>{ROLE_LABEL(formeSJ)} #{i + 1}</strong>
                <W.Row>
                  <W.FieldText label="Nom de naissance *" value={d.descriptionPersonne.nomNaissance} onChange={v => updateDirigeantDesc(i, { nomNaissance: v.toUpperCase() })} />
                  <W.FieldText label="Prénom(s) *" value={(d.descriptionPersonne.prenoms || []).join(' ')} onChange={v => updateDirigeantDesc(i, { prenoms: v.split(/\s+/).filter(Boolean) })} />
                </W.Row>
                <W.Row>
                  <W.FieldDate label="Date de naissance *" value={d.descriptionPersonne.dateDeNaissance} onChange={v => updateDirigeantDesc(i, { dateDeNaissance: v })} />
                  <W.FieldSelect label="Sexe" value={d.descriptionPersonne.sexe} onChange={v => updateDirigeantDesc(i, { sexe: v })} options={[{ value: 'M', label: 'Homme' }, { value: 'F', label: 'Femme' }]} />
                </W.Row>
                <W.Row>
                  <W.FieldText label="Lieu de naissance *" value={d.descriptionPersonne.lieuDeNaissance} onChange={v => updateDirigeantDesc(i, { lieuDeNaissance: v })} />
                  <W.FieldSelect label="Nationalité" value={d.descriptionPersonne.codeNationalite} onChange={v => updateDirigeantDesc(i, { codeNationalite: v })} options={NATIONALITES_HOLD.map(n => ({ value: n.code, label: n.label }))} />
                </W.Row>
                <W.FieldText label="Adresse — N° et voie *" value={d.adresseDomicile.voie} onChange={v => updateDirigeantAdr(i, { voie: v })} />
                <W.Row>
                  <W.FieldText label="Code postal *" value={d.adresseDomicile.codePostal} onChange={v => updateDirigeantAdr(i, { codePostal: v })} mono maxLength={5} />
                  <W.FieldText label="Commune *" value={d.adresseDomicile.commune} onChange={v => updateDirigeantAdr(i, { commune: v })} />
                </W.Row>
              </div>
            );
          })}
        </W.Section>
      )}

      {step === 5 && (
        <W.Section title={formeSJ === 'SASU' ? 'Associé unique' : 'Associé(s)'} subtitle={formeSJ === 'SASU' ? 'Une SASU n\'a qu\'un seul associé.' : `Minimum ${minAssocies} associé(s) pour une holding en ${formeSJ}.`}>
          {associes.map((a, i) => (
            <div key={i} style={{ border: '1px solid var(--ink-200)', borderRadius: 10, padding: 14, display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 13 }}>Associé #{i + 1}</strong>
                {associes.length > minAssocies && <button className="btn btn-ghost btn-sm" onClick={() => rmAssocie(i)}>Supprimer</button>}
              </div>
              <W.FieldSelect label="Type" value={a.type} onChange={v => updateAssocie(i, { type: v })} options={[{ value: 'PHYSIQUE', label: 'Personne physique' }, { value: 'MORALE', label: 'Personne morale' }]} />
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
                <W.FieldText label={formeSJ === 'SARL' ? 'Parts sociales' : 'Actions'} value={String(a.partsSociales)} onChange={v => updateAssocie(i, { partsSociales: Number(v) || 0 })} mono />
                <W.FieldText label="% détention" value={String(a.pourcentageDetention)} onChange={v => updateAssocie(i, { pourcentageDetention: Number(v) || 0 })} mono />
              </W.Row>
            </div>
          ))}
          {formeSJ !== 'SASU' && <button className="btn btn-ghost btn-sm" onClick={addAssocie}>+ Ajouter un associé</button>}
        </W.Section>
      )}

      {step === 6 && (
        <>
          <W.Section title="Pièces jointes" subtitle="Documents requis pour l'immatriculation de la holding.">
            {demoMode ? (
              <div style={{ padding: 14, background: 'var(--ink-50)', borderRadius: 8, fontSize: 13, color: 'var(--ink-600)' }}>
                Upload des pièces disponible après création du compte. <span className="pill" style={{ fontSize: 10 }}>DÉMO</span>
              </div>
            ) : (
              <W.DocumentUploadList dossierId={dossierId} documents={documents} setDocuments={setDocuments} required={[
                { typeDocument: 'PJ_04', label: `Statuts signés (${formeSJ})` },
                { typeDocument: 'PJ_01', label: `Pièce d'identité du ${ROLE_LABEL(formeSJ).toLowerCase()}` },
                { typeDocument: 'PJ_02', label: "Justificatif de siège social" },
                { typeDocument: 'PJ_06', label: "Attestation de dépôt des fonds" },
                { typeDocument: 'PJ_07', label: "Liste des bénéficiaires effectifs" },
              ]} />
            )}
          </W.Section>

          <W.Section title="Récapitulatif" subtitle={`Dossier ${reference || ''} — création holding (${formeSJ}) pour validation interne avant envoi INPI.`}>
            <W.RecapBlock label="Forme & société" rows={[
              ['Forme sous-jacente', formeSJ],
              ['Dénomination', entreprise.denomination],
              ['Capital', `${entreprise.capital} €${descPM.capitalVariable ? ' (variable)' : ''}`],
              ['Durée', `${entreprise.dureeSociete} ans`],
              ['Clôture', entreprise.dateClotureExercice],
            ]} />
            <W.RecapBlock label="Siège" rows={[
              ['Adresse', etab.adresse.voie],
              ['Ville', `${etab.adresse.codePostal} ${etab.adresse.commune}`],
            ]} />
            <W.RecapBlock label="Objet de la holding" rows={[
              ['Type', pm._holdingType || '—'],
              ['Objet', entreprise.objet],
              ['Code APE', etab.activites[0].codeApe],
              ['Début', etab.activites[0].dateDebutActivite],
            ]} />
            <W.RecapBlock label={`${ROLE_LABEL(formeSJ)} (${pouvoirs.length})`} rows={pouvoirs.map((p, i) => [
              `#${i + 1}`,
              `${(p.individu.descriptionPersonne.prenoms || []).join(' ')} ${p.individu.descriptionPersonne.nomNaissance}`.trim() || '—',
            ])} />
            <W.RecapBlock label={`Associé(s) (${associes.length})`} rows={associes.map((a, i) => [
              `#${i + 1} (${a.type === 'MORALE' ? 'PM' : 'PP'})`,
              `${a.individu.nomNaissance} — ${a.pourcentageDetention}%`,
            ])} />
            <W.RecapBlock label="Fiscal" rows={[
              ['Régime', fisc.regimeImposition],
              ['TVA', fisc.optionTVA.regimeTVA],
            ]} />
            <W.RecapBlock label="Pièces jointes" rows={documents.length ? documents.map(d => [d.name, (d.size_bytes/1024).toFixed(0) + ' Ko']) : [['—', 'Aucune pièce']]} />
          </W.Section>
        </>
      )}

      <W.Nav step={step} max={STEPS_HOLDING.length - 1} onPrev={prev} onNext={next} onSubmit={submit} saving={saving} submitting={submitting}
        submitLabel={demoMode ? 'Créer un compte pour soumettre →' : 'Soumettre pour validation'} />
    </div>
  );
};

window.WizardHolding = WizardHolding;
