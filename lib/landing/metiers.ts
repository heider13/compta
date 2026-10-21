// Contenu des pages métier (experts-comptables, avocats, directions juridiques),
// assemblé par components/landing/PersonaLanding. Uniquement des fonctions réelles
// du produit : pas de chiffres d'usage, de témoignages ni de promesses invérifiables.

export type Carte = { key: string; titre: string; texte: string };
export type Defi = { defi: string; reponse: string };
export type Module = { key: string; nom: string; titre: string; texte: string };

// Nouveautés (réelles) affichées dans la carte « Évolutif »
export const NOUVEAUTES: { t: string; s: 'Déployé' | 'En cours' }[] = [
  { t: 'Questionnaires interactifs de l’agent', s: 'Déployé' },
  { t: 'Formalités en lot', s: 'Déployé' },
  { t: 'Annonces légales contrôlées', s: 'Déployé' },
  { t: 'Suivi des paiements et délégation', s: 'Déployé' },
  { t: 'Publication des annonces en ligne', s: 'En cours' },
];

const PALIERS_CABINET = ['Jusqu’à 3 collaborateurs', 'Jusqu’à 10 collaborateurs', 'Collaborateurs illimités'];

export type Metier = {
  kicker: string;
  ligne1: string;
  ligne2: string;
  sousTitre: string;
  points: string[];
  exemples: string[];
  chips: [string, string][];
  rail: { titre: [string, string]; sousTitre: string; cartes: Carte[] };
  defis: { titre: [string, string]; items: Defi[] };
  parcours: { titre: [string, string]; etapes: string[] };
  cta: [string, string];
  modulesTitre: [string, string];
  modules: Module[];
  engagements: { titre: string; points: string[] };
  adapte: { titre: string; texte: string; paliers: string[] };
  fin: [string, string];
};

