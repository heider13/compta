// Groupes de sociétés : holding, filiales, sous-filiales.
//
// Découverte automatique à partir d'un SIREN, via l'Annuaire des entreprises
// (recherche-entreprises.api.gouv.fr, données RNE + SIRENE, gratuit) :
//   - vers le bas : sociétés dont l'entité est dirigeante (personne morale) ;
//   - vers le haut : dirigeants personnes morales de la tête (société mère possible).
// Le RNE ne publie pas les pourcentages de détention : ils sont saisis par le
// cabinet ou relevés par l'agent dans les statuts / PV / comptes, et les liens
// découverts sont marqués « à vérifier ».

const { getSupabaseAdmin } = require('./db');
const inpi = require('../inpi');
const rne = require('./inpi-rne');
const rneDocs = require('./rne-documents');

const ANNUAIRE = 'https://recherche-entreprises.api.gouv.fr/search';
const MAX_ENTITES = 60;
const PROFONDEUR = 3;

const FORMES = {
  5499: 'SARL', 5498: 'EURL', 5710: 'SAS', 5720: 'SASU', 5599: 'SA', 5505: 'SA', 5510: 'SA', 5699: 'SA',
  6540: 'SCI', 6599: 'Société civile', 6589: 'Société civile', 5202: 'SNC', 5306: 'SCS', 5308: 'SCA',
  5485: 'SELARL', 5785: 'SELAS', 6560: 'SCP', 9220: 'Association', 1000: 'Entreprise individuelle',
  5800: 'SE', 6220: 'GIE', 5520: 'SA', 5530: 'SA', 5531: 'SA', 5532: 'SA', 5560: 'SA', 5585: 'SELAFA', 5385: 'SELCA',
  5458: 'SARL', 5460: 'SARL', 5785: 'SELAS', 6534: 'SCI', 6541: 'SCI', 6542: 'SCI', 6543: 'SCI', 6544: 'SCI', 6551: 'SCI', 6554: 'Société civile', 6585: 'Société civile', 6588: 'Société civile', 2110: 'Indivision', 2120: 'Société créée de fait', 3120: 'Société étrangère',
};
const forme = (code) => FORMES[code] || (code ? `Forme ${code}` : null);

const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));
const cache = new Map(); // requête → { exp, data }

async function annuaire(params) {
  const qs = new URLSearchParams({ per_page: '25', ...params }).toString();
  const hit = cache.get(qs);
  if (hit && hit.exp > Date.now()) return hit.data;
  for (let essai = 0; essai < 3; essai++) {
    const r = await fetch(`${ANNUAIRE}?${qs}`, { headers: { Accept: 'application/json' } });
    if (r.status === 429) { await pause(1200 * (essai + 1)); continue; }
    if (!r.ok) throw new Error(`Annuaire des entreprises : erreur ${r.status}`);
    const data = await r.json();
    cache.set(qs, { exp: Date.now() + 30 * 60 * 1000, data });
    await pause(160); // ≤ 7 requêtes / seconde
    return data;
  }
  throw new Error('Annuaire des entreprises momentanément indisponible (trop de requêtes).');
}

function versEntite(r) {
  return {
    siren: r.siren,
    denomination: r.nom_raison_sociale || r.nom_complet,
    forme: forme(r.nature_juridique),
    ville: r.siege?.libelle_commune || null,
    active: r.etat_administratif !== 'C',
    dirigeantsPM: (r.dirigeants || [])
      .filter((d) => d.type_dirigeant === 'personne morale' && /^\d{9}$/.test(d.siren || ''))
      .map((d) => ({ siren: d.siren, denomination: d.denomination, qualite: d.qualite || null })),
  };
}

async function fiche(siren) {
  const d = await annuaire({ q: siren });
  const r = (d.results || []).find((x) => x.siren === siren);
  return r ? versEntite(r) : null;
}

