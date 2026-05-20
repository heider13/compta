/* eslint-disable */
// Wizard dépôt des bénéficiaires effectifs (BE) — 5 étapes
// type_formalite='MODIFICATION', inpi_content={beneficiairesEffectifs: {entreprise, beneficiaires:[]}}
// Obligatoire pour toutes les sociétés, à mettre à jour à chaque modification de l'actionnariat.

const STEPS_BE = ['Société', 'Bénéficiaires', 'Pièces', 'Récap', 'Soumission'];

const BE_NATIONALITES = [
  { code: 'FRA', label: 'Française' }, { code: 'BEL', label: 'Belge' }, { code: 'CHE', label: 'Suisse' },
  { code: 'ITA', label: 'Italienne' }, { code: 'ESP', label: 'Espagnole' }, { code: 'PRT', label: 'Portugaise' },
  { code: 'DEU', label: 'Allemande' }, { code: 'MAR', label: 'Marocaine' }, { code: 'DZA', label: 'Algérienne' },
  { code: 'TUN', label: 'Tunisienne' }, { code: 'GBR', label: 'Britannique' }, { code: 'USA', label: 'Américaine' },
];

const makeEmptyBePhysique = () => ({
  type: 'PHYSIQUE',
  identite: {
    nomNaissance: '', nomUsage: '', prenoms: [''],
    dateDeNaissance: '',
    lieuDeNaissance: { commune: '', codePostal: '', codePays: 'FRA' },
    codeNationalite: 'FRA',
    adresseDomicile: { voie: '', complement: '', codePostal: '', commune: '', codePays: 'FRA' },
  },
  denomination: '', siren: '', formeJuridique: '',
  modalitesControle: {
    detentionCapitalActive: true,
    detentionCapital: 25,
    detentionDroitsVoteActive: false,
    detentionDroitsVote: 0,
    autreModaliteActive: false,
    autreModalite: '',
    dateDevenuBeneficiaire: '',
  },
});

const makeEmptyBeMorale = () => ({
  ...makeEmptyBePhysique(),
  type: 'MORALE',
});

const initBeContent = () => ({
  entreprise: { siren: '', denomination: '' },
  beneficiaires: [makeEmptyBePhysique()],
});

const validateSiren = (s) => /^\d{9}$/.test((s || '').replace(/\s/g, ''));

