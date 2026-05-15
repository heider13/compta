// POST /api/formalites/:id/sign
// Pour une formalité de CRÉATION (auto-entrepreneur), signature simple suffit.
// Body optionnel : { signedAttachmentId } pour signature avancée RGS (modif/cessation).

const inpi = require('../../_lib/inpi');
const { requireUser } = require('../../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const { id } = req.query;
  const { signedAttachmentId } = req.body || {};
  if (!id) return res.status(400).json({ error: 'missing_id' });

  try {
    const data = await inpi.signFormality(id, signedAttachmentId);
    return res.status(201).json(data);
  } catch (e) {
    return res.status(e.status || 502).json({ error: 'inpi_sign_failed', detail: String(e.message), payload: e.payload });
  }
};
