// Découpage d'une liste en formalités (aucun dossier créé, aucun envoi INPI).
const lots = require('../lib/batch');
const ORG = '00000000-0000-0000-0000-000000000001';
(async () => {
  const plan = await lots.planifier(`Créer 3 SASU de conseil, capital 1 000 €, clôture au 31/12 :
- ALPHA CONSEIL, siège 12 rue de Rome 13001 Marseille, président Jean Martin
- BETA STRATEGIE, siège 4 cours Mirabeau 13100 Aix-en-Provence, présidente Claire Durand
- GAMMA FINANCE, siège 8 quai du Port 13002 Marseille
Mettre en sommeil la SARL DELTA (SIREN 123456789) au 31/10/2026.
Dissoudre STRATEGY ASSOCIATES, liquidateur le gérant.`);
  for (const f of plan.formalites) console.log(`- [${f.label}] ${f.societe} ${f.siren || ''}\n    consigne : ${f.consigne.slice(0, 220)}\n    manquants : ${f.manquants.join(' ; ') || '—'}`);
  console.log('observations :', plan.observations || '—');
  console.log('lots existants :', (await lots.lister(ORG)).length);
})().catch((e) => console.log('ERR', e.message));
