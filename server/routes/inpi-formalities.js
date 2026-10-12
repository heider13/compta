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

// Dépôts de comptes annuels du compte mandataire (suivi : statut, greffe, paiement).
const comptes = require('../lib/inpi-comptes-annuels');
const { emailsCabinet } = require('../lib/inpi-paiement');

router.get(
  '/comptes',
  asyncRoute(async (req, res) => {
    try {
      const emails = await emailsCabinet(req.currentOrgId);
      const r = await comptes.lister(req.currentOrgId, {
        siren: /^\d{9}$/.test(String(req.query.siren || '')) ? req.query.siren : undefined,
        page: Math.max(1, Number(req.query.page) || 1),
        parPage: Math.min(100, Math.max(1, Number(req.query.parPage) || 50)),
        emails,
      });
      // Dossier du cabinet lié à chaque dépôt (créé par l'agent)
      const ids = r.depots.map((d) => String(d.id));
      if (ids.length) {
        const { data } = await getSupabaseAdmin().from('dossiers').select('id, reference, metadata')
          .eq('organization_id', req.currentOrgId).in('metadata->>inpi_comptes_id', ids);
        const parId = new Map((data || []).map((d) => [String(d.metadata?.inpi_comptes_id), { id: d.id, reference: d.reference }]));
        for (const d of r.depots) d.dossier = parId.get(String(d.id)) || null;
      }
      res.json(r);
    } catch (e) {
      res.status(e.status || 502).json({ error: 'inpi_error', detail: String(e.message).slice(0, 300) });
    }
  }),
);

router.get(
  '/comptes/:id',
  asyncRoute(async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'bad_id' });
    try {
      const d = await comptes.detail(req.currentOrgId, req.params.id, await emailsCabinet(req.currentOrgId));
      const { data } = await getSupabaseAdmin().from('dossiers').select('id, reference')
        .eq('organization_id', req.currentOrgId).eq('metadata->>inpi_comptes_id', String(req.params.id)).maybeSingle();
      d.dossier = data || null;
      res.json(d);
    } catch (e) {
      res.status(e.status === 404 ? 404 : e.status || 502).json({ error: 'inpi_error', detail: String(e.message).slice(0, 300) });
    }
  }),
);

// Refacturation au client des frais officiels payés (ou à payer) au Guichet unique :
// facture client en brouillon (débours), liée au dossier du cabinet s'il existe.
// Facture client en brouillon (débours) pour les frais officiels d'une formalité
// ou d'un dépôt de comptes. f : { id, liasse, societe, typeLabel, paiement, cleDossier }.
async function facturerDebours(req, res, f) {
    try {
      const p = f.paiement;
      const paniers = p.paniers.filter((x) => x.statut === 'PAID' || x.statut === 'TO_PAY');
      const montant = paniers.reduce((s, x) => s + x.total_cents, 0);
      if (!montant) return res.status(400).json({ error: 'nothing_to_invoice', detail: 'Aucun frais à refacturer sur cette formalité.' });
      const supa = getSupabaseAdmin();
      const { data: existante } = await supa.from('invoices').select('id, status, amount_cents')
        .eq('organization_id', req.currentOrgId).eq('direction', 'cabinet_to_client').eq('metadata->>liasse', String(f.liasse)).maybeSingle();
      if (existante) return res.json({ invoice: existante, deja: true });
      const { data: dossier } = await supa.from('dossiers').select('id, client_id')
        .eq('organization_id', req.currentOrgId).eq(`metadata->>${f.cleDossier}`, String(f.id)).limit(1).maybeSingle();
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
}

router.post(
  '/formalites/:id/refacturer',
  asyncRoute(async (req, res) => {
    let f;
    try { f = await getFormalitySummary(req.currentOrgId, req.params.id); } catch (e) {
      return res.status(e.status || 502).json({ error: 'inpi_error', detail: String(e.message).slice(0, 300) });
    }
    return facturerDebours(req, res, { ...f, cleDossier: 'inpi_formality_id' });
  }),
);

router.post(
  '/comptes/:id/refacturer',
  asyncRoute(async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'bad_id' });
    let d;
    try { d = await comptes.detail(req.currentOrgId, req.params.id, await emailsCabinet(req.currentOrgId)); } catch (e) {
      return res.status(e.status || 502).json({ error: 'inpi_error', detail: String(e.message).slice(0, 300) });
    }
    return facturerDebours(req, res, {
      id: d.id, liasse: d.liasse || String(d.id), societe: d.denomination,
      typeLabel: `Dépôt des comptes annuels ${d.annee || ''}`.trim(), paiement: d.paiement, cleDossier: 'inpi_comptes_id',
    });
  }),
);

module.exports = router;
