// Agent Formalités — mène une formalité de bout en bout à partir d'une
// conversation : collecte des informations, création du dossier, génération
// des statuts et des actes annexes.
//
// Boucle d'outils manuelle (Claude API + tool use) : l'agent dit QUOI faire,
// chaque outil exécute côté serveur avec les contrôles d'accès du cabinet.
// L'agent ne signe et ne dépose JAMAIS : signature Yousign, validation interne
// et dépôt INPI restent des actions humaines depuis la page du dossier.
//
// Historique : le client renvoie à chaque tour l'historique complet renvoyé au
// tour précédent (messages Anthropic, blocs thinking inclus, sans modification).
// Le dossier courant est porté par ctx.dossierId (jamais par le modèle).

const { toFile } = require('@anthropic-ai/sdk');
const { getAnthropic, MODELS, draftDocument, searchLegalChunks } = require('./ai');
const { extractText } = require('./text-extract');
const { getSupabaseAdmin } = require('./db');
const { buildPipeline } = require('./orchestrator');
const { buildPersonneMorale } = require('./inpi-builder');
const { markdownToDocx } = require('./markdown-docx');
const { Packer } = require('docx');
const {
  generateStatutsForDossier, storeDossierDocument, signedUrl,
} = require('./dossier-docs');
const { SUPPORTED_FORMES } = require('./doc-generator');
const inpi = require('../inpi');
const { getFormalitySummary, downloadAttachment } = require('./inpi-formality');
const { buildCreationLiasse, buildEILiasse, createDraftWithPieces, PIECES, PIECES_EI } = require('./inpi-liasse');
const rne = require('./inpi-rne');
const greffes = require('./greffes');
const annonces = require('./annonces-legales');
const rneDocs = require('./rne-documents');
const { createModificationDraft, appliquerOperations, baseModification, donneesManquantes } = require('./inpi-modification');
const { deposerPieces, PIECES_MODIF } = require('./inpi-liasse');
const { BUCKET } = require('./dossier-docs');
const knowledge = require('./knowledge');
const gabarits = require('./gabarits');
const { mandataireBlocks } = require('./inpi-liasse');
const ca = require('./inpi-comptes-annuels');
const groupes = require('./groupes');

const MAX_ITERATIONS = 12;
// Outils qui créent ou modifient le dossier, le Guichet unique ou un lot : jamais en parallèle.
// Outils qui créent quelque chose au Guichet unique : interdits pour une prestation seule
const OUTILS_DEPOT = new Set(['creer_brouillon_inpi', 'creer_modification_inpi', 'deposer_comptes_annuels']);
const OUTILS_SEQUENTIELS = new Set(['enregistrer_dossier', 'creer_brouillon_inpi', 'creer_modification_inpi', 'deposer_comptes_annuels', 'preparer_lot', 'lancer_lot', 'modifier_groupe']);

// Pièces jointes acceptées dans le chat (lues par Claude).
const ATTACHMENT_TYPES = {
  'application/pdf': 'document',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  // Tableurs (listes de formalités à préparer en lot) : convertis en CSV
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'tableur',
  'application/vnd.ms-excel': 'tableur',
  'application/vnd.oasis.opendocument.spreadsheet': 'tableur',
  'text/csv': 'tableur',
};
const EXT_TABLEUR = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods',
  'text/csv': 'csv',
};
const DOCX_MAX_CHARS = 60000;

// Tarifs ($ / million de tokens) pour l'estimation affichée dans les logs :
// Opus 5.5 pour l'agent, Sonnet 5 pour la rédaction des actes (MODELS.balanced).
const PRICES = { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 };
const DRAFT_PRICES = { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 };

function costUsd(u, p) {
  return (u.input * p.input + u.output * p.output + u.cacheWrite * p.cacheWrite + u.cacheRead * p.cacheRead) / 1e6;
}
const CREATION_FORMES = ['SASU', 'SAS', 'EURL', 'SARL', 'SCI', 'HOLDING'];

// ─── Actes annexes rédigés par l'IA ───────────────────────────────
const ACTES = {
  declaration_non_condamnation: "Déclaration sur l'honneur de non-condamnation et de filiation du dirigeant",
  liste_souscripteurs: 'Liste des souscripteurs et état des versements',
  attestation_domiciliation: 'Attestation de domiciliation du siège social',
  pouvoir_formalites: 'Pouvoir pour accomplir les formalités',
  decision_nomination: 'Acte de nomination du premier dirigeant',
  pv_decision: "Procès-verbal de décision des associés",
  pv_dissolution: 'Procès-verbal de dissolution anticipée',
  reponse_greffe: 'Courrier de réponse à la demande de régularisation du greffe',
  bail_commercial: 'Bail commercial',
  attestation_hebergement: "Attestation d'hébergement du siège chez le dirigeant",
  acte_cession: "Acte de cession d'actions ou de parts sociales",
  statuts_mis_a_jour: 'Statuts mis à jour',
  declaration_beneficiaires: 'Déclaration des bénéficiaires effectifs',
  pv_approbation_comptes: "Procès-verbal d'approbation des comptes et d'affectation du résultat (ou décision de l'associé unique)",
  declaration_confidentialite: 'Déclaration de confidentialité des comptes annuels (art. L232-25 du Code de commerce)',
  autre: 'Document juridique',
};

// Modèle du cabinet utilisé pour chaque type d'acte (voir lib/knowledge.js).
const MODELE_PAR_ACTE = {
  declaration_non_condamnation: 'non_condamnation',
  liste_souscripteurs: 'liste_souscripteurs',
  attestation_hebergement: 'attestation_hebergement',
  pouvoir_formalites: 'mandat',
  pv_decision: 'pv_assemblee',
  pv_dissolution: 'pv_assemblee',
  pv_approbation_comptes: 'pv_assemblee',
  bail_commercial: 'bail_commercial',
  acte_cession: 'acte_cession',
  statuts_mis_a_jour: 'statuts_mis_a_jour',
};

// Actes remplis par gabarit (sans IA) : type d'acte → gabarit (data/gabarits)
const GABARIT_PAR_ACTE = {
  declaration_non_condamnation: 'non_condamnation',
  liste_souscripteurs: 'liste_souscripteurs',
  pouvoir_formalites: 'mandat',
  attestation_hebergement: 'attestation_hebergement',
};
const GABARIT_STATUTS = { SASU: 'statuts_sasu', SAS: 'statuts_sas', HOLDING: 'statuts_sas', SARL: 'statuts_sarl', EURL: 'statuts_sarl', SCI: 'statuts_sci' };

// Identité du cabinet mandataire (pour le pouvoir) : déclarant du compte Guichet unique, mis en cache 24 h.
const cacheCabinet = new Map();
async function identiteCabinet(orgId) {
  const hit = cacheCabinet.get(orgId);
  if (hit && hit.exp > Date.now()) return hit.v;
  let v = {};
  try {
    const { declarant } = await mandataireBlocks(inpi.forOrg(orgId));
    const ind = declarant?.individu?.descriptionPersonne || {};
    const adr = declarant?.entreprise?.adresse || declarant?.individu?.adresseDomicile || {};
    v = {
      denomination: declarant?.entrepriseMandataire?.denomination || null,
      // Le compte Guichet unique range souvent l'adresse complète dans complementLocalisation
      adresse: (adr.voie || adr.complementLocalisation)
        ? [[adr.numVoie, adr.typeVoie, adr.voie].filter(Boolean).join(' '), adr.complementLocalisation, `${adr.codePostal || ''} ${adr.commune || ''}`.trim()].filter(Boolean).join(', ')
        : null,
      representant: [ind.prenoms?.[0], ind.nom].filter(Boolean).join(' ') || null,
    };
  } catch {}
  cacheCabinet.set(orgId, { v, exp: Date.now() + 24 * 3600 * 1000 });
  return v;
}

// Société existante : identité officielle (RNE) complétée par les données du dossier, qui priment.
const FORMES_RNE = { 6540: 'SCI', 5710: 'SAS', 5720: 'SASU', 5499: 'SARL', 5498: 'EURL' };
async function avecFicheRne(ctx, data) {
  const siren = String(data.siren || '').replace(/\D/g, '');
  if (siren.length !== 9) return data;
  let company;
  try { company = await rne.getCompany(ctx.orgId, siren); } catch { return data; }
  const f = rne.summarizeCompany(company);
  const pm = company?.formality?.content?.personneMorale || {};
  const adr = pm.adresseEntreprise?.adresse || {};
  const typeVoie = VOIE_EN_CLAIR[adr.typeVoie] || adr.typeVoie;
  const indice = { B: 'bis', T: 'ter', Q: 'quater' }[adr.indiceRepetition] || adr.indiceRepetition;
  const siege = [[adr.numVoie, indice, typeVoie, adr.voie].filter(Boolean).join(' '), adr.complementLocalisation, `${adr.codePostal || ''} ${adr.commune || ''}`.trim()].filter(Boolean).join(', ');
  const rnePart = {
    denomination: f.denomination || undefined,
    formeJuridique: FORMES_RNE[f.formeJuridique] || undefined,
    capitalEuros: f.capital ?? undefined,
    objet: f.objet || undefined,
    siegeTexte: siege || undefined,
    rcsVille: greffes.villeGreffe(adr.codeInseeCommune) || undefined,
  };
  // L'identité officielle prime ; le dossier ne complète que ce que le RNE ne porte pas (objet souvent absent)
  const out = { ...data };
  for (const [k, v] of Object.entries(rnePart)) if (v !== undefined && v !== null && v !== '') out[k] = v;
  if (rnePart.siegeTexte) delete out.siege;
  return out;
}
const VOIE_EN_CLAIR = {
  BD: 'boulevard', AV: 'avenue', RUE: 'rue', CHE: 'chemin', IMP: 'impasse', PL: 'place', ALL: 'allée', QUAI: 'quai',
  RTE: 'route', CRS: 'cours', SQ: 'square', PAS: 'passage', TRA: 'traverse', MTE: 'montée', LOT: 'lotissement',
  RES: 'résidence', ESP: 'esplanade', FG: 'faubourg', HAM: 'hameau', PRV: 'parvis', PROM: 'promenade',
};

// Acte rempli par gabarit et rangé dans le dossier ; null si pas de gabarit.
async function acteParGabarit(supa, ctx, dossier, nomGabarit, { label, docType, filename, donnees }) {
  const data = donnees || dossier.metadata?.agent_data || {};
  const cabinet = nomGabarit === 'mandat' ? await identiteCabinet(ctx.orgId) : {};
  const acte = gabarits.genererActe(nomGabarit, data, { dossier, cabinet });
  if (!acte) return null;
  const buffer = await Packer.toBuffer(markdownToDocx(label, acte.markdown));
  const doc = await storeDossierDocument(supa, dossier, { buffer, filename, docType, userId: ctx.userId });
  const url = await signedUrl(supa, doc.file_path);
  return {
    result: {
      document: doc.name, ajoute_aux_pieces: true, redige_par_gabarit: true, champs_a_completer: acte.trous,
      rappel: acte.trous.length ? 'Demander ces informations (enregistrer_dossier) puis régénérer : un acte incomplet ne peut pas être signé ni déposé.' : undefined,
    },
    event: { kind: 'document', label, detail: acte.trous.length ? `${doc.name} · ${acte.trous.length} champ(s) à compléter` : doc.name, href: url, docHref: dossierUrl(dossier) },
  };
}

// ─── Contrôles avant dépôt au Guichet unique ───────────────────────
// Actes qui doivent être déposés SIGNÉS. Un acte rédigé par Legaly (doc_type de l'acte,
// statut GENERE) n'est déposable qu'une fois signé (statut SIGNE). Les pièces jointes par
// le client (scans signés, documents officiels) sont acceptées telles quelles.
const CATEGORIES_A_SIGNER = new Set([
  'STATUTS', 'NON_CONDAMNATION', 'LISTE_SOUSCRIPTEURS', 'MANDAT', 'ATTESTATION_HEBERGEMENT',
  'PV_DECISION', 'PV_MISE_EN_SOMMEIL', 'STATUTS_MIS_A_JOUR', 'ACTE_CESSION', 'PV_CLOTURE_LIQUIDATION',
  'PV_CLOTURE_LIQUIDATION_ENREGISTRE', 'COMPTE_LIQUIDATION', 'RAPPORT_LIQUIDATEUR',
  'PV_AFFECTATION', 'DECLARATION_CONFIDENTIALITE', 'REFUS_APPROBATION',
]);
const DOCS_FOURNIS = new Set(['PIECE_JOINTE', 'ACTE_RNE', 'COMPTES_ANNUELS']);
// Acte rédigé (doc_type) → pièce de modification qu'il fournira une fois signé
const CATEGORIE_ACTE_MODIF = { PV_DECISION: 'PV_DECISION', PV_DISSOLUTION: 'PV_DECISION', STATUTS_MIS_A_JOUR: 'STATUTS_MIS_A_JOUR', ACTE_CESSION: 'ACTE_CESSION', DECLARATION_NON_CONDAMNATION: 'NON_CONDAMNATION', POUVOIR_FORMALITES: 'MANDAT', PV_MISE_EN_SOMMEIL: 'PV_MISE_EN_SOMMEIL', PV_CLOTURE_LIQUIDATION: 'PV_CLOTURE_LIQUIDATION' };
function piecesNonSignees(plan) {
  return plan
    .filter((p) => CATEGORIES_A_SIGNER.has(p.categorie) && p.doc.status !== 'SIGNE' && !DOCS_FOURNIS.has(p.doc.doc_type))
    .map((p) => p.doc.name);
}
const bloquantSignature = (noms, creation = false) => creation
  ? `Actes non signés : ${noms.join(', ')}. Pour une création, fais-les signer par le client (étape « Signature des documents » à droite du chat), puis crée le brouillon avec les versions signées.`
  : `Actes non signés : ${noms.join(', ')}. Retire-les des pièces : ils seront signés par le client (étape « Signature des documents ») puis versés automatiquement sur la formalité.`;

// Champs laissés à compléter dans un acte rédigé
const trousDe = (texte) => [...new Set(String(texte || '').match(/\[À COMPLÉTER[^\]]*\]|_{4,}/g) || [])];

// Pièces exigées par le greffe selon l'opération (chaque entrée : catégories acceptées).
const PIECES_PAR_OPERATION = {
  siege: [['PV_DECISION'], ['STATUTS_MIS_A_JOUR'], ['ATTESTATION_PARUTION']],
  denomination: [['PV_DECISION'], ['STATUTS_MIS_A_JOUR'], ['ATTESTATION_PARUTION']],
  objet: [['PV_DECISION'], ['STATUTS_MIS_A_JOUR'], ['ATTESTATION_PARUTION']],
  nomination: [['PV_DECISION'], ['ATTESTATION_PARUTION'], ['NON_CONDAMNATION'], ['IDENTITE_DIRIGEANT']],
  revocation: [['PV_DECISION'], ['ATTESTATION_PARUTION']],
  miseEnSommeil: [['PV_MISE_EN_SOMMEIL', 'PV_DECISION']],
  dissolution: [['PV_DECISION'], ['ATTESTATION_PARUTION']],
  clotureLiquidation: [['PV_CLOTURE_LIQUIDATION', 'PV_CLOTURE_LIQUIDATION_ENREGISTRE'], ['COMPTE_LIQUIDATION'], ['ATTESTATION_PARUTION']],
  associes: [['ACTE_CESSION', 'PV_DECISION']],
};
function piecesManquantesModif(operations, categories, carte) {
  const exigees = [];
  for (const o of operations) for (const alt of PIECES_PAR_OPERATION[o.type] || []) {
    if (!alt.some((c) => categories.has(c)) && !exigees.some((e) => e[0] === alt[0])) exigees.push(alt);
  }
  if (!categories.has('MANDAT')) exigees.push(['MANDAT']);
  return exigees.map((alt) => alt.map((c) => carte[c]?.label || c).join(' ou '));
}

// ─── Définition des outils ────────────────────────────────────────
const PERSONNE = {
  type: 'object',
  properties: {
    numeroSecu: { type: 'string', description: 'N° de sécurité sociale (15 chiffres) — exigé pour un gérant de SARL/EURL/SCI et un entrepreneur individuel' },
    nomPere: { type: 'string', description: 'Filiation (déclaration de non-condamnation) : nom et prénom du père' },
    nomMere: { type: 'string', description: 'Filiation : nom de jeune fille et prénom de la mère' },
    profession: { type: 'string' },
    email: { type: 'string' },
    telephone: { type: 'string' },
    situationMatrimoniale: { type: 'string', enum: ['CELIBATAIRE', 'MARIE', 'PACSE', 'DIVORCE', 'VEUF'] },
    codePostalNaissance: { type: 'string' },
    nom: { type: 'string' },
    prenoms: { type: 'array', items: { type: 'string' } },
    dateNaissance: { type: 'string', description: 'YYYY-MM-DD' },
    lieuNaissance: { type: 'string', description: 'Commune de naissance' },
    nationalite: { type: 'string', description: 'Code ISO3, ex FRA' },
    sexe: { type: 'string', description: 'M ou F' },
    adresse: {
      type: 'object',
      properties: {
        voie: { type: 'string' }, complement: { type: 'string' },
        codePostal: { type: 'string' }, commune: { type: 'string' },
      },
    },
  },
};

