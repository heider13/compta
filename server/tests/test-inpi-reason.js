// Lecture seule : valeur de reason16P dans les modifications d'EI validées (code, pas de donnée personnelle).
const inpi = require('../inpi');
(async () => {
  const c = inpi.forOrg('00000000-0000-0000-0000-000000000001');
  for (const id of [6520399]) {
    const d = await c.getFormality(id);
    const a = d.content?.personnePhysique?.identite?.entrepreneur?.adresseDomicile || {};
    console.log(`formalité ${id} events=${JSON.stringify(d.events)} reason16P=${JSON.stringify(a.reason16P)} destinationAdresse=${JSON.stringify(a.destinationAdresse)}`);
  }
})().catch((e) => console.log('ERR', e.message));
