// API key management — génération / vérification.
//
// Format des tokens : `sk_live_` + 32 caractères hexadécimaux random.
// Stocké en DB :
//   - prefix : `sk_live_xx` (12 premiers caractères → utile pour l'UI & lookup rapide)
//   - key_hash : bcrypt(token) → secret, jamais réversible
//
// On lookup par préfixe (index DB), puis bcrypt.compare sur le hash pour valider.
// On ne renvoie JAMAIS le token complet : il n'est visible qu'une seule fois
// au moment de la création (côté Server Action / UI).
//
// IMPORTANT déploiement VPS : nécessite `npm i bcryptjs` dans server/package.json
// (déjà ajouté ci-dessous). Si la dépendance manque, lancer :
//   cd server && npm install bcryptjs

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { getSupabaseAdmin } = require('./db');

const TOKEN_PREFIX = 'sk_live_';
const TOKEN_RAND_BYTES = 16; // → 32 hex chars
const PREFIX_LEN = TOKEN_PREFIX.length + 2; // sk_live_ + 2 chars

/**
 * Génère un nouveau token API (côté serveur uniquement, juste avant insertion en DB).
 * Le token complet n'est jamais persisté : seul son hash bcrypt l'est.
 *
 * @returns {Promise<{ token: string, prefix: string, hash: string }>}
 */
async function generateApiKey() {
  const random = crypto.randomBytes(TOKEN_RAND_BYTES).toString('hex');
  const token = `${TOKEN_PREFIX}${random}`;
  const prefix = token.slice(0, PREFIX_LEN);
  const hash = await bcrypt.hash(token, 10);
  return { token, prefix, hash };
}

/**
 * Vérifie un token reçu depuis l'en-tête `Authorization: Bearer`.
 * Stratégie : lookup par prefix (index DB), puis bcrypt.compare sur chaque ligne candidate
 * (devrait être 1 dans 99% des cas, sinon faible collision sur 2 caractères hex).
 *
 * @param {string} token  Le token brut (sk_live_xxx...)
 * @returns {Promise<{ id: string, orgId: string, scopes: string[] } | null>}
 */
async function verifyApiKey(token) {
  if (!token || typeof token !== 'string' || !token.startsWith(TOKEN_PREFIX)) {
    return null;
  }
  if (token.length < PREFIX_LEN) return null;

  const prefix = token.slice(0, PREFIX_LEN);
  const supa = getSupabaseAdmin();

  const { data: candidates, error } = await supa
    .from('api_keys')
    .select('id, organization_id, key_hash, scopes, revoked_at, expires_at')
    .eq('prefix', prefix)
    .is('revoked_at', null);

  if (error || !candidates || candidates.length === 0) return null;

  const now = Date.now();
  for (const row of candidates) {
    if (row.expires_at && new Date(row.expires_at).getTime() < now) continue;
    // bcrypt compare en temps constant
    const match = await bcrypt.compare(token, row.key_hash);
    if (match) {
      return {
        id: row.id,
        orgId: row.organization_id,
        scopes: Array.isArray(row.scopes) ? row.scopes : [],
      };
    }
  }
  return null;
}

/**
 * Met à jour le timestamp `last_used_at` (best-effort, non bloquant).
 * @param {string} apiKeyId
 */
async function touchLastUsed(apiKeyId) {
  if (!apiKeyId) return;
  try {
    const supa = getSupabaseAdmin();
    await supa
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyId);
  } catch {
    // silencieux : un fail ici ne doit jamais bloquer la requête API
  }
}

module.exports = {
  generateApiKey,
  verifyApiKey,
  touchLastUsed,
  TOKEN_PREFIX,
};
