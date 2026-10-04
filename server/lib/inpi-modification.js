// Formalités de MODIFICATION (et radiation) au Guichet unique, via le point
// d'accès officiel POST /api/formality_updates :
//   { previousFormality: fiche RNE actuelle, newFormality: fiche modifiée }
// L'INPI déduit lui-même les événements (12M, 35M, 38F…) de la différence.
//
// Autorisé par le cabinet : création de BROUILLONS uniquement, après aperçu et
// confirmation ; validation, signature et paiement restent faits par le formaliste.

const inpi = require('../inpi');
const rne = require('./inpi-rne');
const { mandataireBlocks } = require('./inpi-liasse');

const clean = (o) => JSON.parse(JSON.stringify(o ?? null, (k, v) => (k.startsWith('@') ? undefined : v)));
const on = (v) => (v === false || v === 'N' ? 'N' : 'O');


const cle = (desc) => `${String(desc?.nom || '').toUpperCase()}|${String((desc?.prenoms || [])[0] || '').toUpperCase()}`;

// Remplit les champs vides (null/'') de cible avec ceux de source, récursivement.
function remplirVides(cible, source) {
  if (!cible || !source || typeof cible !== 'object' || typeof source !== 'object') return;
  for (const [k, v] of Object.entries(source)) {
    if (k.startsWith('@') || /Triggered$|^dateEffet|statutPourLaFormalite|representantId|beneficiaireId/.test(k)) continue;
    if (cible[k] == null || cible[k] === '') cible[k] = v;
    else if (typeof cible[k] === 'object' && !Array.isArray(cible[k]) && typeof v === 'object') remplirVides(cible[k], v);
  }
}


// Le RNE public tronque la date de naissance (AAAA-MM) : date complète reprise de
// la liasse du cabinet ; forme sociale déduite du rôle si la valeur RNE est invalide.
function corrigerPersonne(desc, src, role) {
  if (!desc) return;
  if (desc.dateDeNaissance && !/^\d{4}-\d{2}-\d{2}$/.test(desc.dateDeNaissance) && /^\d{4}-\d{2}-\d{2}$/.test(src?.dateDeNaissance || '')) {
    desc.dateDeNaissance = src.dateDeNaissance;
  }
  if (role && !['0', '1', '3'].includes(String(desc.formeSociale ?? ''))) {
    desc.formeSociale = ['0', '1', '3'].includes(String(src?.formeSociale ?? '')) ? String(src.formeSociale) : (String(role) === '30' ? '3' : '1');
  }
}

function completerPersonnes(bloc, blocGu) {
  if (!bloc || !blocGu) return;
  const index = new Map();
  for (const p of blocGu.composition?.pouvoirs || []) index.set(cle(p.individu?.descriptionPersonne), p.individu);
  for (const b of blocGu.beneficiairesEffectifs || []) index.set(cle(b.beneficiaire?.descriptionPersonne), b.beneficiaire);
  for (const p of bloc.composition?.pouvoirs || []) {
    const src = index.get(cle(p.individu?.descriptionPersonne));
    if (src) remplirVides(p.individu, src);
    corrigerPersonne(p.individu?.descriptionPersonne, src?.descriptionPersonne, p.roleEntreprise);
  }
  for (const b of bloc.beneficiairesEffectifs || []) {
    const src = index.get(cle(b.beneficiaire?.descriptionPersonne));
    if (src) remplirVides(b.beneficiaire, src);
    corrigerPersonne(b.beneficiaire?.descriptionPersonne, src?.descriptionPersonne, null);
  }
}

// Champs dont le Guichet unique attend un indicateur « …Present » (donnée présente au RNE ?)
const CHAMPS_ADRESSE = ['typeVoie', 'voie', 'numVoie', 'indiceRepetition', 'complementLocalisation', 'distributionSpeciale', 'voieCodifiee'];
const CHAMPS_PERSONNE = ['dateDeNaissance', 'paysNaissance', 'lieuDeNaissance', 'codePostalNaissance', 'codeInseeGeographique'];

