// Route orchestrateur — expose l'état de la pipeline d'un dossier.
// Monté sous /api/dossiers (requireUser + requireOrg appliqués en amont).
//
//   GET /api/dossiers/:id/pipeline
//     → { progress, steps[], next, society } calculé par lib/orchestrator.
//
// Lecture seule : l'exécution de chaque étape reste sur ses endpoints dédiés
// (generate-doc, sign-request, admin validate…). L'orchestrateur dit QUOI faire ;
// l'UI enchaîne les appels existants.

const express = require('express');
const router = express.Router();

const { getSupabaseAdmin } = require('../lib/db');
const { buildPipeline } = require('../lib/orchestrator');

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

router.get(
  '/:id/pipeline',
  asyncRoute(async (req, res) => {
    const supa = getSupabaseAdmin();

    const { data: dossier, error: dErr } = await supa
      .from('dossiers')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (dErr || !dossier) return res.status(404).json({ error: 'not_found' });

    // Contrôle d'accès identique aux routes signature.
    const isAdmin = req.profile?.role === 'admin';
    const isOwner = dossier.user_id === req.user.id;
    const isOrgMember =
      dossier.organization_id && dossier.organization_id === req.currentOrgId;
    if (!isAdmin && !isOwner && !isOrgMember) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { data: documents } = await supa
      .from('dossier_documents')
      .select('id, name, doc_type, status, mime_type, created_at')
      .eq('dossier_id', dossier.id);

    const pipeline = buildPipeline(dossier, documents || []);
    pipeline.isAdmin = isAdmin;
    res.json(pipeline);
  }),
);

module.exports = router;
