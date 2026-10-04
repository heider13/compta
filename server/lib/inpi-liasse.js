// Construction d'une liasse de création de société au format réel du Guichet
// unique INPI (structure relevée sur des formalités validées par le greffe),
// puis création du BROUILLON et dépôt des pièces.
//
// Autorisé par le cabinet le 2026-10-04 : l'agent peut créer des brouillons sur
// le compte Guichet unique, après confirmation explicite du professionnel dans
// le chat. Rien n'est soumis : validation, signature électronique et paiement
// (moyens propres ou délégation de paiement) restent faits par le formaliste.
//
// On remplit tout ce qui est déductible des données du dossier ; les codes non
// déductibles avec certitude (catégorisation de l'activité, régime de TVA…)
// sont laissés vides et listés dans `aCompleter`.

const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const inpi = require('../inpi');

// ─── Codes relevés sur les liasses validées ───────────────────────
const FORME_CODES = { SASU: '5710', SAS: '5710', HOLDING: '5710', SARL: '5499', EURL: '5499', SCI: '6540' };
const ROLE_CODES = { PRESIDENT: '73', GERANT: '30' };
const FORME_SOCIALE = { PRESIDENT: '1', GERANT: '3' };
const REGIME_IS = '114';

// Catégorisation INPI de l'activité (obligatoire dès la création du brouillon),
// relevée sur les formalités validées du cabinet : code APE → [cat1, cat2, cat3,
// cat4, précision]. À défaut de code exact, on prend le secteur (2 premiers chiffres).
const CATEGORISATION_APE = {
  '1089Z': ['07', '02', '08', '', '99'],
  '4322A': ['05', '04', '19', '', '14'], '4399C': ['05', '04', '15', '', '14'],
  '4511Z': ['06', '01', '', '', '99'], '4520A': ['06', '01', '', '', '99'],
  '4643Z': ['06', '02', '02', '', '09'], '4649Z': ['06', '02', '02', '', '09'], '4651Z': ['06', '02', '02', '', '09'],
  '4669B': ['06', '02', '02', '', '09'], '4669C': ['06', '02', '02', '', '09'], '4690Z': ['06', '02', '02', '', '09'],
  '4711B': ['06', '03', '01', '', '10'], '4724Z': ['06', '03', '01', '', '10'], '4742Z': ['06', '03', '01', '', '10'],
  '4752A': ['06', '02', '02', '', '09'], '4778C': ['06', '03', '09', '', '10'],
  '4791A': ['06', '05', '', '', '99'], '4791B': ['06', '05', '', '', '99'],
  '4941A': ['07', '01', '11', '', '99'], '4941B': ['07', '01', '04', '01', '99'],
  '5610A': ['07', '02', '03', '01', '99'], '5610C': ['07', '02', '03', '01', '99'],
  '6201Z': ['02', '08', '09', '02', '04'],
  '6820B': ['07', '06', '01', '01', '20'],
  '7022Z': ['07', '04', '08', '01', '99'], '7112B': ['07', '04', '08', '01', '99'],
  '8010Z': ['07', '09', '07', '', '99'], '9602A': ['07', '16', '01', '', '99'],
};
const CATEGORISATION_SECTEUR = {
  10: ['07', '02', '08', '', '99'], 43: ['05', '04', '15', '', '14'], 45: ['06', '01', '', '', '99'],
  46: ['06', '02', '02', '', '09'], 47: ['06', '03', '01', '', '10'], 49: ['07', '01', '11', '', '99'],
  56: ['07', '02', '03', '01', '99'], 62: ['02', '08', '09', '02', '04'], 68: ['07', '06', '01', '01', '20'],
  70: ['07', '04', '08', '01', '99'], 71: ['07', '04', '08', '01', '99'], 96: ['07', '16', '01', '', '99'],
};

// Journaux d'annonces légales reconnus par le Guichet unique, relevés sur les
// formalités validées du cabinet (libellé exact attendu par l'INPI). Tout autre
// journal est déclaré en « Autre » avec son nom dans journalPublicationAutre.
const JOURNAUX_RECONNUS = [
  'lamarseillaise.fr', 'nouvellespublications.com', 'Affiches parisiennes (Les)', 'tpbm-presse.com', 'mesinfos.fr',
];

