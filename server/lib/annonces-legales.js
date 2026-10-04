// Annonces légales : rédaction des avis à publier dans un support habilité (SHAL)
// avant le dépôt de la formalité. Chaque type d'annonce a ses mentions obligatoires
// (Code de commerce) ; le texte rédigé est contrôlé mention par mention.
// La publication (devis, commande, attestation de parution) passera par l'API du
// fournisseur d'annonces, branchée plus tard dans publierAnnonce().

const { getAnthropic, MODELS } = require('./ai');

// Mentions obligatoires par type d'annonce.
const TYPES = {
  constitution: {
    label: 'Avis de constitution',
    base: 'art. R.210-3 du Code de commerce (et R.123-237 pour le RCS)',
    mentions: [
      "Date et forme de l'acte (acte sous seing privé ou authentique, lieu et date)",
      'Dénomination sociale (et sigle le cas échéant)',
      'Forme juridique',
      'Montant du capital social (montant minimum si capital variable)',
      'Adresse du siège social',
      'Objet social (résumé)',
      'Durée de la société',
      "Noms, prénoms et adresse des dirigeants (président, directeurs généraux, gérants) et, s'il y a lieu, des commissaires aux comptes",
      "SAS/SASU : conditions d'admission aux assemblées et d'exercice du droit de vote",
      "SAS/SASU : clauses d'agrément ou de transmission des actions, s'il y en a",
      "SARL/SCI : clauses de cession des parts (agrément), s'il y en a",
      "Greffe du tribunal où la société sera immatriculée au RCS",
    ],
  },
  modification: {
    label: 'Avis de modification',
    base: 'art. R.210-9 du Code de commerce',
    mentions: [
      'Dénomination sociale (et sigle)',
      'Forme juridique',
      'Montant du capital social',
      'Adresse du siège social',
      "Numéro d'immatriculation (SIREN) et greffe du RCS",
      "Organe ayant décidé la modification (assemblée, associé unique, président, gérant) et date de la décision",
      "Date d'effet de la modification",
      "Ancienne mention et nouvelle mention, pour chaque élément modifié (dirigeant, objet, dénomination, capital, siège…)",
      'Mention du dépôt modificatif au greffe compétent',
    ],
  },
  transfert_siege: {
    label: 'Avis de transfert de siège',
    base: 'art. R.210-9 et R.123-74 du Code de commerce',
    mentions: [
      'Dénomination, forme juridique, capital',
      "Numéro d'immatriculation (SIREN) et greffe d'origine",
      'Organe ayant décidé le transfert et date de la décision',
      "Date d'effet du transfert",
      'Ancienne adresse et nouvelle adresse du siège',
      "Transfert hors du ressort du greffe : greffe d'arrivée ; dans le département d'arrivée, rappel de l'objet, de la durée et des dirigeants (une annonce dans chaque département si le département change)",
    ],
  },
  dissolution: {
    label: 'Avis de dissolution anticipée',
    base: 'art. R.237-2 du Code de commerce',
    mentions: [
      'Dénomination, forme juridique, capital, adresse du siège',
      "Numéro d'immatriculation (SIREN) et greffe du RCS",
      'Organe ayant décidé la dissolution et date de la décision',
      'Mention « société en liquidation »',
      "Date d'effet de la dissolution anticipée",
      'Nom, prénom et adresse du liquidateur (ou dénomination et siège si personne morale)',
      'Limitation éventuelle des pouvoirs du liquidateur',
      "Siège de la liquidation, adresse de correspondance et de notification des actes et documents",
      'Greffe où seront déposés les actes et pièces relatifs à la liquidation',
    ],
  },
  cloture_liquidation: {
    label: 'Avis de clôture de liquidation',
    base: 'art. R.237-9 du Code de commerce',
    mentions: [
      'Dénomination suivie de « société en liquidation », forme juridique, capital, adresse du siège',
      "Numéro d'immatriculation (SIREN) et greffe du RCS",
      'Nom, prénom et adresse du liquidateur',
      "Date et organe ayant approuvé les comptes définitifs de liquidation",
      'Quitus donné au liquidateur et décharge de son mandat',
      'Constatation de la clôture de la liquidation et sa date',
      'Greffe où sont déposés les comptes de liquidation',
      'Mention de la radiation au RCS',
    ],
  },
  dissolution_liquidation_simultanee: {
    label: 'Avis de dissolution et de clôture de liquidation simultanées',
    base: 'art. R.237-2 et R.237-9 du Code de commerce',
    mentions: [
      'Dénomination, forme juridique, capital, adresse du siège',
      "Numéro d'immatriculation (SIREN) et greffe du RCS",
      'Organe ayant décidé la dissolution et date de la décision',
      'Nom, prénom et adresse du liquidateur',
      "Approbation des comptes de liquidation, quitus au liquidateur, décharge de son mandat",
      'Clôture de la liquidation et sa date',
      'Greffe de dépôt des comptes de liquidation, radiation au RCS',
    ],
  },
  transformation: {
    label: 'Avis de transformation',
    base: 'art. R.210-9 du Code de commerce',
    mentions: [
      'Dénomination, capital, siège, SIREN et greffe',
      'Organe ayant décidé la transformation et date',
      'Ancienne forme et nouvelle forme',
      'Anciens et nouveaux dirigeants (et commissaires aux comptes)',
      "Pour une transformation en SAS : conditions d'admission aux assemblées, droit de vote, agrément",
    ],
  },
  capitaux_propres: {
    label: 'Avis de capitaux propres inférieurs à la moitié du capital',
    base: 'art. L.223-42 / L.225-248 et R.210-9 du Code de commerce',
    mentions: [
      'Dénomination, forme, capital, siège, SIREN et greffe',
      "Date et organe de la décision",
      'Décision de ne pas dissoudre la société (continuation de l\'activité)',
      'Délai de régularisation (au plus tard à la clôture du 2e exercice suivant)',
    ],
  },
  autre: {
    label: 'Annonce légale',
    base: 'Code de commerce',
    mentions: [
      'Dénomination, forme, capital, siège',
      "SIREN et greffe du RCS (si la société est immatriculée)",
      "Objet de l'annonce, organe et date de la décision, date d'effet",
    ],
  },
};

