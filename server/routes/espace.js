// Espace entrepreneur — suppose requireUser (PAS requireOrg : l'entrepreneur
// n'est membre d'aucun cabinet). Il ne voit que ses propres commandes.
//
//   GET  /api/espace/commandes                 → ses commandes
//   GET  /api/espace/commandes/:id             → commande + fil de l'espace
//   POST /api/espace/commandes/:id/rattacher   → associe une conversation gratuite à son compte
//   POST /api/espace/commandes/:id/paiement    → session de paiement Stripe (URL)
//   POST /api/espace/agent  {commande_id, input?, attachments?, form_response?} → SSE (après paiement)
//
// La formalité est déposée par Legaly comme mandataire : l'agent travaille avec
// l'organisation Legaly (LEGALY_ORG_ID), mais en mode « client » : un seul dossier,
// celui de l'entrepreneur, et une liste d'outils restreinte.

const express = require('express');
const router = express.Router();
const { runAgentTurn, resumeCommande, ATTACHMENT_TYPES } = require('../lib/formality-agent');
const { getSupabaseAdmin } = require('../lib/db');
const { storeDossierDocument, signedUrl } = require('../lib/dossier-docs');

const UUID = /^[0-9a-f-]{36}$/i;
const LEGALY_ORG_ID = process.env.LEGALY_ORG_ID || '00000000-0000-0000-0000-000000000001';
const APP_URL = process.env.APP_URL || 'https://compta-navy.vercel.app';

// Prévient l'équipe Legaly (notifications de l'application) : demande à rappeler,
// commande payée… Une seule fois par commande et par type.
async function notifierLegaly(c, type, title, body) {
  const supa = getSupabaseAdmin();
  const deja = c.usage?.notifie || [];
  if (deja.includes(type)) return;
  const { data: membres } = await supa.from('memberships').select('user_id').eq('organization_id', LEGALY_ORG_ID);
  for (const m of membres || []) {
    await supa.from('notifications').insert({ user_id: m.user_id, organization_id: LEGALY_ORG_ID, type, title, body, link: c.dossier_id ? `/dossiers/${c.dossier_id}` : null });
  }
  await supa.from('commandes').update({ usage: { ...(c.usage || {}), notifie: [...deja, type] } }).eq('id', c.id);
}
const sse = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

const vue = (c) => ({
  id: c.id, statut: c.statut, offre: c.offre, email: c.email, paye_le: c.paye_le, dossier_id: c.dossier_id,
  created_at: c.created_at, affichage_gratuit: c.affichage, affichage: c.affichage_client,
  pending_form: c.pending_form_client ? { id: c.pending_form_client.tool_use_id, ...(c.pending_form_client.form || {}) } : null,
});

async function maCommande(req, res) {
  if (!UUID.test(req.params.id || req.body?.commande_id || '')) { res.status(400).json({ error: 'bad_id' }); return null; }
  const id = req.params.id || req.body.commande_id;
  const { data: c } = await getSupabaseAdmin().from('commandes').select('*').eq('id', id).maybeSingle();
  if (!c || c.user_id !== req.user.id) { res.status(404).json({ error: 'not_found', detail: 'Commande introuvable.' }); return null; }
  return c;
}

router.get('/commandes', async (req, res) => {
  const { data } = await getSupabaseAdmin().from('commandes')
    .select('id, statut, offre, paye_le, dossier_id, created_at').eq('user_id', req.user.id).order('created_at', { ascending: false });
  res.json({ commandes: data || [] });
});

router.get('/commandes/:id', async (req, res) => {
  const c = await maCommande(req, res);
  if (c) res.json(vue(c));
});

// Documents du dossier de l'entrepreneur, avec liens de téléchargement à jour.
router.get('/commandes/:id/documents', async (req, res) => {
  const c = await maCommande(req, res);
  if (!c) return;
  if (!c.dossier_id) return res.json({ documents: [] });
  const supa = getSupabaseAdmin();
  const { data } = await supa.from('dossier_documents').select('id, name, file_path, mime_type, doc_type, created_at').eq('dossier_id', c.dossier_id).order('created_at');
  const documents = [];
  for (const d of data || []) {
    let url = null;
    try { url = await signedUrl(supa, d.file_path, 3600); } catch {}
    documents.push({ id: d.id, nom: d.name, type: d.doc_type, cree_le: d.created_at, url });
  }
  res.json({ documents });
});

