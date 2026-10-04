// Lecture seule : indicateurs / dates d'effet / statuts qui changent entre l'état précédent et
// l'état déposé, pour chaque type d'événement de modification validé (aucune donnée personnelle).
const inpi = require('../inpi');
function flat(o, p = '', out = {}) {
  if (Array.isArray(o)) o.forEach((v, i) => flat(v, `${p}[${i}]`, out));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (!k.startsWith('@') && k !== 'piecesJointes') flat(v, p ? `${p}.${k}` : k, out); }
  else out[p] = o;
  return out;
}
(async () => {
  const c = inpi.forOrg('00000000-0000-0000-0000-000000000001');
  const list = [];
  for (let page = 1; page <= 5; page++) { const r = await c.listFormalities({ page, itemsPerPage: 100 }); const it = r['hydra:member'] || []; list.push(...it); if (it.length < 100) break; }
  const vus = new Set();
  for (const f of list.filter((x) => x.typeFormalite !== 'C')) {
    const d = await c.getFormality(f.id);
    const key = (d.events || []).slice().sort().join('+');
    if (vus.has(key) || !d.previousContent) continue;
    vus.add(key);
    const a = flat(d.previousContent), b = flat(d.content);
    const diffs = [...new Set([...Object.keys(a), ...Object.keys(b)])]
      .filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]) && /(Triggered|dateEffet|statutPourLaFormalite|statutPourFormalite|statutFormalite|^.*\.mode38F|isModification|indicateurSuppression|motifSuppression|detailCessation|natureCessation|indicateurDissolution|isTransfer)/.test(k) && !/declarant/.test(k))
      .map((k) => `${k.replace(/\[\d+\]/g, '[]')}: ${JSON.stringify(a[k] ?? null)}→${typeof b[k] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(b[k]) ? '<date>' : JSON.stringify(b[k] ?? null)}`);
    console.log(`\n### ${d.typeFormalite} ${d.typePersonne} forme ${d.formeJuridique} events=${key} (${d.status})`);
    [...new Set(diffs)].slice(0, 30).forEach((x) => console.log('   ' + x));
  }
})().catch((e) => console.log('ERR', e.message));