// Sociétés dont `e` est dirigeante : recherche textuelle sur sa dénomination,
// puis filtre strict sur le SIREN du dirigeant personne morale.
async function filialesDirigees(e, pages = 4) {
  const out = [];
  for (let page = 1; page <= pages; page++) {
    const d = await annuaire({ q: e.denomination, page: String(page) });
    for (const r of d.results || []) {
      if (r.siren === e.siren) continue;
      const lien = (r.dirigeants || []).find((x) => x.type_dirigeant === 'personne morale' && x.siren === e.siren);
      if (lien) out.push({ entite: versEntite(r), qualite: lien.qualite || null });
    }
    if (page >= (d.total_pages || 1)) break;
  }
  return out;
}

// Découverte depuis un SIREN : tête + descendants dirigés (largeur d'abord).
async function decouvrir(siren, { profondeur = PROFONDEUR, max = MAX_ENTITES } = {}) {
  const tete = await fiche(siren);
  if (!tete) throw Object.assign(new Error(`SIREN ${siren} introuvable dans l'annuaire des entreprises.`), { status: 404 });
  const entites = new Map([[tete.siren, { ...tete, niveau: 0 }]]);
  const liens = [];
  let file = [tete];
  for (let niveau = 1; niveau <= profondeur && file.length && entites.size < max; niveau++) {
    const suivante = [];
    for (const parent of file) {
      if (entites.size >= max) break;
      for (const { entite, qualite } of await filialesDirigees(parent)) {
        if (!liens.some((l) => l.parent === parent.siren && l.enfant === entite.siren)) liens.push({ parent: parent.siren, enfant: entite.siren, direction: qualite });
        if (!entites.has(entite.siren) && entites.size < max) {
          entites.set(entite.siren, { ...entite, niveau });
          suivante.push(entite);
        }
      }
    }
    file = suivante;
  }
  // Société mère possible : dirigeant personne morale de la tête (hors commissaires aux comptes)
  const meres = tete.dirigeantsPM.filter((d) => !/commissaire|CAC/i.test(d.qualite || ''));
  return { tete, entites: [...entites.values()], liens, meres, tronque: entites.size >= max };
}

// ─── Calculs sur l'arbre ───────────────────────────────────────────

// Détention indirecte de chaque entité par la tête : somme sur les chemins du
// produit des pourcentages (liens sans pourcentage ignorés).
function detentions(entites, liens) {
  const tetes = entites.filter((e) => e.tete).map((e) => e.id);
  const enfants = new Map();
  for (const l of liens) {
    if (!enfants.has(l.parent_id)) enfants.set(l.parent_id, []);
    enfants.get(l.parent_id).push(l);
  }
  const res = new Map(tetes.map((id) => [id, 100]));
  const visiter = (id, part, chemin) => {
    for (const l of enfants.get(id) || []) {
      if (chemin.has(l.enfant_id) || l.pourcentage == null) continue;
      const p = (part * Number(l.pourcentage)) / 100;
      res.set(l.enfant_id, (res.get(l.enfant_id) || 0) + p);
      visiter(l.enfant_id, p, new Set([...chemin, l.enfant_id]));
    }
  };
  for (const t of tetes) visiter(t, 100, new Set([t]));
  return res;
}

