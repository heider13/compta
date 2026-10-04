// Stockage et génération des documents d'un dossier — partagé par la route
// /generate-doc et par l'agent formalités.
//
//   extractFromContent(inpi_content, dossier) → données normalisées pour les statuts
//   generateStatutsForDossier(supa, dossier, userId, overrides) → ligne dossier_documents
//   storeDossierDocument(supa, dossier, {buffer, filename, docType, userId}) → ligne dossier_documents

const { generateStatuts, SUPPORTED_FORMES } = require('./doc-generator');

const BUCKET = 'dossier-docs';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function joinAdresse(a) {
  if (!a) return null;
  const ligne = [a.numVoie, a.voie, a.complement].filter(Boolean).join(' ').trim();
  const ville = [a.codePostal, a.commune].filter(Boolean).join(' ').trim();
  const s = [ligne, ville].filter(Boolean).join(', ');
  return s || null;
}

function mapIndividu(desc, adresseDomicile) {
  if (!desc) return {};
  return {
    nom: desc.nomNaissance || desc.nom || null,
    prenoms: Array.isArray(desc.prenoms) ? desc.prenoms.filter(Boolean) : [],
    dateNaissance: desc.dateDeNaissance || null,
    lieuNaissance: desc.lieuDeNaissance?.commune || null,
    nationalite: desc.codeNationalite || null,
    adresse: joinAdresse(adresseDomicile),
  };
}

// Extraction best-effort depuis le inpi_content des wizards société
// (structure personneMorale des wizards sasu/sas/eurl/sarl/sci/holding).
function extractFromContent(content, dossier) {
  const pm = content?.personneMorale || {};
  const entreprise = pm.identite?.entreprise || {};
  const compo = pm.composition || {};
  const etab = pm.etablissementPrincipal || {};

  const pouvoir = (compo.pouvoirs || [])[0]?.individu;
  const dirigeant = pouvoir
    ? mapIndividu(pouvoir.descriptionPersonne, pouvoir.adresseDomicile)
    : {};

  const associes = (compo.associes || []).map((a) => ({
    ...mapIndividu(a.individu, a.individu?.adresseDomicile),
    apportCents:
      a.apports?.numeraire != null ? Math.round(Number(a.apports.numeraire) * 100) : null,
    nbTitres: a.partsSociales ?? null,
  }));

  const nbTitres = associes.reduce((s, a) => s + (Number(a.nbTitres) || 0), 0) || null;

  return {
    denomination: entreprise.denomination || dossier.client_name || null,
    formeJuridique: entreprise.formeJuridique || dossier.forme_juridique || null,
    objet: entreprise.objet || null,
    dureeAnnees: entreprise.dureeSociete || 99,
    capitalCents:
      entreprise.capital != null ? Math.round(Number(entreprise.capital) * 100) : null,
    nbTitres,
    siege: joinAdresse(etab.adresse),
    dirigeant,
    associes: associes.length ? associes : undefined,
  };
}

// Upload Storage + ligne dossier_documents. Le statut 'GENERE' n'existe pas sur
// toutes les bases (enum doc_status d'origine : TRANSMIS/A_CORRIGER/OFFICIEL) :
// on retombe sur 'TRANSMIS' si l'enum le refuse.
async function storeDossierDocument(supa, dossier, { buffer, filename, docType, userId, mimeType = DOCX_MIME }) {
  const storagePath = `generated/${dossier.id}/${Date.now()}-${filename}`;
  const { error: upErr } = await supa.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (upErr) {
    const e = new Error(`Upload Storage impossible : ${upErr.message}`);
    e.status = 500;
    e.code = 'storage_upload_failed';
    throw e;
  }

  const row = {
    dossier_id: dossier.id,
    name: filename,
    file_path: storagePath,
    size_bytes: buffer.length,
    mime_type: mimeType,
    doc_type: docType,
  };
  let { data: doc, error } = await supa
    .from('dossier_documents')
    .insert({ ...row, status: 'GENERE' })
    .select()
    .single();
  if (error && /enum|invalid input value/i.test(error.message)) {
    ({ data: doc, error } = await supa
      .from('dossier_documents')
      .insert({ ...row, status: 'TRANSMIS' })
      .select()
      .single());
  }
  if (error) {
    const e = new Error(`Enregistrement du document impossible : ${error.message}`);
    e.status = 500;
    e.code = 'db_error';
    throw e;
  }

  try {
    await supa.from('audit_logs').insert({
      organization_id: dossier.organization_id,
      user_id: userId,
      action: 'dossier.document.generated',
      resource_type: 'dossier',
      resource_id: dossier.id,
      metadata: { doc_type: docType, storage_path: storagePath },
    });
  } catch {}

  return doc;
}

async function generateStatutsForDossier(supa, dossier, userId, overrides = {}) {
  const extracted = extractFromContent(dossier.inpi_content, dossier);
  const data = {
    ...extracted,
    ...overrides,
    dateSignature: overrides.dateSignature || new Date().toISOString().slice(0, 10),
  };
  if (!SUPPORTED_FORMES.includes(String(data.formeJuridique || '').toUpperCase())) {
    const e = new Error(
      `Génération de statuts disponible pour : ${SUPPORTED_FORMES.join(', ')}. Forme du dossier : ${data.formeJuridique || 'inconnue'}.`,
    );
    e.status = 422;
    e.code = 'unsupported_forme';
    throw e;
  }
  const { buffer, filename } = await generateStatuts(data);
  return storeDossierDocument(supa, dossier, { buffer, filename, docType: 'STATUTS', userId });
}

async function signedUrl(supa, filePath, seconds = 3600) {
  const { data } = await supa.storage.from(BUCKET).createSignedUrl(filePath, seconds);
  return data?.signedUrl || null;
}

module.exports = {
  BUCKET,
  extractFromContent,
  storeDossierDocument,
  generateStatutsForDossier,
  signedUrl,
};