const WizardBE = ({ setRoute, dossierId: initialDossierId, onCreated, demoMode = false }) => {
  const W = window.WC;
  const [step, setStep] = React.useState(0);
  const [content, setContent] = React.useState(() => {
    if (demoMode) {
      try {
        const saved = localStorage.getItem('compta_demo_wizard_be');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return initBeContent();
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
        if (dossier.inpi_content?.beneficiairesEffectifs) {
          const be = dossier.inpi_content.beneficiairesEffectifs;
          setContent({
            entreprise: be.entreprise || { siren: '', denomination: '' },
            beneficiaires: (be.beneficiaires && be.beneficiaires.length) ? be.beneficiaires : [makeEmptyBePhysique()],
          });
        }
        setReference(dossier.reference);
        setDocuments(docs || []);
      } catch (e) { console.error(e); }
    })();
  }, [initialDossierId, demoMode]);

  const ent = content.entreprise;
  const benefs = content.beneficiaires;

  const setEntreprise = (patch) => setContent(c => ({ ...c, entreprise: { ...c.entreprise, ...patch } }));
  const setBenefAt = (i, patch) => setContent(c => {
    const arr = c.beneficiaires.slice();
    arr[i] = { ...arr[i], ...patch };
    return { ...c, beneficiaires: arr };
  });
  const setBenefIdentite = (i, patch) => setContent(c => {
    const arr = c.beneficiaires.slice();
    arr[i] = { ...arr[i], identite: { ...arr[i].identite, ...patch } };
    return { ...c, beneficiaires: arr };
  });
  const setBenefLieu = (i, patch) => setContent(c => {
    const arr = c.beneficiaires.slice();
    arr[i] = { ...arr[i], identite: { ...arr[i].identite, lieuDeNaissance: { ...arr[i].identite.lieuDeNaissance, ...patch } } };
    return { ...c, beneficiaires: arr };
  });
  const setBenefAdresse = (i, patch) => setContent(c => {
    const arr = c.beneficiaires.slice();
    arr[i] = { ...arr[i], identite: { ...arr[i].identite, adresseDomicile: { ...arr[i].identite.adresseDomicile, ...patch } } };
    return { ...c, beneficiaires: arr };
  });
  const setBenefModalites = (i, patch) => setContent(c => {
    const arr = c.beneficiaires.slice();
    arr[i] = { ...arr[i], modalitesControle: { ...arr[i].modalitesControle, ...patch } };
    return { ...c, beneficiaires: arr };
  });
  const setBenefPrenom = (i, idx, v) => {
    const arr = benefs[i].identite.prenoms.slice();
    arr[idx] = v;
    setBenefIdentite(i, { prenoms: arr });
  };
  const addBenefPrenom = (i) => setBenefIdentite(i, { prenoms: [...benefs[i].identite.prenoms, ''] });
  const rmBenefPrenom = (i, idx) => setBenefIdentite(i, { prenoms: benefs[i].identite.prenoms.filter((_, k) => k !== idx) });

  const addBeneficiaire = () => setContent(c => ({ ...c, beneficiaires: [...c.beneficiaires, makeEmptyBePhysique()] }));
  const removeBeneficiaire = (i) => setContent(c => ({ ...c, beneficiaires: c.beneficiaires.filter((_, k) => k !== i) }));

  const buildPayload = () => {
    // Normalise les modalités : ne garde que les valeurs des cases cochées
    const beneficiaires = benefs.map(b => {
      const m = b.modalitesControle;
      const out = {
        type: b.type,
        modalitesControle: {
          dateDevenuBeneficiaire: m.dateDevenuBeneficiaire,
          ...(m.detentionCapitalActive ? { detentionCapital: Number(m.detentionCapital) || 0 } : {}),
          ...(m.detentionDroitsVoteActive ? { detentionDroitsVote: Number(m.detentionDroitsVote) || 0 } : {}),
          ...(m.autreModaliteActive ? { autreModalite: m.autreModalite } : {}),
        },
      };
      if (b.type === 'PHYSIQUE') {
        out.identite = {
          nomNaissance: b.identite.nomNaissance,
          nomUsage: b.identite.nomUsage,
          prenoms: (b.identite.prenoms || []).filter(Boolean),
          dateDeNaissance: b.identite.dateDeNaissance,
          lieuDeNaissance: b.identite.lieuDeNaissance,
          codeNationalite: b.identite.codeNationalite,
          adresseDomicile: b.identite.adresseDomicile,
        };
      } else {
        out.denomination = b.denomination;
        out.siren = b.siren;
        out.formeJuridique = b.formeJuridique;
      }
      return out;
    });
    return { beneficiairesEffectifs: { entreprise: ent, beneficiaires } };
  };

  const computedClientName = () => (ent.denomination || '').trim() || (ent.siren ? `SIREN ${ent.siren}` : 'Dépôt BE');

  const saveDraft = async () => {
    setSaving(true); setError(null);
    try {
      const payload = buildPayload();
      if (demoMode) {
        try { localStorage.setItem('compta_demo_wizard_be', JSON.stringify(content)); } catch {}
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
      if (!validateSiren(ent.siren)) return 'Le SIREN doit comporter exactement 9 chiffres.';
      if (!ent.denomination.trim()) return 'Dénomination requise.';
    }
    if (step === 1) {
      if (!benefs.length) return 'Au moins un bénéficiaire effectif est requis.';
      for (let i = 0; i < benefs.length; i++) {
        const b = benefs[i];
        if (b.type === 'PHYSIQUE') {
          if (!b.identite.nomNaissance.trim()) return `Bénéficiaire #${i+1} : nom de naissance requis.`;
          if (!(b.identite.prenoms || []).filter(Boolean).length) return `Bénéficiaire #${i+1} : au moins un prénom requis.`;
          if (!b.identite.dateDeNaissance) return `Bénéficiaire #${i+1} : date de naissance requise.`;
        } else {
          if (!b.denomination.trim()) return `Bénéficiaire #${i+1} : dénomination de la personne morale requise.`;
          if (!validateSiren(b.siren)) return `Bénéficiaire #${i+1} : SIREN à 9 chiffres requis.`;
        }
        const m = b.modalitesControle;
        if (!m.detentionCapitalActive && !m.detentionDroitsVoteActive && !m.autreModaliteActive)
          return `Bénéficiaire #${i+1} : au moins une modalité de contrôle doit être cochée.`;
        if (m.detentionCapitalActive && (Number(m.detentionCapital) < 0 || Number(m.detentionCapital) > 100))
          return `Bénéficiaire #${i+1} : pourcentage de capital invalide (0-100).`;
        if (m.detentionDroitsVoteActive && (Number(m.detentionDroitsVote) < 0 || Number(m.detentionDroitsVote) > 100))
          return `Bénéficiaire #${i+1} : pourcentage de droits de vote invalide (0-100).`;
        if (!m.dateDevenuBeneficiaire) return `Bénéficiaire #${i+1} : date de devenir bénéficiaire requise.`;
      }
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
      try { localStorage.setItem('compta_demo_wizard_be', JSON.stringify(content)); } catch {}
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

  // Liste des CNI requises (une par BE physique)
  const requiredDocs = benefs.map((b, i) => {
    if (b.type !== 'PHYSIQUE') return null;
    const fullName = `${(b.identite.prenoms || []).filter(Boolean).join(' ')} ${b.identite.nomNaissance}`.trim() || `Bénéficiaire #${i+1}`;
    return { typeDocument: `PJ_01_BE_${i+1}`, label: `Pièce d'identité (CNI/passeport) — ${fullName}` };
  }).filter(Boolean);

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ padding: 14, background: '#FEF3C7', borderLeft: '3px solid #F59E0B', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
        <strong>⚠ Dépôt des bénéficiaires effectifs obligatoire.</strong> Toutes les sociétés doivent déposer la liste de leurs BE au RBE (Registre des Bénéficiaires Effectifs). À mettre à jour à chaque modification de l'actionnariat (sous 30 jours).
      </div>
      <W.ProgressBar steps={STEPS_BE} current={step} />
      {error && <div style={{ color: '#b42318', padding: 12, marginBottom: 12, fontSize: 13, background: '#FEE2E2', borderRadius: 8 }}>{error}</div>}

      {step === 0 && (
        <W.Section title="Société" subtitle="Identifie la société pour laquelle tu déposes la liste des bénéficiaires effectifs.">
          <W.Row>
            <W.FieldText label="SIREN *" value={ent.siren} onChange={v => setEntreprise({ siren: v.replace(/\s/g, '').replace(/\D/g, '').slice(0, 9) })} mono maxLength={9} placeholder="123456789" />
            <W.FieldText label="Dénomination sociale *" value={ent.denomination} onChange={v => setEntreprise({ denomination: v })} placeholder="Ex: ACME SAS" />
          </W.Row>
          <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>Le SIREN doit comporter 9 chiffres.</div>
        </W.Section>
      )}

      {step === 1 && (
        <W.Section title="Bénéficiaires effectifs" subtitle="Toute personne (physique ou morale) détenant directement ou indirectement plus de 25 % du capital ou des droits de vote, ou exerçant un contrôle équivalent.">
          {benefs.map((b, i) => (
            <div key={i} style={{ border: '1px solid var(--ink-200)', borderRadius: 10, padding: 14, marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ fontSize: 14, margin: 0 }}>Bénéficiaire #{i+1}</h4>
                {benefs.length > 1 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => removeBeneficiaire(i)}>Supprimer</button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                  <input type="radio" name={`type-${i}`} checked={b.type === 'PHYSIQUE'} onChange={() => setBenefAt(i, { type: 'PHYSIQUE' })} style={{ accentColor: 'var(--accent)' }} />
                  Personne physique
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                  <input type="radio" name={`type-${i}`} checked={b.type === 'MORALE'} onChange={() => setBenefAt(i, { type: 'MORALE' })} style={{ accentColor: 'var(--accent)' }} />
                  Personne morale
                </label>
              </div>

              {b.type === 'PHYSIQUE' && (
                <div style={{ display: 'grid', gap: 12 }}>
                  <W.Row>
                    <W.FieldText label="Nom de naissance *" value={b.identite.nomNaissance} onChange={v => setBenefIdentite(i, { nomNaissance: v.toUpperCase() })} />
                    <W.FieldText label="Nom d'usage" value={b.identite.nomUsage} onChange={v => setBenefIdentite(i, { nomUsage: v.toUpperCase() })} />
                  </W.Row>
                  <div>
                    <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>Prénom(s) *</label>
                    {b.identite.prenoms.map((p, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        <input value={p} onChange={e => setBenefPrenom(i, idx, e.target.value)}
                          style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--ink-200)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }} />
                        {b.identite.prenoms.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => rmBenefPrenom(i, idx)}>−</button>}
                      </div>
                    ))}
                    <button className="btn btn-ghost btn-sm" onClick={() => addBenefPrenom(i)}>+ Ajouter un prénom</button>
                  </div>
                  <W.Row>
                    <W.FieldDate label="Date de naissance *" value={b.identite.dateDeNaissance} onChange={v => setBenefIdentite(i, { dateDeNaissance: v })} />
                    <W.FieldSelect label="Nationalité *" value={b.identite.codeNationalite} onChange={v => setBenefIdentite(i, { codeNationalite: v })} options={BE_NATIONALITES.map(n => ({ value: n.code, label: n.label }))} />
                  </W.Row>
                  <W.Row>
                    <W.FieldText label="Commune de naissance *" value={b.identite.lieuDeNaissance.commune} onChange={v => setBenefLieu(i, { commune: v })} />
                    <W.FieldText label="Code postal naissance" value={b.identite.lieuDeNaissance.codePostal} onChange={v => setBenefLieu(i, { codePostal: v })} mono maxLength={5} />
                  </W.Row>
                  <h5 style={{ fontSize: 13, margin: '4px 0 0' }}>Adresse de domicile</h5>
                  <W.FieldText label="N° et voie *" value={b.identite.adresseDomicile.voie} onChange={v => setBenefAdresse(i, { voie: v })} />
                  <W.FieldText label="Complément" value={b.identite.adresseDomicile.complement} onChange={v => setBenefAdresse(i, { complement: v })} />
                  <W.Row>
                    <W.FieldText label="Code postal *" value={b.identite.adresseDomicile.codePostal} onChange={v => setBenefAdresse(i, { codePostal: v })} mono maxLength={5} />
                    <W.FieldText label="Commune *" value={b.identite.adresseDomicile.commune} onChange={v => setBenefAdresse(i, { commune: v })} />
                  </W.Row>
                </div>
              )}

              {b.type === 'MORALE' && (
                <div style={{ display: 'grid', gap: 12 }}>
                  <W.Row>
                    <W.FieldText label="Dénomination *" value={b.denomination} onChange={v => setBenefAt(i, { denomination: v })} />
                    <W.FieldText label="Forme juridique *" value={b.formeJuridique} onChange={v => setBenefAt(i, { formeJuridique: v })} placeholder="Ex: SAS, SARL…" />
                  </W.Row>
                  <W.FieldText label="SIREN *" value={b.siren} onChange={v => setBenefAt(i, { siren: v.replace(/\s/g, '').replace(/\D/g, '').slice(0, 9) })} mono maxLength={9} />
                </div>
              )}

              <h5 style={{ fontSize: 13, margin: '14px 0 4px' }}>Modalité du contrôle exercé</h5>
              <div style={{ display: 'grid', gap: 8 }}>
                <W.FieldCheckbox label="Détention de capital (≥ 25 %)" checked={b.modalitesControle.detentionCapitalActive} onChange={v => setBenefModalites(i, { detentionCapitalActive: v })} />
                {b.modalitesControle.detentionCapitalActive && (
                  <W.FieldText label="% du capital détenu" value={String(b.modalitesControle.detentionCapital)} onChange={v => setBenefModalites(i, { detentionCapital: Math.max(0, Math.min(100, Number(v.replace(/[^\d.]/g, '')) || 0)) })} mono />
                )}
                <W.FieldCheckbox label="Détention de droits de vote (≥ 25 %)" checked={b.modalitesControle.detentionDroitsVoteActive} onChange={v => setBenefModalites(i, { detentionDroitsVoteActive: v })} />
                {b.modalitesControle.detentionDroitsVoteActive && (
                  <W.FieldText label="% des droits de vote" value={String(b.modalitesControle.detentionDroitsVote)} onChange={v => setBenefModalites(i, { detentionDroitsVote: Math.max(0, Math.min(100, Number(v.replace(/[^\d.]/g, '')) || 0)) })} mono />
                )}
                <W.FieldCheckbox label="Autre modalité de contrôle" checked={b.modalitesControle.autreModaliteActive} onChange={v => setBenefModalites(i, { autreModaliteActive: v })} />
                {b.modalitesControle.autreModaliteActive && (
                  <W.FieldTextarea label="Précisez la modalité" value={b.modalitesControle.autreModalite} onChange={v => setBenefModalites(i, { autreModalite: v })} rows={2} />
                )}
              </div>
              <div style={{ marginTop: 12 }}>
                <W.FieldDate label="Date à laquelle la personne est devenue bénéficiaire effectif *" value={b.modalitesControle.dateDevenuBeneficiaire} onChange={v => setBenefModalites(i, { dateDevenuBeneficiaire: v })} />
              </div>
            </div>
          ))}
          <div>
            <button className="btn btn-ghost btn-sm" onClick={addBeneficiaire}>+ Ajouter un bénéficiaire</button>
          </div>
        </W.Section>
      )}

      {step === 2 && (
        <W.Section title="Pièces justificatives" subtitle="Pièce d'identité de chaque bénéficiaire effectif personne physique.">
          {requiredDocs.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>Aucun bénéficiaire personne physique : pas de CNI à fournir.</div>
            : <W.DocumentUploadList dossierId={dossierId} documents={documents} setDocuments={setDocuments} demoMode={demoMode} required={requiredDocs} />}
        </W.Section>
      )}

      {step === 3 && (
        <W.Section title="Récapitulatif" subtitle={`Dossier ${reference || ''} — vérifie les informations avant soumission.`}>
          <W.RecapBlock label="Société" rows={[
            ['SIREN', ent.siren || '—'],
            ['Dénomination', ent.denomination || '—'],
            ['Nb bénéficiaires', String(benefs.length)],
          ]} />
          {benefs.map((b, i) => {
            const m = b.modalitesControle;
            const modalites = [
              m.detentionCapitalActive && `Capital ${m.detentionCapital} %`,
              m.detentionDroitsVoteActive && `Droits de vote ${m.detentionDroitsVote} %`,
              m.autreModaliteActive && `Autre : ${m.autreModalite || '—'}`,
            ].filter(Boolean).join(' · ');
            const identite = b.type === 'PHYSIQUE'
              ? `${(b.identite.prenoms || []).filter(Boolean).join(' ')} ${b.identite.nomNaissance}`.trim()
              : `${b.denomination} (${b.formeJuridique}) — SIREN ${b.siren}`;
            return (
              <W.RecapBlock key={i} label={`Bénéficiaire #${i+1} — ${b.type === 'PHYSIQUE' ? 'Personne physique' : 'Personne morale'}`} rows={[
                ['Identité', identite || '—'],
                ...(b.type === 'PHYSIQUE' ? [
                  ['Né(e) le', b.identite.dateDeNaissance || '—'],
                  ['Lieu', b.identite.lieuDeNaissance.commune || '—'],
                  ['Nationalité', BE_NATIONALITES.find(n => n.code === b.identite.codeNationalite)?.label || b.identite.codeNationalite],
                  ['Adresse', `${b.identite.adresseDomicile.voie || ''}, ${b.identite.adresseDomicile.codePostal || ''} ${b.identite.adresseDomicile.commune || ''}`.trim()],
                ] : []),
                ['Contrôle', modalites || '—'],
                ['BE depuis', m.dateDevenuBeneficiaire || '—'],
              ]} />
            );
          })}
          <W.RecapBlock label="Pièces jointes" rows={documents.length ? documents.map(d => [d.name, (d.size_bytes/1024).toFixed(0) + ' Ko']) : [['—', 'Aucune pièce']]} />
        </W.Section>
      )}

      {step === 4 && (
        <W.Section title="Soumission" subtitle="Confirme l'envoi pour validation interne avant transmission au RBE/INPI.">
          <div style={{ padding: 14, background: 'var(--ink-50)', borderRadius: 10, fontSize: 13 }}>
            <strong>Tu es sur le point de soumettre le dépôt des bénéficiaires effectifs.</strong>
            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
              <li>{benefs.length} bénéficiaire(s) déclaré(s)</li>
              <li>Société : {ent.denomination} (SIREN {ent.siren})</li>
              <li>L'admin validera puis transmettra à l'INPI (RBE)</li>
            </ul>
          </div>
        </W.Section>
      )}

      <W.Nav step={step} max={STEPS_BE.length - 1} onPrev={prev} onNext={next} onSubmit={submit} saving={saving} submitting={submitting}
        submitLabel={demoMode ? 'Créer un compte pour soumettre →' : 'Soumettre pour validation'} />
    </div>
  );
};

window.WizardBE = WizardBE;
