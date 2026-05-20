// Client Yousign API v3 — signature électronique avancée RGS.
// Doc : https://developers.yousign.com/reference (REST v3)
//
// Variables d'env :
//   YOUSIGN_API_KEY  (Bearer, obligatoire)
//   YOUSIGN_BASE_URL (default https://api-sandbox.yousign.app/v3)
//
// Tous les appels :
//   - timeout 30s (AbortController)
//   - 1 retry sur erreur réseau (TypeError / AbortError / 5xx)
//   - throw Error structurée avec .status et .payload sur 4xx/5xx

const DEFAULT_BASE = 'https://api-sandbox.yousign.app/v3';
const TIMEOUT_MS = 30_000;
const RETRY_MAX = 1;

function getConfig() {
  const apiKey = process.env.YOUSIGN_API_KEY;
  if (!apiKey) {
    const err = new Error(
      'YOUSIGN_API_KEY manquant — impossible d\'appeler l\'API Yousign. ' +
        'Voir SETUP-YOUSIGN.md',
    );
    err.status = 500;
    err.code = 'yousign_not_configured';
    throw err;
  }
  return {
    apiKey,
    baseUrl: (process.env.YOUSIGN_BASE_URL || DEFAULT_BASE).replace(/\/+$/, ''),
  };
}

function isRetryable(err, res) {
  if (res && res.status >= 500) return true;
  // network-level: AbortError (timeout) ou TypeError (fetch failed)
  if (err && (err.name === 'AbortError' || err.name === 'TypeError')) return true;
  return false;
}

async function fetchWithTimeout(url, init) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function ysFetch(path, { method = 'GET', headers = {}, body, isMultipart = false, raw = false } = {}) {
  const { apiKey, baseUrl } = getConfig();
  const url = `${baseUrl}${path}`;

  const baseHeaders = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'User-Agent': 'compta-proxy/0.1 (yousign-client)',
    ...headers,
  };
  if (!isMultipart && body && !baseHeaders['Content-Type']) {
    baseHeaders['Content-Type'] = 'application/json';
  }

  let attempt = 0;
  let lastErr = null;
  // attempt 0 = initial try, attempt 1 = single retry
  while (attempt <= RETRY_MAX) {
    let res;
    try {
      res = await fetchWithTimeout(url, {
        method,
        headers: baseHeaders,
        body: isMultipart ? body : body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      lastErr = e;
      if (attempt < RETRY_MAX && isRetryable(e, null)) {
        attempt += 1;
        continue;
      }
      const err = new Error(`yousign_network_error: ${e.message}`);
      err.cause = e;
      err.status = 0;
      throw err;
    }

    if (res.status >= 500 && attempt < RETRY_MAX) {
      attempt += 1;
      continue;
    }

    if (raw) return res;

    const ct = res.headers.get('content-type') || '';
    const isJson = ct.includes('application/json') || ct.includes('+json');
    const payload = isJson ? await res.json().catch(() => ({})) : await res.text();
    if (!res.ok) {
      const msg = isJson ? JSON.stringify(payload).slice(0, 500) : String(payload).slice(0, 500);
      const err = new Error(`yousign ${res.status}: ${msg}`);
      err.status = res.status;
      err.payload = payload;
      throw err;
    }
    return payload;
  }
  // Should not reach here
  throw lastErr || new Error('yousign_unknown_error');
}

// ─── Endpoints ────────────────────────────────────────────

// POST /signature_requests
async function createSignatureRequest({ name, deliveryMode = 'email' }) {
  if (!name) throw new Error('createSignatureRequest: name required');
  return ysFetch('/signature_requests', {
    method: 'POST',
    body: {
      name,
      delivery_mode: deliveryMode,
      timezone: 'Europe/Paris',
    },
  });
}

// POST /signature_requests/:id/documents (multipart/form-data)
async function uploadDocument(signatureRequestId, { filename, base64Pdf, nature = 'signable_document' }) {
  if (!signatureRequestId) throw new Error('uploadDocument: signatureRequestId required');
  if (!base64Pdf) throw new Error('uploadDocument: base64Pdf required');
  if (!filename) throw new Error('uploadDocument: filename required');

  const pdfBuffer = Buffer.from(base64Pdf, 'base64');
  // Blob / FormData natifs Node 20+
  const form = new FormData();
  form.append('nature', nature);
  // filename est important : Yousign le réutilise pour le PDF final
  form.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), filename);

  return ysFetch(`/signature_requests/${encodeURIComponent(signatureRequestId)}/documents`, {
    method: 'POST',
    body: form,
    isMultipart: true,
  });
}

// POST /signature_requests/:id/signers
// fields: [{ document_id, type: 'signature', page: 1, x: 100, y: 700, width: 200, height: 50 }]
async function addSigner(signatureRequestId, { firstName, lastName, email, phoneNumber, fields = [] }) {
  if (!signatureRequestId) throw new Error('addSigner: signatureRequestId required');
  if (!firstName || !lastName || !email) {
    throw new Error('addSigner: firstName, lastName, email required');
  }

  const info = {
    first_name: firstName,
    last_name: lastName,
    email,
    locale: 'fr',
  };
  if (phoneNumber) info.phone_number = phoneNumber;

  const body = {
    info,
    // signature_level :
    //   'electronic_signature' = simple (default)
    //   'advanced_electronic_signature' = avancée (eIDAS / RGS** équivalent)
    // Pour la modification/cessation INPI on veut "advanced".
    signature_level: 'advanced_electronic_signature',
    // Authentification supplémentaire : OTP SMS si téléphone fourni
    signature_authentication_mode: phoneNumber ? 'otp_sms' : 'no_otp',
    fields,
  };

  return ysFetch(`/signature_requests/${encodeURIComponent(signatureRequestId)}/signers`, {
    method: 'POST',
    body,
  });
}

// POST /signature_requests/:id/activate
async function activate(signatureRequestId) {
  if (!signatureRequestId) throw new Error('activate: signatureRequestId required');
  return ysFetch(`/signature_requests/${encodeURIComponent(signatureRequestId)}/activate`, {
    method: 'POST',
  });
}

// GET /signature_requests/:id
async function getStatus(signatureRequestId) {
  if (!signatureRequestId) throw new Error('getStatus: signatureRequestId required');
  return ysFetch(`/signature_requests/${encodeURIComponent(signatureRequestId)}`, {
    method: 'GET',
  });
}

// GET /signature_requests/:id/documents/:doc_id/download
// Renvoie un Buffer (PDF binaire)
async function downloadSignedDocument(signatureRequestId, documentId) {
  if (!signatureRequestId || !documentId) {
    throw new Error('downloadSignedDocument: signatureRequestId and documentId required');
  }
  const res = await ysFetch(
    `/signature_requests/${encodeURIComponent(signatureRequestId)}/documents/${encodeURIComponent(documentId)}/download`,
    { method: 'GET', raw: true },
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    const err = new Error(`yousign download ${res.status}: ${txt.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

module.exports = {
  createSignatureRequest,
  uploadDocument,
  addSigner,
  activate,
  getStatus,
  downloadSignedDocument,
};
