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
const { createModificationDraft, appliquerOperations, baseModification, donneesManquantes } = require('./inpi-modification');
const { deposerPieces, PIECES_MODIF } = require('./inpi-liasse');
const { BUCKET } = require('./dossier-docs');
const knowledge = require('./knowledge');

const MAX_ITERATIONS = 12;

// Pièces jointes acceptées dans le chat (lues par Claude).
const ATTACHMENT_TYPES = {
  'application/pdf': 'document',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
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
  annonce_legale: "Avis de constitution (annonce légale)",
  decision_nomination: 'Acte de nomination du premier dirigeant',
  pv_decision: "Procès-verbal de décision des associés",
  annonce_modification: "Avis de modification (annonce légale)",
  pv_dissolution: 'Procès-verbal de dissolution anticipée',
  reponse_greffe: 'Courrier de réponse à la demande de régularisation du greffe',
  bail_commercial: 'Bail commercial',
  attestation_hebergement: "Attestation d'hébergement du siège chez le dirigeant",
  acte_cession: "Acte de cession d'actions ou de parts sociales",
  statuts_mis_a_jour: 'Statuts mis à jour',
  declaration_beneficiaires: 'Déclaration des bénéficiaires effectifs',
  autre: 'Document juridique',
};

// Modèle du cabinet utilisé pour chaque type d'acte (voir lib/knowledge.js).
const MODELE_PAR_ACTE = {
  declaration_non_condamnation: 'non_condamnation',
  liste_souscripteurs: 'liste_souscripteurs',
  attestation_domiciliation: 'attestation_hebergement',
  attestation_hebergement: 'attestation_hebergement',
  pouvoir_formalites: 'mandat',
  pv_decision: 'pv_assemblee',
  pv_dissolution: 'pv_assemblee',
  bail_commercial: 'bail_commercial',
  acte_cession: 'acte_cession',
  statuts_mis_a_jour: 'statuts_mis_a_jour',
};

