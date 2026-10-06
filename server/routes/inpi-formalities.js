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
const { getSupabaseAdmin } = require('../lib/db');

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

// Refacturation au client des frais officiels payés (ou à payer) au Guichet unique :
// facture client en brouillon (débours), liée au dossier du cabinet s'il existe.
router.post(
  '/formalites/:id/refacturer',
  asyncRoute(async (req, res) => {
    try {
      const f = await getFormalitySummary(req.currentOrgId, req.params.id);
      const p = f.paiement;
      const paniers = p.paniers.filter((x) => x.statut === 'PAID' || x.statut === 'TO_PAY');
      const montant = paniers.reduce((s, x) => s + x.total_cents, 0);
      if (!montant) return res.status(400).json({ error: 'nothing_to_invoice', detail: 'Aucun frais à refacturer sur cette formalité.' });
      const supa = getSupabaseAdmin();
      const { data: existante } = await supa.from('invoices').select('id, status, amount_cents')
        .eq('organization_id', req.currentOrgId).eq('direction', 'cabinet_to_client').eq('metadata->>liasse', String(f.liasse)).maybeSingle();
      if (existante) return res.json({ invoice: existante, deja: true });
      const { data: dossier } = await supa.from('dossiers').select('id, client_id')
        .eq('organization_id', req.currentOrgId).eq('metadata->>inpi_formality_id', String(f.id)).limit(1).maybeSingle();
      const { data: invoice, error } = await supa.from('invoices').insert({
        organization_id: req.currentOrgId,
        dossier_id: dossier?.id || null,
        client_id: dossier?.client_id || null,
        direction: 'cabinet_to_client',
        amount_cents: montant,
        vat_cents: 0,
        status: 'draft',
        metadata: {
          type: 'debours_formalite',
          liasse: f.liasse,
          societe: f.societe,
          formalite: f.typeLabel,
          lignes: paniers.flatMap((x) => x.lignes),
          libelle: `Frais officiels de formalité (débours) — ${f.typeLabel} ${f.societe || ''} — liasse ${f.liasse}`,
        },
      }).select('id, status, amount_cents').single();
      if (error) throw new Error(error.message);
      res.status(201).json({ invoice });
    } catch (e) {
      res.status(e.status || 502).json({ error: 'invoice_error', detail: String(e.message).slice(0, 300) });
    }
  }),
);

module.exports = router;
