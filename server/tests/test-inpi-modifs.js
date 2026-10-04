// Tests de MODIFICATIONS sur STRATEGY ASSOCIATES (entreprise test du cabinet), sans indicateurs
// is…Triggered : l'INPI déduit-il les événements de la différence ? Brouillons à supprimer.
const inpi = require('../inpi');
const { createModificationDraft } = require('../lib/inpi-modification');
const { appliquerOperations } = require('../lib/inpi-modification');

const ORG = '00000000-0000-0000-0000-000000000001';
const today = new Date().toISOString().slice(0, 10);
const nir = () => { const b = '2850469123001'; return b + String(97 - Number(BigInt(b) % 97n)).padStart(2, '0'); };

const personneTest = { nom: 'TESTEUSE', prenoms: ['Marie'], sexe: 'F', dateNaissance: '1985-04-12', lieuNaissance: 'Lyon', nationalite: 'FRA', numeroSecu: nir(), situationMatrimoniale: 'CELIBATAIRE', codePostalNaissance: '69001', adresse: { voie: '5 rue de la République', codePostal: '13002', commune: 'Marseille' } };
const CAS = [
  ["35M Nomination d'une co-gérante", [{ type: 'nomination', personne: personneTest, role: 'GERANT' }]],
];
(async () => {
  const client = inpi.forOrg(ORG);
  const siren = (await client.listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'].find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  const crees = [];
  for (const [label, ops] of CAS) {
    try {
      let attendus = [];
      const { formality, events } = await createModificationDraft(ORG, siren, { mutate: async (c) => { attendus = await appliquerOperations(c, ops); }, reference: 'TEST-MODIF', nomDossier: `TEST ${label}` });
      crees.push(`${label} : liasse ${formality.liasseNumber}`);
      console.log(`✓ ${label} : brouillon créé — liasse ${formality.liasseNumber}, statut ${formality.status}, événements INPI ${JSON.stringify(events)} (attendus ${JSON.stringify(attendus)})`);
    } catch (e) {
      console.log(`✗ ${label} : ${String(e.message).slice(0, 4000)}`);
    }
  }
  console.log(`\nBROUILLONS À SUPPRIMER :\n${crees.map((x) => '  - ' + x).join('\n') || '  (aucun)'}`);
})().catch((e) => console.log('ERR', e.message));
