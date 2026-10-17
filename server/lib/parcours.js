// Parcours d'une formalité préparée par l'agent (chat du tableau de bord), en 5 étapes :
//   1. formalite        brouillon créé au Guichet unique (statut SIGNATURE_PENDING)
//   2. annonce          annonce légale rédigée (si la formalité en exige une)
//   3. signature_client actes rédigés par le cabinet, signés par le client (Yousign, e-mail),
//                       puis versés automatiquement sur la formalité du Guichet unique
//   4. signature_inpi   synthèse de la formalité (PJ_99) signée par le formaliste avec Yousign
//                       (signature électronique avancée), renvoyée en PJ_115 puis
//                       POST /api/signatures — ou signature simple pour une création
//   5. paiement         compte client INPI du cabinet (POST /api/payment) ou délégation de
//                       paiement au client (POST /api/delegation-payments)
// Spécification : contrat d'interface « API mandataire de dépôt » INPI, chap. 6 et 7.
//
// Les signatures et le paiement sont toujours déclenchés par un humain (bouton) :
// l'agent IA ne signe ni ne paie jamais.

const inpi = require('../inpi');
const yousign = require('./yousign');
const { toPdf, PIECES, PIECES_EI, PIECES_MODIF } = require('./inpi-liasse');
const { paiementDe, emailsCabinet, lienGuichet } = require('./inpi-paiement');

const BUCKET = 'dossier-docs';
const ETAPES = ['formalite', 'annonce', 'signature_client', 'signature_inpi', 'paiement'];

// Statuts Guichet unique (contrat d'interface § 9.1)
const STATUT_GU = {
  DRAFT: 'brouillon', SIGNATURE_PENDING: 'en attente de signature', SIGNED: 'signée',
  PAYMENT_PENDING: 'en attente de paiement', PAYMENT_VALIDATION_PENDING: 'paiement en cours de validation',
  PAID: 'payée', RECEIVED: 'reçue', VALIDATION_PENDING: 'en cours de validation par le greffe',
  AMENDMENT_PENDING: 'régularisation demandée', AMENDMENT_SIGNATURE_PENDING: 'régularisation à signer',
  AMENDMENT_PAYMENT_PENDING: 'régularisation à payer', AMENDED: 'régularisée', EXPIRED: 'expirée',
  REJECTED: 'rejetée', VALIDATED: 'validée', ERROR: 'en erreur',
};
const A_SIGNER = new Set(['SIGNATURE_PENDING', 'AMENDMENT_SIGNATURE_PENDING']);
const SIGNEE = new Set(['SIGNED', 'PAYMENT_PENDING', 'PAYMENT_VALIDATION_PENDING', 'PAID', 'RECEIVED', 'VALIDATION_PENDING', 'AMENDMENT_PENDING', 'AMENDMENT_PAYMENT_PENDING', 'AMENDED', 'EXPIRED', 'VALIDATED', 'REJECTED']);
const PAYEE = new Set(['PAID', 'RECEIVED', 'VALIDATION_PENDING', 'AMENDMENT_PENDING', 'AMENDED', 'EXPIRED', 'VALIDATED', 'REJECTED']);
const A_PAYER = new Set(['PAYMENT_PENDING', 'AMENDMENT_PAYMENT_PENDING']);

// Actes rédigés par le cabinet → catégorie de pièce au Guichet unique
const CATEGORIE_CREATION = {
  STATUTS: 'STATUTS', DECLARATION_NON_CONDAMNATION: 'NON_CONDAMNATION', LISTE_SOUSCRIPTEURS: 'LISTE_SOUSCRIPTEURS',
  POUVOIR_FORMALITES: 'MANDAT', ATTESTATION_HEBERGEMENT: 'ATTESTATION_HEBERGEMENT', ATTESTATION_DOMICILIATION: 'ATTESTATION_HEBERGEMENT',
};
const CATEGORIE_MODIF = {
  PV_DECISION: 'PV_DECISION', PV_DISSOLUTION: 'PV_DECISION', DECISION_NOMINATION: 'PV_DECISION',
  STATUTS_MIS_A_JOUR: 'STATUTS_MIS_A_JOUR', ACTE_CESSION: 'ACTE_CESSION', DECLARATION_NON_CONDAMNATION: 'NON_CONDAMNATION',
  POUVOIR_FORMALITES: 'MANDAT', PV_MISE_EN_SOMMEIL: 'PV_MISE_EN_SOMMEIL', PV_CLOTURE_LIQUIDATION: 'PV_CLOTURE_LIQUIDATION',
};
// Documents qui ne se signent pas (annonce, courriers, pièces du client)
const NON_SIGNABLES = new Set(['ANNONCE_LEGALE', 'REPONSE_GREFFE', 'PIECE_JOINTE', 'ACTE_RNE', 'COMPTES_ANNUELS', 'AUTRE']);

// Opérations de modification qui imposent une annonce légale
const OPS_AVEC_ANNONCE = new Set(['siege', 'denomination', 'objet', 'nomination', 'revocation', 'dissolution', 'clotureLiquidation', 'capital', 'formeJuridique', 'duree']);

