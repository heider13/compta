// Test de bout en bout par l'agent : transfert de siège de STRATEGY ASSOCIATES (entreprise test).
// Aperçu puis confirmation : crée un BROUILLON jamais signé, à supprimer.
const { runAgentTurn } = require('../lib/formality-agent');
const inpi = require('../inpi');
const ctx = { userId: '8d6c0e09-2d4a-447c-8c0e-b18c5079fa27', orgId: '00000000-0000-0000-0000-000000000001', isAdmin: false, dossierId: null };
const emit = (ev, d) => { if (ev === 'text') process.stdout.write(d.text); else if (ev === 'tool' && d.status !== 'start') console.log(`\n  [${d.status}] ${d.label}${d.detail ? ' - ' + d.detail : ''}`); };
(async () => {
  const siren = (await inpi.forOrg(ctx.orgId).listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'].find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  console.log('\n>>> TOUR 1');
  let out = await runAgentTurn({ history: [], input: `Test interne : transfert du siège de STRATEGY ASSOCIATES (SIREN ${siren}) au 10 avenue du Prado, 13008 Marseille, à effet du 1er novembre 2026. Pas de pièces pour ce test. Prépare la formalité et fais l'aperçu.`, ctx, emit });
  console.log(`\n[coût tour 1 : $${out.usage.costUsd}]\n\n>>> TOUR 2`);
  out = await runAgentTurn({ history: out.messages, input: 'Oui, je confirme : crée le brouillon de modification sur mon Guichet unique.', ctx, emit });
  console.log(`\n[coût tour 2 : $${out.usage.costUsd}]\nTEST-TERMINE`);
})().catch((e) => console.log('ERREUR', e.status || '', e.message));
