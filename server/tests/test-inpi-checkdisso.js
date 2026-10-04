// Lecture seule : contenu du brouillon de dissolution (bloc de cessation, pouvoirs).
const inpi = require('../inpi');
(async () => {
  const c = inpi.forOrg('00000000-0000-0000-0000-000000000001');
  const r = await c.listFormalities({ itemsPerPage: 5, 'order[created]': 'desc' });
  const f = (r['hydra:member'] || []).find((x) => x.liasseNumber === 'J00287900286');
  const d = await c.getFormality(f.id);
  const pm = d.content.personneMorale;
  const dc = pm.detailCessationEntreprise || {};
  console.log('typeFormalite', d.typeFormalite, '| events', JSON.stringify(d.events), '| formalityScope', JSON.stringify(d.formalityScope));
  console.log('cessation :', JSON.stringify({ indicateurDissolution: dc.indicateurDissolution, typeDissolution: dc.typeDissolution, motifCessation: dc.motifCessation, dateDissolutionDisparition: dc.dateDissolutionDisparition ? 'oui' : null, lieuDeLiquidation: dc.lieuDeLiquidation, maintien: dc.indicateurMaintienImmatriculationRegistre }));
  console.log('pouvoirs :', JSON.stringify((pm.composition?.pouvoirs || []).map((p) => ({ role: p.roleEntreprise, statut: p.statutPourLaFormalite, typeAdresse: p.typeAdresseLiquidateur, publication: !!p.publication }))));
})().catch((e) => console.log('ERR', e.message));
