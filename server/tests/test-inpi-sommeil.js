// Test : mise en sommeil (40M, formalité R) sur STRATEGY ASSOCIATES. Brouillon à supprimer, jamais signé.
const inpi = require('../inpi');
const { createModificationDraft, appliquerOperations } = require('../lib/inpi-modification');
const ORG = '00000000-0000-0000-0000-000000000001';
(async () => {
  const siren = (await inpi.forOrg(ORG).listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'].find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  for (const deplacerEtablissement of [true, false]) {
    const label = `40M mise en sommeil (établissement ${deplacerEtablissement ? 'déplacé en secondaire' : 'conservé'})`;
    try {
      const { formality, events } = await createModificationDraft(ORG, siren, {
        typeFormalite: 'R', reference: 'TEST-SOMMEIL', nomDossier: `TEST ${label}`,
        mutate: (c) => appliquerOperations(c, [{ type: 'miseEnSommeil', deplacerEtablissement }]),
      });
      console.log(`✓ ${label} : brouillon créé — liasse ${formality.liasseNumber}, statut ${formality.status}, événements ${JSON.stringify(events)}`);
      console.log(`BROUILLON À SUPPRIMER : liasse ${formality.liasseNumber}`);
      break;
    } catch (e) {
      console.log(`✗ ${label} : ${String(e.message).slice(0, 3000)}`);
    }
  }
})().catch((e) => console.log('ERR', e.message));