const TOOLS = [
  {
    name: 'enregistrer_dossier',
    description:
      "Crée le dossier de formalité (au premier appel) puis met à jour ses informations. N'envoie que les champs connus ou modifiés : ils sont fusionnés avec l'existant (les listes remplacent la précédente). Renvoie la référence du dossier et la liste des informations encore manquantes. Appelle-le dès que la forme juridique et la dénomination (ou la société concernée) sont connues, puis à chaque nouvelle information.",
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        typeFormalite: { type: 'string', enum: ['CREATION', 'MODIFICATION', 'RADIATION'] },
        prestation: {
          type: 'string',
          enum: ['formalite', 'documents', 'annonce'],
          description: "Ce que le professionnel commande : 'formalite' = formalité complète jusqu'au Guichet unique (défaut) ; 'documents' = rédaction des documents seule (statuts, PV, pouvoirs…, sans dépôt) ; 'annonce' = annonce légale seule (sans dépôt).",
        },
        formeJuridique: { type: 'string', enum: ['SASU', 'SAS', 'EURL', 'SARL', 'SCI', 'HOLDING', 'AE', 'AUTRE'] },
        denomination: { type: 'string' },
        sigle: { type: 'string' },
        nomCommercial: { type: 'string' },
        objet: { type: 'string', description: 'Objet social rédigé (formulation statutaire)' },
        activitePrincipale: { type: 'string', description: "Description courte de l'activité réellement exercée" },
        codeApe: { type: 'string', description: 'Code APE/NAF, ex 7022Z' },
        capitalEuros: { type: 'number' },
        nbTitres: { type: 'integer', description: "Nombre total d'actions ou de parts" },
        capitalVariable: { type: 'boolean' },
        capitalMinimum: { type: 'number', description: 'Capital variable : plancher prévu par les statuts (euros)' },
        banqueDepot: { type: 'string', description: 'Banque (ou notaire) dépositaire des fonds, avec agence' },
        dateDepotFonds: { type: 'string', description: 'Date du dépôt des fonds, YYYY-MM-DD' },
        capitalMaximum: { type: 'number', description: 'Capital variable : plafond autorisé (euros)' },
        dureeAnnees: { type: 'integer' },
        dateClotureExercice: { type: 'string', description: 'MM-DD, ex 12-31' },
        datePremiereCloture: { type: 'string', description: 'YYYY-MM-DD' },
        dateDebutActivite: { type: 'string', description: 'YYYY-MM-DD' },
        siege: PERSONNE.properties.adresse,
        domiciliationChezDirigeant: { type: 'boolean' },
        societeDomiciliation: { type: 'boolean' },
        domiciliataire: {
          type: 'object',
          description: 'Société de domiciliation (si siège domicilié)',
          properties: { denomination: { type: 'string' }, siren: { type: 'string' } },
        },
        regimeMicro: {
          type: 'object',
          description: "Micro-entreprise : options du régime micro",
          properties: {
            periodicite: { type: 'string', enum: ['MENSUELLE', 'TRIMESTRIELLE'], description: 'Déclaration et paiement des cotisations' },
            versementLiberatoire: { type: 'boolean', description: "Versement libératoire de l'impôt sur le revenu" },
            acre: { type: 'boolean', description: 'Demande ACRE' },
            activiteSalarieeSimultanee: { type: 'boolean' },
          },
        },
        payeur: {
          type: 'object',
          description: "Qui paiera les frais du Guichet unique : le cabinet (par ses propres moyens) ou le client (délégation de paiement, avec son e-mail)",
          properties: {
            qui: { type: 'string', enum: ['cabinet', 'client'] },
            email: { type: 'string', description: 'E-mail du payeur en cas de délégation de paiement' },
          },
        },
        annonceLegale: {
          type: 'object',
          description: "Annonce légale une fois PARUE (exigée par le Guichet unique pour créer le brouillon d'une création de société)",
          properties: { journal: { type: 'string' }, datePublication: { type: 'string', description: 'YYYY-MM-DD' } },
        },
        dirigeant: {
          ...PERSONNE,
          properties: { ...PERSONNE.properties, role: { type: 'string', description: 'PRESIDENT, GERANT, DG…' } },
        },
        autresDirigeants: {
          type: 'array',
          description: 'Dirigeants en plus du premier : co-gérants (SARL, EURL, SCI) ou directeur général (SAS)',
          items: { ...PERSONNE, properties: { ...PERSONNE.properties, role: { type: 'string', enum: ['GERANT', 'DG'] } } },
        },
        associes: {
          type: 'array',
          items: {
            ...PERSONNE,
            properties: {
              ...PERSONNE.properties,
              apportEuros: { type: 'number' },
              apportNatureEuros: { type: 'number' },
              pourcentage: { type: 'number' },
              nbTitres: { type: 'integer' },
            },
          },
        },
        formeExercice: { type: 'string', enum: ['COMMERCIALE', 'ARTISANALE', 'ARTISANALE_REGLEMENTEE', 'LIBERALE', 'AGRICOLE', 'CIVILE'], description: "Nature de l'activité principale (LIBERALE pour une profession libérale, CIVILE pour une SCI de gestion)" },
        regimeImposition: { type: 'string', enum: ['IS', 'IR'] },
        regimeTVA: { type: 'string', enum: ['FRANCHISE_BASE', 'REEL_SIMPLIFIE', 'REEL_NORMAL'] },
        siren: { type: 'string', description: 'Pour une modification ou une cessation' },
        cession: {
          type: 'object',
          description: "Cession de parts ou d'actions (acte rédigé par le gabarit du cabinet). Société : identité lue au RNE via siren.",
          properties: {
            cedant: { ...PERSONNE, properties: { ...PERSONNE.properties, regimeMatrimonial: { type: 'string', enum: ['CELIBATAIRE', 'COMMUNAUTE', 'SEPARATION', 'PARTICIPATION', 'COMMUNAUTE_UNIVERSELLE'] }, conjoint: PERSONNE } },
            cessionnaire: { ...PERSONNE, properties: { ...PERSONNE.properties, regimeMatrimonial: { type: 'string', enum: ['CELIBATAIRE', 'COMMUNAUTE', 'SEPARATION', 'PARTICIPATION', 'COMMUNAUTE_UNIVERSELLE'] }, resident: { type: 'boolean', description: 'Résident fiscal français' } } },
            nbParts: { type: 'integer', description: 'Nombre de parts ou actions cédées' },
            numeroDe: { type: 'integer' },
            numeroA: { type: 'integer' },
            prixUnitaire: { type: 'number', description: 'Prix par part ou action, en euros' },
            dateAgrement: { type: 'string', description: "Date de la décision d'agrément des associés, YYYY-MM-DD" },
            dateAcquisitionCedant: { type: 'string', description: 'Date à laquelle le cédant a acquis les parts, YYYY-MM-DD' },
            dateStatuts: { type: 'string', description: 'Date des statuts de la société, YYYY-MM-DD' },
            dateDernierExercice: { type: 'string', description: 'Date de clôture du dernier exercice, YYYY-MM-DD' },
            cessionnaireAssocie: { type: 'boolean', description: 'true si le cessionnaire est déjà associé' },
            repartitionAvant: { type: 'array', items: { ...PERSONNE, properties: { ...PERSONNE.properties, nbParts: { type: 'integer' } } }, description: 'Associés et nombre de parts avant la cession' },
            nbExemplaires: { type: 'integer' },
          },
        },
        operation: { type: 'string', description: "Pour une modification/cessation : description précise de l'opération (ex transfert de siège au …, nomination de …)" },
        dateEffet: { type: 'string', description: "Date d'effet de l'opération, YYYY-MM-DD" },
      },
    },
  },
  {
    name: 'generer_statuts',
    description:
      'Génère les statuts (.docx éditable) de la société à partir des données du dossier et les ajoute aux pièces. Uniquement pour une création SASU, SAS, EURL, SARL ou SCI, une fois dénomination, objet, capital, siège, dirigeant et associés renseignés.',
    eager_input_streaming: true,
    input_schema: { type: 'object', properties: { sur_mesure: { type: 'boolean', description: 'true seulement si le professionnel demande des clauses particulières : rédaction par IA (plus lente) au lieu du gabarit du cabinet' } } },
  },
  {
    name: 'rediger_acte',
    description:
      "Rédige un acte annexe (.docx) à partir des données du dossier et l'ajoute aux pièces. Types : " +
      Object.entries(ACTES).map(([k, v]) => `${k} (${v})`).join(', ') +
      '. Utilise "instructions" pour préciser le contenu (ex résolutions d\'un PV, titre d\'un document "autre").' +
      " Cession de parts ou d'actions : renseigne d'abord enregistrer_dossier.cession (cédant et son régime matrimonial, conjoint s'il est marié en communauté, cessionnaire et sa résidence, nombre et numéros des parts, prix unitaire, dates) et le siren : l'acte est alors rempli par le modèle du cabinet avec la fiche RNE. Rappelle au professionnel : PV d'agrément si le cessionnaire n'est pas associé, consentement du conjoint commun en biens (art. 1832-2 C. civ.), enregistrement de l'acte au service des impôts dans le mois — un acte non enregistré fait rejeter la formalité au greffe.",
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        sur_mesure: { type: 'boolean', description: "true seulement si le professionnel demande une rédaction particulière : sinon l'acte est rempli instantanément depuis le gabarit du cabinet (non-condamnation, liste des souscripteurs, pouvoir, attestation d'hébergement)" },
        type: { type: 'string', enum: Object.keys(ACTES) },
        instructions: { type: 'string' },
      },
      required: ['type'],
    },
  },
  {
    name: 'etat_dossier',
    description:
      "Renvoie l'avancement du dossier courant (étapes : collecte, identité, rédaction, signature, contrôle, dépôt INPI) et la liste de ses documents.",
    eager_input_streaming: true,
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'creer_brouillon_inpi',
    description:
      "Prépare la formalité de création au Guichet unique INPI. Avec confirme=false (obligatoire d'abord) : construit la liasse SANS rien envoyer et renvoie les champs à compléter et la répartition des pièces, à présenter au professionnel. Avec confirme=true, UNIQUEMENT après que le professionnel a explicitement confirmé dans son dernier message : crée le BROUILLON sur son compte Guichet unique et y dépose les pièces (converties en PDF). Ne valide, ne signe et ne paie jamais. Une seule création par dossier. Catégories de pièces : " +
      Object.entries(PIECES).map(([k, v]) => `${k} (${v.label})`).join(', ') + '.',
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        confirme: { type: 'boolean' },
        completer_sur_guichet: { type: 'boolean', description: 'true seulement si le professionnel confirme explicitement qu’il ajoutera lui-même les pièces manquantes sur le Guichet unique' },
        pieces: {
          type: 'array',
          description: 'Documents du dossier à déposer (identifiants donnés par etat_dossier) et leur catégorie INPI.',
          items: {
            type: 'object',
            properties: {
              document_id: { type: 'string' },
              categorie: { type: 'string', enum: [...new Set([...Object.keys(PIECES), ...Object.keys(PIECES_EI)])] },
            },
            required: ['document_id', 'categorie'],
          },
        },
      },
      required: ['confirme'],
    },
  },
  {
    name: 'creer_modification_inpi',
    description:
      "Prépare une MODIFICATION (ou une mise en sommeil / cessation d'EI) au Guichet unique à partir de la fiche RNE à jour de l'entreprise. Opérations : objet (12M : objet, codeApe), denomination (10M), siege (60M : adresse), nomination (35M : personne, role GERANT|PRESIDENT|DG), revocation (35M : nom du dirigeant sortant), beneficiaires (38F : ajouts [{personne, pourcentage}], retraits [noms]), miseEnSommeil (40M), cessationEI (41P), activiteAjout (61M/61P+24P : description, codeApe, formeExercice), activiteSuppression (62M/62P : codeApe), etablissementSecondaire (54M : adresse, description, codeApe), associes (17M : entrée/sortie d'associé, associeUnique), domicileEI (16P : adresse), dissolution (formalité M — ATTENTION : le Guichet unique ne retient aujourd'hui que la nomination du liquidateur (35M) ; la dissolution doit être déclarée par le formaliste sur le brouillon, l'outil le signale après création : liquidateurExistant ou liquidateur, lieuLiquidation S/L/A, typeDissolution, annonce de nomination du liquidateur, poursuiteActivite si l'activité continue pendant la liquidation), clotureLiquidation (42M : radiation ; exige une dissolution déjà inscrite au RNE ; dissolution et clôture ne peuvent pas être dans la même liasse), complementEntreprise (pas un événement : objet social absent du RNE, par exemple repris d'une attestation d'immatriculation jointe), complementPersonne (pas un événement : complète un dirigeant existant dont le RNE n'a pas toutes les données — nom, dateNaissance, lieuNaissance, codePostalNaissance, paysNaissance, adresse — à demander au formaliste quand l'aperçu les signale). Pour une entreprise dont le RNE ne contient pas toutes les données des personnes inscrites (fréquent pour les entreprises anciennes ou reprises d'un autre cabinet), l'aperçu les liste en bloquants : les demander au formaliste puis les ajouter avec complementPersonne. Chaque opération peut avoir une dateEffet (YYYY-MM-DD). D'abord confirme=false (aperçu, rien n'est envoyé), puis confirme=true UNIQUEMENT après confirmation explicite du professionnel : crée le BROUILLON et dépose les pièces. Ne valide, ne signe et ne paie jamais. Catégories de pièces : " +
      Object.entries(PIECES_MODIF).map(([k, v]) => `${k} (${v.label})`).join(', ') + '.',
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        siren: { type: 'string' },
        confirme: { type: 'boolean' },
        completer_sur_guichet: { type: 'boolean', description: 'true seulement si le professionnel confirme explicitement qu\'il ajoutera lui-même les pièces manquantes sur le Guichet unique' },
        operations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['objet', 'denomination', 'siege', 'nomination', 'revocation', 'beneficiaires', 'miseEnSommeil', 'cessationEI', 'activiteAjout', 'activiteSuppression', 'etablissementSecondaire', 'associes', 'domicileEI', 'complementPersonne', 'complementEntreprise', 'dissolution', 'clotureLiquidation'] },
              liquidateurExistant: { type: 'string', description: 'dissolution : nom du dirigeant en place désigné liquidateur' },
              liquidateur: PERSONNE,
              lieuLiquidation: { type: 'string', enum: ['S', 'L', 'A'], description: 'S siège, L adresse du liquidateur, A autre adresse' },
              typeDissolution: { type: 'string', enum: ['1', '2'], description: '1 avec liquidation, 2 sans liquidation (TUP)' },
              dateDissolution: { type: 'string' },
              annonce: { type: 'object', description: 'dissolution : annonce légale de la nomination du liquidateur, une fois parue', properties: { journal: { type: 'string' }, datePublication: { type: 'string' } } },
              prenom: { type: 'string', description: 'complementPersonne : prénom (si plusieurs personnes portent le même nom)' }, sexe: { type: 'string', enum: ['M', 'F'] }, dateNaissance: { type: 'string' }, lieuNaissance: { type: 'string' }, codePostalNaissance: { type: 'string' }, paysNaissance: { type: 'string' }, nationalite: { type: 'string' },
              description: { type: 'string', description: "Activité (activiteAjout, etablissementSecondaire)" },
              formeExercice: { type: 'string', enum: ['COMMERCIALE', 'ARTISANALE', 'ARTISANALE_REGLEMENTEE', 'LIBERALE', 'CIVILE'] },
              principale: { type: 'boolean' },
              associeUnique: { type: 'boolean', description: 'associes (17M) : la société devient (true) ou cesse d\'être (false) unipersonnelle' },
              dateEffet: { type: 'string' },
              objet: { type: 'string' },
              codeApe: { type: 'string' },
              denomination: { type: 'string' },
              adresse: PERSONNE.properties.adresse,
              personne: PERSONNE,
              role: { type: 'string', enum: ['GERANT', 'PRESIDENT', 'DG'] },
              nom: { type: 'string', description: 'Nom du dirigeant sortant (revocation)' },
              ajouts: { type: 'array', items: { type: 'object', properties: { personne: PERSONNE, pourcentage: { type: 'number' } } } },
              retraits: { type: 'array', items: { type: 'string' } },
            },
            required: ['type'],
          },
        },
        pieces: {
          type: 'array',
          items: {
            type: 'object',
            properties: { document_id: { type: 'string' }, categorie: { type: 'string', enum: Object.keys(PIECES_MODIF) } },
            required: ['document_id', 'categorie'],
          },
        },
      },
      required: ['siren', 'operations', 'confirme'],
    },
  },
  {
    name: 'deposer_comptes_annuels',
    description:
      "Prépare le DÉPÔT DES COMPTES ANNUELS d'une société au Guichet unique (greffe) : identité reprise du RNE, exercice, niveau de confidentialité, pièces. Contrôle l'exercice (clos, 24 mois maximum), les délais (approbation dans les 6 mois de la clôture, dépôt dans le mois qui suit, 2 mois en ligne) et les pièces attendues selon la confidentialité : aucune → COMPTES_COMPLETS + PV_AFFECTATION ; totale (micro-entreprise) → COMPTES_COMPLETS + DECLARATION_CONFIDENTIALITE + PV_AFFECTATION ; compte_resultat (petite entreprise) → BILAN_ET_ANNEXES + COMPTE_RESULTAT + PV_AFFECTATION ; comptes non approuvés → REFUS_APPROBATION au lieu du PV. D'abord confirme=false (aperçu, rien n'est envoyé), puis confirme=true UNIQUEMENT après confirmation explicite du professionnel : crée le BROUILLON du dépôt et y joint les pièces. Ne signe et ne paie jamais. Catégories de pièces : " +
      Object.entries(ca.PIECES_CA).map(([k, v]) => `${k} (${v.label})`).join(', ') + '.',
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        siren: { type: 'string' },
        exercice_debut: { type: 'string', description: 'YYYY-MM-DD' },
        exercice_fin: { type: 'string', description: 'YYYY-MM-DD (date de clôture)' },
        confidentialite: { type: 'string', enum: Object.keys(ca.CONFIDENTIALITE) },
        comptes_approuves: { type: 'boolean', description: 'false si l’assemblée a refusé d’approuver les comptes' },
        date_approbation: { type: 'string', description: "YYYY-MM-DD : date de l'assemblée ou de la décision de l'associé unique" },
        cac: { type: 'boolean', description: 'Comptes certifiés par un commissaire aux comptes (joindre RAPPORT_CAC)' },
        pieces: {
          type: 'array',
          items: {
            type: 'object',
            properties: { document_id: { type: 'string' }, categorie: { type: 'string', enum: Object.keys(ca.PIECES_CA) } },
            required: ['document_id', 'categorie'],
          },
        },
        confirme: { type: 'boolean' },
      },
      required: ['siren', 'exercice_debut', 'exercice_fin', 'confidentialite', 'confirme'],
    },
  },
  {
    name: 'lire_groupe',
    description:
      "Lit le GROUPE de sociétés enregistré par le cabinet (holding, filiales, sous-filiales) à partir d'un nom de groupe, d'une dénomination ou d'un SIREN : arbre (qui détient ou dirige qui, pourcentages), détention indirecte par la tête, points d'attention (bénéficiaires effectifs, régime mère-fille, intégration fiscale, confidentialité, sociétés cessées). suivi=true ajoute pour chaque société les formalités en cours, le dernier dépôt de comptes et la prochaine échéance (plus lent). À utiliser dès qu'une demande vise « le groupe », « la holding et ses filiales », « toutes les filiales »… puis enchaîner sur preparer_lot avec les sociétés concernées.",
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        recherche: { type: 'string', description: 'Nom du groupe, dénomination ou SIREN d’une société du groupe' },
        suivi: { type: 'boolean' },
      },
      required: ['recherche'],
    },
  },
  {
    name: 'modifier_groupe',
    description:
      "Crée ou complète un groupe de sociétés. operation : creer (siren de la tête : l'arbre est découvert automatiquement au RNE — sociétés dirigées par la holding, sur 3 niveaux — liens marqués à vérifier) ; lien (parent_siren, enfant_siren : pourcentage de détention, droits_vote, direction = mandat exercé) ; ajouter (société absente du RNE ou non dirigée par le groupe : siren ou denomination, rattachée à parent_siren avec son pourcentage) ; redecouvrir (relance la recherche de nouvelles filiales). Les pourcentages ne sont pas publics : relève-les dans les statuts, PV, liste des filiales et participations des comptes annuels ou demande-les ; n'en invente jamais.",
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['creer', 'lien', 'ajouter', 'redecouvrir'] },
        groupe: { type: 'string', description: 'Nom du groupe ou SIREN d’une de ses sociétés (sauf pour creer)' },
        siren: { type: 'string', description: 'creer : SIREN de la tête ; ajouter : SIREN de la société ajoutée' },
        nom: { type: 'string', description: 'creer : nom du groupe (facultatif)' },
        denomination: { type: 'string' },
        parent_siren: { type: 'string' },
        enfant_siren: { type: 'string' },
        pourcentage: { type: 'number' },
        droits_vote: { type: 'number' },
        direction: { type: 'string', description: 'Mandat exercé par la société mère dans la filiale (Président, Gérant…)' },
      },
      required: ['operation'],
    },
  },
  {
    name: 'lire_fiche_rne',
    description:
      "Lit la fiche officielle à jour d'une entreprise au Registre national des entreprises (RNE) à partir de son SIREN : dénomination, forme, objet, capital, siège, dirigeants, bénéficiaires effectifs. À utiliser systématiquement avant de préparer une modification ou une radiation, pour partir des données officielles au lieu de les redemander.",
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: { siren: { type: 'string', description: '9 chiffres' } },
      required: ['siren'],
    },
  },
  {
    name: 'rediger_annonce_legale',
    description:
      "Rédige l'annonce légale de la formalité (texte prêt à publier dans un journal habilité), contrôle chaque mention obligatoire du Code de commerce, compte les caractères, détermine le département de parution, l'enregistre dans le dossier et l'ajoute aux pièces (.docx). Types : " +
      Object.entries(annonces.TYPES).map(([k, v]) => `${k} (${v.label})`).join(', ') +
      ". Pour une société immatriculée, passe son siren : la fiche RNE à jour sert de base (dénomination, forme, capital, siège, dirigeants). Utilise instructions pour décrire l'opération (ancienne/nouvelle valeur, organe et date de décision, date d'effet, liquidateur…). Ne publie pas : la publication passe par le formaliste (API de publication à venir).",
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        sur_mesure: { type: 'boolean', description: "Avis de constitution : true seulement pour une rédaction particulière (IA) ; sinon rédigé instantanément avec toutes les mentions obligatoires" },
        type: { type: 'string', enum: Object.keys(annonces.TYPES) },
        siren: { type: 'string', description: 'Société déjà immatriculée (modification, dissolution, clôture…)' },
        instructions: { type: 'string' },
      },
      required: ['type'],
    },
  },
  {
    name: 'poser_questions',
    description:
      "Pose tes questions au professionnel sous forme de QUESTIONNAIRE interactif pas à pas (une question par écran, jamais en texte libre). Regroupe tout ce qui te manque pour avancer (8 questions maximum, les plus importantes d'abord). Chaque question : label = la question complète et claire, rubrique = étiquette courte (2-3 mots, ex « Le président », « Le siège »), type adapté, valeur pré-remplie si connue. Pour les choix, propose 2 à 5 options avec une description courte chacune (le professionnel peut aussi écrire sa propre réponse). Sert aussi aux confirmations (créer le brouillon, lancer un lot…) avec oui_non. Après l'appel, n'écris rien d'autre : le questionnaire s'affiche et tu reçois les réponses en résultat ; une réponse vide = « l'agent décide » (choisis la valeur par défaut la plus prudente et dis-le).",
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        titre: { type: 'string', description: 'Titre court du formulaire (ex « Le président de la société »)' },
        intro: { type: 'string', description: 'Une phrase de contexte, facultative' },
        champs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Identifiant technique (ex president_nom)' },
              rubrique: { type: 'string', description: 'Étiquette courte de la question (ex « Le président »)' },
              label: { type: 'string', description: 'La question, formulée clairement' },
              type: { type: 'string', enum: ['texte', 'texte_long', 'email', 'telephone', 'date', 'nombre', 'montant', 'liste', 'choix', 'cases', 'oui_non', 'adresse'] },
              options: {
                type: 'array',
                description: 'liste / choix / cases : options proposées',
                items: { type: 'object', properties: { label: { type: 'string' }, description: { type: 'string' } }, required: ['label'] },
              },
              requis: { type: 'boolean' },
              valeur: { type: 'string', description: 'Valeur pré-remplie (déjà connue ou proposée par défaut)' },
              aide: { type: 'string', description: 'Aide courte sous le champ' },
              placeholder: { type: 'string' },
            },
            required: ['id', 'label', 'type'],
          },
        },
        bouton: { type: 'string', description: 'Libellé du bouton (ex « Continuer », « Créer le brouillon »)' },
      },
      required: ['titre', 'champs'],
    },
  },
  {
    name: 'preparer_lot',
    description:
      "Plusieurs formalités demandées en une fois (plusieurs créations, fermetures, modifications…, en texte ou dans un tableur joint) : découpe la liste en formalités distinctes, chacune avec une consigne complète et ses informations manquantes. Rien n'est créé. Présente ensuite le plan au professionnel (tableau court) et demande sa confirmation avant lancer_lot.",
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: { texte: { type: 'string', description: 'La liste telle que fournie (texte du message et/ou contenu CSV du tableur), avec les consignes générales' } },
      required: ['texte'],
    },
  },
  {
    name: 'lancer_lot',
    description:
      "Lance la préparation d'un lot APRÈS confirmation explicite du professionnel : crée un dossier par formalité, puis l'agent prépare chacune en arrière-plan (actes, annonce, aperçu INPI ; aucun brouillon INPI créé). Le suivi s'affiche dans le chat ; le professionnel ouvre chaque formalité depuis ce suivi pour la compléter et créer le brouillon. Reprends les formalités de preparer_lot, corrigées selon ses remarques.",
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Nom court du lot' },
        formalites: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['creation', 'transfert_siege', 'changement_dirigeant', 'modification', 'mise_en_sommeil', 'dissolution', 'cloture_liquidation', 'cessation_ei', 'comptes_annuels', 'autre'] },
              societe: { type: 'string' },
              siren: { type: 'string' },
              consigne: { type: 'string' },
              manquants: { type: 'array', items: { type: 'string' } },
            },
            required: ['type', 'societe', 'consigne'],
          },
        },
        confirme: { type: 'boolean', description: 'true uniquement après confirmation explicite du professionnel' },
      },
      required: ['formalites', 'confirme'],
    },
  },
  {
    name: 'lister_documents_rne',
    description:
      "Liste les documents publics déposés au RNE pour une entreprise (SIREN) : actes (statuts et statuts mis à jour, PV d'assemblée, décisions, certificats…) avec date de dépôt, et comptes annuels non confidentiels. À utiliser avant une modification pour retrouver les statuts en vigueur et les dernières décisions, au lieu de les demander au formaliste.",
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: { siren: { type: 'string', description: '9 chiffres' } },
      required: ['siren'],
    },
  },
  {
    name: 'lire_document_rne',
    description:
      "Télécharge un document du RNE (identifiant donné par lister_documents_rne) et en lit le texte (statuts en vigueur, PV…). ajouter_au_dossier=true le joint aussi aux pièces du dossier en cours (ex. statuts à jour pour une modification).",
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['acte', 'bilan'] },
        id: { type: 'string' },
        nom: { type: 'string', description: 'Nom du fichier si ajouté au dossier (ex « Statuts à jour - STRATEGY ASSOCIATES »)' },
        ajouter_au_dossier: { type: 'boolean' },
      },
      required: ['kind', 'id'],
    },
  },
  {
    name: 'lire_formalite_inpi',
    description:
      "Lit une formalité déposée au Guichet unique INPI : statut, société, observations, demandes de régularisation du greffe (en cours et passées, avec motifs et échéances) et liste des pièces jointes déposées. Sans paramètre, lit la formalité ouverte par le professionnel ; sinon recherche par nom de société ou numéro de liasse.",
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        recherche: { type: 'string', description: 'Nom de société ou numéro de liasse (ex J00282806421)' },
      },
    },
  },
  {
    name: 'lire_piece_inpi',
    description:
      "Télécharge et lit le contenu texte d'une pièce jointe d'une formalité INPI (identifiant donné par lire_formalite_inpi). À utiliser pour vérifier ce qui a déjà été déposé avant de préparer une régularisation.",
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: { piece_id: { type: 'integer' } },
      required: ['piece_id'],
    },
  },
];

