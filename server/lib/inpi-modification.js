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

module.exports = { baseModification, createModificationDraft };
