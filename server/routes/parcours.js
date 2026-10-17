// Parcours d'une formalité (panneau de droite du chat) : état des 5 étapes et actions
// humaines (envoi en signature, signature de la formalité, paiement). Voir lib/parcours.js.
const express = require('express');
const router = express.Router();
const parcours = require('../lib/parcours');
const { getSupabaseAdmin } = require('../lib/db');

const route = (fn) => (req, res) => fn(req, res).catch((e) => {
  const status = e.status && e.status < 600 ? (e.status >= 500 && e.status !== 502 ? 502 : e.status) : 500;
  if (status >= 500) console.error('[parcours]', req.method, req.path, e.message);
  res.status(status).json({ error: 'parcours', detail: String(e.message || 'Erreur').slice(0, 500) });
});

async function journal(req, action, dossierId, metadata = {}) {
  try {
    await getSupabaseAdmin().from('audit_logs').insert({ organization_id: req.currentOrgId, user_id: req.user.id, action: `parcours.${action}`, resource_type: 'dossier', resource_id: dossierId, metadata });
  } catch { /* best-effort */ }
}

router.get('/:id/parcours', route(async (req, res) => {
  res.json(await parcours.etat(getSupabaseAdmin(), req.currentOrgId, req.params.id));
}));

router.post('/:id/parcours/signature-client', route(async (req, res) => {
  await parcours.envoyerSignatureClient(getSupabaseAdmin(), req.currentOrgId, req.params.id, req.body || {});
  await journal(req, 'signature_client.envoyee', req.params.id, { signataires: (req.body?.signataires || []).length });
  res.json(await parcours.etat(getSupabaseAdmin(), req.currentOrgId, req.params.id));
}));

router.post('/:id/parcours/signature-inpi', route(async (req, res) => {
  const r = await parcours.signerFormalite(getSupabaseAdmin(), req.currentOrgId, req.params.id, { user: req.user, profile: req.profile });
  await journal(req, 'signature_inpi.ouverte', req.params.id);
  res.json({ ...(await parcours.etat(getSupabaseAdmin(), req.currentOrgId, req.params.id)), lien: r.lien });
}));

router.post('/:id/parcours/signature-simple', route(async (req, res) => {
  if (req.body?.confirme !== true) return res.status(400).json({ error: 'parcours', detail: 'Confirmation requise.' });
  await parcours.signatureSimple(getSupabaseAdmin(), req.currentOrgId, req.params.id);
  await journal(req, 'signature_inpi.simple', req.params.id);
  res.json(await parcours.etat(getSupabaseAdmin(), req.currentOrgId, req.params.id));
}));

router.post('/:id/parcours/annuler', route(async (req, res) => {
  const etape = req.body?.etape;
  if (!['signature_client', 'signature_inpi'].includes(etape)) return res.status(400).json({ error: 'parcours', detail: 'Étape invalide.' });
  await parcours.annulerSignature(getSupabaseAdmin(), req.currentOrgId, req.params.id, etape);
  await journal(req, `${etape}.annulee`, req.params.id);
  res.json(await parcours.etat(getSupabaseAdmin(), req.currentOrgId, req.params.id));
}));

router.post('/:id/parcours/payer', route(async (req, res) => {
  await parcours.payer(getSupabaseAdmin(), req.currentOrgId, req.params.id, req.body || {});
  await journal(req, 'paiement.compte_client', req.params.id, { montant_cents: req.body?.montant_cents });
  res.json(await parcours.etat(getSupabaseAdmin(), req.currentOrgId, req.params.id));
}));

router.post('/:id/parcours/deleguer', route(async (req, res) => {
  await parcours.deleguer(getSupabaseAdmin(), req.currentOrgId, req.params.id, req.body || {});
  await journal(req, 'paiement.delegation', req.params.id);
  res.json(await parcours.etat(getSupabaseAdmin(), req.currentOrgId, req.params.id));
}));

// Actions simples : appel de lib/parcours puis état à jour
const SIMPLES = {
  'reverser-actes': ['reverserActes', 'signature_client.reversement'],
  'redeclarer-signature': ['redeclarerSignature', 'signature_inpi.redeclaree'],
  'annonce-faite': ['annonceFaite', 'annonce.faite'],
  'verser-attestation': ['verserAttestation', 'annonce.attestation_versee'],
};
for (const [chemin, [fn, action]] of Object.entries(SIMPLES)) {
  router.post(`/:id/parcours/${chemin}`, route(async (req, res) => {
    await parcours[fn](getSupabaseAdmin(), req.currentOrgId, req.params.id);
    await journal(req, action, req.params.id);
    res.json(await parcours.etat(getSupabaseAdmin(), req.currentOrgId, req.params.id));
  }));
}

module.exports = router;