function journalInpi(nom) {
  // Comparaison tolérante : accents, articles, espaces, ponctuation et .fr/.com ignorés
  // (« La Marseillaise » = « lamarseillaise.fr »).
  const norm = (x) => strip(x).replace(/\((les?|la)\)/g, '').replace(/\.(fr|com)$/, '')
    .replace(/[^a-z0-9]/g, '').replace(/^(les|la|le)/, '');
  const hit = JOURNAUX_RECONNUS.find((j) => norm(j) === norm(nom));
  return hit ? { journalPublication: hit } : { journalPublication: 'Autre', journalPublicationAutre: String(nom).trim() };
}

function categorisation(codeApe) {
  const ape = String(codeApe || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (!ape) return null;
  if (CATEGORISATION_APE[ape]) return { codes: CATEGORISATION_APE[ape], exacte: true };
  const secteur = CATEGORISATION_SECTEUR[Number(ape.slice(0, 2))];
  return secteur ? { codes: secteur, exacte: false } : null;
}

// Forme d'exercice : valeurs attendues par le Guichet unique.
const FORME_EXERCICE = {
  COMMERCIALE: 'COMMERCIALE', ARTISANALE: 'ARTISANALE', ARTISANALE_REGLEMENTEE: 'ARTISANALE_REGLEMENTEE',
  LIBERALE: 'INDEPENDANTE', INDEPENDANTE: 'INDEPENDANTE', CIVILE: 'GESTION_DE_BIENS', GESTION_DE_BIENS: 'GESTION_DE_BIENS', AGRICOLE: 'AGRICOLE',
};

// Pays de naissance → code INSEE géographique (99xxx) et libellé.
const PAYS = {
  FRA: { code: null, label: 'FRANCE' },
  DZA: { code: '99352', label: 'ALGERIE' }, MAR: { code: '99350', label: 'MAROC' }, TUN: { code: '99351', label: 'TUNISIE' },
  TUR: { code: '99208', label: 'TURQUIE' }, PRT: { code: '99139', label: 'PORTUGAL' }, ESP: { code: '99134', label: 'ESPAGNE' },
  ITA: { code: '99127', label: 'ITALIE' }, BEL: { code: '99131', label: 'BELGIQUE' }, DEU: { code: '99109', label: 'ALLEMAGNE' },
  GBR: { code: '99132', label: 'ROYAUME-UNI' }, CHE: { code: '99140', label: 'SUISSE' }, SEN: { code: '99341', label: 'SENEGAL' },
  MLI: { code: '99335', label: 'MALI' }, CIV: { code: '99326', label: "COTE D'IVOIRE" }, CMR: { code: '99322', label: 'CAMEROUN' },
  COM: { code: '99397', label: 'COMORES' }, CHN: { code: '99216', label: 'CHINE' }, ROU: { code: '99114', label: 'ROUMANIE' },
  POL: { code: '99122', label: 'POLOGNE' }, USA: { code: '99404', label: 'ETATS-UNIS' }, LBN: { code: '99205', label: 'LIBAN' },
};
const NATIONALITES = { FRA: 'FRANÇAISE', DZA: 'ALGÉRIENNE', MAR: 'MAROCAINE', TUN: 'TUNISIENNE', TUR: 'TURQUE', PRT: 'PORTUGAISE', ESP: 'ESPAGNOLE', ITA: 'ITALIENNE', BEL: 'BELGE' };

const TYPES_VOIE = [
  ['boulevard', 'BD'], ['bd', 'BD'], ['avenue', 'AV'], ['av', 'AV'], ['rue', 'RUE'], ['chemin', 'CHE'], ['impasse', 'IMP'],
  ['place', 'PL'], ['allee', 'ALL'], ['quai', 'QUAI'], ['route', 'RTE'], ['cours', 'CRS'], ['square', 'SQ'],
  ['passage', 'PAS'], ['traverse', 'TRA'], ['montee', 'MTE'], ['lotissement', 'LOT'], ['residence', 'RES'],
  ['esplanade', 'ESP'], ['faubourg', 'FG'], ['hameau', 'HAM'], ['parvis', 'PRV'], ['promenade', 'PROM'],
];

// Emplacement de chaque catégorie de pièce dans la liasse.
const PIECES = {
  STATUTS: { typeDocument: 'PJ_01', sousTypeDocument: 'PJPM0001', path: '.personneMorale.identite.statuts[0]', label: 'Statuts signés' },
  JUSTIFICATIF_SIEGE: { typeDocument: 'PJ_25', sousTypeDocument: 'PJPM0021', path: '.personneMorale.adresseEntreprise.adresse.piecesJointes[0]', label: 'Justificatif du siège (bail, contrat de domiciliation)' },
  ATTESTATION_HEBERGEMENT: { typeDocument: 'PJ_26', sousTypeDocument: 'PJPM0024', path: '.personneMorale.adresseEntreprise.adresse.piecesJointes[0]', label: "Attestation d'hébergement chez le dirigeant" },
  DEPOT_FONDS: { typeDocument: 'PJ_180', sousTypeDocument: 'PJPM0115', path: '.piecesJointes[0]', label: 'Attestation de dépôt des fonds' },
  LISTE_SOUSCRIPTEURS: { typeDocument: 'PJ_138', sousTypeDocument: 'PJPM0116', path: '.piecesJointes[0]', label: 'Liste des souscripteurs' },
  NON_CONDAMNATION: { typeDocument: 'PJ_17', sousTypeDocument: 'PJPM0018', path: '.personneMorale.composition.pouvoirs[0].individu.justificatifIdentite[0]', label: 'Déclaration de non-condamnation et de filiation' },
  IDENTITE_DIRIGEANT: { typeDocument: 'PJ_11', sousTypeDocument: 'PJPM0014', path: '.personneMorale.composition.pouvoirs[0].individu.justificatifIdentite[0]', label: "Pièce d'identité du dirigeant" },
  ATTESTATION_PARUTION: { typeDocument: 'PJ_08', sousTypeDocument: 'PJPM0012', path: '.personneMorale.identite.publicationLegale.piecesJointes[0]', label: "Attestation de parution de l'annonce légale" },
  MANDAT: { typeDocument: 'PJ_51', sousTypeDocument: 'PJPM0034', path: '.piecesJointes[0]', label: 'Mandat / pouvoir au formaliste' },
  IDENTITE_MANDATAIRE: { typeDocument: 'PJ_11', sousTypeDocument: 'PJPM0035', path: '.piecesJointes[0]', label: "Pièce d'identité du mandataire" },
};

function strip(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// "10 bis rue de Rivoli" → { numVoie: '10', indiceRepetition: 'B', typeVoie: 'RUE', voie: 'de Rivoli' }
function parseVoie(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/^(\d+)\s*(bis|ter|quater)?\b[\s,]*(.*)$/i);
  let numVoie = '';
  let indice = '';
  let rest = s;
  if (m) {
    numVoie = m[1];
    indice = m[2] ? ({ bis: 'B', ter: 'T', quater: 'Q' }[m[2].toLowerCase()]) : '';
    rest = m[3];
  }
  const words = rest.split(/\s+/);
  const first = strip(words[0]).replace(/\.$/, '');
  const type = TYPES_VOIE.find(([w]) => w === first);
  return { numVoie, indiceRepetition: indice, typeVoie: type ? type[1] : '', voie: type ? words.slice(1).join(' ') : rest };
}

const communeCache = new Map();
// Code INSEE de la commune à partir du code postal (geo.api.gouv.fr).
async function codeInseeCommune(codePostal, commune) {
  const key = `${codePostal}|${strip(commune)}`;
  if (communeCache.has(key)) return communeCache.get(key);
  let result = null;
  try {
    const r = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(codePostal)}&fields=nom,code`);
    const list = r.ok ? await r.json() : [];
    const target = strip(commune).replace(/\s+\d+\s*(e|er|eme)?\s*arrondissement$/, '');
    result = list.find((c) => strip(c.nom) === strip(commune)) ||
      list.find((c) => strip(c.nom).startsWith(target)) ||
      (list.length === 1 ? list[0] : null);
    // Paris, Lyon, Marseille : le Guichet unique attend le code de l'arrondissement
    // (ex. 13203 pour Marseille 3e), déterminé par le code postal.
    if (result && ['75056', '69123', '13055'].includes(result.code)) {
      const ra = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(codePostal)}&type=arrondissement-municipal&fields=nom,code`);
      const arr = ra.ok ? await ra.json() : [];
      if (arr.length) result = { nom: result.nom, code: arr[0].code };
    }
  } catch { /* indisponible : laissé à compléter */ }
  communeCache.set(key, result);
  return result;
}