const yousignConfigure = () => Boolean(process.env.YOUSIGN_API_KEY);
const paiementCompteConfigure = () => Boolean(process.env.INPI_CCL_LOGIN && process.env.INPI_CCL_PASSWORD);

// ─── Caches courts : le panneau se rafraîchit souvent, le Guichet unique et Yousign non ───
const cacheGU = new Map(); // `${orgId}|${id}` → { exp, f }
async function formaliteGU(orgId, id, { frais = false } = {}) {
  const k = `${orgId}|${id}`;
  const hit = cacheGU.get(k);
  if (!frais && hit && hit.exp > Date.now()) return hit.f;
  const f = await inpi.forOrg(orgId).getFormality(id);
  cacheGU.set(k, { exp: Date.now() + 20000, f });
  return f;
}
const oublierGU = (orgId, id) => cacheGU.delete(`${orgId}|${id}`);

const cacheYS = new Map(); // requestId → { exp, s }
async function statutYousign(requestId) {
  const hit = cacheYS.get(requestId);
  if (hit && hit.exp > Date.now()) return hit.s;
  const s = await yousign.getStatus(requestId);
  cacheYS.set(requestId, { exp: Date.now() + 15000, s });
  return s;
}

const verrous = new Set(); // finalisations en cours (une seule à la fois par demande)

// ─── Accès aux données ─────────────────────────────────────────────
async function chargerDossier(supa, orgId, dossierId) {
  const { data } = await supa.from('dossiers').select('*').eq('id', dossierId).eq('organization_id', orgId).maybeSingle();
  return data || null;
}
async function documentsDe(supa, dossierId) {
  const { data } = await supa.from('dossier_documents')
    .select('id, name, file_path, mime_type, doc_type, status, created_at').eq('dossier_id', dossierId).order('created_at');
  return data || [];
}
async function majParcours(supa, dossierId, patch, extra = {}) {
  const { data } = await supa.from('dossiers').select('metadata').eq('id', dossierId).maybeSingle();
  const meta = data?.metadata || {};
  const parcours = { ...(meta.parcours || {}) };
  for (const [k, v] of Object.entries(patch)) parcours[k] = v === null ? undefined : { ...(parcours[k] || {}), ...v };
  await supa.from('dossiers').update({ metadata: { ...meta, ...extra, parcours } }).eq('id', dossierId);
  return parcours;
}
const formaliteId = (meta) => meta?.inpi_formality_id || meta?.inpi_draft_id || null;
const estEI = (data) => ['AE', 'EI', 'MICRO'].includes(String(data?.formeJuridique || '').toUpperCase());

function annonceRequise(data, gu, meta = {}) {
  if (estEI(data)) return false;
  const type = String(data?.typeFormalite || '').toUpperCase();
  if (type === 'CREATION' || gu?.typeFormalite === 'C') return true;
  const ops = meta.inpi_operations || (data?.operations || []).map((o) => o.type || o);
  if (ops.length) return ops.some((o) => OPS_AVEC_ANNONCE.has(o));
  return ['MODIFICATION', 'DISSOLUTION', 'RADIATION', 'CESSATION'].includes(type) || gu?.typeFormalite === 'M' || gu?.typeFormalite === 'R';
}

// Actes rédigés par le cabinet qui attendent la signature du client
function actesASigner(docs) {
  return docs.filter((d) => d.status === 'GENERE' && d.doc_type && !NON_SIGNABLES.has(d.doc_type));
}

function categorieGU(docType, gu, data) {
  const creation = gu?.typeFormalite === 'C' || String(data?.typeFormalite || '').toUpperCase() === 'CREATION';
  if (creation) {
    const c = CATEGORIE_CREATION[docType];
    const carte = estEI(data) ? PIECES_EI : PIECES;
    return c && carte[c] ? { categorie: c, carte } : null;
  }
  const c = CATEGORIE_MODIF[docType];
  return c && PIECES_MODIF[c] ? { categorie: c, carte: PIECES_MODIF } : null;
}

// Signataires proposés : dirigeant et associés du dossier (e-mail à compléter si absent)
function signatairesProposes(data) {
  const vus = new Set();
  const out = [];
  for (const p of [data?.dirigeant, ...(data?.associes || []), data?.cession?.cedant, data?.cession?.cessionnaire]) {
    if (!p?.nom) continue;
    const prenom = (p.prenoms || [])[0] || p.prenom || '';
    const cle = `${prenom}|${p.nom}`.toLowerCase();
    if (vus.has(cle)) continue;
    vus.add(cle);
    out.push({ prenom, nom: String(p.nom).toUpperCase(), email: p.email || '', telephone: p.telephone || '' });
  }
  return out;
}

