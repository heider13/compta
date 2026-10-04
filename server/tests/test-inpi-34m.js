// Test 34M (nomination d'un co-gérant de SCI) sur la SCI 38 RUE DU GENIE, autorisée par le cabinet.
// Données des personnes existantes FICTIVES (demande du cabinet) : brouillon à NE JAMAIS signer, à supprimer.
const inpi = require('../inpi');
const { createModificationDraft, appliquerOperations } = require('../lib/inpi-modification');
const ORG = '00000000-0000-0000-0000-000000000001';
const nir = () => { const b = '2850469123001'; return b + String(97 - Number(BigInt(b) % 97n)).padStart(2, '0'); };
const adresseFictive = { voie: '1 rue Fictive Test', codePostal: '13015', commune: 'Marseille' };
(async () => {
  const list = (await inpi.forOrg(ORG).listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'];
  const siren = list.find((f) => /GENIE/i.test(f.companyName || '') && f.siren).siren;
  try {
    const { formality, events } = await createModificationDraft(ORG, siren, {
      reference: 'TEST-34M-FICTIF', nomDossier: 'TEST nomination co-gérant SCI (données fictives)',
      observation: 'TEST INTERNE - DONNEES FICTIVES - NE PAS VALIDER',
      mutate: (c) => appliquerOperations(c, [
        { type: 'complementEntreprise', objet: "Acquisition et location d'un immeuble" },
        { type: 'complementPersonne', nom: 'HEDHIRI', prenom: 'Montassar', dateNaissance: '1995-10-01', lieuNaissance: 'Marseille', codePostalNaissance: '13001', nationalite: 'FRA', adresse: adresseFictive },
        { type: 'complementPersonne', nom: 'HEDHIRI', prenom: 'Chaouki', dateNaissance: '1988-12-01', lieuNaissance: 'Marseille', codePostalNaissance: '13001', nationalite: 'FRA', adresse: adresseFictive },
        { type: 'nomination', role: 'GERANT', personne: { nom: 'TESTEUSE', prenoms: ['Marie'], sexe: 'F', dateNaissance: '1985-04-12', lieuNaissance: 'Lyon', nationalite: 'FRA', numeroSecu: nir(), situationMatrimoniale: 'CELIBATAIRE', codePostalNaissance: '69001', adresse: { voie: '5 rue de la République', codePostal: '13002', commune: 'Marseille' } } },
      ]),
    });
    console.log(`✓ 34M nomination co-gérant SCI : brouillon créé — liasse ${formality.liasseNumber}, événements ${JSON.stringify(events)}`);
    console.log(`BROUILLON À SUPPRIMER (données fictives) : liasse ${formality.liasseNumber}`);
  } catch (e) { console.log(`✗ 34M : ${String(e.message).slice(0, 3000)}`); }
})().catch((e) => console.log('ERR', e.message));
