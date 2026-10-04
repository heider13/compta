// Route Agent Formalités — suppose requireUser + requireOrg appliqués en amont.
//
// POST /api/agent/formalite  {input, messages?, dossier_id?} → SSE (text/event-stream)
//   events : text {text} · tool {id, name, status, label, detail?, href?, dossier?, pipeline?}
//            done {messages, dossier_id} · error {error, detail}
//
// `messages` = historique renvoyé par l'event done du tour précédent, à
// renvoyer tel quel (blocs thinking compris).

const express = require('express');
const router = express.Router();

const { runAgentTurn } = require('../lib/formality-agent');

const MAX_HISTORY_BYTES = 3 * 1024 * 1024;

function sse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

router.post('/formalite', async (req, res) => {
  const { input, messages = [], dossier_id = null } = req.body || {};
  if (!input || typeof input !== 'string' || input.length > 8000) {
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
  };

  try {
    const out = await runAgentTurn({
      history: messages,
      input,
      ctx,
      emit: (event, data) => sse(res, event, data),
    });
    sse(res, 'done', { messages: out.messages, dossier_id: out.dossierId });
  } catch (e) {
    console.error('[agent]', e.status || '', e.message);
    sse(res, 'error', { error: e.code || 'agent_error', detail: String(e.message).slice(0, 300) });
  } finally {
    clearInterval(ping);
    res.end();
  }
});

module.exports = router;