// Indicateurs …Present : false quand la donnée correspondante est absente (créés s'ils manquent).
function marquerAbsents(o) {
  if (Array.isArray(o)) return o.forEach(marquerAbsents);
  if (!o || typeof o !== 'object') return;
  const vide = (v) => v == null || v === '';
  // « …Present = true » : valeur confidentielle détenue par le RNE, que le Guichet unique
  // reprend lui-même (et ignore la nôtre) ; « false » : il prend la valeur envoyée.
  // La fiche RNE peut arriver avec « true » sans que le Guichet unique ait la valeur :
  // on fixe donc l'indicateur selon la présence RÉELLE de la valeur (écrasé).
  if ('codePostal' in o || 'codePays' in o) {
    for (const c of CHAMPS_ADRESSE) o[`${c}Present`] = !vide(o[c]);
  }
  if ('nom' in o && ('dateDeNaissance' in o || 'prenoms' in o)) {
    for (const c of CHAMPS_PERSONNE) o[`${c}Present`] = !vide(o[c]);
  }
  for (const k of Object.keys(o)) {
    if (k.endsWith('Present') && (o[k] == null)) {
      const champ = k.slice(0, -'Present'.length);
      o[k] = o[champ] != null && o[champ] !== '';
    } else if (typeof o[k] === 'object') marquerAbsents(o[k]);
  }
}

// Base de la nouvelle liasse : fiche RNE + champs que le RNE laisse vides mais
// que le Guichet unique exige (repris de la dernière liasse de l'entreprise au GU).
async function baseModification(orgId, siren) {
  const client = inpi.forOrg(orgId);
  const company = await rne.getCompany(orgId, siren);
  const previous = clean(company.formality.content);
  const next = clean(company.formality.content);
  const typePersonne = company.formality.typePersonne || (next.personneMorale ? 'M' : 'P');
  const bloc = typePersonne === 'M' ? 'personneMorale' : 'personnePhysique';

  // Dernière liasse de l'entreprise déposée par le cabinet (format natif GU)
  let gu = null;
  try {
    const r = await client.listFormalities({ siren, itemsPerPage: 10, 'order[created]': 'desc' });
    const last = (r?.['hydra:member'] || []).find((f) => f.status === 'VALIDATED') || (r?.['hydra:member'] || [])[0];
    if (last) gu = clean((await client.getFormality(last.id)).content);
  } catch { /* entreprise jamais traitée par le cabinet */ }

  const ident = next[bloc]?.identite || {};
  if (bloc === 'personneMorale' && !ident.entreprise?.numGreffe && gu?.personneMorale?.identite?.entreprise?.numGreffe) {
    ident.entreprise.numGreffe = gu.personneMorale.identite.entreprise.numGreffe;
  }
  next.natureCreation = {
    ...(next.natureCreation || {}),
    societeEtrangere: next.natureCreation?.societeEtrangere ?? false,
    etablieEnFrance: next.natureCreation?.etablieEnFrance ?? true,
    salarieEnFrance: next.natureCreation?.salarieEnFrance ?? false,
    relieeEntrepriseAgricole: next.natureCreation?.relieeEntrepriseAgricole ?? false,
    entrepriseAgricole: next.natureCreation?.entrepriseAgricole ?? false,
    eirl: next.natureCreation?.eirl ?? false,
    indicateurEtablissementFictif: next.natureCreation?.indicateurEtablissementFictif ?? false,
    seulsBeneficiairesModifies: next.natureCreation?.seulsBeneficiairesModifies ?? false,
  };
  const car = ((next[bloc].adresseEntreprise ||= {}).caracteristiques ||= {});
  const carGu = gu?.[bloc]?.adresseEntreprise?.caracteristiques || {};
  for (const k of ['indicateurDomicileEntrepreneur', 'domiciliataire', 'ambulant', 'indicateurAdresseEtablissement']) {
    if (car[k] == null) car[k] = carGu[k] ?? false;
  }
  if (car.diffusionDomiciliationAsEntrepriseAddress == null) car.diffusionDomiciliationAsEntrepriseAddress = carGu.diffusionDomiciliationAsEntrepriseAddress || 'N';
  if (car.indicateurDomicileEntrepreneur) car.indicateurDomicileEntrepreneurValidation = true;

  // Dirigeants et bénéficiaires existants : le RNE public ne donne que des données
  // partielles (date de naissance tronquée, adresse incomplète…). On complète à
  // partir de la dernière liasse de l'entreprise au GU (même personne), puis on
  // marque « non présent au RNE » (…Present = false) ce qui reste absent.
  // « …Present » = la donnée figure-t-elle au RNE ? À fixer AVANT de compléter.
  marquerAbsents(next[bloc]);
  marquerAbsents(previous[bloc]);
  // Les deux états (précédent et nouveau) sont complétés : l'INPI contrôle les deux.
  for (const etat of [next, previous]) {
    completerPersonnes(etat[bloc], gu?.[bloc]);
    // Entrepreneur individuel : identité complétée depuis la liasse du cabinet
    const ent = etat.personnePhysique?.identite?.entrepreneur;
    const entGu = gu?.personnePhysique?.identite?.entrepreneur;
    if (ent && entGu) {
      remplirVides(ent, entGu);
      corrigerPersonne(ent.descriptionPersonne, entGu.descriptionPersonne, null);
    }
  }
  // Hors création, chaque dirigeant / bénéficiaire porte un statut : 4 = inchangé.
  for (const p of next[bloc]?.composition?.pouvoirs || []) if (!p.statutPourLaFormalite) p.statutPourLaFormalite = '4';
  for (const b of next[bloc]?.beneficiairesEffectifs || []) if (!b.statutPourLaFormalite) b.statutPourLaFormalite = '4';

  const m = await mandataireBlocks(client);
  next.declarant = m.declarant;
  Object.assign(ident, {
    ...(m.adresseCorrespondance ? { adresseCorrespondance: m.adresseCorrespondance } : {}),
    ...(m.destinataireCorrespondance ? { destinataireCorrespondance: m.destinataireCorrespondance } : {}),
    ...(m.contactCorrespondance ? { contactCorrespondance: m.contactCorrespondance } : {}),
  });
  delete next.piecesJointes;
  if (next.personneMorale?.identite?.description && next.personneMorale.identite.description.depotDemandeAcre == null) {
    next.personneMorale.identite.description.depotDemandeAcre = false;
  }

  const denomination = ident.entreprise?.denomination
    || [ident.entrepreneur?.descriptionPersonne?.prenoms?.[0], ident.entrepreneur?.descriptionPersonne?.nom].filter(Boolean).join(' ');
  return { company, previous, next, typePersonne, bloc, denomination, client };
}

