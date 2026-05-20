// Supabase admin singleton — importable from any module
// Centralizes the service-role client so routes don't need a circular import of server.js.
//
// Usage:
//   const { getSupabaseAdmin } = require('../lib/db');
//   const supa = getSupabaseAdmin();
//   await supa.from('clients').select('*');

const { createClient } = require('@supabase/supabase-js');

let _supabase = null;

function getSupabaseAdmin() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans process.env');
  }
  _supabase = createClient(url, key, {
    auth: { persistSession: false },
  });
  return _supabase;
}

module.exports = { getSupabaseAdmin };
