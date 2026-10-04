// Lecture seule : listes de codes contenant « Autre adresse », « Siège », « domicile du liquidateur ».
const fs = require('fs');
const j = JSON.parse(fs.readFileSync('/opt/compta-proxy/data/gu-formalities-openapi.json', 'utf8'));
const textes = new Set();
(function walk(o) { if (Array.isArray(o)) return o.forEach(walk); if (o && typeof o === 'object') return Object.values(o).forEach(walk); if (typeof o === 'string' && /-> /.test(o)) textes.add(o); })(j);
for (const t of textes) {
  if (/Autre adresse|liquidat/i.test(t) && t.length < 1500) console.log('----\n' + t.replace(/<br\s*\/?>/g, '\n'));
}
