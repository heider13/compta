// Lecture seule : fiche RNE de la SCI test (forme, rôles des dirigeants, présence des données).
const inpi = require('../inpi');
const rne = require('../lib/inpi-rne');
const ORG = '00000000-0000-0000-0000-000000000001';
(async () => {
  const list = [];
  const c = inpi.forOrg(ORG);
  for (let page = 1; page <= 5; page++) { const r = await c.listFormalities({ page, itemsPerPage: 100 }); const it = r['hydra:member'] || []; list.push(...it); if (it.length < 100) break; }
  const sci = list.filter((f) => /GENIE/i.test(f.companyName || f.nomDossier || '') && f.siren);
  console.log('formalités trouvées :', sci.map((f) => `${f.companyName} ${f.typeFormalite}/${f.status} events=${JSON.stringify(f.events)}`).join(' | ') || 'aucune');
  if (!sci.length) return;
  const co = await rne.getCompany(ORG, sci[0].siren);
  const pm = co.formality.content.personneMorale;
  console.log('forme', co.formality.formeJuridique, '| rôles des dirigeants', JSON.stringify((pm.composition?.pouvoirs || []).map((p) => ({ role: p.roleEntreprise, type: p.typeDePersonne, naissance: p.individu?.descriptionPersonne?.dateDeNaissance ? p.individu.descriptionPersonne.dateDeNaissance.length + ' car.' : '∅', voie: p.individu?.adresseDomicile?.voie ? '✓' : '∅' }))));
  console.log('établissement principal', pm.etablissementPrincipal ? 'présent' : 'absent', '| BE', (pm.beneficiairesEffectifs || []).length);
})().catch((e) => console.log('ERR', e.message));
