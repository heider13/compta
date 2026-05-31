// Wrapper INPI — gère les 2 modes d'auth (Bearer ou Cookie BEARER) et les creds
// par cabinet. Utiliser `inpi.forOrg(orgId)` pour qu'INPI soit appelé avec les
// identifiants du cabinet propriétaire du dossier.
//
// L'API legacy (`inpi.request(...)` etc.) reste exposée et utilise les
// `process.env.INPI_USERNAME/PASSWORD` globaux — fallback pour les chemins pas
// encore migrés. Un warning console s'affiche au premier usage pour aider à
// repérer les call sites à migrer.

const { decrypt } = require('./lib/encryption');
const { getSupabaseAdmin } = require('./lib/db');

const PROD_BASE = 'https://guichet-unique.inpi.fr';
const DEMO_BASE = 'https://procedures-demo.inpi.fr';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; ComptaProxy/0.1)',
  Accept: 'application/json, application/ld+json, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

// Cache d'authentification par cabinet. Clé : orgId (ou '__global__' pour le
// fallback env-var). Valeur : { auth, baseUrl, expiry }.
const authCache = new Map();
const AUTH_TTL_MS = 50 * 60 * 1000;

let _legacyWarned = false;

function resolveBaseUrl(env, orgId) {
  // Pour le fallback global : INPI_BASE_URL gagne s'il est défini (compat existante).
  if (!orgId && process.env.INPI_BASE_URL) return process.env.INPI_BASE_URL;
  return env === 'demo' ? DEMO_BASE : PROD_BASE;
}

async function resolveCreds(orgId) {
  if (!orgId) {
    const username = process.env.INPI_USERNAME;
    const password = process.env.INPI_PASSWORD;
    if (!username || !password) {
      const err = new Error('INPI_USERNAME / INPI_PASSWORD manquants (et aucun orgId fourni)');
      err.status = 412;
      err.code = 'inpi_credentials_missing';
      throw err;
    }
    if (!_legacyWarned) {
      console.warn(
        '[inpi] appel legacy sans orgId — fallback sur INPI_USERNAME/PASSWORD globaux. ' +
          'Migrer les call sites vers inpi.forOrg(orgId).method(...)',
      );
      _legacyWarned = true;
    }
    return { username, password, env: 'prod' };
  }

  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from('organizations')
    .select('inpi_username, inpi_password_encrypted, inpi_env')
    .eq('id', orgId)
    .single();

  if (error || !data?.inpi_username || !data?.inpi_password_encrypted) {
    const err = new Error(`Identifiants INPI non configurés pour le cabinet ${orgId}`);
    err.status = 412;
    err.code = 'inpi_credentials_missing';
    err.orgId = orgId;
    throw err;
  }

  let password;
  try {
    password = decrypt(data.inpi_password_encrypted);
  } catch (e) {
    const err = new Error(`Échec du déchiffrement des creds INPI cabinet ${orgId}: ${e.message}`);
    err.status = 500;
    err.code = 'inpi_decrypt_failed';
    throw err;
  }

  return {
    username: data.inpi_username,
    password,
    env: data.inpi_env === 'demo' ? 'demo' : 'prod',
  };
}

