// Parcours d'une formalité préparée par l'agent (chat du tableau de bord), en 5 étapes :
//   1. formalite        brouillon créé au Guichet unique (statut SIGNATURE_PENDING)
//   2. annonce          annonce légale rédigée (si la formalité en exige une), attestation
//                       de parution versée sur la formalité dès qu'elle est jointe
//   3. signature_client actes rédigés par le cabinet, signés par le client (Yousign, e-mail),
//                       puis versés automatiquement sur la formalité du Guichet unique
//   4. signature_inpi   synthèse de la formalité (PJ_99) signée par le formaliste avec Yousign
//                       (signature électronique avancée), renvoyée en PJ_115 puis
//                       POST /api/signatures — ou signature simple pour une création
//   5. paiement         compte client INPI du cabinet (POST /api/payment) ou délégation de
//                       paiement au client (POST /api/delegation-payments)
// Spécification : contrat d'interface « API mandataire de dépôt » INPI, chap. 3, 6, 7 et 9.
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
  AMENDMENT_PENDING: 'régularisation demandée par le greffe', AMENDMENT_SIGNATURE_PENDING: 'régularisation à signer',
  AMENDMENT_PAYMENT_PENDING: 'régularisation à payer', AMENDED: 'régularisée, en attente du greffe', EXPIRED: 'délai de régularisation expiré',
  REJECTED: 'rejetée', VALIDATED: 'validée', ERROR: 'en erreur',
};
const A_SIGNER = new Set(['SIGNATURE_PENDING', 'AMENDMENT_SIGNATURE_PENDING']);
const SIGNEE = new Set(['SIGNED', 'PAYMENT_PENDING', 'PAYMENT_VALIDATION_PENDING', 'PAID', 'RECEIVED', 'VALIDATION_PENDING', 'AMENDMENT_PENDING', 'AMENDMENT_PAYMENT_PENDING', 'AMENDED', 'EXPIRED', 'VALIDATED', 'REJECTED']);
const PAYEE = new Set(['PAID', 'RECEIVED', 'VALIDATION_PENDING', 'AMENDMENT_PENDING', 'AMENDED', 'EXPIRED', 'VALIDATED', 'REJECTED']);
const A_PAYER = new Set(['PAYMENT_PENDING', 'AMENDMENT_PAYMENT_PENDING']);
// Statuts qui demandent une intervention du formaliste (le parcours n'est pas terminé)
const BLOQUANTS = new Set(['REJECTED', 'ERROR', 'AMENDMENT_PENDING', 'EXPIRED']);
// Statuts où la formalité est réellement transmise au greffe
const TRANSMISE = new Set(['PAID', 'RECEIVED', 'VALIDATION_PENDING', 'AMENDED', 'VALIDATED']);

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
const NON_SIGNABLES = new Set(['ANNONCE_LEGALE', 'REPONSE_GREFFE', 'PIECE_JOINTE', 'ACTE_RNE', 'COMPTES_ANNUELS', 'AUTRE', 'ATTESTATION_PARUTION']);
// Actes qui existent naturellement en plusieurs exemplaires (un par dirigeant)
const MULTIPLES = new Set(['DECLARATION_NON_CONDAMNATION']);

// Opérations de modification qui imposent une annonce légale
const OPS_AVEC_ANNONCE = new Set(['siege', 'denomination', 'objet', 'nomination', 'revocation', 'dissolution', 'clotureLiquidation', 'capital', 'formeJuridique', 'duree']);

