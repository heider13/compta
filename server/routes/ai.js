// Routes assistant IA — suppose requireUser + requireOrg appliqués en amont.
//
// POST /api/ai/chat   {question, conversation_id?} → SSE (text/event-stream)
//   events: sources {chunks}, delta {text}, done {conversation_id}, error
// GET  /api/ai/conversations            → liste des conversations du cabinet
// GET  /api/ai/conversations/:id        → messages d'une conversation

const express = require('express');
const router = express.Router();

const { searchLegalChunks, streamAnswer } = require('../lib/ai');
const { getSupabaseAdmin } = require('../lib/db');

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

function sse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

router.post(
  '/chat',
  asyncRoute(async (req, res) => {
    const { question, conversation_id } = req.body || {};
    if (!question || typeof question !== 'string' || question.length > 4000) {
      return res.status(400).json({ error: 'invalid_question' });
    }

    const supa = getSupabaseAdmin();

    // Conversation : reprise ou création
    let convId = conversation_id || null;
    let history = [];
    if (convId) {
      const { data: conv } = await supa
        .from('ai_conversations')
        .select('id, organization_id')
        .eq('id', convId)
        .maybeSingle();
      if (!conv || conv.organization_id !== req.currentOrgId) {
        return res.status(403).json({ error: 'forbidden' });
      }
      const { data: msgs } = await supa
        .from('ai_messages')
        .select('role, content')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(20);
      history = msgs || [];
    } else {
      const { data: conv, error } = await supa
        .from('ai_conversations')
        .insert({
          organization_id: req.currentOrgId,
          user_id: req.user.id,
          title: question.slice(0, 80),
        })
        .select('id')
        .single();
      if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
      convId = conv.id;
    }

    // SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      // 1) RAG
      const chunks = await searchLegalChunks(question);
      sse(res, 'sources', {
        sources: chunks.map((c, i) => ({
          n: i + 1,
          title: c.title,
          url: c.url,
          source: c.source,
          source_id: c.source_id,
          similarity: Math.round(c.similarity * 100) / 100,
        })),
      });

      // 2) Claude streaming
      const stream = streamAnswer({ question, history, chunks });
      let fullText = '';
      stream.on('text', (delta) => {
        fullText += delta;
        sse(res, 'delta', { text: delta });
      });
      const final = await stream.finalMessage();

      if (final.stop_reason === 'refusal') {
        sse(res, 'error', { error: 'refusal', detail: 'Question hors du périmètre de l’assistant.' });
      } else {
        // 3) Persistance
        await supa.from('ai_messages').insert([
          { conversation_id: convId, role: 'user', content: question },
          {
            conversation_id: convId,
            role: 'assistant',
            content: fullText,
            citations: chunks.map((c, i) => ({
              n: i + 1, title: c.title, url: c.url, source_id: c.source_id,
            })),
          },
        ]);
        await supa
          .from('ai_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', convId);
        sse(res, 'done', {
          conversation_id: convId,
          usage: { input: final.usage.input_tokens, output: final.usage.output_tokens },
        });
      }
    } catch (e) {
      console.error('[ai/chat]', e.message);
      sse(res, 'error', { error: e.code || 'ai_error', detail: String(e.message).slice(0, 300) });
    }
    res.end();
  }),
);

router.get(
  '/conversations',
  asyncRoute(async (req, res) => {
    const supa = getSupabaseAdmin();
    const { data, error } = await supa
      .from('ai_conversations')
      .select('id, title, created_at, updated_at')
      .eq('organization_id', req.currentOrgId)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.json({ items: data || [] });
  }),
);

router.get(
  '/conversations/:id',
  asyncRoute(async (req, res) => {
    const supa = getSupabaseAdmin();
    const { data: conv } = await supa
      .from('ai_conversations')
      .select('id, organization_id, title')
      .eq('id', req.params.id)
      .maybeSingle();
    if (!conv || conv.organization_id !== req.currentOrgId) {
      return res.status(404).json({ error: 'not_found' });
    }
    const { data: messages } = await supa
      .from('ai_messages')
      .select('role, content, citations, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });
    res.json({ conversation: conv, messages: messages || [] });
  }),
);

module.exports = router;