// ─── Synchronisation Yousign (webhook ou rafraîchissement du panneau) ───
// Statuts Yousign v3 : draft, ongoing, done, declined, expired, canceled, deleted, approval
async function synchroniser(supa, orgId, dossier) {
  const p = dossier.metadata?.parcours || {};
  if (!yousignConfigure()) return false;
  let change = false;
  for (const etape of ['signature_client', 'signature_inpi']) {
    const e = p[etape];
    if (!e?.request_id || !['envoyee', 'en_cours'].includes(e.statut)) continue;
    let s;
    try { s = await statutYousign(e.request_id); } catch { continue; }
    if (s?.status === 'done') {
      await finaliser(supa, orgId, dossier.id, etape, e.request_id);
      change = true;
    } else if (['declined', 'expired', 'canceled', 'deleted'].includes(s?.status)) {
      await majParcours(supa, dossier.id, { [etape]: { statut: s.status === 'declined' ? 'refusee' : 'expiree', maj: new Date().toISOString() } });
      change = true;
    }
  }
  return change;
}

// Signature terminée : récupère les PDF signés et poursuit la chaîne (idempotent).
async function finaliser(supa, orgId, dossierId, etape, requestId) {
  const cle = `${dossierId}|${etape}|${requestId}`;
  if (verrous.has(cle)) return;
  verrous.add(cle);
  try {
    const dossier = await chargerDossier(supa, orgId, dossierId);
    const e = dossier?.metadata?.parcours?.[etape];
    if (!e || e.request_id !== requestId || ['signee', 'erreur_inpi'].includes(e.statut)) return;
    const detail = await yousign.getStatus(requestId);
    const docsYS = (detail?.documents || []).filter((d) => !d.nature || d.nature === 'signable_document');
    if (etape === 'signature_client') await finaliserClient(supa, orgId, dossier, e, requestId, docsYS);
    else await finaliserInpi(supa, orgId, dossier, e, requestId, docsYS);
  } finally {
    verrous.delete(cle);
  }
}

async function finaliserClient(supa, orgId, dossier, e, requestId, docsYS) {
  const meta = dossier.metadata || {};
  const data = meta.agent_data || {};
  const fid = formaliteId(meta);
  const gu = fid ? await formaliteGU(orgId, fid).catch(() => null) : null;
  const correspondances = e.documents || []; // [{ document_id, yousign_document_id, doc_type, name }]
  const versees = [];
  const erreurs = [];
  for (const c of correspondances) {
    if (!docsYS.some((d) => d.id === c.yousign_document_id)) continue;
    let pdf;
    try { pdf = await yousign.downloadSignedDocument(requestId, c.yousign_document_id); } catch (err) { erreurs.push(`${c.name} : téléchargement Yousign impossible`); continue; }
    const nom = `${String(c.name).replace(/\.(docx|pdf)$/i, '')} (signé).pdf`;
    const chemin = `signed/${dossier.id}/${requestId}-${c.yousign_document_id}.pdf`;
    const { error: upErr } = await supa.storage.from(BUCKET).upload(chemin, pdf, { contentType: 'application/pdf', upsert: true });
    if (upErr) { erreurs.push(`${c.name} : enregistrement impossible`); continue; }
    // L'acte devient « signé » : la version signée remplace la version rédigée dans le dossier
    await supa.from('dossier_documents').update({ status: 'SIGNE', name: nom, file_path: chemin, mime_type: 'application/pdf', size_bytes: pdf.length }).eq('id', c.document_id);
    const cat = categorieGU(c.doc_type, gu, data);
    if (fid && cat) {
      try {
        const spec = cat.carte[cat.categorie];
        await inpi.forOrg(orgId).request(`/api/formalities/${fid}/attachments`, {
          method: 'POST',
          body: {
            nomDocument: nom, typeDocument: spec.typeDocument, ...(spec.sousTypeDocument ? { sousTypeDocument: spec.sousTypeDocument } : {}),
            langueDocument: 'fr', documentBase64: pdf.toString('base64'), documentExtension: 'pdf', path: spec.path.replace(/\[0\]$/, ''),
          },
        });
        versees.push(nom);
      } catch (err) {
        erreurs.push(`${nom} : non versé au Guichet unique (${String(err.message).slice(0, 160)})`);
      }
    }
  }
  // Pièces ajoutées → la synthèse doit être régénérée avant la signature de la formalité (§ 6.4)
  if (fid && versees.length) {
    try { await inpi.forOrg(orgId).request(`/api/formalities/${fid}/refresh`); } catch { /* régénérée au moment de signer */ }
    oublierGU(orgId, fid);
  }
  await majParcours(supa, dossier.id, { signature_client: { statut: 'signee', signee_le: new Date().toISOString(), versees, erreurs } });
}

