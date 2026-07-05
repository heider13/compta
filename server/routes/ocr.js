// Route OCR pièces d'identité — POST /api/ocr/identity
// Suppose requireUser + requireOrg appliqués en amont (req.user, req.currentOrgId).
//
// Entrée  : { imageBase64: string }  (JPEG/PNG, max ~10 Mo)
// Sortie  : { fields: {nom, prenoms[], dateNaissance, sexe, nationalite,
//             numeroDocument, typeDocument, lieuNaissance?}, method, confidence }
//
// RGPD : l'image N'EST PAS stockée — elle est traitée en mémoire puis oubliée.
// Seuls les champs extraits repartent vers le client. Un audit log trace
// l'usage (sans les données extraites).

const express = require('express');
const router = express.Router();

const { extractIdentity } = require('../lib/ocr');
const { isPdf, pdfToPngPages } = require('../lib/pdf');
const { extractText } = require('../lib/text-extract');
const { extractDocument } = require('../lib/ai');
const { getSupabaseAdmin } = require('../lib/db');

const MAX_BASE64_LENGTH = 14_000_000; // ≈10 Mo binaire
const MAX_DOC_BASE64_LENGTH = 28_000_000; // ≈20 Mo pour les PV/statuts

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

// Score de fiabilité d'une extraction — pour garder la meilleure page d'un PDF.
function methodScore(method) {
  if (method === 'mrz') return 3;
  if (method === 'mrz_partial') return 2;
  if (method === 'heuristic') return 1;
  return 0;
}

router.post(
  '/identity',
  asyncRoute(async (req, res) => {
    const { imageBase64 } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'missing_fields', required: ['imageBase64'] });
    }
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return res.status(413).json({ error: 'image_too_large', max_size_mb: 10 });
    }

    // Tolère le préfixe data-URL envoyé par FileReader côté navigateur.
    const cleaned = imageBase64.replace(/^data:[^;]+;base64,/, '');
    let buffer;
    try {
      buffer = Buffer.from(cleaned, 'base64');
    } catch {
      return res.status(400).json({ error: 'invalid_base64' });
    }
    if (buffer.length < 1024) {
      return res.status(400).json({ error: 'image_too_small' });
    }

    // PDF scanné : conversion des 1-2 premières pages (recto/verso) en PNG,
    // OCR page par page, on garde le meilleur résultat (MRZ > heuristique).
    let result;
    if (isPdf(buffer)) {
      const pages = await pdfToPngPages(buffer, { maxPages: 2 });
      result = { fields: null, method: 'none', confidence: null };
      for (const page of pages) {
        const r = await extractIdentity(page);
        if (methodScore(r.method) > methodScore(result.method)) result = r;
        if (r.method === 'mrz') break; // MRZ complet : inutile d'aller plus loin
      }
    } else {
      result = await extractIdentity(buffer);
    }

    // Audit sans PII : on trace l'usage et la méthode, pas les champs.
    try {
      const supa = getSupabaseAdmin();
      await supa.from('audit_logs').insert({
        organization_id: req.currentOrgId,
        user_id: req.user.id,
        action: 'ocr.identity.extract',
        resource_type: 'ocr',
        resource_id: null,
        metadata: { method: result.method, confidence: result.confidence },
      });
    } catch {
      // L'audit ne doit jamais bloquer la réponse.
    }

    if (!result.fields) {
      return res.status(422).json({
        error: 'extraction_failed',
        detail:
          "Impossible d'extraire l'identité. Vérifiez que la photo est nette, bien cadrée et que la zone MRZ (lignes de caractères en bas du document) est lisible.",
        method: result.method,
        debug: result.debug ?? null,
      });
    }

    res.json(result);
  }),
);

// ─── POST /api/ocr/document ───────────────────────────────
// Analyse d'un document juridique (PV d'AG, statuts…) au format PDF, image ou
// Word. Extraction du texte (couche texte / OCR / unzip docx) puis extraction
// structurée par l'IA.
//
// Entrée : { fileBase64, filename?, docType? }
// Sortie : { source, documentType, fields, textPreview, refused }
router.post(
  '/document',
  asyncRoute(async (req, res) => {
    const { fileBase64, filename, docType } = req.body || {};
    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return res.status(400).json({ error: 'missing_fields', required: ['fileBase64'] });
    }
    if (fileBase64.length > MAX_DOC_BASE64_LENGTH) {
      return res.status(413).json({ error: 'file_too_large', max_size_mb: 20 });
    }

    const cleaned = fileBase64.replace(/^data:[^;]+;base64,/, '');
    let buffer;
    try {
      buffer = Buffer.from(cleaned, 'base64');
    } catch {
      return res.status(400).json({ error: 'invalid_base64' });
    }
    if (buffer.length < 512) {
      return res.status(400).json({ error: 'file_too_small' });
    }

    // 1. Extraction du texte (multi-format).
    let extracted;
    try {
      extracted = await extractText(buffer);
    } catch (e) {
      return res.status(e.status || 422).json({
        error: e.code || 'extract_failed',
        detail: e.message,
      });
    }
    const text = (extracted.text || '').trim();
    if (text.length < 40) {
      return res.status(422).json({
        error: 'no_text',
        detail:
          "Aucun texte exploitable n'a pu être extrait. Si le document est un scan, vérifiez sa netteté.",
        source: extracted.source,
      });
    }

    // 2. Extraction structurée par l'IA.
    let ai;
    try {
      ai = await extractDocument({ text, docTypeHint: docType });
    } catch (e) {
      const missingKey = /api key|ANTHROPIC/i.test(e.message || '');
      return res.status(missingKey ? 503 : 502).json({
        error: missingKey ? 'ai_unavailable' : 'ai_failed',
        detail: missingKey
          ? "Le service d'analyse IA n'est pas configuré (clé Anthropic)."
          : String(e.message).slice(0, 300),
        source: extracted.source,
        textPreview: text.slice(0, 400),
      });
    }

    // Audit sans contenu : on trace la méthode, pas les données du document.
    try {
      const supa = getSupabaseAdmin();
      await supa.from('audit_logs').insert({
        organization_id: req.currentOrgId,
        user_id: req.user.id,
        action: 'ocr.document.extract',
        resource_type: 'ocr',
        resource_id: null,
        metadata: {
          source: extracted.source,
          filename: filename || null,
          documentType: ai.data?.documentType || null,
        },
      });
    } catch {
      // best-effort
    }

    if (ai.refused || !ai.data) {
      return res.status(422).json({
        error: 'extraction_failed',
        detail: "L'IA n'a pas pu structurer ce document.",
        source: extracted.source,
        textPreview: text.slice(0, 400),
      });
    }

    res.json({
      source: extracted.source,
      documentType: ai.data.documentType || docType || null,
      fields: ai.data,
      textPreview: text.slice(0, 400),
      // Texte extrait (plafonné) — permet à l'assistant de répondre sur le
      // contenu du document joint (mention @ dans le chat).
      text: text.slice(0, 6000),
      refused: false,
    });
  }),
);

module.exports = router;
