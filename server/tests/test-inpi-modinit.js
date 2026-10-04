// Test : initialisation d'une modification par SIREN seul (pré-remplissage par l'INPI ?).
// STRATEGY ASSOCIATES (entreprise test). Brouillon éventuel à supprimer, jamais signé.
const inpi = require('../inpi');
const ORG = '00000000-0000-0000-0000-000000000001';
(async () => {
  const client = inpi.forOrg(ORG);
  const list = (await client.listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'];
  const siren = list.find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  for (const payload of [
    { typeFormalite: 'M', typePersonne: 'M', siren, referenceMandataire: 'TEST-MODIF-INIT' },
    { typeFormalite: 'M', typePersonne: 'M', siren, referenceMandataire: 'TEST-MODIF-INIT', premierNumeroLiasseFormalite: 'J00245486113' },
  ]) {
    try {
      const f = await client.createFormality(payload);
      const pm = f.content?.personneMorale;
      console.log(`✓ créée : liasse ${f.liasseNumber} (formalité ${f.id}) statut ${f.status} | contenu pré-rempli : ${pm?.identite?.entreprise?.denomination ? 'OUI (' + pm.identite.entreprise.denomination + ')' : 'non'} | previousContent : ${f.previousContent ? 'oui' : 'non'}`);
      console.log(`BROUILLON À SUPPRIMER : liasse ${f.liasseNumber}`);
      break;
    } catch (e) {
      const v = e.payload?.violations;
      console.log(`✗ ${JSON.stringify(Object.keys(payload))} : ${Array.isArray(v) ? v.slice(0, 8).map((x) => `${x.propertyPath} → ${x.message}`).join(' | ') : String(e.message).slice(0, 400)}`);
    }
  }
})().catch((e) => console.log('ERR', e.message));
