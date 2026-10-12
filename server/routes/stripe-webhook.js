// Webhook Stripe des commandes d'entrepreneurs (paiement d'une formalité).
// Monté AVANT express.json() : la signature se vérifie sur le corps brut.
//   POST /api/paiements/stripe-webhook   (STRIPE_WEBHOOK_SECRET)
// Événement traité : checkout.session.completed (payment_status = paid).

const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { getSupabaseAdmin } = require('../lib/db');

const TOLERANCE_S = 300;

function signatureValide(corps, entete, secret) {
  const parts = Object.fromEntries(String(entete || '').split(',').map((p) => p.split('=')));
  const t = Number(parts.t);
  const v1 = String(entete || '').split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!t || !v1.length || Math.abs(Date.now() / 1000 - t) > TOLERANCE_S) return false;
  const attendu = crypto.createHmac('sha256', secret).update(`${t}.${corps}`).digest('hex');
  return v1.some((s) => s.length === attendu.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(attendu)));
}

router.post('/stripe-webhook', async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(503).send('webhook non configuré');
  const corps = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  if (!signatureValide(corps, req.headers['stripe-signature'], secret)) return res.status(400).send('signature invalide');
  let evt;
  try { evt = JSON.parse(corps); } catch { return res.status(400).send('json invalide'); }
  try {
    if (evt.type === 'checkout.session.completed' || evt.type === 'checkout.session.async_payment_succeeded') {
      const s = evt.data?.object || {};
      const id = s.metadata?.commande_id;
      if (id && s.payment_status === 'paid') {
        const supa = getSupabaseAdmin();
        const { data: c } = await supa.from('commandes').select('id, statut, offre').eq('id', id).maybeSingle();
        if (c && c.statut !== 'payee') {
          await supa.from('commandes').update({
            statut: 'payee', paye_le: new Date().toISOString(), montant_ttc_cents: s.amount_total ?? null,
            stripe_session_id: s.id, email: s.customer_details?.email || undefined, updated_at: new Date().toISOString(),
          }).eq('id', id);
          console.log('[paiement] commande payée', id, s.amount_total);
        }
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error('[stripe webhook]', e.message);
    res.status(500).send('erreur');
  }
});

module.exports = router;