async function finaliserInpi(supa, orgId, dossier, e, requestId, docsYS) {
  const fid = formaliteId(dossier.metadata);
  const client = inpi.forOrg(orgId);
  const pieces = {};
  try {
    for (const [role, ysId] of Object.entries(e.yousign_documents || {})) {
      if (!docsYS.some((d) => d.id === ysId)) continue;
      const pdf = await yousign.downloadSignedDocument(requestId, ysId);
      const chemin = `signed/${dossier.id}/${requestId}-${role}.pdf`;
      await supa.storage.from(BUCKET).upload(chemin, pdf, { contentType: 'application/pdf', upsert: true });
      await supa.from('dossier_documents').insert({
        dossier_id: dossier.id, name: role === 'be' ? 'Synthèse bénéficiaires effectifs signée.pdf' : `Synthèse de la formalité signée — ${dossier.metadata?.inpi_liasse || fid}.pdf`,
        file_path: chemin, mime_type: 'application/pdf', size_bytes: pdf.length, status: 'SIGNE', doc_type: role === 'be' ? 'SYNTHESE_BE_SIGNEE' : 'SYNTHESE_SIGNEE',
      });
      // PJ_115 = synthèse signée ; PJ_120 = synthèse BE signée (§ 3.13 à 3.16, § 6.2)
      const att = await client.request(`/api/formalities/${fid}/attachments`, {
        method: 'POST',
        body: { nomDocument: `synthese_signee_${role}.pdf`, typeDocument: role === 'be' ? 'PJ_120' : 'PJ_115', langueDocument: 'fr', documentBase64: pdf.toString('base64'), documentExtension: 'pdf' },
      });
      pieces[role] = att?.id ?? att?.attachmentId;
    }
    if (!pieces.synthese) throw new Error('Synthèse signée introuvable dans la demande Yousign.');
    await client.request('/api/signatures', {
      method: 'POST',
      body: { formality: `/api/formalities/${fid}`, signedDocument: `/api/attachments/${pieces.synthese}`, ...(pieces.be ? { beSignedDocument: `/api/attachments/${pieces.be}` } : {}) },
    });
    oublierGU(orgId, fid);
    await majParcours(supa, dossier.id, { signature_inpi: { statut: 'signee', signee_le: new Date().toISOString(), mode: 'yousign', erreur: null } });
  } catch (err) {
    await majParcours(supa, dossier.id, { signature_inpi: { statut: 'erreur_inpi', erreur: `Signée sur Yousign, mais transmission au Guichet unique impossible : ${String(err.message).slice(0, 300)}` } });
  }
}