const yousignConfigure = () => Boolean(process.env.YOUSIGN_API_KEY);
const paiementCompteConfigure = () => Boolean(process.env.INPI_CCL_LOGIN && process.env.INPI_CCL_PASSWORD);
const erreur = (message, status) => Object.assign(new Error(message), { status });
const euros = (c) => `${(c / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

// ─── Caches : le panneau se rafraîchit souvent, le Guichet unique et Yousign non ───
// Lecture du panneau : délai court, une seule tentative ; en cas d'échec on sert la dernière
// valeur connue (signalée comme ancienne) ; les lectures simultanées partagent le même appel.
const TTL_GU = 45000;
const TTL_ECHEC_GU = 30000;
const MAX_CACHE = 300;
const cacheGU = new Map(); // `${orgId}|${id}` → { exp, f, du, p, echecJusqu, erreur }
function borner(map) {
  while (map.size > MAX_CACHE) map.delete(map.keys().next().value);
}
async function formaliteGU(orgId, id, { frais = false } = {}) {
  const k = `${orgId}|${id}`;
  const hit = cacheGU.get(k);
  const maintenant = Date.now();
  if (!frais && hit?.p) return hit.p;
  if (!frais && hit?.f && hit.exp > maintenant) return hit.f;
  if (!frais && hit?.echecJusqu > maintenant) {
    if (hit.f) return hit.f;
    throw hit.erreur;
  }
  const p = inpi.forOrg(orgId).getFormality(id, undefined, frais ? {} : { timeoutMs: 8000, essais: 1 })
    .then((f) => {
      cacheGU.set(k, { exp: Date.now() + TTL_GU, f, du: Date.now() });
      borner(cacheGU);
      return f;
    })
    .catch((e) => {
      // Ancienne valeur conservée et servie pendant TTL_ECHEC_GU
      cacheGU.set(k, { ...(hit?.f ? { f: hit.f, du: hit.du } : {}), exp: 0, echecJusqu: Date.now() + TTL_ECHEC_GU, erreur: e });
      if (hit?.f && !frais) return hit.f;
      throw e;
    });
  cacheGU.set(k, { ...(hit || {}), p });
  return p;
}
const oublierGU = (orgId, id) => cacheGU.delete(`${orgId}|${id}`);
const ancienneteGU = (orgId, id) => {
  const hit = cacheGU.get(`${orgId}|${id}`);
  return hit?.echecJusqu > Date.now() && hit?.du ? hit.du : null;
};

const cacheYS = new Map(); // requestId → { exp, s }
async function statutYousign(requestId) {
  const hit = cacheYS.get(requestId);
  if (hit && hit.exp > Date.now()) return hit.s;
  const s = await yousign.getStatus(requestId);
  cacheYS.set(requestId, { exp: Date.now() + 15000, s });
  borner(cacheYS);
  return s;
}

const verrous = new Set(); // finalisations en cours (une seule à la fois par demande et par processus)

// ─── Accès aux données ─────────────────────────────────────────────
async function chargerDossier(supa, orgId, dossierId) {
  const { data } = await supa.from('dossiers').select('*').eq('id', dossierId).eq('organization_id', orgId).maybeSingle();
  return data || null;
}
async function dossierExige(supa, orgId, dossierId) {
  const d = await chargerDossier(supa, orgId, dossierId);
  if (!d) throw erreur('Dossier introuvable.', 404);
  return d;
}
async function documentsDe(supa, dossierId) {
  const { data } = await supa.from('dossier_documents')
    .select('id, name, file_path, mime_type, doc_type, status, created_at').eq('dossier_id', dossierId).order('created_at');
  return data || [];
}
// Mise à jour de metadata.parcours, toujours limitée au cabinet du dossier
async function majParcours(supa, orgId, dossierId, patch, extra = {}) {
  const { data } = await supa.from('dossiers').select('metadata').eq('id', dossierId).eq('organization_id', orgId).maybeSingle();
  if (!data) throw erreur('Dossier introuvable.', 404);
  const meta = data.metadata || {};
  const parcours = { ...(meta.parcours || {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete parcours[k];
    else parcours[k] = { ...(parcours[k] || {}), ...v };
  }
  await supa.from('dossiers').update({ metadata: { ...meta, ...extra, parcours } }).eq('id', dossierId).eq('organization_id', orgId);
  return parcours;
}
const formaliteId = (meta) => meta?.inpi_formality_id || meta?.inpi_draft_id || null;
async function formaliteExige(supa, orgId, dossierId) {
  const dossier = await dossierExige(supa, orgId, dossierId);
  const fid = formaliteId(dossier.metadata);
  if (!fid) throw erreur('Aucune formalité au Guichet unique pour ce dossier.', 400);
  return { dossier, fid };
}
const estEI = (data) => ['AE', 'EI', 'MICRO'].includes(String(data?.formeJuridique || '').toUpperCase());
const estCreation = (data, gu) => gu?.typeFormalite === 'C' || String(data?.typeFormalite || '').toUpperCase() === 'CREATION';

function annonceRequise(data, gu, meta = {}) {
  if (estEI(data)) return false;
  if (estCreation(data, gu)) return true;
  const type = String(data?.typeFormalite || '').toUpperCase();
  const ops = meta.inpi_operations || (data?.operations || []).map((o) => o.type || o);
  if (ops.length) return ops.some((o) => OPS_AVEC_ANNONCE.has(o));
  return ['MODIFICATION', 'DISSOLUTION', 'RADIATION', 'CESSATION'].includes(type) || gu?.typeFormalite === 'M' || gu?.typeFormalite === 'R';
}

// Actes rédigés par le cabinet qui attendent la signature du client. Un acte régénéré ne doit
// être signé qu'une fois : on ne garde que la version la plus récente par type (par nom pour
// les actes multiples, ex. une déclaration de non-condamnation par dirigeant).
function actesASigner(docs) {
  // Version la plus récente de chaque acte, signée ou non : une version plus ancienne restée
  // « rédigée » n'est jamais reproposée quand une version plus récente est signée.
  const parCle = new Map();
  for (const d of docs) {
    if (!d.doc_type || NON_SIGNABLES.has(d.doc_type) || !['GENERE', 'SIGNE'].includes(d.status)) continue;
    const nom = String(d.name || '').replace(/ \(signé\)\.pdf$/i, '').replace(/\.(docx|pdf)$/i, '');
    const cle = MULTIPLES.has(d.doc_type) ? `${d.doc_type}|${nom}` : d.doc_type;
    const prec = parCle.get(cle);
    if (!prec || String(d.created_at) > String(prec.created_at)) parCle.set(cle, d);
  }
  return [...parCle.values()].filter((d) => d.status === 'GENERE');
}

// Attestation de parution jointe par le formaliste (chat) ou rangée comme telle
const estAttestation = (d) => d.doc_type === 'ATTESTATION_PARUTION' || (d.doc_type === 'PIECE_JOINTE' && /attestation.{0,20}parution|parution/i.test(d.name || ''));

function categorieGU(docType, gu, data) {
  if (estCreation(data, gu)) {
    const c = docType === 'ATTESTATION_PARUTION' ? 'ATTESTATION_PARUTION' : CATEGORIE_CREATION[docType];
    const carte = estEI(data) ? PIECES_EI : PIECES;
    return c && carte[c] ? { categorie: c, carte } : null;
  }
  const c = docType === 'ATTESTATION_PARUTION' ? 'ATTESTATION_PARUTION' : CATEGORIE_MODIF[docType];
  return c && PIECES_MODIF[c] ? { categorie: c, carte: PIECES_MODIF } : null;
}

async function verserPiece(orgId, fid, cat, nom, pdf) {
  const spec = cat.carte[cat.categorie];
  return inpi.forOrg(orgId).request(`/api/formalities/${fid}/attachments`, {
    method: 'POST',
    body: {
      nomDocument: nom, typeDocument: spec.typeDocument, ...(spec.sousTypeDocument ? { sousTypeDocument: spec.sousTypeDocument } : {}),
      langueDocument: 'fr', documentBase64: pdf.toString('base64'), documentExtension: 'pdf', path: spec.path.replace(/\[0\]$/, ''),
    },
  });
}
async function regenererSynthese(orgId, fid) {
  // Pièces ajoutées → la synthèse doit être régénérée avant la signature (§ 6.4)
  try { await inpi.forOrg(orgId).request(`/api/formalities/${fid}/refresh`, { timeoutMs: 30000, essais: 1 }); } catch { /* régénérée au moment de signer */ }
  oublierGU(orgId, fid);
}

// Signataires proposés : dirigeant et associés du dossier (e-mail à compléter si absent)
function signatairesProposes(data, precedents = []) {
  const vus = new Set();
  const out = [];
  for (const s of precedents) {
    const cle = `${s.prenom}|${s.nom}`.toLowerCase();
    if (vus.has(cle)) continue;
    vus.add(cle);
    out.push({ prenom: s.prenom, nom: s.nom, email: s.email || '', telephone: s.telephone || '' });
  }
  for (const p of [data?.dirigeant, ...(data?.associes || []), data?.cession?.cedant, data?.cession?.cessionnaire]) {
    if (!p?.nom) continue;
    const prenom = (p.prenoms || [])[0] || p.prenom || '';
    const cle = `${prenom}|${String(p.nom).toUpperCase()}`.toLowerCase();
    if (vus.has(cle)) continue;
    vus.add(cle);
    out.push({ prenom, nom: String(p.nom).toUpperCase(), email: p.email || '', telephone: p.telephone || '' });
  }
  return out;
}

// Téléphone au format international attendu par Yousign (+33…)
function telephoneE164(t) {
  const brut = String(t || '').replace(/[\s.\-()]/g, '');
  if (!brut) return undefined;
  if (/^\+\d{8,15}$/.test(brut)) return brut;
  if (/^00\d{8,15}$/.test(brut)) return `+${brut.slice(2)}`;
  if (/^0[1-9]\d{8}$/.test(brut)) return `+33${brut.slice(1)}`;
  return null; // invalide
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
    try {
      if (s?.status === 'done') {
        await finaliser(supa, orgId, dossier.id, etape, e.request_id, s);
        change = true;
      } else if (['declined', 'expired'].includes(s?.status)) {
        await majParcours(supa, orgId, dossier.id, { [etape]: { statut: s.status === 'declined' ? 'refusee' : 'expiree', maj: new Date().toISOString() } });
        change = true;
      }
    } catch (err) {
      // Le panneau reste lisible ; la finalisation sera retentée au prochain rafraîchissement
      console.error('[parcours] synchronisation', etape, err.message);
    }
  }
  return change;
}

// Signature terminée : récupère les PDF signés et poursuit la chaîne (idempotent).
async function finaliser(supa, orgId, dossierId, etape, requestId, detailConnu = null) {
  const cle = `${dossierId}|${etape}|${requestId}`;
  if (verrous.has(cle)) return;
  verrous.add(cle);
  try {
    const dossier = await chargerDossier(supa, orgId, dossierId);
    const e = dossier?.metadata?.parcours?.[etape];
    if (!e || e.request_id !== requestId || !['envoyee', 'en_cours'].includes(e.statut)) return;
    const detail = detailConnu?.documents ? detailConnu : await yousign.getStatus(requestId);
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
  const versees = [];
  const erreurs = [];
  const aReverser = [];
  for (const c of e.documents || []) { // [{ document_id, yousign_document_id, doc_type, name }]
    if (!docsYS.some((d) => d.id === c.yousign_document_id)) continue;
    let pdf;
    try { pdf = await yousign.downloadSignedDocument(requestId, c.yousign_document_id); } catch { erreurs.push(`${c.name} : téléchargement Yousign impossible`); continue; }
    const nom = `${String(c.name).replace(/\.(docx|pdf)$/i, '').replace(/ \(signé\)$/, '')} (signé).pdf`;
    const chemin = `signed/${dossier.id}/${requestId}-${c.yousign_document_id}.pdf`;
    const { error: upErr } = await supa.storage.from(BUCKET).upload(chemin, pdf, { contentType: 'application/pdf', upsert: true });
    if (upErr) { erreurs.push(`${c.name} : enregistrement impossible`); continue; }
    // L'acte devient « signé » : la version signée remplace la version rédigée dans le dossier
    await supa.from('dossier_documents').update({ status: 'SIGNE', name: nom, file_path: chemin, mime_type: 'application/pdf', size_bytes: pdf.length }).eq('id', c.document_id);
    const cat = categorieGU(c.doc_type, gu, data);
    if (fid && cat) {
      try {
        await verserPiece(orgId, fid, cat, nom, pdf);
        versees.push(nom);
      } catch (err) {
        erreurs.push(`${nom} : non versé au Guichet unique (${String(err.message).slice(0, 160)})`);
        aReverser.push({ document_id: c.document_id, chemin, doc_type: c.doc_type, nom });
      }
    }
  }
  if (fid && versees.length) await regenererSynthese(orgId, fid);
  await majParcours(supa, orgId, dossier.id, {
    signature_client: { statut: aReverser.length ? 'versement_incomplet' : 'signee', signee_le: new Date().toISOString(), versees, erreurs, a_reverser: aReverser },
  });
}

// Nouvel essai de versement des actes signés au Guichet unique (après une erreur)
async function reverserActes(supa, orgId, dossierId) {
  const { dossier, fid } = await formaliteExige(supa, orgId, dossierId);
  const sc = dossier.metadata?.parcours?.signature_client || {};
  const gu = await formaliteGU(orgId, fid, { frais: true });
  const data = dossier.metadata?.agent_data || {};
  const restants = [];
  const versees = [...(sc.versees || [])];
  const erreurs = [];
  for (const r of sc.a_reverser || []) {
    try {
      const { data: blob, error } = await supa.storage.from(BUCKET).download(r.chemin);
      if (error || !blob) throw new Error('PDF signé introuvable');
      const cat = categorieGU(r.doc_type, gu, data);
      if (!cat) throw new Error('catégorie de pièce inconnue');
      await verserPiece(orgId, fid, cat, r.nom, Buffer.from(await blob.arrayBuffer()));
      versees.push(r.nom);
    } catch (err) {
      restants.push(r);
      erreurs.push(`${r.nom} : ${String(err.message).slice(0, 160)}`);
    }
  }
  if (versees.length > (sc.versees || []).length) await regenererSynthese(orgId, fid);
  await majParcours(supa, orgId, dossierId, { signature_client: { statut: restants.length ? 'versement_incomplet' : 'signee', versees, erreurs, a_reverser: restants } });
}

async function declarerSignature(orgId, fid, pieces) {
  await inpi.forOrg(orgId).request('/api/signatures', {
    method: 'POST',
    body: { formality: `/api/formalities/${fid}`, signedDocument: `/api/attachments/${pieces.synthese}`, ...(pieces.be ? { beSignedDocument: `/api/attachments/${pieces.be}` } : {}) },
  });
  oublierGU(orgId, fid);
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
    await declarerSignature(orgId, fid, pieces);
    await majParcours(supa, orgId, dossier.id, { signature_inpi: { statut: 'signee', signee_le: new Date().toISOString(), mode: 'yousign', erreur: null, pieces } });
  } catch (err) {
    // Pièces déjà versées : un nouvel essai ne rejoue que la déclaration de signature
    await majParcours(supa, orgId, dossier.id, { signature_inpi: { statut: 'erreur_inpi', pieces, erreur: `Signée sur Yousign, mais le Guichet unique n'a pas accepté la transmission : ${String(err.message).slice(0, 300)}` } });
  }
}

