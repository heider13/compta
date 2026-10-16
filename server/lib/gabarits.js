// Actes générés SANS IA : gabarits tirés des actes du cabinet validés par les greffes
// (data/gabarits/<type>.md), remplis avec les données du dossier en moins d'une seconde.
//
// Syntaxe des gabarits :
//   {{variable}}  {{dirigeant.nom}}                    valeur (absente → [À COMPLÉTER : …])
//   {{#si variable}}…{{/si}}  {{#sinon variable}}…{{/sinon}}   condition (vrai / faux)
//   {{#chaque associes}}… {{.nom}} …{{/chaque}}         répétition (. = élément courant)
// Les blocs peuvent s'imbriquer ; une variable inconnue reste visible pour être corrigée.

const fs = require('fs');
const path = require('path');

const DIR = process.env.GABARITS_DIR || path.join(__dirname, '..', '..', 'data', 'gabarits');
const DIR_SERVEUR = '/opt/compta-proxy/data/gabarits';

function lireGabarit(type) {
  for (const d of [DIR, DIR_SERVEUR]) {
    try { return fs.readFileSync(path.join(d, `${type}.md`), 'utf8'); } catch {}
  }
  return null;
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const dateFr = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${Number(m[3]) === 1 ? '1er' : Number(m[3])} ${MOIS[Number(m[2]) - 1]} ${m[1]}` : null;
};
const euros = (n) => (Number.isFinite(Number(n)) && n !== null && n !== '' ? `${Number(n).toLocaleString('fr-FR', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })} euros` : null);
const adresse = (a) => (a?.voie ? [a.voie, a.complement, `${a.codePostal || ''} ${a.commune || ''}`.trim()].filter(Boolean).join(', ') : null);
const NATIONALITE = { FRA: 'française', DZA: 'algérienne', MAR: 'marocaine', TUN: 'tunisienne', TUR: 'turque', PRT: 'portugaise', ESP: 'espagnole', ITA: 'italienne', BEL: 'belge', DEU: 'allemande', GBR: 'britannique', CHE: 'suisse', SEN: 'sénégalaise', MLI: 'malienne', CIV: 'ivoirienne', CMR: 'camerounaise', CHN: 'chinoise', ROU: 'roumaine', POL: 'polonaise', USA: 'américaine' };
const FORMES = { SASU: 'société par actions simplifiée unipersonnelle', SAS: 'société par actions simplifiée', HOLDING: 'société par actions simplifiée', EURL: 'société à responsabilité limitée unipersonnelle', SARL: 'société à responsabilité limitée', SCI: 'société civile immobilière' };
const ROLE = { PRESIDENT: 'Président', GERANT: 'Gérant', DG: 'Directeur général' };
const REGIMES = { COMMUNAUTE: 'la communauté réduite aux acquêts', SEPARATION: 'la séparation de biens', PARTICIPATION: 'la participation aux acquêts', COMMUNAUTE_UNIVERSELLE: 'la communauté universelle' };
const nombre = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : null);

// Cession de parts : données du dossier (data.cession), prix total calculé.
function cession(c = {}, actions = false) {
  if (!c || !Object.keys(c).length) return null;
  const nb = Number(c.nbParts) || null;
  const pu = Number(c.prixUnitaire);
  const ced = personne(c.cedant || {});
  const conj = c.cedant?.conjoint ? personne(c.cedant.conjoint) : null;
  const cess = personne(c.cessionnaire || {});
  return {
    cedant: { ...ced, marieMot: ced.feminin ? 'mariée' : 'marié', denomme: ced.feminin ? 'dénommée' : 'dénommé', marie: Boolean(c.cedant?.regimeMatrimonial && c.cedant.regimeMatrimonial !== 'CELIBATAIRE'), regime: REGIMES[c.cedant?.regimeMatrimonial] || null },
    conjoint: conj, avecConjoint: Boolean(conj?.nomComplet),
    cessionnaire: { ...cess, marieMot: cess.feminin ? 'mariée' : 'marié', denomme: cess.feminin ? 'dénommée' : 'dénommé', resident: c.cessionnaire?.resident !== false, regime: REGIMES[c.cessionnaire?.regimeMatrimonial] || null },
    nbParts: nb, nbPartsLettres: null,
    numeroDe: c.numeroDe ?? null,
    numeroA: c.numeroA ?? (c.numeroDe != null && nb ? Number(c.numeroDe) + nb - 1 : null),
    prixUnitaire: Number.isFinite(pu) ? `${nombre(pu)} euros` : null,
    prixTotal: Number.isFinite(pu) && nb ? `${nombre(pu * nb)} euros` : null,
    dateAgrement: dateFr(c.dateAgrement),
    dateAcquisition: dateFr(c.dateAcquisitionCedant),
    dateStatuts: dateFr(c.dateStatuts),
    dernierExercice: dateFr(c.dateDernierExercice),
    tiers: c.cessionnaireAssocie !== true,
    repartition: (c.repartitionAvant || []).map((r) => ({ ...personne(r), nbParts: r.nbParts ?? null, titresDetenus: r.nbParts == null ? null : `${r.nbParts} ${actions ? 'action' : 'part'}${Number(r.nbParts) > 1 ? 's' : ''}${actions ? '' : ` sociale${Number(r.nbParts) > 1 ? 's' : ''}`}` })),
    nbExemplaires: c.nbExemplaires || 3,
    // Accords singulier/pluriel : « 1 part sociale, numérotée 100 » / « 2 parts sociales, numérotées de 99 à 100 »
    designation: designation(nb, c.numeroDe, c.numeroA ?? (c.numeroDe != null && nb ? Number(c.numeroDe) + nb - 1 : null), actions),
    titresCedes: !nb ? null : nb === 1 ? (actions ? "l'action cédée" : 'la part sociale cédée') : `les ${nb} ${actions ? 'actions' : 'parts sociales'} cédées`,
  };
}

function designation(nb, de, a, actions) {
  if (!nb) return null;
  if (nb === 1) return `1 ${actions ? 'action' : 'part sociale'}${de != null ? `, numérotée ${de}` : ''}`;
  return `${nb} ${actions ? 'actions' : 'parts sociales'}${de != null ? `, numérotées de ${de} à ${a}` : ''}`;
}

function personne(p = {}, role = null) {
  const feminin = p.sexe === 'F';
  const prenoms = (p.prenoms || []).filter(Boolean).join(' ');
  return {
    civilite: p.sexe ? (feminin ? 'Madame' : 'Monsieur') : null,
    ne: feminin ? 'née' : 'né',
    prenoms: prenoms || null,
    prenom: (p.prenoms || [])[0] || null,
    nom: p.nom ? String(p.nom).toUpperCase() : null,
    nomComplet: [prenoms, p.nom ? String(p.nom).toUpperCase() : ''].filter(Boolean).join(' ') || null,
    dateNaissance: dateFr(p.dateNaissance),
    lieuNaissance: p.lieuNaissance || null,
    nationalite: NATIONALITE[p.nationalite] || null,
    adresse: adresse(p.adresse),
    profession: p.profession || null,
    nomPere: p.nomPere || null,
    nomMere: p.nomMere || null,
    role: role ? (feminin && role === 'PRESIDENT' ? 'Présidente' : feminin && role === 'GERANT' ? 'Gérante' : ROLE[role] || role) : null,
    feminin,
    situation: { MARIE: feminin ? 'mariée' : 'marié', PACSE: feminin ? 'liée par un pacte civil de solidarité' : 'lié par un pacte civil de solidarité', CELIBATAIRE: feminin ? 'célibataire' : 'célibataire', DIVORCE: feminin ? 'divorcée' : 'divorcé', VEUF: feminin ? 'veuve' : 'veuf' }[p.situationMatrimoniale] || null,
    apport: euros(p.apportEuros),
    nbTitres: p.nbTitres ?? null,
    pourcentage: p.pourcentage ?? null,
  };
}

// Variables disponibles dans les gabarits, calculées depuis metadata.agent_data.
function contexte(data, { dossier = {}, cabinet = {}, date = new Date() } = {}) {
  const forme = String(data.formeJuridique || '').toUpperCase();
  const unipersonnelle = ['SASU', 'EURL'].includes(forme);
  const actions = ['SAS', 'SASU', 'HOLDING'].includes(forme);
  const capital = Number(data.capitalEuros) || 0;
  const nbTitres = Number(data.nbTitres) || null;
  const role = data.dirigeant?.role || (actions ? 'PRESIDENT' : 'GERANT');
  const dir = personne(data.dirigeant, role);
  const associes = (data.associes?.length ? data.associes : unipersonnelle && data.dirigeant ? [{ ...data.dirigeant, apportEuros: capital, nbTitres, pourcentage: 100 }] : [])
    .map((a) => personne(a));
  // Numérotation continue des titres (1 à N) dans l'ordre des associés, accords singulier/pluriel
  let rang = 1;
  for (const a of associes) {
    const n = Number(a.nbTitres) || 0;
    a.numeroDe = n ? rang : null;
    a.numeroA = n ? rang + n - 1 : null;
    rang += n;
    a.titresDetenus = n ? `${n} ${actions ? 'action' : 'part'}${n > 1 ? 's' : ''}${actions ? '' : ` sociale${n > 1 ? 's' : ''}`}` : null;
    a.numerotation = n ? (n === 1 ? `numérotée ${a.numeroDe}` : `numérotées de ${a.numeroDe} à ${a.numeroA}`) : null;
  }
  const [mm, jj] = String(data.dateClotureExercice || '12-31').split('-');
  const ville = data.villeSignature || data.siege?.commune || null;
  return {
    denomination: data.denomination ? String(data.denomination).toUpperCase() : null,
    sigle: data.sigle || null,
    nomCommercial: data.nomCommercial || null,
    forme, formeLongue: FORMES[forme] || null,
    unipersonnelle, plusieursAssocies: !unipersonnelle, actions, parts: !actions,
    titres: actions ? 'actions' : 'parts sociales',
    capital: capital ? euros(capital) : null, capitalVariable: Boolean(data.capitalVariable),
    capitalMinimum: euros(data.capitalMinimum), capitalMaximum: euros(data.capitalMaximum),
    nbTitres, valeurNominale: nbTitres ? euros(capital / nbTitres) : null,
    objet: data.objet || null,
    siege: adresse(data.siege) || data.siegeTexte || null,
    domiciliationChezDirigeant: Boolean(data.domiciliationChezDirigeant),
    societeDomiciliation: Boolean(data.societeDomiciliation),
    domiciliataire: data.domiciliataire?.denomination || null,
    duree: data.dureeAnnees || 99,
    clotureExercice: `${Number(jj) === 1 ? '1er' : Number(jj || 31)} ${MOIS[Number(mm || 12) - 1]}`,
    premiereCloture: dateFr(data.datePremiereCloture),
    dirigeant: dir, roleDirigeant: dir.role,
    associes, nbAssocies: associes.length,
    banqueDepot: data.banqueDepot || null,
    dateDepotFonds: dateFr(data.dateDepotFonds),
    villeSignature: ville,
    dateSignature: dateFr(data.dateSignature) || dateFr(new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(date)),
    cabinet: { denomination: cabinet.denomination || null, adresse: cabinet.adresse || null, representant: cabinet.representant || null },
    reference: dossier.reference || null,
    // Société existante (modification) : SIREN et greffe, siège en texte si fourni par le RNE
    siren: data.siren ? String(data.siren).replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3') : null,
    rcsVille: data.rcsVille || null,
    societeCivile: forme === 'SCI',
    cession: cession(data.cession, actions),
  };
}

const LIBELLES = {
  denomination: 'dénomination', capital: 'capital', nbTitres: 'nombre de titres', valeurNominale: 'valeur nominale',
  objet: 'objet social', siege: 'adresse du siège', premiereCloture: 'date de clôture du premier exercice',
  banqueDepot: 'banque ou notaire dépositaire des fonds', dateDepotFonds: 'date du dépôt des fonds',
  villeSignature: 'lieu de signature', 'dirigeant.dateNaissance': 'date de naissance du dirigeant',
  'dirigeant.lieuNaissance': 'lieu de naissance du dirigeant', 'dirigeant.adresse': 'adresse du dirigeant',
  'dirigeant.nationalite': 'nationalité du dirigeant', 'dirigeant.nomPere': 'nom du père du dirigeant',
  'dirigeant.nomMere': 'nom de jeune fille de la mère du dirigeant', 'cabinet.denomination': 'nom du cabinet mandataire',
  'cabinet.adresse': 'adresse du cabinet mandataire', 'cabinet.representant': 'représentant du cabinet mandataire',
  'cession.dateStatuts': 'date des statuts', 'cession.dernierExercice': 'date de clôture du dernier exercice',
  'cession.dateAcquisition': "date d'acquisition des parts par le cédant", 'cession.dateAgrement': "date de la décision d'agrément",
  'cession.designation': 'nombre et numéros des parts cédées', 'cession.prixUnitaire': 'prix unitaire', 'cession.prixTotal': 'prix total',
  rcsVille: 'ville du greffe (RCS)', siren: 'numéro SIREN',
};

function valeur(ctx, cle, courant) {
  if (cle === '.') return courant;
  const chemin = cle.startsWith('.') ? cle.slice(1).split('.') : cle.split('.');
  let v = cle.startsWith('.') ? courant : ctx;
  for (const k of chemin) v = v == null ? undefined : v[k];
  return v;
}
const vrai = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v));

function rendre(gabarit, ctx, courant = null) {
  // Boucles d'abord : un {{#si .champ}} placé dans une boucle se lit sur l'élément courant
  let s = gabarit.replace(/\{\{#chaque ([^}]+)\}\}([\s\S]*?)\{\{\/chaque\}\}/g, (_, cle, corps) => {
    const v = valeur(ctx, cle.trim(), courant);
    return (Array.isArray(v) ? v : []).map((el, i) => rendre(corps.replace(/\{\{@numero\}\}/g, String(i + 1)), ctx, el)).join('');
  });
  // Blocs (du plus intérieur au plus extérieur)
  const BLOC = /\{\{#(si|sinon|chaque) ([^}]+)\}\}((?:(?!\{\{#(?:si|sinon|chaque) )[\s\S])*?)\{\{\/\1\}\}/;
  let m;
  let garde = 0;
  while ((m = BLOC.exec(s)) && garde++ < 5000) {
    const [tout, type, cle, corps] = m;
    const v = valeur(ctx, cle.trim(), courant);
    let remplace = '';
    if (type === 'si') remplace = vrai(v) ? corps : '';
    else if (type === 'sinon') remplace = vrai(v) ? '' : corps;
    else remplace = (Array.isArray(v) ? v : []).map((el, i) => rendre(corps.replace(/\{\{@numero\}\}/g, String(i + 1)), ctx, el)).join('');
    s = s.slice(0, m.index) + remplace + s.slice(m.index + tout.length);
  }
  return s.replace(/\{\{([^#/}][^}]*)\}\}/g, (_, cle) => {
    const k = cle.trim();
    const v = valeur(ctx, k, courant);
    if (v === null || v === undefined || v === '') return `[À COMPLÉTER : ${LIBELLES[k.replace(/^\./, '')] || k.replace(/^\./, '')}]`;
    return String(v);
  });
}

// Acte rempli : { markdown, trous } ou null si aucun gabarit pour ce type.
function genererActe(type, data, opts = {}) {
  const g = lireGabarit(type);
  if (!g) return null;
  const markdown = rendre(g, contexte(data, opts)).replace(/\n{3,}/g, '\n\n').trim();
  const trous = [...new Set(markdown.match(/\[À COMPLÉTER[^\]]*\]/g) || [])];
  return { markdown, trous };
}

module.exports = { genererActe, contexte, rendre, lireGabarit, DIR_SERVEUR };