// ─── État du parcours (panneau de droite) ─────────────────────────
async function etat(supa, orgId, dossierId) {
  let dossier = await chargerDossier(supa, orgId, dossierId);
  if (!dossier) throw Object.assign(new Error('Dossier introuvable.'), { status: 404 });
  if (await synchroniser(supa, orgId, dossier)) dossier = await chargerDossier(supa, orgId, dossierId);
  const meta = dossier.metadata || {};
  const data = meta.agent_data || {};
  const p = meta.parcours || {};
  const docs = await documentsDe(supa, dossierId);
  const fid = formaliteId(meta);
  let gu = null;
  let erreurGU = null;
  if (fid) {
    try { gu = await formaliteGU(orgId, fid); } catch (e) { erreurGU = e.status === 404 ? 'Formalité introuvable sur le Guichet unique (supprimée ?).' : 'Guichet unique momentanément injoignable.'; }
  }
  const statutGU = gu?.status || null;
  const etapes = [];

  // 1. Formalité
  etapes.push({
    cle: 'formalite', titre: 'Réalisation de la formalité',
    statut: fid ? 'fait' : 'en_cours',
    detail: fid
      ? `Brouillon ${meta.inpi_liasse || gu?.liasseNumber || fid} au Guichet unique${statutGU ? ` · ${STATUT_GU[statutGU] || statutGU}` : ''}`
      : "L'agent rassemble les informations et prépare la liasse.",
    erreur: erreurGU,
    lien: fid ? `/inpi/${fid}` : null,
    actions: fid ? [] : [{ type: 'demander', label: 'Créer le brouillon au Guichet unique', message: 'Tout est prêt ? Crée le brouillon de la formalité au Guichet unique.' }],
  });

  // 2. Annonce légale
  const requise = annonceRequise(data, gu, meta);
  const annonces = meta.annonces_legales || [];
  const attestation = docs.some((d) => d.doc_type === 'ATTESTATION_PARUTION' || /attestation.*parution/i.test(d.name || ''));
  etapes.push({
    cle: 'annonce', titre: 'Annonce légale',
    statut: !requise ? 'sans_objet' : annonces.length ? 'fait' : fid ? 'a_faire' : 'a_venir',
    detail: !requise
      ? "Pas d'annonce légale pour cette formalité."
      : annonces.length
        ? `${annonces[annonces.length - 1].label} rédigée${attestation ? ' · attestation de parution jointe' : ' · joignez l’attestation de parution dès réception'}`
        : "L'annonce est rédigée par l'agent, prête à publier.",
    documents: docs.filter((d) => d.doc_type === 'ANNONCE_LEGALE').map((d) => ({ id: d.id, nom: d.name })),
    actions: requise && !annonces.length ? [{ type: 'demander', label: "Rédiger l'annonce légale", message: "Rédige l'annonce légale de cette formalité." }] : [],
  });

  // 3. Signature des actes par le client
  const aSigner = actesASigner(docs);
  const signes = docs.filter((d) => d.status === 'SIGNE' && !/^SYNTHESE/.test(d.doc_type || ''));
  const sc = p.signature_client || {};
  let statutSC;
  const annonceFaite = !requise || annonces.length > 0;
  if (['envoyee', 'en_cours'].includes(sc.statut)) statutSC = 'attente';
  else if (['refusee', 'expiree'].includes(sc.statut)) statutSC = 'bloque';
  else if (!aSigner.length) statutSC = signes.length || sc.statut === 'signee' ? 'fait' : 'sans_objet';
  else if (!fid || !annonceFaite) statutSC = 'a_venir';
  else statutSC = 'a_faire';
  etapes.push({
    cle: 'signature_client', titre: 'Signature des documents par le client',
    statut: statutSC,
    detail: statutSC === 'attente'
      ? `Envoyé à ${(sc.signataires || []).map((s) => `${s.prenom} ${s.nom}`).join(', ')} le ${new Date(sc.envoyee_le).toLocaleDateString('fr-FR')} · en attente de signature`
      : statutSC === 'bloque'
        ? `Signature ${sc.statut === 'refusee' ? 'refusée par un signataire' : 'expirée'} : renvoyez la demande.`
        : statutSC === 'fait'
          ? `${signes.length} acte(s) signé(s)${(sc.versees || []).length ? `, ${sc.versees.length} versé(s) au Guichet unique` : ''}`
          : statutSC === 'sans_objet' ? 'Aucun acte rédigé à faire signer.'
            : statutSC === 'a_venir' ? `${aSigner.length} acte(s) à faire signer, après ${fid ? "l'annonce légale" : 'la création du brouillon'}.`
              : `${aSigner.length} acte(s) à faire signer par le client.`,
    documents: (statutSC === 'fait' ? signes : aSigner).map((d) => ({ id: d.id, nom: d.name, signe: d.status === 'SIGNE' })),
    alertes: sc.erreurs?.length ? sc.erreurs : undefined,
    lienSignature: null,
    signataires: statutSC === 'a_faire' || statutSC === 'bloque' ? signatairesProposes(data) : undefined,
    actions: (statutSC === 'a_faire' || statutSC === 'bloque')
      ? [{ type: 'signature_client', label: 'Envoyer en signature au client', desactive: !yousignConfigure(), raison: yousignConfigure() ? null : 'Yousign n’est pas encore configuré (clé API à ajouter sur le serveur).' }]
      : statutSC === 'attente' ? [{ type: 'relancer_signature_client', label: 'Annuler et renvoyer', secondaire: true }] : [],
  });

  // 4. Signature électronique de la formalité (= signature au Guichet unique)
  const si = p.signature_inpi || {};
  const creation = gu?.typeFormalite === 'C';
  let statutSI;
  if (statutGU && SIGNEE.has(statutGU)) statutSI = 'fait';
  else if (si.statut === 'erreur_inpi') statutSI = 'bloque';
  else if (['envoyee', 'en_cours'].includes(si.statut)) statutSI = 'attente';
  else if (!fid || !A_SIGNER.has(statutGU || '')) statutSI = 'a_venir';
  else if (['attente', 'a_faire', 'bloque', 'a_venir'].includes(statutSC) && aSigner.length) statutSI = 'a_venir';
  else if (!annonceFaite) statutSI = 'a_venir';
  else statutSI = 'a_faire';
  etapes.push({
    cle: 'signature_inpi', titre: 'Signature électronique de la formalité',
    statut: statutSI,
    detail: statutSI === 'fait'
      ? `Formalité signée${si.mode === 'simple' ? ' (signature simple)' : si.mode === 'yousign' ? ' avec Yousign' : ''}.`
      : statutSI === 'attente' ? 'Signature Yousign ouverte : signez la synthèse pour la transmettre au Guichet unique.'
        : statutSI === 'bloque' ? si.erreur
          : statutSI === 'a_faire' ? `La synthèse de la formalité est prête à signer${creation ? ' (création : signature simple acceptée)' : ' (signature électronique avancée exigée)'}.`
            : !fid ? 'Après la création du brouillon.' : !annonceFaite ? "Après l'annonce légale." : 'Après la signature des documents par le client.',
    lienSignature: statutSI === 'attente' ? si.lien || null : null,
    actions: statutSI === 'a_faire' || statutSI === 'bloque'
      ? [
        { type: 'signature_inpi', label: 'Signer avec Yousign', desactive: !yousignConfigure(), raison: yousignConfigure() ? null : 'Yousign n’est pas encore configuré (clé API à ajouter sur le serveur).' },
        ...(creation ? [{ type: 'signature_simple', label: 'Signature simple', secondaire: true, confirmation: 'Signer la formalité par signature électronique simple (création) ? La signature est définitive.' }] : []),
      ]
      : statutSI === 'attente' ? [{ type: 'relancer_signature_inpi', label: 'Annuler et recommencer', secondaire: true }] : [],
  });

  // 5. Paiement
  let paiement = null;
  if (gu) {
    try { paiement = paiementDe(gu, await emailsCabinet(orgId)); } catch { paiement = null; }
  }
  const panier = (paiement?.paniers || []).find((c) => c.statut === 'TO_PAY') || (paiement?.paniers || [])[0] || null;
  const montant = panier ? panier.total_cents : null;
  let statutP;
  if (statutGU && PAYEE.has(statutGU)) statutP = 'fait';
  else if (statutGU && A_PAYER.has(statutGU)) statutP = p.paiement?.delegation_a ? 'attente' : 'a_faire';
  else if (statutSI === 'fait' && montant === 0) statutP = 'fait';
  else statutP = 'a_venir';
  const euros = (c) => `${(c / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  etapes.push({
    cle: 'paiement', titre: 'Paiement des frais du Guichet unique',
    statut: statutP,
    detail: statutP === 'fait'
      ? montant ? `Payé · ${euros(montant)}` : 'Formalité gratuite ou payée.'
      : statutP === 'attente' ? `Délégation envoyée à ${p.paiement.delegation_a} · ${montant != null ? euros(montant) : ''}`
        : montant === 0 ? 'Aucun frais au Guichet unique pour cette formalité.'
          : montant != null ? `${euros(montant)} à régler${statutP === 'a_venir' ? ' après la signature' : ''}.` : 'Montant connu après la création du brouillon.',
    montant_cents: montant,
    lienPaiement: gu && statutP !== 'fait' ? lienGuichet(gu).url : null,
    emailClient: data?.dirigeant?.email || '',
    actions: statutP === 'a_faire' || statutP === 'attente'
      ? [
        { type: 'payer', label: `Payer${montant != null ? ` ${euros(montant)}` : ''} avec le compte client INPI`, desactive: !paiementCompteConfigure(), raison: paiementCompteConfigure() ? null : 'Compte client INPI du cabinet non configuré : utilisez la délégation ou le paiement par carte sur le Guichet unique.', confirmation: `Payer ${montant != null ? euros(montant) : 'la formalité'} avec le compte client INPI du cabinet ?` },
        { type: 'deleguer', label: statutP === 'attente' ? 'Renvoyer la délégation' : 'Déléguer le paiement au client', secondaire: true },
      ]
      : [],
  });

  const courante = etapes.find((e) => ['a_faire', 'attente', 'bloque', 'en_cours'].includes(e.statut))?.cle || null;
  return {
    dossier: { id: dossier.id, reference: dossier.reference, denomination: dossier.client_name },
    formalite: fid ? { id: fid, liasse: meta.inpi_liasse || gu?.liasseNumber || null, statut: statutGU, statut_label: STATUT_GU[statutGU] || statutGU } : null,
    etapes, courante,
    termine: etapes.every((e) => ['fait', 'sans_objet'].includes(e.statut)),
    // Rafraîchir plus souvent quand on attend un tiers (signataire, paiement)
    rafraichir_ms: etapes.some((e) => e.statut === 'attente') ? 8000 : 30000,
  };
}

// ─── Actions ────────────────────────────────────────────────────
function champsSignature(documentYS, rang, nbPages) {
  const col = rang % 2;
  const ligne = Math.floor(rang / 2);
  return { document_id: documentYS, type: 'signature', page: nbPages || 1, x: 60 + col * 270, y: Math.max(40, 690 - ligne * 80), width: 200, height: 60 };
}

async function envoyerSignatureClient(supa, orgId, dossierId, { signataires }) {
  if (!yousignConfigure()) throw Object.assign(new Error('Yousign n’est pas configuré sur le serveur.'), { status: 400 });
  const liste = (signataires || []).map((s) => ({ prenom: String(s.prenom || '').trim(), nom: String(s.nom || '').trim(), email: String(s.email || '').trim(), telephone: String(s.telephone || '').trim() }));
  if (!liste.length) throw Object.assign(new Error('Indiquez au moins un signataire.'), { status: 400 });
  for (const s of liste) {
    if (!s.prenom || !s.nom) throw Object.assign(new Error('Prénom et nom de chaque signataire obligatoires.'), { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) throw Object.assign(new Error(`E-mail invalide pour ${s.prenom} ${s.nom}.`), { status: 400 });
  }
  const dossier = await chargerDossier(supa, orgId, dossierId);
  if (!dossier) throw Object.assign(new Error('Dossier introuvable.'), { status: 404 });
  const docs = actesASigner(await documentsDe(supa, dossierId));
  if (!docs.length) throw Object.assign(new Error('Aucun acte à faire signer.'), { status: 400 });

  // Conversion en PDF en parallèle (LibreOffice) : c'est l'étape la plus lente
  const pdfs = await Promise.all(docs.map(async (d) => {
    const { data: blob, error } = await supa.storage.from(BUCKET).download(d.file_path);
    if (error || !blob) throw new Error(`Lecture impossible : ${d.name}`);
    const buf = Buffer.from(await blob.arrayBuffer());
    return { doc: d, pdf: await toPdf(buf, d.mime_type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', d.name) };
  }));

  const sr = await yousign.createSignatureRequest({ name: `${dossier.client_name || 'Dossier'} — actes à signer (${dossier.reference || ''})`.slice(0, 120), deliveryMode: 'email' });
  const correspondances = [];
  const uploads = await Promise.all(pdfs.map(({ doc, pdf }) => yousign.uploadDocument(sr.id, { filename: `${String(doc.name).replace(/\.(docx|pdf)$/i, '')}.pdf`, base64Pdf: pdf.toString('base64') })));
  uploads.forEach((u, i) => correspondances.push({ document_id: pdfs[i].doc.id, yousign_document_id: u.id, doc_type: pdfs[i].doc.doc_type, name: pdfs[i].doc.name, pages: u.total_pages }));
  for (const [rang, s] of liste.entries()) {
    await yousign.addSigner(sr.id, {
      firstName: s.prenom, lastName: s.nom, email: s.email, phoneNumber: s.telephone || undefined,
      fields: correspondances.map((c) => champsSignature(c.yousign_document_id, rang, c.pages)),
    });
  }
  await yousign.activate(sr.id);
  await majParcours(supa, dossierId, {
    signature_client: { statut: 'envoyee', request_id: sr.id, envoyee_le: new Date().toISOString(), signataires: liste.map(({ prenom, nom, email }) => ({ prenom, nom, email })), documents: correspondances, erreurs: [], versees: [] },
  }, { yousign_client_request_id: sr.id });
  return { ok: true };
}

async function signerFormalite(supa, orgId, dossierId, { user, profile }) {
  if (!yousignConfigure()) throw Object.assign(new Error('Yousign n’est pas configuré sur le serveur.'), { status: 400 });
  const dossier = await chargerDossier(supa, orgId, dossierId);
  const fid = formaliteId(dossier?.metadata);
  if (!fid) throw Object.assign(new Error('Aucune formalité au Guichet unique pour ce dossier.'), { status: 400 });
  const gu = await formaliteGU(orgId, fid, { frais: true });
  if (!A_SIGNER.has(gu.status)) throw Object.assign(new Error(`La formalité n'est pas à signer (statut : ${STATUT_GU[gu.status] || gu.status}).`), { status: 409 });
  const prenom = profile?.first_name || user?.user_metadata?.first_name || '';
  const nom = profile?.last_name || user?.user_metadata?.last_name || '';
  if (!prenom || !nom || !user?.email) throw Object.assign(new Error('Renseignez vos prénom et nom dans votre profil : la signature est nominative.'), { status: 400 });

  const client = inpi.forOrg(orgId);
  // Synthèse à jour (pièces ajoutées après la création), puis téléchargement (§ 6.4, § 3.13, § 3.15)
  try { await client.request(`/api/formalities/${fid}/refresh`); } catch { /* synthèse existante */ }
  const telecharger = async (chemin) => {
    // « Accept: application/pdf » est refusé (406) : en-têtes par défaut (*/*)
    const r = await client.rawFetch(chemin);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.slice(0, 5).toString() === '%PDF-' ? buf : null;
  };
  const [synthese, be] = await Promise.all([telecharger(`/api/formalities/${fid}/synthesis`), telecharger(`/api/formalities/${fid}/synthesis_be`)]);
  if (!synthese) throw Object.assign(new Error('Synthèse de la formalité indisponible au Guichet unique, réessayez dans un instant.'), { status: 502 });

  // Le formaliste signe lui-même, tout de suite : lien de signature direct (pas d'e-mail)
  const sr = await yousign.createSignatureRequest({ name: `Signature formalité ${gu.liasseNumber || fid}`, deliveryMode: 'none' });
  const docs = { synthese };
  if (be) docs.be = be;
  const ys = {};
  const pages = {};
  for (const [role, pdf] of Object.entries(docs)) {
    const u = await yousign.uploadDocument(sr.id, { filename: role === 'be' ? `Synthese_BE_${gu.liasseNumber || fid}.pdf` : `Synthese_${gu.liasseNumber || fid}.pdf`, base64Pdf: pdf.toString('base64') });
    ys[role] = u.id;
    pages[role] = u.total_pages;
  }
  const signer = await yousign.addSigner(sr.id, {
    firstName: prenom, lastName: nom, email: user.email,
    level: process.env.YOUSIGN_NIVEAU_INPI || 'advanced_electronic_signature',
    authMode: process.env.YOUSIGN_AUTH_INPI || 'otp_email',
    fields: Object.entries(ys).map(([role, id]) => champsSignature(id, 0, pages[role])),
  });
  const act = await yousign.activate(sr.id);
  const lien = (act?.signers || []).find((s) => s.id === signer.id)?.signature_link || signer?.signature_link || null;
  await majParcours(supa, dossierId, { signature_inpi: { statut: 'en_cours', request_id: sr.id, lien, yousign_documents: ys, ouverte_le: new Date().toISOString(), erreur: null } }, { yousign_inpi_request_id: sr.id });
  return { ok: true, lien };
}