const SYSTEM_PROMPT = `Tu es l'Agent Formalités de Legaly AI, plateforme française pour cabinets d'experts-comptables, avocats et formalistes. Tu prends en charge une formalité juridique d'entreprise de bout en bout : tu recueilles les informations, tu crées le dossier, tu génères les statuts et tous les actes nécessaires, puis tu indiques au professionnel ce qu'il lui reste à faire.

<perimetre>
- Créations de sociétés : SASU, SAS, EURL, SARL, SCI, holding (SAS).
- Modifications (transfert de siège, changement de dirigeant, d'objet, de dénomination, de capital…) et cessations (dissolution, radiation) : dossier + procès-verbal + annonce légale.
- Dépôt des comptes annuels des sociétés : contrôle des comptes et du PV, confidentialité, brouillon du dépôt au Guichet unique (voir <comptes_annuels>).
- Tu ne signes rien, tu ne paies rien et tu n'envoies rien à des tiers. Le professionnel suit les étapes affichées à droite du chat : réalisation de la formalité, annonce légale (que tu rédiges), signature des actes par le client (Yousign), signature électronique de la formalité (Yousign = signature au Guichet unique), puis paiement (compte client INPI du cabinet ou délégation au client). En fin de tour, indique en une phrase la prochaine étape à droite, sans le renvoyer vers une autre page ni vers le Guichet unique. Le dépôt des comptes annuels suit les mêmes étapes (sans annonce légale) : PV d'approbation et déclaration de confidentialité rédigés par Legaly signés par le client, puis signature électronique du dépôt et paiement à droite du chat.
- Plusieurs formalités à la fois (plusieurs créations, plusieurs fermetures…, en texte ou dans un tableur joint) : preparer_lot, présente le plan en tableau court (type, société, informations manquantes), demande confirmation, puis lancer_lot (confirme=true). Chaque formalité est alors préparée dans son propre dossier ; le suivi s'affiche dans ce chat et le professionnel ouvre chaque formalité depuis ce suivi pour la compléter et créer son brouillon INPI.
- Prestations seules : le cabinet peut aussi commander une seule étape, sans formalité au Guichet unique (voir <prestations_seules>).
</perimetre>

<prestations_seules>
Le professionnel peut ne vouloir qu'une partie du travail :
- « Rédaction des documents » seule (statuts, PV, pouvoir, déclaration de non-condamnation, acte de cession…) : enregistre prestation='documents' dès le premier enregistrer_dossier, recueille uniquement les informations nécessaires aux documents demandés, rédige-les, puis propose la signature électronique des documents (étape à droite) si le client doit les signer. Ne rédige pas d'annonce sauf demande, ne demande pas qui paiera les frais du Guichet unique et ne crée aucun brouillon au Guichet unique.
- « Annonce légale » seule : enregistre prestation='annonce', recueille les informations de l'annonce (lis la fiche RNE si le SIREN est connu), rédige-la avec rediger_annonce_legale et présente le texte et les mentions vérifiées. Pas d'actes, pas de brouillon au Guichet unique.
- Indices : « seulement », « uniquement », « juste les statuts », « juste l'annonce », « sans dépôt », « je m'occupe du dépôt ». En cas de doute, demande en une question (poser_questions) s'il veut la formalité complète ou seulement cette étape.
- S'il change d'avis et veut la formalité complète, enregistre prestation='formalite' et reprends la méthode habituelle.
- En fin de tour, indique ce qui est livré (documents ou annonce prêts à relire, à télécharger depuis le dossier) et, pour les documents, la signature électronique possible à droite du chat.
</prestations_seules>

<documents_joints>
Le professionnel peut joindre des documents : pièces d'identité, statuts, procès-verbaux d'assemblée, Kbis, annonces légales, justificatifs de domicile, contrats de domiciliation, attestations de dépôt des fonds…
- Lis-les attentivement et utilise-les comme source prioritaire : extrais les informations utiles (identité et date/lieu de naissance du dirigeant, dénomination, SIREN, capital, siège, décisions votées…) et enregistre-les avec enregistrer_dossier.
- Dis brièvement ce que tu as trouvé dans chaque document, et signale ce qui est illisible, expiré, incohérent avec le reste du dossier ou contradictoire entre deux documents.
- Pour une modification, un PV d'assemblée suffit souvent à identifier l'opération : déduis-la et fais-la confirmer.
- Ne recopie jamais en entier dans tes réponses un numéro de pièce d'identité ou une donnée bancaire.
- Les fichiers joints sont automatiquement rangés dans les pièces du dossier.
</documents_joints>

<actes_et_signature>
- Tout acte rédigé par Legaly (statuts, déclaration de non-condamnation, pouvoir, liste des souscripteurs, PV, décisions) doit être SIGNÉ avant d'être déposé : les outils de brouillon refusent un acte généré non signé. CRÉATION de société : les actes sont signés par le client depuis l'étape « Signature des documents » AVANT le brouillon (l'annonce de constitution cite les statuts signés et doit être parue avant le brouillon) ; crée ensuite le brouillon avec les actes SIGNÉS et l'attestation de parution. MODIFICATION / CESSATION : crée le brouillon sans les actes non signés ; ils seront signés par le client puis versés automatiquement sur la formalité. Si le client a déjà renvoyé dans ce chat des versions signées (scan ou PDF), associe CES fichiers aux catégories de pièces.
- Quand un outil de rédaction renvoie champs_a_completer, demande ces informations (poser_questions) puis régénère l'acte : un acte avec des champs à compléter ne doit jamais être envoyé à la signature ni déposé.
- Pièces obligatoires : les outils les contrôlent. Ne mets completer_sur_guichet=true que si le professionnel dit explicitement qu'il les ajoutera lui-même sur le Guichet unique.
- Après création, si le résultat contient ALERTE (requalification ou événement non retenu par le Guichet unique), signale-le en premier, clairement.
</actes_et_signature>

<questions>
Quand il te manque des informations ou qu'une confirmation est nécessaire, utilise TOUJOURS poser_questions (formulaire interactif) au lieu de poser les questions en texte. Un seul formulaire à la fois, regroupant l'essentiel ; types adaptés (liste pour la forme juridique, date, montant, oui_non pour une confirmation, adresse…) ; valeurs connues ou par défaut pré-remplies pour que le professionnel n'ait qu'à vérifier. Tu peux écrire une phrase courte avant l'appel, rien après. Les réponses arrivent en résultat de l'outil ; un champ vide = information non fournie (ne l'invente pas). Si le professionnel répond en texte libre à la place, utilise son message.
</questions>

<depot_inpi>
Objectif : préparer la formalité de A à Z pour que le formaliste n'ait plus qu'à valider, signer électroniquement et payer (par ses propres moyens ou par la délégation de paiement du Guichet unique).
Paiement : avant de créer un brouillon (confirme=true), demande qui paiera les frais du Guichet unique — le cabinet (compte client INPI), ou le client par délégation de paiement (son e-mail) — et enregistre-le dans payeur (enregistrer_dossier). Le paiement se fait depuis l'étape « Paiement » à droite du chat (compte client INPI du cabinet ou délégation au client) ; le lien du Guichet unique (lien_guichet_unique) ne sert qu'en secours, pour payer par carte. L'application suit ensuite le paiement (montant, délégation en attente, payé).
1. Une fois le dossier complet et les actes rédigés, rappelle que les actes à signer (statuts, déclaration de non-condamnation, pouvoir, liste des souscripteurs) doivent être signés par le client, et demande les pièces que seul le client peut fournir : pièce d'identité du dirigeant, attestation de dépôt des fonds, justificatif du siège, attestation de parution de l'annonce. Elles se joignent dans ce chat.
2. Création de société : le Guichet unique refuse le brouillon sans annonce légale PARUE (journal et date de parution, à enregistrer dans annonceLegale) et sans date de clôture du premier exercice ; si le siège est chez une société de domiciliation, il faut sa dénomination et son SIREN. Ne présente jamais l'annonce comme un préalable imposé par Legaly : c'est une étape que le professionnel peut faire avant ou après ; s'il la reporte, rappelle qu'elle est obligatoire et que la formalité sera rejetée sans elle. Demande dès le premier questionnaire si l'annonce est DÉJÀ parue (journal, date) : si oui, enregistre annonceLegale et ne la rédige pas. Modification ou cessation : le brouillon peut être créé avant l'annonce ; l'attestation de parution sera versée ensuite.
3. Appelle etat_dossier pour connaître les identifiants des documents, puis creer_brouillon_inpi avec confirme=false en associant chaque document à sa catégorie. Si l'aperçu signale des bloquants, demande les informations correspondantes avant toute création.
4. Présente le récapitulatif : pièces qui seront déposées, pièces manquantes ou non signées, champs que le formaliste devra compléter. Demande une confirmation explicite (« Je crée le brouillon sur votre Guichet unique ? »).
5. Seulement si le dernier message du professionnel confirme clairement, appelle creer_brouillon_inpi avec confirme=true.
6. Indique ensuite, en une phrase, les étapes restantes à droite du chat : compléter les champs signalés, faire signer les actes, signer la formalité, payer ou déléguer le paiement.
Pour une MODIFICATION (objet, dénomination, siège, dirigeant, bénéficiaires effectifs), une mise en sommeil ou la cessation d'une entreprise individuelle : lis d'abord la fiche RNE (lire_fiche_rne), puis les documents déposés (lister_documents_rne, et lire_document_rne sur les statuts les plus récents pour rédiger le PV et les statuts mis à jour à partir du texte en vigueur ; les joindre au dossier si utile), rédige les actes (PV, statuts mis à jour) et l'annonce (rediger_annonce_legale avec le siren : modification, transfert_siege, dissolution, cloture_liquidation… ; pas d'annonce pour une mise en sommeil ni pour une entreprise individuelle), puis utilise creer_modification_inpi avec la même logique aperçu → confirmation → brouillon. Un changement de dirigeant associé au capital s'accompagne en général d'une mise à jour des bénéficiaires effectifs (opération beneficiaires).
La création de brouillon couvre les créations de SASU, SAS, EURL, SARL, SCI et d'entreprise individuelle (micro-entreprise : formeJuridique AE ; pas d'annonce légale ni de statuts, mais n° de sécurité sociale, situation matrimoniale, options du régime micro et pièce d'identité). Pour une modification ou une cessation, prépare les documents et guide le formaliste pour la saisie.
</depot_inpi>

<comptes_annuels>
Dépôt des comptes annuels au greffe via le Guichet unique (outil deposer_comptes_annuels) :
1. Lis la fiche RNE (lire_fiche_rne) puis enregistre le dossier (enregistrer_dossier : typeFormalite MODIFICATION, operation « Dépôt des comptes annuels <année> », dénomination, SIREN, forme).
2. Demande, avec poser_questions, ce qui manque : exercice (début, clôture), date d'approbation, comptes approuvés ou non, commissaire aux comptes, niveau de confidentialité (propose celui auquel la société a droit), payeur des frais. Pré-remplis depuis la fiche RNE (date de clôture) et les documents joints.
3. Confidentialité (2 des 3 seuils non dépassés à la clôture) : micro-entreprise (total du bilan ≤ 450 000 €, chiffre d'affaires net ≤ 900 000 €, ≤ 10 salariés) → « totale » (comptes non publiés, déclaration de confidentialité jointe) ; petite entreprise (bilan ≤ 7,5 M€, CA ≤ 15 M€, ≤ 50 salariés) → « compte_resultat » (compte de résultat non publié). Exclus : établissements de crédit, assurances, sociétés dont l'activité est la gestion de titres de participation (holdings) et, pour la confidentialité du compte de résultat, les sociétés d'un groupe. Dans le doute, « aucune » et signale-le.
4. Contrôle les comptes joints AVANT l'aperçu (motifs de rejet fréquents du greffe) : première page signée, bilan actif ET passif complets avec total de l'actif = total du passif, compte de résultat complet avec un résultat identique au bilan (passif) et au compte de résultat, annexe présente si exigée, dates d'exercice identiques à celles déclarées, PV d'approbation daté et signé votant l'affectation du résultat (montant concordant). Signale chaque écart clairement ; une liasse fiscale 2033/2050 est acceptée si elle contient bilan et compte de résultat.
5. EURL ou SASU dont l'associé unique personne physique est le dirigeant : le dépôt vaut approbation ; la décision d'affectation signée sert de PV_AFFECTATION.
6. etat_dossier pour les identifiants des pièces, puis deposer_comptes_annuels confirme=false ; présente l'aperçu (pièces, bloquants, alertes de délai, frais indicatifs) ; confirmation explicite via poser_questions (oui_non) ; puis confirme=true.
7. Récapitulatif : lien_guichet_unique, frais, payeur, étapes (vérifier, signer, payer ou délégation de paiement).
Plusieurs dépôts à la fois (une liste de sociétés) : preparer_lot / lancer_lot avec le type comptes_annuels ; chaque dépôt est préparé dans sa formalité, le professionnel y joint les comptes et poursuit depuis les étapes de la formalité.
</comptes_annuels>

<groupes>
Groupes de sociétés (holding, filiales) enregistrés par le cabinet :
- Dès qu'une demande vise un groupe, une holding et ses filiales ou « toutes les filiales », lis le groupe (lire_groupe). S'il n'existe pas, propose de le créer depuis le SIREN de la tête (modifier_groupe operation=creer) : l'arbre est découvert au RNE à partir des mandats exercés par la holding.
- Action sur plusieurs sociétés du groupe (transfert de siège, nomination d'un président, dépôt des comptes, mise en sommeil…) : présente la liste des sociétés visées (tableau court), fais-la confirmer, puis preparer_lot / lancer_lot avec une formalité par société (SIREN compris).
- Pourcentages de détention : non publics. Quand tu les lis dans un document joint (statuts, PV, liste des filiales et participations, tableau de capitalisation), enregistre-les (modifier_groupe operation=lien) et dis-le. N'en invente jamais.
- Signale les points d'attention utiles à la formalité en cours : bénéficiaires effectifs d'une filiale détenue à 25 % ou plus par une holding (inclure les personnes qui contrôlent la holding), confidentialité du compte de résultat fermée aux sociétés d'un groupe, échéances de comptes en retard, sociétés cessées encore dans l'arbre.
</groupes>

<regularisations_inpi>
Pour une formalité déjà déposée au Guichet unique (régularisation demandée par le greffe, rejet, signature ou paiement en attente) :
1. Appelle lire_formalite_inpi, puis lis avec lire_piece_inpi les pièces utiles pour comprendre la demande (pas toutes : seulement celles qui éclairent les motifs).
2. Explique chaque demande en cours en langage clair : ce que le greffe reproche, ce qu'il faut fournir ou corriger, et l'échéance s'il y en a une.
3. Enregistre le dossier de suivi avec enregistrer_dossier (typeFormalite de la formalité, dénomination, SIREN, operation = "Régularisation …").
4. Prépare tout ce qui peut l'être : reponse_greffe (courrier répondant point par point), les actes demandés (PV, déclaration des bénéficiaires effectifs corrigée, attestation…), et liste les pièces que seul le client peut fournir (pièce d'identité, acte enregistré aux impôts, justificatif…).
5. Pour un paiement à régulariser : indique le montant et qu'il se règle depuis l'espace Guichet unique.
6. Termine par une check-list ; rappelle que le dépôt des pièces et la validation de la régularisation se font par le professionnel sur le Guichet unique.
</regularisations_inpi>

<methode>
1. Comprends l'opération. Si la forme juridique n'est pas donnée, propose la plus adaptée en une phrase et demande confirmation.
2. Dès que la forme et la dénomination (ou la société concernée) sont connues, appelle enregistrer_dossier, puis rappelle-le à chaque nouvelle information.
3. Demande les informations manquantes par petits groupes logiques (au plus 5 questions à la fois, numérotées), en t'appuyant sur la liste "manquants" renvoyée par l'outil. Ne redemande jamais ce qui est déjà connu.
4. Rédige toi-même l'objet social au format statutaire à partir de l'activité décrite, et déduis le code APE le plus probable ; présente-les pour validation.
5. Quand les données d'une création sont complètes : generer_statuts, puis les actes du dossier de constitution adaptés à la forme (declaration_non_condamnation pour chaque dirigeant, liste_souscripteurs pour une SAS/SASU, attestation_domiciliation, pouvoir_formalites), puis rediger_annonce_legale (constitution) sauf si l'annonce est déjà parue. Pour une modification ou une cessation : pv_decision ou pv_dissolution, puis rediger_annonce_legale, puis pouvoir_formalites. Présente le texte de l'annonce et les informations à compléter ; une fois parue, enregistre journal et date de parution (annonceLegale) et demande l'attestation de parution (à joindre dans ce chat).
6. Termine par un récapitulatif bref : documents produits, informations à vérifier, et la prochaine étape à droite du chat (faire signer les actes, publier l'annonce, signer la formalité, payer). Les pièces à fournir par le client (pièces d'identité, attestation de dépôt des fonds, attestation de parution) se joignent dans ce chat.
</methode>

<regles>
- N'invente JAMAIS une donnée personnelle ou d'identification (nom, date ou lieu de naissance, adresse, SIREN, montant). Si elle manque, demande-la ; si le professionnel veut avancer sans, laisse le champ vide et signale-le.
- Les valeurs par défaut usuelles sont acceptables si tu les annonces : durée 99 ans, clôture au 31 décembre, impôt sur les sociétés (IR pour une SCI), franchise en base de TVA. Le nombre de titres (actions ou parts) se demande toujours, prérempli (ex. 100) : ne fixe jamais la répartition du capital sans l'annoncer.
- Vérifie la cohérence : somme des apports = capital, répartition des titres, dirigeant cohérent avec la forme (président pour SAS/SASU, gérant pour SARL/EURL/SCI), associé unique pour SASU/EURL, au moins deux associés pour SAS/SARL/SCI.
- Signale les points d'attention juridiques utiles (capital faible, activité réglementée, apport en nature nécessitant un commissaire aux apports…) sans faire de longues dissertations.
- Réponds en français, de façon concise et structurée (Markdown léger). Quand un outil échoue, explique simplement le problème et la marche à suivre.
- Les documents produits sont des projets à faire relire par le professionnel ; dis-le une fois dans le récapitulatif final.
</regles>`;

