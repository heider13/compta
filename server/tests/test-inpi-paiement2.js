const inpi = require('../inpi');
const ORG = '00000000-0000-0000-0000-000000000001';
(async () => {
  const c = inpi.forOrg(ORG);
  const all = [];
  for (let p = 1; p <= 3; p++) { const m = (await c.listFormalities({ page: p, itemsPerPage: 100 }))['hydra:member'] || []; all.push(...m); if (m.length < 100) break; }
  const types = {}; const statuts = {}; let deleg = 0, multi = 0;
  for (const f of all) {
    if ((f.carts || []).length > 1) multi++;
    for (const k of f.carts || []) {
      types[k.paymentType] = (types[k.paymentType] || 0) + 1;
      statuts[k.status] = (statuts[k.status] || 0) + 1;
      if (k.delegationPayments?.length || k.payer) deleg++;
    }
  }
  console.log('formalités', all.length, '| paniers multiples', multi, '| modes', JSON.stringify(types), '| statuts paniers', JSON.stringify(statuts), '| avec payeur/délégation', deleg);
  const k = all.flatMap((f) => f.carts || []).find((x) => x.status === 'PAID');
  console.log('clés panier :', Object.keys(k).join(', '));
  console.log('payer', JSON.stringify(k.payer, (kk, v) => (/nom|prenom|email|adresse|name/i.test(kk) ? '…' : v)), '| deleg', JSON.stringify(k.delegationPayments), '| date', k.paymentDate, '| mode', k.paymentType);
  const d = all.flatMap((f) => f.carts || []).find((x) => x.delegationPayments?.length);
  if (d) console.log('exemple délégation', JSON.stringify(d.delegationPayments).slice(0, 300));
})().catch((e) => console.log('ERR', e.message));
