// Fournisseur de signature électronique : DocuSign ou Yousign, même interface.
// SIGNATURE_PROVIDER=docusign|yousign choisit explicitement ; sinon DocuSign dès qu'il est
// configuré, Yousign à défaut. Les demandes déjà ouvertes chez l'autre fournisseur se
// terminent normalement : chaque demande garde son fournisseur (voir pour()).

const docusign = require('./docusign');
const yousign = require('./yousign');

const yousignConfigure = () => Boolean(process.env.YOUSIGN_API_KEY);
Object.assign(yousign, { nom: 'Yousign', configure: yousignConfigure });

function actif() {
  const choix = String(process.env.SIGNATURE_PROVIDER || '').toLowerCase();
  if (choix === 'yousign') return yousign;
  if (choix === 'docusign') return docusign;
  return docusign.configure() ? docusign : yousign;
}

// Fournisseur d'une demande déjà ouverte (mémorisé dans les métadonnées) ; sans mention,
// c'est une demande d'avant DocuSign, donc Yousign.
const pour = (fournisseur) => (fournisseur === 'docusign' ? docusign : yousign);
const cle = (f) => (f === docusign ? 'docusign' : 'yousign');

module.exports = { actif, pour, cle, docusign, yousign };
