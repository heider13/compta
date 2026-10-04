// Lecture seule : documents RNE via lib/rne-documents.
const inpi = require('../inpi');
const docs = require('../lib/rne-documents');
const ORG = '00000000-0000-0000-0000-000000000001';
(async () => {
  const siren = (await inpi.forOrg(ORG).listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'].find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  const r = await docs.listDocuments(ORG, siren);
  console.log(r.denomination, 'siret siège', r.siretSiege ? 'oui' : 'non', '| actes', r.actes.length, '| bilans', r.bilans.length);
  for (const a of r.actes) console.log(' -', a.dateDepot, a.libelle, a.confidentiel ? '(confidentiel)' : '');
  const statuts = r.actes.find((a) => /statuts/i.test(a.libelle));
  if (statuts) { const f = await docs.downloadDocument(ORG, 'acte', statuts.id); console.log('statuts téléchargés', f.contentType, f.buffer.length, 'octets'); }
})().catch((e) => console.log('ERR', e.message));
