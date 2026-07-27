// Contenu des landing pages par persona. Une seule source de vérité :
// le template components/landing/PersonaLanding assemble ces données.
// Ton : bénéfices concrets, ancrés dans le produit réel — pas de
// promesses invérifiables ni de faux chiffres d'usage.

export type PersonaPain = {
  pain: string;
  solution: string;
};

export type PersonaContent = {
  slug: string;
  nom: string; // libellé court pour la nav / le sélecteur
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  // Le titre : deux premières lignes + ligne mise en avant (dégradé)
  heroLines: [string, string];
  heroHighlight: string;
  heroSub: string;
  pains: PersonaPain[];
  selectorPitch: string; // une phrase pour la carte du sélecteur sur la home
};

export const PERSONAS: Record<string, PersonaContent> = {
  'experts-comptables': {
    slug: 'experts-comptables',
    nom: 'Experts-comptables',
    metaTitle: 'Legaly AI pour experts-comptables — formalités juridiques industrialisées',
    metaDescription:
      "Créations, modifications et radiations de sociétés pour tout votre portefeuille clients : OCR, liasse INPI préremplie, statuts générés, dépôt direct au Guichet Unique.",
    eyebrow: 'Pour les cabinets d’expertise comptable',
    heroLines: ['Le juridique de vos clients,', 'sans plomber vos équipes.'],
    heroHighlight: 'Industrialisez les formalités du portefeuille.',
    heroSub:
      "Créations, modifications, radiations, BE, comptes annuels : vos collaborateurs traitent les dossiers en quelques minutes, la liasse INPI se remplit toute seule, et vous gardez la validation finale.",
    pains: [
      {
        pain: 'Les formalités mangent des heures non facturées',
        solution:
          "L'OCR lit la pièce d'identité du dirigeant, le SIREN remonte les données du registre : 90 % des champs sont préremplis. Vos collaborateurs vérifient au lieu de saisir.",
      },
      {
        pain: 'La ressaisie entre vos outils et le Guichet Unique',
        solution:
          "Legaly AI dépose directement via l'API officielle INPI avec le compte du cabinet. Plus d'allers-retours entre votre dossier de travail et le portail.",
      },
      {
        pain: 'Déléguer aux juniors sans perdre le contrôle',
        solution:
          'Rôles et permissions par collaborateur, workflow de validation interne avant tout dépôt, audit log complet de chaque action.',
      },
      {
        pain: 'Suivre les frais légaux et la facturation client',
        solution:
          "Les frais INPI de chaque dossier sont visibles en temps réel — refacturez au coût réel, sans surprise pour votre client.",
      },
    ],
    selectorPitch:
      'Industrialisez les formalités de tout votre portefeuille, avec validation interne et délégation maîtrisée.',
  },
  avocats: {
    slug: 'avocats',
    nom: 'Avocats',
    metaTitle: 'Legaly AI pour avocats — vos actes, nos formalités',
    metaDescription:
      "Statuts en .docx éditable, signature électronique avancée eIDAS intégrée, dépôt INPI direct : consacrez vos heures au conseil, pas aux formulaires.",
    eyebrow: 'Pour les avocats et cabinets d’affaires',
    heroLines: ['Consacrez vos heures au droit,', 'pas aux formulaires.'],
    heroHighlight: 'Vos actes restent les vôtres.',
    heroSub:
      "Les statuts sortent en .docx éditable — votre plume, vos clauses. La signature avancée eIDAS exigée par l'INPI est intégrée, et le dossier avance sans quitter l'outil.",
    pains: [
      {
        pain: 'Les générateurs de statuts figés dévalorisent vos actes',
        solution:
          'Legaly AI génère une base complète en .docx que vous retravaillez librement — clauses spécifiques, pactes, conventions. Le document reste un acte d’avocat.',
      },
      {
        pain: 'La signature qualifiée, parcours du combattant',
        solution:
          "Signature électronique avancée eIDAS (Yousign) intégrée : le signataire reçoit un email, valide par OTP SMS. Conforme aux exigences INPI pour modifications et cessations.",
      },
      {
        pain: 'La confidentialité des dossiers clients',
        solution:
          'Hébergement France, chiffrement AES-256-GCM des identifiants INPI, isolation stricte entre cabinets, audit log de chaque accès.',
      },
      {
        pain: 'Les relances clients par email sans fin',
        solution:
          "Le client dépose ses pièces et suit son dossier en autonomie ; vous êtes notifié quand une action vous attend réellement.",
      },
    ],
    selectorPitch:
      'Statuts éditables, signature eIDAS intégrée, confidentialité stricte — le juridique sans l’administratif.',
  },
  'directions-juridiques': {
    slug: 'directions-juridiques',
    nom: 'Directions juridiques',
    metaTitle: 'Legaly AI pour directions juridiques — pilotez toutes vos entités',
    metaDescription:
      'Formalités de toutes vos entités (holdings, filiales) sur un seul écran : conformité BE et comptes annuels, traçabilité complète, API et webhooks pour votre SI.',
    eyebrow: 'Pour les directions juridiques et legal ops',
    heroLines: ['Toutes vos entités,', 'un seul écran de pilotage.'],
    heroHighlight: 'Groupes, holdings, filiales.',
    heroSub:
      "Créations de filiales, modifications statutaires, bénéficiaires effectifs, dépôts de comptes : chaque formalité de chaque entité est visible, tracée et sous contrôle — en temps réel.",
    pains: [
      {
        pain: 'La vision consolidée impossible sur plusieurs entités',
        solution:
          'Tableau de bord unique : kanban des dossiers de toutes les entités, statuts INPI synchronisés en temps réel, alertes sur ce qui requiert votre attention.',
      },
      {
        pain: 'La conformité récurrente qui passe entre les mailles',
        solution:
          'Bénéficiaires effectifs, dépôts de comptes annuels : les échéances sont suivies par entité, avec tâches assignées et relances.',
      },
      {
        pain: 'Prouver qui a fait quoi, quand',
        solution:
          'Audit log complet de chaque action (dépôt, validation, signature), rôles et permissions fins par collaborateur — prêt pour vos revues internes.',
      },
      {
        pain: 'Un outil de plus, déconnecté du SI',
        solution:
          'API publique et webhooks : intégrez les événements de formalités à vos outils (CLM, ERP, reporting) sans double saisie.',
      },
    ],
    selectorPitch:
      'Vision consolidée multi-entités, conformité récurrente suivie, traçabilité complète et API pour votre SI.',
  },
};

export const PERSONA_LIST = Object.values(PERSONAS);
