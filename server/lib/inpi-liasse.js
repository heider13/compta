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

  const formeExercice = data.formeExercice || (forme === 'SCI' ? 'CIVILE' : 'COMMERCIALE');
  if (!data.codeApe) aCompleter.push("Code APE de l'activité");
  aCompleter.push("Catégorisation de l'activité (listes du Guichet unique)");
  aCompleter.push(`Régime de TVA (souhaité : ${data.regimeTVA || 'à confirmer'})`);
  if (forme === 'SCI' || data.regimeImposition === 'IR') aCompleter.push("Régime d'imposition des bénéfices");
  aCompleter.push("Publication de l'annonce légale (journal et date) une fois parue");

  const mandataire = await mandataireBlocks(client);

  const content = {
    succursaleOuFiliale: 'AVEC_ETABLISSEMENT',
    formeExerciceActivitePrincipale: formeExercice,
    natureCreation: { formeJuridique: code, etablieEnFrance: true, formeJuridiqueInsee: code },
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
          montantCapital: capital,
          montantCapitalCentime: Math.round(capital * 100),
          deviseCapital: 'EUR',
          capitalVariable: Boolean(data.capitalVariable),
          indicateurAssocieUnique: unipersonnelle,
          ...(unipersonnelle ? { indicateurAssocieUniqueDirigeant: true } : {}),
          ...(role === 'GERANT' ? { natureGerance: '1' } : {}),
        },
        ...(mandataire.adresseCorrespondance ? { adresseCorrespondance: mandataire.adresseCorrespondance } : {}),
        ...(mandataire.destinataireCorrespondance ? { destinataireCorrespondance: mandataire.destinataireCorrespondance } : {}),
        ...(mandataire.contactCorrespondance ? { contactCorrespondance: mandataire.contactCorrespondance } : {}),
      },
      adresseEntreprise: {
        caracteristiques: {
          diffusionDomiciliationAsEntrepriseAddress: 'N',
          domiciliataire: Boolean(data.societeDomiciliation),
          indicateurDomicileEntrepreneur: Boolean(data.domiciliationChezDirigeant),
          indicateurAdresseEtablissement: !data.domiciliationChezDirigeant,
        },
        ...(siege ? { adresse: siege } : {}),
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
          rolePrincipalPourEntreprise: true,
          ...(data.codeApe ? { codeApe: data.codeApe } : {}),
          origine: { typeOrigine: '1' },
        }],
        dateEffetOuvertureEtablissement: dateDebut,
      },
      optionsFiscales: forme === 'SCI' || data.regimeImposition === 'IR' ? {} : { regimeImpositionBenefices: REGIME_IS },
      beneficiairesEffectifs: beneficiaires,
      structureEntreprise: { indicateurPrincipalIdemSiege: true },
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
  const formality = await client.createFormality(payload);
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
