// Orchestrateur de formalité — le « cerveau » de la flotte d'agents.
//
// Ne fait AUCUN appel réseau : c'est une fonction pure qui, à partir de l'état
// réel d'un dossier (statut, inpi_content, metadata signature, documents),
// calcule l'avancement de chaque étape-agent et désigne la prochaine action.
//
// Chaque étape = un agent spécialisé qui automatise un maillon de la chaîne :
//   collecte → identité (OCR) → rédaction (statuts) → signature (eIDAS)
//   → contrôle interne → dépôt INPI.
//
// Statuts d'étape :
//   done     étape terminée
//   active   prochaine étape actionnable (l'agent peut agir maintenant)
//   waiting  en cours côté tiers, on attend (ex : signataire n'a pas encore signé)
//   pending  étape future, pas encore atteignable
//   blocked  bloquée par une condition non remplie (input requis)

// ─── Extraction tolérante du contenu INPI ────────────────
// Le contenu diffère selon la forme (personneMorale vs personnePhysique) et
// selon le wizard. On lit défensivement sans jamais planter.
function readContent(dossier) {
  const c = dossier?.inpi_content || {};
  const pm = c.personneMorale || {};
  const pp = c.personnePhysique || {};

  const entreprise =
    pm.identite?.entreprise || pp.identite?.entreprise || pp.entreprise || {};
  const denomination =
    entreprise.denomination ||
    pp.identite?.entrepreneur?.descriptionPersonne?.nomNaissance ||
    dossier?.client_name ||
    '';
  const objet = entreprise.objet || '';
  const capital = entreprise.capital ?? entreprise.montantCapital ?? null;

  // Dirigeant(s) : président (SAS/SASU), gérant (SARL/EURL/SCI), ou entrepreneur (AE)
  const pouvoirs = pm.composition?.pouvoirs || [];
  const dirigeants = [];
  for (const p of pouvoirs) {
    const ind = p.individu || p.personnePhysique || {};
    const desc = ind.descriptionPersonne || {};
    if (desc.nomNaissance || desc.prenoms?.length) dirigeants.push(desc);
  }
  // Forme unipersonnelle : président/gérant peut être stocké à part
  const solo =
    pm.composition?.president?.descriptionPersonne ||
    pm.composition?.gerant?.descriptionPersonne ||
    pp.identite?.entrepreneur?.descriptionPersonne;
  if (solo && !dirigeants.length) dirigeants.push(solo);

  const etab = pm.etablissementPrincipal || pp.etablissementPrincipal || {};
  const adresse = etab.adresse || {};
  const activite = (etab.activites && etab.activites[0]) || {};

  return { denomination, objet, capital, dirigeants, adresse, activite };
}

// Un dirigeant est « identifié » si on a nom + date de naissance (ce que produit
// l'OCR de la pièce d'identité, ou une saisie manuelle complète).
function dirigeantIdentifie(desc) {
  return Boolean(desc?.nomNaissance && desc?.dateDeNaissance);
}

// Détecte la présence de statuts générés/signés dans les documents du dossier.
function hasStatuts(documents) {
  return (documents || []).some(
    (d) =>
      d.doc_type === 'STATUTS' ||
      /statut/i.test(d.name || '') ||
      /statut/i.test(d.doc_type || ''),
  );
}

function hasSignedDoc(documents) {
  return (documents || []).some((d) => d.status === 'SIGNE');
}

