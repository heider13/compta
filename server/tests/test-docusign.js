// Test hors ligne du client DocuSign : fetch simulé, clé RSA générée à la volée.
// Vérifie le jeton JWT, la création de l'enveloppe, les documents, le signataire
// (intégré ou par e-mail), l'envoi, le lien de signature et la traduction des statuts.
// Lancer : node tests/test-docusign.js

const assert = require('node:assert');
const crypto = require('node:crypto');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.DOCUSIGN_INTEGRATION_KEY = 'cle-test';
process.env.DOCUSIGN_USER_ID = 'utilisateur-test';
process.env.DOCUSIGN_PRIVATE_KEY = privateKey.export({ type: 'pkcs1', format: 'pem' }).replace(/\n/g, '\\n');
delete process.env.DOCUSIGN_ENV;

const appels = [];
const BASE = 'https://demo.docusign.net/restapi/v2.1/accounts/compte-1';
global.fetch = async (url, init = {}) => {
  const brut = init.body instanceof URLSearchParams ? init.body.toString() : init.body;
  const corps = typeof brut === 'string' && brut.startsWith('{') ? JSON.parse(brut) : brut;
  appels.push({ url, method: init.method || 'GET', corps, entetes: init.headers || {} });
  const json = (o, status = 200) => ({ ok: status < 400, status, json: async () => o, arrayBuffer: async () => new ArrayBuffer(0) });
  if (url === 'https://account-d.docusign.com/oauth/token') return json({ access_token: 'jeton', expires_in: 3600 });
  if (url === 'https://account-d.docusign.com/oauth/userinfo') return json({ accounts: [{ account_id: 'compte-1', is_default: true, base_uri: 'https://demo.docusign.net' }] });
  if (url === `${BASE}/envelopes` && init.method === 'POST') return json({ envelopeId: 'AAAA-ENV', status: 'created' });
  if (url.endsWith('/documents') && init.method === 'PUT') return json({});
  if (url.endsWith('/recipients') && init.method === 'POST') return json({});
  if (url.endsWith('/recipients')) return json({ signers: [{ recipientId: '1', clientUserId: '1', email: 'f@ex.fr', name: 'Jeanne MARTIN' }] });
  if (url.endsWith('/identity_verification')) return json({ identityVerification: [{ workflowId: 'wf-sms', defaultName: 'Phone Authentication' }, { workflowId: 'wf-idv', defaultName: 'DocuSign ID Verification' }, { workflowId: 'wf-prem', defaultName: 'DocuSign ID Verification Premier' }, { workflowId: '5eedeb39-c6a2-48d9-b789-b5459c2ff9bb', defaultName: 'Docusign ID Verification for EU Qualified' }] });
  if (url.endsWith('/views/recipient')) return json({ url: 'https://demo.docusign.net/signing/xyz' });
  if (url === `${BASE}/envelopes/aaaa-env` && init.method === 'PUT') return json({});
  if (url === `${BASE}/envelopes/aaaa-env`) return json({ status: 'completed' });
  if (url === `${BASE}/envelopes/aaaa-env/documents`) return json({ envelopeDocuments: [{ documentId: '1', type: 'content', name: 'Synthese' }, { documentId: 'certificate', type: 'summary' }] });
  return json({ message: `inattendu ${url}` }, 404);
};

const ds = require('../lib/docusign');

