// Lecture seule : champs de premier niveau (hors contenu) de modifications validées.
const inpi = require('../inpi');
(async () => {
  const c = inpi.forOrg('00000000-0000-0000-0000-000000000001');
  for (const id of [6913254, 12133263]) {
    const d = await c.getFormality(id);
    const top = {};
    for (const [k, v] of Object.entries(d)) {
      if (k.startsWith('@') || ['content', 'previousContent', 'attachments', 'validationsRequests', 'carts', 'rneContent', 'rneHistories', 'events', 'companyName', 'nomDossier', 'siren', 'liasseNumber', 'observationSignature', 'referenceMandataire', 'signedPlace', 'numNat', 'userValidator', 'validators', 'mandataireId'].includes(k)) continue;
      top[k] = v;
    }
    console.log(`\n### ${id} events=${JSON.stringify(d.events)}\n${JSON.stringify(top)}`);
    console.log('numNat présent:', !!d.numNat, '| rneContent présent:', !!d.rneContent, '| formalityScope:', JSON.stringify(d.formalityScope));
  }
})().catch((e) => console.log('ERR', e.message));