// Code INSEE d'une commune de naissance française à partir de son nom.
async function codeInseeNaissance(nom) {
  try {
    const r = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(nom)}&fields=nom,code&boost=population&limit=5`);
    const list = r.ok ? await r.json() : [];
    return list.find((c) => strip(c.nom) === strip(nom)) || null;
  } catch {
    return null;
  }
}

async function adresseInpi(a, aCompleter, label) {
  if (!a?.voie || !a?.codePostal || !a?.commune) {
    aCompleter.push(`${label} : adresse incomplète`);
    return null;
  }
  const v = parseVoie(a.voie);
  const commune = await codeInseeCommune(a.codePostal, a.commune);
  if (!commune) aCompleter.push(`${label} : code INSEE de la commune (${a.codePostal} ${a.commune}) à vérifier`);
  if (!v.typeVoie) aCompleter.push(`${label} : type de voie à sélectionner`);
  return {
    pays: 'FRANCE',
    codePays: 'FRA',
    codePostal: a.codePostal,
    commune: commune?.nom || a.commune,
    codeInseeCommune: commune?.code || '',
    typeVoie: v.typeVoie,
    voie: v.voie,
    numVoie: v.numVoie,
    ...(v.indiceRepetition ? { indiceRepetition: v.indiceRepetition } : {}),
    ...(a.complement ? { complementLocalisation: a.complement } : {}),
  };
}

async function personneInpi(p, aCompleter, label) {
  const paysCode = p.paysNaissance || (p.nationalite === 'FRA' ? 'FRA' : '');
  const pays = PAYS[paysCode] || null;
  let naissance = {
    paysNaissance: pays?.label || '',
    lieuDeNaissance: String(p.lieuNaissance || '').toUpperCase(),
    codeInseeGeographique: pays?.code || '',
  };
  if ((!pays || pays.code === null) && p.lieuNaissance) {
    const c = await codeInseeNaissance(p.lieuNaissance);
    if (c) naissance = { paysNaissance: 'FRANCE', lieuDeNaissance: c.nom.toUpperCase(), codeInseeGeographique: c.code };
    else aCompleter.push(`${label} : lieu et pays de naissance à vérifier (${p.lieuNaissance})`);
  }
  if (!p.sexe) aCompleter.push(`${label} : genre`);
  return {
    nom: String(p.nom || '').toUpperCase(),
    prenoms: Array.isArray(p.prenoms) ? p.prenoms.filter(Boolean) : [],
    genre: p.sexe === 'F' ? '2' : p.sexe === 'M' ? '1' : '',
    dateDeNaissance: p.dateNaissance || '',
    ...naissance,
    nationalite: NATIONALITES[p.nationalite] || '',
    codeNationalite: p.nationalite || '',
    optionRgpd: 'N',
  };
}

// Déclarant / correspondance : repris de la dernière formalité de société du
// compte mandataire (mêmes coordonnées pour toutes les formalités du cabinet).
async function mandataireBlocks(client) {
  const list = await client.listFormalities({ page: 1, itemsPerPage: 15, 'order[statusDate]': 'desc' });
  const clean = (o) => JSON.parse(JSON.stringify(o ?? null, (k, v) => (k.startsWith('@') ? undefined : v)));
  for (const f of list?.['hydra:member'] || []) {
    if (f.typePersonne !== 'M') continue;
    const d = await client.getFormality(f.id);
    const ident = d?.content?.personneMorale?.identite;
    if (d?.content?.declarant && ident) {
      return {
        declarant: clean(d.content.declarant),
        adresseCorrespondance: clean(ident.adresseCorrespondance),
        destinataireCorrespondance: clean(ident.destinataireCorrespondance),
        contactCorrespondance: clean(ident.contactCorrespondance),
      };
    }
  }
  return {};
}

function pourcentage(a, capital, nbAssocies) {
  if (Number(a.pourcentage) > 0) return Number(a.pourcentage);
  if (capital && Number(a.apportEuros) >= 0) return Math.round((Number(a.apportEuros) || 0) / capital * 100);
  return nbAssocies === 1 ? 100 : 0;
}

// data : metadata.agent_data du dossier (voir l'outil enregistrer_dossier)
async function buildCreationLiasse(data, dossier, client) {
  const aCompleter = [];
  const forme = String(data.formeJuridique || '').toUpperCase();
  const code = FORME_CODES[forme];
  if (!code) throw new Error(`Forme non prise en charge pour la liasse INPI : ${forme || 'inconnue'} (SASU, SAS, EURL, SARL, SCI).`);
  const unipersonnelle = ['SASU', 'EURL'].includes(forme);
  const role = data.dirigeant?.role || (['SAS', 'SASU', 'HOLDING'].includes(forme) ? 'PRESIDENT' : 'GERANT');
  const dateDebut = data.dateDebutActivite || new Date().toISOString().slice(0, 10);
  const capital = Number(data.capitalEuros) || 0;
  const [mm, dd] = String(data.dateClotureExercice || '12-31').split('-');

  const siege = await adresseInpi(data.siege, aCompleter, 'Siège');
  const dir = data.dirigeant || {};
  const dirDesc = await personneInpi(dir, aCompleter, 'Dirigeant');
  const dirAdresse = await adresseInpi(dir.adresse, aCompleter, 'Domicile du dirigeant');

  // Bénéficiaires effectifs : associés personnes physiques détenant 25 % ou plus.
  const associes = data.associes?.length ? data.associes
    : (unipersonnelle && dir.nom ? [{ ...dir, pourcentage: 100, apportEuros: capital }] : []);
  const beneficiaires = [];
  for (const [i, a] of associes.entries()) {
    const pct = pourcentage(a, capital, associes.length);
    if (pct < 25) continue;
    const estDirigeant = strip(a.nom) === strip(dir.nom) && strip((a.prenoms || [])[0]) === strip((dir.prenoms || [])[0]);
    const desc = estDirigeant ? dirDesc : await personneInpi(a, aCompleter, `Associé ${i + 1}`);
    const adr = estDirigeant ? dirAdresse : await adresseInpi(a.adresse, aCompleter, `Domicile de l'associé ${i + 1}`);
    beneficiaires.push({
      ...(estDirigeant ? { indexPouvoir: 0 } : {}),
      beneficiaire: { descriptionPersonne: { dateEffetRoleDeclarant: dateDebut, ...desc }, ...(adr ? { adresseDomicile: adr } : {}) },
      modalite: {
        detentionPartDirecte: true, partsDirectesPleinePropriete: pct, partsDirectesNuePropriete: 0,
        partsIndirectesIndivision: 0, partsIndirectesIndivisionPleinePropriete: 0, partsIndirectesIndivisionNuePropriete: 0,
        partsIndirectesPersonnesMorales: 0, partsIndirectesPmoralesPleinePropriete: 0, partsIndirectesPmoralesNuePropriete: 0,
        detentionPartTotale: pct, detentionVoteDirecte: true, voteDirectePleinePropriete: pct, voteDirecteNuePropriete: 0,
        voteDirecteUsufruit: 0, voteIndirecteIndivision: 0, voteIndirecteIndivisionPleinePropriete: 0,
        voteIndirecteIndivisionNuePropriete: 0, voteIndirecteIndivisionUsufruit: 0, voteIndirectePersonnesMorales: 0,
        voteIndirectePmoralesPleinePropriete: 0, voteIndirectePmoralesNuePropriete: 0, voteIndirectePmoralesUsufruit: 0,
        detentionVoteTotal: pct, modalitesDeControle: ['1'], detention25pCapital: true, detention25pDroitVote: true,
      },
      statutPourLaFormalite: '1',
    });
  }
  if (!beneficiaires.length) aCompleter.push('Bénéficiaires effectifs : aucun associé à 25 % ou plus identifié, à déclarer');

  const formeExercice = FORME_EXERCICE[data.formeExercice] || (forme === 'SCI' ? 'GESTION_DE_BIENS' : 'COMMERCIALE');
  // Bloquants : refusés par l'API dès la création du brouillon.
  const bloquants = [];
  const cat = categorisation(data.codeApe);
  const annonce = data.annonceLegale || {};
  if (!annonce.journal || !annonce.datePublication) {
    bloquants.push("Annonce légale parue : nom du journal et date de parution (le Guichet unique les exige dès la création d'une société)");
  }
  const domiciliataire = data.domiciliataire || {};
  if (data.societeDomiciliation && (!domiciliataire.denomination || !domiciliataire.siren)) {
    bloquants.push('Société de domiciliation : dénomination et SIREN (siège domicilié)');
  }
  if (!data.datePremiereCloture) bloquants.push('Date de clôture du premier exercice (exigée par le Guichet unique, à reprendre à l\'identique dans les statuts)');
  if (!data.codeApe) bloquants.push("Code APE de l'activité (nécessaire pour la catégorie d'activité exigée par le Guichet unique)");
  else if (!cat) bloquants.push(`Catégorie d'activité INPI inconnue pour le code APE ${data.codeApe} : préciser l'activité ou un code APE voisin`);
  else if (!cat.exacte) aCompleter.push(`Catégorie d'activité déduite du secteur (APE ${data.codeApe}) : à vérifier sur le Guichet unique`);
  aCompleter.push(`Régime de TVA (souhaité : ${data.regimeTVA || 'à confirmer'})`);
  if (forme === 'SCI' || data.regimeImposition === 'IR') aCompleter.push("Régime d'imposition des bénéfices");


  const mandataire = await mandataireBlocks(client);

  const content = {
    succursaleOuFiliale: 'AVEC_ETABLISSEMENT',
    formeExerciceActivitePrincipale: formeExercice,
    natureCreation: {
      formeJuridique: code,
      formeJuridiqueInsee: code,
      societeEtrangere: false,
      etablieEnFrance: true,
      salarieEnFrance: false,
      relieeEntrepriseAgricole: false,
      entrepriseAgricole: false,
      indicateurEtablissementFictif: false,
    },
    personneMorale: {
      identite: {
        entreprise: {
          denomination: String(data.denomination || '').toUpperCase(),
          formeJuridique: code,
          ...(data.codeApe ? { codeApe: data.codeApe } : {}),
        },
        description: {
          objet: data.objet || '',
          ...(data.sigle ? { sigle: data.sigle } : {}),
          duree: Number(data.dureeAnnees) || 99,
          dateClotureExerciceSocial: `${dd || '31'}${mm || '12'}`,
          ...(data.datePremiereCloture ? { datePremiereCloture: data.datePremiereCloture } : {}),
          ...(() => {
            const fin = new Date(dateDebut);
            fin.setFullYear(fin.getFullYear() + (Number(data.dureeAnnees) || 99));
            return Number.isNaN(fin.getTime()) ? {} : { dateFinExistence: fin.toISOString().slice(0, 10) };
          })(),
          ess: false,
          societeMission: false,
          indicateurOrigineFusionScission: false,
          depotDemandeAcre: false,
          continuationAvecActifNetInferieurMoitieCapital: false,
          reconstitutionCapitauxPropres: false,
          isDureeIllimitee: false,
          montantCapital: capital,
          montantCapitalCentime: Math.round(capital * 100),
          deviseCapital: 'EUR',
          capitalVariable: Boolean(data.capitalVariable),
          indicateurAssocieUnique: unipersonnelle,
          ...(unipersonnelle ? { indicateurAssocieUniqueDirigeant: true } : {}),
          ...(role === 'GERANT' ? { natureGerance: '1' } : {}),
        },
        contratDAppuiDeclare: false,
        ...(annonce.journal && annonce.datePublication ? {
          publicationLegale: {
            typePublication: 'Publication légale',
            datePublication: annonce.datePublication,
            ...journalInpi(annonce.journal),
          },
        } : {}),
        ...(mandataire.adresseCorrespondance ? { adresseCorrespondance: mandataire.adresseCorrespondance } : {}),
        ...(mandataire.destinataireCorrespondance ? { destinataireCorrespondance: mandataire.destinataireCorrespondance } : {}),
        ...(mandataire.contactCorrespondance ? { contactCorrespondance: mandataire.contactCorrespondance } : {}),
      },
      adresseEntreprise: {
        caracteristiques: {
          diffusionDomiciliationAsEntrepriseAddress: 'N',
          domiciliataire: Boolean(data.societeDomiciliation),
          indicateurDomicileEntrepreneur: Boolean(data.domiciliationChezDirigeant),
          ...(data.domiciliationChezDirigeant ? { indicateurDomicileEntrepreneurValidation: true } : {}),
          indicateurAdresseEtablissement: !data.domiciliationChezDirigeant,
        },
        ...(siege ? { adresse: siege } : {}),
        ...(data.societeDomiciliation && domiciliataire.siren ? {
          entrepriseDomiciliataire: {
            siren: String(domiciliataire.siren).replace(/\D/g, ''),
            denomination: String(domiciliataire.denomination || '').toUpperCase(),
          },
        } : {}),
      },
      composition: {
        pouvoirs: [{
          individu: {
            descriptionPersonne: { ...dirDesc, formeSociale: FORME_SOCIALE[role] || '1' },
            ...(dirAdresse ? { adresseDomicile: dirAdresse } : {}),
          },
          roleEntreprise: ROLE_CODES[role] || '73',
          statutPourLaFormalite: '1',
          dateEffet: dateDebut,
          typeDePersonne: 'INDIVIDU',
          isRepresentantLegal: false,
          indicateurSecondRoleEntreprise: false,
          beneficiaireEffectif: beneficiaires.some((b) => b.indexPouvoir === 0),
        }],
        modeSelectionPouvoirs: 0,
      },
      etablissementPrincipal: {
        descriptionEtablissement: {
          rolePourEntreprise: '2',
          ...(data.codeApe ? { codeApe: data.codeApe } : {}),
          indicateurEtablissementPrincipal: true,
          statutPourFormalite: '1',
        },
        ...(siege ? { adresse: siege } : {}),
        activites: [{
          statutFormalite: 'A',
          indicateurPrincipal: true,
          dateDebut,
          exerciceActivite: 'P',
          formeExercice,
          descriptionDetaillee: data.activitePrincipale || data.objet || '',
          ...(cat ? {
            categorisationActivite1: cat.codes[0],
            categorisationActivite2: cat.codes[1],
            ...(cat.codes[2] ? { categorisationActivite3: cat.codes[2] } : {}),
            ...(cat.codes[3] ? { categorisationActivite4: cat.codes[3] } : {}),
            ...(cat.codes[4] ? { precisionActivite: cat.codes[4] } : {}),
          } : {}),
          rolePrincipalPourEntreprise: true,
          indicateurProlongement: false,
          indicateurNonSedentaire: false,
          indicateurArtisteAuteur: false,
          indicateurMarinProfessionnel: false,
          ...(data.codeApe ? { codeApe: data.codeApe } : {}),
          origine: { typeOrigine: '1' },
        }],
        dateEffetOuvertureEtablissement: dateDebut,
        effectifSalarie: { presenceSalarie: false, emploiPremierSalarie: false, employeurSalarieNonRegimeFr: false },
      },
      optionsFiscales: forme === 'SCI' || data.regimeImposition === 'IR' ? {} : { regimeImpositionBenefices: REGIME_IS },
      beneficiairesEffectifs: beneficiaires,
      structureEntreprise: { indicateurPrincipalIdemSiege: true, aucuneActivite: false },
      optionsFiscalesReferences: {
        ...(cat ? { categorisationActiviteInitial: `${cat.codes[0]}${cat.codes[1]}${cat.codes[2] || '00'}${cat.codes[3] || '00'}` } : {}),
        etablieEnFranceInitial: true,
        societeEtrangereInitial: false,
        entrepriseAgricoleInitial: false,
        indicateurAssocieUniqueInitial: unipersonnelle,
        ...(unipersonnelle ? { indicateurAssocieUniqueDirigeantInitial: true } : {}),
        succursaleOuFilialeInitial: 'AVEC_ETABLISSEMENT',
      },
    },
    ...(mandataire.declarant ? { declarant: mandataire.declarant } : {}),
  };

  const nom = String(data.denomination || dossier.client_name || '').toUpperCase();
  return {
    payload: {
      companyName: nom,
      nomDossier: nom,
      referenceMandataire: dossier.reference,
      typeFormalite: 'C',
      typePersonne: 'M',
      diffusionINSEE: 'O',
      diffusionCommerciale: 'O',
      content,
    },
    aCompleter,
    bloquants,
  };
}