async function login(creds, baseUrl) {
  const res = await fetch(`${baseUrl}/api/user/login/sso`, {
    method: 'POST',
    headers: { ...DEFAULT_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: creds.username, password: creds.password }),
  });

  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`INPI login ${res.status}: ${txt.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (data && data.token) return { kind: 'bearer', value: data.token };

  const m = (res.headers.get('set-cookie') || '').match(/BEARER=([^;]+)/i);
  if (m) return { kind: 'cookie', value: m[1] };

  throw new Error(
    `INPI login: ni token JSON ni cookie BEARER (keys=${Object.keys(data || {}).join(',') || 'none'})`,
  );
}

async function getAuthFor(orgId) {
  const key = orgId || '__global__';
  const cached = authCache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return { auth: cached.auth, baseUrl: cached.baseUrl };
  }
  const creds = await resolveCreds(orgId);
  const baseUrl = resolveBaseUrl(creds.env, orgId);
  const auth = await login(creds, baseUrl);
  authCache.set(key, { auth, baseUrl, expiry: Date.now() + AUTH_TTL_MS });
  return { auth, baseUrl };
}

function invalidateAuth(orgId) {
  authCache.delete(orgId || '__global__');
}

function applyAuth(auth, headers = {}) {
  if (auth.kind === 'bearer') return { ...headers, Authorization: `Bearer ${auth.value}` };
  return { ...headers, Cookie: `BEARER=${auth.value}` };
}

async function parseResponse(res) {
  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json') || ct.includes('ld+json');
  const payload = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = isJson ? JSON.stringify(payload).slice(0, 500) : String(payload).slice(0, 500);
    const err = new Error(`INPI ${res.status}: ${msg}`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

async function requestImpl(orgId, path, { method = 'GET', body, query, headers = {} } = {}) {
  const { auth, baseUrl } = await getAuthFor(orgId);
  const url = new URL(path.startsWith('http') ? path : `${baseUrl}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v == null) continue;
      if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(`${k}[]`, item));
      else url.searchParams.set(k, v);
    }
  }

  const build = (a) =>
    applyAuth(a, {
      ...DEFAULT_HEADERS,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    });

  const res = await fetch(url, {
    method,
    headers: build(auth),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    invalidateAuth(orgId);
    const { auth: retryAuth } = await getAuthFor(orgId);
    const retry = await fetch(url, {
      method,
      headers: build(retryAuth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return parseResponse(retry);
  }
  return parseResponse(res);
}

async function rawFetchImpl(orgId, path, opts = {}) {
  const { auth, baseUrl } = await getAuthFor(orgId);
  const headers = applyAuth(auth, { ...DEFAULT_HEADERS, ...(opts.headers || {}) });
  return fetch(`${baseUrl}${path}`, { ...opts, headers });
}

function makeClient(orgId) {
  return {
    request: (path, opts) => requestImpl(orgId, path, opts),
    rawFetch: (path, opts) => rawFetchImpl(orgId, path, opts),
    listFormalities: (params) => requestImpl(orgId, '/api/formalities', { query: params }),
    getFormality: (id, opts) => requestImpl(orgId, `/api/formalities/${id}`, { query: opts }),
    createFormality: (body) => requestImpl(orgId, '/api/formalities', { method: 'POST', body }),
    updateFormality: (id, body) => requestImpl(orgId, `/api/formalities/${id}`, { method: 'PUT', body }),
    deleteFormality: (id) => requestImpl(orgId, `/api/formalities/${id}`, { method: 'DELETE' }),
    signFormality: (formalityId, signedAttachmentId) =>
      requestImpl(orgId, '/api/signatures', {
        method: 'POST',
        body: {
          formality: `/api/formalities/${formalityId}`,
          ...(signedAttachmentId
            ? { signedDocument: `/api/attachments/${signedAttachmentId}` }
            : {}),
        },
      }),
    listAttachments: (formalityId) => requestImpl(orgId, `/api/formalities/${formalityId}/attachments`),
  };
}

function forOrg(orgId) {
  if (!orgId) throw new Error('inpi.forOrg(orgId) : orgId requis');
  return makeClient(orgId);
}

const legacyClient = makeClient(null);

module.exports = {
  forOrg,
  invalidateAuth,
  request: legacyClient.request,
  rawFetch: legacyClient.rawFetch,
  listFormalities: legacyClient.listFormalities,
  getFormality: legacyClient.getFormality,
  createFormality: legacyClient.createFormality,
  updateFormality: legacyClient.updateFormality,
  deleteFormality: legacyClient.deleteFormality,
  signFormality: legacyClient.signFormality,
  listAttachments: legacyClient.listAttachments,
};
