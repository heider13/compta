// Lecture seule : formalités récentes de l'entreprise test (une modification a-t-elle été créée ?).
const inpi = require('../inpi');
(async () => {
  const c = inpi.forOrg('00000000-0000-0000-0000-000000000001');
  const list = (await c.listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'];
  const siren = list.find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  const r = await c.listFormalities({ siren, itemsPerPage: 20, 'order[created]': 'desc' });
  for (const f of r['hydra:member'] || []) console.log(`${f.created} | ${f.typeFormalite} | ${f.status} | liasse ${f.liasseNumber} | id ${f.id} | réf ${f.referenceMandataire || '-'} | events ${JSON.stringify(f.events || [])}`);
})().catch((e) => console.log('ERR', e.message));