const ANNONCE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    annonces: {
      type: 'array',
      description: "Une annonce par département de parution (deux pour un transfert de siège changeant de département)",
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          departement: { type: 'string', description: 'Code du département de parution (ex 13, 75, 2A)' },
          titre: { type: 'string', description: "Intitulé de l'annonce (ex « Avis de constitution »)" },
          texte: { type: 'string', description: "Texte intégral prêt à publier, en texte brut, sans Markdown" },
        },
        required: ['departement', 'titre', 'texte'],
      },
    },
    controle: {
      type: 'array',
      description: 'Contrôle de chaque mention obligatoire listée',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          mention: { type: 'string' },
          statut: { type: 'string', enum: ['presente', 'a_completer', 'sans_objet'] },
        },
        required: ['mention', 'statut'],
      },
    },
    a_completer: { type: 'array', items: { type: 'string' }, description: 'Informations manquantes, laissées en [À COMPLÉTER : …] dans le texte' },
    observations: { type: 'string', description: 'Points de vigilance pour le formaliste (vide si aucun)' },
  },
  required: ['annonces', 'controle', 'a_completer', 'observations'],
};

const SYSTEM = `Tu es formaliste juridique expert des annonces légales en France. Tu rédiges des avis destinés à un support habilité à publier des annonces légales (SHAL), dans le style sobre et concis des annonces publiées.

<regles>
- Utilise UNIQUEMENT les données fournies. N'invente aucun nom, adresse, date, montant, SIREN ni greffe : laisse [À COMPLÉTER : …] dans le texte et liste l'information dans a_completer.
- Chaque mention obligatoire listée doit figurer dans le texte, ou être marquée sans_objet si elle ne s'applique pas (ex. clauses d'agrément absentes, pas de commissaire aux comptes).
- Le prix des annonces dépend du nombre de caractères (hors forfait de constitution) : sois complet mais concis, sans formule superflue, et résume l'objet social sans en retirer le sens.
- Format usuel : dénomination en tête (en majuscules), puis forme et capital, siège, RCS ; ensuite le corps de l'avis ; termine par « Pour avis » ou « Le représentant légal ».
- Dates en toutes lettres ou au format JJ/MM/AAAA ; montants en euros avec séparateur des milliers.
- Département de parution : celui du siège (pour un transfert changeant de département : une annonce dans l'ancien département et une dans le nouveau, la seconde rappelant objet, durée et dirigeants).
- Texte brut, sans Markdown ni balises.
</regles>`;

// Département d'après le code postal (Corse et DOM compris).
function departement(codePostal) {
  const cp = String(codePostal || '').trim();
  if (!/^\d{5}$/.test(cp)) return null;
  if (cp.startsWith('20')) return Number(cp) < 20200 ? '2A' : '2B';
  if (cp.startsWith('97') || cp.startsWith('98')) return cp.slice(0, 3);
  return cp.slice(0, 2);
}

async function redigerAnnonce({ type = 'autre', donnees, instructions }) {
  const t = TYPES[type] || TYPES.autre;
  const msg = await getAnthropic().messages.create({
    model: MODELS.balanced,
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    output_config: { format: { type: 'json_schema', schema: ANNONCE_SCHEMA } },
    messages: [{
      role: 'user',
      content: [
        `TYPE D'ANNONCE : ${t.label} (${t.base}).`,
        'MENTIONS OBLIGATOIRES À CONTRÔLER :',
        ...t.mentions.map((m, i) => `${i + 1}. ${m}`),
        '',
        'DONNÉES (JSON) :',
        JSON.stringify(donnees, null, 2),
        instructions ? `\nINSTRUCTIONS DU PROFESSIONNEL : ${instructions}` : '',
        `\nDate du jour : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
        "Rédige l'annonce (une par département de parution) et le contrôle des mentions.",
      ].join('\n'),
    }],
  });
  if (msg.stop_reason === 'refusal') throw new Error('Rédaction refusée par le modèle.');
  const out = (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const data = JSON.parse(out);
  for (const a of data.annonces) a.caracteres = a.texte.length;
  return { ...data, type, label: t.label, usage: msg.usage };
}

// ─── Publication (API du fournisseur d'annonces, à brancher) ───
// Variables prévues : ANNONCES_API_URL, ANNONCES_API_KEY.
function publicationConfiguree() {
  return Boolean(process.env.ANNONCES_API_URL && process.env.ANNONCES_API_KEY);
}

async function publierAnnonce(/* { annonce, departement, journal, dossier } */) {
  throw Object.assign(
    new Error("Publication automatique pas encore branchée : l'annonce est à commander auprès du journal par le formaliste, puis l'attestation de parution est à joindre au dossier."),
    { code: 'annonces_api_non_configuree' },
  );
}

module.exports = { TYPES, redigerAnnonce, departement, publicationConfiguree, publierAnnonce };
