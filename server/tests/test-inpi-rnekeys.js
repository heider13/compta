// Lecture seule : références de la fiche RNE utiles à une modification (n° de liasse, numNat…).
const inpi = require('../inpi');
const rne = require('../lib/inpi-rne');
(async () => {
  const ORG = '00000000-0000-0000-0000-000000000001';
  const list = (await inpi.forOrg(ORG).listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'];
  const sa = list.find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren);
  console.log('formalité de création au GU : liasse', sa.liasseNumber, '| premierNumero', sa.premierNumeroLiasseFormalite);
  const co = await rne.getCompany(ORG, sa.siren);
  const f = co.formality;
  console.log('RNE formality keys :', Object.keys(f).join(', '));
  const hist = f.historique || [];
  console.log('historique :', hist.length, 'entrées ; clés', hist[0] ? Object.keys(hist[0]).join(', ') : '-');
  hist.slice(0, 5).forEach((h) => console.log('  ', JSON.stringify({ numeroLiasse: h.numeroLiasse, dateIntegration: h.dateIntegration, libelleEvenement: h.libelleEvenement, codeEvenement: h.codeEvenement, numNat: h.numNat })));
  // Recherche récursive de champs « liasse » / « numNat » dans la fiche
  const hits = [];
  (function walk(o, p) { if (Array.isArray(o)) o.forEach((v, i) => walk(v, `${p}[${i}]`)); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (/liasse|numNat|numeroGestion/i.test(k)) hits.push(`${p}.${k}=${typeof v === 'object' ? '[obj]' : v}`); walk(v, `${p}.${k}`); } })(co, 'co');
  console.log('champs liasse/numNat :', hits.slice(0, 15).join(' | '));
})().catch((e) => console.log('ERR', e.message));
