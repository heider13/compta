// Lecture seule : structure des radiations validées (40M société, 41P EI) — blocs de cessation.
const inpi = require('../inpi');
const masque = (o) => JSON.parse(JSON.stringify(o ?? null, (k, v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? '<date>' : (typeof v === 'string' && v.length > 12 ? '<texte>' : v))));
(async () => {
  const c = inpi.forOrg('00000000-0000-0000-0000-000000000001');
  for (const id of [9407713, 11059641, 2524537]) {
    const d = await c.getFormality(id);
    const bloc = d.content.personneMorale ? 'personneMorale' : 'personnePhysique';
    const b = d.content[bloc];
    console.log(`\n### ${d.typeFormalite} ${d.typePersonne} events=${JSON.stringify(d.events)} typeLiasse=${d.typeLiasse}`);
    console.log('detailCessationEntreprise :', JSON.stringify(masque(b.detailCessationEntreprise)));
    console.log('natureCessation (content) :', JSON.stringify(masque(d.content.natureCessation)), '| natureCessationEntreprise :', JSON.stringify(masque(d.content.natureCessationEntreprise)));
    console.log('evenementCessation :', JSON.stringify(masque(d.content.evenementCessation)), '| indicateurPoursuiteCessation :', JSON.stringify(d.content.indicateurPoursuiteCessation));
    const ep = b.etablissementPrincipal; const ae = b.autresEtablissements || [];
    console.log('établissement principal :', ep ? JSON.stringify(masque({ statut: ep.descriptionEtablissement?.statutPourFormalite, fermeture: ep.descriptionEtablissement?.dateEffetFermeture, destination: ep.descriptionEtablissement?.destinationEtablissement })) : 'absent', '| autres :', ae.map((e) => JSON.stringify(masque({ statut: e.descriptionEtablissement?.statutPourFormalite, role: e.descriptionEtablissement?.rolePourEntreprise, fin: e.descriptionEtablissement?.dateFinActivite, destination: e.descriptionEtablissement?.destinationEtablissement }))).join(' ; '));
    console.log('pouvoirs statuts :', (b.composition?.pouvoirs || []).map((p) => p.statutPourLaFormalite).join(','), '| liquidateur ?', JSON.stringify((b.composition?.pouvoirs || []).map((p) => p.roleEntreprise)));
    const pj = (d.content.piecesJointes || []).filter((p) => p.depositor === 'DECLARANT' && !p.invalidated).map((p) => `${p.typeDocument}/${p.sousTypeDocument || ''}→${p.path}`);
    console.log('pièces :', pj.join(' | '));
  }
})().catch((e) => console.log('ERR', e.message));
