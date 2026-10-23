// Webhook DocuSign Connect — endpoint PUBLIC (c'est DocuSign qui pousse).
// Sécurité : HMAC SHA-256 du corps brut, encodé en base64, dans X-DocuSign-Signature-1
// (jusqu'à -100 si plusieurs clés sont actives), clé = DOCUSIGN_CONNECT_SECRET.
// Format attendu : JSON « SIM » (Connect 2.0) : { event: 'envelope-completed', data: { envelopeId } }.
//
// Les événements sont ramenés au vocabulaire Yousign, puis traités comme les siens
// (parcours du chat, ou ancien flux /dossiers/:id/sign).

const express = require('express');
const crypto = require('node:crypto');
const router = express.Router();

const { docusign } = require('../lib/signature');
const { getSupabaseAdmin } = require('../lib/db');
const { traiterEvenement } = require('./yousign-webhook');

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

function signatureValide(rawBody, entetes, secret) {
  if (!secret || !rawBody?.length) return false;
  const attendu = crypto.createHmac('sha256', secret).update(rawBody).digest();
  for (let i = 1; i <= 100; i += 1) {
    const valeur = entetes[`x-docusign-signature-${i}`];
    if (!valeur) break;
    const fourni = Buffer.from(String(valeur).trim(), 'base64');
    if (fourni.length === attendu.length && crypto.timingSafeEqual(fourni, attendu)) return true;
  }
  return false;
}

// Événements Connect → événements Yousign attendus par le traitement commun
const EVENEMENTS = {
  'envelope-completed': 'signature_request.done',
  'envelope-declined': 'signature_request.declined',
  'recipient-declined': 'signature_request.declined',
  'envelope-voided': 'signature_request.canceled',
};

router.post(
  '/webhook',
  asyncRoute(async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    const secret = process.env.DOCUSIGN_CONNECT_SECRET;
    if (!signatureValide(rawBody, req.headers, secret)) {
      console.warn(`[docusign-webhook] ${secret ? 'HMAC invalide' : 'DOCUSIGN_CONNECT_SECRET non défini'} — webhook rejeté`);
      return res.status(401).json({ error: 'invalid_signature' });
    }

    let event;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'invalid_json' });
    }
    const envelopeId = event?.data?.envelopeId;
    let nom = EVENEMENTS[event?.event];
    if (!envelopeId || !nom) return res.status(200).json({ ok: true, ignored: event?.event || 'inconnu' });

    // Une enveloppe expirée est « annulée » par DocuSign : on lit le motif pour la distinguer
    if (nom === 'signature_request.canceled') {
      try {
        if ((await docusign.getStatus(envelopeId)).status === 'expired') nom = 'signature_request.expired';
      } catch { /* motif illisible : reste une annulation */ }
    }

    const [code, reponse] = await traiterEvenement(getSupabaseAdmin(), docusign, String(envelopeId).toLowerCase(), nom);
    return res.status(code).json(reponse);
  }),
);

module.exports = router;
