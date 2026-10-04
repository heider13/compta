// Aperçu local (aucun envoi) du bloc adresse d'une liasse EI de test.
const { buildEILiasse } = require('../lib/inpi-liasse');
const inpi = require('../inpi');
(async () => {
  const data = { formeJuridique: 'AE', codeApe: '4791B', formeExercice: 'COMMERCIALE', activitePrincipale: 'Vente en ligne',
    dirigeant: { nom: 'TESTEUR', prenoms: ['Jean'], sexe: 'M', dateNaissance: '1985-04-12', lieuNaissance: 'Lyon', nationalite: 'FRA', numeroSecu: '185046912300100', situationMatrimoniale: 'CELIBATAIRE', adresse: { voie: '5 rue de la République', codePostal: '13002', commune: 'Marseille' } } };
  const { payload } = await buildEILiasse(data, { reference: 'X', client_name: 'X' }, inpi.forOrg('19c6719d-f210-4451-ba7a-058a061ddf55'));
  console.log(JSON.stringify(payload.content.personnePhysique.adresseEntreprise, null, 1));
  console.log('destinataire', JSON.stringify(payload.content.personnePhysique.identite.destinataireCorrespondance));
})().catch((e) => console.log('ERR', e.message));
