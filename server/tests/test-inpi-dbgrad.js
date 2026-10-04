const inpi = require('../inpi');
const ORG = '00000000-0000-0000-0000-000000000001';
const strip = (o) => JSON.stringify(o, (k, v) => (/nom|prenom|voie|naissance|adresse|email|telephone|nir|secu/i.test(k) ? undefined : v));
(async () => {
  const c = inpi.forOrg(ORG);
  const found = [];
  for (let page = 1; page <= 10; page++) {
    const m = (await c.listFormalities({ page, itemsPerPage: 100 }))['hydra:member'] || [];
    for (const f of m) if (f.typeFormalite === 'R' && f.typePersonne === 'M' && f.status !== 'SIGNATURE_PENDING') found.push(f);
    if (m.length < 100) break;
  }
  console.log('radiations PM :', found.map((f) => `${f.liasseNumber} ${f.status}`).join(', '));
  for (const f of found.slice(0, 3)) {
    const full = await c.getFormality(f.id);
    const ct = full.content || {};
    const pm = ct.personneMorale || {};
    console.log('\n==', f.liasseNumber, f.status, 'events', JSON.stringify(full.formalityEvents || full.events || ''), 'scope', JSON.stringify(full.formalityScope || ''));
    console.log('top', strip({ natureCessation: ct.natureCessation, evenementCessation: ct.evenementCessation, natureCessationEntreprise: ct.natureCessationEntreprise, indicateurPoursuiteCessation: ct.indicateurPoursuiteCessation }));
    console.log('detail', strip(pm.detailCessationEntreprise));
    console.log('EP', strip(pm.etablissementPrincipal?.descriptionEtablissement), 'detailEtab', strip(pm.etablissementPrincipal?.detailCessationEtablissement));
    console.log('autres', strip((pm.autresEtablissements || []).map((e) => [e.descriptionEtablissement, e.detailCessationEtablissement])));
    console.log('pouvoirs', strip((pm.composition?.pouvoirs || []).map((p) => ({ r: p.roleEntreprise, s: p.statutPourLaFormalite, flags: Object.keys(p).filter((k) => /Triggered|dateEffet/.test(k)) }))));
    console.log('acts', strip((pm.etablissementPrincipal?.activites || []).map((a) => ({ s: a.statutFormalite, flags: Object.keys(a).filter((k) => /Triggered|dateFin|confirm/.test(k)) }))));
  }
})().catch((e) => console.log('ERR', e.message));