// Données encore manquantes après complément (personnes existantes, objet…) :
// le Guichet unique les exige, seul le formaliste peut les fournir.
function donneesManquantes(next) {
  const bloc = next.personneMorale || next.personnePhysique;
  const manquants = [];
  const verifier = (desc, adr, qui) => {
    if (!desc) return;
    const nom = [desc.prenoms?.[0], desc.nom].filter(Boolean).join(' ') || qui;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desc.dateDeNaissance || '')) manquants.push(`${nom} : date de naissance complète`);
    if (!desc.lieuDeNaissance) manquants.push(`${nom} : lieu de naissance`);
    if (!desc.codeInseeGeographique) manquants.push(`${nom} : commune ou pays de naissance (code INSEE)`);
    if (adr && !adr.voie) manquants.push(`${nom} : adresse personnelle (rue)`);
  };
  for (const p of bloc?.composition?.pouvoirs || []) {
    if (p.statutPourLaFormalite === '1' || p.typeDePersonne !== 'INDIVIDU') continue;
    verifier(p.individu?.descriptionPersonne, p.individu?.adresseDomicile, 'dirigeant');
  }
  if (next.personnePhysique) verifier(next.personnePhysique.identite?.entrepreneur?.descriptionPersonne, next.personnePhysique.identite?.entrepreneur?.adresseDomicile, 'entrepreneur');
  if (next.personneMorale && !next.personneMorale.identite?.description?.objet) manquants.push('Objet social (absent du RNE)');
  return manquants;
}