// ─── Mode entrepreneur (page Indépendants et TPE) ───────────────────
// client : entrepreneur ayant payé ; l'agent mène SA formalité, déposée par Legaly
//          comme mandataire, sans accès aux autres dossiers du cabinet. (L'orientation
//          gratuite avant paiement est un arbre de décision, sans IA.)
const CLIENT_TOOLS = new Set([
  'enregistrer_dossier', 'generer_statuts', 'rediger_acte', 'etat_dossier', 'creer_brouillon_inpi',
  'creer_modification_inpi', 'deposer_comptes_annuels', 'lire_fiche_rne', 'rediger_annonce_legale',
  'poser_questions', 'lister_documents_rne', 'lire_document_rne',
]);

const CLIENT_PROMPT = `<espace_entrepreneur>
Tu parles directement à un ENTREPRENEUR qui a commandé et payé une formalité à Legaly (pas à un professionnel) : vouvoiement, mots simples, explique chaque étape en une phrase, pas de jargon sans explication.
- Un seul dossier : sa formalité commandée (voir le récapitulatif de commande). Pour toute autre formalité, explique qu'elle fera l'objet d'une nouvelle commande sur la page Indépendants et TPE.
- Legaly dépose la formalité au Guichet unique COMME MANDATAIRE : rédige le pouvoir_formalites au nom de Legaly (le mandataire) et fais-le signer par l'entrepreneur avec les autres actes. Le brouillon est ensuite vérifié par un formaliste de Legaly, qui valide, signe et transmet ; les frais officiels sont payés par l'entrepreneur par délégation de paiement (son e-mail : enregistre payeur = client avec cet e-mail).
- Ne travaille que sur l'entreprise de l'entrepreneur : pour une modification ou une fermeture, vérifie que la personne est bien dirigeante de la société (fiche RNE) et signale-le sinon.
- Les pièces (pièce d'identité, justificatif de domicile du siège, attestation de dépôt des fonds…) se joignent dans ce chat.
</espace_entrepreneur>`;

// Commande de test (paiement simulé) : parcours complet sans effet réel.
const CLIENT_TEST_PROMPT = `
<commande_de_test>
Cette commande est un TEST (paiement simulé). Mène le parcours normalement (questions, documents, annonce), avec ces différences :
- La signature des actes se simule avec le bouton « Simuler la signature » de l'espace (pas de Yousign).
- L'annonce légale : rédige-la ; pour la suite, considère-la comme parue (journal « TEST », date du jour) sans demander d'attestation.
- Ne crée AUCUN brouillon au Guichet unique : une fois les documents rédigés et signés, dis que le dossier est prêt et invite à cliquer sur « Simuler l'envoi au Guichet unique ».
</commande_de_test>`;

// Résumé de la conversation gratuite, point de départ de l'espace entrepreneur.
function resumeCommande(commande) {
  const lignes = (commande.affichage || []).map((it) => {
    if (it.type === 'user') return `Entrepreneur : ${it.text}`;
    if (it.type === 'assistant') return `Assistant : ${it.text}`;
    if (it.type === 'form' && it.reponses) return `Réponses au questionnaire « ${it.form?.titre || ''} » : ${Object.entries(it.reponses).map(([k, v]) => `${(it.form?.champs || []).find((c) => c.id === k)?.label || k} → ${Array.isArray(v) ? v.join(', ') : v}`).join(' ; ')}`;
    return null;
  }).filter(Boolean);
  const o = commande.offre || {};
  return `[Récapitulatif de commande]\nFormalité commandée et payée : ${o.libelle || o.code} (${o.code})${o.forme ? `, forme : ${o.forme}` : ''}.\nE-mail de l'entrepreneur (payeur des frais officiels) : ${commande.email || 'à demander'}.\nParcours d'orientation (questions et réponses) :\n${lignes.join('\n').slice(0, 12000)}\n\nCommence la formalité : rappelle en une phrase ce qui va se passer, puis pose tes premières questions avec poser_questions.`;
}

// ─── Fusion des données ───────────────────────────────────────────
const DATA_KEYS = Object.keys(TOOLS[0].input_schema.properties);

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function mergeData(base, patch) {
  const out = { ...(base || {}) };
  for (const [k, v] of Object.entries(patch || {})) {
    if (v === undefined || v === null) continue;
    if (isPlainObject(v) && isPlainObject(out[k])) out[k] = mergeData(out[k], v);
    else out[k] = v;
  }
  return out;
}

function hasAdresse(a) {
  return Boolean(a?.voie && a?.codePostal && a?.commune);
}

function personneManquants(p, label) {
  const m = [];
  if (!p?.nom) m.push(`${label} : nom`);
  if (!p?.prenoms?.length || !p.prenoms[0]) m.push(`${label} : prénom(s)`);
  if (!p?.dateNaissance) m.push(`${label} : date de naissance`);
  if (!p?.lieuNaissance) m.push(`${label} : lieu de naissance`);
  if (!p?.nationalite) m.push(`${label} : nationalité`);
  if (!hasAdresse(p?.adresse)) m.push(`${label} : adresse personnelle`);
  return m;
}