// Création : signature électronique simple (§ 6.1), sur clic explicite du formaliste
async function signatureSimple(supa, orgId, dossierId) {
  const dossier = await chargerDossier(supa, orgId, dossierId);
  const fid = formaliteId(dossier?.metadata);
  if (!fid) throw Object.assign(new Error('Aucune formalité au Guichet unique pour ce dossier.'), { status: 400 });
  const gu = await formaliteGU(orgId, fid, { frais: true });
  if (gu.typeFormalite !== 'C') throw Object.assign(new Error('La signature simple ne vaut que pour une création ; signez avec Yousign.'), { status: 400 });
  if (!A_SIGNER.has(gu.status)) throw Object.assign(new Error(`La formalité n'est pas à signer (statut : ${STATUT_GU[gu.status] || gu.status}).`), { status: 409 });
  try { await inpi.forOrg(orgId).request(`/api/formalities/${fid}/refresh`); } catch { /* synthèse existante */ }
  await inpi.forOrg(orgId).request('/api/signatures', { method: 'POST', body: { formality: `/api/formalities/${fid}` } });
  oublierGU(orgId, fid);
  await majParcours(supa, dossierId, { signature_inpi: { statut: 'signee', mode: 'simple', signee_le: new Date().toISOString(), erreur: null } });
  return { ok: true };
}

