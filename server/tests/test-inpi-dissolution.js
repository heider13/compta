// Tests DISSOLUTION anticipée et CLÔTURE DE LIQUIDATION sur STRATEGY ASSOCIATES (société du cabinet).
// BROUILLONS jamais signés, à supprimer ensuite.
const inpi = require('../inpi');
const rne = require('../lib/inpi-rne');
const { createModificationDraft, appliquerOperations } = require('../lib/inpi-modification');
const ORG = '00000000-0000-0000-0000-000000000001';
(async () => {
  const siren = (await inpi.forOrg(ORG).listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'].find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  const gerant = rne.summarizeCompany(await rne.getCompany(ORG, siren)).dirigeants[0]?.nom;
  const siege = { voie: '31 rue Chateauredon', codePostal: '13001', commune: 'Marseille' };
  const CAS = [
    ['Dissolution anticipée (liquidation amiable)', ['M'], [{ type: 'dissolution', liquidateurExistant: gerant, lieuLiquidation: 'S', typeDissolution: '1', annonce: { journal: 'La Marseillaise', datePublication: '2026-10-01' } }]],
    ['Clôture de liquidation et radiation', ['R'], [{ type: 'clotureLiquidation' }]],
  ];
  for (const [label, types, ops] of CAS) {
    for (const typeFormalite of types) {
      try {
        const { formality, events } = await createModificationDraft(ORG, siren, { typeFormalite, reference: 'TEST-LIQUIDATION', nomDossier: `TEST ${label}`, observation: 'TEST INTERNE - NE PAS VALIDER', mutate: (c) => appliquerOperations(c, ops) });
        console.log(`✓ ${label} [${typeFormalite}] : brouillon créé — liasse ${formality.liasseNumber}, statut ${formality.status}, événements ${JSON.stringify(events)}`);
        console.log(`BROUILLON À SUPPRIMER : liasse ${formality.liasseNumber}`);
        break;
      } catch (e) { console.log(`✗ ${label} [${typeFormalite}] : ${String(e.message).slice(0, 2500)}`); }
    }
  }
})().catch((e) => console.log('ERR', e.message));
