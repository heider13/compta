// Lecture d'une formalité du Guichet unique INPI : résumé, pièces jointes et
// demandes de régularisation du greffe. Partagé par la route /api/inpi et par
// l'agent formalités (outils lire_formalite_inpi / lire_piece_inpi).

const inpi = require('../inpi');

const TYPE_LABELS = { C: 'Création', M: 'Modification', R: 'Radiation' };

const REGUL_TYPES = {
  MISSING_ATTACHMENTS: 'Pièce manquante ou non conforme',
  PAYMENT_ISSUE: 'Paiement à régulariser',
  DATA_ERROR: 'Donnée à corriger',
  OTHER: 'Autre demande',
};

async function listAllAttachments(client, formalityId) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const r = await client.request(`/api/formalities/${formalityId}/attachments`, { query: { page } });
    const items = r?.['hydra:member'] || [];
    out.push(...items);
    const total = r?.['hydra:totalItems'] ?? items.length;
    if (out.length >= total || !items.length) break;
  }
  return out;
}

function mapAttachment(a) {
  return {
    id: a.id,
    nom: a.nomDocument,
    type: a.typeDocument,
    sousType: a.sousTypeDocument || null,
    taille: a.size,
    deposant: a.depositor,
    conformite: a.compliance,
    statut: a.status,
    regularisable: a.regularisable,
    extension: a.documentExtension || 'pdf',
    date: a.created,
  };
}

function mapRegularisations(validationsRequests = []) {
  return validationsRequests.map((vr) => ({
    partenaire: vr.partner?.libelleCourt || vr.partner?.codifNorme || null,
    statut: vr.status,
    observation: vr.validationObservation || null,
    motifsRejet: vr.rejectionReasons || null,
    demandes: (vr.regularizationRequests || []).map((rr) => ({
      id: rr.id,
      statut: rr.status,
      echeance: rr.deadline || null,
      date: rr.created,
      objets: (rr.regularizationObjects || []).map((o) => ({
        type: o.type,
        libelle: REGUL_TYPES[o.type] || o.type,
        observation: o.observation ? String(o.observation).trim() : '',
        champ: o.fieldName || null,
        pieceId: o.attachment?.id || null,
      })),
    })),
  }));
}

// Résumé lisible d'une formalité (pour l'UI et pour l'agent).
async function getFormalitySummary(orgId, formalityId) {
  const client = inpi.forOrg(orgId);
  const [d, attachments] = await Promise.all([
    client.getFormality(formalityId),
    listAllAttachments(client, formalityId),
  ]);
  const regularisations = mapRegularisations(d.validationsRequests);
  const demandesEnCours = regularisations.flatMap((r) =>
    r.demandes.filter((x) => x.statut !== 'REGULARIZED').map((x) => ({ ...x, partenaire: r.partenaire })),
  );
  return {
    id: d.id,
    liasse: d.liasseNumber,
    societe: d.companyName || d.nomDossier || null,
    siren: d.siren || null,
    formeJuridique: d.formeJuridique || null,
    type: d.typeFormalite,
    typeLabel: TYPE_LABELS[d.typeFormalite] || d.typeFormalite,
    statut: d.status,
    dateStatut: d.statusDate,
    dateSignature: d.signedDate || null,
    lieuSignature: d.signedPlace || null,
    referenceMandataire: d.referenceMandataire || null,
    observationDeclarant: d.observationSignature || null,
    evenements: d.events || [],
    codeApe: d.codeAPE || null,
    regularisations,
    demandesEnCours,
    pieces: attachments.map(mapAttachment),
    _content: d.content || null,
  };
}

// Télécharge une pièce, en vérifiant qu'elle appartient bien à la formalité.
async function downloadAttachment(orgId, formalityId, attachmentId) {
  const client = inpi.forOrg(orgId);
  if (formalityId != null) {
    const attachments = await listAllAttachments(client, formalityId);
    if (!attachments.some((a) => String(a.id) === String(attachmentId))) {
      const e = new Error("Cette pièce n'appartient pas à la formalité.");
      e.status = 404;
      throw e;
    }
  }
  const r = await client.rawFetch(`/api/attachments/${attachmentId}/file`);
  if (!r.ok) {
    const e = new Error(`Téléchargement INPI impossible (HTTP ${r.status}).`);
    e.status = r.status === 404 ? 404 : 502;
    throw e;
  }
  return {
    buffer: Buffer.from(await r.arrayBuffer()),
    contentType: r.headers.get('content-type') || 'application/pdf',
  };
}

module.exports = { getFormalitySummary, downloadAttachment, TYPE_LABELS };