// Crée le brouillon de modification. mutate(next, ctx) applique les changements.
async function createModificationDraft(orgId, siren, { mutate, typeFormalite = 'M', reference, nomDossier, observation } = {}) {
  const base = await baseModification(orgId, siren);
  const { client, company, previous, next, typePersonne, denomination } = base;
  if (mutate) await mutate(next, base);
  const manquants = donneesManquantes(next);
  if (manquants.length) {
    throw Object.assign(new Error(`Données absentes du RNE à fournir par le formaliste : ${manquants.join(' ; ')}`), { code: 'donnees_manquantes', manquants });
  }
  const startedAt = new Date(Date.now() - 5000);
  const body = {
    previousFormality: { companyName: denomination, typePersonne, content: previous },
    newFormality: {
      companyName: next.personneMorale?.identite?.entreprise?.denomination || denomination,
      referenceMandataire: reference || undefined,
      nomDossier: nomDossier || `MODIF ${denomination}`,
      typeFormalite,
      ...(observation ? { observationSignature: observation } : {}),
      diffusionINSEE: on(company.formality.diffusionINSEE),
      diffusionCommerciale: on(company.formality.diffusionCommerciale),
      typePersonne,
      content: next,
    },
  };
  let created = null;
  try {
    created = await client.request('/api/formality_updates', { method: 'POST', body });
  } catch (e) {
    const v = e.payload?.violations;
    if (Array.isArray(v) && v.length) {
      throw Object.assign(new Error(`Le Guichet unique refuse la liasse (${v.length} point(s)) : ${v.map((x) => `${x.propertyPath} → ${x.message}`).join(' | ')}`), { status: e.status });
    }
    // Bug de sérialisation de la réponse côté INPI (« No collection route… ») : la
    // formalité est pourtant créée — on la retrouve parmi les plus récentes.
    if (!/No collection route/i.test(String(e.message))) throw e;
  }
  if (!created?.id) {
    const r = await client.listFormalities({ siren, itemsPerPage: 5, 'order[created]': 'desc' });
    created = (r?.['hydra:member'] || []).find((f) => new Date(f.created) >= startedAt && f.typeFormalite === typeFormalite);
    if (!created) throw new Error("La modification n'a pas pu être retrouvée après création : vérifier sur le Guichet unique.");
  }
  return { formality: created, events: created.events || [] };
}


// ─── Opérations de modification (indicateurs relevés sur des modifications validées) ───
const { adresseInpi, personneInpi } = require('./inpi-liasse');

function pm(next) {
  if (!next.personneMorale) throw new Error('Opération réservée aux sociétés.');
  return next.personneMorale;
}

// Les activités existantes sont déclarées « inchangées » (I).
function activitesInchangees(next) {
  const bloc = next.personneMorale || next.personnePhysique;
  for (const a of bloc?.etablissementPrincipal?.activites || []) if (!a.statutFormalite) a.statutFormalite = 'I';
}

