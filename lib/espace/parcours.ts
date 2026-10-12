// Parcours d'orientation gratuit (page Indépendants et TPE) : arbre de décision,
// sans IA. Chaque issue correspond à une formalité de la grille (server/lib/tarifs.js)
// ou à une information quand aucune prestation n'est utile.

export type Fin = { code: string; forme?: string; pourquoi: string };
export type Option = { label: string; description?: string; suite?: string; fin?: Fin };
export type Noeud = { question: string; aide?: string; options: Option[]; info?: boolean };

export const NOEUDS: Record<string, Noeud> = {
  debut: {
    question: 'Que souhaitez-vous faire ?',
    options: [
      { label: 'Créer mon entreprise', description: 'Micro-entreprise, SASU, EURL, SAS, SARL, SCI', suite: 'creer_projet' },
      { label: 'Modifier mon entreprise', description: 'Siège, dirigeant, activité, nom, associés', suite: 'modif_forme' },
      { label: 'Déposer mes comptes annuels', description: 'Dépôt au greffe, option de confidentialité', suite: 'comptes_forme' },
      { label: 'Faire une pause', description: 'Mise en sommeil de l’activité', suite: 'sommeil_forme' },
      { label: 'Fermer mon entreprise', description: 'Dissolution, liquidation, radiation', suite: 'fermer_forme' },
    ],
  },

  // ── Création ──
  creer_projet: {
    question: 'Quel est votre projet ?',
    options: [
      { label: 'Une activité professionnelle', description: 'Vente, prestations de services, artisanat, profession libérale…', suite: 'creer_seul' },
      { label: 'Acheter ou gérer un bien immobilier', description: 'Avec au moins une autre personne', fin: { code: 'creation_sci', forme: 'SCI', pourquoi: 'La SCI permet de détenir et gérer un bien immobilier à plusieurs, et d’en organiser la transmission.' } },
    ],
  },
  creer_seul: {
    question: 'Vous lancez-vous seul ou avec des associés ?',
    options: [
      { label: 'Seul', suite: 'creer_ca' },
      { label: 'Avec des associés', suite: 'creer_assoc' },
    ],
  },
  creer_assoc: {
    question: 'Quel cadre vous correspond le mieux ?',
    options: [
      { label: 'La souplesse', description: 'Règles libres dans les statuts, dirigeants assimilés salariés (SAS)', fin: { code: 'creation_societe', forme: 'SAS', pourquoi: 'La SAS laisse une grande liberté dans les statuts et convient bien à l’arrivée de nouveaux associés.' } },
      { label: 'Un cadre plus encadré', description: 'Règles fixées par la loi, cotisations plus faibles pour un gérant majoritaire (SARL)', fin: { code: 'creation_societe', forme: 'SARL', pourquoi: 'La SARL offre un cadre sécurisant et des cotisations sociales plus faibles pour un gérant majoritaire.' } },
      { label: 'Je ne sais pas encore', description: 'L’assistant vous aide à choisir', fin: { code: 'creation_societe', forme: 'SAS ou SARL', pourquoi: 'L’assistant compare avec vous la SAS et la SARL selon votre rémunération, vos associés et vos projets.' } },
    ],
  },
  creer_ca: {
    question: 'Quel chiffre d’affaires visez-vous la première année ?',
    aide: 'Les plafonds de la micro-entreprise : 77 700 € pour les prestations de services, 188 700 € pour la vente.',
    options: [
      { label: 'Sous ces plafonds', suite: 'creer_micro_frais' },
      { label: 'Au-dessus de ces plafonds', suite: 'creer_unip' },
      { label: 'Je ne sais pas encore', suite: 'creer_micro_frais' },
    ],
  },
  creer_micro_frais: {
    question: 'Prévoyez-vous des dépenses importantes ou des investisseurs ?',
    aide: 'En micro-entreprise, les frais ne sont pas déductibles et on ne peut pas faire entrer d’associés.',
    options: [
      { label: 'Non, une activité légère', description: 'Peu de frais, je démarre seul', fin: { code: 'creation_micro', forme: 'Micro-entreprise', pourquoi: 'La micro-entreprise est la plus simple à créer et à gérer : cotisations calculées sur le chiffre d’affaires, comptabilité allégée.' } },
      { label: 'Oui', description: 'Stock, matériel, locaux, ou levée de fonds', suite: 'creer_unip' },
    ],
  },
  creer_unip: {
    question: 'Comment préférez-vous être protégé et rémunéré ?',
    options: [
      { label: 'Assimilé salarié', description: 'Meilleure protection sociale, cotisations plus élevées (SASU)', fin: { code: 'creation_societe', forme: 'SASU', pourquoi: 'La SASU vous donne le statut d’assimilé salarié et beaucoup de souplesse ; elle peut accueillir des associés plus tard.' } },
      { label: 'Travailleur non salarié', description: 'Cotisations plus faibles, protection moindre (EURL)', fin: { code: 'creation_societe', forme: 'EURL', pourquoi: 'L’EURL réduit les cotisations sociales du gérant, avec un cadre juridique encadré.' } },
      { label: 'Je ne sais pas encore', description: 'L’assistant vous aide à choisir', fin: { code: 'creation_societe', forme: 'SASU ou EURL', pourquoi: 'L’assistant compare avec vous la SASU et l’EURL selon votre rémunération et votre protection sociale.' } },
    ],
  },

  // ── Modification ──
  modif_forme: {
    question: 'Quelle est la forme de votre entreprise ?',
    options: [
      { label: 'Une société', description: 'SAS, SASU, SARL, EURL, SCI…', suite: 'modif_quoi' },
      { label: 'Une micro-entreprise', description: 'Ou une entreprise individuelle', suite: 'info_micro_modif' },
    ],
  },
  modif_quoi: {
    question: 'Que voulez-vous changer ?',
    options: [
      { label: 'Transférer le siège social', fin: { code: 'modification', pourquoi: 'Le transfert de siège demande une décision des associés, des statuts mis à jour, une annonce légale et une formalité au Guichet unique.' } },
      { label: 'Changer de dirigeant', fin: { code: 'modification', pourquoi: 'Le changement de dirigeant demande une décision, une annonce légale, souvent une mise à jour des bénéficiaires effectifs, et une formalité au Guichet unique.' } },
      { label: 'Modifier l’activité', description: 'Objet social', fin: { code: 'modification', pourquoi: 'La modification de l’objet social demande une décision des associés, des statuts mis à jour et une annonce légale.' } },
      { label: 'Changer de nom', description: 'Dénomination sociale', fin: { code: 'modification', pourquoi: 'Le changement de dénomination demande une décision des associés, des statuts mis à jour et une annonce légale.' } },
      { label: 'Faire entrer ou sortir un associé', fin: { code: 'modification', pourquoi: 'L’entrée ou la sortie d’un associé passe par une cession de parts ou d’actions et, selon les cas, une formalité au Guichet unique.' } },
      { label: 'Autre changement', fin: { code: 'modification', pourquoi: 'L’assistant identifie avec vous les actes et la formalité nécessaires.' } },
    ],
  },
  info_micro_modif: {
    info: true,
    question: 'Bonne nouvelle : pour une micro-entreprise, un changement d’adresse ou d’activité se déclare gratuitement et simplement sur le Guichet unique (formalites.entreprises.gouv.fr). Vous n’avez pas besoin de payer un service pour cela.',
    options: [
      { label: 'Je veux plutôt passer en société', description: 'Créer une SASU ou une EURL', suite: 'creer_unip' },
      { label: 'Autre demande', suite: 'debut' },
    ],
  },

  // ── Comptes annuels ──
  comptes_forme: {
    question: 'Quelle est la forme de votre entreprise ?',
    options: [
      { label: 'Une société commerciale', description: 'SAS, SASU, SARL, EURL…', fin: { code: 'depot_comptes', pourquoi: 'Les comptes de l’exercice doivent être déposés au greffe dans le mois qui suit leur approbation (deux mois en ligne). Une petite entreprise peut demander la confidentialité.' } },
      { label: 'Une micro-entreprise ou une SCI', suite: 'info_comptes' },
    ],
  },
  info_comptes: {
    info: true,
    question: 'Les micro-entreprises et la plupart des SCI n’ont pas de comptes annuels à déposer au greffe. Rien à faire de ce côté !',
    options: [{ label: 'Autre demande', suite: 'debut' }],
  },

  // ── Mise en sommeil ──
  sommeil_forme: {
    question: 'Quelle est la forme de votre entreprise ?',
    options: [
      { label: 'Une société', fin: { code: 'mise_en_sommeil', pourquoi: 'La mise en sommeil suspend l’activité jusqu’à deux ans sans dissoudre la société ; les comptes restent à déposer chaque année.' } },
      { label: 'Une micro-entreprise', suite: 'info_sommeil_micro' },
    ],
  },
  info_sommeil_micro: {
    info: true,
    question: 'Une micro-entreprise ne se met pas en sommeil : il suffit de déclarer un chiffre d’affaires nul. Si vous arrêtez pour de bon, vous pouvez la fermer.',
    options: [
      { label: 'Fermer ma micro-entreprise', fin: { code: 'fermeture_micro', forme: 'Micro-entreprise', pourquoi: 'La cessation se déclare au Guichet unique ; nous la préparons et la déposons pour vous.' } },
      { label: 'Autre demande', suite: 'debut' },
    ],
  },

  // ── Fermeture ──
  fermer_forme: {
    question: 'Quelle est la forme de votre entreprise ?',
    options: [
      { label: 'Une société', description: 'SAS, SASU, SARL, EURL, SCI…', fin: { code: 'dissolution', pourquoi: 'La fermeture d’une société se fait en deux temps : la dissolution (nomination d’un liquidateur), puis la clôture de la liquidation et la radiation.' } },
      { label: 'Une micro-entreprise', fin: { code: 'fermeture_micro', forme: 'Micro-entreprise', pourquoi: 'La cessation se déclare au Guichet unique ; nous la préparons et la déposons pour vous.' } },
    ],
  },
};

