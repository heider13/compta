// Wrapper INPI — gère les 2 modes d'auth (Bearer ou Cookie BEARER)
const BASE = process.env.INPI_BASE_URL || 'https://guichet-unique.inpi.fr';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; ComptaProxy/0.1)',
  'Accept': 'application/json, application/ld+json, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

let cachedAuth = null;
let cachedAuthExpiry = 0;

async function login() {
  const username = process.env.INPI_USERNAME;
  const password = process.env.INPI_PASSWORD;
  if (!username || !password) throw new Error('INPI_USERNAME / INPI_PASSWORD manquants');

  const res = await fetch(`${BASE}/api/user/login/sso`, {
    method: 'POST',
    headers: { ...DEFAULT_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
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

  throw new Error(`INPI login: ni token JSON ni cookie BEARER (keys=${Object.keys(data || {}).join(',') || 'none'})`);
}

async function getAuth() {
  if (cachedAuth && Date.now() < cachedAuthExpiry) return cachedAuth;
  cachedAuth = await login();
  cachedAuthExpiry = Date.now() + 50 * 60 * 1000;
  return cachedAuth;
}

function applyAuth(auth, headers = {}) {
  if (auth.kind === 'bearer') return { ...headers, Authorization: `Bearer ${auth.value}` };
  return { ...headers, Cookie: `BEARER=${auth.value}` };
}

async function request(path, { method = 'GET', body, query, headers = {} } = {}) {
  const auth = await getAuth();
  const url = new URL(path.startsWith('http') ? path : `${BASE}${path}`);
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

  const res = await fetch(url, { method, headers: build(auth), body: body ? JSON.stringify(body) : undefined });

  if (res.status === 401) {
    cachedAuth = null;
    cachedAuthExpiry = 0;
    const retryAuth = await getAuth();
    const retry = await fetch(url, { method, headers: build(retryAuth), body: body ? JSON.stringify(body) : undefined });
    return parseResponse(retry);
  }
  return parseResponse(res);
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

async function rawFetch(path, opts = {}) {
  const auth = await getAuth();
  const headers = applyAuth(auth, { ...DEFAULT_HEADERS, ...(opts.headers || {}) });
  return fetch(`${BASE}${path}`, { ...opts, headers });
}

module.exports = {
  request,
  rawFetch,
  listFormalities: (params) => request('/api/formalities', { query: params }),
  getFormality: (id, opts) => request(`/api/formalities/${id}`, { query: opts }),
  createFormality: (body) => request('/api/formalities', { method: 'POST', body }),
  updateFormality: (id, body) => request(`/api/formalities/${id}`, { method: 'PUT', body }),
  deleteFormality: (id) => request(`/api/formalities/${id}`, { method: 'DELETE' }),
  signFormality: (formalityId, signedAttachmentId) =>
    request('/api/signatures', {
      method: 'POST',
      body: {
        formality: `/api/formalities/${formalityId}`,
        ...(signedAttachmentId ? { signedDocument: `/api/attachments/${signedAttachmentId}` } : {}),
      },
    }),
  listAttachments: (formalityId) => request(`/api/formalities/${formalityId}/attachments`),
};
