// Dépôt des COMPTES ANNUELS au Guichet unique (API mandataire « Compte annuel » :
// POST /api/annual_accounts). Structure relevée sur des dépôts réels du cabinet
// (validé, compte de résultat confidentiel, confidentialité totale).
//
// Autorisé par le cabinet : création de BROUILLONS uniquement, après aperçu et
// confirmation ; signature et paiement restent faits par le formaliste.

const inpi = require('../inpi');
const rne = require('./inpi-rne');
const { mandataireBlocks, toPdf } = require('./inpi-liasse');
const { paiementDe } = require('./inpi-paiement');

const clean = (o) => JSON.parse(JSON.stringify(o ?? null, (k, v) => (k.startsWith('@') ? undefined : v)));

// Pièces d'un dépôt de comptes (codes relevés sur les dépôts acceptés par le greffe).
const PIECES_CA = {
  COMPTES_COMPLETS: { typeDocument: 'PJ_232', sousTypeDocument: 'PJCA0041', label: 'Bilan, compte de résultat et annexes' },
  BILAN_ET_ANNEXES: { typeDocument: 'PJ_233', sousTypeDocument: 'PJCA0045', label: 'Bilan et annexes (sans compte de résultat)' },
  COMPTE_RESULTAT: { typeDocument: 'PJ_103', sousTypeDocument: 'PJCA0051', label: 'Compte de résultat' },
  BILAN_COMPTE_RESULTAT: { typeDocument: 'PJ_231', label: 'Bilan et compte de résultat (sans annexe)' },
  BILAN_SIMPLIFIE: { typeDocument: 'PJ_234', label: 'Bilan simplifié et annexes' },
  PV_AFFECTATION: { typeDocument: 'PJ_236', sousTypeDocument: 'PJCA0042', label: "PV d'approbation des comptes et d'affectation du résultat" },
  RAPPORT_CAC: { typeDocument: 'PJ_235', label: 'Rapport du commissaire aux comptes' },
  DECLARATION_CONFIDENTIALITE: { typeDocument: 'PJ_146', sousTypeDocument: 'PJCA0043', label: 'Déclaration de confidentialité' },
  REFUS_APPROBATION: { typeDocument: 'PJ_198', label: "PV de refus d'approbation des comptes" },
  MANDAT: { typeDocument: 'PJ_51', sousTypeDocument: 'PJCA0023', label: 'Pouvoir au formaliste' },
  IDENTITE_MANDATAIRE: { typeDocument: 'PJ_11', sousTypeDocument: 'PJCA0032', label: "Pièce d'identité du déclarant" },
};

// Niveaux de confidentialité (Code de commerce L232-25) :
//   aucune          → comptes publics (niveau 0)
//   totale          → micro-entreprise : comptes non publiés (niveau 1, déclaration PJ_146)
//   compte_resultat → petite entreprise : compte de résultat non publié (niveau 2)
const CONFIDENTIALITE = {
  aucune: { niveau: '0', modeExpert: {} },
  totale: { niveau: '1', modeExpert: { confidentialityStatement: true } },
  compte_resultat: { niveau: '2', modeExpert: { confidentialityIncomeStatement: true } },
};

// Pièces attendues selon le niveau de confidentialité (hors pouvoir / identité).
function piecesAttendues(confidentialite, { approuves = true, cac = false } = {}) {
  const p = [];
  if (confidentialite === 'compte_resultat') p.push('BILAN_ET_ANNEXES', 'COMPTE_RESULTAT');
  else p.push('COMPTES_COMPLETS');
  if (confidentialite === 'totale') p.push('DECLARATION_CONFIDENTIALITE');
  p.push(approuves ? 'PV_AFFECTATION' : 'REFUS_APPROBATION');
  if (cac) p.push('RAPPORT_CAC');
  return p;
}

const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const ajouterMois = (d, m) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; };

