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

// Indicateurs …Present : false quand la donnée correspondante est absente.
function marquerAbsents(o) {
  if (Array.isArray(o)) return o.forEach(marquerAbsents);
  if (!o || typeof o !== 'object') return;
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
  completerPersonnes(next[bloc], gu?.[bloc]);
  marquerAbsents(next[bloc]);

  const m = await mandataireBlocks(client);
  next.declarant = m.declarant;
  Object.assign(ident, {
    ...(m.adresseCorrespondance ? { adresseCorrespondance: m.adresseCorrespondance } : {}),
    ...(m.destinataireCorrespondance ? { destinataireCorrespondance: m.destinataireCorrespondance } : {}),
    ...(m.contactCorrespondance ? { contactCorrespondance: m.contactCorrespondance } : {}),
  });
  delete next.piecesJointes;

  const denomination = ident.entreprise?.denomination
    || [ident.entrepreneur?.descriptionPersonne?.prenoms?.[0], ident.entrepreneur?.descriptionPersonne?.nom].filter(Boolean).join(' ');
  return { company, previous, next, typePersonne, bloc, denomination, client };
}

// Crée le brouillon de modification. mutate(next, ctx) applique les changements.
async function createModificationDraft(orgId, siren, { mutate, typeFormalite = 'M', reference, nomDossier, observation } = {}) {
  const base = await baseModification(orgId, siren);
  const { client, company, previous, next, typePersonne, denomination } = base;
  if (mutate) await mutate(next, base);
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
      roleEntreprise: { PRESIDENT: '73', GERANT: '30', DG: '74' }[role] || role,
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

module.exports = { baseModification, createModificationDraft, appliquerOperations, OPERATIONS };
