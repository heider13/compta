// Lecture seule : listes de codes (rôles, pièces, événements) contenant « liquidat / dissolution / radiation ».
const fs = require('fs');
const j = JSON.parse(fs.readFileSync('/opt/compta-proxy/data/gu-formalities-openapi.json', 'utf8'));
const textes = new Set();
(function walk(o) { if (Array.isArray(o)) return o.forEach(walk); if (o && typeof o === 'object') return Object.values(o).forEach(walk); if (typeof o === 'string' && o.includes('->')) textes.add(o); })(j);
const lignes = [...new Set([...textes].flatMap((t) => t.split(/\n|<br\s*\/?>/)).map((l) => l.trim()))];
const voir = (titre, re) => { console.log(`\n${titre}`); lignes.filter((l) => re.test(l)).slice(0, 25).forEach((l) => console.log('   ' + l.slice(0, 160))); };
voir('Rôles (liquidateur, gérants) :', /^-?\s*\d{1,3} -> .*(iquidat|Gérant|Président)/);
voir('Pièces :', /PJ_\d+ -> .*(issolution|iquidat|adiation|omptes de cl|isparition|sommeil)/i);
voir('Événements :', /\b\d\d[MPF] -> .*(issolution|iquidat|adiation|isparition)/i);
voir('Types de dissolution / motifs :', /^-?\s*\w{1,3} -> .*(issolution|amiable|anticip|judiciaire|transmission universelle|clôture)/i);