// Contrôles avant création : exercice, délais, pièces. Renvoie { bloquants, alertes }.
function controler({ exercice, confidentialite, categories = [], approuves = true, dateApprobation }) {
  const bloquants = [];
  const alertes = [];
  if (!CONFIDENTIALITE[confidentialite]) bloquants.push(`Niveau de confidentialité inconnu : ${confidentialite}`);
  const debut = exercice?.debut && new Date(exercice.debut);
  const fin = exercice?.fin && new Date(exercice.fin);
  if (!debut || !fin || Number.isNaN(+debut) || Number.isNaN(+fin)) bloquants.push("Dates de début et de fin de l'exercice");
  else {
    if (fin <= debut) bloquants.push("La fin de l'exercice doit suivre son début");
    const mois = (fin - debut) / (30.44 * 86400000);
    if (mois > 24.5) bloquants.push("Exercice de plus de 24 mois : impossible");
    if (fin > new Date()) bloquants.push("L'exercice n'est pas encore clos");
    // Approbation dans les 6 mois de la clôture, dépôt dans le mois (2 mois en ligne) qui suit.
    const limiteAg = ajouterMois(fin, 6);
    const appro = dateApprobation ? new Date(dateApprobation) : null;
    if (appro && appro < fin) bloquants.push("La date d'approbation précède la clôture de l'exercice");
    if (appro && appro > limiteAg) alertes.push(`Comptes approuvés après le délai de 6 mois (limite ${iso(limiteAg)}) : prorogation par ordonnance du tribunal à joindre si elle existe`);
    const limiteDepot = ajouterMois(appro || limiteAg, 2);
    if (new Date() > limiteDepot) alertes.push(`Dépôt hors délai (limite ${iso(limiteDepot)}) : risque d'injonction de déposer et d'amende`);
  }
  for (const c of piecesAttendues(confidentialite, { approuves })) {
    if (!categories.includes(c)) bloquants.push(`Pièce manquante : ${PIECES_CA[c].label}`);
  }
  if (confidentialite !== 'compte_resultat' && categories.includes('BILAN_ET_ANNEXES') && !categories.includes('COMPTES_COMPLETS')) {
    alertes.push('Bilan sans compte de résultat : ce n\'est possible qu\'avec la confidentialité du compte de résultat');
  }
  return { bloquants, alertes };
}

// Contenu du dépôt : identité depuis le RNE, déclarant = cabinet (comme ses formalités).
async function construireContenu(orgId, siren, { exercice, confidentialite = 'aucune', approuves = true, cac = null }) {
  const client = inpi.forOrg(orgId);
  const company = await rne.getCompany(orgId, siren);
  const c = clean(company.formality.content);
  const typePersonne = company.formality.typePersonne || (c.personneMorale ? 'M' : 'P');
  if (typePersonne !== 'M') throw new Error("Dépôt des comptes pris en charge pour les sociétés uniquement (pas les entrepreneurs individuels).");
  const pm = c.personneMorale || {};
  const ent = pm.identite?.entreprise || {};
  if (!ent.numGreffe) {
    // Greffe compétent absent du RNE : repris d'une liasse déjà déposée par le cabinet
    try {
      const r = await client.listFormalities({ siren, itemsPerPage: 10, 'order[created]': 'desc' });
      for (const f of r?.['hydra:member'] || []) {
        const g = (await client.getFormality(f.id))?.content?.personneMorale?.identite?.entreprise?.numGreffe;
        if (g) { ent.numGreffe = g; break; }
      }
    } catch {}
  }
  const m = await mandataireBlocks(client);
  if (!m.declarant) throw new Error("Déclarant introuvable : le cabinet doit avoir au moins une formalité de société sur son compte Guichet unique.");
  const conf = CONFIDENTIALITE[confidentialite] || CONFIDENTIALITE.aucune;
  const debut = iso(exercice.debut);
  const fin = iso(exercice.fin);
  const content = {
    formeExerciceActivitePrincipale: c.formeExerciceActivitePrincipale || pm.etablissementPrincipal?.activites?.[0]?.formeExercice || 'COMMERCIALE',
    personneMorale: {
      identite: {
        entreprise: ent,
        description: pm.identite?.description || {},
        ...(pm.identite?.publicationLegale ? { publicationLegale: pm.identite.publicationLegale } : {}),
      },
      adresseEntreprise: pm.adresseEntreprise || {},
    },
    declarant: m.declarant,
    comptesAnnuels: {
      comptesConsolides: false,
      dispenseDepotAnnexes: false,
      depotSimplifie: false,
      declarationAffectationPatrimoine: false,
      nouveauDepot: false,
      dateCloture: fin,
      dateDebutExerciceComptable: debut,
      dateFinExerciceComptable: fin,
      niveauConfidentialite: conf.niveau,
      depotModeExpert: true,
      modeExpert: { compteType: '1', depotRectificatif: false, confidentialityStatement: false, confidentialityIncomeStatement: false, depotSimplifie: false, ...conf.modeExpert },
      ...(approuves === false ? { comptesApprouves: false } : {}),
      ...(cac != null ? { interventionCAC: Boolean(cac) } : {}),
    },
  };
  return { content, company, denomination: ent.denomination || siren, client };
}

