// Middleware d'authentification pour l'API publique v1.
// - Lit `Authorization: Bearer sk_live_xxx`
// - Vérifie via `lib/api-keys`
// - Décore `req` avec `apiKeyId`, `apiKeyOrg`, `apiKeyScopes`
// - Update `last_used_at` (best-effort, fire-and-forget)
// - Applique un rate limit basique 100 req/min par clé (in-memory, MVP)
//
// Pour la production réelle, le rate-limit doit être remplacé par Redis
// (Cloudflare KV, Upstash, etc.) — voir SETUP-WHITELABEL.md.

const { verifyApiKey, touchLastUsed } = require('../lib/api-keys');

// ─── Rate limit in-memory ─────────────────────────────────────────
// Structure : Map<apiKeyId, { count: number, windowStartMs: number }>
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 100;
const rateLimitState = new Map();

function checkRateLimit(apiKeyId) {
  const now = Date.now();
  const current = rateLimitState.get(apiKeyId);
  if (!current || now - current.windowStartMs >= RATE_LIMIT_WINDOW_MS) {
    rateLimitState.set(apiKeyId, { count: 1, windowStartMs: now });
    return { ok: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  if (current.count >= RATE_LIMIT_MAX) {
    return {
      ok: false,
      remaining: 0,
      resetIn: RATE_LIMIT_WINDOW_MS - (now - current.windowStartMs),
    };
  }
  current.count++;
  return {
    ok: true,
    remaining: RATE_LIMIT_MAX - current.count,
    resetIn: RATE_LIMIT_WINDOW_MS - (now - current.windowStartMs),
  };
}

// Nettoyage périodique des compteurs anciens (évite de garder de la RAM)
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of rateLimitState.entries()) {
    if (now - entry.windowStartMs >= RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitState.delete(id);
    }
  }
}, RATE_LIMIT_WINDOW_MS).unref?.();

async function apiKeyAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_api_key', detail: 'Authorization: Bearer <token> requis' });
  }
  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'missing_api_key' });
  }

  const verified = await verifyApiKey(token);
  if (!verified) {
    return res.status(401).json({ error: 'invalid_api_key' });
  }

  // Rate limit
  const rl = checkRateLimit(verified.id);
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
  res.setHeader('X-RateLimit-Remaining', rl.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(rl.resetIn / 1000));
  if (!rl.ok) {
    return res.status(429).json({
      error: 'rate_limit_exceeded',
      limit: RATE_LIMIT_MAX,
      window_seconds: RATE_LIMIT_WINDOW_MS / 1000,
    });
  }

  req.apiKeyId = verified.id;
  req.apiKeyOrg = verified.orgId;
  req.apiKeyScopes = verified.scopes;

  // Fire-and-forget : on ne bloque pas la requête sur ce write.
  touchLastUsed(verified.id).catch(() => {});

  next();
}

/**
 * Vérifie qu'un scope particulier est présent sur la clé.
 * Usage : `router.post('/v1/clients', requireScope('write'), handler)`
 */
function requireScope(scope) {
  return (req, res, next) => {
    const scopes = req.apiKeyScopes || [];
    // 'admin' implique tous les scopes
    if (scopes.includes('admin') || scopes.includes(scope)) return next();
    return res.status(403).json({ error: 'insufficient_scope', required: scope, scopes });
  };
}

module.exports = { apiKeyAuth, requireScope };
