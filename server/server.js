// Compta proxy — forwards INPI Guichet Unique calls from a French IP.
// Behind Caddy (HTTPS) on the OVH VPS. Listens on 127.0.0.1:3000.

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const inpi = require('./inpi');
const inpiCredsRoutes = require('./routes/inpi-creds');
const pappersRoutes = require('./routes/pappers');
const signatureRoutes = require('./routes/signatures');
const yousignWebhookRoutes = require('./routes/yousign-webhook');

const app = express();
app.set('trust proxy', 'loopback');

// Webhook Yousign : body brut nécessaire pour vérifier la signature HMAC.
// DOIT être monté AVANT express.json() pour court-circuiter le parsing JSON global.
app.use('/api/yousign', express.raw({ type: '*/*', limit: '15mb' }), yousignWebhookRoutes);

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
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, first_name, last_name')
    .eq('id', data.user.id)
    .single();
  req.profile = profile || { role: 'client', first_name: null, last_name: null };

  // Charge les memberships (multi-tenant)
  const { data: memberships } = await supabaseAdmin
    .from('memberships')
    .select('organization_id, role')
    .eq('user_id', data.user.id);
  req.memberships = memberships || [];

  // Org courante : header x-organization-id si fourni et user est membre, sinon la 1ère
  const headerOrg = req.headers['x-organization-id'];
  if (headerOrg && req.memberships.some((m) => m.organization_id === headerOrg)) {
    req.currentOrgId = headerOrg;
    req.currentOrgRole = req.memberships.find((m) => m.organization_id === headerOrg).role;
  } else if (req.memberships.length > 0) {
    req.currentOrgId = req.memberships[0].organization_id;
    req.currentOrgRole = req.memberships[0].role;
  } else {
    req.currentOrgId = null;
    req.currentOrgRole = null;
  }

  next();
}

function requireOrg(req, res, next) {
  if (!req.currentOrgId) return res.status(403).json({ error: 'no_organization' });
  next();
}

function requireAdmin(req, res, next) {
  if (req.profile?.role !== 'admin') return res.status(403).json({ error: 'admin_required' });
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

// Types de formalité qui exigent une signature électronique avancée
// (eIDAS / RGS** équivalent) avant transmission à l'INPI :
// modification, radiation/cessation, comptes annuels, bénéficiaires effectifs.
// La création de société accepte une signature simple côté INPI.
const SIG_REQUIRED_TYPES = new Set(['MODIFICATION', 'RADIATION']);

function requiresAdvancedSignature(typeFormalite) {
  return SIG_REQUIRED_TYPES.has(typeFormalite);
}

function isDossierSigned(dossier) {
  const meta = dossier?.metadata || {};
  return meta.signature_status === 'signed' && Boolean(meta.signature_request_id);
}

app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.get(
  '/api/me',
  requireUser,
  (req, res) => {
    res.json({
      id: req.user.id,
      email: req.user.email,
      role: req.profile.role,
      first_name: req.profile.first_name,
      last_name: req.profile.last_name,
    });
  },
);

// ─── Admin endpoints ───────────────────────────────────────
app.get(
  '/api/admin/stats',
  requireUser,
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { data: dossiers } = await supabaseAdmin.from('dossiers').select('statut, type_formalite, created_at, user_id');
    const { data: clients } = await supabaseAdmin.from('profiles').select('id, role').eq('role', 'client');
    const byStatut = {};
    const byType = {};
    let last30 = 0;
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    for (const d of dossiers || []) {
      byStatut[d.statut] = (byStatut[d.statut] || 0) + 1;
      byType[d.type_formalite] = (byType[d.type_formalite] || 0) + 1;
      if (new Date(d.created_at).getTime() > cutoff) last30++;
    }
    res.json({
      totalDossiers: (dossiers || []).length,
      totalClients: (clients || []).length,
      byStatut,
      byType,
      newLast30Days: last30,
    });
  }),
);

