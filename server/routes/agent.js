// Route Agent Formalités — suppose requireUser + requireOrg appliqués en amont.
//
// POST /api/agent/formalite  {input, messages?, dossier_id?, attachments?} → SSE
//   attachments : [{name, mime, data (base64)}] — PDF, images, .docx (lus par Claude,
//                 puis rangés dans les pièces du dossier)
//   events : text {text} · tool {id, name, status, label, detail?, href?, dossier?, pipeline?}
//            done {messages, dossier_id, usage} · error {error, detail}
//
// `messages` = historique renvoyé par l'event done du tour précédent, à
// renvoyer tel quel (blocs thinking compris).

const express = require('express');
const router = express.Router();

const { runAgentTurn, ATTACHMENT_TYPES } = require('../lib/formality-agent');
const { getSupabaseAdmin } = require('../lib/db');
const { storeDossierDocument } = require('../lib/dossier-docs');

const MAX_HISTORY_BYTES = 3 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

function sse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function parseAttachments(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw) || raw.length > MAX_ATTACHMENTS) {
    throw new Error(`${MAX_ATTACHMENTS} documents maximum par message.`);
  }
  return raw.map((a) => {
    const name = String(a?.name || 'document').slice(0, 120);
    const mime = String(a?.mime || '');
    if (!ATTACHMENT_TYPES[mime]) throw new Error(`Format non pris en charge : ${name} (PDF, image ou Word .docx).`);
    const buffer = Buffer.from(String(a?.data || ''), 'base64');
    if (!buffer.length) throw new Error(`Fichier vide : ${name}`);
    if (buffer.length > MAX_ATTACHMENT_BYTES) throw new Error(`Fichier trop lourd (8 Mo max) : ${name}`);
    return { name, mime, buffer };
  });
}

router.post('/formalite', async (req, res) => {
  const { input = '', messages = [], dossier_id = null, inpi_formality_id = null } = req.body || {};
  let attachments;
  try {
    attachments = parseAttachments(req.body?.attachments);
  } catch (e) {
    return res.status(400).json({ error: 'invalid_attachments', detail: e.message });
  }
  if (typeof input !== 'string' || input.length > 8000 || (!input.trim() && !attachments.length)) {
    return res.status(400).json({ error: 'invalid_input' });
  }
  if (!Array.isArray(messages) || messages.length > 400 || JSON.stringify(messages).length > MAX_HISTORY_BYTES) {
    return res.status(400).json({ error: 'invalid_history' });
  }
  if (messages.some((m) => !m || !['user', 'assistant'].includes(m.role))) {
    return res.status(400).json({ error: 'invalid_history' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Garde la connexion ouverte pendant les rédactions longues.
  const ping = setInterval(() => res.write(': ping\n\n'), 15000);

  const ctx = {
    userId: req.user.id,
    orgId: req.currentOrgId,
    isAdmin: req.profile?.role === 'admin',
    dossierId: typeof dossier_id === 'string' ? dossier_id : null,
    inpiFormalityId: /^\d+$/.test(String(inpi_formality_id ?? '')) ? String(inpi_formality_id) : null,
  };

  try {
    const out = await runAgentTurn({
      history: messages,
      input: input.trim(),
      attachments,
      ctx,
      emit: (event, data) => sse(res, event, data),
    });

    // Range les pièces jointes dans le dossier (créé pendant ce tour ou avant).
    if (attachments.length && out.dossierId) {
      const supa = getSupabaseAdmin();
      const { data: dossier } = await supa.from('dossiers').select('*').eq('id', out.dossierId).maybeSingle();
      if (dossier) {
        for (const a of attachments) {
          try {
            await storeDossierDocument(supa, dossier, {
              buffer: a.buffer, filename: a.name, docType: 'PIECE_JOINTE', userId: req.user.id, mimeType: a.mime,
            });
            sse(res, 'tool', {
              id: `piece-${a.name}`, name: 'piece', status: 'done', kind: 'piece',
              label: 'Pièce rangée dans le dossier', detail: a.name, href: `/dossiers/${dossier.id}`,
            });
          } catch (e) {
            console.error('[agent piece]', e.message);
          }
        }
      }
    }

    sse(res, 'done', { messages: out.messages, dossier_id: out.dossierId, usage: out.usage });
  } catch (e) {
    console.error('[agent]', e.status || '', e.message);
    sse(res, 'error', { error: e.code || 'agent_error', detail: String(e.message).slice(0, 300) });
  } finally {
    clearInterval(ping);
    res.end();
  }
});

module.exports = router;