async function annulerSignature(supa, orgId, dossierId, etape) {
  const dossier = await chargerDossier(supa, orgId, dossierId);
  const e = dossier?.metadata?.parcours?.[etape];
  if (e?.request_id && yousignConfigure()) {
    try { await yousign.cancel(e.request_id); } catch { /* déjà terminée ou supprimée */ }
  }
  await majParcours(supa, dossierId, { [etape]: null });
  return { ok: true };
}

async function payer(supa, orgId, dossierId, { confirme, montant_cents: montantVu }) {
  if (confirme !== true) throw Object.assign(new Error('Confirmation du paiement requise.'), { status: 400 });
  if (!paiementCompteConfigure()) throw Object.assign(new Error('Compte client INPI non configuré.'), { status: 400 });
  const dossier = await chargerDossier(supa, orgId, dossierId);
  const fid = formaliteId(dossier?.metadata);
  const gu = await formaliteGU(orgId, fid, { frais: true });
  if (!A_PAYER.has(gu.status)) throw Object.assign(new Error(`La formalité n'est pas à payer (statut : ${STATUT_GU[gu.status] || gu.status}).`), { status: 409 });
  const panier = (gu.carts || []).find((c) => c.status === 'TO_PAY');
  if (!panier) throw Object.assign(new Error('Aucun panier à payer.'), { status: 409 });
  // Le montant payé doit être celui affiché au formaliste
  if (Number(montantVu) !== Number(panier.total)) throw Object.assign(new Error('Le montant a changé depuis l’affichage : vérifiez puis confirmez à nouveau.'), { status: 409 });
  const r = await inpi.forOrg(orgId).request('/api/payment', {
    method: 'POST',
    body: { login: process.env.INPI_CCL_LOGIN, password: process.env.INPI_CCL_PASSWORD, paymentType: 'CCL', formality: `/api/formalities/${fid}` },
  });
  oublierGU(orgId, fid);
  await majParcours(supa, dossierId, { paiement: { mode: 'compte_client', paye_le: new Date().toISOString(), montant_cents: panier.total, commande: r?.orderNum || null } });
  return { ok: true };
}

