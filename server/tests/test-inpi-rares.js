// Tests des cas rares : STRATEGY ASSOCIATES (société test) et EI de Sofian ZERKOUNI (EI test,
// autorisée par le cabinet). BROUILLONS jamais signés, à supprimer ensuite.
const inpi = require('../inpi');
const { createModificationDraft, appliquerOperations } = require('../lib/inpi-modification');
const ORG = '00000000-0000-0000-0000-000000000001';

(async () => {
  const list = [];
  const c = inpi.forOrg(ORG);
  for (let page = 1; page <= 5; page++) { const r = await c.listFormalities({ page, itemsPerPage: 100 }); const it = r['hydra:member'] || []; list.push(...it); if (it.length < 100) break; }
  const sa = list.find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  const ei = list.find((f) => /ZERKOUNI/i.test(f.companyName || '') && f.typeFormalite === 'C' && f.status === 'VALIDATED' && f.siren)?.siren;
  console.log('EI de test trouvée :', ei ? 'oui' : 'NON');
  const CAS = [
    [sa, 'M', '61M ajout d\u2019activité (société)', [{ type: 'activiteAjout', description: 'Conseil en systèmes et logiciels informatiques', codeApe: '6201Z', formeExercice: 'LIBERALE' }]],
    [sa, 'M', '54M établissement secondaire', [{ type: 'etablissementSecondaire', adresse: { voie: '1 rue de la République', codePostal: '13001', commune: 'Marseille' }, description: 'Conseil pour les affaires', codeApe: '7022Z', formeExercice: 'COMMERCIALE' }]],
    [sa, 'M', '17M associés', [{ type: 'associes' }]],
    [ei, 'M', '16P changement de domicile (EI)', [{ type: 'domicileEI', adresse: { voie: '10 avenue du Prado', codePostal: '13008', commune: 'Marseille' } }]],
    [ei, 'M', '24P+61P ajout d\u2019activité (EI)', [{ type: 'activiteAjout', description: 'Vente en ligne d\u2019accessoires', codeApe: '4791B', formeExercice: 'COMMERCIALE' }]],
    [ei, 'R', '41P cessation totale (EI)', [{ type: 'cessationEI' }]],
  ];
  const crees = [];
  for (const [siren, typeFormalite, label, ops] of CAS) {
    if (!siren) { console.log(`- ${label} : entreprise test introuvable`); continue; }
    try {
      let attendus = [];
      const { formality, events } = await createModificationDraft(ORG, siren, { typeFormalite, reference: 'TEST-RARE', nomDossier: `TEST ${label}`, mutate: async (x) => { attendus = await appliquerOperations(x, ops); } });
      crees.push(`${label} : liasse ${formality.liasseNumber}`);
      console.log(`✓ ${label} : brouillon créé — liasse ${formality.liasseNumber}, événements INPI ${JSON.stringify(events)} (attendus ${JSON.stringify(attendus)})`);
    } catch (e) {
      console.log(`✗ ${label} : ${String(e.message).slice(0, 2500)}`);
    }
  }
  console.log(`\nBROUILLONS À SUPPRIMER :\n${crees.map((x) => '  - ' + x).join('\n') || '  (aucun)'}`);
})().catch((e) => console.log('ERR', e.message));