// ─── Construction de la pipeline ─────────────────────────
// dossier : ligne `dossiers` (avec inpi_content, metadata, statut, type_formalite)
// documents : lignes `dossier_documents`
function buildPipeline(dossier, documents = []) {
  const content = readContent(dossier);
  const meta = dossier?.metadata || {};
  const statut = dossier?.statut || 'DRAFT';
  const sigStatus = meta.signature_status || null;

  // La signature avancée est légalement requise pour toute liasse INPI (statuts,
  // modification, cessation). Le back-end ne la bloque aujourd'hui que pour
  // MODIFICATION/RADIATION, mais l'orchestrateur la présente toujours.
  const nbDirigeants = content.dirigeants.length;
  const dirigeantsOk =
    nbDirigeants > 0 && content.dirigeants.every(dirigeantIdentifie);

  const collecteDone = Boolean(content.denomination && content.objet);
  const statutsDone = hasStatuts(documents);
  const signatureDone = sigStatus === 'signed' || hasSignedDoc(documents);
  const signatureOngoing = ['ongoing', 'pending', 'approval'].includes(sigStatus);
  const signatureFailed = ['declined', 'expired'].includes(sigStatus);
  const validationDone = ['VALIDATED_INTERNAL', 'RECEIVED', 'VALIDATED'].includes(
    statut,
  );
  const depotDone =
    ['RECEIVED', 'VALIDATED'].includes(statut) && Boolean(dossier?.inpi_reference);

  const steps = [
    {
      key: 'collecte',
      agent: 'Agent Collecte',
      title: 'Données de la société',
      description:
        'Dénomination, objet, capital, siège et activité — saisis ou pré-remplis par l’IA.',
      done: collecteDone,
      detail: collecteDone
        ? content.denomination
        : 'Complétez les informations de la société dans le wizard.',
      action: collecteDone ? null : { kind: 'wizard', label: 'Ouvrir le wizard' },
    },
    {
      key: 'identite',
      agent: 'Agent Identité (OCR)',
      title: 'Pièces d’identité des dirigeants',
      description:
        'Scan OCR des pièces d’identité (recto/verso) — extraction automatique nom, date et lieu de naissance.',
      done: dirigeantsOk,
      detail: dirigeantsOk
        ? `${nbDirigeants} dirigeant(s) identifié(s)`
        : nbDirigeants
          ? 'Un dirigeant est incomplet — scannez sa pièce d’identité.'
          : 'Aucun dirigeant renseigné.',
      action: dirigeantsOk ? null : { kind: 'wizard', label: 'Scanner une pièce' },
    },
    {
      key: 'redaction',
      agent: 'Agent Rédaction',
      title: 'Génération des statuts',
      description:
        'Rédaction automatique des statuts (.docx) à partir des données du dossier.',
      done: statutsDone,
      detail: statutsDone
        ? 'Statuts générés.'
        : 'Générez les statuts à partir des données collectées.',
      action: statutsDone
        ? null
        : { kind: 'generate-doc', label: 'Générer les statuts' },
    },
    {
      key: 'signature',
      agent: 'Agent Signature eIDAS',
      title: 'Signature électronique avancée',
      description:
        'Envoi du document à signer (Yousign, signature avancée eIDAS + OTP SMS).',
      done: signatureDone,
      waiting: signatureOngoing,
      failed: signatureFailed,
      detail: signatureDone
        ? 'Document signé.'
        : signatureOngoing
          ? `En attente de signature${meta.signature_signer_email ? ' de ' + meta.signature_signer_email : ''}…`
          : signatureFailed
            ? `Signature ${sigStatus === 'declined' ? 'refusée' : 'expirée'} — relancez la demande.`
            : 'Envoyez le document en signature au représentant légal.',
      link: meta.signature_link || null,
      action: signatureDone
        ? null
        : signatureOngoing
          ? { kind: 'sign-status', label: 'Suivre la signature' }
          : { kind: 'sign-request', label: 'Envoyer en signature' },
    },
    {
      key: 'controle',
      agent: 'Agent Contrôle',
      title: 'Validation interne',
      description:
        'Contrôle de cohérence de la liasse avant transmission à l’INPI.',
      done: validationDone,
      detail: validationDone
        ? 'Dossier validé en interne.'
        : 'En attente de validation par un administrateur du cabinet.',
      action: validationDone ? null : { kind: 'validate', label: 'Valider le dossier' },
    },
    {
      key: 'depot',
      agent: 'Agent Dépôt INPI',
      title: 'Dépôt Guichet Unique',
      description:
        'Transmission de la formalité à l’INPI via les identifiants du cabinet.',
      done: depotDone,
      detail: depotDone
        ? `Déposé — réf. INPI ${dossier.inpi_reference}`
        : 'Transmission à l’INPI (identifiants cabinet requis).',
      action: depotDone ? null : { kind: 'submit-inpi', label: 'Déposer à l’INPI' },
    },
  ];

  // Détermine le statut d'affichage de chaque étape et la prochaine action.
  let nextIndex = -1;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.done) {
      s.status = 'done';
    } else if (s.waiting) {
      s.status = 'waiting';
      if (nextIndex === -1) nextIndex = i;
    } else if (nextIndex === -1) {
      // première étape non terminée = active (l'agent peut agir)
      s.status = s.failed ? 'blocked' : 'active';
      nextIndex = i;
    } else {
      s.status = 'pending';
    }
  }

  const doneCount = steps.filter((s) => s.done).length;
  const next = nextIndex >= 0 ? steps[nextIndex] : null;

  return {
    dossierId: dossier?.id,
    reference: dossier?.reference || null,
    typeFormalite: dossier?.type_formalite || null,
    statut,
    progress: {
      done: doneCount,
      total: steps.length,
      percent: Math.round((doneCount / steps.length) * 100),
      complete: doneCount === steps.length,
    },
    steps,
    next: next
      ? {
          key: next.key,
          agent: next.agent,
          title: next.title,
          action: next.action,
          waiting: Boolean(next.waiting),
        }
      : null,
    society: {
      denomination: content.denomination,
      objet: content.objet,
      dirigeants: content.dirigeants.length,
    },
  };
}

module.exports = { buildPipeline, readContent };
