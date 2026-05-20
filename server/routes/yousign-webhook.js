// Webhook Yousign — endpoint PUBLIC (pas d'auth user, c'est Yousign qui pousse).
// Sécurité : vérification HMAC SHA-256 du body brut via YOUSIGN_WEBHOOK_SECRET.
//
// Yousign envoie sur événements signature_request.{done,declined,expired,activated,…}
// On ne traite que :
//   - signature_request.done  → dossier passé à VALIDATED_INTERNAL + PDF signé stocké
//   - signature_request.declined / expired → log + metadata.signature_status mis à jour
//
// Configuration : monter ce router avec express.raw() pour avoir le buffer brut.

const express = require('express');
const crypto = require('node:crypto');
const router = express.Router();

const yousign = require('../lib/yousign');
const { getSupabaseAdmin } = require('../lib/db');

const SIGNED_BUCKET = 'dossier-docs';

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

// Yousign signe avec HMAC-SHA256. Le header est `X-Yousign-Signature-256`
// au format `sha256=<hex>` (similaire GitHub) selon la doc v3 :
// https://developers.yousign.com/docs/webhook-events-overview
function verifySignature(rawBody, headerVal, secret) {
  if (!secret) return false;
  if (!headerVal || !rawBody) return false;
  const value = String(headerVal).replace(/^sha256=/i, '').trim();
  let provided;
  try {
    provided = Buffer.from(value, 'hex');
  } catch {
    return false;
  }
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  if (provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

// Trouve le dossier qui contient ce signature_request_id dans metadata.
async function findDossierBySignatureRequest(supa, signatureRequestId) {
  // Filtre Postgres JSON : metadata->>signature_request_id = ?
  const { data, error } = await supa
    .from('dossiers')
    .select('id, statut, organization_id, user_id, client_name, reference, metadata')
    .eq('metadata->>signature_request_id', signatureRequestId)
    .maybeSingle();
  if (error) return null;
  return data || null;
}

async function patchDossierMeta(supa, dossierId, patch) {
  const { data: current } = await supa
    .from('dossiers')
    .select('metadata')
    .eq('id', dossierId)
    .maybeSingle();
  const next = { ...(current?.metadata || {}), ...patch };
  await supa.from('dossiers').update({ metadata: next }).eq('id', dossierId);
}

async function uploadSignedPdf(supa, dossier, signatureRequestId, documentId, pdfBuffer) {
  const storagePath = `signed/${dossier.id}/${signatureRequestId}-${documentId}.pdf`;
  const { error: upErr } = await supa.storage
    .from(SIGNED_BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });
  if (upErr) throw new Error(`storage_upload_failed: ${upErr.message}`);

  // Insert dossier_documents (doc_type signed / status SIGNE)
  const { data: docRow } = await supa
    .from('dossier_documents')
    .insert({
      dossier_id: dossier.id,
      name: `Synthèse signée — ${dossier.reference || dossier.id.slice(0, 8)}.pdf`,
      file_path: storagePath,
      size_bytes: pdfBuffer.length,
      mime_type: 'application/pdf',
      status: 'SIGNE',
    })
    .select()
    .maybeSingle();

  return { storagePath, docId: docRow?.id || null };
}

// ─── POST /webhook ────────────────────────────────────────
// IMPORTANT : monté en express.raw() depuis server.js pour avoir req.body en Buffer.
router.post(
  '/webhook',
  asyncRoute(async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    const secret = process.env.YOUSIGN_WEBHOOK_SECRET;

    // Vérification HMAC obligatoire en prod
    const sigHeader =
      req.headers['x-yousign-signature-256'] ||
      req.headers['x-yousign-signature'] ||
      '';
    const ok = verifySignature(rawBody, sigHeader, secret);
    if (!ok) {
      // En l'absence de secret on REFUSE (sécurité critique du webhook)
      if (!secret) {
        console.warn('[yousign-webhook] YOUSIGN_WEBHOOK_SECRET non défini — webhook rejeté');
      } else {
        console.warn('[yousign-webhook] HMAC invalide — webhook rejeté');
      }
      return res.status(401).json({ error: 'invalid_signature' });
    }

    let event;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'invalid_json' });
    }

    const eventName = event?.event_name || event?.event_id || '';
    const signatureRequest = event?.signature_request || {};
    const signatureRequestId = signatureRequest.id;

    if (!signatureRequestId) {
      console.warn('[yousign-webhook] event sans signature_request.id:', eventName);
      return res.status(200).json({ ok: true, skipped: 'no_signature_request_id' });
    }

    const supa = getSupabaseAdmin();
    const dossier = await findDossierBySignatureRequest(supa, signatureRequestId);
    if (!dossier) {
      console.warn(`[yousign-webhook] aucun dossier ne référence ${signatureRequestId}`);
      // 200 pour qu'Yousign ne retente pas en boucle
      return res.status(200).json({ ok: true, skipped: 'dossier_not_found' });
    }

    // Audit log de l'événement
    try {
      await supa.from('audit_logs').insert({
        organization_id: dossier.organization_id,
        user_id: null,
        action: `dossier.signature.${eventName}`,
        resource_type: 'dossier',
        resource_id: dossier.id,
        metadata: {
          signature_request_id: signatureRequestId,
          event_name: eventName,
          provider: 'yousign',
        },
      });
    } catch {
      // best-effort
    }

    // Dispatch par event_name. Yousign v3 utilise `signature_request.done`
    // mais on accepte aussi les variantes ".signed" pour robustesse.
    const isDone =
      eventName === 'signature_request.done' ||
      eventName === 'signature_request.signed';
    const isDeclined = eventName === 'signature_request.declined';
    const isExpired = eventName === 'signature_request.expired';

    if (isDone) {
      try {
        // Récupère le détail pour avoir les document_id
        const detail = await yousign.getStatus(signatureRequestId);
        const docs = detail?.documents || [];

        const uploadedPaths = [];
        for (const d of docs) {
          if (d.nature && d.nature !== 'signable_document' && d.nature !== 'attachment') continue;
          let pdfBuf;
          try {
            pdfBuf = await yousign.downloadSignedDocument(signatureRequestId, d.id);
          } catch (e) {
            console.error(`[yousign-webhook] download failed ${d.id}: ${e.message}`);
            continue;
          }
          try {
            const up = await uploadSignedPdf(supa, dossier, signatureRequestId, d.id, pdfBuf);
            uploadedPaths.push(up.storagePath);
          } catch (e) {
            console.error(`[yousign-webhook] upload supabase failed: ${e.message}`);
          }
        }

        // Update dossier : statut → VALIDATED_INTERNAL + metadata
        const nextStatus =
          dossier.statut === 'VALIDATED' || dossier.statut === 'VALIDATED_INTERNAL'
            ? dossier.statut
            : 'VALIDATED_INTERNAL';

        await supa
          .from('dossiers')
          .update({ statut: nextStatus })
          .eq('id', dossier.id);

        await patchDossierMeta(supa, dossier.id, {
          signature_status: 'signed',
          signature_signed_at: new Date().toISOString(),
          signature_signed_paths: uploadedPaths,
        });

        return res.status(200).json({ ok: true, status: 'signed', uploaded: uploadedPaths.length });
      } catch (e) {
        console.error(`[yousign-webhook] erreur traitement done: ${e.message}`);
        // Renvoyer 500 → Yousign retente
        return res.status(500).json({ error: 'processing_failed', detail: String(e.message) });
      }
    }

    if (isDeclined || isExpired) {
      const finalStatus = isDeclined ? 'declined' : 'expired';
      await patchDossierMeta(supa, dossier.id, {
        signature_status: finalStatus,
        [`signature_${finalStatus}_at`]: new Date().toISOString(),
      });
      return res.status(200).json({ ok: true, status: finalStatus });
    }

    // Autres events (activated, reminder_executed, …) : on accuse réception sans rien faire.
    return res.status(200).json({ ok: true, ignored: eventName });
  }),
);

module.exports = router;
