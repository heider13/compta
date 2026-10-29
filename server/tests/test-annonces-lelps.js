// Test hors ligne de l'intégration Les Echos Le Parisien Services (fetch simulé).
// Lancer : node tests/test-annonces-lelps.js

const assert = require('node:assert');
const crypto = require('node:crypto');

process.env.LELPS_API_KEY = 'cle-test';
delete process.env.LELPS_API_URL;
process.env.LELPS_WEBHOOK_SECRET = 'secret-webhook';

const appels = [];
let quotaAtteint = 1; // la première écriture reçoit un 429
global.fetch = async (url, init = {}) => {
  appels.push({ url, method: init.method || 'GET', headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : null });
  const rep = (status, corps, entetes = {}) => ({ ok: status < 400, status, headers: { get: (k) => entetes[k.toLowerCase()] ?? null }, text: async () => JSON.stringify(corps), arrayBuffer: async () => new ArrayBuffer(0) });
  if (url.endsWith('/legal-notice-types')) return rep(200, { legalNoticeTypes: [{ id: 't-sas', name: 'Constitution SAS', hasBodacc: false }, { id: 't-sarl', name: 'Constitution SARL', hasBodacc: false }, { id: 't-siege', name: 'Transfert de siège social', hasBodacc: true }] });
  if (url.endsWith('/legal-notices/estimate')) {
    return rep(200, { estimates: [{ newspaper: { id: 'j1', name: 'Le Parisien.fr (Web)', medium: 'web', recommended: true, hasDigitalSupportingDocument: true }, publicationDate: '2026-11-03', publicationClosingDatetime: '2026-11-02T13:00:00Z', price: { taxRate: 20, totalExcludingTax: 150, totalTax: 30, total: 180 } }] });
  }
  if (url.endsWith('/legal-notices') && init.method === 'POST') {
    if (quotaAtteint-- > 0) return rep(429, { error: 'Rate limit exceeded', retry_after: 0, limit_type: 'write' }, { 'retry-after': '0' });
    return rep(201, { reference: 'ALP0001', status: 'pending', publicationDate: '2026-11-03', price: { total: 180 }, newspaper: { name: 'Le Parisien.fr (Web)' }, type: { name: 'Constitution SAS' } });
  }
  return rep(404, { title: 'Not found', request_id: 'r1' });
};

const lelps = require('../lib/lelps');
const { typeSuggere, verifierComplete } = require('../lib/publication-annonces')._interne;

(async () => {
  // Texte de l'agent → HTML simple accepté par l'API, caractères échappés
  assert.strictEqual(lelps.contenuHtml('Ligne 1\n\nA & B <test>\nLigne 3'), '<div><p>Ligne 1</p><p>A &amp; B &lt;test&gt;</p><p>Ligne 3</p></div>');
  // Département toujours en chaîne, zéro initial pour les 9 premiers
  assert.deepStrictEqual(['1', 1, '75', '2b', '972'].map(lelps.codeDepartement), ['01', '01', '75', '2B', '972']);

  // Signature des webhooks : HMAC hex du corps brut, horodatage à moins de 5 min
  const corps = Buffer.from('{"type":"legal_notice_publication_proof_created","object":{"legalNotice":{"reference":"ALP0001","publicationProofUrl":"https://x/y"}}}');
  const s = crypto.createHmac('sha256', 'secret-webhook').update(corps).digest('hex');
  const t = Math.floor(Date.now() / 1000);
  assert.strictEqual(lelps.signatureWebhookValide(corps, `t=${t},s=${s}`), true);
  assert.strictEqual(lelps.signatureWebhookValide(corps, `t=${t},s=${'0'.repeat(64)}`), false, 'signature fausse');
  assert.strictEqual(lelps.signatureWebhookValide(corps, `t=${t - 600},s=${s}`), false, 'message trop ancien (rejeu)');
  assert.strictEqual(lelps.signatureWebhookValide(Buffer.from(`${corps} `), `t=${t},s=${s}`), false, 'corps modifié');

  // Types et suggestion
  const types = await lelps.typesAnnonce();
  assert.strictEqual(typeSuggere(types, { type: 'constitution', label: 'Avis de constitution' }, { formeJuridique: 'SAS' }).id, 't-sas');
  assert.strictEqual(typeSuggere(types, { type: 'modification', label: 'Avis de modification' }, { operation: 'Transfert du siège social' }).id, 't-siege');

  // Annonce incomplète : jamais publiée
  assert.throws(() => verifierComplete({ a_completer: [] }, 'Capital : [À COMPLÉTER : capital]'), /à compléter/);
  assert.throws(() => verifierComplete({ a_completer: ['date de l’acte'] }, 'texte'), /à compléter/i);

  // Tarifs
  const tarifs = await lelps.estimer({ departement: '75', typeId: 't-sas', contenu: '<div><p>x</p></div>' });
  assert.deepStrictEqual(tarifs[0].prix, { ht: 150, tva: 30, ttc: 180, tauxTva: 20 });
  assert.strictEqual(tarifs[0].journal.groupe, true);
  assert.strictEqual(appels.at(-1).body.departmentCode, '75');

  // Commande : Idempotency-Key obligatoire ; même clé renvoyée au nouvel essai après un 429
  await assert.rejects(() => lelps.creer({ departement: '75', typeId: 't-sas', contenu: 'x', referenceClient: 'R' }), /Idempotency-Key/);
  const n = await lelps.creer({ departement: '75', typeId: 't-sas', contenu: 'x', referenceClient: 'R', journalId: 'j1' }, 'cle-unique-1');
  assert.strictEqual(n.reference, 'ALP0001');
  const creations = appels.filter((a) => a.url.endsWith('/legal-notices') && a.method === 'POST');
  assert.strictEqual(creations.length, 2, 'un 429 puis un nouvel essai');
  assert.ok(creations.every((a) => a.headers['Idempotency-Key'] === 'cle-unique-1'), 'même clé à chaque essai');
  assert.ok(creations.every((a) => a.headers.Authorization === 'Bearer cle-test'));
  assert.strictEqual(creations[1].body.newspaperId, 'j1');

  // Erreur lisible avec le request_id
  await assert.rejects(() => lelps.lire('INCONNUE'), /request_id r1/);
  console.log('test-annonces-lelps : OK');
})().catch((e) => { console.error(e); process.exit(1); });