// ─── Conversion en PDF (Word → LibreOffice, image → img2pdf) ──────
function run(bin, args, cwd) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { cwd, timeout: 120_000 }, (err, stdout, stderr) =>
      (err ? reject(new Error(`${bin} : ${String(stderr || err.message).slice(0, 200)}`)) : resolve(stdout)));
  });
}

async function toPdf(buffer, mime, name) {
  if (mime === 'application/pdf') return buffer;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'liasse-'));
  try {
    if (/^image\//.test(mime)) {
      const src = path.join(dir, `img.${mime.split('/')[1].replace('jpeg', 'jpg')}`);
      await fs.writeFile(src, buffer);
      await run('img2pdf', [src, '-o', path.join(dir, 'out.pdf')], dir);
      return await fs.readFile(path.join(dir, 'out.pdf'));
    }
    const src = path.join(dir, 'doc.docx');
    await fs.writeFile(src, buffer);
    await run('soffice', ['--headless', '--norestore', `-env:UserInstallation=file://${dir}/profile`, '--convert-to', 'pdf', '--outdir', dir, src], dir);
    return await fs.readFile(path.join(dir, 'doc.pdf'));
  } catch (e) {
    throw new Error(`Conversion PDF impossible pour ${name} : ${e.message}`);
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// Création du BROUILLON au Guichet unique puis dépôt des pièces.
// pieces : [{ categorie, nom, buffer, mime }]
async function createDraftWithPieces(orgId, payload, pieces) {
  const client = inpi.forOrg(orgId);
  let formality;
  try {
    formality = await client.createFormality(payload);
  } catch (e) {
    const v = e.payload?.violations;
    if (Array.isArray(v) && v.length) {
      const err = new Error(`Le Guichet unique refuse la liasse (${v.length} point(s)) : ${v.map((x) => `${x.propertyPath} → ${x.message}`).join(' | ')}`);
      err.status = e.status;
      throw err;
    }
    throw e;
  }
  const deposees = [];
  const erreurs = [];
  for (const p of pieces) {
    const spec = PIECES[p.categorie];
    if (!spec) {
      erreurs.push(`${p.nom} : catégorie inconnue`);
      continue;
    }
    try {
      const pdf = await toPdf(p.buffer, p.mime, p.nom);
      const nomDocument = `${p.nom.replace(/\.(pdf|docx|png|jpe?g|webp|gif)$/i, '')}.pdf`;
      await client.request(`/api/formalities/${formality.id}/attachments`, {
        method: 'POST',
        body: {
          nomDocument,
          typeDocument: spec.typeDocument,
          sousTypeDocument: spec.sousTypeDocument,
          langueDocument: 'fr',
          documentBase64: pdf.toString('base64'),
          documentExtension: 'pdf',
          path: spec.path,
        },
      });
      deposees.push({ nom: nomDocument, categorie: spec.label });
    } catch (e) {
      erreurs.push(`${p.nom} : ${String(e.message).slice(0, 200)}`);
    }
  }
  return { formality, deposees, erreurs };
}

module.exports = { buildCreationLiasse, createDraftWithPieces, toPdf, parseVoie, PIECES, FORME_CODES };
