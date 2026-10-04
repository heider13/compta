// Documents publics du RNE — suppose requireUser + requireOrg en amont.
//
//   GET  /api/rne/:siren/documents                  → actes, comptes annuels, SIRET du siège
//   GET  /api/rne/documents/:kind/:id               → fichier (kind : acte | bilan | insee)
//   POST /api/rne/documents/:kind/:id/dossier       → ajoute le document aux pièces d'un dossier
//
// Lecture via les identifiants INPI du cabinet courant.

const express = require('express');
const router = express.Router();

const { getSupabaseAdmin } = require('../lib/db');
const { listDocuments, downloadDocument } = require('../lib/rne-documents');
const { storeDossierDocument } = require('../lib/dossier-docs');

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

const safeName = (s, fallback) => String(s || fallback).replace(/[^\w.\-À-ÿ ]+/g, '_').slice(0, 120);

router.get(
  '/:siren/documents',
  asyncRoute(async (req, res) => {
    try {
      res.json(await listDocuments(req.currentOrgId, req.params.siren));
    } catch (e) {
      res.status(e.status || 502).json({ error: 'rne_error', detail: String(e.message).slice(0, 300) });
    }
  }),
);

router.get(
  '/documents/:kind/:id',
  asyncRoute(async (req, res) => {
    try {
      const { buffer, contentType } = await downloadDocument(req.currentOrgId, req.params.kind, req.params.id);
      const name = safeName(req.query.name, `${req.params.kind}-${req.params.id}.pdf`).replace(/[^\x20-\x7e]/g, '_');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${name}"`);
      res.status(200).end(buffer);
    } catch (e) {
      res.status(e.status || 502).json({ error: 'rne_error', detail: String(e.message).slice(0, 300) });
    }
  }),
);

router.post(
  '/documents/:kind/:id/dossier',
  asyncRoute(async (req, res) => {
    const supa = getSupabaseAdmin();
    const dossierId = String(req.body?.dossierId || '');
    const { data: dossier } = await supa.from('dossiers').select('*').eq('id', dossierId).maybeSingle();
    if (!dossier || dossier.organization_id !== req.currentOrgId) {
      return res.status(404).json({ error: 'not_found', detail: 'Dossier introuvable dans ce cabinet.' });
    }
    try {
      const { buffer, contentType } = await downloadDocument(req.currentOrgId, req.params.kind, req.params.id);
      const base = safeName(req.body?.name, `Document RNE ${req.params.id}`);
      const doc = await storeDossierDocument(supa, dossier, {
        buffer,
        filename: /\.pdf$/i.test(base) ? base : `${base}.pdf`,
        docType: req.params.kind === 'bilan' ? 'COMPTES_ANNUELS' : req.params.kind === 'insee' ? 'AVIS_SITUATION_INSEE' : 'ACTE_RNE',
        userId: req.user?.id,
        mimeType: contentType,
      });
      res.json({ document: { id: doc.id, name: doc.name }, dossier: { id: dossier.id, reference: dossier.reference } });
    } catch (e) {
      res.status(e.status || 502).json({ error: 'rne_error', detail: String(e.message).slice(0, 300) });
    }
  }),
);

module.exports = router;
