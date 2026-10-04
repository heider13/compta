const rne = require('../lib/inpi-rne');
const ORG = '00000000-0000-0000-0000-000000000001';
const pick = (d) => d && Object.fromEntries(Object.entries(d).filter(([k, v]) => v != null && v !== false && !/repreneurs|adresse/i.test(k)));
(async () => {
  const token = await rne.rneToken(ORG);
  let arr = []; let after = null;
  for (let i = 0; i < 40 && arr.length < 4000; i++) {
    const url = 'https://registre-national-entreprises.inpi.fr/api/companies/diff?from=2026-09-15&to=2026-09-16&pageSize=100' + (after ? `&searchAfter=${encodeURIComponent(after)}` : '');
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) { console.log('HTTP', r.status); break; }
    const list = await r.json();
    const page = Array.isArray(list) ? list : (list['hydra:member'] || []);
    arr.push(...page);
    after = r.headers.get('pagination-search-after');
    if (!after || page.length < 100) break;
  }
  console.log('fiches lues', arr.length, 'clés', Object.keys(arr[0] || {}), 'formality', Object.keys(arr[0]?.company?.formality || {}), 'content', Object.keys(arr[0]?.company?.formality?.content || {}));
  const stats = {};
  for (const c of arr) { const d = c.company?.formality?.content?.personneMorale?.detailCessationEntreprise; if (d) for (const [k, v] of Object.entries(d)) if (v != null && v !== false) stats[k] = (stats[k] || 0) + 1; }
  console.log('champs cessation renseignés', JSON.stringify(stats));
  let shown = 0;
  for (const c of arr) {
    const pm = c.company?.formality?.content?.personneMorale;
    const d = pm?.detailCessationEntreprise;
    if (!d || !d.dateClotureLiquidation) continue;
    console.log('\n--', c.siren, c.company?.formality?.formeJuridique, 'diffusion', c.company?.formality?.diffusionCommerciale);
    console.log('detail', JSON.stringify(pick(d)));
    console.log('top', JSON.stringify({ natureCessation: c.company?.formality?.content?.natureCessation, evenementCessation: c.company?.formality?.content?.evenementCessation, nce: c.company?.formality?.content?.natureCessationEntreprise }));
    console.log('EP', JSON.stringify(pick(pm.etablissementPrincipal?.descriptionEtablissement)), 'autres', (pm.autresEtablissements || []).map((e) => JSON.stringify(pick(e.descriptionEtablissement))).join(' | '));
    console.log('roles', JSON.stringify((pm.composition?.pouvoirs || []).map((p) => p.roleEntreprise)));
    const h = c.company?.formality?.historique || [];
    console.log('historique (3 derniers)', JSON.stringify(h.slice(-4).map((x) => ({ date: x.dateIntegration || x.date, code: x.codeEvenement, effet: x.dateEffet }))).slice(0, 900));
    if (++shown >= 5) break;
  }
})().catch((e) => console.log('ERR', e.message));
