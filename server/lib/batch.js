// Formalités en lot : plusieurs créations, modifications ou fermetures préparées en
// une fois. Le professionnel colle une liste (texte libre, tableau copié d'Excel,
// CSV) ; l'IA la découpe en formalités, puis l'Agent Formalités prépare chacune
// dans son propre dossier (deux à la fois), jusqu'à l'aperçu INPI — jamais de
// brouillon ni de dépôt sans validation du professionnel.
//
// Pas de table dédiée : un lot = les dossiers portant metadata.batch_id. L'historique
// de chaque conversation est rangé dans le Storage pour la reprendre dans le chat.

const crypto = require('crypto');
const { getAnthropic, MODELS } = require('./ai');
const { getSupabaseAdmin } = require('./db');
const { runAgentTurn } = require('./formality-agent');

const BUCKET = 'dossier-docs';
const MAX_FORMALITES = 30;
const CONCURRENCE = 2;

const TYPES = {
  creation: { label: 'Création', type: 'CREATION' },
  transfert_siege: { label: 'Transfert de siège', type: 'MODIFICATION' },
  changement_dirigeant: { label: 'Changement de dirigeant', type: 'MODIFICATION' },
  modification: { label: 'Modification', type: 'MODIFICATION' },
  mise_en_sommeil: { label: 'Mise en sommeil', type: 'RADIATION' },
  dissolution: { label: 'Dissolution', type: 'MODIFICATION' },
  cloture_liquidation: { label: 'Clôture de liquidation', type: 'RADIATION' },
  cessation_ei: { label: "Cessation d'entreprise individuelle", type: 'RADIATION' },
  autre: { label: 'Autre formalité', type: 'MODIFICATION' },
};

const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    formalites: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string', enum: Object.keys(TYPES) },
          societe: { type: 'string', description: 'Dénomination (ou nom de l’entrepreneur) concernée' },
          siren: { type: 'string', description: '9 chiffres si connu, sinon vide' },
          consigne: { type: 'string', description: "Instruction complète et autonome pour l'agent, reprenant TOUTES les données fournies pour cette formalité (aucune donnée inventée)" },
          manquants: { type: 'array', items: { type: 'string' }, description: 'Informations clés absentes pour cette formalité' },
        },
        required: ['type', 'societe', 'siren', 'consigne', 'manquants'],
      },
    },
    observations: { type: 'string', description: 'Remarques sur la liste (doublons, lignes illisibles…), vide sinon' },
  },
  required: ['formalites', 'observations'],
};

const PLAN_SYSTEM = `Tu prépares un lot de formalités juridiques d'entreprises françaises pour un cabinet. À partir d'une liste fournie par le professionnel (texte libre, tableau copié d'Excel, CSV), tu identifies chaque formalité distincte.

<regles>
- Une entrée par formalité (une société qui change de siège ET de dirigeant = une seule formalité de modification, type le plus représentatif, les deux dans la consigne).
- La consigne doit se suffire à elle-même : type d'opération, société (dénomination, SIREN si connu), toutes les données de la ligne (forme, capital, siège, dirigeant, associés, dates, nouvelle adresse, liquidateur…) et les consignes générales du professionnel qui s'appliquent à tout le lot.
- N'invente aucune donnée. Ce qui manque va dans "manquants".
- Ignore les lignes d'en-tête et les lignes vides. Au-delà de ${MAX_FORMALITES} formalités, garde les ${MAX_FORMALITES} premières et signale-le dans observations.
</regles>`;

