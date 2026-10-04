// Test 61M + 62M (remplacement d'activité) sur STRATEGY ASSOCIATES. Brouillon à supprimer.
const inpi = require('../inpi');
const { createModificationDraft, appliquerOperations } = require('../lib/inpi-modification');
const ORG = '00000000-0000-0000-0000-000000000001';
(async () => {
  const siren = (await inpi.forOrg(ORG).listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'].find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  try {
    const { formality, events } = await createModificationDraft(ORG, siren, {
      reference: 'TEST-62M', nomDossier: 'TEST remplacement activité',
      mutate: (c) => appliquerOperations(c, [
        { type: 'activiteSuppression', index: 0 },
        { type: 'activiteAjout', description: 'Conseil en systèmes et logiciels informatiques', codeApe: '6201Z', formeExercice: 'LIBERALE', principale: true },
      ]),
    });
    console.log(`✓ 61M+62M remplacement d'activité : brouillon créé — liasse ${formality.liasseNumber}, événements ${JSON.stringify(events)}`);
    console.log(`BROUILLON À SUPPRIMER : liasse ${formality.liasseNumber}`);
  } catch (e) { console.log(`✗ 61M+62M : ${String(e.message).slice(0, 1500)}`); }
})().catch((e) => console.log('ERR', e.message));