(async () => {
  // PDF minimal de 2 pages
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type /Page>>endobj 2 0 obj<</Type/Page>>endobj 3 0 obj<</Type /Pages /Count 2>>endobj\n%%EOF');

  const sr = await ds.createSignatureRequest({ name: 'Signature formalité', deliveryMode: 'none' });
  assert.strictEqual(sr.id, 'aaaa-env', 'identifiant en minuscules');

  // Jeton : JWT RS256 valide, audience démo, bons claims
  const assertion = appels[0].corps.split('assertion=')[1];
  const [h, c, sig] = decodeURIComponent(assertion).split('.');
  const claims = JSON.parse(Buffer.from(c, 'base64url').toString());
  assert.deepStrictEqual([claims.iss, claims.sub, claims.aud, claims.scope], ['cle-test', 'utilisateur-test', 'account-d.docusign.com', 'signature impersonation']);
  assert.ok(crypto.verify('RSA-SHA256', Buffer.from(`${h}.${c}`), publicKey, Buffer.from(sig, 'base64url')), 'signature JWT');
  assert.deepStrictEqual(appels[2].corps, { emailSubject: 'Signature formalité', status: 'created' });

  const doc = await ds.uploadDocument(sr.id, { filename: 'Synthese.pdf', base64Pdf: pdf.toString('base64') });
  assert.deepStrictEqual(doc, { id: '1', total_pages: 2 });
  assert.strictEqual(appels.at(-1).corps.documents[0].fileExtension, 'pdf');

  await ds.addSigner(sr.id, { firstName: 'Jeanne', lastName: 'MARTIN', email: 'f@ex.fr', fields: [{ document_id: '1', page: 2, x: 60, y: 690 }] });
  const signataire = appels.at(-1).corps.signers[0];
  assert.strictEqual(signataire.clientUserId, '1', 'signature intégrée (pas d’e-mail)');
  assert.deepStrictEqual(signataire.tabs.signHereTabs[0], { documentId: '1', pageNumber: '2', xPosition: '60', yPosition: '690' });
  assert.strictEqual(signataire.identityVerification, undefined, 'pas de vérification d’identité sans niveau demandé');

  const act = await ds.activate(sr.id);
  assert.ok(appels.some((a) => a.method === 'PUT' && a.corps?.status === 'sent'), 'enveloppe envoyée');
  assert.strictEqual(act.signers[0].signature_link, 'https://demo.docusign.net/signing/xyz');
  const vue = appels.find((a) => a.url.endsWith('/views/recipient')).corps;
  assert.strictEqual(vue.clientUserId, '1');
  assert.strictEqual(vue.authenticationMethod, 'none');

  // Signature de la formalité (niveau demandé) : QES par le workflow « IDV for EU QES »
  process.env.DOCUSIGN_SIGNATURE_PROVIDER = 'FournisseurQES';
  const sr3 = await ds.createSignatureRequest({ name: 'Formalité', deliveryMode: 'none' });
  await ds.addSigner(sr3.id, { firstName: 'J', lastName: 'M', email: 'j@m.fr', fields: [], level: 'advanced_electronic_signature' });
  const qes = appels.at(-1).corps.signers[0];
  assert.deepStrictEqual(qes.identityVerification, { workflowId: '5eedeb39-c6a2-48d9-b789-b5459c2ff9bb' });
  assert.deepStrictEqual(qes.recipientSignatureProviders, [{ signatureProviderName: 'FournisseurQES' }]);
  delete process.env.DOCUSIGN_SIGNATURE_PROVIDER;

  // Envoi par e-mail : pas de clientUserId
  const sr2 = await ds.createSignatureRequest({ name: 'Actes', deliveryMode: 'email' });
  await ds.addSigner(sr2.id, { firstName: 'A', lastName: 'B', email: 'a@b.fr', fields: [] });
  assert.strictEqual(appels.at(-1).corps.signers[0].clientUserId, undefined);

  const st = await ds.getStatus(sr.id);
  assert.deepStrictEqual(st, { id: 'aaaa-env', status: 'done', documents: [{ id: '1', nature: 'signable_document', name: 'Synthese' }] });

  const { statutYousign } = ds._interne;
  assert.strictEqual(statutYousign({ status: 'sent' }), 'ongoing');
  assert.strictEqual(statutYousign({ status: 'declined' }), 'declined');
  assert.strictEqual(statutYousign({ status: 'voided', voidedReason: 'Envelope has expired.' }), 'expired');
  assert.strictEqual(statutYousign({ status: 'voided', voidedReason: 'Demande annulée' }), 'canceled');

  // Une seule authentification pour toute la séquence (jeton en cache)
  assert.strictEqual(appels.filter((a) => a.url.endsWith('/oauth/token')).length, 1);
  console.log('test-docusign : OK');
})().catch((e) => { console.error(e); process.exit(1); });
