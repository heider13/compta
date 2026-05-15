// Vérifie le JWT Supabase passé dans Authorization: Bearer <token>
// et retourne l'utilisateur ou null.

const { createClient } = require('@supabase/supabase-js');

let _adminClient = null;
function admin() {
  if (_adminClient) return _adminClient;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquants');
  _adminClient = createClient(url, key, { auth: { persistSession: false } });
  return _adminClient;
}

async function requireUser(req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'missing_bearer_token' });
    return null;
  }
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'invalid_token' });
    return null;
  }
  return data.user;
}

module.exports = { requireUser, admin };
