// Groupes de sociétés du cabinet — suppose requireUser + requireOrg en amont.
//
//   GET    /api/groupes                         → liste
//   POST   /api/groupes            { siren, nom?, client_id? } → découverte + création
//   GET    /api/groupes/decouvrir/:siren        → aperçu de la découverte (rien n'est enregistré)
//   GET    /api/groupes/:id                     → arbre, détentions, points d'attention
//   PATCH  /api/groupes/:id        { nom?, client_id? }
//   DELETE /api/groupes/:id
//   POST   /api/groupes/:id/redecouvrir { siren? }
//   GET    /api/groupes/:id/suivi               → formalités, comptes, échéances par société
//   POST   /api/groupes/:id/entites { siren? , denomination?, forme?, parent_id?, pourcentage?, direction? }
//   DELETE /api/groupes/:id/entites/:entiteId
//   PUT    /api/groupes/:id/liens  { parent_id, enfant_id, pourcentage?, droits_vote?, direction? }
//   DELETE /api/groupes/:id/liens/:lienId

const express = require('express');
const router = express.Router();
const g = require('../lib/groupes');

const route = (fn) => (req, res) => fn(req, res).catch((e) => {
  res.status(e.status || 500).json({ error: 'groupe_error', detail: String(e.message).slice(0, 300), ...(e.groupe_id ? { groupe_id: e.groupe_id } : {}) });
});
const UUID = /^[0-9a-f-]{36}$/i;
const verifierId = (req, res, next) => (UUID.test(req.params.id) ? next() : res.status(400).json({ error: 'bad_id' }));

router.get('/', route(async (req, res) => res.json({ groupes: await g.lister(req.currentOrgId) })));

router.post('/', route(async (req, res) => {
  const { siren, nom, client_id: clientId } = req.body || {};
  res.status(201).json(await g.creer(req.currentOrgId, req.user?.id, { siren: String(siren || '').replace(/\D/g, ''), nom, clientId }));
}));

router.get('/decouvrir/:siren', route(async (req, res) => {
  if (!/^\d{9}$/.test(req.params.siren)) return res.status(400).json({ error: 'bad_siren' });
  res.json(await g.decouvrir(req.params.siren));
}));

router.get('/:id', verifierId, route(async (req, res) => res.json(await g.detail(req.currentOrgId, req.params.id))));

router.patch('/:id', verifierId, route(async (req, res) => {
  await g.renommer(req.currentOrgId, req.params.id, { nom: req.body?.nom, clientId: req.body?.client_id });
  res.json({ ok: true });
}));

router.delete('/:id', verifierId, route(async (req, res) => {
  await g.supprimer(req.currentOrgId, req.params.id);
  res.json({ ok: true });
}));

router.post('/:id/redecouvrir', verifierId, route(async (req, res) => {
  const siren = req.body?.siren ? String(req.body.siren).replace(/\D/g, '') : undefined;
  res.json(await g.redecouvrir(req.currentOrgId, req.params.id, siren));
}));

router.get('/:id/suivi', verifierId, route(async (req, res) => res.json({ suivi: await g.suivi(req.currentOrgId, req.params.id) })));

router.post('/:id/entites', verifierId, route(async (req, res) => {
  const b = req.body || {};
  res.status(201).json(await g.ajouterEntite(req.currentOrgId, req.params.id, {
    siren: b.siren ? String(b.siren).replace(/\D/g, '') : null, denomination: b.denomination, forme: b.forme,
    parentId: b.parent_id, pourcentage: b.pourcentage, direction: b.direction,
  }));
}));

router.delete('/:id/entites/:entiteId', verifierId, route(async (req, res) => {
  await g.supprimerEntite(req.currentOrgId, req.params.id, req.params.entiteId);
  res.json({ ok: true });
}));

router.put('/:id/liens', verifierId, route(async (req, res) => {
  const b = req.body || {};
  res.json(await g.enregistrerLien(req.currentOrgId, req.params.id, {
    parentId: b.parent_id, enfantId: b.enfant_id, pourcentage: b.pourcentage, droitsVote: b.droits_vote, direction: b.direction,
  }));
}));

router.delete('/:id/liens/:lienId', verifierId, route(async (req, res) => {
  await g.supprimerLien(req.currentOrgId, req.params.id, req.params.lienId);
  res.json({ ok: true });
}));

module.exports = router;