router.post('/commandes/:id/rattacher', async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'bad_id' });
  const supa = getSupabaseAdmin();
  const { data: c } = await supa.from('commandes').select('id, user_id, statut').eq('id', req.params.id).maybeSingle();
  if (!c) return res.status(404).json({ error: 'not_found' });
  if (c.user_id && c.user_id !== req.user.id) return res.status(409).json({ error: 'deja_rattachee', detail: 'Cette conversation appartient à un autre compte.' });
  if (!c.user_id) await supa.from('commandes').update({ user_id: req.user.id, email: req.user.email || null, updated_at: new Date().toISOString() }).eq('id', c.id);
  res.json({ ok: true });
});

// Session de paiement Stripe Checkout (API REST, sans dépendance).
router.post('/commandes/:id/paiement', async (req, res) => {
  const c = await maCommande(req, res);
  if (!c) return;
  if (c.statut === 'payee') return res.json({ deja_payee: true });
  if (!c.offre?.prix_ttc_cents) return res.status(400).json({ error: 'sans_offre', detail: 'Aucune formalité proposée pour cette conversation.' });
  const aRappeler = () => notifierLegaly(c, 'commande_a_rappeler', `Entrepreneur à rappeler — ${c.offre.libelle}`, `${c.email || req.user.email} souhaite commander « ${c.offre.libelle} » (${(c.offre.prix_ttc_cents / 100).toLocaleString('fr-FR')} € TTC) : paiement en ligne indisponible.`).catch(() => {});
  if (c.offre.provisoire && process.env.TARIFS_PROVISOIRES_OK !== '1') {
    await aRappeler();
    return res.status(503).json({ error: 'tarif_a_confirmer', detail: 'Le paiement en ligne de cette formalité ouvre très bientôt. Nous vous recontactons par e-mail.' });
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) await aRappeler();
  if (!key) return res.status(503).json({ error: 'paiement_indisponible', detail: 'Le paiement en ligne ouvre très bientôt. Votre demande est enregistrée : nous vous recontactons par e-mail.' });
  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': String(c.offre.prix_ttc_cents),
    'line_items[0][price_data][product_data][name]': `${c.offre.libelle} — Legaly AI`,
    'line_items[0][price_data][product_data][description]': 'Prestation Legaly (TTC). Frais officiels payés séparément sur le Guichet unique.',
    customer_email: c.email || req.user.email || '',
    'metadata[commande_id]': c.id,
    'payment_intent_data[metadata][commande_id]': c.id,
    success_url: `${APP_URL}/espace/${c.id}?paiement=ok`,
    cancel_url: `${APP_URL}/espace/${c.id}?paiement=annule`,
    locale: 'fr',
  });
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const s = await r.json();
  if (!r.ok) {
    console.error('[stripe]', s?.error?.message);
    return res.status(502).json({ error: 'stripe_error', detail: 'Le paiement n’a pas pu être initialisé. Réessayez.' });
  }
  await getSupabaseAdmin().from('commandes').update({ statut: 'paiement', stripe_session_id: s.id, updated_at: new Date().toISOString() }).eq('id', c.id);
  res.json({ url: s.url });
});