// ─── Définition des outils ────────────────────────────────────────
const PERSONNE = {
  type: 'object',
  properties: {
    numeroSecu: { type: 'string', description: 'N° de sécurité sociale (15 chiffres) — exigé pour un gérant de SARL/EURL/SCI et un entrepreneur individuel' },
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
        annonceLegale: {
          type: 'object',
          description: "Annonce légale une fois PARUE (exigée par le Guichet unique pour créer le brouillon d'une création de société)",
          properties: { journal: { type: 'string' }, datePublication: { type: 'string', description: 'YYYY-MM-DD' } },
        },
        dirigeant: {
          ...PERSONNE,
          properties: { ...PERSONNE.properties, role: { type: 'string', description: 'PRESIDENT, GERANT, DG…' } },
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
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'rediger_acte',
    description:
      "Rédige un acte annexe (.docx) à partir des données du dossier et l'ajoute aux pièces. Types : " +
      Object.entries(ACTES).map(([k, v]) => `${k} (${v})`).join(', ') +
      '. Utilise "instructions" pour préciser le contenu (ex résolutions d\'un PV, titre d\'un document "autre").',
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
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
      "Prépare une MODIFICATION (ou une mise en sommeil / cessation d'EI) au Guichet unique à partir de la fiche RNE à jour de l'entreprise. Opérations : objet (12M : objet, codeApe), denomination (10M), siege (60M : adresse), nomination (35M : personne, role GERANT|PRESIDENT|DG), revocation (35M : nom du dirigeant sortant), beneficiaires (38F : ajouts [{personne, pourcentage}], retraits [noms]), miseEnSommeil (40M), cessationEI (41P), activiteAjout (61M/61P+24P : description, codeApe, formeExercice), activiteSuppression (62M/62P : codeApe), etablissementSecondaire (54M : adresse, description, codeApe), associes (17M : entrée/sortie d'associé, associeUnique), domicileEI (16P : adresse), dissolution (dissolution anticipée : liquidateurExistant ou liquidateur, lieuLiquidation, typeDissolution), clotureLiquidation (clôture et radiation : dateEffet, dateDissolution), complementEntreprise (pas un événement : objet social absent du RNE, par exemple repris d'une attestation d'immatriculation jointe), complementPersonne (pas un événement : complète un dirigeant existant dont le RNE n'a pas toutes les données — nom, dateNaissance, lieuNaissance, codePostalNaissance, paysNaissance, adresse — à demander au formaliste quand l'aperçu les signale). Pour une entreprise dont le RNE ne contient pas toutes les données des personnes inscrites (fréquent pour les entreprises anciennes ou reprises d'un autre cabinet), l'aperçu les liste en bloquants : les demander au formaliste puis les ajouter avec complementPersonne. Chaque opération peut avoir une dateEffet (YYYY-MM-DD). D'abord confirme=false (aperçu, rien n'est envoyé), puis confirme=true UNIQUEMENT après confirmation explicite du professionnel : crée le BROUILLON et dépose les pièces. Ne valide, ne signe et ne paie jamais. Catégories de pièces : " +
      Object.entries(PIECES_MODIF).map(([k, v]) => `${k} (${v.label})`).join(', ') + '.',
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        siren: { type: 'string' },
        confirme: { type: 'boolean' },
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
- Tu ne signes rien, tu ne déposes rien à l'INPI et tu n'envoies rien à des tiers : la signature électronique, la validation interne et le dépôt se font par le professionnel depuis la page du dossier.
</perimetre>

<documents_joints>
Le professionnel peut joindre des documents : pièces d'identité, statuts, procès-verbaux d'assemblée, Kbis, annonces légales, justificatifs de domicile, contrats de domiciliation, attestations de dépôt des fonds…
- Lis-les attentivement et utilise-les comme source prioritaire : extrais les informations utiles (identité et date/lieu de naissance du dirigeant, dénomination, SIREN, capital, siège, décisions votées…) et enregistre-les avec enregistrer_dossier.
- Dis brièvement ce que tu as trouvé dans chaque document, et signale ce qui est illisible, expiré, incohérent avec le reste du dossier ou contradictoire entre deux documents.
- Pour une modification, un PV d'assemblée suffit souvent à identifier l'opération : déduis-la et fais-la confirmer.
- Ne recopie jamais en entier dans tes réponses un numéro de pièce d'identité ou une donnée bancaire.
- Les fichiers joints sont automatiquement rangés dans les pièces du dossier.
</documents_joints>

<depot_inpi>
Objectif : préparer la formalité de A à Z pour que le formaliste n'ait plus qu'à valider, signer électroniquement et payer (par ses propres moyens ou par la délégation de paiement du Guichet unique).
1. Une fois le dossier complet et les actes rédigés, rappelle que les actes à signer (statuts, déclaration de non-condamnation, pouvoir, liste des souscripteurs) doivent être signés par le client, et demande les pièces que seul le client peut fournir : pièce d'identité du dirigeant, attestation de dépôt des fonds, justificatif du siège, attestation de parution de l'annonce. Elles se joignent dans ce chat.
2. Le Guichet unique exige, dès la création du brouillon d'une société : l'annonce légale PARUE (journal et date de parution, à enregistrer dans annonceLegale) et la date de clôture du premier exercice ; et, si le siège est chez une société de domiciliation, sa dénomination et son SIREN. Ordre conseillé : rédiger l'annonce (annonce_legale), la faire publier par le professionnel, puis créer le brouillon avec l'attestation de parution.
3. Appelle etat_dossier pour connaître les identifiants des documents, puis creer_brouillon_inpi avec confirme=false en associant chaque document à sa catégorie. Si l'aperçu signale des bloquants, demande les informations correspondantes avant toute création.
4. Présente le récapitulatif : pièces qui seront déposées, pièces manquantes ou non signées, champs que le formaliste devra compléter. Demande une confirmation explicite (« Je crée le brouillon sur votre Guichet unique ? »).
5. Seulement si le dernier message du professionnel confirme clairement, appelle creer_brouillon_inpi avec confirme=true.
6. Indique ensuite les étapes restantes du formaliste sur le Guichet unique : compléter les champs signalés, vérifier, valider, signer électroniquement, payer (carte ou délégation de paiement au client).
Pour une MODIFICATION (objet, dénomination, siège, dirigeant, bénéficiaires effectifs), une mise en sommeil ou la cessation d'une entreprise individuelle : lis d'abord la fiche RNE (lire_fiche_rne), rédige les actes (PV, statuts mis à jour, annonce), puis utilise creer_modification_inpi avec la même logique aperçu → confirmation → brouillon. Un changement de dirigeant associé au capital s'accompagne en général d'une mise à jour des bénéficiaires effectifs (opération beneficiaires).
La création de brouillon couvre les créations de SASU, SAS, EURL, SARL, SCI et d'entreprise individuelle (micro-entreprise : formeJuridique AE ; pas d'annonce légale ni de statuts, mais n° de sécurité sociale, situation matrimoniale, options du régime micro et pièce d'identité). Pour une modification ou une cessation, prépare les documents et guide le formaliste pour la saisie.
</depot_inpi>

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
5. Quand les données d'une création sont complètes : generer_statuts, puis les actes du dossier de constitution adaptés à la forme (declaration_non_condamnation pour chaque dirigeant, liste_souscripteurs pour une SAS/SASU, attestation_domiciliation, pouvoir_formalites, annonce_legale). Pour une modification ou une cessation : pv_decision ou pv_dissolution, puis annonce_modification, puis pouvoir_formalites.
6. Termine par un récapitulatif : documents produits, informations à vérifier, et prochaines étapes humaines (relire les actes, fournir les pièces d'identité, déposer le capital et obtenir l'attestation de dépôt des fonds, publier l'annonce, envoyer en signature, valider, déposer à l'INPI).
</methode>

<regles>
- N'invente JAMAIS une donnée personnelle ou d'identification (nom, date ou lieu de naissance, adresse, SIREN, montant). Si elle manque, demande-la ; si le professionnel veut avancer sans, laisse le champ vide et signale-le.
- Les valeurs par défaut usuelles sont acceptables si tu les annonces : durée 99 ans, clôture au 31 décembre, impôt sur les sociétés (IR pour une SCI), franchise en base de TVA.
- Vérifie la cohérence : somme des apports = capital, répartition des titres, dirigeant cohérent avec la forme (président pour SAS/SASU, gérant pour SARL/EURL/SCI), associé unique pour SASU/EURL, au moins deux associés pour SAS/SARL/SCI.
- Signale les points d'attention juridiques utiles (capital faible, activité réglementée, apport en nature nécessitant un commissaire aux apports…) sans faire de longues dissertations.
- Réponds en français, de façon concise et structurée (Markdown léger). Quand un outil échoue, explique simplement le problème et la marche à suivre.
- Les documents produits sont des projets à faire relire par le professionnel ; dis-le une fois dans le récapitulatif final.
</regles>`;

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
  const allowed =
    ctx.isAdmin || dossier.user_id === ctx.userId ||
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
        reference: `CMP-${Date.now().toString(36).toUpperCase()}`,
        statut: 'DRAFT',
        assigned_to: ctx.userId,
        metadata: {
          agent_data: data,
          created_by_agent: true,
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

async function toolStatuts(supa, ctx) {
  const dossier = await loadDossier(supa, ctx);
  if (!dossier) throw new Error("Aucun dossier : appelle d'abord enregistrer_dossier.");
  const forme = String(dossier.forme_juridique || '').toUpperCase();
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
      result: { document: doc.name, ajoute_aux_pieces: true, redige_sur_modele_du_cabinet: true },
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

  const brief = [
    `Acte demandé : ${ACTES[type]}.`,
    `Formalité : ${data.typeFormalite || dossier.type_formalite} — référence ${dossier.reference}.`,
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

  const modeleActe = knowledge.modele(MODELE_PAR_ACTE[type]);
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
    result: { document: doc.name, ajoute_aux_pieces: true },
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
    event: { kind: 'pipeline', label: 'Avancement du dossier', detail: `${pipeline.progress.percent} %`, href: `/dossiers/${dossier.id}/orchestrator`, pipeline },
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
    .from('dossier_documents').select('id, name, file_path, mime_type, doc_type')
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

  if (!input.confirme) {
    await supa.from('dossiers').update({ metadata: { ...meta, inpi_dry_run_at: new Date().toISOString() } }).eq('id', dossier.id);
    return {
      result: {
        apercu: true,
        rien_envoye: true,
        pieces_deposees: plan.map((p) => ({ document: p.doc.name, categorie: (PIECES_EI[p.categorie] && ['AE', 'EI'].includes(forme) ? PIECES_EI : PIECES)[p.categorie]?.label || p.categorie })),
        pieces_manquantes: manquantes,
        documents_introuvables: introuvables,
        beneficiaires_effectifs_declares_dans_la_liasse: (payload.content.personneMorale.beneficiairesEffectifs || []).length,
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
      beneficiaires_effectifs_declares_dans_la_liasse: (payload.content.personneMorale.beneficiairesEffectifs || []).length,
      erreurs_depot: erreurs.concat(introuvables.map((n) => `${n} : introuvable`)),
      pieces_manquantes: manquantes,
      champs_a_completer_par_le_formaliste: aCompleter,
      etapes_formaliste: ['Ouvrir le brouillon sur procedures.inpi.fr', 'Compléter les champs signalés', 'Valider la formalité', 'Signer électroniquement', 'Payer (carte ou délégation de paiement)'],
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
  const typeFormalite = operations.some((o) => ['miseEnSommeil', 'cessationEI', 'dissolution', 'clotureLiquidation'].includes(o.type)) ? 'R' : 'M';

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

  const dossier = await loadDossier(supa, ctx);
  const meta = dossier?.metadata || {};
  const wanted = Array.isArray(input.pieces) ? input.pieces : [];
  let docs = [];
  if (dossier) ({ data: docs } = await supa.from('dossier_documents').select('id, name, file_path, mime_type').eq('dossier_id', dossier.id));
  const byId = new Map((docs || []).map((d) => [String(d.id), d]));
  const plan = wanted.filter((w) => byId.has(String(w.document_id)) && PIECES_MODIF[w.categorie]).map((w) => ({ doc: byId.get(String(w.document_id)), categorie: w.categorie }));

  if (!input.confirme) {
    const fiche = rne.summarizeCompany(await rne.getCompany(ctx.orgId, siren));
    // Contrôle à blanc : les opérations s'appliquent-elles à la fiche ?
    let evenements = [];
    let erreurOperation = null;
    try {
      const base = await baseModification(ctx.orgId, siren);
      evenements = await appliquerOperations(base.next, operations);
      bloquants.push(...donneesManquantes(base.next));
    } catch (e) { erreurOperation = e.message; }
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

  const { formality, events } = await createModificationDraft(ctx.orgId, siren, {
    typeFormalite,
    reference: dossier?.reference,
    nomDossier: dossier?.client_name,
    mutate: (c) => appliquerOperations(c, operations),
  });
  const pieces = [];
  for (const p of plan) {
    const { data: blob } = await supa.storage.from(BUCKET).download(p.doc.file_path);
    if (blob) pieces.push({ categorie: p.categorie, nom: p.doc.name, buffer: Buffer.from(await blob.arrayBuffer()), mime: p.doc.mime_type || 'application/pdf' });
  }
  const { deposees, erreurs } = await deposerPieces(ctx.orgId, formality.id, pieces, PIECES_MODIF);
  if (dossier) {
    await supa.from('dossiers').update({ metadata: { ...meta, inpi_draft_id: String(formality.id), inpi_formality_id: String(formality.id), inpi_liasse: formality.liasseNumber || null, inpi_draft_created_at: new Date().toISOString() } }).eq('id', dossier.id);
  }
  try {
    await supa.from('audit_logs').insert({ organization_id: ctx.orgId, user_id: ctx.userId, action: 'agent.inpi.modification_draft_created', resource_type: 'dossier', resource_id: dossier?.id || null, metadata: { inpi_formality_id: formality.id, events } });
  } catch {}
  return {
    result: {
      brouillon_cree: true, formalite_inpi: formality.id, liasse: formality.liasseNumber, evenements_inpi: events,
      pieces_deposees: deposees, erreurs_depot: erreurs,
      etapes_formaliste: ['Ouvrir le brouillon sur procedures.inpi.fr', 'Vérifier et compléter', 'Valider', 'Signer électroniquement', 'Payer (carte ou délégation de paiement)'],
    },
    event: { kind: 'inpi', label: 'Brouillon de modification créé sur le Guichet unique', detail: `${formality.liasseNumber} · ${events.join(' + ')} · ${deposees.length} pièce(s)`, href: `/inpi/${formality.id}` },
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
  creer_modification_inpi: "Préparation de la modification INPI",
  lire_formalite_inpi: 'Lecture de la formalité INPI',
  lire_piece_inpi: "Lecture d'une pièce INPI",
};

async function runTool(name, input, ctx) {
  const supa = getSupabaseAdmin();
  if (!isPlainObject(input)) throw new Error('Paramètres invalides.');
  switch (name) {
    case 'enregistrer_dossier': return toolEnregistrer(supa, ctx, input);
    case 'generer_statuts': return toolStatuts(supa, ctx);
    case 'rediger_acte': return toolActe(supa, ctx, input);
    case 'etat_dossier': return toolEtat(supa, ctx);
    case 'creer_brouillon_inpi': return toolBrouillon(supa, ctx, input);
    case 'lire_fiche_rne': return toolFicheRne(ctx, input);
    case 'creer_modification_inpi': return toolModification(supa, ctx, input);
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

async function runAgentTurn({ history, input, attachments = [], ctx, emit }) {
  const client = getAnthropic();
  const docBlocks = attachments.length ? await attachmentBlocks(client, attachments) : [];
  // Date du jour dans le message (pas dans le prompt système, qui reste en cache) :
  // indispensable pour juger délais et échéances.
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
  const userText = `[Date du jour : ${today}]\n${input || 'Voici des documents pour le dossier : analyse-les.'}`;
  const userContent = docBlocks.length ? [...docBlocks, { type: 'text', text: userText }] : userText;
  const messages = [...history, { role: 'user', content: userContent }];
  const usage = { calls: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };
  ctx.draftUsage = { calls: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stream = client.beta.messages.stream({
      model: MODELS.agent,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Cache : prompt système + outils, et (top-level) tout l'historique jusqu'au
      // dernier bloc — chaque appel de la boucle relit l'historique en cache.
      cache_control: { type: 'ephemeral' },
      system: systemBlocks(),
      tools: TOOLS,
      messages,
    });
    stream.on('text', (delta) => emit('text', { text: delta }));

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
    for (const tu of toolUses) {
      emit('tool', { id: tu.id, name: tu.name, status: 'start', label: TOOL_LABELS[tu.name] || tu.name });
      try {
        const { result, event } = await runTool(tu.name, tu.input, ctx);
        emit('tool', { id: tu.id, name: tu.name, status: 'done', ...(event || { label: TOOL_LABELS[tu.name] }) });
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
      } catch (e) {
        console.error('[agent tool]', tu.name, e.message);
        emit('tool', { id: tu.id, name: tu.name, status: 'error', label: TOOL_LABELS[tu.name] || tu.name, detail: e.message });
        results.push({ type: 'tool_result', tool_use_id: tu.id, is_error: true, content: String(e.message).slice(0, 3000) });
      }
    }
    messages.push({ role: 'user', content: results });
  }

  usage.agentCostUsd = Math.round(costUsd(usage, PRICES) * 1000) / 1000;
  usage.drafts = ctx.draftUsage;
  usage.draftsCostUsd = Math.round(costUsd(ctx.draftUsage, DRAFT_PRICES) * 1000) / 1000;
  usage.costUsd = Math.round((usage.agentCostUsd + usage.draftsCostUsd) * 1000) / 1000;
  console.log('[agent usage]', JSON.stringify(usage));
  return { messages, dossierId: ctx.dossierId || null, usage };
}

module.exports = { runAgentTurn, ACTES, ATTACHMENT_TYPES };