// Points d'attention juridiques et fiscaux déduits des liens.
function controles(entites, liens) {
  const parId = new Map(entites.map((e) => [e.id, e]));
  const nom = (id) => parId.get(id)?.denomination || '?';
  const out = [];
  const indir = detentions(entites, liens);
  for (const l of liens) {
    const p = l.pourcentage == null ? null : Number(l.pourcentage);
    if (p == null) {
      out.push({ niveau: 'info', entite_id: l.enfant_id, texte: `Pourcentage de détention de ${nom(l.enfant_id)} par ${nom(l.parent_id)} non renseigné${l.direction ? ` (lien connu : ${l.direction})` : ''}.` });
      continue;
    }
    if (p >= 25) out.push({ niveau: 'attention', entite_id: l.enfant_id, texte: `${nom(l.parent_id)} détient ${p} % de ${nom(l.enfant_id)} : les bénéficiaires effectifs de ${nom(l.enfant_id)} doivent inclure les personnes physiques qui contrôlent ${nom(l.parent_id)} (détention indirecte).` });
    if (p >= 95) out.push({ niveau: 'info', entite_id: l.enfant_id, texte: `${p} % : ${nom(l.enfant_id)} peut entrer dans le périmètre d'intégration fiscale de ${nom(l.parent_id)} (seuil 95 %).` });
    else if (p >= 5) out.push({ niveau: 'info', entite_id: l.enfant_id, texte: `${p} % : régime mère-fille possible pour les dividendes versés par ${nom(l.enfant_id)} à ${nom(l.parent_id)} (seuil 5 %, titres conservés 2 ans).` });
    if (p > 50) out.push({ niveau: 'info', entite_id: l.enfant_id, texte: `${nom(l.enfant_id)} est contrôlée par ${nom(l.parent_id)} : société d'un groupe, la confidentialité du compte de résultat lui est fermée ; vérifier l'obligation de comptes consolidés selon la taille du groupe.` });
  }
  const totalParEnfant = new Map();
  for (const l of liens) if (l.pourcentage != null) totalParEnfant.set(l.enfant_id, (totalParEnfant.get(l.enfant_id) || 0) + Number(l.pourcentage));
  for (const [id, t] of totalParEnfant) if (t > 100.0001) out.push({ niveau: 'erreur', entite_id: id, texte: `Détention totale de ${nom(id)} supérieure à 100 % (${Math.round(t * 100) / 100} %) : à corriger.` });
  for (const e of entites) if (!e.active) out.push({ niveau: 'attention', entite_id: e.id, texte: `${e.denomination} est radiée ou cessée : à retirer de l'arbre si elle ne fait plus partie du groupe.` });
  return { controles: out, detentions: Object.fromEntries([...indir].map(([k, v]) => [k, Math.round(v * 100) / 100])) };
}

// ─── Base de données ───────────────────────────────────────────────

async function lister(orgId) {
  const supa = getSupabaseAdmin();
  const { data: groupes, error } = await supa.from('groupes').select('id, nom, client_id, created_at, updated_at, metadata').eq('organization_id', orgId).order('nom');
  if (error) throw new Error(error.message);
  if (!groupes?.length) return [];
  const { data: ents } = await supa.from('groupe_entites').select('groupe_id, denomination, tete').eq('organization_id', orgId).in('groupe_id', groupes.map((g) => g.id));
  return groupes.map((g) => {
    const e = (ents || []).filter((x) => x.groupe_id === g.id);
    return { ...g, nb_entites: e.length, tete: e.find((x) => x.tete)?.denomination || null };
  });
}

async function charger(orgId, groupeId) {
  const supa = getSupabaseAdmin();
  const { data: groupe } = await supa.from('groupes').select('*').eq('id', groupeId).eq('organization_id', orgId).maybeSingle();
  if (!groupe) throw Object.assign(new Error('Groupe introuvable.'), { status: 404 });
  const [{ data: entites }, { data: liens }] = await Promise.all([
    supa.from('groupe_entites').select('*').eq('groupe_id', groupeId).order('tete', { ascending: false }).order('denomination'),
    supa.from('groupe_liens').select('*').eq('groupe_id', groupeId).order('created_at').order('id'),
  ]);
  return { groupe, entites: entites || [], liens: liens || [] };
}

async function detail(orgId, groupeId) {
  const g = await charger(orgId, groupeId);
  return { ...g, ...controles(g.entites, g.liens) };
}

async function toucher(groupeId) {
  await getSupabaseAdmin().from('groupes').update({ updated_at: new Date().toISOString() }).eq('id', groupeId);
}

