// Lecture seule : schéma du corps attendu par POST /api/formality_updates (spec officielle).
const fs = require('fs');
const j = JSON.parse(fs.readFileSync('/opt/compta-proxy/data/gu-formalities-openapi.json', 'utf8'));
const op = j.paths['/api/formality_updates'].post;
console.log('description :', String(op.description || '').replace(/\s+/g, ' ').slice(0, 800));
const ref = (r) => r.split('/').slice(-1)[0];
const schemas = j.components?.schemas || {};
let body = op.requestBody?.content && Object.values(op.requestBody.content)[0]?.schema;
console.log('corps :', JSON.stringify(body));
const name = body?.$ref ? ref(body.$ref) : null;
const s = name ? schemas[name] : body;
if (s) {
  console.log(`\nschéma ${name} : requis = ${JSON.stringify(s.required || [])}`);
  for (const [k, v] of Object.entries(s.properties || {})) console.log(`  ${k} : ${v.type || (v.$ref ? ref(v.$ref) : '')} ${v.description ? '— ' + String(v.description).replace(/\s+/g, ' ').slice(0, 160) : ''}`);
}
const resp = op.responses && Object.keys(op.responses);
console.log('\nréponses :', JSON.stringify(resp));
