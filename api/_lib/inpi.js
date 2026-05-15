// Wrapper minimal autour de l'API Guichet Unique INPI.
// Utilise un compte mandataire partagé (creds dans les env vars).

const BASE = process.env.INPI_BASE_URL || 'https://guichet-unique-demo.inpi.fr';

let cachedToken = null;
let cachedTokenExpiry = 0;

async function login() {
  const username = process.env.INPI_USERNAME;
  const password = process.env.INPI_PASSWORD;
  if (!username || !password) {
    throw new Error('INPI_USERNAME / INPI_PASSWORD non configurés sur Vercel');
  }

  const res = await fetch(`${BASE}/api/user/login/sso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`INPI login ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  if (!data.token) throw new Error('INPI login: token manquant dans la réponse');
  return data.token;
}

async function getToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiry) return cachedToken;
  cachedToken = await login();
  cachedTokenExpiry = now + 50 * 60 * 1000;
  return cachedToken;
}

async function request(path, { method = 'GET', body, query, headers = {} } = {}) {
  const token = await getToken();
  const url = new URL(path.startsWith('http') ? path : `${BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v == null) continue;
      if (Array.isArray(v)) v.forEach(item => url.searchParams.append(`${k}[]`, item));
      else url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    cachedToken = null;
    cachedTokenExpiry = 0;
    const retryToken = await getToken();
    const retry = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${retryToken}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
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
