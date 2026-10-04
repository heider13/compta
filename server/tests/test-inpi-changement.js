// Test : changement de gérant complet (35M + 38F) sur STRATEGY ASSOCIATES. Brouillon à supprimer.
const inpi = require('../inpi');
const rne = require('../lib/inpi-rne');
const { createModificationDraft, appliquerOperations } = require('../lib/inpi-modification');
const ORG = '00000000-0000-0000-0000-000000000001';
const nir = () => { const b = '2850469123001'; return b + String(97 - Number(BigInt(b) % 97n)).padStart(2, '0'); };
const nouvelle = { nom: 'TESTEUSE', prenoms: ['Marie'], sexe: 'F', dateNaissance: '1985-04-12', lieuNaissance: 'Lyon', nationalite: 'FRA', numeroSecu: nir(), situationMatrimoniale: 'CELIBATAIRE', codePostalNaissance: '69001', adresse: { voie: '5 rue de la République', codePostal: '13002', commune: 'Marseille' } };
(async () => {
  const siren = (await inpi.forOrg(ORG).listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'].find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  const fiche = rne.summarizeCompany(await rne.getCompany(ORG, siren));
  const actuel = fiche.dirigeants[0]?.nom;
  console.log('gérant actuel (RNE) :', actuel ? actuel.slice(0, 1) + '***' : 'aucun');
  try {
    const { formality, events } = await createModificationDraft(ORG, siren, {
      reference: 'TEST-CHGT-GERANT', nomDossier: 'TEST changement de gérant',
      mutate: (c) => appliquerOperations(c, [
        { type: 'revocation', nom: actuel },
        { type: 'nomination', personne: nouvelle, role: 'GERANT' },
        { type: 'beneficiaires', ajouts: [{ personne: nouvelle, pourcentage: 50 }] },
      ]),
    });
    console.log(`✓ 35M+38F changement de gérant : brouillon créé — liasse ${formality.liasseNumber}, statut ${formality.status}, événements ${JSON.stringify(events)}`);
    console.log(`BROUILLON À SUPPRIMER : liasse ${formality.liasseNumber}`);
  } catch (e) {
    console.log(`✗ 35M+38F changement de gérant : ${String(e.message).slice(0, 3000)}`);
  }
})().catch((e) => console.log('ERR', e.message));