// Insère les entités / liens découverts (sans doublon) dans un groupe.
async function fusionner(orgId, groupeId, dec) {
  const supa = getSupabaseAdmin();
  const { data: existantes } = await supa.from('groupe_entites').select('id, siren').eq('groupe_id', groupeId);
  const ids = new Map((existantes || []).filter((e) => e.siren).map((e) => [e.siren, e.id]));
  const nouvelles = dec.entites.filter((e) => !ids.has(e.siren)).map((e) => ({
    groupe_id: groupeId, organization_id: orgId, siren: e.siren, denomination: e.denomination, forme: e.forme,
    ville: e.ville, active: e.active, tete: e.niveau === 0 && !(existantes || []).length, source: 'rne',
    a_verifier: e.niveau > 0, metadata: { niveau: e.niveau },
  }));
  if (nouvelles.length) {
    const { data, error } = await supa.from('groupe_entites').insert(nouvelles).select('id, siren, active, metadata');
    if (error) throw new Error(error.message);
    for (const e of data) {
      ids.set(e.siren, e.id);
      verifierPlusTard(orgId, e); // comptes déposés au RNE, lus en arrière-plan
    }
  }
  const { data: liensExistants } = await supa.from('groupe_liens').select('parent_id, enfant_id').eq('groupe_id', groupeId);
  const deja = new Set((liensExistants || []).map((l) => `${l.parent_id}>${l.enfant_id}`));
  const nouveauxLiens = dec.liens
    .map((l) => ({ parent_id: ids.get(l.parent), enfant_id: ids.get(l.enfant), direction: l.direction }))
    .filter((l) => l.parent_id && l.enfant_id && !deja.has(`${l.parent_id}>${l.enfant_id}`))
    .map((l) => ({ ...l, groupe_id: groupeId, organization_id: orgId, source: 'rne', a_verifier: true }));
  if (nouveauxLiens.length) {
    const { error } = await supa.from('groupe_liens').insert(nouveauxLiens);
    if (error) throw new Error(error.message);
  }
  await toucher(groupeId);
  return { entites_ajoutees: nouvelles.length, liens_ajoutes: nouveauxLiens.length };
}

async function creer(orgId, userId, { siren, nom, clientId }) {
  if (!/^\d{9}$/.test(String(siren || ''))) throw Object.assign(new Error('SIREN de la tête de groupe invalide (9 chiffres).'), { status: 400 });
  const supa = getSupabaseAdmin();
  const { data: doublon } = await supa.from('groupe_entites').select('groupe_id').eq('organization_id', orgId).eq('siren', siren).eq('tete', true).limit(1).maybeSingle();
  if (doublon) throw Object.assign(new Error('Un groupe existe déjà avec cette société en tête.'), { status: 409, groupe_id: doublon.groupe_id });
  const dec = await decouvrir(siren);
  const { data: groupe, error } = await supa.from('groupes').insert({
    organization_id: orgId, nom: nom || `Groupe ${dec.tete.denomination}`, client_id: clientId || null, created_by: userId,
    metadata: { decouvert_le: new Date().toISOString(), meres_possibles: dec.meres, tronque: dec.tronque },
  }).select().single();
  if (error) throw new Error(error.message);
  const r = await fusionner(orgId, groupe.id, dec);
  return { groupe, ...r, meres_possibles: dec.meres, tronque: dec.tronque };
}

// Relance la découverte depuis une entité du groupe (nouvelles filiales).
async function redecouvrir(orgId, groupeId, siren) {
  const { entites } = await charger(orgId, groupeId);
  const cible = siren || entites.find((e) => e.tete)?.siren;
  if (!cible) throw Object.assign(new Error('Aucune société de départ (SIREN) dans ce groupe.'), { status: 400 });
  return fusionner(orgId, groupeId, await decouvrir(cible));
}