const OPERATIONS = {
  // 12M — objet social (et code APE)
  async objet(next, { objet, codeApe, dateEffet }) {
    const d = pm(next).identite.description;
    d.objet = objet;
    d.is12MTriggered = true;
    d.dateEffet12M = dateEffet;
    if (codeApe) pm(next).identite.entreprise.codeApe = codeApe;
    activitesInchangees(next);
    return ['12M'];
  },
  // 10M — dénomination
  async denomination(next, { denomination, dateEffet }) {
    const p = pm(next);
    p.identite.entreprise.denomination = String(denomination).toUpperCase();
    p.identite.description.is10MTriggered = true;
    p.identite.description.dateEffet10M = dateEffet;
    activitesInchangees(next);
    return ['10M'];
  },
  // 60M — transfert du siège (adresse de l'entreprise et de l'établissement principal)
  async siege(next, { adresse, dateEffet }) {
    const p = pm(next);
    const adr = await adresseInpi(adresse, [], 'Nouveau siège');
    if (!adr) throw new Error('Adresse du nouveau siège incomplète.');
    p.adresseEntreprise.adresse = { ...(p.adresseEntreprise.adresse || {}), ...adr };
    const ep = p.etablissementPrincipal;
    if (ep) {
      ep.adresse = { ...(ep.adresse || {}), ...adr };
      ep.descriptionEtablissement = { ...(ep.descriptionEtablissement || {}), is60PMFTriggered: true, dateEffet60PMF: dateEffet };
    }
    activitesInchangees(next);
    return ['60M'];
  },
  // 35M — nomination d'un dirigeant (personne physique)
  async nomination(next, { personne, role = 'GERANT', dateEffet }) {
    const p = pm(next);
    const desc = await personneInpi(personne, [], 'Dirigeant nommé');
    const adr = await adresseInpi(personne.adresse, [], 'Domicile du dirigeant nommé');
    const tns = role === 'GERANT';
    p.composition.pouvoirs = p.composition.pouvoirs || [];
    p.composition.pouvoirs.push({
      individu: {
        ...(tns ? { voletSocial: { organismeAssuranceMaladieActuelle: 'R', activiteSimultanee: false, affiliationPamBiologiste: false, affiliationPamPharmacien: false, declarationMineur: false, indicateurActiviteAnterieure: false } } : {}),
        descriptionPersonne: { ...desc, formeSociale: tns ? '3' : '1' },
        ...(adr ? { adresseDomicile: adr } : {}),
      },
      // Société civile (forme 65xx, ex. SCI 6540) : gérant = rôle 75 (relevé au RNE)
      roleEntreprise: (role === 'GERANT' && String(p.identite?.entreprise?.formeJuridique || '').startsWith('65'))
        ? '75'
        : ({ PRESIDENT: '73', GERANT: '30', DG: '74' }[role] || role),
      statutPourLaFormalite: '1',
      typeDePersonne: 'INDIVIDU',
      beneficiaireEffectif: false,
      indicateurSecondRoleEntreprise: false,
      dateEffet34Or35M: dateEffet,
      is34Or35MAdjonctionTriggered: true,
    });
    p.composition.isModificationPouvoir = true;
    activitesInchangees(next);
    return ['35M'];
  },
  // 35M — cessation de fonctions d'un dirigeant (par nom)
  async revocation(next, { nom, dateEffet }) {
    const p = pm(next);
    const cible = (p.composition.pouvoirs || []).find((x) =>
      String(x.individu?.descriptionPersonne?.nom || x.entreprise?.denomination || '').toUpperCase() === String(nom).toUpperCase());
    if (!cible) throw new Error(`Dirigeant « ${nom} » introuvable dans la fiche RNE.`);
    Object.assign(cible, { statutPourLaFormalite: '3', is34Or35MSuppressionTriggered: true, dateEffet34Or35M: dateEffet });
    p.composition.isModificationPouvoir = true;
    activitesInchangees(next);
    return ['35M'];
  },
  // 38F — bénéficiaires effectifs : ajout (personnes détenant ≥ 25 %) et retrait (par nom)
  async beneficiaires(next, { ajouts = [], retraits = [], dateEffet }) {
    const p = pm(next);
    p.beneficiairesEffectifs = p.beneficiairesEffectifs || [];
    for (const nom of retraits) {
      const b = p.beneficiairesEffectifs.find((x) => String(x.beneficiaire?.descriptionPersonne?.nom || '').toUpperCase() === String(nom).toUpperCase());
      if (b) Object.assign(b, { statutPourLaFormalite: '3', isModificationAutre: true });
    }
    for (const a of ajouts) {
      const desc = await personneInpi(a.personne, [], 'Bénéficiaire effectif');
      const adr = await adresseInpi(a.personne.adresse, [], 'Domicile du bénéficiaire');
      const pct = Number(a.pourcentage) || 0;
      p.beneficiairesEffectifs.push({
        beneficiaire: { descriptionPersonne: { dateEffetRoleDeclarant: dateEffet, ...desc }, ...(adr ? { adresseDomicile: adr } : {}) },
        modalite: {
          detentionPartDirecte: true, partsDirectesPleinePropriete: pct, partsDirectesNuePropriete: 0, detentionPartTotale: pct,
          detentionVoteDirecte: true, voteDirectePleinePropriete: pct, voteDirecteNuePropriete: 0, voteDirecteUsufruit: 0, detentionVoteTotal: pct,
          modalitesDeControle: ['1'], detention25pCapital: pct >= 25, detention25pDroitVote: pct >= 25,
        },
        statutPourLaFormalite: '1',
        isModificationAutre: true,
      });
    }
    Object.assign(p, { is38FTriggered: true, mode38F: 1, dateEffet38F: dateEffet });
    activitesInchangees(next);
    return ['38F'];
  },
};

