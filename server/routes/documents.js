// Génération de documents juridiques pour un dossier.
// POST /api/dossiers/:id/generate-doc  { docType: 'STATUTS', overrides?: {...} }
//
// Suppose requireUser + requireOrg appliqués en amont.
// Le document généré est uploadé dans Storage (dossier-docs/generated/...) et
// référencé dans dossier_documents — il apparaît dans les pièces du dossier.

const express = require('express');
const router = express.Router();

const { generateStatuts, SUPPORTED_FORMES } = require('../lib/doc-generator');
const { getSupabaseAdmin } = require('../lib/db');

const BUCKET = 'dossier-docs';

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

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

router.post(
  '/:id/generate-doc',
  asyncRoute(async (req, res) => {
    const { docType = 'STATUTS', overrides = {} } = req.body || {};
    if (docType !== 'STATUTS') {
      return res.status(400).json({ error: 'unsupported_doc_type', supported: ['STATUTS'] });
    }

    const supa = getSupabaseAdmin();
    const { data: dossier, error: dErr } = await supa
      .from('dossiers')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (dErr || !dossier) return res.status(404).json({ error: 'not_found' });

    // Sécurité : membre de l'org du dossier, propriétaire, ou admin global.
    const isAdmin = req.profile?.role === 'admin';
    const isOwn = dossier.user_id === req.user.id;
    const isOrgMember =
      dossier.organization_id && dossier.organization_id === req.currentOrgId;
    if (!isAdmin && !isOwn && !isOrgMember) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const extracted = extractFromContent(dossier.inpi_content, dossier);
    const data = {
      ...extracted,
      ...overrides,
      dateSignature: overrides.dateSignature || new Date().toISOString().slice(0, 10),
    };

    if (!SUPPORTED_FORMES.includes(String(data.formeJuridique || '').toUpperCase())) {
      return res.status(422).json({
        error: 'unsupported_forme',
        detail: `Génération de statuts disponible pour : ${SUPPORTED_FORMES.join(', ')}. Forme du dossier : ${data.formeJuridique || 'inconnue'}.`,
      });
    }

    const { buffer, filename } = await generateStatuts(data);

    const storagePath = `generated/${dossier.id}/${Date.now()}-${filename}`;
    const { error: upErr } = await supa.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: false,
    });
    if (upErr) {
      return res.status(500).json({ error: 'storage_upload_failed', detail: upErr.message });
    }

    const { data: doc, error: insErr } = await supa
      .from('dossier_documents')
      .insert({
        dossier_id: dossier.id,
        name: filename,
        file_path: storagePath,
        size_bytes: buffer.length,
        mime_type:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        status: 'GENERE',
      })
      .select()
      .single();
    if (insErr) {
      return res.status(500).json({ error: 'db_error', detail: insErr.message });
    }

    // Audit
    try {
      await supa.from('audit_logs').insert({
        organization_id: dossier.organization_id,
        user_id: req.user.id,
        action: 'dossier.document.generated',
        resource_type: 'dossier',
        resource_id: dossier.id,
        metadata: { doc_type: docType, storage_path: storagePath },
      });
    } catch {}

    res.status(201).json({ ok: true, document: doc });
  }),
);

module.exports = router;
