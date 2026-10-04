// Lecture seule : champs racine liés à la cessation (evenementCessation, natureCessation…) et leurs codes.
const fs = require('fs');
const j = JSON.parse(fs.readFileSync('/opt/compta-proxy/data/gu-formalities-openapi.json', 'utf8'));
const schemas = j.components?.schemas || {};
const vus = new Set();
for (const [nom, s] of Object.entries(schemas)) for (const [k, v] of Object.entries(s?.properties || {})) {
  if (!/^(evenementCessation|natureCessation|natureCessationEntreprise|indicateurPoursuiteCessation|motifDisparition|typeDissolution|motifCessation|destination)$/.test(k)) continue;
  const cle = `${k}|${v.description || ''}|${JSON.stringify(v.enum || '')}|${v.$ref || ''}`;
  if (vus.has(cle)) continue; vus.add(cle);
  console.log(`\n${nom}.${k} : ${v.type || v.$ref || ''}`);
  if (v.description) console.log('  ' + String(v.description).replace(/\n/g, '\n  ').slice(0, 900));
  if (v.enum) console.log('  enum', JSON.stringify(v.enum));
  if (v.$ref) { const r = schemas[v.$ref.split('/').pop()]; if (r) console.log('  →', Object.keys(r.properties || {}).join(', ')); }
}
