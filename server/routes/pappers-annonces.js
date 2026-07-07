// Routes Pappers Services — annonces légales.
// Monté sous /api/pappers-annonces (requireUser + requireOrg en amont).
//
//   GET /api/pappers-annonces/status
//     → { configured, balance? }  — valide le token et renvoie le solde de jetons.
//
// La publication d'une annonce (POST) sera ajoutée une fois le token fourni et
// l'endpoint de dépôt confirmé (facturé au jeton — on ne l'appelle pas à l'aveugle).

const express = require('express');
const router = express.Router();

const pappers = require('../lib/pappers-annonces');

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

router.get(
  '/status',
  asyncRoute(async (req, res) => {
    if (!pappers.isConfigured()) {
      return res.json({ configured: false });
    }
    try {
      const [balance, formes] = await Promise.all([
        pappers.getBalance().catch((e) => ({ error: e.message })),
        pappers.getFormesJuridiques().catch(() => null),
      ]);
      res.json({ configured: true, balance, formesJuridiques: formes });
    } catch (e) {
      res.status(e.status || 502).json({
        configured: true,
        error: e.message,
        detail: e.body || null,
      });
    }
  }),
);

module.exports = router;
