// Routes signature électronique Yousign — endpoints exposés aux admins/cabinet.
// Suppose que requireUser + requireOrg ont été appliqués en amont
// (req.user, req.currentOrgId, req.currentOrgRole disponibles).
//
// Workflow MVP :
//   admin valide un dossier modif/cessation → POST /api/dossiers/:id/sign-request
//   → Yousign envoie email au signataire → webhook met le dossier à VALIDATED_INTERNAL
//
// Le PDF à signer est récupéré depuis dossier_documents (doc_type='PJ_99', synthèse INPI).
// Si absent, un PDF placeholder minimal est généré pour le MVP.

const express = require('express');
const router = express.Router();

const yousign = require('../lib/yousign');
const { getSupabaseAdmin } = require('../lib/db');

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

// Petit PDF placeholder valide (1 page A4 blanche) — utilisé si la synthèse n'existe pas encore.
// Évite de bloquer le flow signature en MVP. À remplacer par la vraie synthèse INPI.
function buildPlaceholderPdf(dossierRef, clientName) {
  // Mini PDF brut (1 page) — quelque chose de signable.
  const content = `BT /F1 14 Tf 60 760 Td (Dossier ${dossierRef || '—'}) Tj 0 -22 Td (Client : ${clientName || '—'}) Tj 0 -22 Td (Document de synthese - placeholder MVP) Tj 0 -22 Td (Signature requise pour transmission INPI.) Tj ET`;
  const objects = [
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj',
    `4 0 obj<</Length ${content.length}>>stream\n${content}\nendstream endobj`,
    '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

// Récupère le PDF de synthèse (PJ_99) du dossier, sinon génère un placeholder.
async function fetchSynthesisPdf(supa, dossier) {
  // Tente d'abord la pièce PJ_99 / synthèse INPI
  const { data: docs } = await supa
    .from('dossier_documents')
    .select('id, name, file_path, mime_type, doc_type')
    .eq('dossier_id', dossier.id);

  let target = (docs || []).find(
    (d) => d.doc_type === 'PJ_99' || /synthese|synthèse/i.test(d.name || ''),
  );
  // Fallback : 1er PDF du dossier
  if (!target) {
    target = (docs || []).find((d) => (d.mime_type || '').includes('pdf'));
  }

  if (target?.file_path) {
    const { data, error } = await supa.storage.from('dossier-docs').download(target.file_path);
    if (!error && data) {
      const ab = await data.arrayBuffer();
      return {
        buffer: Buffer.from(ab),
        filename: target.name || `synthese-${dossier.reference || dossier.id}.pdf`,
        sourceDocId: target.id,
      };
    }
  }

  return {
    buffer: buildPlaceholderPdf(dossier.reference, dossier.client_name),
    filename: `synthese-placeholder-${dossier.reference || dossier.id}.pdf`,
    sourceDocId: null,
  };
}

// Patch idempotent du metadata d'un dossier (la colonne peut ne pas exister).
// On essaye d'écrire dans `metadata` (jsonb) ; si la colonne n'existe pas, on
// retombe sur un insert dans `dossier_observations` pour ne pas perdre l'info.
async function patchDossierSignatureMeta(supa, dossierId, patch) {
  // Récupère metadata courante
  const { data: current, error: readErr } = await supa
    .from('dossiers')
    .select('metadata')
    .eq('id', dossierId)
    .maybeSingle();

  if (!readErr && current) {
    const next = { ...(current.metadata || {}), ...patch };
    const { error: upErr } = await supa
      .from('dossiers')
      .update({ metadata: next })
      .eq('id', dossierId);
    if (!upErr) return { stored: 'metadata' };
  }

  // Fallback : colonne metadata absente → on log juste une observation système
  await supa.from('dossier_observations').insert({
    dossier_id: dossierId,
    author_id: null,
    author_role: 'admin',
    message: `[yousign] ${JSON.stringify(patch)}`,
  });
  return { stored: 'observation_fallback' };
}

async function readDossierSignatureMeta(supa, dossierId) {
  const { data, error } = await supa
    .from('dossiers')
    .select('metadata')
    .eq('id', dossierId)
    .maybeSingle();
  if (error || !data) return {};
  return data.metadata || {};
}

// ─── POST /api/dossiers/:id/sign-request ──────────────────
router.post(
  '/:id/sign-request',
  asyncRoute(async (req, res) => {
    const { signer } = req.body || {};
    if (!signer || !signer.firstName || !signer.lastName || !signer.email) {
      return res.status(400).json({
        error: 'missing_fields',
        required: ['signer.firstName', 'signer.lastName', 'signer.email'],
      });
    }

    const supa = getSupabaseAdmin();
    const { data: dossier, error: dErr } = await supa
      .from('dossiers')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (dErr || !dossier) return res.status(404).json({ error: 'not_found' });

    // Sécurité : le user doit appartenir à l'org du dossier (ou être admin global).
    const isAdmin = req.profile?.role === 'admin';
    const isOwnerOfDossier = dossier.user_id === req.user.id;
    const isOrgMember =
      dossier.organization_id && dossier.organization_id === req.currentOrgId;
    if (!isAdmin && !isOwnerOfDossier && !isOrgMember) {
      return res.status(403).json({ error: 'forbidden' });
    }

    // Évite les doublons : si une demande est déjà en cours, on renvoie l'existante
    const meta = await readDossierSignatureMeta(supa, dossier.id);
    if (meta.signature_request_id && meta.signature_status &&
        ['ongoing', 'pending', 'approval'].includes(meta.signature_status)) {
      return res.json({
        signatureRequestId: meta.signature_request_id,
        signatureLink: meta.signature_link || null,
        status: meta.signature_status,
        alreadyExists: true,
      });
    }

    // 1. Récupérer le PDF de synthèse
    const pdf = await fetchSynthesisPdf(supa, dossier);
    const base64Pdf = pdf.buffer.toString('base64');

    // 2. Créer la signature request
    const sr = await yousign.createSignatureRequest({
      name: `${dossier.client_name} — ${dossier.type_formalite} — ${dossier.reference || dossier.id.slice(0, 8)}`,
    });

    // 3. Upload PDF
    const doc = await yousign.uploadDocument(sr.id, {
      filename: pdf.filename,
      base64Pdf,
      nature: 'signable_document',
    });

    // 4. Ajouter signataire avec champ signature (position bas-droite par défaut)
    const signerResult = await yousign.addSigner(sr.id, {
      firstName: signer.firstName,
      lastName: signer.lastName,
      email: signer.email,
      phoneNumber: signer.phoneNumber || undefined,
      fields: [
        {
          document_id: doc.id,
          type: 'signature',
          page: 1,
          x: 350,
          y: 100,
          width: 200,
          height: 60,
        },
      ],
    });

    // 5. Activer (envoi de l'email signataire)
    await yousign.activate(sr.id);

    // 6. Persister metadata + audit log
    const patch = {
      signature_request_id: sr.id,
      signature_provider: 'yousign',
      signature_status: 'ongoing',
      signature_signer_email: signer.email,
      signature_source_document_id: pdf.sourceDocId,
      signature_requested_at: new Date().toISOString(),
      signature_link: signerResult.signature_link || null,
    };
    await patchDossierSignatureMeta(supa, dossier.id, patch);

    try {
      await supa.from('audit_logs').insert({
        organization_id: dossier.organization_id || req.currentOrgId,
        user_id: req.user.id,
        action: 'dossier.signature.requested',
        resource_type: 'dossier',
        resource_id: dossier.id,
        metadata: {
          signature_request_id: sr.id,
          provider: 'yousign',
          signer_email: signer.email,
        },
      });
    } catch {
      // best-effort
    }

    res.status(201).json({
      signatureRequestId: sr.id,
      signatureLink: signerResult.signature_link || null,
      status: 'ongoing',
    });
  }),
);

// ─── GET /api/dossiers/:id/sign-status ────────────────────
router.get(
  '/:id/sign-status',
  asyncRoute(async (req, res) => {
    const supa = getSupabaseAdmin();
    const { data: dossier, error: dErr } = await supa
      .from('dossiers')
      .select('id, user_id, organization_id, metadata')
      .eq('id', req.params.id)
      .maybeSingle();
    if (dErr || !dossier) return res.status(404).json({ error: 'not_found' });

    const isAdmin = req.profile?.role === 'admin';
    const isOwnerOfDossier = dossier.user_id === req.user.id;
    const isOrgMember =
      dossier.organization_id && dossier.organization_id === req.currentOrgId;
    if (!isAdmin && !isOwnerOfDossier && !isOrgMember) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const meta = dossier.metadata || {};
    if (!meta.signature_request_id) {
      return res.json({ configured: false, status: null });
    }

    let live = null;
    try {
      live = await yousign.getStatus(meta.signature_request_id);
    } catch (e) {
      return res.status(502).json({
        error: 'yousign_request_failed',
        detail: String(e.message),
        cached: meta,
      });
    }

    res.json({
      configured: true,
      signatureRequestId: meta.signature_request_id,
      signatureLink: meta.signature_link || null,
      status: live?.status || meta.signature_status,
      requestedAt: meta.signature_requested_at || null,
      signers: live?.signers || [],
      documents: live?.documents || [],
    });
  }),
);

module.exports = router;
