// Génération de documents juridiques pour un dossier.
// POST /api/dossiers/:id/generate-doc  { docType: 'STATUTS', overrides?: {...} }
//
// Suppose requireUser + requireOrg appliqués en amont.
// Le document généré est uploadé dans Storage (dossier-docs/generated/...) et
// référencé dans dossier_documents — il apparaît dans les pièces du dossier.

const express = require('express');
const router = express.Router();

const { getSupabaseAdmin } = require('../lib/db');
const { generateStatutsForDossier } = require('../lib/dossier-docs');

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

router.post(
  '/:id/generate-doc',
  asyncRoute(async (req, res) => {
    const { docType = 'STATUTS', overrides = {} } = req.body || {};
    if (docType !== 'STATUTS') {
      return res.status(400).json({ error: 'unsupported_doc_type', supported: ['STATUTS'] });
    }

    const supa = getSupabaseAdmin();
    const { data: dossier, error: dErr } = await supa
      .from('dossiers')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (dErr || !dossier) return res.status(404).json({ error: 'not_found' });

    // Sécurité : membre de l'org du dossier, propriétaire, ou admin global.
    const isAdmin = req.profile?.role === 'admin';
    const isOwn = dossier.user_id === req.user.id;
    const isOrgMember =
      dossier.organization_id && dossier.organization_id === req.currentOrgId;
    if (!isAdmin && !isOwn && !isOrgMember) {
      return res.status(403).json({ error: 'forbidden' });
    }

    try {
      const doc = await generateStatutsForDossier(supa, dossier, req.user.id, overrides);
      res.status(201).json({ ok: true, document: doc });
    } catch (e) {
      res.status(e.status || 500).json({ error: e.code || 'generation_failed', detail: e.message });
    }
  }),
);

module.exports = router;
