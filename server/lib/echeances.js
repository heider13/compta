// Échéances de la semaine (vue « Aujourd'hui ») : chaque lundi matin, et à la demande du cabinet,
// Legaly prépare des PROPOSITIONS (table propositions) — comptes annuels à approuver puis déposer,
// échéances internes des dossiers. Le cabinet les accepte, les ignore ou les marque faites :
// rien n'est lancé sans lui. Une proposition déjà décidée n'est jamais recréée (clé unique).

const { getSupabaseAdmin } = require('./db');
const { echeanceComptes } = require('./groupes');
const rne = require('./inpi-rne');
const rneDocs = require('./rne-documents');

const FORMES_SANS_COMPTES = new Set(['AE', 'EI']);
const HORIZON_COMPTES_J = 60; // l'approbation est proposée 60 jours avant sa date limite
const HORIZON_INTERNE_J = 7;
const RNE_LENT_MS = Number(process.env.RNE_ECHEANCES_MS || 10000);
const RNE_VALIDITE_MS = 7 * 24 * 3600 * 1000;
const STATUTS_FINIS = ['VALIDATED', 'VALIDATED_INTERNAL', 'REJECTED'];

const iso = (d) => d.toISOString().slice(0, 10);
const plusMois = (jour, n) => { const d = new Date(`${jour}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); return iso(d); };
const plusJours = (n) => iso(new Date(Date.now() + n * 86400000));
const joursAvant = (jour) => Math.ceil((new Date(`${jour}T00:00:00Z`).getTime() - Date.now()) / 86400000);
const dateFr = (jour) => new Date(`${jour}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });

// ─── Clôture des clients : lue au RNE en arrière-plan, lentement, mémorisée 7 jours ───
// (l'API RNE coupe l'accès au-delà d'un certain volume : jamais de lecture en masse)
const aVerifier = new Map(); // client id → { orgId, client }
const orgsAPreparer = new Set();
let verificateur = null;

function verifierPlusTard(orgId, client) {
  if (aVerifier.has(client.id)) return;
  aVerifier.set(client.id, { orgId, client });
  orgsAPreparer.add(orgId);
  if (!verificateur) verificateur = setInterval(verifierSuivant, RNE_LENT_MS);
}

async function verifierSuivant() {
  const [id, job] = aVerifier.entries().next().value || [];
  if (!id) {
    clearInterval(verificateur);
    verificateur = null;
    // File vidée : les propositions de comptes peuvent maintenant être préparées
    const orgs = [...orgsAPreparer];
    orgsAPreparer.clear();
    for (const orgId of orgs) await preparer(orgId).catch((e) => console.error('[echeances]', String(e.message).slice(0, 160)));
    return;
  }
  aVerifier.delete(id);
  const { orgId, client } = job;
  let memo;
  try {
    const dates = await rneDocs.bilansDeposes(orgId, client.siren);
    memo = { dernier: dates.pop() || null, verifie_le: new Date().toISOString() };
    if (!memo.dernier) {
      const desc = (await rne.getCompany(orgId, client.siren))?.formality?.content?.personneMorale?.identite?.description;
      memo.ddmm = desc?.dateClotureExerciceSocial || null;
      memo.premiere = desc?.datePremiereCloture || null;
    }
  } catch (err) {
    // RNE indisponible ou accès INPI non configuré : nouvel essai la semaine suivante
    memo = { erreur: String(err.message).slice(0, 160), verifie_le: new Date().toISOString() };
  }
  const supa = getSupabaseAdmin();
  const { data: cur } = await supa.from('clients').select('metadata').eq('id', id).eq('organization_id', orgId).maybeSingle();
  if (cur) await supa.from('clients').update({ metadata: { ...(cur.metadata || {}), comptes_rne: memo } }).eq('id', id);
}

// ─── Propositions ───
function propositionComptes(client, memo) {
  if (!memo || memo.erreur) return null;
  const dernier = memo.dernier || null;
  const ddmm = dernier ? `${dernier.slice(8, 10)}${dernier.slice(5, 7)}` : memo.ddmm || null;
  const ec = echeanceComptes(ddmm, dernier);
  if (!ec?.a_faire) return null;
  if (memo.premiere && memo.premiere > ec.cloture) return null; // premier exercice pas encore clos
  const approbation = plusMois(ec.cloture, 6);
  const j = joursAvant(approbation);
  if (j > HORIZON_COMPTES_J) return null;
  const detail = ec.en_retard
    ? `En retard : le dépôt au greffe était attendu avant le ${dateFr(ec.limite)}.`
    : j >= 0
      ? `Approbation par l'assemblée avant le ${dateFr(approbation)} (dans ${j} jour${j > 1 ? 's' : ''}), puis dépôt au greffe dans le mois (deux mois en ligne), au plus tard le ${dateFr(ec.limite)}.`
      : `Délai d'approbation passé (${dateFr(approbation)}) : si l'assemblée s'est tenue, déposer les comptes au plus tard le ${dateFr(ec.limite)} ; sinon, demander une prorogation au tribunal.`;
  return {
    cle: `comptes:${client.id}:${ec.cloture}`,
    type: 'comptes_annuels',
    titre: `Comptes de l'exercice clos le ${dateFr(ec.cloture)} — ${client.denomination}`,
    detail,
    echeance: ec.en_retard || j < 0 ? ec.limite : approbation,
    client_id: client.id,
    demande_agent: `Prépare l'approbation et le dépôt des comptes annuels de ${client.denomination} (SIREN ${client.siren}) pour l'exercice clos le ${dateFr(ec.cloture)} : lis la fiche RNE, dis-moi les pièces à réunir (comptes, PV d'approbation, affectation du résultat) et prépare le PV d'approbation. Ne crée aucun brouillon au Guichet unique sans ma confirmation.`,
  };
}

