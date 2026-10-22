// Les modules de la plateforme : source unique pour le méga-menu (Nav), les pages
// /modules/[slug] et la section Product Suite. Uniquement des fonctions réelles
// du produit : pas de chiffres d'usage ni de promesses invérifiables.

import {
  BookOpen,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Layers,
  Megaphone,
  PenTool,
  Scale,
  Sparkles,
  Stamp,
  type LucideIcon,
} from 'lucide-react';

export interface LandingModule {
  key: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  href: string;
  /** Contenu de la page du module */
  page: {
    accroche: [string, string];
    intro: string;
    maquette: string; // clé de MAQUETTES (components/landing/v2/Maquettes.tsx)
    etapes: { titre: string; texte: string }[];
    inclus: string[];
    seul?: boolean; // commandable seul, sans formalité complète
  };
}

const m = (key: string, rest: Omit<LandingModule, 'key' | 'href'>): LandingModule => ({ key, href: `/modules/${key}`, ...rest });

export const MODULE_LIST: LandingModule[] = [
  m('agent-formalites', {
    icon: Sparkles,
    title: 'Agent Formalités',
    desc: 'Décrivez l’opération : l’agent prépare toute la formalité, du questionnaire au brouillon sur le Guichet unique.',
    page: {
      accroche: ['Décrivez l’opération.', 'L’agent prépare la formalité.'],
      intro: 'Création, modification, mise en sommeil, cessation : l’agent pose ses questions, lit vos pièces et la fiche RNE, rédige les actes et prépare le brouillon sur le Guichet unique. Vous relisez et vous validez.',
      maquette: 'agent',
      etapes: [
        { titre: 'Vous décrivez', texte: 'Une phrase suffit : « Transférer le siège de la SARL Martin à Lyon ».' },
        { titre: 'L’agent questionne', texte: 'Il pose ses questions sous forme de formulaire, valeurs connues déjà remplies.' },
        { titre: 'Il rédige', texte: 'Statuts, PV, pouvoir, annonce légale : à partir des réponses et du registre.' },
        { titre: 'Vous validez', texte: 'Le brouillon est prêt sur le Guichet unique : vous signez et vous payez.' },
      ],
      inclus: ['Créations : SASU, SAS, SARL, EURL, SCI, micro-entreprise', 'Modifications : siège, dirigeant, objet, dénomination, capital', 'Lecture des pièces jointes (identité, PV, statuts, Kbis)', 'Lecture de la fiche RNE et des actes déposés', 'Contrôle des pièces obligatoires avant le brouillon', 'Rien n’est signé, payé ni déposé sans vous'],
    },
  }),
  m('redaction-documents', {
    icon: FileText,
    title: 'Rédaction des documents',
    desc: 'Statuts, PV, pouvoirs, actes de cession : rédigés à partir des réponses et du registre, en .docx modifiable.',
    page: {
      accroche: ['Les actes rédigés.', 'Vous n’avez plus qu’à relire.'],
      intro: 'Statuts, procès-verbaux, pouvoirs, déclarations, actes de cession : rédigés à partir des réponses et des statuts en vigueur au RNE, en .docx modifiable. Avec la formalité, ou seuls.',
      maquette: 'redaction',
      etapes: [
        { titre: 'Les informations', texte: 'Recueillies par l’agent ou lues dans vos pièces et au registre.' },
        { titre: 'La rédaction', texte: 'Chaque acte rédigé au bon format, champs manquants signalés.' },
        { titre: 'La relecture', texte: 'Fichiers .docx modifiables, à votre style.' },
        { titre: 'La signature', texte: 'Envoyés en signature électronique quand ils sont prêts.' },
      ],
      inclus: ['Statuts de SASU, SAS, SARL, EURL et SCI', 'Statuts mis à jour à partir du texte en vigueur', 'PV de décision, d’approbation des comptes, de dissolution', 'Pouvoir, déclaration de non-condamnation, liste des souscripteurs', 'Acte de cession de parts ou d’actions', 'Les champs à compléter signalés avant toute signature'],
      seul: true,
    },
  }),
  m('annonces-legales', {
    icon: Megaphone,
    title: 'Annonces légales',
    desc: 'L’annonce rédigée par l’IA à partir de la fiche RNE ou d’un document (statuts, PV d’AG), chaque mention obligatoire contrôlée.',
    page: {
      accroche: ['L’annonce légale rédigée,', 'chaque mention contrôlée.'],
      intro: 'Constitution, modification, transfert de siège, dissolution, clôture de liquidation : joignez les statuts ou le PV d’assemblée générale, l’IA en extrait les décisions et rédige l’annonce, complétée par le registre. Chaque mention obligatoire est vérifiée. Avec la formalité, ou seule.',
      maquette: 'annonces',
      etapes: [
        { titre: 'Le document', texte: 'Statuts ou PV d’AG joints : l’IA en extrait l’opération, la date et les décisions.' },
        { titre: 'La rédaction', texte: 'L’avis adapté à l’opération et au département de parution.' },
        { titre: 'Le contrôle', texte: 'Chaque mention obligatoire vérifiée, ce qui manque est signalé.' },
        { titre: 'La parution', texte: 'Vous la commandez auprès d’un journal habilité ; l’attestation rejoint le dossier.' },
      ],
      inclus: ['Rédaction par l’IA à partir d’un document : statuts, PV d’AG, décisions', 'Identité de la société complétée par le RNE', 'Avis de constitution, de modification, de transfert de siège', 'Avis de dissolution et de clôture de liquidation', 'Mentions du Code de commerce contrôlées une à une', 'Greffe compétent retrouvé à partir du siège', 'Texte en .docx, prêt à transmettre au journal'],
      seul: true,
    },
  }),
  m('signature-electronique', {
    icon: PenTool,
    title: 'Signature électronique',
    desc: 'Documents signés à distance ; signature qualifiée (eIDAS) quand la formalité l’exige.',
    page: {
      accroche: ['Signé à distance,', 'au niveau exigé.'],
      intro: 'Statuts, PV et pouvoirs partent en signature électronique auprès des signataires, où qu’ils soient. La déclaration au Guichet unique est signée au niveau exigé : simple, avancée ou qualifiée (eIDAS).',
      maquette: 'signature',
      etapes: [
        { titre: 'Les documents', texte: 'Les actes rédigés et relus sont prêts à signer.' },
        { titre: 'Les signataires', texte: 'Proposés à partir du dossier : dirigeants, associés.' },
        { titre: 'La signature', texte: 'Chacun signe depuis son téléphone ou son ordinateur.' },
        { titre: 'Le dossier', texte: 'Les versions signées remplacent les brouillons et suivent la formalité.' },
      ],
      inclus: ['Signature simple, avancée ou qualifiée (eIDAS) selon l’acte', 'Plusieurs signataires par envoi', 'Suivi : envoyée, signée, refusée, expirée', 'Versions signées rangées dans le dossier', 'Signature de la déclaration au Guichet unique'],
    },
  }),
  m('comptes-annuels', {
    icon: FileSpreadsheet,
    title: 'Dépôt des comptes annuels',
    desc: 'Comptes contrôlés, PV d’approbation et confidentialité préparés, brouillon du dépôt au Guichet unique.',
    page: {
      accroche: ['Le dépôt des comptes,', 'contrôlé avant le greffe.'],
      intro: 'L’agent contrôle les comptes joints, rédige le PV d’approbation et la déclaration de confidentialité, propose le niveau de confidentialité auquel la société a droit et prépare le brouillon du dépôt.',
      maquette: 'comptes',
      etapes: [
        { titre: 'Les comptes', texte: 'Joints dans le chat : comptes complets ou liasse.' },
        { titre: 'Le contrôle', texte: 'Actif égal au passif, résultat identique partout, première page signée.' },
        { titre: 'Les actes', texte: 'PV d’approbation et déclaration de confidentialité rédigés.' },
        { titre: 'Le dépôt', texte: 'Brouillon prêt sur le Guichet unique, à signer et payer.' },
      ],
      inclus: ['Contrôle des motifs de rejet fréquents du greffe', 'Niveau de confidentialité proposé selon les seuils', 'PV d’approbation et d’affectation du résultat', 'Déclaration de confidentialité', 'Plusieurs sociétés en un seul lot'],
    },
  }),
  m('formalites-en-lot', {
    icon: Layers,
    title: 'Formalités en lot',
    desc: 'Une liste ou un tableur : chaque formalité préparée dans son propre dossier, en parallèle.',
    page: {
      accroche: ['Tout le portefeuille,', 'en une seule demande.'],
      intro: 'Collez une liste ou joignez un tableur : créations, mises en sommeil, changements de gérant, dépôts de comptes. Chaque formalité est préparée dans son propre dossier, en parallèle, et suivie dans le même chat.',
      maquette: 'lots',
      etapes: [
        { titre: 'La liste', texte: 'Texte libre ou tableur, une ligne par formalité.' },
        { titre: 'Le plan', texte: 'L’agent présente le lot et les informations manquantes.' },
        { titre: 'La préparation', texte: 'Chaque formalité avance dans son dossier, en parallèle.' },
        { titre: 'Le suivi', texte: 'L’avancement de chaque dossier, au même endroit.' },
      ],
      inclus: ['Créations, modifications, mises en sommeil, dépôts de comptes', 'Une formalité par dossier, préparées en parallèle', 'Informations manquantes listées société par société', 'Groupes de sociétés : une action sur toutes les filiales'],
    },
  }),
  m('documents-rne', {
    icon: BookOpen,
    title: 'Documents RNE',
    desc: 'Statuts en vigueur, PV, comptes déposés : retrouvés au registre et ajoutés au dossier en un clic.',
    page: {
      accroche: ['Le registre,', 'à portée de clic.'],
      intro: 'Statuts à jour, procès-verbaux, comptes annuels déposés et avis de situation : retrouvés au Registre national des entreprises, consultables et ajoutés au dossier. L’agent rédige à partir du texte officiel.',
      maquette: 'rne',
      etapes: [
        { titre: 'Le SIREN', texte: 'Ou le nom de la société.' },
        { titre: 'La fiche', texte: 'Identité, dirigeants, établissements, événements.' },
        { titre: 'Les actes', texte: 'Statuts, PV et comptes déposés, avec leur date.' },
        { titre: 'Le dossier', texte: 'Ajoutés au dossier client, lus par l’agent.' },
      ],
      inclus: ['Fiche RNE complète', 'Statuts en vigueur et derniers PV', 'Comptes annuels déposés', 'Avis de situation INSEE', 'Rédaction à partir du texte officiel en vigueur'],
    },
  }),
  m('regularisations', {
    icon: Stamp,
    title: 'Régularisations',
    desc: 'La demande du greffe lue avec les pièces déposées ; la correction et la réponse préparées.',
    page: {
      accroche: ['Le greffe demande,', 'l’agent prépare la réponse.'],
      intro: 'Pour une formalité déjà déposée, l’agent lit la demande de régularisation et les pièces transmises, explique ce qui bloque en langage clair, puis prépare la pièce corrigée et le courrier de réponse.',
      maquette: 'regularisation',
      etapes: [
        { titre: 'La demande', texte: 'Lue sur le Guichet unique, avec son échéance.' },
        { titre: 'Les pièces', texte: 'Celles déjà déposées, relues pour comprendre le motif.' },
        { titre: 'La correction', texte: 'Pièce corrigée et courrier de réponse rédigés.' },
        { titre: 'Le renvoi', texte: 'Vous déposez la réponse et validez la régularisation.' },
      ],
      inclus: ['Motifs du greffe expliqués point par point', 'Échéance de la régularisation suivie', 'Pièce corrigée et courrier de réponse', 'Liste des pièces que seul le client peut fournir'],
    },
  }),
  m('suivi-paiements', {
    icon: CreditCard,
    title: 'Suivi et paiements',
    desc: 'Chaque formalité suivie jusqu’à l’inscription ; frais officiels payés, délégués au client ou refacturés.',
    page: {
      accroche: ['Chaque dossier suivi,', 'chaque frais maîtrisé.'],
      intro: 'Statut au Guichet unique, pièces, signatures et paiement : chaque formalité suivie jusqu’à l’inscription. Les frais officiels sont réglés par le cabinet, délégués au client ou refacturés en débours.',
      maquette: 'paiement',
      etapes: [
        { titre: 'Le montant', texte: 'Les frais officiels affichés dès le brouillon.' },
        { titre: 'Le payeur', texte: 'Le cabinet, ou le client par délégation de paiement.' },
        { titre: 'Le suivi', texte: 'Alerte quand un paiement ou une signature traîne.' },
        { titre: 'La refacturation', texte: 'Facture de débours préparée pour le client.' },
      ],
      inclus: ['Statut de chaque formalité au Guichet unique', 'Délégation de paiement au client', 'Alertes de paiement en attente', 'Facture de débours en brouillon'],
    },
  }),
  m('assistant-juridique', {
    icon: Scale,
    title: 'Assistant juridique et fiscal',
    desc: 'Vos questions de droit des sociétés et de fiscalité, avec des réponses qui citent leurs sources.',
    page: {
      accroche: ['Une question de droit ?', 'Une réponse sourcée.'],
      intro: 'Un assistant pour les questions de droit des sociétés et de fiscalité du quotidien : il répond en citant ses sources, pour que vous puissiez vérifier.',
      maquette: 'assistant',
      etapes: [
        { titre: 'La question', texte: 'Posée simplement, comme à un confrère.' },
        { titre: 'La recherche', texte: 'Dans les textes officiels pertinents.' },
        { titre: 'La réponse', texte: 'Claire, avec les sources citées.' },
        { titre: 'La suite', texte: 'Si une formalité est nécessaire, l’agent la prépare.' },
      ],
      inclus: ['Droit des sociétés et formalités', 'Fiscalité de l’entreprise', 'Sources citées dans chaque réponse', 'Historique des conversations'],
    },
  }),
];

export const moduleParCle = (cle: string) => MODULE_LIST.find((x) => x.key === cle);
