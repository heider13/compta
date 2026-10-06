// Lecture seule : synthèse de paiement calculée sur les formalités du cabinet.
const inpi = require('../inpi');
const { paiementDe, emailsCabinet } = require('../lib/inpi-paiement');
const ORG = '00000000-0000-0000-0000-000000000001';
(async () => {
  const emails = await emailsCabinet(ORG);
  console.log('e-mails du cabinet reconnus :', emails.length);
  const all = [];
  for (let p = 1; p <= 3; p++) { const m = (await inpi.forOrg(ORG).listFormalities({ page: p, itemsPerPage: 100 }))['hydra:member'] || []; all.push(...m); if (m.length < 100) break; }
  const stats = {};
  for (const f of all) { const s = paiementDe(f, emails).statut; stats[s] = (stats[s] || 0) + 1; }
  console.log('statuts de paiement :', JSON.stringify(stats));
  for (const f of all) {
    const p = paiementDe(f, emails);
    if (p.statut === 'a_payer' || p.statut === 'delegation_en_attente') console.log(`- ${f.liasseNumber} ${f.status} ${f.companyName || ''} → ${p.statut} ${(p.a_payer_cents / 100).toFixed(2)} € depuis ${p.jours_attente} j ${p.delegation ? '(délégation)' : ''}`);
  }
})().catch((e) => console.log('ERR', e.message));
