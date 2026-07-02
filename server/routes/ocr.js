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
const { getSupabaseAdmin } = require('../lib/db');

const MAX_BASE64_LENGTH = 14_000_000; // ≈10 Mo binaire

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
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

    const result = await extractIdentity(buffer);

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
      });
    }

    res.json(result);
  }),
);

module.exports = router;