async function ajouterEntite(orgId, groupeId, { siren, denomination, forme: f, parentId, pourcentage, direction, source = 'manuel' }) {
  await charger(orgId, groupeId);
  const supa = getSupabaseAdmin();
  let e = { siren: siren || null, denomination, forme: f || null, ville: null, active: true };
  if (siren) {
    if (!/^\d{9}$/.test(siren)) throw Object.assign(new Error('SIREN invalide (9 chiffres).'), { status: 400 });
    const fi = await fiche(siren).catch(() => null);
    if (fi) e = { ...e, denomination: fi.denomination, forme: fi.forme, ville: fi.ville, active: fi.active };
  }
  if (!e.denomination) throw Object.assign(new Error('Dénomination ou SIREN requis.'), { status: 400 });
  let entite;
  const { data: existante } = siren ? await supa.from('groupe_entites').select('*').eq('groupe_id', groupeId).eq('siren', siren).maybeSingle() : { data: null };
  if (existante) entite = existante;
  else {
    const { data, error } = await supa.from('groupe_entites').insert({ groupe_id: groupeId, organization_id: orgId, ...e, source }).select().single();
    if (error) throw new Error(error.message);
    entite = data;
  }
  if (parentId) await enregistrerLien(orgId, groupeId, { parentId, enfantId: entite.id, pourcentage, direction, source });
  await toucher(groupeId);
  return entite;
}

async function enregistrerLien(orgId, groupeId, { parentId, enfantId, pourcentage, droitsVote, direction, source = 'manuel' }) {
  const { entites } = await charger(orgId, groupeId);
  const ids = new Set(entites.map((e) => e.id));
  if (!ids.has(parentId) || !ids.has(enfantId)) throw Object.assign(new Error('Société inconnue dans ce groupe.'), { status: 400 });
  if (parentId === enfantId) throw Object.assign(new Error('Une société ne peut pas se détenir elle-même.'), { status: 400 });
  const num = (v) => (v === '' || v == null ? null : Math.max(0, Math.min(100, Number(String(v).replace(',', '.')))));
  const supa = getSupabaseAdmin();
  const patch = {
    groupe_id: groupeId, organization_id: orgId, parent_id: parentId, enfant_id: enfantId, source, a_verifier: false,
    ...(pourcentage !== undefined ? { pourcentage: num(pourcentage) } : {}),
    ...(droitsVote !== undefined ? { droits_vote: num(droitsVote) } : {}),
    ...(direction !== undefined ? { direction: direction || null } : {}),
  };
  const { data, error } = await supa.from('groupe_liens').upsert(patch, { onConflict: 'parent_id,enfant_id' }).select().single();
  if (error) throw new Error(error.message);
  await supa.from('groupe_entites').update({ a_verifier: false }).eq('id', enfantId);
  await toucher(groupeId);
  return data;
}

async function supprimerLien(orgId, groupeId, lienId) {
  await charger(orgId, groupeId);
  await getSupabaseAdmin().from('groupe_liens').delete().eq('id', lienId).eq('groupe_id', groupeId);
  await toucher(groupeId);
}

async function supprimerEntite(orgId, groupeId, entiteId) {
  const { entites } = await charger(orgId, groupeId);
  const e = entites.find((x) => x.id === entiteId);
  if (!e) throw Object.assign(new Error('Société introuvable dans ce groupe.'), { status: 404 });
  if (e.tete && entites.filter((x) => x.tete).length === 1) throw Object.assign(new Error('Impossible de retirer la tête du groupe.'), { status: 400 });
  await getSupabaseAdmin().from('groupe_entites').delete().eq('id', entiteId);
  await toucher(groupeId);
}

async function renommer(orgId, groupeId, { nom, clientId }) {
  await charger(orgId, groupeId);
  const patch = { updated_at: new Date().toISOString() };
  if (nom) patch.nom = String(nom).slice(0, 200);
  if (clientId !== undefined) patch.client_id = clientId || null;
  await getSupabaseAdmin().from('groupes').update(patch).eq('id', groupeId);
}

async function supprimer(orgId, groupeId) {
  await charger(orgId, groupeId);
  await getSupabaseAdmin().from('groupes').delete().eq('id', groupeId);
}

// ─── Suivi consolidé (formalités, comptes, dossiers) ───────────────

const ACTIFS = ['DRAFT', 'RECEIVED', 'SIGNATURE_PENDING', 'SIGNED', 'PAYMENT_PENDING', 'PAID', 'VALIDATION_PENDING', 'AMENDMENT_PENDING', 'AMENDMENT_SIGNATURE_PENDING', 'AMENDMENT_PAYMENT_PENDING'];