export const METIERS: Record<string, Metier> = {
  'independants-tpe': {
    kicker: 'Pour les indépendants et les TPE',
    ligne1: 'Demandez-lui',
    ligne2: 'Créez une entreprise.',
    sousTitre: 'Créer votre micro-entreprise ou votre société, changer d’adresse, déposer vos comptes, fermer : décrivez ce que vous voulez faire, l’agent prépare tout, vous gardez la main.',
    points: ['Des questions simples, une à la fois', 'Statuts, annonce légale et dossier préparés pour vous', 'Les frais officiels affichés avant de payer'],
    exemples: [
      'Créer ma micro-entreprise de graphisme',
      'Créer ma SASU de conseil, capital 1 000 €',
      'Transférer le siège de mon EURL',
      'Déposer les comptes de ma SASU',
      'Mettre ma société en sommeil',
    ],
    chips: [
      ['Me lancer', 'Créer ma micro-entreprise de graphisme'],
      ['Créer une société', 'Créer ma SASU de conseil, capital 1 000 €'],
      ['Déménager', 'Transférer le siège de mon EURL'],
      ['Comptes annuels', 'Déposer les comptes de ma SASU'],
      ['Faire une pause', 'Mettre ma société en sommeil'],
    ],
    rail: {
      titre: ['Toute la vie de votre entreprise,', 'au même endroit'],
      sousTitre: 'De la création à la fermeture, chaque étape préparée et expliquée.',
      cartes: [
        { key: 'creation', titre: 'Création', texte: 'Micro-entreprise, SASU, EURL, SAS, SARL' },
        { key: 'annonces', titre: 'Annonce légale', texte: 'Rédigée, mentions vérifiées' },
        { key: 'modification', titre: 'Changements', texte: 'Adresse, activité, dirigeant' },
        { key: 'comptes', titre: 'Comptes annuels', texte: 'Dépôt et confidentialité' },
        { key: 'rne', titre: 'Vos documents', texte: 'Statuts et comptes déposés au RNE' },
        { key: 'sommeil', titre: 'Pause ou fermeture', texte: 'Mise en sommeil, cessation' },
      ],
    },
    defis: {
      titre: ['Ce qui change', 'pour vous'],
      items: [
        { defi: 'Micro-entreprise ou société ?', reponse: 'L’agent explique ce qui compte pour votre situation et prépare la forme choisie.' },
        { defi: 'Des documents juridiques à rédiger', reponse: 'Statuts, annonce, déclarations : rédigés à partir de vos réponses.' },
        { defi: 'Un portail officiel difficile à remplir', reponse: 'Le dossier du Guichet unique est préparé ; vous vérifiez, signez et payez.' },
        { defi: 'Des frais découverts au dernier moment', reponse: 'Les frais officiels sont affichés avant le paiement.' },
      ],
    },
    parcours: {
      titre: ['Votre formalité,', 'en quatre temps'],
      etapes: ['Vous décrivez votre projet', 'L’agent pose ses questions', 'Documents et dossier préparés', 'Vous signez et payez'],
    },
    cta: ['Prêt à vous lancer', 'sans paperasse ?'],
    modulesTitre: ['Tout ce qu’il faut pour', 'créer et faire vivre votre entreprise'],
    modules: [
      { key: 'agent', nom: 'Agent Formalités', titre: 'Des questions simples, une à la fois.', texte: 'Vous décrivez votre projet en quelques mots ; l’agent pose ses questions sous forme de formulaire et vous propose des choix expliqués.' },
      { key: 'signature', nom: 'Documents et signature', titre: 'Vos statuts rédigés, signés en ligne.', texte: 'Statuts, déclaration de non-condamnation, pouvoir, attestation de domiciliation : rédigés à partir de vos réponses, puis signés en ligne par signature électronique, qualifiée (eIDAS) quand la formalité l’exige.' },
      { key: 'annonces', nom: 'Annonce légale', titre: 'L’annonce légale, sans erreur.', texte: 'Rédigée à partir de vos informations, mentions obligatoires vérifiées, avec le département de parution.' },
      { key: 'formalites', nom: 'Guichet unique', titre: 'Le dossier officiel préparé.', texte: 'Le dossier du Guichet unique est prérempli avec vos pièces ; vous le vérifiez, le signez et le payez vous-même.' },
      { key: 'paiement', nom: 'Frais', titre: 'Les frais connus à l’avance.', texte: 'Montant des frais officiels affiché avant le paiement, et suivi jusqu’à la validation.' },
      { key: 'rne', nom: 'Vos documents', titre: 'Vos statuts et comptes, toujours sous la main.', texte: 'Statuts, procès-verbaux et comptes déposés au registre national, téléchargeables en un clic.' },
      { key: 'regularisation', nom: 'Demandes du greffe', titre: 'Le greffe demande une correction ?', texte: 'La demande est expliquée simplement et la réponse est préparée avec les pièces à fournir.' },
    ],
    engagements: {
      titre: 'Nos engagements envers les indépendants',
      points: [
        'Rien n’est envoyé sans votre validation',
        'Les frais officiels affichés avant le paiement',
        'Vos données chiffrées et jamais revendues',
        'Un abonnement mensuel, sans engagement',
      ],
    },
    adapte: { titre: 'Adapté à votre activité', texte: 'Du premier jour d’activité à la petite équipe.', paliers: ['Micro-entrepreneur', 'Société unipersonnelle', 'TPE avec associés'] },
    fin: ['Tout ce dont vous avez besoin pour', 'gérer votre entreprise sereinement'],
  },
  'experts-comptables': {
    kicker: 'Pour les experts-comptables',
    ligne1: 'Le juridique de vos clients.',
    ligne2: 'Préparé pendant que vous chiffrez.',
    sousTitre: 'Créations, modifications, mises en sommeil et cessations de tout le portefeuille : l’agent prépare, votre cabinet valide.',
    points: ['Plusieurs clients préparés en une seule demande', 'Statuts, PV et annonces rédigés à partir du registre', 'Frais officiels suivis et refacturés au client'],
    exemples: [
      'Créer la SASU d’un client, capital 1 000 €',
      'Mettre en sommeil 3 sociétés du portefeuille',
      'Changer le gérant de la SARL d’un client',
      'Transférer le siège d’un client à Lyon',
      'Répondre à une régularisation du greffe',
    ],
    chips: [
      ['Créer une société', 'Créer la SASU d’un client, capital 1 000 €'],
      ['Plusieurs clients', 'Mettre en sommeil 3 sociétés du portefeuille'],
      ['Mise en sommeil', 'Mettre en sommeil la société d’un client'],
      ['Changer de gérant', 'Changer le gérant de la SARL d’un client'],
      ['Régularisation', 'Répondre à une régularisation du greffe'],
    ],
    rail: {
      titre: ['Tout le juridique du portefeuille,', 'au même endroit'],
      sousTitre: 'Les formalités de vos clients préparées de bout en bout, à côté de votre métier du chiffre.',
      cartes: [
        { key: 'creation', titre: 'Créations de vos clients', texte: 'SASU, SAS, SARL, EURL, SCI, micro-entreprise' },
        { key: 'lots', titre: 'Plusieurs clients en une fois', texte: 'Une liste ou un tableur, un dossier par société' },
        { key: 'sommeil', titre: 'Mises en sommeil', texte: 'Pour les sociétés sans activité du portefeuille' },
        { key: 'modification', titre: 'Changements courants', texte: 'Gérant, siège, objet, dénomination' },
        { key: 'paiement', titre: 'Frais refacturés', texte: 'Montant suivi, facture client en brouillon' },
        { key: 'rne', titre: 'Comptes et statuts au RNE', texte: 'Documents déposés, consultables en un clic' },
        { key: 'annonces', titre: 'Annonces légales', texte: 'Rédigées et contrôlées automatiquement' },
        { key: 'regularisation', titre: 'Régularisations', texte: 'Demandes du greffe lues et préparées' },
      ],
    },
    defis: {
      titre: ['Ce qui change', 'pour votre cabinet'],
      items: [
        { defi: 'Des heures de juridique non facturées', reponse: 'L’agent recueille les informations par questionnaire et rédige statuts, PV et annonces : vos collaborateurs relisent au lieu de saisir.' },
        { defi: 'Des dizaines de clients à traiter en même temps', reponse: 'Collez une liste ou joignez un tableur : chaque formalité est préparée dans son propre dossier, en parallèle.' },
        { defi: 'Des frais officiels à refacturer', reponse: 'Le montant de chaque formalité est suivi, la délégation de paiement au client aussi, et la facture client se crée en brouillon.' },
        { defi: 'Déléguer sans perdre le contrôle', reponse: 'Aucun brouillon ni dépôt sans validation du cabinet, et l’historique de chaque formalité reste consultable.' },
      ],
    },
    parcours: {
      titre: ['Une formalité client,', 'en quatre temps'],
      etapes: [
        'Le collaborateur décrit l’opération, ou colle la liste du portefeuille',
        'L’agent pose ses questions et lit la fiche RNE du client',
        'Statuts, PV, annonce et brouillon au Guichet unique sont prêts',
        'L’expert-comptable valide, le client signe et paie par délégation',
      ],
    },
    cta: ['Prêt à libérer vos équipes', 'du juridique ?'],
    modulesTitre: ['Une plateforme unique pour', 'le cabinet et ses clients'],
    modules: [
      { key: 'agent', nom: 'Agent Formalités', titre: 'Préparez vite, déposez bien.', texte: 'Décrivez l’opération du client : l’agent pose ses questions en formulaire, lit la fiche RNE, rédige statuts, PV et annonce, puis prépare le brouillon au Guichet unique. Vos collaborateurs relisent au lieu de saisir.' },
      { key: 'lots', nom: 'Formalités en lot', titre: 'Tout le portefeuille, en une demande.', texte: 'Collez une liste ou joignez un tableur : créations, mises en sommeil, changements de gérant. Chaque formalité est préparée dans son propre dossier, en parallèle, et suivie dans le même chat.' },
      { key: 'signature', nom: 'Signature électronique', titre: 'Vos clients signent en ligne, qualifiée si besoin.', texte: 'Statuts, PV d’approbation et pouvoirs envoyés en signature électronique à vos clients ; signature électronique qualifiée (eIDAS) quand la formalité l’exige. Le dossier avance dès que tout est signé.' },
      { key: 'annonces', nom: 'Annonces légales', titre: 'Des annonces conformes, sans relecture fastidieuse.', texte: 'L’avis est rédigé à partir du registre, chaque mention obligatoire du Code de commerce est vérifiée et ce qui manque est signalé.' },
      { key: 'rne', nom: 'Documents RNE', titre: 'Les comptes et statuts de vos clients, à portée de clic.', texte: 'Statuts à jour, procès-verbaux, comptes annuels déposés et avis de situation INSEE : consultables et ajoutés au dossier client en un clic.' },
      { key: 'paiement', nom: 'Paiements', titre: 'Des frais officiels suivis et refacturés.', texte: 'Montant de chaque formalité, délégation de paiement au client, alerte quand ça traîne et facture client en brouillon pour refacturer les débours.' },
      { key: 'regularisation', nom: 'Régularisations', titre: 'Le greffe demande, l’agent prépare.', texte: 'Les demandes de régularisation sont lues avec les pièces déjà déposées ; la pièce corrigée et le courrier de réponse sont préparés.' },
      { key: 'formalites', nom: 'Suivi des dossiers', titre: 'Tous les dossiers clients, sur un seul écran.', texte: 'Dossiers du cabinet et formalités déposées à l’INPI réunis : statut, pièces, signature et paiement de chaque client.' },
    ],
    engagements: {
      titre: 'Nos engagements envers la profession comptable',
      points: [
        'Vos clients restent les vôtres : ils échangent avec votre cabinet, pas avec Legaly',
        'Aucune formalité déposée sans la validation du cabinet',
        'Les données de vos clients ne servent qu’à leurs dossiers',
        'Un abonnement mensuel, sans engagement',
      ],
    },
    adapte: { titre: 'Adapté à votre cabinet', texte: 'Du cabinet indépendant au réseau de cabinets : validation interne, formalités en lot et rôles s’ajustent à votre organisation.', paliers: PALIERS_CABINET },
    fin: ['Tout ce dont vous avez besoin pour', 'le juridique de vos clients'],
  },

  avocats: {
    kicker: 'Pour les avocats',
    ligne1: 'Consacrez vos heures au droit.',
    ligne2: 'L’agent s’occupe de la formalité.',
    sousTitre: 'Constitutions, cessions, dissolutions : des projets d’actes à votre style, contrôlés et prêts à signer, jusqu’au brouillon au Guichet unique.',
    points: ['Vos modèles d’actes repris : structure, clauses, mentions', 'Régularisations du greffe analysées et préparées', 'Signature électronique de vos clients'],
    exemples: [
      'Rédiger le PV de dissolution anticipée d’une SARL',
      'Préparer la cession de parts et le changement de gérant',
      'Transférer le siège hors du ressort du greffe',
      'Répondre à la régularisation demandée par le greffe',
      'Constituer une SAS à trois associés avec clause d’agrément',
    ],
    chips: [
      ['Constitution', 'Constituer une SAS à trois associés avec clause d’agrément'],
      ['Cession de parts', 'Préparer la cession de parts et le changement de gérant'],
      ['Dissolution', 'Rédiger le PV de dissolution anticipée d’une SARL'],
      ['Transfert de siège', 'Transférer le siège hors du ressort du greffe'],
      ['Régularisation', 'Répondre à la régularisation demandée par le greffe'],
    ],
    rail: {
      titre: ['Vos opérations de droit des sociétés,', 'de l’acte au dépôt'],
      sousTitre: 'Des actes rédigés à partir de vos modèles et des textes officiels, puis la formalité préparée.',
      cartes: [
        { key: 'modeles', titre: 'Vos modèles d’actes', texte: 'Structure, clauses et mentions reprises' },
        { key: 'creation', titre: 'Constitutions', texte: 'Statuts, souscripteurs, nomination, pouvoir' },
        { key: 'modification', titre: 'Modifications statutaires', texte: 'Siège, dirigeants, objet, capital' },
        { key: 'dissolution', titre: 'Dissolution et liquidation', texte: 'PV, liquidateur, comptes et clôture' },
        { key: 'annonces', titre: 'Annonces légales', texte: 'Mentions du Code de commerce vérifiées' },
        { key: 'regularisation', titre: 'Régularisations', texte: 'Motifs du greffe analysés pièce par pièce' },
        { key: 'signature', titre: 'Signature électronique', texte: 'Actes signés à distance, signature qualifiée eIDAS' },
        { key: 'rne', titre: 'Statuts en vigueur', texte: 'Texte officiel déposé, lu par l’agent' },
      ],
    },
    defis: {
      titre: ['Ce qui change', 'pour votre cabinet'],
      items: [
        { defi: 'La rédaction répétitive des actes courants', reponse: 'L’agent reprend vos modèles déjà acceptés par le greffe : structure, clauses et mentions, adaptées au dossier.' },
        { defi: 'Les allers-retours avec le greffe', reponse: 'Les demandes de régularisation sont lues avec les pièces déjà déposées, et la correction est préparée.' },
        { defi: 'Les mentions obligatoires des annonces', reponse: 'Chaque mention du Code de commerce est contrôlée ; ce qui manque est signalé au lieu d’être inventé.' },
        { defi: 'Le temps passé sur le Guichet unique', reponse: 'Le brouillon est prérempli et les pièces jointes : vous relisez, faites signer et déposez.' },
      ],
    },
    parcours: {
      titre: ['Une opération,', 'en quatre temps'],
      etapes: [
        'Vous décrivez l’opération ou joignez les pièces du dossier',
        'L’agent lit la fiche RNE, les statuts en vigueur et vos documents',
        'Projets d’actes, annonce légale et brouillon INPI sont prêts',
        'Vous relisez, faites signer vos clients et déposez',
      ],
    },
    cta: ['Prêt à rendre leurs heures', 'à vos avocats ?'],
    modulesTitre: ['Une plateforme unique pour', 'vos actes et vos formalités'],
    modules: [
      { key: 'agent', nom: 'Rédaction d’actes', titre: 'Vos actes, à votre style, en quelques minutes.', texte: 'L’agent part de vos modèles déjà acceptés par le greffe et des statuts en vigueur pour produire des projets de PV, statuts et déclarations, avec des champs « à compléter » plutôt que des données inventées.' },
      { key: 'regularisation', nom: 'Régularisations', titre: 'Le greffe demande, l’agent prépare.', texte: 'Il lit le motif de la demande et les pièces déjà déposées, identifie ce qui bloque et prépare la correction ou le courrier de réponse.' },
      { key: 'annonces', nom: 'Annonces légales', titre: 'Chaque mention vérifiée, rien d’inventé.', texte: 'Constitution, transfert, dissolution, clôture : l’avis est rédigé à partir du registre et contrôlé mention par mention.' },
      { key: 'rne', nom: 'Documents RNE', titre: 'Le texte en vigueur, avant chaque acte.', texte: 'Statuts mis à jour et derniers procès-verbaux déposés : l’agent les lit avant de rédiger, et vous les joignez au dossier en un clic.' },
      { key: 'signature', nom: 'Signature électronique', titre: 'Signature des actes, qualifiée si besoin.', texte: 'Statuts, PV et pouvoirs envoyés en signature électronique à vos clients ; signature électronique qualifiée (eIDAS) quand la formalité l’exige. Une fois signés, le brouillon est prêt à déposer.' },
      { key: 'formalites', nom: 'Suivi des opérations', titre: 'Chaque opération suivie jusqu’à l’inscription.', texte: 'Dossiers du cabinet et formalités déposées au Guichet unique : statut, pièces, demandes du greffe et paiement, au même endroit.' },
      { key: 'paiement', nom: 'Débours', titre: 'Les frais du greffe, refacturés en débours.', texte: 'Montant officiel de chaque formalité, délégation de paiement au client et facture de débours en brouillon.' },
    ],
    engagements: {
      titre: 'Nos engagements envers les avocats',
      points: [
        'Vos actes restent les vôtres : l’agent propose des projets, vous décidez de chaque clause',
        'Aucun dépôt sans votre validation',
        'Vos dossiers restent confidentiels : données cloisonnées par cabinet',
        'Un abonnement mensuel, sans engagement',
      ],
    },
    adapte: { titre: 'Adapté à votre cabinet', texte: 'De l’avocat exerçant seul au cabinet d’affaires : chacun retrouve ses dossiers, et la validation reste entre les mains de l’associé.', paliers: PALIERS_CABINET },
    fin: ['Tout ce dont vous avez besoin pour', 'vos opérations de droit des sociétés'],
  },

  'directions-juridiques': {
    kicker: 'Pour les PME et les grands groupes',
    ligne1: 'Toutes vos entités.',
    ligne2: 'Un seul assistant juridique.',
    sousTitre: 'Changements de dirigeants, transferts de siège, bénéficiaires effectifs : le secrétariat juridique de vos sociétés, préparé et centralisé.',
    points: ['Un même changement préparé pour plusieurs entités', 'Statuts et PV à jour de chaque société, au RNE', 'Aucun dépôt sans la validation de la direction'],
    exemples: [
      'Nommer un nouveau président dans 4 filiales',
      'Transférer le siège de la holding à Paris',
      'Mettre à jour les bénéficiaires effectifs du groupe',
      'Dissoudre une filiale sans activité',
      'Récupérer les statuts à jour de toutes nos sociétés',
    ],
    chips: [
      ['Changer de dirigeant', 'Nommer un nouveau président dans 4 filiales'],
      ['Plusieurs entités', 'Transférer le siège de 3 filiales à Paris'],
      ['Bénéficiaires effectifs', 'Mettre à jour les bénéficiaires effectifs du groupe'],
      ['Transfert de siège', 'Transférer le siège de la holding à Paris'],
      ['Filiale à fermer', 'Dissoudre une filiale sans activité'],
    ],
    rail: {
      titre: ['Le secrétariat juridique du groupe,', 'au même endroit'],
      sousTitre: 'De la PME à plusieurs filiales jusqu’au grand groupe : chaque entité, chaque formalité, chaque pièce.',
      cartes: [
        { key: 'filiales', titre: 'Toutes vos entités', texte: 'Holding, filiales, sociétés civiles' },
        { key: 'lots', titre: 'Changements en série', texte: 'Une demande, plusieurs sociétés' },
        { key: 'modification', titre: 'Dirigeants et sièges', texte: 'Nominations, démissions, transferts' },
        { key: 'beneficiaires', titre: 'Bénéficiaires effectifs', texte: 'Déclarations mises à jour avec les changements' },
        { key: 'rne', titre: 'Statuts et PV à jour', texte: 'Documents déposés de chaque entité' },
        { key: 'sommeil', titre: 'Filiales sans activité', texte: 'Mise en sommeil ou fermeture' },
        { key: 'dissolution', titre: 'Dissolutions', texte: 'Liquidation amiable préparée' },
        { key: 'paiement', titre: 'Frais par entité', texte: 'Montants et paiements suivis' },
      ],
    },
    defis: {
      titre: ['Ce qui change', 'pour votre direction juridique'],
      items: [
        { defi: 'Des formalités dispersées entre filiales et conseils', reponse: 'Chaque formalité de chaque entité dans un même outil, avec ses pièces et son historique.' },
        { defi: 'Un même changement à répéter sur plusieurs sociétés', reponse: 'Une demande pour plusieurs entités : l’agent prépare chaque formalité dans son propre dossier.' },
        { defi: 'Retrouver le dernier état des statuts', reponse: 'Statuts, PV et comptes déposés au RNE consultables et joints aux dossiers en un clic.' },
        { defi: 'Garder la maîtrise des dépôts', reponse: 'Aucun brouillon ni dépôt sans la validation de la direction juridique.' },
      ],
    },
    parcours: {
      titre: ['Un changement dans le groupe,', 'en quatre temps'],
      etapes: [
        'Le juriste décrit le changement, pour une ou plusieurs entités',
        'L’agent lit la fiche RNE et les statuts de chaque société',
        'PV, annonces et brouillons sont préparés entité par entité',
        'La direction juridique valide, les mandataires signent',
      ],
    },
    cta: ['Prêt à centraliser', 'le juridique du groupe ?'],
    modulesTitre: ['Une plateforme unique pour', 'toutes les sociétés du groupe'],
    modules: [
      { key: 'entites', nom: 'Entités du groupe', titre: 'L’arbre du groupe, un seul écran.', texte: 'Holding, filiales et sous-filiales retrouvées au registre, détentions directes et indirectes, points d’attention, formalités en cours et échéances de comptes de chaque société.' },
      { key: 'lots', nom: 'Changements en série', titre: 'Un changement, toutes les filiales.', texte: 'Nouveau président, transfert de siège ou mise à jour des bénéficiaires effectifs : une seule demande, une formalité préparée par entité.' },
      { key: 'agent', nom: 'Agent Formalités', titre: 'Le secrétariat juridique, préparé pour vous.', texte: 'Le juriste décrit le changement ; l’agent pose ses questions, lit les statuts en vigueur et rédige PV, déclarations et annonces.' },
      { key: 'rne', nom: 'Documents RNE', titre: 'Les statuts à jour de chaque société.', texte: 'Statuts, procès-verbaux et comptes déposés de chaque entité, consultables et joints aux dossiers en un clic.' },
      { key: 'signature', nom: 'Signature électronique', titre: 'Les mandataires signent à distance, qualifiée si besoin.', texte: 'Les actes partent en signature électronique auprès des dirigeants concernés, où qu’ils soient ; signature électronique qualifiée (eIDAS) quand la formalité l’exige.' },
      { key: 'annonces', nom: 'Annonces légales', titre: 'Les annonces de chaque entité, conformes.', texte: 'Rédigées à partir du registre, mentions obligatoires vérifiées, une par département de parution.' },
      { key: 'paiement', nom: 'Frais par entité', titre: 'Les frais suivis entité par entité.', texte: 'Montant de chaque formalité, paiement ou délégation, et alerte quand un paiement attend.' },
    ],
    engagements: {
      titre: 'Nos engagements envers les directions juridiques',
      points: [
        'Aucun dépôt sans la validation de la direction juridique',
        'L’historique et les pièces de chaque formalité conservés dans son dossier',
        'Identifiants INPI chiffrés, données cloisonnées par organisation',
        'Un abonnement mensuel, sans engagement',
      ],
    },
    adapte: { titre: 'Adapté à votre organisation', texte: 'De la PME qui compte quelques sociétés au groupe aux nombreuses filiales.', paliers: ['PME', 'ETI et holdings', 'Grands groupes'] },
    fin: ['Tout ce dont vous avez besoin pour', 'le juridique de vos entités'],
  },
};