async function deleguer(supa, orgId, dossierId, { email, designation }) {
  const mail = String(email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) throw Object.assign(new Error('E-mail du client invalide.'), { status: 400 });
  const dossier = await chargerDossier(supa, orgId, dossierId);
  const fid = formaliteId(dossier?.metadata);
  const gu = await formaliteGU(orgId, fid, { frais: true });
  const panier = (gu.carts || []).find((c) => c.status === 'TO_PAY');
  if (!A_PAYER.has(gu.status) || !panier) throw Object.assign(new Error(`La formalité n'est pas à payer (statut : ${STATUT_GU[gu.status] || gu.status}).`), { status: 409 });
  await inpi.forOrg(orgId).request('/api/delegation-payments', {
    method: 'POST',
    body: { cart: `/api/carts/${panier.id}`, payerMail: mail, designation: String(designation || dossier.client_name || '').slice(0, 120) },
  });
  await majParcours(supa, dossierId, { paiement: { mode: 'delegation', delegation_a: mail, delegation_le: new Date().toISOString() } });
  return { ok: true };
}

// Webhook Yousign : retrouve le dossier et l'étape d'une demande de signature
async function surWebhook(supa, requestId, eventName) {
  const { data } = await supa.from('dossiers').select('id, organization_id, metadata')
    .or(`metadata->>yousign_client_request_id.eq.${requestId},metadata->>yousign_inpi_request_id.eq.${requestId}`).limit(1);
  const dossier = data?.[0];
  if (!dossier) return false;
  const etape = dossier.metadata?.yousign_inpi_request_id === requestId ? 'signature_inpi' : 'signature_client';
  cacheYS.delete(requestId);
  if (['signature_request.done', 'signature_request.signed'].includes(eventName)) await finaliser(supa, dossier.organization_id, dossier.id, etape, requestId);
  else if (['signature_request.declined', 'signature_request.expired', 'signature_request.canceled'].includes(eventName)) {
    await majParcours(supa, dossier.id, { [etape]: { statut: eventName.endsWith('declined') ? 'refusee' : 'expiree', maj: new Date().toISOString() } });
  }
  return true;
}

module.exports = {
  ETAPES, etat, envoyerSignatureClient, signerFormalite, signatureSimple, annulerSignature, payer, deleguer, surWebhook,
  // tests
  _interne: { annonceRequise, actesASigner, categorieGU, signatairesProposes, champsSignature },
};