// 40M — mise en sommeil d'une société (cessation temporaire d'activité, immatriculation
// maintenue). Structure relevée sur les mises en sommeil validées du cabinet.
OPERATIONS.miseEnSommeil = async (next, { dateEffet, deplacerEtablissement = true }) => {
  const p = pm(next);
  const ep = p.etablissementPrincipal;
  if (ep) {
    ep.descriptionEtablissement = {
      ...(ep.descriptionEtablissement || {}),
      rolePourEntreprise: '1', statutPourFormalite: '2', destinationEtablissement: 'C',
      sansActiviteAutreActiviteSiege: true, indicateurEtablissementPrincipal: false, dateFinActivite: dateEffet,
    };
    for (const a of ep.activites || []) a.statutFormalite = 'M';
    if (deplacerEtablissement) {
      p.autresEtablissements = [...(p.autresEtablissements || []), ep];
      delete p.etablissementPrincipal;
    }
  }
  p.detailCessationEntreprise = {
    ...(p.detailCessationEntreprise || {}),
    maintienRcs: false, maintienRm: false, indicateurMaintienImmatriculationRegistre: true,
    indicateurDissolution: false, indicateurDisparitionPM: false, dateMiseEnSommeil: dateEffet,
    dateDissolutionDisparitionFromRNE: false, indicateurLocationTerresTVA: false,
  };
  return ['40M'];
};

// 41P — cessation totale d'une entreprise individuelle (radiation).
OPERATIONS.cessationEI = async (next, { dateEffet }) => {
  const pp = next.personnePhysique;
  if (!pp) throw new Error('Opération réservée aux entreprises individuelles.');
  const ep = pp.etablissementPrincipal;
  if (ep) {
    ep.descriptionEtablissement = { ...(ep.descriptionEtablissement || {}), statutPourFormalite: '2', destinationEtablissement: 'C', dateEffetFermeture: dateEffet };
    for (const a of ep.activites || []) a.statutFormalite = 'M';
  }
  pp.detailCessationEntreprise = {
    ...(pp.detailCessationEntreprise || {}),
    maintienRcs: false, dateCessationTotaleActivite: dateEffet, indicateurCessationTemporaire: false,
    indicateurDecesEntrepreneur: false, indicateurMaintienImmatriculationRegistre: false,
    indicateurDonnerFondsLocationGerance: false, dateRadiation: dateEffet,
  };
  next.natureCessationEntreprise = { dateRadiation: dateEffet };
  return ['41P'];
};

// ─── Cas plus rares (indicateurs relevés sur les modifications validées) ───
const { categorisation } = require('./inpi-liasse');
const blocDe = (next) => next.personneMorale || next.personnePhysique;
const estPP = (next) => !next.personneMorale && Boolean(next.personnePhysique);
const FORME_EXERCICE_INPI = { COMMERCIALE: 'COMMERCIALE', ARTISANALE: 'ARTISANALE', ARTISANALE_REGLEMENTEE: 'ARTISANALE_REGLEMENTEE', LIBERALE: 'INDEPENDANTE', INDEPENDANTE: 'INDEPENDANTE', CIVILE: 'GESTION_DE_BIENS' };

