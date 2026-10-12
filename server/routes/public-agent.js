// Chat public de la page « Indépendants et TPE » — SANS authentification.
//
//   POST /api/public/agent  {commande_id?, input?, form_response?: {reponses|null}} → SSE
//        events : text {text} · tool {...} · form {...} · offre {...}
//                 done {commande_id, statut, offre, pending_form} · paywall {offre} · error {detail}
//   GET  /api/public/commandes/:id  → fil affiché + statut (reprise après rechargement)
//
// Garde-fous : historique conservé côté serveur (le navigateur ne peut pas le
// réécrire), 4 tours au plus par conversation, conversations limitées par
// adresse IP et par jour, modèle économique, aucun accès au RNE ni aux dossiers.

const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { runAgentTurn } = require('../lib/formality-agent');
const { getSupabaseAdmin } = require('../lib/db');

const MAX_TOURS = 4;
const PAR_IP_JOUR = Number(process.env.PUBLIC_CHAT_PAR_IP || 6);
const MAX_JOUR = Number(process.env.PUBLIC_CHAT_MAX_JOUR || 300);
const UUID = /^[0-9a-f-]{36}$/i;

const ipHash = (req) => crypto.createHash('sha256').update(`${req.ip}|${process.env.MASTER_ENCRYPTION_KEY || ''}`).digest('hex').slice(0, 32);
const sse = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

// Fil affiché sans données internes
const vuePublique = (c) => ({ commande_id: c.id, statut: c.statut, offre: c.offre, affichage: c.affichage, pending_form: c.pending_form ? { id: c.pending_form.tool_use_id, ...c.pending_form.form } : null, tours_restants: Math.max(0, MAX_TOURS - c.tours) });

router.get('/commandes/:id', async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'bad_id' });
  const { data: c } = await getSupabaseAdmin().from('commandes').select('*').eq('id', req.params.id).maybeSingle();
  if (!c) return res.status(404).json({ error: 'not_found' });
  res.json(vuePublique(c));
});

router.post('/agent', async (req, res) => {
  const supa = getSupabaseAdmin();
  const { commande_id: commandeId = null, input = '', form_response: fr = null } = req.body || {};
  if (typeof input !== 'string' || input.length > 1500) return res.status(400).json({ error: 'invalid_input', detail: 'Message trop long (1 500 caractères au plus).' });
  if (!input.trim() && !fr) return res.status(400).json({ error: 'invalid_input' });
  if (commandeId && !UUID.test(commandeId)) return res.status(400).json({ error: 'bad_id' });
  if (fr && (typeof fr !== 'object' || (fr.reponses != null && (typeof fr.reponses !== 'object' || Array.isArray(fr.reponses))) || JSON.stringify(fr).length > 20000)) {
    return res.status(400).json({ error: 'invalid_form_response' });
  }

  const hash = ipHash(req);
  let commande;
  if (commandeId) {
    ({ data: commande } = await supa.from('commandes').select('*').eq('id', commandeId).maybeSingle());
    if (!commande) return res.status(404).json({ error: 'not_found', detail: 'Conversation introuvable.' });
  } else {
    const depuis = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [{ count: parIp }, { count: total }] = await Promise.all([
      supa.from('commandes').select('id', { count: 'exact', head: true }).eq('ip_hash', hash).gte('created_at', depuis),
      supa.from('commandes').select('id', { count: 'exact', head: true }).gte('created_at', depuis),
    ]);
    if ((parIp || 0) >= PAR_IP_JOUR) return res.status(429).json({ error: 'limite_ip', detail: 'Vous avez atteint le nombre de conversations gratuites pour aujourd’hui. Créez votre compte pour continuer.' });
    if ((total || 0) >= MAX_JOUR) return res.status(429).json({ error: 'limite_globale', detail: 'L’assistant est très demandé : réessayez dans quelques heures ou créez votre compte.' });
    const { data, error } = await supa.from('commandes').insert({ ip_hash: hash }).select('*').single();
    if (error) return res.status(500).json({ error: 'db_error' });
    commande = data;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  if (commande.statut !== 'ouverte' || commande.tours >= MAX_TOURS) {
    sse(res, 'paywall', { commande_id: commande.id, offre: commande.offre, raison: commande.statut !== 'ouverte' ? 'offre' : 'tours' });
    return res.end();
  }

  // Réponse à un formulaire : uniquement celui que le serveur a en attente
  let formResponse = null;
  const affichage = [...(commande.affichage || [])];
  if (fr) {
    const pf = commande.pending_form;
    if (!pf || fr.tool_use_id !== pf.tool_use_id) {
      sse(res, 'error', { detail: 'Ce questionnaire n’est plus actif.' });
      return res.end();
    }
    formResponse = { tool_use_id: pf.tool_use_id, reponses: fr.reponses ?? null, pending: pf.pending || [] };
    const idx = affichage.findIndex((it) => it.type === 'form' && it.id === pf.tool_use_id);
    if (idx >= 0) affichage[idx] = { ...affichage[idx], repondu: true, reponses: fr.reponses ?? null };
  }
  if (input.trim()) affichage.push({ type: 'user', text: input.trim() });

  const ping = setInterval(() => res.write(': ping\n\n'), 15000);
  const ctx = { mode: 'public', userId: null, orgId: null, isAdmin: false, dossierId: null };
  let texte = '';
  const finTexte = () => { if (texte.trim()) affichage.push({ type: 'assistant', text: texte.trim() }); texte = ''; };
  try {
    const out = await runAgentTurn({
      history: commande.messages || [],
      input: input.trim(),
      formResponse,
      ctx,
      emit: (event, data) => {
        if (event === 'text') texte += data.text;
        if (event === 'form') { finTexte(); affichage.push({ type: 'form', id: data.id, form: data, repondu: false }); }
        if (event === 'tool' && data.kind === 'offre' && data.status === 'done') { finTexte(); affichage.push({ type: 'offre', offre: data.offre }); }
        sse(res, event, data);
      },
    });
    finTexte();
    const offre = out.offre || commande.offre || null;
    const pending = out.pendingForm
      ? { ...out.pendingForm, form: affichage.slice().reverse().find((it) => it.type === 'form' && it.id === out.pendingForm.tool_use_id)?.form || null }
      : null;
    const usage = { ...(commande.usage || {}), coutUsd: Math.round(((commande.usage?.coutUsd || 0) + (out.usage?.costUsd || 0)) * 1000) / 1000 };
    const statut = out.offre ? 'offre' : 'ouverte';
    await supa.from('commandes').update({
      messages: out.messages, affichage, pending_form: pending, tours: commande.tours + 1, offre, statut, usage, updated_at: new Date().toISOString(),
    }).eq('id', commande.id);
    sse(res, 'done', { commande_id: commande.id, statut, offre, pending_form: pending ? { id: pending.tool_use_id } : null, tours_restants: Math.max(0, MAX_TOURS - commande.tours - 1) });
  } catch (e) {
    console.error('[chat public]', e.status || '', e.message);
    sse(res, 'error', { detail: 'L’assistant est momentanément indisponible. Réessayez dans un instant.' });
  } finally {
    clearInterval(ping);
    res.end();
  }
});

module.exports = router;