function computeManquants(d) {
  const type = d.typeFormalite || 'CREATION';
  const m = [];
  if (type !== 'CREATION') {
    if (!d.denomination) m.push('dénomination de la société');
    if (!d.siren) m.push('SIREN');
    if (!d.formeJuridique) m.push('forme juridique');
    if (!d.operation) m.push("description de l'opération");
    if (!d.dateEffet) m.push("date d'effet");
    return m;
  }
  const forme = d.formeJuridique;
  if (!forme) m.push('forme juridique');
  if (!d.denomination) m.push('dénomination');
  if (!d.objet) m.push('objet social');
  if (!(Number(d.capitalEuros) > 0)) m.push('capital social');
  if (!['AE', 'EI'].includes(String(forme || '').toUpperCase()) && !(Number(d.nbTitres) > 0)) m.push("nombre d'actions ou de parts (valeur nominale)");
  if (!hasAdresse(d.siege)) m.push('adresse du siège');
  m.push(...personneManquants(d.dirigeant, 'dirigeant'));
  const pluri = ['SAS', 'SARL', 'SCI', 'HOLDING'].includes(forme);
  const associes = d.associes || [];
  if (pluri) {
    if (associes.length < 2) m.push('associés (au moins deux, avec leurs apports)');
    associes.forEach((a, i) => {
      if (!a.nom) m.push(`associé ${i + 1} : nom`);
      if (!(Number(a.apportEuros) >= 0) || a.apportEuros === undefined) m.push(`associé ${i + 1} : montant de l'apport`);
    });
    const total = associes.reduce((s, a) => s + (Number(a.apportEuros) || 0), 0);
    if (associes.length && Number(d.capitalEuros) > 0 && Math.round(total) !== Math.round(Number(d.capitalEuros))) {
      m.push(`cohérence : apports (${total} €) ≠ capital (${d.capitalEuros} €)`);
    }
  }
  return m;
}

// ─── Accès au dossier ─────────────────────────────────────────────
async function loadDossier(supa, ctx) {
  // Formalité INPI ouverte : on réutilise le dossier de suivi déjà lié s'il existe.
  if (!ctx.dossierId && ctx.inpiFormalityId) {
    const { data: linked } = await supa
      .from('dossiers').select('id')
      .eq('organization_id', ctx.orgId)
      .eq('metadata->>inpi_formality_id', String(ctx.inpiFormalityId))
      .limit(1).maybeSingle();
    if (linked) ctx.dossierId = linked.id;
  }
  if (!ctx.dossierId) return null;
  const { data: dossier } = await supa.from('dossiers').select('*').eq('id', ctx.dossierId).maybeSingle();
  if (!dossier) {
    const e = new Error('Dossier introuvable.');
    e.code = 'not_found';
    throw e;
  }
  const allowed = ctx.mode === 'client'
    ? dossier.user_id === ctx.userId
    : ctx.isAdmin || dossier.user_id === ctx.userId ||
      (dossier.organization_id && dossier.organization_id === ctx.orgId);
  if (!allowed) {
    const e = new Error('Accès refusé à ce dossier.');
    e.code = 'forbidden';
    throw e;
  }
  return dossier;
}

function dossierUrl(dossier) {
  return `/dossiers/${dossier.id}`;
}

// ─── Exécution des outils ─────────────────────────────────────────
async function toolEnregistrer(supa, ctx, input) {
  const patch = Object.fromEntries(Object.entries(input || {}).filter(([k]) => DATA_KEYS.includes(k)));
  let dossier = await loadDossier(supa, ctx);
  const data = mergeData(dossier?.metadata?.agent_data, patch);
  const type = data.typeFormalite || 'CREATION';
  const forme = data.formeJuridique ? String(data.formeJuridique).toUpperCase() : null;
  const isSocieteCreation = type === 'CREATION' && CREATION_FORMES.includes(forme);

  const fields = {
    client_name: data.denomination ? String(data.denomination).toUpperCase() : 'Nouveau dossier',
    type_formalite: type,
    forme_juridique: forme && ['AE', 'EI', 'SASU', 'SAS', 'EURL', 'SARL', 'SCI', 'SA', 'SNC', 'HOLDING', 'AUTRE'].includes(forme) ? forme : null,
    naf_code: data.codeApe || null,
    siren: data.siren || null,
  };
  if (isSocieteCreation) fields.inpi_content = buildPersonneMorale(data);

  if (!dossier) {
    const { data: created, error } = await supa
      .from('dossiers')
      .insert({
        ...fields,
        user_id: ctx.userId,
        organization_id: ctx.orgId,
        reference: `CMP-${Date.now().toString(36).toUpperCase()}${require('crypto').randomBytes(2).toString('hex').toUpperCase()}`,
        statut: 'DRAFT',
        assigned_to: ctx.userId,
        metadata: {
          agent_data: data,
          created_by_agent: true,
          ...(ctx.commandeId ? { commande_id: ctx.commandeId, client_entrepreneur: true } : {}),
          ...(ctx.inpiFormalityId ? { inpi_formality_id: String(ctx.inpiFormalityId), inpi_liasse: ctx.inpiLiasse || null } : {}),
        },
      })
      .select()
      .single();
    if (error) throw new Error(`Création du dossier impossible : ${error.message}`);
    dossier = created;
    ctx.dossierId = dossier.id;
    try {
      await supa.from('audit_logs').insert({
        organization_id: ctx.orgId, user_id: ctx.userId,
        action: 'agent.dossier.created', resource_type: 'dossier', resource_id: dossier.id,
        metadata: { type_formalite: type, forme },
      });
    } catch {}
  } else {
    const { data: updated, error } = await supa
      .from('dossiers')
      .update({ ...fields, metadata: { ...(dossier.metadata || {}), agent_data: data } })
      .eq('id', dossier.id)
      .select()
      .single();
    if (error) throw new Error(`Mise à jour du dossier impossible : ${error.message}`);
    dossier = updated;
  }

  const manquants = computeManquants(data);
  return {
    result: {
      dossier: { reference: dossier.reference, type: type, forme, denomination: fields.client_name },
      manquants,
      complet: manquants.length === 0,
      statuts_disponibles: type === 'CREATION' && SUPPORTED_FORMES.includes(forme === 'HOLDING' ? 'SAS' : forme),
    },
    event: {
      kind: 'dossier',
      label: `Dossier ${dossier.reference} enregistré`,
      detail: manquants.length ? `${manquants.length} information(s) manquante(s)` : 'Informations complètes',
      href: dossierUrl(dossier),
      dossier: { id: dossier.id, reference: dossier.reference, denomination: fields.client_name },
    },
  };
}

async function toolStatuts(supa, ctx, input = {}) {
  const dossier = await loadDossier(supa, ctx);
  if (!dossier) throw new Error("Aucun dossier : appelle d'abord enregistrer_dossier.");
  const forme = String(dossier.forme_juridique || '').toUpperCase();
  if (!input.sur_mesure && GABARIT_STATUTS[forme]) {
    const nomFichier = `Statuts-${String(dossier.client_name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9-]+/g, '_')}.docx`;
    const r = await acteParGabarit(supa, ctx, dossier, GABARIT_STATUTS[forme], { label: `Statuts — ${dossier.client_name}`, docType: 'STATUTS', filename: nomFichier });
    if (r) return r;
  }
  const modeleStatuts = knowledge.modele(`statuts_${(forme === 'HOLDING' ? 'SAS' : forme).toLowerCase()}`);
  if (modeleStatuts) {
    const data = dossier.metadata?.agent_data || {};
    const brief = [
      `Statuts constitutifs d'une ${forme === 'HOLDING' ? 'SAS (holding)' : forme}.`,
      'Données du dossier (JSON) :',
      JSON.stringify(data, null, 2),
      'Utilise exactement ces données (dénomination, objet, siège, capital et sa répartition, durée, exercice, dirigeant, associés). Pour toute donnée absente : [À COMPLÉTER : …].',
    ].join('\n');
    const draft = await draftDocument({ docType: 'autre', title: `Statuts — ${dossier.client_name}`, brief, modele: modeleStatuts });
    if (draft.refused) throw new Error('Rédaction refusée par le modèle.');
    if (ctx.draftUsage && draft.usage) {
      ctx.draftUsage.calls += 1;
      ctx.draftUsage.input += draft.usage.input_tokens || 0;
      ctx.draftUsage.output += draft.usage.output_tokens || 0;
    }
    const buffer = await Packer.toBuffer(markdownToDocx(`Statuts — ${dossier.client_name}`, draft.markdown));
    const doc = await storeDossierDocument(supa, dossier, {
      buffer,
      filename: `Statuts-${String(dossier.client_name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9-]+/g, '_')}.docx`,
      docType: 'STATUTS',
      userId: ctx.userId,
    });
    const url = await signedUrl(supa, doc.file_path);
    return {
      result: { document: doc.name, ajoute_aux_pieces: true, redige_sur_modele_du_cabinet: true, champs_a_completer: trousDe(draft.markdown), rappel: trousDe(draft.markdown).length ? 'Demander ces informations puis régénérer les statuts : un acte incomplet ne peut pas être signé ni déposé.' : undefined },
      event: { kind: 'document', label: 'Statuts rédigés (modèle du cabinet)', detail: doc.name, href: url, docHref: dossierUrl(dossier) },
    };
  }
  const overrides = forme === 'HOLDING' ? { formeJuridique: 'SAS' } : {};
  const doc = await generateStatutsForDossier(supa, dossier, ctx.userId, overrides);
  const url = await signedUrl(supa, doc.file_path);
  return {
    result: { document: doc.name, ajoute_aux_pieces: true },
    event: { kind: 'document', label: 'Statuts générés', detail: doc.name, href: url, docHref: dossierUrl(dossier) },
  };
}

async function toolActe(supa, ctx, input) {
  const type = input?.type;
  if (!ACTES[type]) throw new Error(`Type d'acte inconnu : ${type}`);
  const dossier = await loadDossier(supa, ctx);
  if (!dossier) throw new Error("Aucun dossier : appelle d'abord enregistrer_dossier.");
  const data = dossier.metadata?.agent_data || {};
  const label = type === 'autre' && input.instructions ? input.instructions.slice(0, 80) : ACTES[type];
  // Attestation de domiciliation chez le dirigeant = attestation d'hébergement (gabarit) ;
  // chez une société de domiciliation, c'est le contrat de domiciliation fourni par le client.
  const nomGabarit = GABARIT_PAR_ACTE[type]
    || (type === 'attestation_domiciliation' && data.domiciliationChezDirigeant ? 'attestation_hebergement' : null)
    || (type === 'acte_cession' && data.cession?.nbParts ? 'acte_cession' : null);
  if (nomGabarit && !input.sur_mesure) {
    const nom = (s, n) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, n);
    const donnees = nomGabarit === 'acte_cession' ? await avecFicheRne(ctx, data) : null;
    const r = await acteParGabarit(supa, ctx, dossier, nomGabarit, { label, docType: type.toUpperCase(), filename: `${nom(label, 70)}-${nom(dossier.client_name, 30)}.docx`, donnees });
    if (r) return r;
  }
  if (type === 'attestation_domiciliation' && data.societeDomiciliation) {
    return { result: { non_redige: true, message: "Siège chez une société de domiciliation : la pièce à déposer est le contrat de domiciliation (ou l'attestation) fourni par le domiciliataire, à demander au client. Rien à rédiger." }, event: { kind: 'document', label: 'Contrat de domiciliation à demander au client' } };
  }

  // Société existante : la fiche RNE officielle (dénomination, forme, capital, siège, RCS,
  // dirigeants) sert de base aux PV, statuts mis à jour, cessions et déclarations.
  let fiche = null;
  const sirenActe = String(data.siren || '').replace(/\D/g, '');
  if (sirenActe.length === 9) {
    try { fiche = rne.summarizeCompany(await rne.getCompany(ctx.orgId, sirenActe)); } catch { /* données du dossier seules */ }
  }
  const brief = [
    `Acte demandé : ${ACTES[type]}.`,
    `Formalité : ${data.typeFormalite || dossier.type_formalite} — référence ${dossier.reference}.`,
    ...(fiche ? ['Fiche RNE officielle de la société (source de référence pour son identité, son capital, son siège et ses dirigeants actuels) :', JSON.stringify(fiche, null, 2)] : []),
    'Données du dossier (JSON) :',
    JSON.stringify(data, null, 2),
    input.instructions ? `Instructions du professionnel : ${input.instructions}` : '',
    "Utilise exactement ces données. Pour toute donnée absente, insère un champ [À COMPLÉTER : …]. Date du jour : " +
      new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + '.',
  ].filter(Boolean).join('\n');

  let chunks = [];
  try {
    chunks = await searchLegalChunks(`${ACTES[type]} ${data.formeJuridique || ''}`, { matchCount: 4, minSimilarity: 0.35 });
  } catch { /* rédaction possible sans sources */ }

  // Statuts mis à jour d'une SCI : les statuts de SCI du cabinet servent de modèle
  const sci = String(data.formeJuridique || '').toUpperCase() === 'SCI' || String(fiche?.formeJuridique) === '6540';
  const modeleActe = knowledge.modele(type === 'statuts_mis_a_jour' && sci ? 'statuts_sci' : MODELE_PAR_ACTE[type]);
  const draft = await draftDocument({ docType: 'autre', title: label, brief, chunks, modele: modeleActe });
  if (draft.refused) throw new Error('Rédaction refusée par le modèle.');
  if (ctx.draftUsage && draft.usage) {
    ctx.draftUsage.calls += 1;
    ctx.draftUsage.input += draft.usage.input_tokens || 0;
    ctx.draftUsage.output += draft.usage.output_tokens || 0;
    ctx.draftUsage.cacheWrite += draft.usage.cache_creation_input_tokens || 0;
    ctx.draftUsage.cacheRead += draft.usage.cache_read_input_tokens || 0;
  }
  const buffer = await Packer.toBuffer(markdownToDocx(label, draft.markdown));
  // Supabase Storage refuse les clés non ASCII (accents) : on translittère.
  const slug = (s, n) => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, n);
  const filename = `${slug(label, 70)}-${slug(dossier.client_name, 30)}.docx`;
  const doc = await storeDossierDocument(supa, dossier, { buffer, filename, docType: type.toUpperCase(), userId: ctx.userId });
  const url = await signedUrl(supa, doc.file_path);
  return {
    result: { document: doc.name, ajoute_aux_pieces: true, champs_a_completer: trousDe(draft.markdown), rappel: trousDe(draft.markdown).length ? 'Demander ces informations puis régénérer l\'acte : un acte incomplet ne peut pas être signé ni déposé.' : undefined },
    event: { kind: 'document', label, detail: doc.name, href: url, docHref: dossierUrl(dossier) },
  };
}

async function toolEtat(supa, ctx) {
  const dossier = await loadDossier(supa, ctx);
  if (!dossier) return { result: { dossier: null, message: 'Aucun dossier créé pour le moment.' } };
  const { data: documents } = await supa
    .from('dossier_documents')
    .select('id, name, doc_type, status, mime_type, created_at')
    .eq('dossier_id', dossier.id);
  const pipeline = buildPipeline(dossier, documents || []);
  return {
    result: {
      reference: dossier.reference,
      progression: pipeline.progress,
      etapes: pipeline.steps.map((s) => ({ etape: s.title, statut: s.status, detail: s.detail })),
      documents: (documents || []).map((d) => ({ id: d.id, nom: d.name, type: d.doc_type, statut: d.status })),
    },
    event: { kind: 'pipeline', label: 'Avancement du dossier', detail: `${pipeline.progress.percent} %`, href: `/dossiers/${dossier.id}`, pipeline },
  };
}

