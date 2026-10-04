// Test de liasse de MODIFICATION sur STRATEGY ASSOCIATES (société du cabinet, choisie comme
// entreprise test). Crée un BROUILLON jamais signé, à supprimer ensuite.
// Base = fiche RNE actuelle + changement + déclarant du mandataire.
const inpi = require('../inpi');
const rne = require('../lib/inpi-rne');
const { mandataireBlocks } = require('../lib/inpi-liasse');

const ORG = '00000000-0000-0000-0000-000000000001';
const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k.startsWith('@') ? undefined : v)));

(async () => {
  const client = inpi.forOrg(ORG);
  const list = (await client.listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'];
  const siren = list.find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  const company = await rne.getCompany(ORG, siren);
  const content = clean(company.formality.content);
  const m = await mandataireBlocks(client);
  const today = new Date().toISOString().slice(0, 10);

  // Changement d'objet social (12M)
  const d = content.personneMorale.identite.description;
  d.objet = `${d.objet} — MODIFICATION DE TEST, NE PAS VALIDER`;
  d.is12MTriggered = true;
  d.dateEffet12M = today;
  content.declarant = m.declarant;
  Object.assign(content.personneMorale.identite, {
    adresseCorrespondance: m.adresseCorrespondance, destinataireCorrespondance: m.destinataireCorrespondance, contactCorrespondance: m.contactCorrespondance,
  });

  const payload = {
    companyName: content.personneMorale.identite.entreprise.denomination,
    nomDossier: `TEST MODIF ${content.personneMorale.identite.entreprise.denomination}`,
    referenceMandataire: 'TEST-MODIF-12M',
    typeFormalite: 'M',
    typePersonne: 'M',
    siren,
    diffusionINSEE: company.formality.diffusionINSEE || 'O',
    diffusionCommerciale: company.formality.diffusionCommerciale || 'O',
    content,
  };
  try {
    const f = await client.createFormality(payload);
    console.log(`✓ Modification 12M : brouillon créé — liasse ${f.liasseNumber} (formalité ${f.id}), statut ${f.status}, événements ${JSON.stringify(f.events)}`);
    console.log(`\nBROUILLON À SUPPRIMER : liasse ${f.liasseNumber}`);
  } catch (e) {
    const v = e.payload?.violations;
    console.log(`✗ Modification 12M : ${Array.isArray(v) ? v.map((x) => `${x.propertyPath} → ${x.message}`).join('\n   ') : String(e.message).slice(0, 1500)}`);
  }
})().catch((e) => console.log('ERR', e.message));
