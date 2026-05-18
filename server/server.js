// Compta proxy — forwards INPI Guichet Unique calls from a French IP.
// Behind Caddy (HTTPS) on the OVH VPS. Listens on 127.0.0.1:3000.

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const inpi = require('./inpi');

const app = express();
app.set('trust proxy', 'loopback');
app.use(express.json({ limit: '15mb' }));

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'https://compta-navy.vercel.app,http://localhost:3000,http://localhost:3001')
  .split(',')
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(new URL(origin).hostname)) return cb(null, true);
      cb(new Error(`CORS: ${origin} not allowed`));
    },
    credentials: false,
  }),
);

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function requireUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'invalid_token' });
  req.user = data.user;
  next();
}

function mapFormality(f) {
  if (!f) return null;
  return {
    id: f.id,
    liasseNumber: f.liasseNumber,
    companyName: f.companyName,
    typeFormalite: f.typeFormalite,
    status: f.status,
    statusDate: f.statusDate,
    signedDate: f.signedDate,
    referenceMandataire: f.referenceMandataire,
    nomDossier: f.nomDossier,
    amount: f.cart?.total,
    updated: f.updated,
  };
}

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.get(
  '/api/inpi-status',
  requireUser,
  asyncRoute(async (req, res) => {
    const list = await inpi.listFormalities({ itemsPerPage: 1 });
    res.json({
      ok: true,
      env: BASE_LOOKS_PROD() ? 'prod' : 'demo',
      totalFormalitiesIfAny: list?.['hydra:totalItems'] ?? null,
    });
  }),
);

app.get(
  '/api/formalites',
  requireUser,
  asyncRoute(async (req, res) => {
    const { status, typeFormalite, siren, referenceClientMandataire, page, itemsPerPage } = req.query;
    const result = await inpi.listFormalities({
      status: status ? (Array.isArray(status) ? status : [status]) : undefined,
      typeFormalite,
      siren,
      referenceClientMandataire,
      page: page || 1,
      itemsPerPage: itemsPerPage || 20,
      'order[statusDate]': 'desc',
    });
    res.json({
      items: (result?.['hydra:member'] || []).map(mapFormality),
      total: result?.['hydra:totalItems'] || 0,
    });
  }),
);

app.post(
  '/api/formalites',
  requireUser,
  asyncRoute(async (req, res) => {
    const body = req.body || {};
    if (!body.content || !body.companyName) {
      return res.status(400).json({ error: 'missing_fields', required: ['companyName', 'content'] });
    }
    const payload = {
      companyName: body.companyName,
      referenceMandataire: body.referenceMandataire || `compta-${req.user.id.slice(0, 8)}-${Date.now()}`,
      nomDossier: body.nomDossier || body.companyName,
      typeFormalite: body.typeFormalite || 'C',
      typePersonne: 'P',
      diffusionINSEE: body.diffusionINSEE || 'O',
      indicateurEntreeSortieRegistre: body.indicateurEntreeSortieRegistre !== false,
      content: body.content,
      ...(body.observationSignature ? { observationSignature: body.observationSignature } : {}),
      ...(body.numNat ? { numNat: body.numNat } : {}),
    };
    const inpiFormality = await inpi.createFormality(payload);

    const { data: dossier, error } = await supabaseAdmin
      .from('dossiers')
      .insert({
        user_id: req.user.id,
        reference: payload.referenceMandataire,
        client_name: payload.companyName,
        type_formalite: 'CREATION',
        statut: 'RECEIVED',
        inpi_reference: String(inpiFormality?.id || ''),
      })
      .select()
      .single();

    if (error) {
      return res.status(201).json({
        inpi: mapFormality(inpiFormality),
        warning: 'created_on_inpi_but_db_insert_failed',
        detail: error.message,
      });
    }
    res.status(201).json({ inpi: mapFormality(inpiFormality), dossier });
  }),
);

app.get(
  '/api/formalites/:id',
  requireUser,
  asyncRoute(async (req, res) => {
    res.json(await inpi.getFormality(req.params.id));
  }),
);

app.put(
  '/api/formalites/:id',
  requireUser,
  asyncRoute(async (req, res) => {
    res.json(await inpi.updateFormality(req.params.id, req.body));
  }),
);

app.delete(
  '/api/formalites/:id',
  requireUser,
  asyncRoute(async (req, res) => {
    await inpi.deleteFormality(req.params.id);
    res.status(204).end();
  }),
);

app.post(
  '/api/formalites/:id/sign',
  requireUser,
  asyncRoute(async (req, res) => {
    const { signedAttachmentId } = req.body || {};
    res.status(201).json(await inpi.signFormality(req.params.id, signedAttachmentId));
  }),
);

app.get(
  '/api/formalites/:id/attachments',
  requireUser,
  asyncRoute(async (req, res) => {
    res.json(await inpi.listAttachments(req.params.id));
  }),
);

app.post(
  '/api/formalites/:id/attachments',
  requireUser,
  asyncRoute(async (req, res) => {
    const body = req.body || {};
    if (!body.documentBase64 || !body.nomDocument) {
      return res.status(400).json({ error: 'missing_fields', required: ['nomDocument', 'documentBase64'] });
    }
    if (body.documentBase64.length > 14_000_000) {
      return res.status(413).json({ error: 'pdf_too_large', max_size_mb: 10 });
    }
    const data = await inpi.request(`/api/formalities/${req.params.id}/attachments`, {
      method: 'POST',
      body: {
        nomDocument: body.nomDocument,
        typeDocument: body.typeDocument || 'PJ_01',
        langueDocument: body.langueDocument || 'fr',
        documentBase64: body.documentBase64,
        documentExtension: body.documentExtension || 'pdf',
        ...(body.path ? { path: body.path } : {}),
        ...(body.numeroPiece ? { numeroPiece: body.numeroPiece } : {}),
      },
    });
    res.status(201).json(data);
  }),
);

app.get(
  '/api/formalites/:id/synthesis',
  requireUser,
  asyncRoute(async (req, res) => {
    const r = await inpi.rawFetch(`/api/formalities/${req.params.id}/synthesis`);
    if (r.status === 404) return res.status(404).json({ error: 'synthesis_not_found' });
    if (!r.ok) {
      const txt = await r.text();
      return res.status(502).json({ error: 'inpi_request_failed', status: r.status, detail: txt.slice(0, 300) });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="synthese-${req.params.id}.pdf"`);
    res.status(200).end(Buffer.from(await r.arrayBuffer()));
  }),
);

app.use((err, req, res, _next) => {
  console.error(`[ERR] ${req.method} ${req.path}:`, err.message);
  res.status(err.status || 500).json({
    error: err.status ? 'inpi_request_failed' : 'internal_error',
    detail: String(err.message),
    payload: err.payload,
  });
});

function BASE_LOOKS_PROD() {
  return (process.env.INPI_BASE_URL || '').includes('guichet-unique.inpi.fr') &&
    !(process.env.INPI_BASE_URL || '').includes('demo');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[compta-proxy] listening on 127.0.0.1:${PORT} — INPI: ${process.env.INPI_BASE_URL}`);
});