// Prochaine échéance de dépôt des comptes : clôture + 7 mois (6 pour approuver, 1 pour déposer ; 2 en ligne).
function echeanceComptes(clotureDDMM, dernierExerciceDepose) {
  if (!/^\d{4}$/.test(clotureDDMM || '')) return null;
  const jj = Number(clotureDDMM.slice(0, 2));
  const mm = Number(clotureDDMM.slice(2, 4));
  const now = new Date();
  // Dernière clôture passée non déposée
  for (let an = now.getFullYear(); an >= now.getFullYear() - 2; an--) {
    const cloture = new Date(Date.UTC(an, mm - 1, jj));
    if (cloture > now) continue;
    if (dernierExerciceDepose && dernierExerciceDepose >= cloture.toISOString().slice(0, 10)) {
      const prochaine = new Date(Date.UTC(an + 1, mm - 1, jj));
      const lim = new Date(prochaine); lim.setUTCMonth(lim.getUTCMonth() + 8);
      return { cloture: prochaine.toISOString().slice(0, 10), limite: lim.toISOString().slice(0, 10), en_retard: false, a_faire: false };
    }
    const lim = new Date(cloture); lim.setUTCMonth(lim.getUTCMonth() + 8);
    return { cloture: cloture.toISOString().slice(0, 10), limite: lim.toISOString().slice(0, 10), en_retard: now > lim, a_faire: true };
  }
  return null;
}

const cacheSuivi = new Map(); // org|siren → { exp, data }

// File de vérification RNE en arrière-plan : une société toutes les RNE_LENT_MS.
const RNE_LENT_MS = Number(process.env.RNE_GROUPES_MS || 10000);
const aVerifier = new Map(); // entité id → { orgId, e }
let verificateur = null;
function verifierPlusTard(orgId, e) {
  if (!e.siren || !e.active || aVerifier.has(e.id)) return;
  aVerifier.set(e.id, { orgId, e });
  if (!verificateur) verificateur = setInterval(verifierSuivante, RNE_LENT_MS);
}
async function verifierSuivante() {
  const [id, job] = aVerifier.entries().next().value || [];
  if (!id) { clearInterval(verificateur); verificateur = null; return; }
  aVerifier.delete(id);
  const { orgId, e } = job;
  try {
    const dates = await rneDocs.bilansDeposes(orgId, e.siren);
    const memo = { dernier: dates.pop() || null, verifie_le: new Date().toISOString() };
    if (!memo.dernier) {
      const desc = (await rne.getCompany(orgId, e.siren))?.formality?.content?.personneMorale?.identite?.description;
      memo.ddmm = desc?.dateClotureExerciceSocial || null;
      memo.premiere = desc?.datePremiereCloture || null;
    }
    const supa = getSupabaseAdmin();
    const { data: cur } = await supa.from('groupe_entites').select('metadata').eq('id', id).maybeSingle();
    if (cur) await supa.from('groupe_entites').update({ metadata: { ...(cur.metadata || {}), comptes_rne: memo } }).eq('id', id);
    cacheSuivi.delete(`${orgId}|${e.siren}`);
  } catch (err) {
    // RNE indisponible : on réessaiera au prochain affichage du suivi
    console.error('[groupes] vérification RNE', e.siren, String(err.message).slice(0, 120));
  }
}

