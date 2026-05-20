// Routes pour configurer/lire les credentials INPI propres à un cabinet.
// Le password est chiffré (AES-256-GCM) avant insertion en base.
//
// Suppose que requireUser + requireOrg ont été appliqués en amont
// (req.user, req.currentOrgId, req.currentOrgRole sont définis).

const express = require('express');
const router = express.Router();

const { encrypt, decrypt } = require('../lib/encryption');
const { getSupabaseAdmin } = require('../lib/db');

const INPI_BASE = process.env.INPI_BASE_URL || 'https://guichet-unique.inpi.fr';

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

function canManage(role) {
  return role === 'owner' || role === 'admin';
}

router.put(
  '/',
  asyncRoute(async (req, res) => {
    if (!canManage(req.currentOrgRole)) {
      return res.status(403).json({ error: 'forbidden', detail: 'owner or admin required' });
    }
    const { username, password, env } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: 'missing_fields', required: ['username', 'password'] });
    }
    const envValue = env || 'prod';
    if (!['prod', 'demo'].includes(envValue)) {
      return res.status(400).json({ error: 'invalid_env', allowed: ['prod', 'demo'] });
    }

    const supa = getSupabaseAdmin();
    const { data, error } = await supa
      .from('organizations')
      .update({
        inpi_username: username,
        inpi_password_encrypted: encrypt(password),
        inpi_env: envValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.currentOrgId)
      .select('id, inpi_username, inpi_env')
      .single();

    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });
    res.json({
      configured: true,
      username: data.inpi_username,
      env: data.inpi_env,
    });
  }),
);

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const supa = getSupabaseAdmin();
    const { data, error } = await supa
      .from('organizations')
      .select('inpi_username, inpi_password_encrypted, inpi_env')
      .eq('id', req.currentOrgId)
      .single();
    if (error) return res.status(404).json({ error: 'not_found' });
    res.json({
      configured: Boolean(data.inpi_username && data.inpi_password_encrypted),
      username: data.inpi_username || null,
      env: data.inpi_env || 'prod',
    });
  }),
);

router.post(
  '/test',
  asyncRoute(async (req, res) => {
    const supa = getSupabaseAdmin();
    const { data: org, error } = await supa
      .from('organizations')
      .select('inpi_username, inpi_password_encrypted, inpi_env')
      .eq('id', req.currentOrgId)
      .single();
    if (error) return res.status(404).json({ ok: false, error: 'org_not_found' });
    if (!org.inpi_username || !org.inpi_password_encrypted) {
      return res.status(400).json({ ok: false, error: 'creds_not_configured' });
    }

    let password;
    try {
      password = decrypt(org.inpi_password_encrypted);
    } catch (e) {
      return res
        .status(500)
        .json({ ok: false, error: 'decrypt_failed', detail: String(e.message) });
    }

    // Endpoint login SSO INPI. On ne stocke pas le token retourné — c'est juste un test live.
    try {
      const r = await fetch(`${INPI_BASE}/api/user/login/sso`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'compta-proxy/0.1 (cred-test)',
        },
        body: JSON.stringify({ username: org.inpi_username, password }),
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        return res.status(400).json({
          ok: false,
          error: 'inpi_login_failed',
          status: r.status,
          detail: txt.slice(0, 300),
        });
      }
      const j = await r.json().catch(() => ({}));
      const hasBearer = Boolean(j?.token) || /BEARER=/i.test(r.headers.get('set-cookie') || '');
      if (!hasBearer) {
        return res.status(400).json({ ok: false, error: 'inpi_no_bearer' });
      }
      return res.json({ ok: true, env: org.inpi_env || 'prod' });
    } catch (e) {
      return res.status(400).json({ ok: false, error: 'inpi_unreachable', detail: String(e.message) });
    }
  }),
);

module.exports = router;
