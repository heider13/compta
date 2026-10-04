// Lecture seule : spécification OpenAPI « Formalités » du Guichet unique (chemins et descriptions liés aux modifications).
const inpi = require('../inpi');
(async () => {
  const c = inpi.forOrg('00000000-0000-0000-0000-000000000001');
  const r = await c.rawFetch('/file/openapi/scalar/mandataire/formalities.json');
  const t = await r.text();
  console.log('spec →', r.status, t.length, 'octets');
  const j = JSON.parse(t);
  require('fs').writeFileSync('/opt/compta-proxy/data/gu-formalities-openapi.json', t);
  for (const [p, ops] of Object.entries(j.paths || {})) for (const [m, op] of Object.entries(ops)) {
    console.log(`${m.toUpperCase().padEnd(7)} ${p} — ${op.summary || ''}`);
    if (/formalit/.test(p) && m === 'post') console.log('   ', String(op.description || '').replace(/\s+/g, ' ').slice(0, 1500));
  }
})().catch((e) => console.log('ERR', e.message));
