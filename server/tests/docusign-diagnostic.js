// Diagnostic du compte DocuSign, à lancer sur le serveur une fois les clés en place :
//   set -a; source /etc/compta-proxy.env; set +a; node tests/docusign-diagnostic.js
// Affiche le compte utilisé, les fournisseurs de signature (pour DOCUSIGN_SIGNATURE_PROVIDER)
// et les workflows de vérification d'identité (pour DOCUSIGN_IDV_WORKFLOW_ID). Lecture seule.

const ds = require('../lib/docusign');
const { dsFetch, ouvrirSession } = ds._interne;

(async () => {
  if (!ds.configure()) throw new Error('Variables DOCUSIGN_* absentes (voir SETUP-DOCUSIGN.md)');
  const s = await ouvrirSession();
  console.log(`Compte : ${s.compte}\nAPI    : ${s.base}`);
  const fournisseurs = await dsFetch('/signatureProviders').catch((e) => ({ erreur: e.message }));
  console.log('\nFournisseurs de signature (signatureProviderName) :');
  for (const f of fournisseurs.signatureProviders || []) console.log(`  - ${f.signatureProviderName}  (${f.signatureProviderDisplayName || ''})`);
  if (fournisseurs.erreur) console.log(`  indisponible : ${fournisseurs.erreur}`);
  const idv = await dsFetch('/identity_verification').catch((e) => ({ erreur: e.message }));
  console.log('\nVérification d’identité (workflowId) :');
  for (const w of idv.identityVerification || []) console.log(`  - ${w.workflowId}  ${w.defaultName}`);
  if (idv.erreur) console.log(`  indisponible : ${idv.erreur}`);
})().catch((e) => { console.error(`Échec : ${e.message}`); process.exit(1); });
