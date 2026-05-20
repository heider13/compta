// API publique v1 — endpoints versionnés pour partenaires.
// Authentification : Bearer sk_live_xxx via le middleware api-auth.
// Rate limit : 100 req/min par API key (in-memory, prod = Redis recommandé).

const express = require('express');
const router = express.Router();
const { getSupabaseAdmin } = require('../lib/db');
const { dispatchEvent } = require('../lib/webhook-dispatcher');

// ─── Rate limit in-memory ──────────────────────────────
const buckets = new Map(); // apiKeyId -> { count, resetAt }
function rateLimit(req, res, next) {
  const id = req.apiKey?.id;
  if (!id) return next();
  const now = Date.now();
  const b = buckets.get(id);
  if (!b || now > b.resetAt) {
    buckets.set(id, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  if (b.count >= 100) {
    return res.status(429).json({ error: 'rate_limit_exceeded', retry_after_seconds: Math.ceil((b.resetAt - now) / 1000) });
  }
  b.count++;
  next();
}
router.use(rateLimit);

// Helper
function orgId(req) { return req.apiKeyOrg; }

// ─── Cabinet (auto-introspection) ─────────────────────
router.get('/cabinet', async (req, res) => {
  const { data, error } = await getSupabaseAdmin()
    .from('organizations')
    .select('id, name, slug, siren, plan, created_at')
    .eq('id', orgId(req))
    .single();
  if (error) return res.status(404).json({ error: 'not_found' });
  res.json(data);
});

router.get('/cabinet/members', async (req, res) => {
  const { data } = await getSupabaseAdmin()
    .from('memberships')
    .select('user_id, role, joined_at')
    .eq('organization_id', orgId(req));
  res.json({ items: data || [] });
});

// ─── Clients ──────────────────────────────────────────
router.get('/clients', async (req, res) => {
  const { data, error } = await getSupabaseAdmin()
    .from('clients')
    .select('*')
    .eq('organization_id', orgId(req))
    .is('archived_at', null)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ items: data || [] });
});

router.post('/clients', async (req, res) => {
  const { denomination, siren, forme_juridique, code_naf, contact_email, contact_phone } = req.body || {};
  if (!denomination) return res.status(400).json({ error: 'missing_denomination' });
  const { data, error } = await getSupabaseAdmin()
    .from('clients')
    .insert({ organization_id: orgId(req), denomination, siren, forme_juridique, code_naf, contact_email, contact_phone, source: 'api' })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  dispatchEvent(orgId(req), 'client.created', data).catch(() => null);
  res.status(201).json(data);
});

router.get('/clients/:id', async (req, res) => {
  const { data, error } = await getSupabaseAdmin()
    .from('clients')
    .select('*')
    .eq('id', req.params.id)
    .eq('organization_id', orgId(req))
    .single();
  if (error) return res.status(404).json({ error: 'not_found' });
  res.json(data);
});

router.put('/clients/:id', async (req, res) => {
  const allowed = ['denomination', 'siren', 'forme_juridique', 'code_naf', 'contact_email', 'contact_phone', 'contact_first_name', 'contact_last_name'];
  const patch = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
  const { data, error } = await getSupabaseAdmin()
    .from('clients')
    .update(patch)
    .eq('id', req.params.id)
    .eq('organization_id', orgId(req))
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/clients/:id', async (req, res) => {
  await getSupabaseAdmin()
    .from('clients')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('organization_id', orgId(req));
  res.status(204).end();
});

// ─── Dossiers ─────────────────────────────────────────
router.get('/dossiers', async (req, res) => {
  let q = getSupabaseAdmin()
    .from('dossiers')
    .select('*')
    .eq('organization_id', orgId(req))
    .order('updated_at', { ascending: false });
  if (req.query.statut) q = q.in('statut', String(req.query.statut).split(','));
  if (req.query.type_formalite) q = q.eq('type_formalite', req.query.type_formalite);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ items: data || [] });
});

router.post('/dossiers', async (req, res) => {
  const { client_name, type_formalite, forme_juridique, client_id, inpi_content } = req.body || {};
  if (!client_name || !type_formalite) return res.status(400).json({ error: 'missing_fields' });
  const ref = `API-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await getSupabaseAdmin()
    .from('dossiers')
    .insert({
      organization_id: orgId(req),
      reference: ref,
      client_name, type_formalite, forme_juridique, client_id, inpi_content,
      statut: 'DRAFT',
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  dispatchEvent(orgId(req), 'dossier.created', data).catch(() => null);
  res.status(201).json(data);
});

router.get('/dossiers/:id', async (req, res) => {
  const { data, error } = await getSupabaseAdmin()
    .from('dossiers')
    .select('*')
    .eq('id', req.params.id)
    .eq('organization_id', orgId(req))
    .single();
  if (error) return res.status(404).json({ error: 'not_found' });
  res.json(data);
});

router.put('/dossiers/:id', async (req, res) => {
  const allowed = ['client_name', 'inpi_content', 'priority', 'internal_due_date', 'tags', 'assigned_to'];
  const patch = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
  const { data, error } = await getSupabaseAdmin()
    .from('dossiers')
    .update(patch)
    .eq('id', req.params.id)
    .eq('organization_id', orgId(req))
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── Webhooks (management) ────────────────────────────
router.get('/webhooks', async (req, res) => {
  const { data } = await getSupabaseAdmin()
    .from('webhooks')
    .select('id, url, events, active, last_triggered_at, failure_count, created_at')
    .eq('organization_id', orgId(req));
  res.json({ items: data || [] });
});

router.post('/webhooks', async (req, res) => {
  const { url, events } = req.body || {};
  if (!url || !Array.isArray(events) || events.length === 0) return res.status(400).json({ error: 'missing_fields' });
  const crypto = require('crypto');
  const secret = crypto.randomBytes(32).toString('hex');
  const { data, error } = await getSupabaseAdmin()
    .from('webhooks')
    .insert({ organization_id: orgId(req), url, events, secret })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ ...data, secret });
});

router.delete('/webhooks/:id', async (req, res) => {
  await getSupabaseAdmin()
    .from('webhooks')
    .delete()
    .eq('id', req.params.id)
    .eq('organization_id', orgId(req));
  res.status(204).end();
});

module.exports = router;
