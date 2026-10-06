// Lecture seule : structure des informations de paiement des formalités du cabinet.
const inpi = require('../inpi');
const ORG = '00000000-0000-0000-0000-000000000001';
const montre = (o) => String(JSON.stringify(o, (k, v) => (/nom|prenom|email|adresse|telephone|iban/i.test(k) ? '…' : v))).slice(0, 1800);
(async () => {
  const c = inpi.forOrg(ORG);
  const list = (await c.listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'];
  console.log('clés de liste :', Object.keys(list[0]).join(', '));
  const stats = {};
  for (const f of list) stats[f.status] = (stats[f.status] || 0) + 1;
  console.log('statuts :', JSON.stringify(stats));
  const cibles = [list.find((f) => f.status === 'PAYMENT_PENDING'), list.find((f) => f.status === 'VALIDATED'), list.find((f) => /AMENDMENT_PAYMENT/.test(f.status))].filter(Boolean);
  for (const f of cibles) {
    const full = await c.getFormality(f.id);
    console.log('\n==', f.liasseNumber, f.status, '| clés paiement :', Object.keys(full).filter((k) => /pay|paid|cart|deleg|numNat|price|amount|montant/i.test(k)).join(', '));
    console.log('paid', full.paid, '| numNat', full.numNat, '| delegationPayments', montre(full.delegationPayments));
    console.log('carts', montre(full.carts));
  }
})().catch((e) => console.log('ERR', e.message));
