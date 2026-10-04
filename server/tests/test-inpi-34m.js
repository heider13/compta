// Test 34M sur la SCI 38 RUE DU GENIE (autorisé par le cabinet), avec les données RÉELLES des
// statuts mis à jour du 20/06/2025 : nomination de M. Chaouki HEDHIRI (associé) comme co-gérant.
// BROUILLON de test jamais signé, à supprimer ensuite.
const inpi = require('../inpi');
const { createModificationDraft, appliquerOperations } = require('../lib/inpi-modification');
const ORG = '00000000-0000-0000-0000-000000000001';
const domicile = { voie: '106 avenue de Saint-Louis', codePostal: '13015', commune: 'Marseille' };
const OBJET = "La société a pour objet l'acquisition, l'administration et l'exploitation par bail ou location des biens immobiliers qui seront acquis, édifiés par elle, apportés en cours de vie sociale et plus particulièrement la propriété, l'administration et l'exploitation par bail ou location d'un local commercial sis 38, rue du Génie 13003 Marseille. Et généralement, toutes opérations mobilières et immobilières pouvant se rattacher directement ou indirectement à cet objet ou contribuant à sa réalisation pourvu que celles-ci n'aient pas pour effet d'altérer son caractère civil.";
(async () => {
  const list = (await inpi.forOrg(ORG).listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'];
  const siren = list.find((f) => /GENIE/i.test(f.companyName || '') && f.siren).siren;
  try {
    const { formality, events } = await createModificationDraft(ORG, siren, {
      reference: 'TEST-34M', nomDossier: 'TEST nomination co-gérant SCI 38 RUE DU GENIE',
      observation: 'TEST INTERNE - NE PAS VALIDER',
      mutate: (c) => appliquerOperations(c, [
        { type: 'complementEntreprise', objet: OBJET },
        { type: 'complementPersonne', nom: 'HEDHIRI', prenom: 'Montassar', sexe: 'M', dateNaissance: '1995-10-18', lieuNaissance: 'Ghardimaou', paysNaissance: 'TUN', nationalite: 'TUN', adresse: domicile },
        { type: 'complementPersonne', nom: 'HEDHIRI', prenom: 'Chaouki', sexe: 'M', dateNaissance: '1988-12-22', lieuNaissance: 'Ajaccio', nationalite: 'FRA', adresse: domicile },
        { type: 'nomination', role: 'GERANT', personne: { nom: 'HEDHIRI', prenoms: ['Chaouki'], sexe: 'M', dateNaissance: '1988-12-22', lieuNaissance: 'Ajaccio', nationalite: 'FRA', situationMatrimoniale: 'CELIBATAIRE', adresse: domicile } },
      ]),
    });
    console.log(`✓ 34M nomination co-gérant SCI : brouillon créé — liasse ${formality.liasseNumber}, événements ${JSON.stringify(events)}`);
    console.log(`BROUILLON À SUPPRIMER : liasse ${formality.liasseNumber}`);
  } catch (e) { console.log(`✗ 34M : ${String(e.message).slice(0, 3000)}`); }
})().catch((e) => console.log('ERR', e.message));