function propositionInterne(d) {
  return {
    cle: `interne:${d.id}:${d.internal_due_date}`,
    type: 'echeance_interne',
    titre: `Échéance interne — ${d.client_name}${d.reference ? ` (${d.reference})` : ''}`,
    detail: joursAvant(d.internal_due_date) < 0
      ? `Échéance dépassée depuis le ${dateFr(d.internal_due_date)} : dossier toujours en cours.`
      : `Dossier à terminer avant le ${dateFr(d.internal_due_date)}.`,
    echeance: d.internal_due_date,
    dossier_id: d.id,
    demande_agent: null,
  };
}

// Prépare les propositions d'un cabinet. Les clôtures inconnues sont mises en file (RNE lent) :
// les propositions correspondantes arrivent quand la file est vidée.
async function preparer(orgId) {
  const supa = getSupabaseAdmin();
  const [{ data: clients }, { data: dossiers }] = await Promise.all([
    supa.from('clients').select('id, siren, denomination, forme_juridique, metadata')
      .eq('organization_id', orgId).is('archived_at', null).not('siren', 'is', null).limit(500),
    supa.from('dossiers').select('id, reference, client_name, internal_due_date, statut, tags')
      .eq('organization_id', orgId).not('internal_due_date', 'is', null)
      .lte('internal_due_date', plusJours(HORIZON_INTERNE_J)).gte('internal_due_date', plusJours(-30)).limit(200),
  ]);
  const propositions = [];
  let enAttente = 0;
  for (const c of clients || []) {
    if (!/^\d{9}$/.test(c.siren || '') || FORMES_SANS_COMPTES.has(c.forme_juridique)) continue;
    const memo = c.metadata?.comptes_rne;
    if (!memo || Date.now() - new Date(memo.verifie_le).getTime() > RNE_VALIDITE_MS) {
      verifierPlusTard(orgId, c);
      enAttente += 1;
    }
    const p = propositionComptes(c, memo);
    if (p) propositions.push(p);
  }
  for (const d of dossiers || []) {
    if (STATUTS_FINIS.includes(d.statut) || (d.tags || []).includes('archived')) continue;
    propositions.push(propositionInterne(d));
  }
  let creees = 0;
  if (propositions.length) {
    const { data, error } = await supa.from('propositions')
      .upsert(propositions.map((p) => ({ ...p, organization_id: orgId })), { onConflict: 'organization_id,cle', ignoreDuplicates: true })
      .select('id');
    if (error) throw new Error(`Propositions indisponibles : ${error.message}`);
    creees = data?.length || 0;
  }
  return { creees, verifications_en_attente: enAttente };
}

// Chaque lundi à partir de 7 h (heure de Paris), une fois par semaine et par démarrage.
let derniereSemaine = null;
function semaineParis() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { lundi: p.weekday === 'Mon', heure: Number(p.hour), jour: `${p.year}-${p.month}-${p.day}` };
}
async function tourHebdomadaire() {
  const s = semaineParis();
  if (!s.lundi || s.heure < 7 || derniereSemaine === s.jour) return;
  derniereSemaine = s.jour;
  const { data: orgs } = await getSupabaseAdmin().from('organizations').select('id');
  for (const o of orgs || []) {
    try {
      const r = await preparer(o.id);
      if (r.creees || r.verifications_en_attente) console.log(`[echeances] ${o.id} : ${r.creees} proposition(s), ${r.verifications_en_attente} clôture(s) à vérifier`);
    } catch (e) {
      console.error('[echeances]', o.id, String(e.message).slice(0, 160));
    }
  }
}
function planifier() {
  setInterval(() => tourHebdomadaire().catch((e) => console.error('[echeances]', e.message)), 30 * 60 * 1000);
}

module.exports = { preparer, planifier, _interne: { propositionComptes, propositionInterne, semaineParis } };
