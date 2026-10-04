// Bisection dissolution sur STRATEGY ASSOCIATES — BROUILLONS jamais signés, à supprimer.
const inpi = require('../inpi');
const { createModificationDraft, OPERATIONS } = require('../lib/inpi-modification');
const ORG = '00000000-0000-0000-0000-000000000001';
const D = new Date().toISOString().slice(0, 10);
(async () => {
  const siren = (await inpi.forOrg(ORG).listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'].find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  const det = (n) => (n.personneMorale.detailCessationEntreprise ||= {});
  const pub = { datePublication: '2026-10-01', journalPublication: 'lamarseillaise.fr' };
  const CAS = [
    ['B6 sommeil + dissolution + natureCessation 1', (n) => { n.natureCessation = '1'; Object.assign(det(n), { indicateurDissolution: true, typeDissolution: '1', dateDissolutionDisparition: D, publiciteNominationLiquidateur: pub }); }],
    ['B7 sommeil + dissolution + natureCessation 2', (n) => { n.natureCessation = '2'; Object.assign(det(n), { indicateurDissolution: true, typeDissolution: '1', dateDissolutionDisparition: D, publiciteNominationLiquidateur: pub }); }],
  ];
  for (const [label, extra] of CAS) {
    try {
      const { formality, events } = await createModificationDraft(ORG, siren, {
        typeFormalite: 'R', reference: 'TEST-LIQUIDATION', nomDossier: `TEST ${label}`, observation: 'TEST INTERNE - NE PAS VALIDER',
        mutate: async (n) => { if (!extra) { const g = n.personneMorale.composition.pouvoirs.find((x) => x.individu)?.individu.descriptionPersonne.nom; return OPERATIONS.dissolution(n, { dateEffet: D, liquidateurExistant: g, lieuLiquidation: 'S', annonce: { journal: 'La Marseillaise', datePublication: '2026-10-01' }, modeSiege: 'destination' }); } await OPERATIONS.miseEnSommeil(n, { dateEffet: D }); extra(n); },
      });
      console.log(`✓ ${label} : liasse ${formality.liasseNumber}, événements ${JSON.stringify(events)}`);
      console.log(`BROUILLON À SUPPRIMER : liasse ${formality.liasseNumber}`);
    } catch (e) { console.log(`✗ ${label} : ${String(e.message).slice(0, 400)}`); }
  }
})().catch((e) => console.log('ERR', e.message));
