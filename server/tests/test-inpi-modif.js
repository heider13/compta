// Test de liasse de MODIFICATION sur STRATEGY ASSOCIATES (société du cabinet, choisie comme
// entreprise test). Crée un BROUILLON jamais signé, à supprimer ensuite.
// Base = fiche RNE actuelle + changement + déclarant du mandataire.
const inpi = require('../inpi');
const rne = require('../lib/inpi-rne');
const { mandataireBlocks } = require('../lib/inpi-liasse');

const ORG = '00000000-0000-0000-0000-000000000001';
const on = (v) => (v === false || v === 'N' ? 'N' : 'O');
const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k.startsWith('@') ? undefined : v)));

(async () => {
  const client = inpi.forOrg(ORG);
  const list = (await client.listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'];
  const siren = list.find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  const company = await rne.getCompany(ORG, siren);
  const content = clean(company.formality.content);
  const m = await mandataireBlocks(client);
  const today = new Date().toISOString().slice(0, 10);

  // Liasse de création de l'entreprise au Guichet unique (format natif, contient numGreffe)
  const creation = list.find((f) => f.siren === siren && f.typeFormalite === 'C');
  const gu = creation ? clean((await client.getFormality(creation.id)).content) : null;
  const numGreffe = gu?.personneMorale?.identite?.entreprise?.numGreffe;
  const premier = (company.formality.historique || []).find((h) => /^0[1-5][MP]$/.test(h.codeEvenement))?.numeroLiasse;
  console.log('numGreffe (création GU) :', numGreffe || 'absent', '| liasse de création :', premier);

  const appliquer = (c) => {
    const d = c.personneMorale.identite.description;
    d.objet = `${String(d.objet || '').replace(/ — MODIFICATION DE TEST.*$/, '')} — MODIFICATION DE TEST, NE PAS VALIDER`;
    d.is12MTriggered = true;
    d.dateEffet12M = today;
    c.declarant = m.declarant;
    Object.assign(c.personneMorale.identite, { adresseCorrespondance: m.adresseCorrespondance, destinataireCorrespondance: m.destinataireCorrespondance, contactCorrespondance: m.contactCorrespondance });
    delete c.piecesJointes;
    return c;
  };
  const v1 = appliquer(JSON.parse(JSON.stringify(content)));
  if (numGreffe) v1.personneMorale.identite.entreprise.numGreffe = numGreffe;
  Object.assign(v1.natureCreation = v1.natureCreation || {}, { societeEtrangere: false, etablieEnFrance: true, salarieEnFrance: false, relieeEntrepriseAgricole: false, entrepriseAgricole: false, eirl: false, indicateurEtablissementFictif: false, seulsBeneficiairesModifies: false });
  // Caractéristiques d'adresse vides au RNE : reprises de la liasse de création
  const car = (v1.personneMorale.adresseEntreprise.caracteristiques ||= {});
  const carGu = gu?.personneMorale?.adresseEntreprise?.caracteristiques || {};
  for (const k of ['indicateurDomicileEntrepreneur', 'domiciliataire', 'ambulant', 'indicateurAdresseEtablissement', 'diffusionDomiciliationAsEntrepriseAddress']) {
    if (car[k] == null) car[k] = carGu[k] ?? (k === 'diffusionDomiciliationAsEntrepriseAddress' ? 'N' : false);
  }
  if (car.indicateurDomicileEntrepreneur) car.indicateurDomicileEntrepreneurValidation = true;
  // Point d'accès des modifications (spec officielle) : POST /api/formality_updates
  // { previousFormality: fiche RNE, newFormality: fiche modifiée }
  for (const [label, avant] of [['RNE brut', company.formality.content], ['RNE nettoyé', content]]) {
    const body = {
      previousFormality: { companyName: content.personneMorale.identite.entreprise.denomination, typePersonne: 'M', content: avant },
      newFormality: {
        companyName: v1.personneMorale.identite.entreprise.denomination,
        referenceMandataire: 'TEST-MODIF-12M',
        nomDossier: `TEST MODIF ${v1.personneMorale.identite.entreprise.denomination}`,
        typeFormalite: 'M',
        diffusionINSEE: on(company.formality.diffusionINSEE),
        diffusionCommerciale: on(company.formality.diffusionCommerciale),
        typePersonne: 'M',
        content: v1,
      },
    };
    try {
      const f = await client.request('/api/formality_updates', { method: 'POST', body });
      console.log(`✓ Modification 12M (${label}) : brouillon créé — liasse ${f.liasseNumber || f.newFormality?.liasseNumber || '?'} (id ${f.id || f.newFormality?.id || '?'}), statut ${f.status || f.newFormality?.status || '?'}, événements ${JSON.stringify(f.events || f.newFormality?.events || [])}`);
      console.log(`  clés réponse : ${Object.keys(f).join(', ')}`);
      console.log('BROUILLON À SUPPRIMER : modification de test STRATEGY ASSOCIATES');
      break;
    } catch (e) {
      const v = e.payload?.violations;
      console.log(`✗ Modification 12M (${label}) : ${Array.isArray(v) ? v.map((x) => `${x.propertyPath} → ${x.message}`).join(' | ') : String(e.message).slice(0, 800)}`);
    }
  }
})().catch((e) => console.log('ERR', e.message));
