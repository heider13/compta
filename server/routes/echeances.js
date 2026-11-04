// Échéances de la semaine — suppose requireUser + requireOrg en amont.
//
//   POST /api/echeances/preparer → prépare maintenant les propositions du cabinet

const express = require('express');
const router = express.Router();
const echeances = require('../lib/echeances');

router.post('/preparer', (req, res) => {
  echeances.preparer(req.currentOrgId)
    .then((r) => res.json(r))
    .catch((e) => res.status(500).json({ error: 'echeances_error', detail: String(e.message).slice(0, 300) }));
});

module.exports = router;
