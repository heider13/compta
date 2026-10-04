// Tests de MODIFICATIONS sur STRATEGY ASSOCIATES (entreprise test du cabinet), sans indicateurs
// is…Triggered : l'INPI déduit-il les événements de la différence ? Brouillons à supprimer.
const inpi = require('../inpi');
const { createModificationDraft } = require('../lib/inpi-modification');
const { adresseInpi, personneInpi } = require('../lib/inpi-liasse');

const ORG = '00000000-0000-0000-0000-000000000001';
const today = new Date().toISOString().slice(0, 10);
const nir = () => { const b = '2850469123001'; return b + String(97 - Number(BigInt(b) % 97n)).padStart(2, '0'); };

const CAS = [
  ['Changement de dénomination', async (c) => { c.personneMorale.identite.entreprise.denomination = 'STRATEGY ASSOCIATES TEST'; }],
  ['Transfert de siège (même département)', async (c) => {
    const adr = await adresseInpi({ voie: '10 avenue du Prado', codePostal: '13008', commune: 'Marseille' }, [], 'siège');
    c.personneMorale.adresseEntreprise.adresse = { ...c.personneMorale.adresseEntreprise.adresse, ...adr };
    if (c.personneMorale.etablissementPrincipal) c.personneMorale.etablissementPrincipal.adresse = { ...c.personneMorale.etablissementPrincipal.adresse, ...adr };
  }],
  ['Nomination d\'une co-gérante', async (c) => {
    const desc = await personneInpi({ nom: 'TESTEUSE', prenoms: ['Marie'], sexe: 'F', dateNaissance: '1985-04-12', lieuNaissance: 'Lyon', nationalite: 'FRA', numeroSecu: nir(), situationMatrimoniale: 'CELIBATAIRE', codePostalNaissance: '69001' }, [], 'gérante');
    const adr = await adresseInpi({ voie: '5 rue de la République', codePostal: '13002', commune: 'Marseille' }, [], 'domicile');
    c.personneMorale.composition.pouvoirs.push({
      individu: { voletSocial: { organismeAssuranceMaladieActuelle: 'R', activiteSimultanee: false, affiliationPamBiologiste: false, affiliationPamPharmacien: false, declarationMineur: false, indicateurActiviteAnterieure: false }, descriptionPersonne: { ...desc, formeSociale: '3' }, adresseDomicile: adr },
      roleEntreprise: '30', statutPourLaFormalite: '1', typeDePersonne: 'INDIVIDU', beneficiaireEffectif: false, indicateurSecondRoleEntreprise: false, dateEffet34Or35M: today,
    });
  }],
];

(async () => {
  const client = inpi.forOrg(ORG);
  const siren = (await client.listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'].find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  const crees = [];
  for (const [label, mutate] of CAS) {
    try {
      const { formality, events } = await createModificationDraft(ORG, siren, { mutate, reference: 'TEST-MODIF', nomDossier: `TEST ${label}` });
      crees.push(`${label} : liasse ${formality.liasseNumber}`);
      console.log(`✓ ${label} : brouillon créé — liasse ${formality.liasseNumber}, statut ${formality.status}, événements détectés par l'INPI ${JSON.stringify(events)}`);
    } catch (e) {
      console.log(`✗ ${label} : ${String(e.message).slice(0, 1500)}`);
    }
  }
  console.log(`\nBROUILLONS À SUPPRIMER :\n${crees.map((x) => '  - ' + x).join('\n') || '  (aucun)'}`);
})().catch((e) => console.log('ERR', e.message));