// Pièce jointe : confidentielle si les comptes ne sont pas publiés.
function estConfidentielle(categorie, confidentialite) {
  if (confidentialite === 'totale') return true;
  if (confidentialite === 'compte_resultat') return categorie === 'COMPTE_RESULTAT';
  return false;
}

async function deposerPiecesCA(client, id, pieces, confidentialite) {
  const deposees = [];
  const erreurs = [];
  for (const p of pieces) {
    const spec = PIECES_CA[p.categorie];
    if (!spec) { erreurs.push(`${p.nom} : catégorie inconnue`); continue; }
    try {
      const pdf = await toPdf(p.buffer, p.mime, p.nom);
      const nomDocument = `${p.nom.replace(/\.(pdf|docx?|xlsx?|png|jpe?g|webp|gif)$/i, '')}.pdf`;
      await client.request(`/api/annual_accounts/${id}/attachments`, {
        method: 'POST',
        body: {
          nomDocument,
          typeDocument: spec.typeDocument,
          ...(spec.sousTypeDocument ? { sousTypeDocument: spec.sousTypeDocument } : {}),
          langueDocument: 'fr',
          documentBase64: pdf.toString('base64'),
          documentExtension: 'pdf',
          path: '.piecesJointes[0]',
          ...(estConfidentielle(p.categorie, confidentialite) ? { confidentiel: true } : {}),
        },
      });
      deposees.push({ nom: nomDocument, categorie: spec.label });
    } catch (e) {
      erreurs.push(`${p.nom} : ${String(e.message).slice(0, 200)}`);
    }
  }
  return { deposees, erreurs };
}

// Crée le BROUILLON de dépôt puis y joint les pièces.
// pieces : [{ categorie, nom, buffer, mime }]
async function creerBrouillon(orgId, { siren, exercice, confidentialite = 'aucune', approuves = true, cac = null, pieces = [], reference, nomDossier }) {
  const { content, denomination, client } = await construireContenu(orgId, siren, { exercice, confidentialite, approuves, cac });
  const body = {
    companyName: denomination,
    siren,
    year: Number(String(iso(exercice.fin)).slice(0, 4)),
    typePersonne: 'M',
    nomDossier: nomDossier || `COMPTES ${denomination} ${String(iso(exercice.fin)).slice(0, 4)}`,
    ...(reference ? { referenceMandataire: reference } : {}),
    content,
  };
  let cree;
  try {
    cree = await client.request('/api/annual_accounts', { method: 'POST', body });
  } catch (e) {
    const v = e.payload?.violations;
    if (Array.isArray(v) && v.length) {
      throw Object.assign(new Error(`Le Guichet unique refuse le dépôt (${v.length} point(s)) : ${v.map((x) => `${x.propertyPath} → ${x.message}`).join(' | ')}`), { status: e.status });
    }
    throw e;
  }
  const { deposees, erreurs } = await deposerPiecesCA(client, cree.id, pieces, confidentialite);
  return { depot: cree, deposees, erreurs };
}

