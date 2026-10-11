// Contenu des pages métier (experts-comptables, avocats, directions juridiques),
// assemblé par components/landing/PersonaLanding. Uniquement des fonctions réelles
// du produit : pas de chiffres d'usage, de témoignages ni de promesses invérifiables.

export type Carte = { key: string; titre: string; texte: string };
export type Defi = { defi: string; reponse: string };

export type Metier = {
  kicker: string;
  ligne1: string;
  ligne2: string;
  sousTitre: string;
  exemples: string[];
  chips: [string, string][];
  rail: { titre: [string, string]; sousTitre: string; cartes: Carte[] };
  defis: { titre: [string, string]; items: Defi[] };
  parcours: { titre: [string, string]; etapes: string[] };
  cta: [string, string];
};

export const METIERS: Record<string, Metier> = {
  'experts-comptables': {
    kicker: 'Pour les experts-comptables',
    ligne1: 'Le juridique de vos clients.',
    ligne2: 'Préparé pendant que vous chiffrez.',
    sousTitre: 'Créations, modifications, mises en sommeil et cessations de tout le portefeuille : l’agent prépare, votre cabinet valide.',
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
  },

  avocats: {
    kicker: 'Pour les avocats',
    ligne1: 'Consacrez vos heures au droit.',
    ligne2: 'L’agent s’occupe de la formalité.',
    sousTitre: 'Constitutions, cessions, dissolutions : des projets d’actes à votre style, contrôlés et prêts à signer, jusqu’au brouillon au Guichet unique.',
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
        { key: 'signature', titre: 'Signature électronique', texte: 'Actes signés par vos clients à distance' },
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
  },

  'directions-juridiques': {
    kicker: 'Pour les PME et les grands groupes',
    ligne1: 'Toutes vos entités.',
    ligne2: 'Un seul assistant juridique.',
    sousTitre: 'Changements de dirigeants, transferts de siège, bénéficiaires effectifs : le secrétariat juridique de vos sociétés, préparé et centralisé.',
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
  },
};
