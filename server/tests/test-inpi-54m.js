// Test 54M (établissement secondaire) sur STRATEGY ASSOCIATES : variantes de marquage des activités.
const inpi = require('../inpi');
const { createModificationDraft, appliquerOperations } = require('../lib/inpi-modification');
const ORG = '00000000-0000-0000-0000-000000000001';
(async () => {
  const siren = (await inpi.forOrg(ORG).listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'].find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  const op = { type: 'etablissementSecondaire', adresse: { voie: '1 rue de la République', codePostal: '13001', commune: 'Marseille' }, description: 'Conseil pour les affaires', codeApe: '7022Z', formeExercice: 'COMMERCIALE' };
  const variantes = [
    ['activités principales conservées « I » + secondaire non principale', (c) => {
      const ep = c.personneMorale.etablissementPrincipal;
      for (const a of ep.activites || []) { a.statutFormalite = 'I'; a.rolePrincipalPourEntreprise = true; }
      ep.descriptionEtablissement.statutPourFormalite = ep.descriptionEtablissement.statutPourFormalite === '3' ? '5' : ep.descriptionEtablissement.statutPourFormalite;
      const sec = c.personneMorale.autresEtablissements.at(-1);
      for (const a of sec.activites) a.rolePrincipalPourEntreprise = false;
    }],
    ['activités principales « M » avec rôle principal forcé', (c) => {
      for (const a of c.personneMorale.etablissementPrincipal.activites || []) a.rolePrincipalPourEntreprise = true;
      for (const a of c.personneMorale.autresEtablissements.at(-1).activites) a.rolePrincipalPourEntreprise = false;
    }],
  ];
  for (const [label, ajuster] of variantes) {
    try {
      const { formality, events } = await createModificationDraft(ORG, siren, { reference: 'TEST-54M', nomDossier: `TEST 54M ${label}`, mutate: async (c) => { await appliquerOperations(c, [op]); ajuster(c); } });
      console.log(`✓ 54M (${label}) : brouillon créé — liasse ${formality.liasseNumber}, événements ${JSON.stringify(events)}`);
      console.log(`BROUILLON À SUPPRIMER : liasse ${formality.liasseNumber}`);
      break;
    } catch (e) { console.log(`✗ 54M (${label}) : ${String(e.message).slice(0, 1200)}`); }
  }
})().catch((e) => console.log('ERR', e.message));
