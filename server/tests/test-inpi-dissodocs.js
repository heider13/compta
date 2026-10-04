// Lecture seule : tous les indicateurs d'événement is…Triggered de la spécification (nom → schéma).
const fs = require('fs');
const j = JSON.parse(fs.readFileSync('/opt/compta-proxy/data/gu-formalities-openapi.json', 'utf8'));
const out = new Map();
for (const [nom, s] of Object.entries(j.components?.schemas || {})) for (const [k, v] of Object.entries(s?.properties || {})) {
  if (/^is.*Triggered$/.test(k)) { const sch = nom.replace(/-\d+$/, ''); if (!out.has(k)) out.set(k, new Set()); out.get(k).add(sch + (v.description ? ` (${String(v.description).slice(0, 40)})` : '')); }
}
const cles = [...out.keys()].sort();
console.log(cles.length, 'indicateurs');
for (const k of cles) if (/4\d|3[6-9]|Dissol|Dispar|Liquid|Cess|Radi|Ferm|Transm|Sommeil/i.test(k)) console.log(`  ${k.padEnd(46)} ${[...out.get(k)].join(', ').slice(0, 110)}`);
console.log('\nTous (compact) :', cles.join(' '));