async function planifier(texte) {
  const msg = await getAnthropic().messages.create({
    model: MODELS.balanced,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: [{ type: 'text', text: PLAN_SYSTEM, cache_control: { type: 'ephemeral' } }],
    output_config: { format: { type: 'json_schema', schema: PLAN_SCHEMA } },
    messages: [{ role: 'user', content: `LISTE DU PROFESSIONNEL :\n"""\n${String(texte).slice(0, 60000)}\n"""\n\nDécoupe-la en formalités.` }],
  });
  if (msg.stop_reason === 'refusal') throw new Error('Analyse refusée par le modèle.');
  const out = (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const plan = JSON.parse(out);
  plan.formalites = plan.formalites.slice(0, MAX_FORMALITES).map((f) => ({ ...f, label: TYPES[f.type]?.label || f.type }));
  return plan;
}

const CONSIGNE_LOT = `MODE LOT — cette formalité fait partie d'un lot préparé sans échange en direct avec le professionnel.
- Prépare tout ce qui peut l'être : enregistrer_dossier, lecture de la fiche RNE et des documents RNE si la société existe, actes (statuts ou PV, déclarations, pouvoir) et annonce légale.
- Ne pose pas de question : pour une donnée manquante, laisse [À COMPLÉTER : …] dans les actes et continue.
- Tu peux faire l'aperçu INPI (confirme=false), mais NE crée PAS de brouillon (jamais confirme=true) : le professionnel validera le lot.
- Termine par un récapitulatif court : documents produits, informations manquantes, prochaine étape.

FORMALITÉ :
`;

function meta(d) {
  return d.metadata || {};
}

async function majLot(supa, dossierId, patch) {
  const { data: d } = await supa.from('dossiers').select('metadata').eq('id', dossierId).maybeSingle();
  const m = d?.metadata || {};
  await supa.from('dossiers').update({ metadata: { ...m, batch: { ...(m.batch || {}), ...patch } } }).eq('id', dossierId);
}

async function traiter(supa, ctxBase, dossier) {
  const b = meta(dossier).batch || {};
  await majLot(supa, dossier.id, { status: 'en_cours', started_at: new Date().toISOString(), erreur: null });
  const events = [];
  let texte = '';
  try {
    const ctx = { ...ctxBase, dossierId: dossier.id };
    const out = await runAgentTurn({
      history: [],
      input: CONSIGNE_LOT + b.consigne,
      ctx,
      emit: (event, data) => {
        if (event === 'text') texte += data.text;
        if (event === 'tool' && data.status === 'done') events.push({ kind: data.kind, label: data.label, detail: data.detail || null });
      },
    });
    // Historique complet (blocs thinking compris) pour reprendre la conversation dans le chat
    const path = `batch/${dossier.id}/agent.json`;
    await supa.storage.from(BUCKET).upload(path, Buffer.from(JSON.stringify({ messages: out.messages, events, texte })), { contentType: 'application/json', upsert: true });
    const documents = events.filter((e) => e.kind === 'document').length;
    await majLot(supa, dossier.id, {
      status: 'pret',
      finished_at: new Date().toISOString(),
      resume: texte.trim().slice(-1500),
      documents,
      history_path: path,
      usage: out.usage || null,
    });
  } catch (e) {
    console.error('[lot]', dossier.id, e.message);
    await majLot(supa, dossier.id, { status: 'erreur', finished_at: new Date().toISOString(), erreur: String(e.message).slice(0, 300) });
  }
}

// File d'attente en mémoire : CONCURRENCE formalités à la fois, dans l'ordre.
async function executer(ctxBase, dossiers) {
  const supa = getSupabaseAdmin();
  const file = [...dossiers];
  const workers = Array.from({ length: Math.min(CONCURRENCE, file.length) }, async () => {
    while (file.length) await traiter(supa, ctxBase, file.shift());
  });
  await Promise.all(workers);
}

async function lancer({ ctx, label, formalites }) {
  if (!Array.isArray(formalites) || !formalites.length) throw Object.assign(new Error('Aucune formalité à lancer.'), { status: 400 });
  if (formalites.length > MAX_FORMALITES) throw Object.assign(new Error(`${MAX_FORMALITES} formalités maximum par lot.`), { status: 400 });
  const supa = getSupabaseAdmin();
  const batchId = crypto.randomUUID();
  const nom = String(label || '').trim().slice(0, 120) || `Lot du ${new Date().toLocaleDateString('fr-FR')}`;
  const rows = formalites.map((f, i) => {
    const t = TYPES[f.type] || TYPES.autre;
    const siren = String(f.siren || '').replace(/\D/g, '');
    return {
      client_name: String(f.societe || 'Nouveau dossier').toUpperCase().slice(0, 200),
      type_formalite: t.type,
      siren: siren.length === 9 ? siren : null,
      user_id: ctx.userId,
      organization_id: ctx.orgId,
      assigned_to: ctx.userId,
      reference: `CMP-${(Date.now() + i).toString(36).toUpperCase()}`,
      statut: 'DRAFT',
      metadata: {
        created_by_agent: true,
        batch_id: batchId,
        batch: {
          id: batchId, label: nom, index: i, total: formalites.length,
          type: f.type, type_label: t.label, consigne: String(f.consigne || '').slice(0, 6000),
          manquants: Array.isArray(f.manquants) ? f.manquants.slice(0, 20) : [],
          status: 'en_attente', created_at: new Date().toISOString(),
        },
      },
    };
  });
  const { data: dossiers, error } = await supa.from('dossiers').insert(rows).select();
  if (error) throw new Error(`Création des dossiers impossible : ${error.message}`);
  try {
    await supa.from('audit_logs').insert({
      organization_id: ctx.orgId, user_id: ctx.userId, action: 'agent.batch.started',
      resource_type: 'batch', resource_id: null, metadata: { batch_id: batchId, formalites: dossiers.length },
    });
  } catch {}
  // Exécution en arrière-plan : la réponse part tout de suite, le suivi se fait par lecture du lot.
  executer(ctx, dossiers.sort((a, b) => meta(a).batch.index - meta(b).batch.index)).catch((e) => console.error('[lot]', e.message));
  return { batchId, label: nom, total: dossiers.length };
}

function itemDe(d) {
  const b = meta(d).batch || {};
  return {
    dossier_id: d.id, reference: d.reference, societe: d.client_name, siren: d.siren,
    index: b.index, type: b.type, type_label: b.type_label, status: b.status,
    manquants: b.manquants || [], documents: b.documents || 0, resume: b.resume || null,
    erreur: b.erreur || null, started_at: b.started_at || null, finished_at: b.finished_at || null,
    reprise: Boolean(b.history_path),
  };
}

async function lister(orgId) {
  const { data } = await getSupabaseAdmin()
    .from('dossiers').select('id, reference, client_name, siren, metadata, created_at')
    .eq('organization_id', orgId).not('metadata->>batch_id', 'is', null)
    .order('created_at', { ascending: false }).limit(1000);
  const lots = new Map();
  for (const d of data || []) {
    const b = meta(d).batch || {};
    const lot = lots.get(b.id) || { id: b.id, label: b.label, created_at: b.created_at || d.created_at, total: 0, pret: 0, erreur: 0, en_cours: 0, en_attente: 0 };
    lot.total += 1;
    lot[b.status] = (lot[b.status] || 0) + 1;
    lots.set(b.id, lot);
  }
  return [...lots.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

async function detail(orgId, batchId) {
  const { data } = await getSupabaseAdmin()
    .from('dossiers').select('id, reference, client_name, siren, metadata, created_at')
    .eq('organization_id', orgId).eq('metadata->>batch_id', batchId);
  if (!data?.length) throw Object.assign(new Error('Lot introuvable.'), { status: 404 });
  const items = data.map(itemDe).sort((a, b) => a.index - b.index);
  const b = meta(data[0]).batch || {};
  return { id: batchId, label: b.label, created_at: b.created_at, items };
}

async function relancer({ ctx, dossierId }) {
  const supa = getSupabaseAdmin();
  const { data: d } = await supa.from('dossiers').select('*').eq('id', dossierId).eq('organization_id', ctx.orgId).maybeSingle();
  if (!d || !meta(d).batch_id) throw Object.assign(new Error('Formalité du lot introuvable.'), { status: 404 });
  // « en cours » depuis plus de 30 min = interrompue (redémarrage du serveur) : relançable
  const b = meta(d).batch;
  if (b.status === 'en_cours' && Date.now() - new Date(b.started_at || 0).getTime() < 30 * 60 * 1000) {
    throw Object.assign(new Error('Formalité déjà en cours de préparation.'), { status: 409 });
  }
  executer(ctx, [d]).catch((e) => console.error('[lot]', e.message));
  return { ok: true };
}

// Historique pour reprendre la conversation de l'agent sur une formalité du lot.
async function historique(orgId, dossierId) {
  const supa = getSupabaseAdmin();
  const { data: d } = await supa.from('dossiers').select('id, reference, client_name, metadata').eq('id', dossierId).eq('organization_id', orgId).maybeSingle();
  const path = meta(d || {}).batch?.history_path;
  if (!path) throw Object.assign(new Error('Pas encore d’historique pour cette formalité.'), { status: 404 });
  const { data: file, error } = await supa.storage.from(BUCKET).download(path);
  if (error) throw new Error(`Lecture de l'historique impossible : ${error.message}`);
  const json = JSON.parse(Buffer.from(await file.arrayBuffer()).toString('utf8'));
  return { dossier: { id: d.id, reference: d.reference, denomination: d.client_name }, ...json };
}

module.exports = { TYPES, planifier, lancer, lister, detail, relancer, historique, MAX_FORMALITES };
