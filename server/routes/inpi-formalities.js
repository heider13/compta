// Formalités du Guichet unique INPI — suppose requireUser + requireOrg en amont.
//
//   GET /api/inpi/formalites/:id                         → résumé, pièces, régularisations
//   GET /api/inpi/formalites/:id/pieces/:attachmentId    → fichier de la pièce (PDF…)
//
// Les appels passent par les identifiants INPI du cabinet courant : un cabinet
// ne voit que les formalités de son compte mandataire.

const express = require('express');
const router = express.Router();

const { getFormalitySummary, downloadAttachment } = require('../lib/inpi-formality');

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

router.get(
  '/formalites/:id',
  asyncRoute(async (req, res) => {
    try {
      const summary = await getFormalitySummary(req.currentOrgId, req.params.id);
      delete summary._content;
      res.json(summary);
    } catch (e) {
      res.status(e.status === 404 ? 404 : e.status || 502).json({ error: 'inpi_error', detail: String(e.message).slice(0, 300) });
    }
  }),
);

router.get(
  '/formalites/:id/pieces/:attachmentId',
  asyncRoute(async (req, res) => {
    try {
      const { buffer, contentType } = await downloadAttachment(req.currentOrgId, req.params.id, req.params.attachmentId);
      const name = String(req.query.name || `piece-${req.params.attachmentId}.pdf`).replace(/[^\w.\-]+/g, '_');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${name}"`);
      res.status(200).end(buffer);
    } catch (e) {
      res.status(e.status || 502).json({ error: 'inpi_error', detail: String(e.message).slice(0, 300) });
    }
  }),
);

module.exports = router;
