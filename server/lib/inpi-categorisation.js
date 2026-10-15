// Catégorisation INPI d'une activité (catégories 1 à 4 + précision) et forme
// d'exercice, exigées par le Guichet unique dès la création du brouillon.
//
// Il n'existe pas de référentiel public APE → catégorisation. On l'apprend sur des
// formalités RÉELLEMENT ACCEPTÉES : pour un code APE inconnu, on lit au RNE 3 fiches
// d'entreprises récentes de ce code (période Guichet unique) et on retient la
// catégorisation majoritaire pour la forme d'exercice demandée. Le résultat est
// mémorisé (table inpi_categorisations) : chaque code n'est appris qu'une fois.
// Lectures RNE limitées (file unique de inpi-rne.js), jamais en rafale.

const rne = require('./inpi-rne');
const { getSupabaseAdmin } = require('./db');

// Vocabulaire RNE → valeurs attendues par le Guichet unique (enum formeExercice)
const FORME_RNE_VERS_GU = {
  COMMERCIALE: 'COMMERCIALE', ARTISANALE: 'ARTISANALE', ARTISANALE_REGLEMENTEE: 'ARTISANALE_REGLEMENTEE',
  LIBERALE_NON_REGLEMENTEE: 'INDEPENDANTE', INDEPENDANTE: 'INDEPENDANTE', LIBERALE_REGLEMENTEE: 'LIBERALE_REGLEMENTEE',
  AGENT_COMMERCIAL: 'AGENT_COMMERCIAL', GESTION_DE_BIENS: 'GESTION_DE_BIENS', AGRICOLE_NON_ACTIF: 'AGRICOLE_NON_ACTIF',
  ACTIF_AGRICOLE: 'ACTIF_AGRICOLE',
};

// Relevés vérifiés (formalités acceptées : liasses validées du cabinet et fiches RNE).
// Clé : APE, ou APE|FORME quand la catégorisation dépend de la forme d'exercice.
const VERIFIES = {
  '1089Z': ['07', '02', '08', '', '99'],
  '4322A': ['05', '04', '19', '', '14'], '4399C': ['05', '04', '15', '', '14'],
  '4511Z': ['06', '01', '', '', '99'], '4520A': ['06', '01', '', '', '99'],
  '4643Z': ['06', '02', '02', '', '09'], '4649Z': ['06', '02', '02', '', '09'], '4651Z': ['06', '02', '02', '', '09'],
  '4669B': ['06', '02', '02', '', '09'], '4669C': ['06', '02', '02', '', '09'], '4690Z': ['06', '02', '02', '', '09'],
  '4711B': ['06', '03', '01', '', '10'], '4724Z': ['06', '03', '01', '', '10'], '4742Z': ['06', '03', '01', '', '10'],
  '4752A': ['06', '02', '02', '', '09'], '4778C': ['06', '03', '01', '', '10'], '4777Z': ['06', '03', '01', '', '10'],
  '4791A': ['06', '05', '', '', '99'], '4791B': ['06', '05', '', '', '99'],
  '4781Z': ['06', '04', '01', '', '16'], '4782Z': ['06', '04', '01', '', '16'], '4789Z': ['06', '04', '01', '', '16'],
  '4941A': ['07', '01', '11', '', '99'], '4941B': ['07', '01', '04', '01', '99'],
  '5610A': ['07', '02', '03', '01', '99'], '5610C': ['07', '02', '03', '01', '99'],
  '6201Z': ['02', '08', '09', '02', '04'],
  '6820B': ['07', '06', '01', '01', '20'],
  '7112B': ['07', '04', '08', '01', '99'],
  '7022Z|COMMERCIALE': ['07', '04', '08', '01', '99'],
  '7022Z|INDEPENDANTE': ['07', '04', '08', '02', ''],
  '8010Z': ['07', '09', '07', '', '99'],
};

