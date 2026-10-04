// Lecture seule : où apparaissent les identifiants des rneScopes dans une modification validée ?
const inpi = require('../inpi');
const rne = require('../lib/inpi-rne');
(async () => {
  const ORG = '00000000-0000-0000-0000-000000000001';
  const c = inpi.forOrg(ORG);
  for (const id of [6913254, 12133263]) {
    const d = await c.getFormality(id);
    for (const sc of d.rneScopes || []) {
      const hits = [];
      (function walk(o, p) { if (Array.isArray(o)) o.forEach((v, i) => walk(v, `${p}[${i}]`)); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (v === sc.id) hits.push(`${p}.${k}`); walk(v, `${p}.${k}`); } })({ content: d.content, previousContent: d.previousContent }, '');
      console.log(`formalité ${id} scope ${sc.type}/${sc.action} id=${sc.id} → trouvé en : ${hits.slice(0, 4).join(' , ') || 'nulle part dans le contenu'}`);
    }
    const co = await rne.getCompany(ORG, d.siren).catch(() => null);
    if (co) console.log(`  fiche RNE de cette entreprise : id=${co.id}`);
  }
})().catch((e) => console.log('ERR', e.message));