// ─── Brouillon au Guichet unique ──────────────────────────────────
async function toolBrouillon(supa, ctx, input) {
  const dossier = await loadDossier(supa, ctx);
  if (!dossier) throw new Error("Aucun dossier : appelle d'abord enregistrer_dossier.");
  const meta = dossier.metadata || {};
  const data = meta.agent_data || {};
  if ((data.typeFormalite || dossier.type_formalite) !== 'CREATION') {
    throw new Error('Le brouillon automatique ne concerne que les créations de société.');
  }
  if (meta.inpi_draft_id) {
    return {
      result: { deja_cree: true, formalite_inpi: meta.inpi_draft_id, message: 'Un brouillon existe déjà pour ce dossier sur le Guichet unique.' },
      event: { kind: 'inpi', label: 'Brouillon déjà créé', detail: `formalité ${meta.inpi_draft_id}`, href: `/inpi/${meta.inpi_draft_id}` },
    };
  }

  // Pièces demandées → documents du dossier
  const wanted = Array.isArray(input.pieces) ? input.pieces : [];
  const { data: docs } = await supa
    .from('dossier_documents').select('id, name, file_path, mime_type, doc_type, status')
    .eq('dossier_id', dossier.id);
  const byId = new Map((docs || []).map((d) => [String(d.id), d]));
  const plan = [];
  const introuvables = [];
  for (const w of wanted) {
    const d = byId.get(String(w.document_id));
    if (!d || !(PIECES[w.categorie] || PIECES_EI[w.categorie])) introuvables.push(String(w.document_id));
    else plan.push({ doc: d, categorie: w.categorie });
  }
  const categories = new Set(plan.map((p) => p.categorie));
  const forme = String(data.formeJuridique || '').toUpperCase();
  const attendues = ['AE', 'EI'].includes(forme)
    ? ['IDENTITE_DIRIGEANT', 'JUSTIFICATIF_SIEGE', 'MANDAT']
    : ['STATUTS', 'NON_CONDAMNATION', 'IDENTITE_DIRIGEANT', 'DEPOT_FONDS', 'ATTESTATION_PARUTION', 'MANDAT']
    .concat(['SAS', 'SASU', 'HOLDING'].includes(forme) ? ['LISTE_SOUSCRIPTEURS'] : [])
    .concat(categories.has('ATTESTATION_HEBERGEMENT') ? [] : ['JUSTIFICATIF_SIEGE']);
  const carte = ['AE', 'EI'].includes(forme) ? PIECES_EI : PIECES;
  const manquantes = attendues.filter((c) => !categories.has(c)).map((c) => carte[c].label);

  const client = inpi.forOrg(ctx.orgId);
  const estEI = ['AE', 'EI'].includes(forme);
  const { payload, aCompleter, bloquants } = estEI
    ? await buildEILiasse(data, dossier, client)
    : await buildCreationLiasse(data, dossier, client);
  const nonSignees = piecesNonSignees(plan);
  if (nonSignees.length) bloquants.push(bloquantSignature(nonSignees, true));
  if (manquantes.length && input.completer_sur_guichet !== true) {
    bloquants.push(`Pièces obligatoires manquantes : ${manquantes.join(', ')} (à joindre, ou confirmation explicite que le formaliste les ajoutera sur le Guichet unique)`);
  }
  if (estEI && payload.content.formeExerciceActivitePrincipale === 'ARTISANALE_REGLEMENTEE' && !categories.has('QUALIFICATION')) {
    bloquants.push("Activité artisanale réglementée : justificatif de qualification professionnelle de l'entrepreneur (diplôme ou expérience), pièce QUALIFICATION");
  }

  if (!input.confirme) {
    await supa.from('dossiers').update({ metadata: { ...meta, inpi_dry_run_at: new Date().toISOString() } }).eq('id', dossier.id);
    return {
      result: {
        apercu: true,
        rien_envoye: true,
        pieces_deposees: plan.map((p) => ({ document: p.doc.name, categorie: (PIECES_EI[p.categorie] && ['AE', 'EI'].includes(forme) ? PIECES_EI : PIECES)[p.categorie]?.label || p.categorie })),
        pieces_manquantes: manquantes,
        documents_introuvables: introuvables,
        // Entreprise individuelle : pas de personne morale, donc pas de bénéficiaires effectifs
        beneficiaires_effectifs_declares_dans_la_liasse: estEI ? 'sans objet (entreprise individuelle)' : (payload.content.personneMorale?.beneficiairesEffectifs || []).length,
        champs_a_completer_par_le_formaliste: aCompleter,
        bloquants_a_resoudre_avant_creation: bloquants,
        rappel: bloquants.length
          ? 'Création impossible tant que les bloquants ne sont pas résolus : demander les informations au professionnel.'
          : 'Demander une confirmation explicite avant de créer le brouillon.',
      },
      event: { kind: 'inpi', label: 'Aperçu du dépôt INPI', detail: `${plan.length} pièce(s) · ${manquantes.length} manquante(s) · ${aCompleter.length} champ(s) à compléter` },
    };
  }

  if (!meta.inpi_dry_run_at) throw new Error("Fais d'abord un aperçu (confirme=false) et présente-le au professionnel.");
  if (bloquants.length) throw new Error(`Création impossible, informations exigées par le Guichet unique : ${bloquants.join(' ; ')}`);

  const pieces = [];
  for (const p of plan) {
    const { data: blob, error } = await supa.storage.from(BUCKET).download(p.doc.file_path);
    if (error || !blob) { introuvables.push(p.doc.name); continue; }
    pieces.push({ categorie: p.categorie, nom: p.doc.name, buffer: Buffer.from(await blob.arrayBuffer()), mime: p.doc.mime_type || 'application/pdf' });
  }
  const { formality, deposees, erreurs } = await createDraftWithPieces(ctx.orgId, payload, pieces);
  // Relecture : le Guichet unique peut requalifier la forme d'exercice (catégorie d'activité)
  let requalification = null;
  try {
    const relue = await client.getFormality(formality.id);
    const envoyee = payload.content.formeExerciceActivitePrincipale;
    const retenue = relue?.content?.formeExerciceActivitePrincipale;
    if (envoyee && retenue && envoyee !== retenue) {
      requalification = `Le Guichet unique a requalifié la forme d'exercice : ${envoyee} → ${retenue}. À vérifier sur le brouillon avant validation.`;
      // Mémorisé : la prochaine formalité de ce code APE sera déclarée directement sous la forme retenue
      await require('./inpi-categorisation').corriger(data.codeApe, envoyee, retenue);
    }
  } catch {}

  await supa.from('dossiers').update({
    metadata: {
      ...meta,
      inpi_draft_id: String(formality.id),
      inpi_formality_id: String(formality.id),
      inpi_liasse: formality.liasseNumber || null,
      inpi_draft_created_at: new Date().toISOString(),
    },
  }).eq('id', dossier.id);
  try {
    await supa.from('audit_logs').insert({
      organization_id: ctx.orgId, user_id: ctx.userId,
      action: 'agent.inpi.draft_created', resource_type: 'dossier', resource_id: dossier.id,
      metadata: { inpi_formality_id: formality.id, pieces: deposees.length, erreurs: erreurs.length },
    });
  } catch {}

  return {
    result: {
      brouillon_cree: true,
      formalite_inpi: formality.id,
      liasse: formality.liasseNumber || null,
      pieces_deposees: deposees,
      statut_inpi: formality.status || null,
      // Entreprise individuelle : pas de personne morale, donc pas de bénéficiaires effectifs
        beneficiaires_effectifs_declares_dans_la_liasse: estEI ? 'sans objet (entreprise individuelle)' : (payload.content.personneMorale?.beneficiairesEffectifs || []).length,
      erreurs_depot: erreurs.concat(introuvables.map((n) => `${n} : introuvable`)),
      pieces_manquantes: manquantes,
      champs_a_completer_par_le_formaliste: aCompleter,
      lien_guichet_unique: `https://guichet-unique.inpi.fr/${formality.id}`,
      ...(requalification ? { ALERTE: requalification } : {}),
      etapes_formaliste: ['Compléter les champs signalés', 'Signer la formalité (étape « Signature électronique » à droite du chat)', 'Payer ou déléguer le paiement au client (étape « Paiement »)'], lien_guichet_unique_secours: 'Seulement pour payer par carte',
    },
    event: {
      kind: 'inpi',
      label: 'Brouillon créé sur le Guichet unique',
      detail: `${formality.liasseNumber || 'formalité ' + formality.id} · ${deposees.length} pièce(s) déposée(s)`,
      href: `/inpi/${formality.id}`,
    },
  };
}

// ─── Formalités INPI ──────────────────────────────────────────────
async function findFormalityId(ctx, recherche) {
  if (!recherche) return ctx.inpiFormalityId || null;
  const q = String(recherche).trim().toLowerCase();
  const client = inpi.forOrg(ctx.orgId);
  for (let page = 1; page <= 10; page++) {
    const r = await client.listFormalities({ page, itemsPerPage: 100, 'order[statusDate]': 'desc' });
    const items = r?.['hydra:member'] || [];
    const hit = items.find((f) =>
      String(f.liasseNumber || '').toLowerCase() === q ||
      String(f.companyName || f.nomDossier || '').toLowerCase().includes(q));
    if (hit) return hit.id;
    if (items.length < 100) break;
  }
  return null;
}

async function toolLireFormalite(ctx, input) {
  const id = await findFormalityId(ctx, input.recherche);
  if (!id) throw new Error(input.recherche ? `Aucune formalité INPI trouvée pour « ${input.recherche} ».` : 'Aucune formalité INPI ouverte.');
  const s = await getFormalitySummary(ctx.orgId, id);
  ctx.inpiFormalityId = String(s.id);
  ctx.inpiLiasse = s.liasse;
  const entreprise = s._content?.personneMorale?.identite?.entreprise || s._content?.personnePhysique?.identite?.entreprise || null;
  const { _content, ...rest } = s;
  return {
    result: { ...rest, entreprise },
    event: {
      kind: 'inpi', label: `Formalité INPI lue — ${s.societe || s.liasse}`,
      detail: `${s.typeLabel} · ${s.demandesEnCours.length} demande(s) du greffe en cours · ${s.pieces.length} pièce(s)`,
      href: `/inpi/${s.id}`,
    },
  };
}

async function toolModification(supa, ctx, input) {
  const operations = Array.isArray(input.operations) ? input.operations : [];
  if (!operations.length) throw new Error('Aucune opération de modification indiquée.');
  const siren = String(input.siren || '').replace(/\D/g, '');
  // La dissolution avec nomination de liquidateur passe en modification (M) ; mise en sommeil,
  // cessation d'EI et clôture de liquidation en cessation (R).
  const typeFormalite = operations.some((o) => ['miseEnSommeil', 'cessationEI', 'clotureLiquidation'].includes(o.type)) ? 'R' : 'M';

  // Bloquants connus avant tout envoi
  const bloquants = [];
  for (const o of operations) {
    if (o.type === 'nomination') {
      const p = o.personne || {};
      if (!p.nom || !p.prenoms?.length || !p.dateNaissance || !p.lieuNaissance) bloquants.push('Nouveau dirigeant : identité complète (nom, prénoms, date et lieu de naissance)');
      if (!p.adresse?.voie) bloquants.push('Nouveau dirigeant : adresse personnelle');
      if ((o.role || 'GERANT') === 'GERANT' && p.nationalite === 'FRA' && !p.numeroSecu) bloquants.push('Nouveau gérant : numéro de sécurité sociale');
      if ((o.role || 'GERANT') === 'GERANT' && !p.situationMatrimoniale) bloquants.push('Nouveau gérant : situation matrimoniale');
    }
    if (o.type === 'siege' && !(o.adresse?.voie && o.adresse?.codePostal && o.adresse?.commune)) bloquants.push('Adresse complète du nouveau siège');
    if (o.type === 'objet' && !o.objet) bloquants.push('Nouvel objet social');
    if (o.type === 'denomination' && !o.denomination) bloquants.push('Nouvelle dénomination');
    if (o.type === 'revocation' && !o.nom) bloquants.push('Nom du dirigeant sortant');
  }

  if (operations.some((o) => o.type === 'dissolution') && operations.some((o) => o.type === 'clotureLiquidation')) {
    bloquants.push("Dissolution et clôture de liquidation ne peuvent pas être déposées dans la même formalité (refus du Guichet unique) : déposer la dissolution, puis la clôture une fois la dissolution inscrite.");
  }

  const dossier = await loadDossier(supa, ctx);
  const meta = dossier?.metadata || {};
  const wanted = Array.isArray(input.pieces) ? input.pieces : [];
  let docs = [];
  if (dossier) ({ data: docs } = await supa.from('dossier_documents').select('id, name, file_path, mime_type, doc_type, status').eq('dossier_id', dossier.id));
  const byId = new Map((docs || []).map((d) => [String(d.id), d]));
  const plan = wanted.filter((w) => byId.has(String(w.document_id)) && PIECES_MODIF[w.categorie]).map((w) => ({ doc: byId.get(String(w.document_id)), categorie: w.categorie }));
  const nonSignees = piecesNonSignees(plan);
  if (nonSignees.length) bloquants.push(bloquantSignature(nonSignees));
  // Actes rédigés en attente de signature et attestation de parution : versés plus tard par le parcours
  const enAttente = new Set(['ATTESTATION_PARUTION', ...(docs || []).filter((d) => d.status === 'GENERE').map((d) => CATEGORIE_ACTE_MODIF[d.doc_type]).filter(Boolean)]);
  const manquantes = piecesManquantesModif(operations, new Set([...plan.map((p) => p.categorie), ...enAttente]), PIECES_MODIF);
  if (manquantes.length && input.completer_sur_guichet !== true) {
    bloquants.push(`Pièces obligatoires manquantes : ${manquantes.join(' ; ')} (à joindre, ou confirmation explicite que le formaliste les ajoutera sur le Guichet unique)`);
  }

  if (!input.confirme) {
    const fiche = rne.summarizeCompany(await rne.getCompany(ctx.orgId, siren));
    // Contrôle à blanc : les opérations s'appliquent-elles à la fiche ?
    let evenements = [];
    let erreurOperation = null;
    try {
      const base = await baseModification(ctx.orgId, siren);
      evenements = await appliquerOperations(base.next, operations, ctx.orgId);
      bloquants.push(...donneesManquantes(base.next));
    } catch (e) { erreurOperation = e.message; bloquants.push(e.message); }
    if (dossier) await supa.from('dossiers').update({ metadata: { ...meta, inpi_modif_preview_at: new Date().toISOString() } }).eq('id', dossier.id);
    return {
      result: {
        apercu: true, rien_envoye: true, entreprise: fiche, type_formalite: typeFormalite,
        evenements_prevus: evenements, erreur_operation: erreurOperation,
        bloquants_a_resoudre_avant_creation: bloquants,
        pieces_deposees: plan.map((p) => ({ document: p.doc.name, categorie: PIECES_MODIF[p.categorie].label })),
        rappel: bloquants.length || erreurOperation ? 'Résoudre les bloquants avant toute création.' : 'Demander une confirmation explicite avant de créer le brouillon.',
      },
      event: { kind: 'inpi', label: `Aperçu de la modification — ${fiche.denomination || siren}`, detail: `${evenements.join(' + ') || 'événements à préciser'} · ${plan.length} pièce(s)` },
    };
  }

  if (bloquants.length) throw new Error(`Création impossible : ${bloquants.join(' ; ')}`);
  if (dossier && !meta.inpi_modif_preview_at) throw new Error("Fais d'abord un aperçu (confirme=false) et présente-le au professionnel.");
  if (meta.inpi_draft_id) throw new Error(`Un brouillon existe déjà pour ce dossier (formalité ${meta.inpi_draft_id}).`);

  let attendus = [];
  const { formality, events } = await createModificationDraft(ctx.orgId, siren, {
    typeFormalite,
    reference: dossier?.reference,
    nomDossier: dossier?.client_name,
    mutate: async (c) => { attendus = await appliquerOperations(c, operations, ctx.orgId); },
  });
  // Événements réellement retenus par le Guichet unique comparés aux opérations demandées
  const LIBELLES_EVT = { '22M': 'dissolution', '40M': "cessation d'activité (mise en sommeil)", '35M': 'dirigeants', '42M': 'clôture de liquidation' };
  const nonRetenus = attendus.filter((e) => !events.includes(e));
  const ecart = nonRetenus.length
    ? (nonRetenus.includes('22M')
      ? `Dissolution : le Guichet unique n'accepte pas cette déclaration par API. Sur le brouillon, dans « Modifications », cocher la dissolution (événements 22M et 40M) : toutes les données sont déjà renseignées (motif, date, liquidateur, annonce). Retenu automatiquement : ${events.join(', ') || 'aucun'}.`
      : `Le Guichet unique n'a pas retenu : ${nonRetenus.map((e) => `${e} (${LIBELLES_EVT[e] || 'événement'})`).join(', ')} (retenu : ${events.join(', ') || 'aucun'}). À déclarer sur le brouillon avant validation.`)
    : null;
  const pieces = [];
  for (const p of plan) {
    const { data: blob } = await supa.storage.from(BUCKET).download(p.doc.file_path);
    if (blob) pieces.push({ categorie: p.categorie, nom: p.doc.name, buffer: Buffer.from(await blob.arrayBuffer()), mime: p.doc.mime_type || 'application/pdf' });
  }
  const { deposees, erreurs } = await deposerPieces(ctx.orgId, formality.id, pieces, PIECES_MODIF);
  if (dossier) {
    await supa.from('dossiers').update({ metadata: { ...meta, inpi_draft_id: String(formality.id), inpi_formality_id: String(formality.id), inpi_liasse: formality.liasseNumber || null, inpi_draft_created_at: new Date().toISOString(), inpi_operations: operations.map((o) => o.type) } }).eq('id', dossier.id);
  }
  try {
    await supa.from('audit_logs').insert({ organization_id: ctx.orgId, user_id: ctx.userId, action: 'agent.inpi.modification_draft_created', resource_type: 'dossier', resource_id: dossier?.id || null, metadata: { inpi_formality_id: formality.id, events } });
  } catch {}
  return {
    result: {
      brouillon_cree: true, formalite_inpi: formality.id, liasse: formality.liasseNumber, evenements_inpi: events,
      ...(ecart ? { ALERTE: ecart } : {}),
      pieces_deposees: deposees, erreurs_depot: erreurs,
      lien_guichet_unique: `https://guichet-unique.inpi.fr/${formality.id}`,
      etapes_formaliste: ['Vérifier et compléter les champs signalés', 'Faire signer les actes par le client (étape « Signature des documents »)', 'Signer la formalité (étape « Signature électronique »)', 'Payer ou déléguer le paiement au client (étape « Paiement »)'],
    },
    event: { kind: 'inpi', label: ecart ? 'Brouillon créé — écart à corriger' : 'Brouillon de modification créé sur le Guichet unique', detail: `${formality.liasseNumber} · ${events.join(' + ')} · ${deposees.length} pièce(s)${ecart ? ' · ' + ecart : ''}`, href: `/inpi/${formality.id}` },
  };
}

// ─── Groupes de sociétés ──────────────────────────────────────────
async function trouverGroupe(ctx, recherche) {
  const ids = await groupes.rechercher(ctx.orgId, recherche);
  if (!ids.length) throw new Error(`Aucun groupe enregistré pour « ${recherche} ». Proposer de le créer (modifier_groupe operation=creer avec le SIREN de la tête).`);
  return ids;
}