app.get(
  '/api/admin/clients',
  requireUser,
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { data: clients, error } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, created_at')
      .eq('role', 'client')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });

    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 });
    const emailById = Object.fromEntries((users?.users || []).map((u) => [u.id, u.email]));

    const { data: dossiers } = await supabaseAdmin
      .from('dossiers')
      .select('user_id, statut');
    const countsByUser = {};
    for (const d of dossiers || []) {
      countsByUser[d.user_id] = countsByUser[d.user_id] || { total: 0, active: 0, validated: 0 };
      countsByUser[d.user_id].total++;
      if (['DRAFT', 'AWAITING_VALIDATION', 'INTERNAL_AMENDMENT_PENDING', 'VALIDATED_INTERNAL'].includes(d.statut)) countsByUser[d.user_id].active++;
      if (['VALIDATED', 'VALIDATED_INTERNAL'].includes(d.statut)) countsByUser[d.user_id].validated++;
    }

    res.json({
      items: (clients || []).map((c) => ({
        ...c,
        email: emailById[c.id] || null,
        dossier_counts: countsByUser[c.id] || { total: 0, active: 0, validated: 0 },
      })),
    });
  }),
);

async function attachProfiles(dossiers) {
  if (!dossiers.length) return dossiers;
  const userIds = [...new Set(dossiers.map((d) => d.user_id))];
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', userIds);
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  return dossiers.map((d) => ({ ...d, profiles: byId[d.user_id] || null }));
}

app.get(
  '/api/admin/dossiers',
  requireUser,
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { status } = req.query;
    let q = supabaseAdmin.from('dossiers').select('*').order('updated_at', { ascending: false });
    if (status) q = q.in('statut', Array.isArray(status) ? status : [status]);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.json({ items: await attachProfiles(data || []) });
  }),
);

app.get(
  '/api/admin/dossiers/:id',
  requireUser,
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('dossiers')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: 'not_found' });
    const [withProfile] = await attachProfiles([data]);
    const { data: obs } = await supabaseAdmin
      .from('dossier_observations')
      .select('*')
      .eq('dossier_id', req.params.id)
      .order('created_at', { ascending: true });
    res.json({ dossier: withProfile, observations: obs || [] });
  }),
);

app.post(
  '/api/admin/dossiers/:id/observations',
  requireUser,
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { message } = req.body || {};
    if (!message?.trim()) return res.status(400).json({ error: 'empty_message' });
    const { data, error } = await supabaseAdmin
      .from('dossier_observations')
      .insert({
        dossier_id: req.params.id,
        author_id: req.user.id,
        author_role: 'admin',
        message: message.trim(),
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.status(201).json(data);
  }),
);

app.post(
  '/api/admin/dossiers/:id/request-amendment',
  requireUser,
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { message } = req.body || {};
    if (!message?.trim()) return res.status(400).json({ error: 'empty_message' });
    const { error: obsErr } = await supabaseAdmin
      .from('dossier_observations')
      .insert({
        dossier_id: req.params.id,
        author_id: req.user.id,
        author_role: 'admin',
        message: message.trim(),
      });
    if (obsErr) return res.status(500).json({ error: 'db_error', detail: obsErr.message });
    const { data, error } = await supabaseAdmin
      .from('dossiers')
      .update({ statut: 'INTERNAL_AMENDMENT_PENDING' })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.json({ dossier: data });
  }),
);

app.post(
  '/api/admin/dossiers/:id/validate',
  requireUser,
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { sendToInpi = false } = req.body || {};
    const { data: dossier, error: dErr } = await supabaseAdmin
      .from('dossiers')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (dErr) return res.status(404).json({ error: 'not_found' });
    if (dossier.statut !== 'AWAITING_VALIDATION') {
      return res.status(409).json({ error: 'wrong_status', current: dossier.statut });
    }

    let inpiResult = null;
    let inpiError = null;
    let nextStatus = 'VALIDATED_INTERNAL';

    if (sendToInpi && dossier.inpi_content) {
      // Garde signature : pour les types qui exigent une signature électronique
      // avancée (eIDAS / RGS), on refuse l'envoi à l'INPI tant que le dossier
      // n'a pas été signé via Yousign (webhook signature_request.done).
      if (
        requiresAdvancedSignature(dossier.type_formalite) &&
        !isDossierSigned(dossier)
      ) {
        return res.status(409).json({
          error: 'signature_required',
          detail:
            'Cette formalité exige une signature électronique avancée (eIDAS) avant transmission à l\'INPI.',
          typeFormalite: dossier.type_formalite,
          currentSignatureStatus: dossier.metadata?.signature_status || 'not_started',
        });
      }
      try {
        const payload = {
          companyName: dossier.client_name,
          referenceMandataire: dossier.reference,
          nomDossier: dossier.client_name,
          typeFormalite: dossier.type_formalite === 'CREATION' ? 'C' : dossier.type_formalite === 'MODIFICATION' ? 'M' : 'R',
          typePersonne: 'P',
          diffusionINSEE: 'O',
          indicateurEntreeSortieRegistre: true,
          content: dossier.inpi_content,
        };
        // L'admin valide pour le compte d'un cabinet ; on utilise SES creds INPI.
        // Si le dossier n'est pas rattaché à un cabinet (legacy), on tombe sur les
        // creds globaux du .env via l'API legacy.
        const client = dossier.organization_id ? inpi.forOrg(dossier.organization_id) : inpi;
        inpiResult = await client.createFormality(payload);
        nextStatus = 'RECEIVED';
      } catch (e) {
        inpiError = String(e.message);
        nextStatus = 'VALIDATED_INTERNAL';
      }
    }

    const update = { statut: nextStatus };
    if (inpiResult?.id) update.inpi_reference = String(inpiResult.id);

    const { data: updated, error: uErr } = await supabaseAdmin
      .from('dossiers')
      .update(update)
      .eq('id', req.params.id)
      .select()
      .single();
    if (uErr) return res.status(500).json({ error: 'db_error', detail: uErr.message });

    res.json({ dossier: updated, inpi: inpiResult, inpiError });
  }),
);

