// L'agent reçoit une liste de formalités : il doit appeler preparer_lot puis demander confirmation (aucun lot lancé).
const { runAgentTurn } = require('../lib/formality-agent');
const { getSupabaseAdmin } = require('../lib/db');
const ORG = '00000000-0000-0000-0000-000000000001';
(async () => {
  const { data: m } = await getSupabaseAdmin().from('memberships').select('user_id').eq('organization_id', ORG).limit(1).maybeSingle();
  const tools = [];
  let texte = '';
  await runAgentTurn({
    history: [],
    input: "Prépare-moi ces formalités : créer la SASU ALPHA CONSEIL (capital 1 000 €, siège 12 rue de Rome 13001 Marseille) et la SASU BETA STRATEGIE (capital 2 000 €, siège 4 cours Mirabeau 13100 Aix-en-Provence) ; mettre en sommeil STRATEGY ASSOCIATES (SIREN 105573109) au 31/10/2026.",
    ctx: { userId: m.user_id, orgId: ORG, isAdmin: false },
    emit: (e, d) => { if (e === 'tool' && d.status !== 'start') tools.push(`${d.name}:${d.status}`); if (e === 'text') texte += d.text; },
  });
  console.log('outils :', tools.join(' → '));
  console.log('réponse :', texte.slice(0, 1500));
})().catch((e) => console.log('ERR', e.message));