function nouvelleActivite({ description, codeApe, formeExercice }, dateEffet, principale) {
  const cat = categorisation(codeApe);
  if (!cat) throw new Error(`Catégorie d'activité INPI inconnue pour le code APE ${codeApe || '(absent)'}.`);
  return {
    statutFormalite: 'A',
    indicateurPrincipal: Boolean(principale),
    indicateurProlongement: false,
    dateDebut: dateEffet,
    exerciceActivite: 'P',
    indicateurNonSedentaire: false,
    formeExercice: FORME_EXERCICE_INPI[formeExercice] || 'COMMERCIALE',
    categorisationActivite1: cat.codes[0],
    categorisationActivite2: cat.codes[1],
    ...(cat.codes[2] ? { categorisationActivite3: cat.codes[2] } : {}),
    ...(cat.codes[3] ? { categorisationActivite4: cat.codes[3] } : {}),
    ...(cat.codes[4] ? { precisionActivite: cat.codes[4] } : {}),
    descriptionDetaillee: description,
    indicateurArtisteAuteur: false,
    indicateurMarinProfessionnel: false,
    rolePrincipalPourEntreprise: Boolean(principale),
    codeApe,
    origine: { typeOrigine: '1' },
    is61PMFTriggered: true,
  };
}

// 61M / 61P (+ 24P pour une EI) — ajout d'une activité à l'établissement principal
OPERATIONS.activiteAjout = async (next, { description, codeApe, formeExercice, principale = false, dateEffet }) => {
  const ep = blocDe(next).etablissementPrincipal;
  if (!ep) throw new Error("Pas d'établissement principal dans la fiche RNE.");
  for (const a of ep.activites || []) if (!a.statutFormalite || a.statutFormalite === 'I') a.statutFormalite = 'M';
  const act = nouvelleActivite({ description, codeApe, formeExercice }, dateEffet, principale);
  if (estPP(next)) Object.assign(act, { is24Or27PMTriggered: true, dateEffet24Or27PM: dateEffet });
  ep.activites = [...(ep.activites || []), act];
  ep.descriptionEtablissement = { ...(ep.descriptionEtablissement || {}), statutPourFormalite: '3' };
  return estPP(next) ? ['24P', '61P'] : ['61M'];
};

// 62M / 62P — suppression d'une activité (par code APE ou par position)
OPERATIONS.activiteSuppression = async (next, { codeApe, index, dateEffet }) => {
  const ep = blocDe(next).etablissementPrincipal;
  const acts = ep?.activites || [];
  const cible = codeApe ? acts.find((a) => a.codeApe === codeApe && a.statutFormalite !== 'A') : acts[Number(index) || 0];
  if (!cible) throw new Error(`Activité à supprimer introuvable (${codeApe || index}).`);
  Object.assign(cible, { statutFormalite: 'S', is62PMTriggered: true, dateEffet67PM: dateEffet });
  for (const a of acts) if (!a.statutFormalite || a.statutFormalite === 'I') a.statutFormalite = 'M';
  ep.descriptionEtablissement = { ...(ep.descriptionEtablissement || {}), statutPourFormalite: '3' };
  return estPP(next) ? ['62P'] : ['62M'];
};

// 54M — ouverture d'un établissement secondaire
OPERATIONS.etablissementSecondaire = async (next, { adresse, description, codeApe, formeExercice, dateEffet }) => {
  const b = blocDe(next);
  const adr = await adresseInpi(adresse, [], 'Établissement secondaire');
  if (!adr) throw new Error("Adresse de l'établissement secondaire incomplète.");
  // Validé par l'INPI : l'établissement principal reste inchangé (activités « I »,
  // rôle principal conservé) ; l'activité du secondaire n'est pas principale.
  if (b.etablissementPrincipal) {
    for (const a of b.etablissementPrincipal.activites || []) { a.statutFormalite = 'I'; a.rolePrincipalPourEntreprise = true; }
  }
  const act = { ...nouvelleActivite({ description, codeApe, formeExercice }, dateEffet, true), rolePrincipalPourEntreprise: false };
  delete act.is61PMFTriggered;
  b.autresEtablissements = [...(b.autresEtablissements || []), {
    descriptionEtablissement: { rolePourEntreprise: '3', statutPourFormalite: '1', indicateurEtablissementPrincipal: false },
    adresse: adr,
    activites: [act],
    effectifSalarie: { presenceSalarie: false, emploiPremierSalarie: false },
    dateEffetOuvertureEtablissement: dateEffet,
    is54PMFTriggered: true,
  }];
  return ['54M'];
};