// ─── Client endpoints ──────────────────────────────────────
app.get(
  '/api/dossiers',
  requireUser,
  asyncRoute(async (req, res) => {
    const q = supabaseAdmin
      .from('dossiers')
      .select('*')
      .order('updated_at', { ascending: false });
    const filtered = req.profile.role === 'admin' ? q : q.eq('user_id', req.user.id);
    const { data, error } = await filtered;
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.json({ items: data || [] });
  }),
);

app.post(
  '/api/dossiers',
  requireUser,
  asyncRoute(async (req, res) => {
    const { client_name, type_formalite, forme_juridique, client_id, inpi_content, naf_code, siren, assigned_to, priority } = req.body || {};
    if (!client_name || !type_formalite) {
      return res.status(400).json({ error: 'missing_fields', required: ['client_name', 'type_formalite'] });
    }
    if (!['CREATION', 'MODIFICATION', 'RADIATION'].includes(type_formalite)) {
      return res.status(400).json({ error: 'invalid_type_formalite' });
    }
    const validFormes = ['AE', 'EI', 'SASU', 'SAS', 'EURL', 'SARL', 'SCI', 'SA', 'SNC', 'HOLDING', 'AUTRE'];
    if (forme_juridique && !validFormes.includes(forme_juridique)) {
      return res.status(400).json({ error: 'invalid_forme_juridique' });
    }
    const ref = `CMP-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await supabaseAdmin
      .from('dossiers')
      .insert({
        user_id: req.user.id,
        organization_id: req.currentOrgId,
        reference: ref,
        client_name,
        type_formalite,
        statut: 'DRAFT',
        ...(forme_juridique ? { forme_juridique } : {}),
        ...(client_id ? { client_id } : {}),
        ...(inpi_content ? { inpi_content } : {}),
        ...(naf_code ? { naf_code } : {}),
        ...(siren ? { siren } : {}),
        ...(assigned_to ? { assigned_to } : {}),
        ...(priority ? { priority } : {}),
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.status(201).json({ dossier: data });
  }),
);

// ─── Cabinet / org info ────────────────────────────────────
app.get(
  '/api/cabinet',
  requireUser,
  requireOrg,
  asyncRoute(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('id, name, slug, siren, contact_email, plan, white_label_config, inpi_env, created_at')
      .eq('id', req.currentOrgId)
      .single();
    if (error) return res.status(404).json({ error: 'not_found' });
    res.json({ cabinet: data, role: req.currentOrgRole });
  }),
);

app.get(
  '/api/cabinet/members',
  requireUser,
  requireOrg,
  asyncRoute(async (req, res) => {
    const { data: members, error } = await supabaseAdmin
      .from('memberships')
      .select('id, user_id, role, joined_at, invited_at')
      .eq('organization_id', req.currentOrgId)
      .order('joined_at', { ascending: true });
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    const userIds = members.map((m) => m.user_id);
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds);
    const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    res.json({ items: members.map((m) => ({ ...m, profile: byId[m.user_id] || null })) });
  }),
);

// ─── Clients du cabinet (CRM) ──────────────────────────────
app.get(
  '/api/clients',
  requireUser,
  requireOrg,
  asyncRoute(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('organization_id', req.currentOrgId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.json({ items: data || [] });
  }),
);

app.post(
  '/api/clients',
  requireUser,
  requireOrg,
  asyncRoute(async (req, res) => {
    const { siren, denomination, forme_juridique, code_naf, capital_social_cents, date_immatriculation, adresse_siege, contact_email, contact_phone, contact_first_name, contact_last_name, pappers_data, source } = req.body || {};
    if (!denomination) return res.status(400).json({ error: 'missing_fields', required: ['denomination'] });
    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert({
        organization_id: req.currentOrgId,
        siren, denomination, forme_juridique, code_naf, capital_social_cents,
        date_immatriculation, adresse_siege, contact_email, contact_phone,
        contact_first_name, contact_last_name, pappers_data, source: source || 'manual',
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.status(201).json({ client: data });
  }),
);

app.get(
  '/api/clients/:id',
  requireUser,
  requireOrg,
  asyncRoute(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', req.params.id)
      .eq('organization_id', req.currentOrgId)
      .single();
    if (error) return res.status(404).json({ error: 'not_found' });
    const { data: dossiers } = await supabaseAdmin
      .from('dossiers')
      .select('id, reference, type_formalite, forme_juridique, statut, created_at')
      .eq('client_id', req.params.id)
      .order('created_at', { ascending: false });
    res.json({ client: data, dossiers: dossiers || [] });
  }),
);

app.put(
  '/api/clients/:id',
  requireUser,
  requireOrg,
  asyncRoute(async (req, res) => {
    const allowed = ['siren', 'denomination', 'forme_juridique', 'code_naf', 'capital_social_cents', 'date_immatriculation', 'adresse_siege', 'contact_email', 'contact_phone', 'contact_first_name', 'contact_last_name', 'metadata'];
    const patch = {};
    for (const k of allowed) if (k in (req.body || {})) patch[k] = req.body[k];
    const { data, error } = await supabaseAdmin
      .from('clients')
      .update(patch)
      .eq('id', req.params.id)
      .eq('organization_id', req.currentOrgId)
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.json({ client: data });
  }),
);

app.delete(
  '/api/clients/:id',
  requireUser,
  requireOrg,
  asyncRoute(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('clients')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('organization_id', req.currentOrgId);
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.status(204).end();
  }),
);

// ─── Tâches dossier ────────────────────────────────────────
app.get(
  '/api/dossiers/:id/tasks',
  requireUser,
  requireOrg,
  asyncRoute(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('dossier_tasks')
      .select('*')
      .eq('dossier_id', req.params.id)
      .order('done', { ascending: true })
      .order('due_date', { ascending: true, nullsLast: true });
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.json({ items: data || [] });
  }),
);

app.post(
  '/api/dossiers/:id/tasks',
  requireUser,
  requireOrg,
  asyncRoute(async (req, res) => {
    const { title, description, assigned_to, due_date } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ error: 'missing_title' });
    const { data, error } = await supabaseAdmin
      .from('dossier_tasks')
      .insert({
        dossier_id: req.params.id,
        organization_id: req.currentOrgId,
        title: title.trim(),
        description, assigned_to, due_date,
        created_by: req.user.id,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.status(201).json({ task: data });
  }),
);

app.put(
  '/api/tasks/:id',
  requireUser,
  requireOrg,
  asyncRoute(async (req, res) => {
    const allowed = ['title', 'description', 'assigned_to', 'due_date', 'done'];
    const patch = {};
    for (const k of allowed) if (k in (req.body || {})) patch[k] = req.body[k];
    if (patch.done === true) patch.done_at = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('dossier_tasks')
      .update(patch)
      .eq('id', req.params.id)
      .eq('organization_id', req.currentOrgId)
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.json({ task: data });
  }),
);

// ─── Notifications ─────────────────────────────────────────
app.get(
  '/api/notifications',
  requireUser,
  asyncRoute(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.json({ items: data || [] });
  }),
);

app.post(
  '/api/notifications/:id/read',
  requireUser,
  asyncRoute(async (req, res) => {
    await supabaseAdmin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    res.status(204).end();
  }),
);

app.get(
  '/api/dossiers/:id',
  requireUser,
  asyncRoute(async (req, res) => {
    const { data: dossier, error } = await supabaseAdmin
      .from('dossiers')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: 'not_found' });
    if (req.profile.role !== 'admin' && dossier.user_id !== req.user.id) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const { data: obs } = await supabaseAdmin
      .from('dossier_observations')
      .select('*')
      .eq('dossier_id', req.params.id)
      .order('created_at', { ascending: true });
    const { data: docs } = await supabaseAdmin
      .from('dossier_documents')
      .select('*')
      .eq('dossier_id', req.params.id)
      .order('created_at', { ascending: true });
    res.json({ dossier, observations: obs || [], documents: docs || [] });
  }),
);

app.put(
  '/api/dossiers/:id',
  requireUser,
  asyncRoute(async (req, res) => {
    const { data: dossier, error } = await supabaseAdmin
      .from('dossiers')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: 'not_found' });
    if (dossier.user_id !== req.user.id) return res.status(403).json({ error: 'forbidden' });
    if (!['DRAFT', 'INTERNAL_AMENDMENT_PENDING'].includes(dossier.statut)) {
      return res.status(409).json({ error: 'not_editable', current: dossier.statut });
    }
    const allowed = ['client_name', 'type_formalite', 'naf_code', 'nature', 'siren', 'inpi_content'];
    const patch = {};
    for (const k of allowed) if (k in (req.body || {})) patch[k] = req.body[k];
    const { data: updated, error: uErr } = await supabaseAdmin
      .from('dossiers')
      .update(patch)
      .eq('id', req.params.id)
      .select()
      .single();
    if (uErr) return res.status(500).json({ error: 'db_error', detail: uErr.message });
    res.json({ dossier: updated });
  }),
);

app.post(
  '/api/dossiers/:id/submit',
  requireUser,
  asyncRoute(async (req, res) => {
    const { data: dossier, error } = await supabaseAdmin
      .from('dossiers')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: 'not_found' });
    if (dossier.user_id !== req.user.id) return res.status(403).json({ error: 'forbidden' });
    if (!['DRAFT', 'INTERNAL_AMENDMENT_PENDING'].includes(dossier.statut)) {
      return res.status(409).json({ error: 'not_submittable', current: dossier.statut });
    }
    const { data: updated, error: uErr } = await supabaseAdmin
      .from('dossiers')
      .update({ statut: 'AWAITING_VALIDATION' })
      .eq('id', req.params.id)
      .select()
      .single();
    if (uErr) return res.status(500).json({ error: 'db_error', detail: uErr.message });
    res.json({ dossier: updated });
  }),
);

app.post(
  '/api/dossiers/:id/observations',
  requireUser,
  asyncRoute(async (req, res) => {
    const { message } = req.body || {};
    if (!message?.trim()) return res.status(400).json({ error: 'empty_message' });
    const { data: dossier } = await supabaseAdmin
      .from('dossiers')
      .select('user_id')
      .eq('id', req.params.id)
      .single();
    if (!dossier) return res.status(404).json({ error: 'not_found' });
    const isOwn = dossier.user_id === req.user.id;
    if (!isOwn && req.profile.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    const { data, error } = await supabaseAdmin
      .from('dossier_observations')
      .insert({
        dossier_id: req.params.id,
        author_id: req.user.id,
        author_role: req.profile.role,
        message: message.trim(),
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.status(201).json(data);
  }),
);

app.post(
  '/api/dossiers/:id/documents',
  requireUser,
  asyncRoute(async (req, res) => {
    const { name, storage_path, size_bytes, mime_type } = req.body || {};
    if (!name || !storage_path) return res.status(400).json({ error: 'missing_fields' });
    const { data: dossier } = await supabaseAdmin
      .from('dossiers')
      .select('user_id')
      .eq('id', req.params.id)
      .single();
    if (!dossier) return res.status(404).json({ error: 'not_found' });
    if (dossier.user_id !== req.user.id && req.profile.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }
    const { data, error } = await supabaseAdmin
      .from('dossier_documents')
      .insert({
        dossier_id: req.params.id,
        name,
        file_path: storage_path,
        size_bytes: size_bytes || null,
        mime_type: mime_type || null,
        status: 'TRANSMIS',
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.status(201).json(data);
  }),
);

app.delete(
  '/api/dossiers/:id/documents/:docId',
  requireUser,
  asyncRoute(async (req, res) => {
    const { data: doc } = await supabaseAdmin
      .from('dossier_documents')
      .select('*, dossier:dossiers!inner(user_id, statut)')
      .eq('id', req.params.docId)
      .single();
    if (!doc) return res.status(404).json({ error: 'not_found' });
    if (doc.dossier.user_id !== req.user.id && req.profile.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (!['DRAFT', 'INTERNAL_AMENDMENT_PENDING'].includes(doc.dossier.statut)) {
      return res.status(409).json({ error: 'not_deletable' });
    }
    if (doc.file_path) {
      await supabaseAdmin.storage.from('dossier-docs').remove([doc.file_path]);
    }
    await supabaseAdmin.from('dossier_documents').delete().eq('id', req.params.docId);
    res.status(204).end();
  }),
);


app.get(
  '/api/inpi-status',
  requireUser,
  requireOrg,
  asyncRoute(async (req, res) => {
    const list = await inpi.forOrg(req.currentOrgId).listFormalities({ itemsPerPage: 1 });
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
  requireOrg,
  asyncRoute(async (req, res) => {
    const { status, typeFormalite, siren, referenceClientMandataire, page, itemsPerPage } = req.query;
    const result = await inpi.forOrg(req.currentOrgId).listFormalities({
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
  requireOrg,
  asyncRoute(async (req, res) => {
    const body = req.body || {};
    if (!body.content || !body.companyName) {
      return res.status(400).json({ error: 'missing_fields', required: ['companyName', 'content'] });
    }
    // Garde signature : on refuse l'envoi direct (sans passage par le flow de
    // validation+signature admin) pour les types qui exigent une signature
    // électronique avancée. Le client doit créer un dossier, le faire valider
    // puis signer via Yousign avant que l'admin pousse à l'INPI.
    const typeCode = body.typeFormalite || 'C';
    if (typeCode === 'M' || typeCode === 'R') {
      return res.status(409).json({
        error: 'signature_required',
        detail:
          'Les formalités de modification et de cessation exigent une signature électronique avancée. ' +
          'Passez par le flow dossier → validation → signature Yousign.',
      });
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
    const inpiFormality = await inpi.forOrg(req.currentOrgId).createFormality(payload);

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
  requireOrg,
  asyncRoute(async (req, res) => {
    res.json(await inpi.forOrg(req.currentOrgId).getFormality(req.params.id));
  }),
);

app.put(
  '/api/formalites/:id',
  requireUser,
  requireOrg,
  asyncRoute(async (req, res) => {
    res.json(await inpi.forOrg(req.currentOrgId).updateFormality(req.params.id, req.body));
  }),
);

app.delete(
  '/api/formalites/:id',
  requireUser,
  requireOrg,
  asyncRoute(async (req, res) => {
    await inpi.forOrg(req.currentOrgId).deleteFormality(req.params.id);
    res.status(204).end();
  }),
);

app.post(
  '/api/formalites/:id/sign',
  requireUser,
  requireOrg,
  asyncRoute(async (req, res) => {
    const { signedAttachmentId } = req.body || {};
    res.status(201).json(await inpi.forOrg(req.currentOrgId).signFormality(req.params.id, signedAttachmentId));
  }),
);

app.get(
  '/api/formalites/:id/attachments',
  requireUser,
  requireOrg,
  asyncRoute(async (req, res) => {
    res.json(await inpi.forOrg(req.currentOrgId).listAttachments(req.params.id));
  }),
);

app.post(
  '/api/formalites/:id/attachments',
  requireUser,
  requireOrg,
  asyncRoute(async (req, res) => {
    const body = req.body || {};
    if (!body.documentBase64 || !body.nomDocument) {
      return res.status(400).json({ error: 'missing_fields', required: ['nomDocument', 'documentBase64'] });
    }
    if (body.documentBase64.length > 14_000_000) {
      return res.status(413).json({ error: 'pdf_too_large', max_size_mb: 10 });
    }
    const data = await inpi.forOrg(req.currentOrgId).request(`/api/formalities/${req.params.id}/attachments`, {
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
  requireOrg,
  asyncRoute(async (req, res) => {
    const r = await inpi.forOrg(req.currentOrgId).rawFetch(`/api/formalities/${req.params.id}/synthesis`);
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

app.use('/api/cabinet/inpi-creds', requireUser, requireOrg, inpiCredsRoutes);
app.use('/api/pappers', requireUser, requireOrg, pappersRoutes);
app.use('/api/dossiers', requireUser, requireOrg, signatureRoutes);

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