// Aiguillage d'un message libre : mots-clés → étape de départ (sans IA).
export function aiguiller(texte: string): { noeud: string; reconnu: string | null } {
  const t = texte.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const micro = /micro|auto[- ]?entrepr|entreprise individuelle|\bei\b/.test(t);
  const societe = /\b(sasu|sas|sarl|eurl|sci|societe|holding)\b/.test(t);
  if (/compte|bilan|approbation/.test(t)) return { noeud: micro ? 'info_comptes' : societe ? 'comptes_forme' : 'comptes_forme', reconnu: 'Déposer mes comptes annuels' };
  if (/sommeil|pause|suspend/.test(t)) return { noeud: micro ? 'info_sommeil_micro' : 'sommeil_forme', reconnu: 'Faire une pause' };
  if (/fermer|\bferme|dissol|liquid|radiation|radier|\bcess|\barret/.test(t)) return { noeud: 'fermer_forme', reconnu: 'Fermer mon entreprise' };
  if (/modifi|changer|change|transf|demenag|siege|dirigeant|president|gerant|associe|denomination|nom de|objet/.test(t)) {
    return { noeud: micro ? 'info_micro_modif' : societe ? 'modif_quoi' : 'modif_forme', reconnu: 'Modifier mon entreprise' };
  }
  if (/sci|immobili/.test(t)) return { noeud: 'creer_projet', reconnu: 'Créer mon entreprise' };
  if (/creer|creation|lancer|monter|demarr|immatricul|ouvrir|installer|freelance|independant/.test(t)) {
    if (/\b(sasu|eurl)\b/.test(t)) return { noeud: 'creer_unip', reconnu: 'Créer mon entreprise' };
    if (/\b(sas|sarl)\b/.test(t) || /associe/.test(t)) return { noeud: 'creer_assoc', reconnu: 'Créer mon entreprise' };
    if (micro) return { noeud: 'creer_ca', reconnu: 'Créer mon entreprise' };
    return { noeud: 'creer_projet', reconnu: 'Créer mon entreprise' };
  }
  return { noeud: 'debut', reconnu: null };
}