async function redeclarerSignature(supa, orgId, dossierId) {
  const { dossier, fid } = await formaliteExige(supa, orgId, dossierId);
  const si = dossier.metadata?.parcours?.signature_inpi || {};
  if (!si.pieces?.synthese) throw erreur('Aucune synthèse signée versée : signez à nouveau avec Yousign.', 409);
  try {
    await declarerSignature(orgId, fid, si.pieces);
  } catch (err) {
    await majParcours(supa, orgId, dossierId, { signature_inpi: { erreur: `Le Guichet unique refuse encore la signature : ${String(err.message).slice(0, 300)}` } });
    throw erreur(`Le Guichet unique refuse encore la signature : ${String(err.message).slice(0, 200)}`, 502);
  }
  await majParcours(supa, orgId, dossierId, { signature_inpi: { statut: 'signee', mode: 'yousign', signee_le: new Date().toISOString(), erreur: null } });
}

// ─── État du parcours (panneau de droite) ─────────────────────────
async function etat(supa, orgId, dossierId) {
  let dossier = await dossierExige(supa, orgId, dossierId);
  if (await synchroniser(supa, orgId, dossier)) dossier = await dossierExige(supa, orgId, dossierId);
  const meta = dossier.metadata || {};
  const data = meta.agent_data || {};
  const p = meta.parcours || {};
  const fid = formaliteId(meta);
  // Documents et Guichet unique lus en parallèle
  const [docs, lectureGU] = await Promise.all([
    documentsDe(supa, dossierId),
    fid ? formaliteGU(orgId, fid).then((f) => ({ f }), (e) => ({ e })) : Promise.resolve({}),
  ]);
  const gu = lectureGU.f || null;
  let erreurGU = null;
  if (lectureGU.e) erreurGU = lectureGU.e.status === 404 ? 'Formalité introuvable sur le Guichet unique (supprimée ?).' : 'Guichet unique momentanément injoignable : statut non actualisé.';
  const ancienne = fid ? ancienneteGU(orgId, fid) : null;
  if (!erreurGU && ancienne) erreurGU = `Guichet unique injoignable : statut du ${new Date(ancienne).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}.`;
  const guInconnu = Boolean(fid && !gu);
  const statutGU = gu?.status || null;
  const creation = estCreation(data, gu);
  const etapes = [];

  // 1. Formalité. Création de société : le Guichet unique exige l'annonce PARUE dès le brouillon,
  // et l'annonce cite les statuts signés ; la préparation (actes rédigés) clôt donc l'étape, le
  // brouillon est créé à l'étape 4. Modification : le brouillon est créé dès cette étape.
  const bloquee = statutGU && BLOQUANTS.has(statutGU);
  const actesRediges = docs.some((d) => d.doc_type && !NON_SIGNABLES.has(d.doc_type) && ['GENERE', 'SIGNE', 'TRANSMIS'].includes(d.status));
  const prepare = Boolean(fid) || (creation && actesRediges);
  etapes.push({
    cle: 'formalite', titre: 'Réalisation de la formalité',
    statut: !prepare ? 'a_faire' : bloquee ? 'bloque' : 'fait',
    detail: fid
      ? `Brouillon ${meta.inpi_liasse || gu?.liasseNumber || fid} au Guichet unique${statutGU ? ` · ${STATUT_GU[statutGU] || statutGU}` : ''}`
      : prepare ? 'Dossier et actes préparés · le brouillon sera créé au Guichet unique après la signature des actes et la parution de l’annonce.'
        : "L'agent rassemble les informations et rédige les actes.",
    erreur: erreurGU,
    alertes: bloquee ? [statutGU === 'REJECTED' ? 'Formalité rejetée par le greffe : ouvrez-la pour lire le motif.' : statutGU === 'ERROR' ? 'Le Guichet unique signale une erreur sur cette formalité.' : 'Le greffe demande une régularisation : ouvrez la formalité pour y répondre.'] : undefined,
    lien: fid ? `/inpi/${fid}` : null,
    actions: prepare ? [] : creation
      ? [{ type: 'demander', label: 'Rédiger les actes', message: 'Génère les statuts et les actes du dossier de constitution.' }]
      : [{ type: 'demander', label: 'Créer le brouillon', message: 'Tout est prêt ? Crée le brouillon de la formalité au Guichet unique (sans les actes non signés, qui seront versés après la signature du client).' }],
  });

  // 2. Annonce légale
  const requise = annonceRequise(data, gu, meta);
  const annonces = meta.annonces_legales || [];
  const attestations = docs.filter(estAttestation);
  const attestationVersee = p.annonce?.attestation_versee_id && attestations.some((d) => d.id === p.annonce.attestation_versee_id);
  const signeeAuGU = Boolean(statutGU && SIGNEE.has(statutGU));
  const parue = attestations.length > 0 || Boolean(data.annonceLegale?.journal && data.annonceLegale?.datePublication);
  const annonceOk = annonces.length > 0 || parue || signeeAuGU || p.annonce?.statut === 'faite';
  let statutA;
  if (!requise) statutA = 'sans_objet';
  else if (annonceOk) statutA = 'fait';
  else statutA = prepare ? 'a_faire' : 'a_venir';
  const actionsA = [];
  if (requise && !annonceOk) {
    actionsA.push({ type: 'demander', label: "Rédiger l'annonce", message: "Rédige l'annonce légale de cette formalité." });
    actionsA.push({ type: 'annonce_faite', label: 'Déjà publiée', secondaire: true, confirmation: "L'annonce a déjà été publiée par ailleurs ? Joignez l'attestation de parution dans le chat dès que possible." });
  }
  if (requise && fid && attestations.length && !attestationVersee && !signeeAuGU) {
    actionsA.push({ type: 'verser_attestation', label: "Verser l'attestation au Guichet unique" });
  }
  etapes.push({
    cle: 'annonce', titre: 'Annonce légale',
    statut: statutA,
    detail: !requise
      ? "Pas d'annonce légale pour cette formalité."
      : signeeAuGU && !annonces.length && !parue
        ? 'Formalité déjà signée : annonce gérée hors de Legaly.'
        : annonceOk
          ? [annonces.length ? `${annonces[annonces.length - 1].label} rédigée` : p.annonce?.statut === 'faite' ? 'Publiée par ailleurs' : 'Annonce publiée',
            attestationVersee ? 'attestation versée au Guichet unique' : attestations.length ? 'attestation de parution jointe' : 'à publier, puis joignez l’attestation de parution dans le chat'].join(' · ')
          : 'Annonce légale à rédiger puis à publier.',
    documents: docs.filter((d) => d.doc_type === 'ANNONCE_LEGALE' || estAttestation(d)).map((d) => ({ id: d.id, nom: d.name })),
    actions: actionsA,
  });

  // 3. Signature des actes par le client
  const aSigner = actesASigner(docs);
  const signes = docs.filter((d) => d.status === 'SIGNE' && !/^SYNTHESE/.test(d.doc_type || ''));
  const sc = p.signature_client || {};
  const annonceFaite = !requise || annonceOk;
  let statutSC;
  if (['envoyee', 'en_cours'].includes(sc.statut)) statutSC = 'attente';
  else if (['refusee', 'expiree', 'versement_incomplet'].includes(sc.statut)) statutSC = 'bloque';
  else if (!aSigner.length) statutSC = signes.length || sc.statut === 'signee' ? 'fait' : 'sans_objet';
  else if (!prepare || !(annonceFaite || annonces.length)) statutSC = 'a_venir';
  else statutSC = 'a_faire';
  const yousignOff = { desactive: !yousignConfigure(), raison: yousignConfigure() ? null : 'Yousign n’est pas encore configuré (clé API à ajouter sur le serveur).' };
  etapes.push({
    cle: 'signature_client', titre: 'Signature des documents par le client',
    statut: statutSC,
    detail: statutSC === 'attente'
      ? `Envoyé à ${(sc.signataires || []).map((s) => `${s.prenom} ${s.nom}`).join(', ')} le ${new Date(sc.envoyee_le).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })} · en attente de signature`
      : sc.statut === 'versement_incomplet'
        ? 'Actes signés, mais certains n’ont pas pu être versés au Guichet unique.'
        : statutSC === 'bloque'
          ? `Signature ${sc.statut === 'refusee' ? 'refusée par un signataire' : 'expirée'} : renvoyez la demande.`
          : statutSC === 'fait'
            ? `${signes.length} acte(s) signé(s)${(sc.versees || []).length ? `, ${sc.versees.length} versé(s) au Guichet unique` : ''}`
            : statutSC === 'sans_objet' ? 'Aucun acte rédigé à faire signer.'
              : statutSC === 'a_venir' ? `${aSigner.length} acte(s) à faire signer, après ${prepare ? "la rédaction de l'annonce" : 'la préparation du dossier'}.`
                : `${aSigner.length} acte(s) à faire signer par le client.`,
    documents: (statutSC === 'fait' ? signes : aSigner).map((d) => ({ id: d.id, nom: d.name, signe: d.status === 'SIGNE' })),
    alertes: sc.erreurs?.length ? sc.erreurs : undefined,
    signataires: ['a_faire', 'bloque'].includes(statutSC) && sc.statut !== 'versement_incomplet' ? signatairesProposes(data, sc.signataires) : undefined,
    actions: sc.statut === 'versement_incomplet'
      ? [{ type: 'reverser_actes', label: 'Réessayer le versement' }]
      : ['a_faire', 'bloque'].includes(statutSC)
        ? [{ type: 'signature_client', label: statutSC === 'bloque' ? 'Renvoyer en signature' : 'Envoyer en signature', ...yousignOff }]
        : statutSC === 'attente' ? [{ type: 'annuler_signature_client', label: 'Annuler la demande', secondaire: true, confirmation: 'Annuler la demande Yousign envoyée ? Les signataires ne pourront plus signer ; vous pourrez renvoyer une nouvelle demande.' }] : [],
  });

  // 4. Signature électronique de la formalité (= signature au Guichet unique)
  const si = p.signature_inpi || {};
  const sansAttestation = requise && !parue && !signeeAuGU;
  let statutSI;
  if (signeeAuGU) statutSI = 'fait';
  else if (si.statut === 'erreur_inpi') statutSI = 'bloque';
  else if (['envoyee', 'en_cours'].includes(si.statut)) statutSI = 'attente';
  else if (guInconnu) statutSI = 'inconnu';
  else if (!fid && creation && prepare && !aSigner.length && !['attente', 'bloque'].includes(statutSC) && parue) statutSI = 'a_faire';
  else if (!fid || !A_SIGNER.has(statutGU || '')) statutSI = 'a_venir';
  else if (['attente', 'a_faire', 'bloque', 'a_venir'].includes(statutSC) && (aSigner.length || sc.statut === 'versement_incomplet')) statutSI = 'a_venir';
  else if (!annonceFaite) statutSI = 'a_venir';
  else statutSI = 'a_faire';
  const actionsSI = [];
  if (statutSI === 'a_faire' && !fid) {
    actionsSI.push({ type: 'demander', label: 'Créer le brouillon', message: "Les actes sont signés et l'annonce est parue : crée le brouillon au Guichet unique avec les actes signés et l'attestation de parution." });
  } else if (statutSI === 'a_faire' || (statutSI === 'bloque' && !si.pieces?.synthese)) {
    actionsSI.push({ type: 'signature_inpi', label: 'Signer avec Yousign', ...yousignOff });
    if (creation) actionsSI.push({ type: 'signature_simple', label: 'Signature simple', secondaire: true, confirmation: 'Signer la formalité par signature électronique simple (création) ? La signature est définitive.' });
  }
  if (statutSI === 'bloque' && si.pieces?.synthese) actionsSI.push({ type: 'redeclarer_signature', label: 'Réessayer la transmission' });
  if (statutSI === 'attente') actionsSI.push({ type: 'annuler_signature_inpi', label: 'Annuler', secondaire: true, confirmation: 'Annuler la signature Yousign en cours ? Vous pourrez la relancer.' });
  etapes.push({
    cle: 'signature_inpi', titre: 'Signature électronique de la formalité',
    statut: statutSI,
    detail: statutSI === 'fait'
      ? `Formalité signée${si.mode === 'simple' ? ' (signature simple)' : si.mode === 'yousign' ? ' avec Yousign' : ''}.`
      : statutSI === 'attente' ? 'Signez la synthèse dans Yousign : elle est ensuite transmise au Guichet unique.'
        : statutSI === 'bloque' ? si.erreur
          : statutSI === 'inconnu' ? 'Statut du Guichet unique indisponible pour le moment.'
            : statutSI === 'a_faire' && !fid ? 'Actes signés et annonce parue : le brouillon peut être créé, puis signé.'
              : statutSI === 'a_faire' ? `Synthèse prête à signer${creation ? ' (création : signature simple acceptée)' : ' (signature électronique avancée exigée)'}.`
                : creation && !fid
                  ? aSigner.length || statutSC === 'attente' ? 'Après la signature des actes par le client.' : !parue ? "Après la parution de l'annonce : joignez l'attestation dans le chat." : 'Après la préparation du dossier.'
                  : !fid ? 'Après la création du brouillon.' : !annonceFaite ? "Après l'annonce légale." : 'Après la signature des documents par le client.',
    alertes: statutSI === 'a_faire' && fid && sansAttestation ? ["L'attestation de parution n'est pas encore jointe : le greffe la réclamera."] : undefined,
    lienSignature: statutSI === 'attente' ? si.lien || null : null,
    actions: actionsSI,
  });

  // 5. Paiement
  let paiement = null;
  if (gu) {
    try { paiement = paiementDe(gu, await emailsCabinet(orgId)); } catch { paiement = null; }
  }
  const aPayer = paiement?.a_payer_cents ?? null;
  const paye = paiement?.paye_cents ?? 0;
  const delegationGU = paiement?.delegation?.email || null;
  const delegationA = delegationGU || p.paiement?.delegation_a || null;
  let statutP;
  if (statutGU && PAYEE.has(statutGU)) statutP = 'fait';
  else if (statutGU && A_PAYER.has(statutGU)) statutP = delegationA ? 'attente' : 'a_faire';
  else if (guInconnu) statutP = 'inconnu';
  else if (signeeAuGU && !aPayer) statutP = 'fait';
  else statutP = 'a_venir';
  etapes.push({
    cle: 'paiement', titre: 'Paiement des frais du Guichet unique',
    statut: statutP,
    detail: statutP === 'fait'
      ? paye ? `Payé · ${euros(paye)}${paiement?.rembourse_cents ? `, remboursé ${euros(paiement.rembourse_cents)}` : ''}` : 'Aucun frais à payer.'
      : statutP === 'attente' ? `Délégation envoyée à ${delegationA}${aPayer ? ` · ${euros(aPayer)}` : ''}`
        : statutP === 'inconnu' ? 'Montant indisponible pour le moment.'
          : !fid ? 'Montant connu après la création du brouillon.'
            : !aPayer ? 'Aucun frais au Guichet unique pour cette formalité.'
              : `${euros(aPayer)} à régler${statutP === 'a_venir' ? ' après la signature' : ''}.`,
    montant_cents: statutP === 'a_faire' || statutP === 'attente' ? aPayer : null,
    lienPaiement: gu && (statutP === 'a_faire' || statutP === 'attente') ? lienGuichet(gu).url : null,
    emailClient: statutP === 'attente' ? '' : data?.dirigeant?.email || '',
    actions: statutP === 'a_faire' || statutP === 'attente'
      ? [
        { type: 'payer', label: aPayer ? `Payer ${euros(aPayer)}` : 'Payer', desactive: !paiementCompteConfigure(), raison: paiementCompteConfigure() ? null : 'Compte client INPI du cabinet non configuré : déléguez au client ou payez par carte sur le Guichet unique.', confirmation: `Payer ${aPayer ? euros(aPayer) : 'la formalité'} avec le compte client INPI du cabinet ? Le paiement est définitif.` },
        { type: 'deleguer', label: statutP === 'attente' ? 'Changer de payeur' : 'Déléguer au client', secondaire: true },
      ]
      : [],
  });

  const courante = etapes.find((e) => ['a_faire', 'attente', 'bloque'].includes(e.statut))?.cle || null;
  const toutFait = etapes.every((e) => ['fait', 'sans_objet'].includes(e.statut));
  const termine = toutFait && Boolean(statutGU && TRANSMISE.has(statutGU));
  return {
    dossier: { id: dossier.id, reference: dossier.reference, denomination: dossier.client_name },
    formalite: fid ? { id: fid, liasse: meta.inpi_liasse || gu?.liasseNumber || null, statut: statutGU, statut_label: STATUT_GU[statutGU] || statutGU } : null,
    etapes, courante, termine,
    // Rafraîchir plus souvent quand on attend un tiers (signataire, paiement)
    rafraichir_ms: termine ? 120000 : etapes.some((e) => e.statut === 'attente') ? 8000 : 30000,
  };
}

