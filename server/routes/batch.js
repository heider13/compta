// Formalités en lot — suppose requireUser + requireOrg en amont.
//
//   (le lot est découpé et lancé par l'Agent Formalités dans le chat : outils preparer_lot / lancer_lot)
//   GET  /api/lots                            → lots du cabinet (compteurs)
//   GET  /api/lots/:id                        → formalités du lot et leur avancement
//   POST /api/lots/formalites/:dossierId/relancer
//   GET  /api/lots/formalites/:dossierId/historique → conversation de l'agent (reprise dans le chat)

const express = require('express');
const router = express.Router();

const lots = require('../lib/batch');

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch((e) => {
    console.error('[lots]', e.message);
    res.status(e.status || 500).json({ error: 'batch_error', detail: String(e.message).slice(0, 300) });
  });
}

const ctxDe = (req) => ({ userId: req.user.id, orgId: req.currentOrgId, isAdmin: req.profile?.role === 'admin' });

router.get('/', asyncRoute(async (req, res) => {
  res.json({ lots: await lots.lister(req.currentOrgId) });
}));

router.get('/:id', asyncRoute(async (req, res) => {
  res.json(await lots.detail(req.currentOrgId, req.params.id));
}));

router.post('/formalites/:dossierId/relancer', asyncRoute(async (req, res) => {
  res.json(await lots.relancer({ ctx: ctxDe(req), dossierId: req.params.dossierId }));
}));

router.get('/formalites/:dossierId/historique', asyncRoute(async (req, res) => {
  res.json(await lots.historique(req.currentOrgId, req.params.dossierId));
}));

module.exports = router;
