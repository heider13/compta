// Routes assistant IA — suppose requireUser + requireOrg appliqués en amont.
//
// POST /api/ai/chat   {question, conversation_id?} → SSE (text/event-stream)
//   events: sources {chunks}, delta {text}, done {conversation_id}, error
// GET  /api/ai/conversations            → liste des conversations du cabinet
// GET  /api/ai/conversations/:id        → messages d'une conversation

const express = require('express');
const router = express.Router();

const { searchLegalChunks, streamAnswer, draftDocument, DOC_TYPES } = require('../lib/ai');
const { getSupabaseAdmin } = require('../lib/db');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
} = require('docx');

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
      const SOURCE_LABELS = {
        legifrance: 'Légifrance',
        eurlex: 'EUR-Lex',
        bofip: 'BOFiP',
        jurisprudence_ce: "Conseil d'État",
        pcg: 'PCG',
        cncc: 'CNCC',
      };
      sse(res, 'sources', {
        sources: chunks.map((c, i) => ({
          n: i + 1,
          title: c.title,
          url: c.url,
          source: c.source,
          source_label: SOURCE_LABELS[c.source] || c.source,
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

// ─── Rédaction de document légal/contractuel ─────────────────────
// POST /api/ai/draft-document  {docType, brief, format?: 'markdown'|'docx'}
//   markdown (défaut) → {title, markdown}
//   docx → fichier .docx en pièce jointe
function markdownToDocx(title, markdown) {
  const lines = markdown.split(/\r?\n/);
  const children = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) { children.push(new Paragraph({ text: '' })); continue; }
    let m;
    if ((m = t.match(/^#\s+(.+)/))) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, children: [new TextRun({ text: m[1], bold: true, size: 30 })] }));
    } else if ((m = t.match(/^##\s+(.+)/))) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 }, children: [new TextRun({ text: m[1], bold: true, size: 26 })] }));
    } else if ((m = t.match(/^###\s+(.+)/))) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: m[1], bold: true, size: 24 })] }));
    } else {
      // gras markdown **...**
      const runs = [];
      const parts = t.split(/(\*\*[^*]+\*\*)/g);
      for (const p of parts) {
        if (!p) continue;
        const bm = p.match(/^\*\*([^*]+)\*\*$/);
        runs.push(new TextRun({ text: bm ? bm[1] : p, bold: !!bm, size: 22 }));
      }
      children.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 100 }, children: runs }));
    }
  }
  return new Document({ creator: 'Compta', title, sections: [{ children }] });
}

router.post(
  '/draft-document',
  asyncRoute(async (req, res) => {
    const { docType = 'autre', brief, format = 'markdown' } = req.body || {};
    if (!brief || typeof brief !== 'string' || brief.length > 6000) {
      return res.status(400).json({ error: 'invalid_brief' });
    }
    if (!DOC_TYPES[docType]) {
      return res.status(400).json({ error: 'unknown_doc_type', supported: Object.keys(DOC_TYPES) });
    }

    // RAG léger : le brief sert de requête pour retrouver les textes pertinents.
    let chunks = [];
    try {
      chunks = await searchLegalChunks(brief, { matchCount: 6, minSimilarity: 0.3 });
    } catch { /* le doc peut se rédiger sans sources */ }

    const result = await draftDocument({ docType, brief, chunks });
    if (result.refused) {
      return res.status(422).json({ error: 'refusal', detail: 'Demande hors périmètre.' });
    }

    // Trace (sans PII lourde)
    try {
      const supa = getSupabaseAdmin();
      await supa.from('audit_logs').insert({
        organization_id: req.currentOrgId,
        user_id: req.user.id,
        action: 'ai.document.drafted',
        resource_type: 'ai_document',
        resource_id: null,
        metadata: { doc_type: docType, sources: chunks.length },
      });
    } catch {}

    if (format === 'docx') {
      const doc = markdownToDocx(result.title, result.markdown);
      const buffer = await Packer.toBuffer(doc);
      const filename = `${result.title.replace(/[^\w-]+/g, '_')}.docx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).end(buffer);
    }

    res.json({
      title: result.title,
      markdown: result.markdown,
      sources: chunks.map((c, i) => ({ n: i + 1, title: c.title, url: c.url, source: c.source })),
    });
  }),
);

router.get('/doc-types', (req, res) => {
  res.json({ types: Object.entries(DOC_TYPES).map(([id, label]) => ({ id, label })) });
});

module.exports = router;