// 17M — modification relative aux associés (hors dirigeants : entrée/sortie d'associé, associé unique…)
OPERATIONS.associes = async (next, { associeUnique, dateEffet }) => {
  const d = pm(next).identite.description;
  if (typeof associeUnique === 'boolean') d.indicateurAssocieUnique = associeUnique;
  Object.assign(d, { is17MNotDirigeantTriggered: true, dateEffet17M: dateEffet });
  activitesInchangees(next);
  return ['17M'];
};

// 16P — changement d'adresse personnelle de l'entrepreneur individuel
OPERATIONS.domicileEI = async (next, { adresse, dateEffet, deplacerEntreprise = false }) => {
  const pp = next.personnePhysique;
  if (!pp) throw new Error('Opération réservée aux entreprises individuelles.');
  const adr = await adresseInpi(adresse, [], "Nouveau domicile de l'entrepreneur");
  if (!adr) throw new Error('Nouvelle adresse incomplète.');
  const ent = pp.identite.entrepreneur;
  // reason16P : motif du changement d'adresse (« 1 », valeur documentée par l'INPI)
  ent.adresseDomicile = { ...(ent.adresseDomicile || {}), ...adr, is16PTriggered: true, dateEffet16P: dateEffet, reason16P: '1' };
  if (deplacerEntreprise && pp.adresseEntreprise) pp.adresseEntreprise.adresse = { ...(pp.adresseEntreprise.adresse || {}), ...adr };
  activitesInchangees(next);
  return ['16P'];
};

// Complément des données d'un dirigeant existant (absentes du RNE), sans modification déclarée.
OPERATIONS.complementPersonne = async (next, { nom, dateNaissance, lieuNaissance, codePostalNaissance, paysNaissance, nationalite, adresse }) => {
  const bloc = next.personneMorale || next.personnePhysique;
  const cibles = [
    ...(bloc?.composition?.pouvoirs || []).map((p) => p.individu),
    ...(next.personnePhysique ? [next.personnePhysique.identite?.entrepreneur] : []),
  ].filter(Boolean);
  const ind = cibles.find((i) => String(i.descriptionPersonne?.nom || '').toUpperCase() === String(nom).toUpperCase());
  if (!ind) throw new Error(`Personne « ${nom} » introuvable dans la fiche RNE.`);
  const d = ind.descriptionPersonne;
  const naissance = await personneInpi({ nom: d.nom, prenoms: d.prenoms, sexe: d.genre === '2' ? 'F' : 'M', dateNaissance, lieuNaissance, codePostalNaissance, paysNaissance, nationalite: nationalite || d.codeNationalite }, [], nom);
  for (const k of ['dateDeNaissance', 'lieuDeNaissance', 'codeInseeGeographique', 'paysNaissance', 'codePostalNaissance']) if (naissance[k]) d[k] = naissance[k];
  if (adresse) {
    const adr = await adresseInpi(adresse, [], `Adresse de ${nom}`);
    if (adr) ind.adresseDomicile = { ...(ind.adresseDomicile || {}), ...adr };
  }
  return [];
};

// Applique une liste d'opérations [{ type, ...params }] et renvoie les événements attendus.
async function appliquerOperations(next, operations) {
  const events = [];
  for (const op of operations) {
    const fn = OPERATIONS[op.type];
    if (!fn) throw new Error(`Opération inconnue : ${op.type}`);
    events.push(...(await fn(next, { dateEffet: op.dateEffet || new Date().toISOString().slice(0, 10), ...op })));
  }
  return [...new Set(events)];
}

module.exports = { baseModification, createModificationDraft, appliquerOperations, donneesManquantes, OPERATIONS };