// ─── Actions ────────────────────────────────────────────────────
function champsSignature(documentYS, rang, nbPages) {
  const col = rang % 2;
  const ligne = Math.floor(rang / 2);
  return { document_id: documentYS, type: 'signature', page: nbPages || 1, x: 60 + col * 270, y: Math.max(40, 690 - ligne * 80), width: 200, height: 60 };
}

async function envoyerSignatureClient(supa, orgId, dossierId, { signataires }) {
  if (!yousignConfigure()) throw erreur('Yousign n’est pas configuré sur le serveur.', 400);
  const liste = (Array.isArray(signataires) ? signataires : []).slice(0, 20).map((s) => ({
    prenom: String(s?.prenom || '').trim().slice(0, 80), nom: String(s?.nom || '').trim().slice(0, 80),
    email: String(s?.email || '').trim().slice(0, 200), telephone: String(s?.telephone || '').trim().slice(0, 30),
  }));
  if (!liste.length) throw erreur('Indiquez au moins un signataire.', 400);
  const emails = new Set();
  for (const s of liste) {
    if (!s.prenom || !s.nom) throw erreur('Prénom et nom de chaque signataire obligatoires.', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) throw erreur(`E-mail invalide pour ${s.prenom} ${s.nom}.`, 400);
    if (emails.has(s.email.toLowerCase())) throw erreur(`L'e-mail ${s.email} est indiqué pour deux signataires.`, 400);
    emails.add(s.email.toLowerCase());
    if (s.telephone && telephoneE164(s.telephone) === null) throw erreur(`Téléphone invalide pour ${s.prenom} ${s.nom} (ex. 06 12 34 56 78 ou +33 6 12 34 56 78).`, 400);
  }
  const dossier = await dossierExige(supa, orgId, dossierId);
  const enCours = dossier.metadata?.parcours?.signature_client;
  if (['envoyee', 'en_cours'].includes(enCours?.statut)) throw erreur('Une demande de signature est déjà en cours : annulez-la avant d’en envoyer une nouvelle.', 409);
  const docs = actesASigner(await documentsDe(supa, dossierId));
  if (!docs.length) throw erreur('Aucun acte à faire signer.', 400);

  // Conversion en PDF en parallèle (LibreOffice) : c'est l'étape la plus lente
  const pdfs = await Promise.all(docs.map(async (d) => {
    const { data: blob, error } = await supa.storage.from(BUCKET).download(d.file_path);
    if (error || !blob) throw erreur(`Lecture impossible : ${d.name}`, 502);
    const buf = Buffer.from(await blob.arrayBuffer());
    return { doc: d, pdf: await toPdf(buf, d.mime_type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', d.name) };
  }));

  const sr = await yousign.createSignatureRequest({ name: `${dossier.client_name || 'Dossier'} — actes à signer (${dossier.reference || ''})`.slice(0, 120), deliveryMode: 'email' });
  const uploads = await Promise.all(pdfs.map(({ doc, pdf }) => yousign.uploadDocument(sr.id, { filename: `${String(doc.name).replace(/\.(docx|pdf)$/i, '')}.pdf`, base64Pdf: pdf.toString('base64') })));
  const correspondances = uploads.map((u, i) => ({ document_id: pdfs[i].doc.id, yousign_document_id: u.id, doc_type: pdfs[i].doc.doc_type, name: pdfs[i].doc.name, pages: u.total_pages }));
  for (const [rang, s] of liste.entries()) {
    await yousign.addSigner(sr.id, {
      firstName: s.prenom, lastName: s.nom, email: s.email, phoneNumber: telephoneE164(s.telephone),
      fields: correspondances.map((c) => champsSignature(c.yousign_document_id, rang, c.pages)),
    });
  }
  await yousign.activate(sr.id);
  await majParcours(supa, orgId, dossierId, {
    signature_client: { statut: 'envoyee', request_id: sr.id, envoyee_le: new Date().toISOString(), signataires: liste, documents: correspondances, erreurs: [], versees: [], a_reverser: [] },
  }, { yousign_client_request_id: sr.id });
  return { ok: true };
}

async function signerFormalite(supa, orgId, dossierId, { user, profile }) {
  if (!yousignConfigure()) throw erreur('Yousign n’est pas configuré sur le serveur.', 400);
  const { dossier, fid } = await formaliteExige(supa, orgId, dossierId);
  const enCours = dossier.metadata?.parcours?.signature_inpi;
  if (enCours?.statut === 'en_cours' && enCours.lien) return { ok: true, lien: enCours.lien };
  const gu = await formaliteGU(orgId, fid, { frais: true });
  if (!A_SIGNER.has(gu.status)) throw erreur(`La formalité n'est pas à signer (statut : ${STATUT_GU[gu.status] || gu.status}).`, 409);
  const prenom = profile?.first_name || user?.user_metadata?.first_name || '';
  const nom = profile?.last_name || user?.user_metadata?.last_name || '';
  if (!prenom || !nom || !user?.email) throw erreur('Renseignez vos prénom et nom dans votre profil : la signature est nominative.', 400);

  const client = inpi.forOrg(orgId);
  // Synthèse à jour (pièces ajoutées après la création), puis téléchargement (§ 6.4, § 3.13, § 3.15)
  try { await client.request(`/api/formalities/${fid}/refresh`, { timeoutMs: 30000, essais: 1 }); } catch { /* synthèse existante */ }
  const telecharger = async (chemin) => {
    // « Accept: application/pdf » est refusé (406) : en-têtes par défaut (*/*)
    const r = await client.rawFetch(chemin);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.slice(0, 5).toString() === '%PDF-' ? buf : null;
  };
  const [synthese, be] = await Promise.all([telecharger(`/api/formalities/${fid}/synthesis`), telecharger(`/api/formalities/${fid}/synthesis_be`)]);
  if (!synthese) throw erreur('Synthèse de la formalité indisponible au Guichet unique, réessayez dans un instant.', 502);

  // Le formaliste signe lui-même, tout de suite : lien de signature direct (pas d'e-mail)
  const sr = await yousign.createSignatureRequest({ name: `Signature formalité ${gu.liasseNumber || fid}`, deliveryMode: 'none' });
  const docs = { synthese, ...(be ? { be } : {}) };
  const roles = Object.keys(docs);
  const uploads = await Promise.all(roles.map((role) => yousign.uploadDocument(sr.id, {
    filename: role === 'be' ? `Synthese_BE_${gu.liasseNumber || fid}.pdf` : `Synthese_${gu.liasseNumber || fid}.pdf`, base64Pdf: docs[role].toString('base64'),
  })));
  const ys = Object.fromEntries(roles.map((r, i) => [r, uploads[i].id]));
  const signer = await yousign.addSigner(sr.id, {
    firstName: prenom, lastName: nom, email: user.email,
    level: process.env.YOUSIGN_NIVEAU_INPI || 'advanced_electronic_signature',
    authMode: process.env.YOUSIGN_AUTH_INPI || 'otp_email',
    fields: uploads.map((u) => champsSignature(u.id, 0, u.total_pages)),
  });
  const act = await yousign.activate(sr.id);
  const lien = (act?.signers || []).find((s) => s.id === signer.id)?.signature_link || signer?.signature_link || null;
  await majParcours(supa, orgId, dossierId, { signature_inpi: { statut: 'en_cours', request_id: sr.id, lien, yousign_documents: ys, ouverte_le: new Date().toISOString(), erreur: null, pieces: null } }, { yousign_inpi_request_id: sr.id });
  return { ok: true, lien };
}

// Création : signature électronique simple (§ 6.1), sur clic explicite du formaliste
async function signatureSimple(supa, orgId, dossierId) {
  const { fid } = await formaliteExige(supa, orgId, dossierId);
  const gu = await formaliteGU(orgId, fid, { frais: true });
  if (gu.typeFormalite !== 'C') throw erreur('La signature simple ne vaut que pour une création ; signez avec Yousign.', 400);
  if (!A_SIGNER.has(gu.status)) throw erreur(`La formalité n'est pas à signer (statut : ${STATUT_GU[gu.status] || gu.status}).`, 409);
  try { await inpi.forOrg(orgId).request(`/api/formalities/${fid}/refresh`, { timeoutMs: 30000, essais: 1 }); } catch { /* synthèse existante */ }
  await inpi.forOrg(orgId).request('/api/signatures', { method: 'POST', body: { formality: `/api/formalities/${fid}` } });
  oublierGU(orgId, fid);
  await majParcours(supa, orgId, dossierId, { signature_inpi: { statut: 'signee', mode: 'simple', signee_le: new Date().toISOString(), erreur: null } });
  return { ok: true };
}

async function annulerSignature(supa, orgId, dossierId, etape) {
  const dossier = await dossierExige(supa, orgId, dossierId);
  const e = dossier.metadata?.parcours?.[etape];
  if (e?.request_id && yousignConfigure()) {
    try { await yousign.cancel(e.request_id); } catch { /* déjà terminée ou supprimée */ }
    cacheYS.delete(e.request_id);
  }
  // Les signataires saisis restent proposés pour le prochain envoi
  await majParcours(supa, orgId, dossierId, { [etape]: null });
  if (etape === 'signature_client' && e?.signataires) await majParcours(supa, orgId, dossierId, { signature_client: { statut: 'annulee', signataires: e.signataires } });
  return { ok: true };
}

async function annonceFaite(supa, orgId, dossierId) {
  await dossierExige(supa, orgId, dossierId);
  await majParcours(supa, orgId, dossierId, { annonce: { statut: 'faite', le: new Date().toISOString() } });
}

async function verserAttestation(supa, orgId, dossierId) {
  const { dossier, fid } = await formaliteExige(supa, orgId, dossierId);
  const docs = (await documentsDe(supa, dossierId)).filter(estAttestation);
  const doc = docs[docs.length - 1];
  if (!doc) throw erreur("Aucune attestation de parution jointe : déposez-la dans le chat.", 400);
  const gu = await formaliteGU(orgId, fid, { frais: true });
  const cat = categorieGU('ATTESTATION_PARUTION', gu, dossier.metadata?.agent_data || {});
  if (!cat) throw erreur("Cette formalité n'attend pas d'attestation de parution.", 400);
  const { data: blob, error } = await supa.storage.from(BUCKET).download(doc.file_path);
  if (error || !blob) throw erreur('Lecture de l’attestation impossible.', 502);
  const pdf = await toPdf(Buffer.from(await blob.arrayBuffer()), doc.mime_type || 'application/pdf', doc.name);
  await verserPiece(orgId, fid, cat, `${String(doc.name).replace(/\.[a-z0-9]+$/i, '')}.pdf`, pdf);
  await regenererSynthese(orgId, fid);
  await majParcours(supa, orgId, dossierId, { annonce: { attestation_versee_id: doc.id, versee_le: new Date().toISOString() } });
}

async function payer(supa, orgId, dossierId, { confirme, montant_cents: montantVu }) {
  if (confirme !== true) throw erreur('Confirmation du paiement requise.', 400);
  if (!paiementCompteConfigure()) throw erreur('Compte client INPI non configuré.', 400);
  const { fid } = await formaliteExige(supa, orgId, dossierId);
  const gu = await formaliteGU(orgId, fid, { frais: true });
  if (!A_PAYER.has(gu.status)) throw erreur(`La formalité n'est pas à payer (statut : ${STATUT_GU[gu.status] || gu.status}).`, 409);
  const paniers = (gu.carts || []).filter((c) => c.status === 'TO_PAY');
  const total = paniers.reduce((s, c) => s + (c.total || 0), 0);
  if (!paniers.length) throw erreur('Aucun panier à payer.', 409);
  // Le montant payé doit être celui affiché au formaliste
  if (Number(montantVu) !== Number(total)) throw erreur('Le montant a changé depuis l’affichage : vérifiez puis confirmez à nouveau.', 409);
  const r = await inpi.forOrg(orgId).request('/api/payment', {
    method: 'POST',
    body: { login: process.env.INPI_CCL_LOGIN, password: process.env.INPI_CCL_PASSWORD, paymentType: 'CCL', formality: `/api/formalities/${fid}` },
  });
  oublierGU(orgId, fid);
  await majParcours(supa, orgId, dossierId, { paiement: { mode: 'compte_client', paye_le: new Date().toISOString(), montant_cents: total, commande: r?.orderNum || null } });
  return { ok: true };
}

async function deleguer(supa, orgId, dossierId, { email, designation }) {
  const mail = String(email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) throw erreur('E-mail du client invalide.', 400);
  const { dossier, fid } = await formaliteExige(supa, orgId, dossierId);
  const deja = dossier.metadata?.parcours?.paiement?.delegation_a;
  if (deja && deja.toLowerCase() === mail.toLowerCase()) throw erreur(`Délégation déjà active pour ${mail} : le client a reçu le lien de paiement. Indiquez une autre adresse pour changer de payeur.`, 409);
  const gu = await formaliteGU(orgId, fid, { frais: true });
  const panier = (gu.carts || []).find((c) => c.status === 'TO_PAY');
  if (!A_PAYER.has(gu.status) || !panier) throw erreur(`La formalité n'est pas à payer (statut : ${STATUT_GU[gu.status] || gu.status}).`, 409);
  await inpi.forOrg(orgId).request('/api/delegation-payments', {
    method: 'POST',
    body: { cart: `/api/carts/${panier.id}`, payerMail: mail, designation: String(designation || dossier.client_name || '').slice(0, 120) },
  });
  oublierGU(orgId, fid);
  await majParcours(supa, orgId, dossierId, { paiement: { mode: 'delegation', delegation_a: mail, delegation_le: new Date().toISOString() } });
  return { ok: true };
}

// Webhook Yousign : retrouve le dossier et l'étape d'une demande de signature
async function surWebhook(supa, requestId, eventName) {
  const id = String(requestId || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false; // identifiant Yousign (UUID) : pas d'injection dans le filtre
  const [a, b] = await Promise.all([
    supa.from('dossiers').select('id, organization_id, metadata').eq('metadata->>yousign_client_request_id', id).limit(1),
    supa.from('dossiers').select('id, organization_id, metadata').eq('metadata->>yousign_inpi_request_id', id).limit(1),
  ]);
  const dossier = a.data?.[0] || b.data?.[0];
  if (!dossier) return false;
  const etape = b.data?.[0] ? 'signature_inpi' : 'signature_client';
  cacheYS.delete(id);
  // Événement d'une ancienne demande (annulée puis remplacée) : ignoré
  if (dossier.metadata?.parcours?.[etape]?.request_id !== id) return true;
  if (['signature_request.done', 'signature_request.signed'].includes(eventName)) await finaliser(supa, dossier.organization_id, dossier.id, etape, id);
  else if (['signature_request.declined', 'signature_request.expired'].includes(eventName)) {
    await majParcours(supa, dossier.organization_id, dossier.id, { [etape]: { statut: eventName.endsWith('declined') ? 'refusee' : 'expiree', maj: new Date().toISOString() } });
  }
  // signature_request.canceled : annulation faite par le cabinet, rien à faire
  return true;
}

module.exports = {
  ETAPES, etat, envoyerSignatureClient, signerFormalite, signatureSimple, annulerSignature, payer, deleguer, surWebhook,
  reverserActes, redeclarerSignature, annonceFaite, verserAttestation,
  // tests
  _interne: { annonceRequise, actesASigner, categorieGU, signatairesProposes, champsSignature, telephoneE164, estAttestation },
};