const STATUTS = {
  DRAFT: 'Brouillon', RECEIVED: 'Brouillon', SIGNATURE_PENDING: 'À signer', SIGNED: 'Signé',
  PAYMENT_PENDING: 'À payer', PAYMENT_VALIDATION_PENDING: 'Paiement en cours', PAID: 'Payé',
  VALIDATION_PENDING: 'Chez le greffe', AMENDMENT_PENDING: 'Régularisation demandée',
  AMENDMENT_SIGNATURE_PENDING: 'Régularisation à signer', AMENDMENT_PAYMENT_PENDING: 'Régularisation à payer',
  AMENDMENT_PAYMENT_VALIDATION_PENDING: 'Régularisation : paiement en cours', AMENDMENT_PAID: 'Régularisation payée',
  AMENDED: 'Régularisé', VALIDATED: 'Déposé (validé par le greffe)', REJECTED: 'Rejeté', EXPIRED: 'Expiré', CANCELED: 'Annulé',
};

const MOTIFS_REJET = {
  MISSING_ATTACHMENTS: 'Pièce manquante ou non conforme',
  PERIOD_OVERDUE: 'Délai de régularisation dépassé',
  DATA_ERROR: 'Donnée erronée',
};

// URL de la page du dépôt sur le Guichet unique (connexion demandée si besoin).
const GU_COMPTES_URL = process.env.GU_COMPTES_URL || 'https://guichet-unique.inpi.fr/comptes-annuels/{id}';
const lienDepot = (id) => GU_COMPTES_URL.replace('{id}', encodeURIComponent(id));

function resume(a, emails = []) {
  const ca = a.content?.comptesAnnuels || {};
  const v = (a.annualAccountValidationRequests || [])[0];
  return {
    id: a.id,
    liasse: a.liasseNumber || null,
    denomination: a.companyName || null,
    siren: a.siren || null,
    annee: a.year || null,
    statut: a.status,
    statut_libelle: STATUTS[a.status] || a.status,
    date_statut: a.statusDate || a.updated || null,
    cree_le: a.created || null,
    cloture: ca.dateCloture || null,
    confidentialite: ({ 0: 'aucune', 1: 'totale', 2: 'compte_resultat', 3: 'simplifiee', 4: 'compte_resultat' })[ca.niveauConfidentialite] || null,
    greffe: v?.partnerCenter?.label || null,
    observation_greffe: v?.validationObservation ? String(v.validationObservation).replace(/\s+/g, ' ').trim().slice(0, 1000) : null,
    motifs_rejet: (v?.rejectionReasons || []).map((r) => MOTIFS_REJET[r] || r),
    pieces: (a.content?.piecesJointes || a.attachments || []).map((p) => ({ type: p.typeDocument, libelle: Object.values(PIECES_CA).find((x) => x.typeDocument === p.typeDocument)?.label || p.typeDocument, confidentiel: Boolean(p.confidentiel), conformite: p.compliance })),
    paiement: a.carts ? paiementDe(a, emails) : null,
    lien_guichet_unique: lienDepot(a.id),
  };
}

async function lister(orgId, { siren, page = 1, parPage = 30, emails = [] } = {}) {
  const client = inpi.forOrg(orgId);
  const r = await client.request('/api/annual_accounts', { query: { page, itemsPerPage: parPage, 'order[created]': 'desc', ...(siren ? { siren } : {}) } });
  const items = r?.['hydra:member'] || r?.member || [];
  return { total: r?.['hydra:totalItems'] ?? items.length, depots: items.map((a) => resume(a, emails)) };
}

async function detail(orgId, id, emails = []) {
  const client = inpi.forOrg(orgId);
  const a = await client.request(`/api/annual_accounts/${encodeURIComponent(id)}`);
  const out = resume(a, emails);
  try {
    const h = await client.request(`/api/annual_accounts/${encodeURIComponent(id)}/annual_account_status_histories`);
    out.historique = (h?.['hydra:member'] || []).map((s) => ({ statut: s.status, libelle: STATUTS[s.status] || s.status, date: s.created }));
  } catch { out.historique = []; }
  return out;
}

module.exports = { PIECES_CA, CONFIDENTIALITE, piecesAttendues, controler, construireContenu, creerBrouillon, lister, detail, resume, lienDepot, STATUTS };
