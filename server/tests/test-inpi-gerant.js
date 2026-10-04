// Lecture seule : structure (clés + codes courts) du gérant dans une création de SARL validée.
const inpi = require('../inpi');
function shape(o, d = 0) {
  if (Array.isArray(o)) return o.length ? `[${shape(o[0], d)}]` : '[]';
  if (o && typeof o === 'object') {
    if (d > 5) return '{…}';
    return '{' + Object.entries(o).filter(([k, v]) => !k.startsWith('@') && !/Triggered|^is[A-Z]/.test(k) && v !== null && v !== '').map(([k, v]) =>
      typeof v === 'object' ? `${k}:${shape(v, d + 1)}` : (typeof v === 'boolean' || (/^(role|type|code|statut|forme|regime|genre|situation|organisme|periodicite|option|nature|activite|affiliation|demande|indicateur)/i.test(k) && !/numeroSecu|nom|prenom|date|lieu|voie|commune|mail|tel/i.test(k) && String(v).length < 8) ? `${k}=${v}` : k)).join(', ') + '}';
  }
  return '';
}
(async () => {
  const c = inpi.forOrg('19c6719d-f210-4451-ba7a-058a061ddf55');
  const list = (await c.listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'];
  for (const f of list.filter((x) => x.typeFormalite === 'C' && x.status === 'VALIDATED')) {
    const d = await c.getFormality(f.id);
    if (d.formeJuridique !== '5499') continue;
    const p = d.content.personneMorale.composition.pouvoirs[0];
    console.log(`SARL validée — gérant role=${p.roleEntreprise} :\n${shape(p)}\n\ndescription : ${shape(d.content.personneMorale.identite.description)}`);
    break;
  }
})().catch((e) => console.log('ERR', e.message));
