// GET    /api/formalites/:id      -> détail complet (avec content)
// PUT    /api/formalites/:id      -> mise à jour
// DELETE /api/formalites/:id      -> suppression (avant signature)

const inpi = require('../../_lib/inpi');
const { requireUser } = require('../../_lib/auth');

module.exports = async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'missing_id' });

  try {
    if (req.method === 'GET') {
      const data = await inpi.getFormality(id);
      return res.status(200).json(data);
    }
    if (req.method === 'PUT') {
      const data = await inpi.updateFormality(id, req.body);
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      await inpi.deleteFormality(id);
      return res.status(204).end();
    }
  } catch (e) {
    return res.status(e.status || 502).json({ error: 'inpi_request_failed', detail: String(e.message), payload: e.payload });
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  return res.status(405).end();
};