router.post('/agent', async (req, res) => {
  const c = await maCommande(req, res);
  if (!c) return;
  if (c.statut !== 'payee') return res.status(402).json({ error: 'non_payee', detail: 'La formalité doit être réglée pour continuer avec l’assistant.' });
  const supa = getSupabaseAdmin();
  const { input = '', form_response: fr = null } = req.body || {};
  if (typeof input !== 'string' || input.length > 8000) return res.status(400).json({ error: 'invalid_input' });

  let attachments = [];
  try {
    const raw = req.body?.attachments;
    if (raw != null) {
      if (!Array.isArray(raw) || raw.length > 5) throw new Error('5 documents maximum par message.');
      attachments = raw.map((a) => {
        const name = String(a?.name || 'document').slice(0, 120);
        const mime = String(a?.mime || '');
        if (!ATTACHMENT_TYPES[mime] || ATTACHMENT_TYPES[mime] === 'tableur') throw new Error(`Format non pris en charge : ${name} (PDF, image ou Word).`);
        const buffer = Buffer.from(String(a?.data || ''), 'base64');
        if (!buffer.length || buffer.length > 8 * 1024 * 1024) throw new Error(`Fichier vide ou trop lourd (8 Mo max) : ${name}`);
        return { name, mime, buffer };
      });
    }
  } catch (e) {
    return res.status(400).json({ error: 'invalid_attachments', detail: e.message });
  }

  const debut = !(c.messages_client || []).length;
  if (!debut && !input.trim() && !attachments.length && !fr) return res.status(400).json({ error: 'invalid_input' });

  let formResponse = null;
  const affichage = [...(c.affichage_client || [])];
  if (fr) {
    const pf = c.pending_form_client;
    if (!pf || fr.tool_use_id !== pf.tool_use_id) return res.status(409).json({ error: 'form_inactif', detail: 'Ce questionnaire n’est plus actif.' });
    formResponse = { tool_use_id: pf.tool_use_id, reponses: fr.reponses ?? null, pending: pf.pending || [] };
    const idx = affichage.findIndex((it) => it.type === 'form' && it.id === pf.tool_use_id);
    if (idx >= 0) affichage[idx] = { ...affichage[idx], repondu: true, reponses: fr.reponses ?? null };
  }
  if (input.trim() || attachments.length) affichage.push({ type: 'user', text: input.trim(), files: attachments.map((a) => a.name) });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  const ping = setInterval(() => res.write(': ping\n\n'), 15000);

  const ctx = { mode: 'client', userId: req.user.id, orgId: LEGALY_ORG_ID, isAdmin: false, dossierId: c.dossier_id || null, commandeId: c.id };
  let texte = '';
  const finTexte = () => { if (texte.trim()) affichage.push({ type: 'assistant', text: texte.trim() }); texte = ''; };
  try {
    // Premier tour : la conversation reprend à partir du récapitulatif de la partie gratuite.
    const entree = debut ? `${resumeCommande(c)}${input.trim() ? `\n\nMessage de l'entrepreneur : ${input.trim()}` : ''}` : input.trim();
    const out = await runAgentTurn({
      history: c.messages_client || [],
      input: entree,
      attachments,
      formResponse,
      ctx,
      emit: (event, data) => {
        if (event === 'text') texte += data.text;
        if (event === 'form') { finTexte(); affichage.push({ type: 'form', id: data.id, form: data, repondu: false }); }
        if (event === 'tool' && data.status === 'done' && data.kind === 'document') { finTexte(); affichage.push({ type: 'document', label: data.label, detail: data.detail || null }); }
        sse(res, event, data);
      },
    });
    finTexte();
    const dossierId = out.dossierId || c.dossier_id || null;
    if (attachments.length && dossierId) {
      const { data: dossier } = await supa.from('dossiers').select('*').eq('id', dossierId).maybeSingle();
      for (const a of dossier ? attachments : []) {
        try {
          await storeDossierDocument(supa, dossier, { buffer: a.buffer, filename: a.name, docType: 'PIECE_JOINTE', userId: req.user.id, mimeType: a.mime });
          sse(res, 'tool', { id: `piece-${a.name}`, name: 'piece', status: 'done', kind: 'piece', label: 'Pièce ajoutée à votre dossier', detail: a.name });
        } catch (e) { console.error('[espace piece]', e.message); }
      }
    }
    const pending = out.pendingForm
      ? { ...out.pendingForm, form: affichage.slice().reverse().find((it) => it.type === 'form' && it.id === out.pendingForm.tool_use_id)?.form || null }
      : null;
    const usage = { ...(c.usage || {}), coutClientUsd: Math.round(((c.usage?.coutClientUsd || 0) + (out.usage?.costUsd || 0)) * 1000) / 1000 };
    await supa.from('commandes').update({
      messages_client: out.messages, affichage_client: affichage, pending_form_client: pending, dossier_id: dossierId, usage, updated_at: new Date().toISOString(),
    }).eq('id', c.id);
    sse(res, 'done', { pending_form: pending ? { id: pending.tool_use_id } : null, dossier_id: dossierId });
  } catch (e) {
    console.error('[espace agent]', e.status || '', e.message);
    sse(res, 'error', { detail: String(e.message).slice(0, 300) });
  } finally {
    clearInterval(ping);
    res.end();
  }
});

module.exports = router;
