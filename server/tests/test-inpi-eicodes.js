// Lecture seule : valeurs de diffusion d'adresse et destinataire de correspondance des EI validées.
const inpi = require('../inpi');
(async () => {
  const c = inpi.forOrg('19c6719d-f210-4451-ba7a-058a061ddf55');
  const list = (await c.listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'];
  for (const f of list.filter((x) => x.typeFormalite === 'C' && x.typePersonne === 'P' && x.status === 'VALIDATED').slice(0, 4)) {
    const d = await c.getFormality(f.id);
    const pp = d.content.personnePhysique;
    console.log(`diffusion=${JSON.stringify(pp.adresseEntreprise?.caracteristiques?.diffusionDomiciliationAsEntrepriseAddress)} | destinataire type=${JSON.stringify(pp.identite?.destinataireCorrespondance?.typeDestinataireCorrespondance)} | correspondance=${pp.identite?.adresseCorrespondance ? 'oui' : 'non'} | contactCorresp=${pp.identite?.contactCorrespondance ? 'oui' : 'non'}`);
  }
})().catch((e) => console.log('ERR', e.message));