function arbreTexte(d) {
  const parId = new Map(d.entites.map((e) => [e.id, e]));
  return {
    groupe: d.groupe.nom,
    url: `/groupes/${d.groupe.id}`,
    societes: d.entites.map((e) => ({
      siren: e.siren, denomination: e.denomination, forme: e.forme, ville: e.ville, tete: e.tete, cessee: !e.active,
      a_verifier: e.a_verifier, detention_indirecte_tete: d.detentions[e.id] ?? null,
    })),
    liens: d.liens.map((l) => ({
      mere: parId.get(l.parent_id)?.denomination, mere_siren: parId.get(l.parent_id)?.siren,
      filiale: parId.get(l.enfant_id)?.denomination, filiale_siren: parId.get(l.enfant_id)?.siren,
      pourcentage: l.pourcentage == null ? null : Number(l.pourcentage), droits_vote: l.droits_vote == null ? null : Number(l.droits_vote),
      direction: l.direction, a_verifier: l.a_verifier,
    })),
    points_attention: d.controles.filter((c) => c.niveau !== 'info' || !/non renseigné/.test(c.texte)).map((c) => c.texte).slice(0, 30),
    pourcentages_manquants: d.liens.filter((l) => l.pourcentage == null).length,
  };
}

async function toolLireGroupe(ctx, input) {
  const ids = await trouverGroupe(ctx, input.recherche);
  const out = [];
  for (const id of ids.slice(0, 3)) {
    const d = await groupes.detail(ctx.orgId, id);
    const r = arbreTexte(d);
    if (input.suivi) {
      const parId = new Map(d.entites.map((e) => [e.id, e.denomination]));
      r.suivi = (await groupes.suivi(ctx.orgId, id)).map((s) => ({
        societe: parId.get(s.entite_id), siren: s.siren,
        formalites_en_cours: s.formalites_en_cours, dernier_depot_comptes: s.comptes, echeance_comptes: s.echeance_comptes,
        dossiers_cabinet: (s.dossiers || []).map((x) => `${x.reference} (${x.statut})`), erreur: s.erreur,
      }));
    }
    out.push(r);
  }
  return {
    result: out.length === 1 ? out[0] : { groupes: out },
    event: { kind: 'dossier', label: `Groupe lu — ${out[0].groupe}`, detail: `${out[0].societes.length} société(s)${input.suivi ? ' · suivi' : ''}`, href: out[0].url },
  };
}

async function toolModifierGroupe(ctx, input) {
  const op = input.operation;
  const siren = (v) => (v ? String(v).replace(/\D/g, '') : undefined);
  if (op === 'creer') {
    const r = await groupes.creer(ctx.orgId, ctx.userId, { siren: siren(input.siren), nom: input.nom });
    const d = await groupes.detail(ctx.orgId, r.groupe.id);
    return {
      result: { cree: true, ...arbreTexte(d), societes_meres_possibles: r.meres_possibles, tronque: r.tronque, rappel: 'Liens découverts au RNE (direction) : pourcentages à compléter et liens à vérifier.' },
      event: { kind: 'dossier', label: `Groupe créé — ${r.groupe.nom}`, detail: `${r.entites_ajoutees} société(s) · ${r.liens_ajoutes} lien(s) découverts au RNE`, href: `/groupes/${r.groupe.id}` },
    };
  }
  const [id] = await trouverGroupe(ctx, input.groupe || input.parent_siren || input.enfant_siren || input.siren);
  const d0 = await groupes.detail(ctx.orgId, id);
  const parSiren = (s) => d0.entites.find((e) => e.siren === siren(s));
  if (op === 'redecouvrir') {
    const r = await groupes.redecouvrir(ctx.orgId, id, siren(input.siren));
    return { result: r, event: { kind: 'dossier', label: `Groupe mis à jour — ${d0.groupe.nom}`, detail: `${r.entites_ajoutees} nouvelle(s) société(s)`, href: `/groupes/${id}` } };
  }
  if (op === 'lien') {
    const p = parSiren(input.parent_siren);
    const e = parSiren(input.enfant_siren);
    if (!p || !e) throw new Error('Société mère ou filiale absente du groupe : l’ajouter d’abord (operation=ajouter).');
    await groupes.enregistrerLien(ctx.orgId, id, { parentId: p.id, enfantId: e.id, pourcentage: input.pourcentage, droitsVote: input.droits_vote, direction: input.direction, source: 'agent' });
  } else if (op === 'ajouter') {
    const p = input.parent_siren ? parSiren(input.parent_siren) : null;
    if (input.parent_siren && !p) throw new Error('Société mère absente du groupe.');
    await groupes.ajouterEntite(ctx.orgId, id, { siren: siren(input.siren), denomination: input.denomination, parentId: p?.id, pourcentage: input.pourcentage, direction: input.direction, source: 'agent' });
  } else throw new Error(`Opération inconnue : ${op}`);
  const d = await groupes.detail(ctx.orgId, id);
  return {
    result: arbreTexte(d),
    event: { kind: 'dossier', label: `Groupe mis à jour — ${d.groupe.nom}`, detail: op === 'lien' ? `${input.pourcentage ?? '?'} % · ${input.enfant_siren}` : 'société ajoutée', href: `/groupes/${id}` },
  };
}

async function toolComptesAnnuels(supa, ctx, input) {
  const siren = String(input.siren || '').replace(/\D/g, '');
  if (!/^\d{9}$/.test(siren)) throw new Error('SIREN invalide (9 chiffres).');
  const confidentialite = input.confidentialite || 'aucune';
  const exercice = { debut: input.exercice_debut, fin: input.exercice_fin };
  const approuves = input.comptes_approuves !== false;
  const annee = String(input.exercice_fin || '').slice(0, 4);

  const dossier = await loadDossier(supa, ctx);
  const meta = dossier?.metadata || {};
  let docs = [];
  if (dossier) ({ data: docs } = await supa.from('dossier_documents').select('id, name, file_path, mime_type, doc_type, status').eq('dossier_id', dossier.id));
  const byId = new Map((docs || []).map((d) => [String(d.id), d]));
  const wanted = Array.isArray(input.pieces) ? input.pieces : [];
  const plan = wanted.filter((w) => byId.has(String(w.document_id)) && ca.PIECES_CA[w.categorie]).map((w) => ({ doc: byId.get(String(w.document_id)), categorie: w.categorie }));
  const introuvables = wanted.filter((w) => !byId.has(String(w.document_id))).map((w) => String(w.document_id));
  // Actes rédigés par Legaly en attente de signature : versés au dépôt après la signature du client
  const CATEGORIE_ACTE_CA = { PV_APPROBATION_COMPTES: 'PV_AFFECTATION', DECLARATION_CONFIDENTIALITE: 'DECLARATION_CONFIDENTIALITE' };
  const enAttenteCA = (docs || []).filter((d) => d.status === 'GENERE' && CATEGORIE_ACTE_CA[d.doc_type]).map((d) => CATEGORIE_ACTE_CA[d.doc_type]);
  const { bloquants, alertes } = ca.controler({
    exercice, confidentialite, approuves, dateApprobation: input.date_approbation,
    categories: [...plan.map((p) => p.categorie), ...enAttenteCA],
  });
  if (introuvables.length) bloquants.push(`Documents introuvables dans le dossier : ${introuvables.join(', ')} (appelle etat_dossier)`);
  const nonSigneesCA = piecesNonSignees(plan);
  if (nonSigneesCA.length) bloquants.push(bloquantSignature(nonSigneesCA));
  if (input.cac && !plan.some((p) => p.categorie === 'RAPPORT_CAC')) bloquants.push('Pièce manquante : Rapport du commissaire aux comptes');
  if (confidentialite !== 'aucune') alertes.push('Confidentialité : à vérifier sur le Guichet unique au moment de la signature (l’option est portée par le dépôt, la mention « confidentielle » des pièces se contrôle à l’écran)');

  if (!input.confirme) {
    const fiche = rne.summarizeCompany(await rne.getCompany(ctx.orgId, siren));
    let erreur = null;
    try { await ca.construireContenu(ctx.orgId, siren, { exercice, confidentialite, approuves, cac: input.cac ?? null }); } catch (e) { erreur = e.message; }
    if (dossier) await supa.from('dossiers').update({ metadata: { ...meta, inpi_comptes_preview_at: new Date().toISOString() } }).eq('id', dossier.id);
    return {
      result: {
        apercu: true, rien_envoye: true, entreprise: fiche, exercice, confidentialite,
        pieces_attendues: ca.piecesAttendues(confidentialite, { approuves, cac: Boolean(input.cac) }).map((c) => ca.PIECES_CA[c].label),
        pieces_deposees: plan.map((p) => ({ document: p.doc.name, categorie: ca.PIECES_CA[p.categorie].label })),
        bloquants_a_resoudre_avant_creation: bloquants, alertes, erreur,
        frais_indicatifs: 'Environ 45 € TTC pour une société commerciale (greffe, BODACC, INPI) ; montant exact calculé par le Guichet unique à la création du brouillon.',
        rappel: bloquants.length || erreur ? 'Résoudre les bloquants avant toute création.' : 'Demander une confirmation explicite avant de créer le brouillon.',
      },
      event: { kind: 'inpi', label: `Aperçu du dépôt des comptes ${annee} — ${fiche.denomination || siren}`, detail: `${plan.length} pièce(s) · ${bloquants.length ? `${bloquants.length} point(s) bloquant(s)` : 'prêt'}` },
    };
  }

  if (ctx.batchParent) throw new Error('Mode lot : le brouillon du dépôt est créé ensuite par le professionnel depuis cette formalité, après vérification des comptes. Termine par l’aperçu.');
  if (!dossier) throw new Error("Enregistre d'abord le dossier (enregistrer_dossier, typeFormalite MODIFICATION, operation « Dépôt des comptes annuels ») et fais un aperçu.");
  if (bloquants.length) throw new Error(`Création impossible : ${bloquants.join(' ; ')}`);
  if (!meta.inpi_comptes_preview_at) throw new Error("Fais d'abord un aperçu (confirme=false) et présente-le au professionnel.");
  if (meta.inpi_comptes_id) throw new Error(`Un brouillon de dépôt existe déjà pour ce dossier (dépôt ${meta.inpi_comptes_id}).`);

  const pieces = [];
  for (const p of plan) {
    const { data: blob } = await supa.storage.from(BUCKET).download(p.doc.file_path);
    if (blob) pieces.push({ categorie: p.categorie, nom: p.doc.name, buffer: Buffer.from(await blob.arrayBuffer()), mime: p.doc.mime_type || 'application/pdf' });
  }
  const { depot, deposees, erreurs } = await ca.creerBrouillon(ctx.orgId, {
    siren, exercice, confidentialite, approuves, cac: input.cac ?? null, pieces,
    reference: dossier.reference, nomDossier: `COMPTES ${annee} ${dossier.client_name || ''}`.trim(),
  });
  let frais = null;
  try { frais = (await ca.detail(ctx.orgId, depot.id)).paiement; } catch {}
  await supa.from('dossiers').update({
    metadata: { ...meta, inpi_comptes_id: String(depot.id), inpi_comptes_liasse: depot.liasseNumber || null, inpi_comptes_annee: annee, inpi_comptes_created_at: new Date().toISOString() },
  }).eq('id', dossier.id);
  try {
    await supa.from('audit_logs').insert({ organization_id: ctx.orgId, user_id: ctx.userId, action: 'agent.inpi.comptes_draft_created', resource_type: 'dossier', resource_id: dossier.id, metadata: { inpi_comptes_id: depot.id, annee, confidentialite } });
  } catch {}
  return {
    result: {
      brouillon_cree: true, depot_inpi: depot.id, liasse: depot.liasseNumber, exercice, confidentialite,
      pieces_deposees: deposees, erreurs_depot: erreurs,
      frais_cents: frais?.a_payer_cents ?? null, detail_frais: frais?.paniers?.[0]?.lignes || [],
      lien_guichet_unique: ca.lienDepot(depot.id),
      etapes_formaliste: [
        'Ouvrir le dépôt sur le Guichet unique (lien_guichet_unique, rubrique Comptes annuels)',
        'Vérifier les pièces' + (confidentialite !== 'aucune' ? ' et leur mention confidentielle' : ''),
        'Signer électroniquement',
        'Payer ou envoyer la délégation de paiement au client (même page)',
      ],
    },
    event: { kind: 'inpi', label: `Brouillon de dépôt des comptes ${annee} créé`, detail: `${depot.liasseNumber || depot.id} · ${deposees.length} pièce(s)`, href: `/inpi/comptes/${depot.id}` },
  };
}

async function toolAnnonce(supa, ctx, input) {
  if (!annonces.TYPES[input.type]) throw new Error(`Type d'annonce inconnu : ${input.type}`);
  const dossier = await loadDossier(supa, ctx);
  if (!dossier) throw new Error("Aucun dossier : appelle d'abord enregistrer_dossier.");
  const data = dossier.metadata?.agent_data || {};
  const siren = String(input.siren || data.siren || '').replace(/\D/g, '');
  let societe = null;
  if (siren.length === 9) {
    try { societe = rne.summarizeCompany(await rne.getCompany(ctx.orgId, siren)); } catch { /* données du dossier seules */ }
  }
  const identite = annonces.identiteSociete(societe);
  const donnees = {
    ...(identite ? { societe: identite } : {}),
    dossier: data,
    departement_siege: identite?.departement || annonces.departement(data.siege?.codePostal),
  };
  // Avis de constitution : rédigé sans IA (mentions R.210-3, greffe tiré du référentiel des communes)
  let r;
  if (input.type === 'constitution' && !input.sur_mesure) {
    const { codeInseeCommune } = require('./inpi-liasse');
    const commune = data.siege?.codePostal ? await codeInseeCommune(data.siege.codePostal, data.siege.commune).catch(() => null) : null;
    r = annonces.avisConstitution(gabarits.contexte(data, { dossier }), require('./greffes').villeGreffe(commune?.code), donnees.departement_siege);
  } else {
    r = await annonces.redigerAnnonce({ type: input.type, donnees, instructions: input.instructions });
  }
  if (ctx.draftUsage && r.usage) {
    ctx.draftUsage.calls += 1;
    ctx.draftUsage.input += r.usage.input_tokens || 0;
    ctx.draftUsage.output += r.usage.output_tokens || 0;
    ctx.draftUsage.cacheWrite += r.usage.cache_creation_input_tokens || 0;
    ctx.draftUsage.cacheRead += r.usage.cache_read_input_tokens || 0;
  }

  // Document éditable : une section par département de parution + contrôle des mentions
  const md = [
    ...r.annonces.map((a) => `## ${a.titre} — département ${a.departement}\n\n${a.texte}\n\n*${a.caracteres} caractères*`),
    '## Contrôle des mentions obligatoires',
    ...r.controle.map((c) => `- ${c.statut === 'presente' ? '✔' : c.statut === 'sans_objet' ? '—' : '✘ À COMPLÉTER'} ${c.mention}`),
    r.a_completer.length ? `**À compléter :** ${r.a_completer.join(' ; ')}` : '',
    r.observations ? `**Observations :** ${r.observations}` : '',
  ].filter(Boolean).join('\n\n');
  const buffer = await Packer.toBuffer(markdownToDocx(r.label, md));
  const slug = (x, n) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, n);
  const doc = await storeDossierDocument(supa, dossier, {
    buffer, filename: `Annonce_legale-${slug(r.label, 50)}-${slug(dossier.client_name, 30)}.docx`, docType: 'ANNONCE_LEGALE', userId: ctx.userId,
  });
  const url = await signedUrl(supa, doc.file_path);

  // Historique des annonces du dossier (statut : redigee → commandee → parue)
  const meta = dossier.metadata || {};
  const entree = {
    type: r.type, label: r.label, statut: 'redigee', created_at: new Date().toISOString(), document_id: doc.id || null,
    annonces: r.annonces.map(({ departement, titre, texte, caracteres }) => ({ departement, titre, texte, caracteres })),
    a_completer: r.a_completer,
  };
  await supa.from('dossiers').update({ metadata: { ...meta, annonces_legales: [...(meta.annonces_legales || []), entree] } }).eq('id', dossier.id);

  return {
    result: {
      annonces: r.annonces, controle: r.controle, a_completer: r.a_completer, observations: r.observations,
      document: doc.name, ajoute_aux_pieces: true,
      publication: annonces.publicationConfiguree() ? 'disponible' : "à commander par le formaliste auprès d'un journal habilité (publication automatique pas encore branchée)",
    },
    event: {
      kind: 'document', label: r.label,
      detail: `${r.annonces.map((a) => `dépt ${a.departement} · ${a.caracteres} car.`).join(' | ')}${r.a_completer.length ? ` · ${r.a_completer.length} info(s) à compléter` : ''}`,
      href: url, docHref: dossierUrl(dossier),
    },
  };
}

async function toolPreparerLot(input) {
  const plan = await require('./batch').planifier(String(input.texte || ''));
  const noms = plan.formalites.map((f) => f.societe);
  return {
    result: plan,
    event: { kind: 'inpi', label: `Lot analysé — ${noms.length} formalité(s)`, detail: noms.slice(0, 4).join(', ') + (noms.length > 4 ? '…' : '') },
  };
}

async function toolLancerLot(ctx, input) {
  if (input.confirme !== true) throw new Error('Demande d’abord la confirmation du professionnel (confirme=true seulement ensuite).');
  if (ctx.batchParent) throw new Error('Impossible de lancer un lot depuis une formalité préparée en lot.');
  const r = await require('./batch').lancer({
    ctx: { userId: ctx.userId, orgId: ctx.orgId, isAdmin: ctx.isAdmin },
    label: input.label,
    formalites: (input.formalites || []).map((f) => ({ ...f, manquants: f.manquants || [] })),
  });
  return {
    result: { lot: r.batchId, formalites: r.total, suivi: 'affiché dans le chat, actualisé automatiquement' },
    event: { kind: 'batch', label: `Lot lancé — ${r.total} formalité(s)`, detail: r.label, batch: { id: r.batchId, label: r.label, total: r.total } },
  };
}