const norm = (ape) => String(ape || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
const avecPoint = (ape) => `${ape.slice(0, 2)}.${ape.slice(2)}`;
const tuple = (a) => [a.categorisationActivite1 || '', a.categorisationActivite2 || '', a.categorisationActivite3 || '', a.categorisationActivite4 || '', a.precisionActivite || ''];

async function memoire(ape, forme) {
  try {
    const { data } = await getSupabaseAdmin().from('inpi_categorisations').select('*').eq('ape', ape).eq('forme', forme || '*').maybeSingle();
    return data || null;
  } catch { return null; }
}

async function memoriser(ape, forme, row) {
  try {
    await getSupabaseAdmin().from('inpi_categorisations').upsert({ ape, forme: forme || '*', ...row, updated_at: new Date().toISOString() }, { onConflict: 'ape,forme' });
  } catch {}
}

// Échantillon : entreprises récentes de l'APE (créées depuis le Guichet unique, 2023)
async function echantillon(ape, ei) {
  const qs = new URLSearchParams({ activite_principale: avecPoint(ape), etat_administratif: 'A', per_page: '25', ...(ei ? { est_entrepreneur_individuel: 'true' } : {}) });
  const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?${qs}`, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) return [];
  const d = await r.json();
  return (d.results || []).filter((x) => (x.date_creation || '') >= '2023-01-01').map((x) => x.siren);
}

// Apprend la catégorisation d'un APE (et la forme d'exercice majoritaire) sur le RNE.
async function apprendre(orgId, ape, ei) {
  const sirens = [...await echantillon(ape, ei), ...(ei ? await echantillon(ape, false) : [])].slice(0, 6);
  const votes = new Map(); // forme → Map(tuple → nb)
  let lues = 0;
  for (const s of sirens) {
    if (lues >= 3) break;
    let c;
    try { c = await rne.getCompany(orgId, s); } catch { continue; }
    lues += 1;
    const b = c?.formality?.content?.personnePhysique || c?.formality?.content?.personneMorale || {};
    const acts = [b.etablissementPrincipal, ...(b.autresEtablissements || [])].filter(Boolean).flatMap((e) => e.activites || []);
    for (const a of acts) {
      if (norm(a.codeApe) !== ape || !a.categorisationActivite1) continue;
      const f = FORME_RNE_VERS_GU[a.formeExercice] || a.formeExercice || '*';
      const k = JSON.stringify(tuple(a));
      if (!votes.has(f)) votes.set(f, new Map());
      votes.get(f).set(k, (votes.get(f).get(k) || 0) + 1);
    }
  }
  const parForme = {};
  for (const [f, m] of votes) {
    const [k, n] = [...m.entries()].sort((x, y) => y[1] - x[1])[0];
    parForme[f] = { codes: JSON.parse(k), nb: n };
  }
  return { parForme, lues };
}

// Renvoie { codes, exacte, formeExercice, source, alerte? } ou null si inconnu.
//   ape : code APE ; forme : forme d'exercice demandée (valeur GU) ; ei : entreprise individuelle.
async function categoriser(orgId, codeApe, forme, { ei = false } = {}) {
  const ape = norm(codeApe);
  if (!ape) return null;
  const f = forme || null;
  const statique = VERIFIES[`${ape}|${f}`] || VERIFIES[ape];
  if (statique) return { codes: statique, exacte: true, formeExercice: f, source: 'verifie' };

  const memoForme = f ? await memoire(ape, f) : null;
  if (memoForme?.codes) {
    // Ligne propre à la forme demandée ; si le Guichet unique l'a déjà requalifiée, on suit sa décision.
    const corrigee = memoForme.source === 'requalification' && memoForme.forme_majoritaire !== f ? memoForme.forme_majoritaire : null;
    return { codes: memoForme.codes, exacte: true, formeExercice: corrigee || f, source: 'appris', alerte: corrigee };
  }
  const memo = await memoire(ape, '*');
  if (memo?.codes) {
    // Forme demandée jamais vue pour ce code : on prend la forme réellement retenue.
    return { codes: memo.codes, exacte: true, formeExercice: memo.forme_majoritaire || f, source: 'appris', alerte: f && memo.forme_majoritaire && memo.forme_majoritaire !== f ? memo.forme_majoritaire : null };
  }

  const { parForme, lues } = await apprendre(orgId, ape, ei);
  const formes = Object.keys(parForme);
  if (!formes.length) return null;
  const majoritaire = formes.sort((x, y) => parForme[y].nb - parForme[x].nb)[0];
  for (const fo of formes) await memoriser(ape, fo, { codes: parForme[fo].codes, forme_majoritaire: majoritaire, echantillons: lues, source: 'rne' });
  await memoriser(ape, '*', { codes: parForme[majoritaire].codes, forme_majoritaire: majoritaire, echantillons: lues, source: 'rne' });
  const choisie = f && parForme[f] ? f : majoritaire;
  return {
    codes: parForme[choisie].codes, exacte: true, formeExercice: choisie, source: 'rne',
    // La forme demandée n'existe pas dans les formalités acceptées : on prend la forme
    // réellement retenue par le Guichet unique pour ce code APE, et on le signale.
    alerte: f && !parForme[f] ? majoritaire : null,
  };
}

// Le Guichet unique a requalifié la forme d'exercice d'une activité : on retient sa décision.
async function corriger(codeApe, envoyee, retenue) {
  const ape = norm(codeApe);
  if (!ape || !envoyee || !retenue) return;
  const ligne = (await memoire(ape, envoyee)) || (await memoire(ape, '*'));
  if (!ligne?.codes) return;
  await memoriser(ape, envoyee, { codes: ligne.codes, forme_majoritaire: retenue, echantillons: ligne.echantillons || 0, source: 'requalification' });
}

// Apprentissage en masse : parcourt les entreprises modifiées au RNE depuis une date
// (/api/companies/diff, 100 par page) et vote, pour chaque (APE, forme d'exercice), la
// catégorisation la plus fréquente. Un appel toutes les `pauseMs` (limites RNE).
async function apprendreEnMasse(orgId, { depuis = '2026-01-01', pages = 30, pauseMs = 20000, log = console.log } = {}) {
  const votes = new Map(); // ape → Map(forme → Map(tuple → nb))
  let apres = null;
  let lues = 0;
  for (let page = 0; page < pages; page++) {
    const token = await rne.rneToken(orgId);
    const url = `https://registre-national-entreprises.inpi.fr/api/companies/diff?from=${depuis}&pageSize=100${apres ? `&searchAfter=${encodeURIComponent(apres)}` : ''}`;
    let r;
    try {
      r = await rne.viaFileRne(() => fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(120000) }));
    } catch (e) { log(`page ${page} : RNE indisponible (${e.message}), arrêt`); break; }
    if (!r.ok) { log(`page ${page} : HTTP ${r.status}, arrêt`); break; }
    apres = r.headers.get('pagination-search-after');
    const items = await r.json();
    for (const it of items) {
      const c = it.company || it;
      const b = c.formality?.content?.personneMorale || c.formality?.content?.personnePhysique || {};
      const apeSociete = norm(b.identite?.entreprise?.codeApe);
      for (const e of [b.etablissementPrincipal, ...(b.autresEtablissements || [])].filter(Boolean)) {
        for (const a of e.activites || []) {
          if (!a.categorisationActivite1) continue;
          const ape = norm(a.codeApe) || apeSociete;
          if (!ape) continue;
          const f = FORME_RNE_VERS_GU[a.formeExercice] || a.formeExercice || '*';
          const k = JSON.stringify(tuple(a));
          if (!votes.has(ape)) votes.set(ape, new Map());
          const vf = votes.get(ape);
          if (!vf.has(f)) vf.set(f, new Map());
          vf.get(f).set(k, (vf.get(f).get(k) || 0) + 1);
        }
      }
    }
    lues += items.length;
    log(`page ${page + 1}/${pages} : ${items.length} entreprises, ${votes.size} codes APE vus`);
    if (!apres || items.length < 100) break;
    await new Promise((ok) => setTimeout(ok, pauseMs));
  }
  // Enregistrement (sans écraser une décision issue d'une requalification du Guichet unique)
  const supa = getSupabaseAdmin();
  const { data: proteges } = await supa.from('inpi_categorisations').select('ape, forme').eq('source', 'requalification');
  const garde = new Set((proteges || []).map((x) => `${x.ape}|${x.forme}`));
  let ecrites = 0;
  for (const [ape, vf] of votes) {
    const parForme = {};
    for (const [f, m] of vf) {
      const [k, n] = [...m.entries()].sort((x, y) => y[1] - x[1])[0];
      parForme[f] = { codes: JSON.parse(k), nb: [...m.values()].reduce((s, x) => s + x, 0) };
    }
    const majoritaire = Object.keys(parForme).sort((x, y) => parForme[y].nb - parForme[x].nb)[0];
    const lignes = [...Object.entries(parForme).map(([f, v]) => [f, v]), ['*', parForme[majoritaire]]];
    for (const [f, v] of lignes) {
      if (garde.has(`${ape}|${f}`)) continue;
      await memoriser(ape, f, { codes: v.codes, forme_majoritaire: majoritaire, echantillons: v.nb, source: 'rne-masse' });
      ecrites += 1;
    }
  }
  log(`terminé : ${lues} entreprises lues, ${votes.size} codes APE, ${ecrites} lignes enregistrées`);
  return { lues, codes: votes.size, ecrites };
}

module.exports = { categoriser, corriger, apprendreEnMasse, FORME_RNE_VERS_GU, VERIFIES };