async function suiviEntite(orgId, client, e) {
  const out = { entite_id: e.id, siren: e.siren, formalites_en_cours: [], comptes: null, echeance_comptes: null, dossiers: [] };
  if (!e.siren) return out;
  const cle = `${orgId}|${e.siren}`;
  const hit = cacheSuivi.get(cle);
  if (hit && hit.exp > Date.now()) return { ...hit.data, entite_id: e.id };
  const supa = getSupabaseAdmin();
  const [forms, comptes, dossiers] = await Promise.all([
    client.listFormalities({ siren: e.siren, itemsPerPage: 30, 'order[created]': 'desc' }).catch(() => null),
    client.request('/api/annual_accounts', { query: { siren: e.siren, itemsPerPage: 5, 'order[created]': 'desc' } }).catch(() => null),
    supa.from('dossiers').select('id, reference, statut, type_formalite, created_at').eq('organization_id', orgId).eq('siren', e.siren).order('created_at', { ascending: false }).limit(5),
  ]);
  out.formalites_en_cours = (forms?.['hydra:member'] || []).filter((f) => ACTIFS.includes(f.status))
    .map((f) => ({ id: f.id, liasse: f.liasseNumber, type: f.typeFormalite, statut: f.status }));
  const ca = comptes?.['hydra:member'] || [];
  const valide = ca.find((a) => a.status === 'VALIDATED');
  out.comptes = ca[0] ? { id: ca[0].id, statut: ca[0].status, annee: ca[0].year, dernier_valide: valide ? valide.year : null } : null;
  out.dossiers = dossiers.data || [];
  if (!e.active) return out; // société cessée : pas d'échéance

  // Derniers comptes déposés au RNE (tous déposants, confidentiels compris) : lus en
  // arrière-plan, lentement (l'API RNE coupe l'accès au-delà d'un certain volume),
  // et mémorisés 24 h sur l'entité. Ici, aucune lecture RNE : seulement la mémoire.
  const memo = e.metadata?.comptes_rne;
  if (!memo || Date.now() - new Date(memo.verifie_le).getTime() > 24 * 3600 * 1000) verifierPlusTard(orgId, e);
  if (!memo) { out.verification_en_attente = true; return out; }
  const dernierRne = memo.dernier || null;
  const dernierCabinet = valide?.content?.comptesAnnuels?.dateCloture || (valide?.year ? `${valide.year}-12-31` : null);
  const dernier = [dernierRne, dernierCabinet].filter(Boolean).sort().pop() || null;
  out.derniers_comptes_deposes = dernier;
  // Date de clôture : déduite des derniers comptes ; fiche RNE seulement à défaut (API limitée).
  const ddmm = dernier ? `${dernier.slice(8, 10)}${dernier.slice(5, 7)}` : memo.ddmm || null;
  const premiere = dernier ? null : memo.premiere || null;
  out.echeance_comptes = echeanceComptes(ddmm, dernier);
  if (premiere && (!out.echeance_comptes || premiere > out.echeance_comptes.cloture)) {
    out.echeance_comptes = { cloture: premiere, limite: null, en_retard: false, a_faire: false, premier_exercice: true };
  }
  cacheSuivi.set(cle, { exp: Date.now() + 2 * 60 * 1000, data: out });
  return out;
}

async function suivi(orgId, groupeId) {
  const { entites } = await charger(orgId, groupeId);
  const client = inpi.forOrg(orgId);
  const res = [];
  const file = [...entites];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (file.length) {
      const e = file.shift();
      try { res.push(await suiviEntite(orgId, client, e)); } catch (err) { res.push({ entite_id: e.id, siren: e.siren, erreur: String(err.message).slice(0, 200) }); }
    }
  }));
  return res;
}

// Groupe(s) contenant une société, pour l'agent.
async function rechercher(orgId, texte) {
  const supa = getSupabaseAdmin();
  const t = String(texte || '').trim();
  if (/^\d{9}$/.test(t)) {
    const { data } = await supa.from('groupe_entites').select('groupe_id').eq('organization_id', orgId).eq('siren', t);
    return [...new Set((data || []).map((d) => d.groupe_id))];
  }
  const { data: g } = await supa.from('groupes').select('id').eq('organization_id', orgId).ilike('nom', `%${t}%`);
  const { data: e } = await supa.from('groupe_entites').select('groupe_id').eq('organization_id', orgId).ilike('denomination', `%${t}%`);
  return [...new Set([...(g || []).map((x) => x.id), ...(e || []).map((x) => x.groupe_id)])];
}

module.exports = {
  decouvrir, fiche, lister, detail, creer, redecouvrir, ajouterEntite, enregistrerLien, supprimerLien,
  supprimerEntite, renommer, supprimer, suivi, rechercher, controles, detentions,
};