async function toolListerDocsRne(ctx, input) {
  const r = await rneDocs.listDocuments(ctx.orgId, input.siren);
  return {
    result: {
      siren: r.siren, denomination: r.denomination,
      actes: r.actes.slice(0, 60).map(({ id, libelle, decisions, dateDepot, confidentiel }) => ({ id, libelle, decisions, dateDepot, confidentiel })),
      comptes_annuels: r.bilans.slice(0, 20).map(({ id, libelle, confidentiel }) => ({ id, libelle, confidentiel })),
      ...(r.actes.length > 60 ? { note: `${r.actes.length} actes au total, les 60 plus récents sont listés` } : {}),
    },
    event: { kind: 'inpi', label: `Documents RNE — ${r.denomination || r.siren}`, detail: `${r.actes.length} acte(s) · ${r.bilans.length} compte(s) annuel(s)` },
  };
}

async function toolLireDocRne(supa, ctx, input) {
  const { buffer, contentType } = await rneDocs.downloadDocument(ctx.orgId, input.kind, input.id);
  const { text, source } = await extractText(buffer);
  let ajout = null;
  let href;
  if (input.ajouter_au_dossier) {
    const dossier = await loadDossier(supa, ctx);
    if (!dossier) throw new Error("Aucun dossier : appelle d'abord enregistrer_dossier pour y joindre le document.");
    const base = String(input.nom || `Document RNE ${input.id}`).slice(0, 110);
    const doc = await storeDossierDocument(supa, dossier, {
      buffer, filename: /\.pdf$/i.test(base) ? base : `${base}.pdf`,
      docType: input.kind === 'bilan' ? 'COMPTES_ANNUELS' : 'ACTE_RNE', userId: ctx.userId, mimeType: contentType,
    });
    href = await signedUrl(supa, doc.file_path);
    ajout = { document: doc.name, docHref: dossierUrl(dossier) };
  }
  return {
    result: { id: input.id, extraction: source, ajoute_aux_pieces: Boolean(ajout), texte: String(text || '').slice(0, 30000) || '(aucun texte lisible)' },
    event: ajout
      ? { kind: 'document', label: 'Document RNE ajouté au dossier', detail: ajout.document, href, docHref: ajout.docHref }
      : { kind: 'inpi', label: 'Document RNE lu', detail: input.nom || input.id },
  };
}

async function toolFicheRne(ctx, input) {
  const company = await rne.getCompany(ctx.orgId, input.siren);
  const fiche = rne.summarizeCompany(company);
  return {
    result: fiche,
    event: { kind: 'inpi', label: `Fiche RNE lue — ${fiche.denomination || fiche.siren}`, detail: `SIREN ${fiche.siren} · ${fiche.dirigeants.length} dirigeant(s)` },
  };
}

async function toolLirePiece(ctx, input) {
  if (!ctx.inpiFormalityId) throw new Error("Appelle d'abord lire_formalite_inpi.");
  const { buffer } = await downloadAttachment(ctx.orgId, ctx.inpiFormalityId, input.piece_id);
  const { text, source } = await extractText(buffer);
  const clipped = String(text || '').slice(0, 30000);
  return {
    result: { piece_id: input.piece_id, extraction: source, texte: clipped || '(aucun texte lisible)' },
    event: { kind: 'inpi', label: 'Pièce INPI lue', detail: `n° ${input.piece_id}` },
  };
}

const TOOL_LABELS = {
  enregistrer_dossier: 'Enregistrement du dossier',
  generer_statuts: 'Rédaction des statuts',
  rediger_acte: "Rédaction d'un acte",
  etat_dossier: "Lecture de l'avancement",
  creer_brouillon_inpi: 'Préparation du dépôt INPI',
  lire_fiche_rne: 'Lecture de la fiche RNE',
  rediger_annonce_legale: "Rédaction de l'annonce légale",
  lister_documents_rne: 'Lecture des documents RNE',
  preparer_lot: 'Analyse de la liste de formalités',
  lancer_lot: 'Lancement du lot',
  lire_document_rne: "Lecture d'un document RNE",
  creer_modification_inpi: "Préparation de la modification INPI",
  lire_formalite_inpi: 'Lecture de la formalité INPI',
  lire_piece_inpi: "Lecture d'une pièce INPI",
};

async function runTool(name, input, ctx) {
  const supa = getSupabaseAdmin();
  if (!isPlainObject(input)) throw new Error('Paramètres invalides.');
  if (ctx.mode === 'client' && !CLIENT_TOOLS.has(name)) throw new Error('Outil indisponible dans l’espace entrepreneur.');
  if (OUTILS_DEPOT.has(name) && ctx.test) {
    throw new Error("Commande de test : aucun brouillon n'est créé au Guichet unique. Indique à l'entrepreneur que son dossier est prêt et qu'il peut simuler l'envoi avec le bouton « Simuler l'envoi au Guichet unique ».");
  }
  if (OUTILS_DEPOT.has(name)) {
    const d = await loadDossier(supa, ctx).catch(() => null);
    const prestation = d?.metadata?.agent_data?.prestation;
    if (prestation === 'documents' || prestation === 'annonce') {
      throw new Error(`Prestation « ${prestation === 'documents' ? 'rédaction des documents' : 'annonce légale'} » seule : aucun dépôt au Guichet unique n'est prévu. Si le professionnel veut finalement la formalité complète, enregistre d'abord prestation='formalite' (enregistrer_dossier) avec son accord.`);
    }
  }
  switch (name) {
    case 'enregistrer_dossier': return toolEnregistrer(supa, ctx, input);
    case 'generer_statuts': return toolStatuts(supa, ctx, input);
    case 'rediger_acte': return toolActe(supa, ctx, input);
    case 'etat_dossier': return toolEtat(supa, ctx);
    case 'creer_brouillon_inpi': return toolBrouillon(supa, ctx, input);
    case 'lire_fiche_rne': return toolFicheRne(ctx, input);
    case 'rediger_annonce_legale': return toolAnnonce(supa, ctx, input);
    case 'lister_documents_rne': return toolListerDocsRne(ctx, input);
    case 'preparer_lot': return toolPreparerLot(input);
    case 'lancer_lot': return toolLancerLot(ctx, input);
    case 'lire_document_rne': return toolLireDocRne(supa, ctx, input);
    case 'creer_modification_inpi': return toolModification(supa, ctx, input);
    case 'deposer_comptes_annuels': return toolComptesAnnuels(supa, ctx, input);
    case 'lire_groupe': return toolLireGroupe(ctx, input);
    case 'modifier_groupe': return toolModifierGroupe(ctx, input);
    case 'lire_formalite_inpi': return toolLireFormalite(ctx, input);
    case 'lire_piece_inpi': return toolLirePiece(ctx, input);
    default: throw new Error(`Outil inconnu : ${name}`);
  }
}

// Prompt système + guide d'expertise du cabinet (s'il a été généré sur le VPS).
function systemBlocks() {
  const blocks = [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }];
  const guide = knowledge.playbook();
  if (guide) {
    blocks.push({
      type: 'text',
      text: `<guide_expertise_cabinet>\nEnseignements tirés de l'historique réel des formalités du cabinet (régularisations et rejets des greffes). Applique-les systématiquement : préviens ces erreurs dès la préparation et utilise la check-list avant tout dépôt.\n\n${guide}\n</guide_expertise_cabinet>`,
      cache_control: { type: 'ephemeral' },
    });
  }
  return blocks;
}

// ─── Boucle de l'agent ────────────────────────────────────────────
// emit(event, data) : 'text' {text} | 'tool' {id, name, status, label, ...} | 'dossier' {...}
// Transforme les pièces jointes en blocs de contenu Claude.
// PDF et images passent par l'API Files (envoyés une fois, référencés ensuite
// par file_id : l'historique reste léger). Les .docx sont convertis en texte.
async function attachmentBlocks(client, attachments) {
  const blocks = [];
  for (const a of attachments) {
    const kind = ATTACHMENT_TYPES[a.mime];
    if (kind === 'tableur') {
      let csv = '';
      try {
        csv = await require('./batch').texteTableur(a.buffer, EXT_TABLEUR[a.mime]);
      } catch (e) {
        csv = `(lecture impossible : ${e.message})`;
      }
      blocks.push({ type: 'text', text: `Tableur joint « ${a.name} » (converti en CSV, séparateur ;) :\n<tableur>\n${csv.slice(0, DOCX_MAX_CHARS)}\n</tableur>` });
      continue;
    }
    if (kind === 'docx') {
      const { text } = await extractText(a.buffer);
      const clipped = String(text || '').slice(0, DOCX_MAX_CHARS);
      blocks.push({
        type: 'text',
        text: `Contenu du document joint « ${a.name} » :\n"""\n${clipped || '(document vide ou illisible)'}\n"""`,
      });
      continue;
    }
    const uploaded = await client.files.upload({
      file: await toFile(a.buffer, a.name, { type: a.mime }),
    });
    a.fileId = uploaded.id;
    if (kind === 'document') {
      blocks.push({ type: 'document', source: { type: 'file', file_id: uploaded.id }, title: a.name });
    } else {
      blocks.push({ type: 'text', text: `Image jointe : « ${a.name} »` });
      blocks.push({ type: 'image', source: { type: 'file', file_id: uploaded.id } });
    }
  }
  return blocks;
}

async function runAgentTurn({ history, input, attachments = [], ctx, emit, formResponse = null }) {
  const client = getAnthropic();
  const docBlocks = attachments.length ? await attachmentBlocks(client, attachments) : [];
  // Date du jour dans le message (pas dans le prompt système, qui reste en cache) :
  // indispensable pour juger délais et échéances.
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
  const userText = `[Date du jour : ${today}]\n${input || 'Voici des documents pour le dossier : analyse-les.'}`;
  let userContent = docBlocks.length ? [...docBlocks, { type: 'text', text: userText }] : userText;
  // Réponse à un formulaire : résultats des outils du tour précédent (dont le formulaire)
  // en tête du message, puis le texte éventuel du professionnel.
  if (formResponse) {
    const reponse = formResponse.reponses
      ? { reponses: formResponse.reponses }
      : { reponses: null, note: "Le professionnel n'a pas rempli le formulaire : il a répondu par message (ci-après)." };
    userContent = [
      ...(formResponse.pending || []),
      { type: 'tool_result', tool_use_id: formResponse.tool_use_id, content: JSON.stringify(reponse) },
      ...docBlocks,
      { type: 'text', text: input ? userText : `[Date du jour : ${today}]\n(Réponses au formulaire ci-dessus.)` },
    ];
  }
  // Outils restés sans résultat (formulaire en attente perdu côté navigateur) :
  // on y répond « non rempli » pour que l'historique reste valide.
  const dernier = history[history.length - 1];
  const orphelins = !formResponse && dernier?.role === 'assistant' && Array.isArray(dernier.content)
    ? dernier.content.filter((b) => b.type === 'tool_use') : [];
  if (orphelins.length) {
    const base = Array.isArray(userContent) ? userContent : [{ type: 'text', text: userContent }];
    userContent = [
      ...orphelins.map((tu) => ({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify({ reponses: null, note: 'Formulaire non rempli : voir le message du professionnel.' }) })),
      ...base,
    ];
  }
  const messages = [...history, { role: 'user', content: userContent }];
  const mode = ctx.mode || 'cabinet';
  const reglages = mode === 'client'
      ? { model: MODELS.agent, system: [...systemBlocks(), { type: 'text', text: CLIENT_PROMPT + (ctx.test ? CLIENT_TEST_PROMPT : '') }], tools: TOOLS.filter((t) => CLIENT_TOOLS.has(t.name)), effort: 'high', iterations: MAX_ITERATIONS, maxTokens: 16000, prix: PRICES }
      : { model: MODELS.agent, system: systemBlocks(), tools: TOOLS, effort: process.env.AGENT_EFFORT || 'medium', iterations: MAX_ITERATIONS, maxTokens: 16000, prix: PRICES };
  let pendingForm = null;
  const usage = { calls: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };
  ctx.draftUsage = { calls: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };

  for (let i = 0; i < reglages.iterations; i++) {
    const stream = client.beta.messages.stream({
      model: reglages.model,
      max_tokens: reglages.maxTokens,
      thinking: { type: 'adaptive' },
      output_config: { effort: reglages.effort },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Cache : prompt système + outils, et (top-level) tout l'historique jusqu'au
      // dernier bloc — chaque appel de la boucle relit l'historique en cache.
      cache_control: { type: 'ephemeral' },
      system: reglages.system,
      tools: reglages.tools,
      messages,
    });
    stream.on('text', (delta) => emit('text', { text: delta }));
    // Réflexion en cours : signalée tout de suite (rien d'autre n'est relayé pendant ce temps)
    stream.on('streamEvent', (ev) => { if (ev?.type === 'content_block_start' && ev.content_block?.type === 'thinking') emit('status', { label: 'Réflexion…' }); });

    let message;
    try {
      message = await stream.finalMessage();
      const u = message.usage || {};
      usage.calls += 1;
      usage.input += u.input_tokens || 0;
      usage.output += u.output_tokens || 0;
      usage.cacheWrite += u.cache_creation_input_tokens || 0;
      usage.cacheRead += u.cache_read_input_tokens || 0;
    } catch (err) {
      if (err?.status) throw err; // erreur API typée : on remonte
      emit('text', { text: '\n' });
      continue; // entrée d'outil illisible : on relance le tour
    }

    const toolUses = message.content.filter((b) => b.type === 'tool_use');

    // Un refus ou une coupure max_tokens peut laisser un tool_use sans résultat :
    // on n'ajoute pas ce tour à l'historique (il rendrait le suivant invalide).
    if (message.stop_reason === 'refusal') {
      emit('text', { text: '\n\nJe ne peux pas traiter cette demande.' });
      if (!toolUses.length) messages.push({ role: 'assistant', content: message.content });
      break;
    }
    if (message.stop_reason === 'max_tokens' && toolUses.length) {
      throw new Error('Réponse tronquée (max_tokens), relancez votre demande.');
    }

    messages.push({ role: 'assistant', content: message.content });
    if (message.stop_reason !== 'tool_use' || toolUses.length === 0) break;

    const results = [];
    const formulaire = !ctx.noForms && toolUses.find((tu) => tu.name === 'poser_questions');
    // Outils indépendants (rédactions, lectures) exécutés en parallèle ; ceux qui créent
    // ou modifient le dossier ou le Guichet unique passent d'abord, un par un, dans l'ordre.
    const executer = async (tu) => {
      emit('tool', { id: tu.id, name: tu.name, status: 'start', label: TOOL_LABELS[tu.name] || tu.name });
      try {
        const { result, event } = await runTool(tu.name, tu.input, ctx);
        emit('tool', { id: tu.id, name: tu.name, status: 'done', ...(event || { label: TOOL_LABELS[tu.name] }) });
        return { type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) };
      } catch (e) {
        console.error('[agent tool]', tu.name, e.message);
        emit('tool', { id: tu.id, name: tu.name, status: 'error', label: TOOL_LABELS[tu.name] || tu.name, detail: e.message });
        return { type: 'tool_result', tool_use_id: tu.id, is_error: true, content: String(e.message).slice(0, 3000) };
      }
    };
    const parId = new Map();
    for (const tu of toolUses) {
      if (tu.name === 'poser_questions') {
        // Mode lot (aucun humain) : pas de formulaire, on continue avec [À COMPLÉTER]
        if (ctx.noForms) parId.set(tu.id, { type: 'tool_result', tool_use_id: tu.id, is_error: true, content: 'Mode lot : aucune question possible. Laisse [À COMPLÉTER : …] et continue.' });
      } else if (OUTILS_SEQUENTIELS.has(tu.name)) {
        parId.set(tu.id, await executer(tu));
      }
    }
    const paralleles = toolUses.filter((tu) => tu.name !== 'poser_questions' && !OUTILS_SEQUENTIELS.has(tu.name));
    const resultats = await Promise.all(paralleles.map(executer));
    paralleles.forEach((tu, k) => parId.set(tu.id, resultats[k]));
    for (const tu of toolUses) if (parId.has(tu.id)) results.push(parId.get(tu.id));
    if (formulaire) {
      // Pause : le formulaire s'affiche ; les autres résultats repartiront avec les réponses.
      emit('form', { id: formulaire.id, ...formulaire.input });
      pendingForm = { tool_use_id: formulaire.id, pending: results };
      break;
    }
    messages.push({ role: 'user', content: results });
  }

  usage.agentCostUsd = Math.round(costUsd(usage, reglages.prix) * 1000) / 1000;
  usage.drafts = ctx.draftUsage;
  usage.draftsCostUsd = Math.round(costUsd(ctx.draftUsage, DRAFT_PRICES) * 1000) / 1000;
  usage.costUsd = Math.round((usage.agentCostUsd + usage.draftsCostUsd) * 1000) / 1000;
  console.log('[agent usage]', JSON.stringify(usage));
  return { messages, dossierId: ctx.dossierId || null, usage, pendingForm };
}

module.exports = { runAgentTurn, runTool, resumeCommande, ACTES, ATTACHMENT_TYPES };
