// GET /api/formalites/:id/synthesis
// Retourne le PDF de synthèse (à signer pour les modif/cessation).
// Le binaire est renvoyé tel quel avec Content-Type: application/pdf.

const { requireUser } = require('../../_lib/auth');

const BASE = process.env.INPI_BASE_URL || 'https://guichet-unique-demo.inpi.fr';

let token = null;
let tokenExpiry = 0;

async function getToken() {
  if (token && Date.now() < tokenExpiry) return token;
  const r = await fetch(`${BASE}/api/user/login/sso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.INPI_USERNAME,
      password: process.env.INPI_PASSWORD,
    }),
  });
  if (!r.ok) throw new Error(`INPI login ${r.status}`);
  const d = await r.json();
  token = d.token;
  tokenExpiry = Date.now() + 50 * 60 * 1000;
  return token;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'missing_id' });

  try {
    const t = await getToken();
    const r = await fetch(`${BASE}/api/formalities/${id}/synthesis`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (r.status === 404) return res.status(404).json({ error: 'synthesis_not_found' });
    if (!r.ok) {
      const txt = await r.text();
      return res.status(502).json({ error: 'inpi_request_failed', status: r.status, detail: txt.slice(0, 300) });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="synthese-${id}.pdf"`);
    const buf = Buffer.from(await r.arrayBuffer());
    return res.status(200).end(buf);
  } catch (e) {
    return res.status(502).json({ error: 'inpi_unreachable', detail: String(e.message) });
  }
};
