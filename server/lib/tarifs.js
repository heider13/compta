// Tarifs des formalités vendues aux entrepreneurs (chat public de la page
// Indépendants et TPE). Alignés sur les formules « Standard » de LegalPlace
// relevées le 2026-10-12 ; « provisoire » = prix non publié par LegalPlace,
// à confirmer par Legaly avant l'ouverture du paiement réel.
// Frais officiels (greffe, INPI, annonce légale) en plus, payés par le client
// sur le Guichet unique (délégation de paiement).

const TVA = 0.2;

const TARIFS = {
  creation_micro: {
    libelle: 'Création de micro-entreprise',
    prix_ht: 59,
    frais_officiels: 'Aucun pour une activité commerciale ou libérale (frais de chambre de métiers pour une activité artisanale).',
    inclus: ['Choix du régime et des options expliqués', 'Dossier du Guichet unique préparé et vérifié', 'Dépôt par Legaly comme mandataire', 'Suivi jusqu’à l’immatriculation'],
  },
  creation_societe: {
    libelle: 'Création de société (SASU, SAS, EURL, SARL)',
    prix_ht: 99,
    frais_officiels: 'Environ 195 € : annonce légale (142 € HT), immatriculation (33,83 €), bénéficiaires effectifs (19,33 €).',
    inclus: ['Statuts rédigés sur mesure', 'Annonce légale rédigée', 'Actes annexes (déclaration de non-condamnation, pouvoir, attestation de domiciliation)', 'Dossier du Guichet unique préparé et déposé par Legaly', 'Suivi jusqu’au Kbis'],
  },
  creation_sci: {
    libelle: 'Création de SCI',
    prix_ht: 99,
    frais_officiels: 'Environ 200 € : annonce légale et immatriculation.',
    inclus: ['Statuts de SCI rédigés sur mesure', 'Annonce légale rédigée', 'Dossier du Guichet unique préparé et déposé par Legaly', 'Suivi jusqu’au Kbis'],
  },
  modification: {
    libelle: 'Modification de société (siège, dirigeant, objet, dénomination…)',
    prix_ht: 149,
    frais_officiels: 'Selon l’opération : greffe (environ 43 € à 231 €) et annonce légale (environ 109 € HT).',
    inclus: ['Procès-verbal de décision rédigé', 'Statuts mis à jour', 'Annonce légale rédigée', 'Dossier du Guichet unique préparé et déposé par Legaly'],
  },
  mise_en_sommeil: {
    libelle: 'Mise en sommeil de société',
    prix_ht: 149,
    provisoire: true,
    frais_officiels: 'Frais de greffe du Guichet unique (pas d’annonce légale).',
    inclus: ['Procès-verbal de mise en sommeil', 'Dossier du Guichet unique préparé et déposé par Legaly'],
  },
  depot_comptes: {
    libelle: 'Dépôt des comptes annuels',
    prix_ht: 99,
    provisoire: true,
    frais_officiels: 'Environ 45 € (greffe, BODACC, INPI).',
    inclus: ['Contrôle des comptes et du PV d’approbation', 'Option de confidentialité', 'Dépôt préparé et déposé par Legaly'],
  },
  dissolution: {
    libelle: 'Fermeture de société (dissolution et liquidation)',
    prix_ht: 249,
    frais_officiels: 'Environ 510 € : deux annonces légales et frais de greffe.',
    inclus: ['PV de dissolution et de clôture de liquidation', 'Deux annonces légales rédigées', 'Dossiers du Guichet unique préparés et déposés par Legaly', 'Suivi jusqu’à la radiation'],
  },
  fermeture_micro: {
    libelle: 'Fermeture de micro-entreprise',
    prix_ht: 59,
    frais_officiels: 'Aucun.',
    inclus: ['Déclaration de cessation préparée', 'Dépôt par Legaly comme mandataire', 'Suivi jusqu’à la radiation'],
  },
};

function offre(code) {
  const t = TARIFS[code];
  if (!t) return null;
  const ttc = Math.round(t.prix_ht * (1 + TVA) * 100);
  return { code, ...t, prix_ttc_cents: ttc, prix_ht_cents: t.prix_ht * 100 };
}

module.exports = { TARIFS, offre, TVA };
