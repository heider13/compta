// Lecture seule : emplacement des pièces et codes clés des créations d'EI validées.
const inpi = require('../inpi');
(async () => {
  const c = inpi.forOrg('19c6719d-f210-4451-ba7a-058a061ddf55');
  const list = (await c.listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'];
  const pj = new Map(); const codes = new Map();
  for (const f of list.filter((x) => x.typeFormalite === 'C' && x.typePersonne === 'P' && x.status === 'VALIDATED')) {
    const d = await c.getFormality(f.id);
    for (const p of d.content.piecesJointes || []) if (p.depositor === 'DECLARANT' && !p.invalidated) { const k = `${p.typeDocument}/${p.sousTypeDocument || ''} → ${p.path}`; pj.set(k, (pj.get(k) || 0) + 1); }
    const pp = d.content.personnePhysique; const a = pp.etablissementPrincipal?.activites?.[0] || {};
    const k = `events=${d.events} micro=${d.content.natureCreation?.microEntreprise} salarieEnFrance=${d.content.natureCreation?.salarieEnFrance} formeExercice=${a.formeExercice} IS/IR=${pp.optionsFiscales?.regimeImpositionBenefices} TVA=${pp.optionsFiscales?.regimeImpositionTVA} VL=${pp.optionsFiscales?.optionVersementLiberatoire} periodicite=${pp.identite?.entrepreneur?.regimeMicroSocial?.periodiciteVersement} domicile=${pp.adresseEntreprise?.caracteristiques?.indicateurDomicileEntrepreneur} roleEtab=${pp.etablissementPrincipal?.descriptionEtablissement?.rolePourEntreprise}`;
    codes.set(k, (codes.get(k) || 0) + 1);
  }
  console.log('PIÈCES (type/sous-type → emplacement) :'); [...pj.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  ${n}× ${k}`));
  console.log('\nCODES :'); [...codes.entries()].forEach(([k, n]) => console.log(`  ${n}× ${k}`));
})().catch((e) => console.log('ERR', e.message));
