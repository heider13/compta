// Lecture seule : diagnostic des bases de modification (présence des champs, pas de valeurs).
const inpi = require('../inpi');
const { baseModification } = require('../lib/inpi-modification');
const ORG = '00000000-0000-0000-0000-000000000001';
const p = (v) => (v == null || v === '' ? '∅' : '✓');
(async () => {
  const c = inpi.forOrg(ORG);
  const list = (await c.listFormalities({ page: 1, itemsPerPage: 100 }))['hydra:member'];
  const sa = list.find((f) => /STRATEGY ASSOCIATES/i.test(f.companyName || '') && f.siren).siren;
  const ei = list.find((f) => /ZERKOUNI/i.test(f.companyName || '') && f.typeFormalite === 'C' && f.status === 'VALIDATED').siren;
  const b1 = await baseModification(ORG, sa);
  const pm = b1.next.personneMorale;
  console.log('STRATEGY : établissement principal', pm.etablissementPrincipal ? 'présent' : 'ABSENT', '| activités EP', (pm.etablissementPrincipal?.activites || []).map((a) => `rolePrincipal=${a.rolePrincipalPourEntreprise}`).join(','), '| autres établissements', (pm.autresEtablissements || []).length);
  const r = await c.listFormalities({ siren: ei, itemsPerPage: 10, 'order[created]': 'desc' });
  console.log('EI : formalités au GU pour ce SIREN :', (r['hydra:member'] || []).map((f) => `${f.typeFormalite}/${f.status}`).join(', '));
  const b2 = await baseModification(ORG, ei);
  const e = b2.next.personnePhysique.identite.entrepreneur;
  const d = e.descriptionPersonne || {};
  console.log('EI après complément : naissance', p(d.dateDeNaissance), d.dateDeNaissance ? `(format ${d.dateDeNaissance.length} car.)` : '', '| pays', p(d.paysNaissance), '| lieu', p(d.lieuDeNaissance), '| codeInsee', p(d.codeInseeGeographique), '| voie', p(e.adresseDomicile?.voie));
  const last = (r['hydra:member'] || []).find((f) => f.status === 'VALIDATED');
  if (last) {
    const gu = (await c.getFormality(last.id)).content?.personnePhysique?.identite?.entrepreneur;
    const g = gu?.descriptionPersonne || {};
    console.log('Liasse GU validée : naissance', p(g.dateDeNaissance), '| pays', p(g.paysNaissance), '| lieu', p(g.lieuDeNaissance), '| codeInsee', p(g.codeInseeGeographique), '| voie', p(gu?.adresseDomicile?.voie), '| clé nom/prénom identique ?', (String(g.nom).toUpperCase() === String(d.nom).toUpperCase()) && (String((g.prenoms || [])[0]).toUpperCase() === String((d.prenoms || [])[0]).toUpperCase()));
  }
})().catch((e) => console.log('ERR', e.message));
