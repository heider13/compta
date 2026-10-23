// Fournisseur de signature électronique : DocuSign ou Yousign, même interface.
// Choix par usage, pour activer DocuSign pas à pas :
//   actes      actes rédigés, signés par le client (signature électronique)
//   formalite  synthèse signée pour le Guichet unique (signature avancée ou qualifiée exigée
//              hors création : reste sur Yousign tant que la QES DocuSign n'est pas activée)
// SIGNATURE_PROVIDER_ACTES / SIGNATURE_PROVIDER_FORMALITE (docusign|yousign) priment sur
// SIGNATURE_PROVIDER ; sans réglage, DocuSign dès qu'il est configuré, Yousign à défaut.
// Les demandes déjà ouvertes se terminent chez leur fournisseur (voir pour()).

const docusign = require('./docusign');
const yousign = require('./yousign');

const yousignConfigure = () => Boolean(process.env.YOUSIGN_API_KEY);
Object.assign(yousign, { nom: 'Yousign', configure: yousignConfigure });

function actif(usage) {
  const propre = usage === 'actes' ? process.env.SIGNATURE_PROVIDER_ACTES : usage === 'formalite' ? process.env.SIGNATURE_PROVIDER_FORMALITE : '';
  const choix = String(propre || process.env.SIGNATURE_PROVIDER || '').toLowerCase();
  if (choix === 'yousign') return yousign;
  if (choix === 'docusign') return docusign;
  return docusign.configure() ? docusign : yousign;
}

// Fournisseur d'une demande déjà ouverte (mémorisé dans les métadonnées) ; sans mention,
// c'est une demande d'avant DocuSign, donc Yousign.
const pour = (fournisseur) => (fournisseur === 'docusign' ? docusign : yousign);
const cle = (f) => (f === docusign ? 'docusign' : 'yousign');

module.exports = { actif, pour, cle, docusign, yousign };
