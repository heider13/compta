// Wrapper minimal autour de l'API Guichet Unique INPI.
// Utilise un compte mandataire partagé (creds dans les env vars).

const BASE = process.env.INPI_BASE_URL || 'https://guichet-unique.inpi.fr';

// Deux modes d'auth INPI :
//   - "API only" : token JWT renvoyé dans le body → Authorization: Bearer
//   - utilisateur interface : Set-Cookie: BEARER=<jwt> → Cookie: BEARER=<jwt>
let cachedAuth = null;           // { kind: 'bearer' | 'cookie', value: string }
let cachedAuthExpiry = 0;

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; ComptaApp/0.1; +https://compta-navy.vercel.app)',
  'Accept': 'application/json, application/ld+json, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

async function login() {
  const username = process.env.INPI_USERNAME;
  const password = process.env.INPI_PASSWORD;
  if (!username || !password) {
    throw new Error('INPI_USERNAME / INPI_PASSWORD non configurés sur Vercel');
  }

  const res = await fetch(`${BASE}/api/user/login/sso`, {
    method: 'POST',
    headers: { ...DEFAULT_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`INPI login ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json().catch(() => ({}));

  if (data && data.token) {
    return { kind: 'bearer', value: data.token };
  }

  const setCookie = res.headers.get('set-cookie') || '';
  const m = setCookie.match(/BEARER=([^;]+)/i);
  if (m) {
    return { kind: 'cookie', value: m[1] };
  }

  throw new Error(`INPI login: ni token JSON ni cookie BEARER (body keys: ${Object.keys(data || {}).join(',') || 'none'})`);
}

async function getAuth() {
  const now = Date.now();
  if (cachedAuth && now < cachedAuthExpiry) return cachedAuth;
  cachedAuth = await login();
  cachedAuthExpiry = now + 50 * 60 * 1000;
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
      if (Array.isArray(v)) v.forEach(item => url.searchParams.append(`${k}[]`, item));
      else url.searchParams.set(k, v);
    }
  }

  const buildHeaders = (a) => applyAuth(a, {
    ...DEFAULT_HEADERS,
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...headers,
  });

  const res = await fetch(url, {
    method,
    headers: buildHeaders(auth),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    cachedAuth = null;
    cachedAuthExpiry = 0;
    const retryAuth = await getAuth();
    const retry = await fetch(url, {
      method,
      headers: buildHeaders(retryAuth),
      body: body ? JSON.stringify(body) : undefined,
    });
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

module.exports = {
  request,
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
  getSynthesis: (formalityId) => request(`/api/formalities/${formalityId}/synthesis`),
};
