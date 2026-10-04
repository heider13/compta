// Lecture seule : statut du brouillon SAS de test et codes attendus (aucune donnée personnelle affichée).
const inpi = require('../inpi');
(async () => {
  const c = inpi.forOrg('19c6719d-f210-4451-ba7a-058a061ddf55');
  const sas = await c.getFormality(21760903);
  console.log('Brouillon SAS de test : statut', sas.status, '| signé le', sas.signedDate || 'jamais', '| validationsRequests', (sas.validationsRequests || []).length);
  const list = [];
  for (let page = 1; page <= 5; page++) { const r = await c.listFormalities({ page, itemsPerPage: 100 }); const it = r['hydra:member'] || []; list.push(...it); if (it.length < 100) break; }
  const vals = { situationMatrimoniale: {}, typeDeStatuts: {}, organismeAssuranceMaladieActuelle: {}, periodiciteVersement: {}, regimeImpositionBenefices: {}, statutExerciceActiviteSimultanee: {} };
  const seen = (k, v, ctx) => { if (v == null || v === '') return; const key = `${v} [${ctx}]`; vals[k][key] = (vals[k][key] || 0) + 1; };
  for (const f of list.filter((x) => x.status === 'VALIDATED')) {
    const d = await c.getFormality(f.id);
    const ctx = `${d.typeFormalite}${d.typePersonne}-${d.formeJuridique}`;
    (function walk(o) {
      if (Array.isArray(o)) return o.forEach(walk);
      if (!o || typeof o !== 'object') return;
      for (const k of Object.keys(vals)) if (k in o && typeof o[k] !== 'object') seen(k, o[k], ctx);
      Object.values(o).forEach((v) => v && typeof v === 'object' && walk(v));
    })(d.content);
    const pv = d.content?.personneMorale?.composition?.pouvoirs?.[0]?.individu?.descriptionPersonne;
    if (pv) seen('situationMatrimoniale', `numeroSecu=${pv.numeroSecu ? 'présent' : 'absent'}`, `${ctx} role=${d.content.personneMorale.composition.pouvoirs[0].roleEntreprise}`);
  }
  for (const [k, m] of Object.entries(vals)) console.log(`\n${k} :`, Object.entries(m).sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v}×${n}`).join(' | '));
})().catch((e) => console.log('ERR', e.message));
