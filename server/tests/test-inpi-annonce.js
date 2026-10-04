// Rédaction d'annonces légales (aucune publication, aucun envoi INPI) sur STRATEGY ASSOCIATES.
const inpi = require('../inpi');
const rne = require('../lib/inpi-rne');
const annonces = require('../lib/annonces-legales');
const ORG = '00000000-0000-0000-0000-000000000001';
(async () => {
  const siren = (await inpi.forOrg(ORG).listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'].find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  const fiche = rne.summarizeCompany(await rne.getCompany(ORG, siren));
  console.log('societe', JSON.stringify(annonces.identiteSociete(fiche)).replace(/"nom":"[^"]*"/g, '"nom":"…"'));
  const CAS = [
    ['transfert_siege', "Décision de l'associé unique du 1er octobre 2026, transfert du siège au 10 La Canebière, 13001 Marseille, à compter du 1er octobre 2026."],
    ['dissolution', "Décision de l'associé unique du 1er octobre 2026 : dissolution anticipée à compter de ce jour ; le gérant actuel est nommé liquidateur ; siège de la liquidation fixé au siège social."],
  ];
  for (const [type, instructions] of CAS) {
    const r = await annonces.redigerAnnonce({ type, donnees: { societe: annonces.identiteSociete(fiche) }, instructions });
    console.log(`\n===== ${r.label} =====`);
    for (const a of r.annonces) console.log(`[dépt ${a.departement} · ${a.caracteres} caractères]\n${a.texte}\n`);
    console.log('Contrôle :', r.controle.map((c) => `${c.statut === 'presente' ? '✔' : c.statut === 'sans_objet' ? '—' : '✘'} ${c.mention}`).join('\n  '));
    console.log('À compléter :', r.a_completer.join(' ; ') || 'rien');
    if (r.observations) console.log('Observations :', r.observations);
    console.log('tokens', r.usage.input_tokens, '/', r.usage.output_tokens);
  }
})().catch((e) => console.log('ERR', e.message));
