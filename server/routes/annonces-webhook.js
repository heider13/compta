// Webhook Les Echos Le Parisien Services — endpoint PUBLIC (c'est le service qui pousse).
// Sécurité : en-tête X-Signature « t=<unix>,s=<hex> », HMAC-SHA256 du corps brut avec
// LELPS_WEBHOOK_SECRET, horodatage à moins de 5 min (voir lib/lelps.js).
// Seul événement utile ici : legal_notice_publication_proof_created (justificatif de parution).
// Les messages arrivent par lots (3 min en production, 15 min en préproduction), au moins une
// fois et dans le désordre : le traitement relit l'annonce, il est donc sans effet s'il est rejoué.

const express = require('express');
const router = express.Router();
const lelps = require('../lib/lelps');
const publication = require('../lib/publication-annonces');
const { getSupabaseAdmin } = require('../lib/db');

router.post('/webhook', async (req, res) => {
  const brut = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
  if (!lelps.signatureWebhookValide(brut, req.get('X-Signature'))) {
    console.warn(`[annonces-webhook] ${process.env.LELPS_WEBHOOK_SECRET ? 'signature invalide' : 'LELPS_WEBHOOK_SECRET non défini'} — rejeté`);
    return res.status(400).json({ error: 'invalid_signature' });
  }
  let message;
  try {
    message = JSON.parse(brut.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'invalid_json' });
  }
  // Réponse immédiate (2xx = reçu), traitement ensuite
  res.status(200).json({ ok: true });
  if (message?.type !== 'legal_notice_publication_proof_created') return;
  const reference = message.object?.legalNotice?.reference;
  publication.surJustificatif(getSupabaseAdmin(), reference)
    .then((trouve) => { if (!trouve) console.warn(`[annonces-webhook] aucune annonce ${reference} dans les dossiers`); })
    .catch((e) => console.error('[annonces-webhook]', reference, e.message));
});

module.exports = router;
