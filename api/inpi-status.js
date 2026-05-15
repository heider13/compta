// Endpoint de diagnostic : vérifie que la connexion INPI fonctionne
// GET /api/inpi-status

const inpi = require('./_lib/inpi');
const { requireUser } = require('./_lib/auth');

module.exports = async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const list = await inpi.listFormalities({ itemsPerPage: 1 });
    res.status(200).json({
      ok: true,
      env: (process.env.INPI_BASE_URL || '').includes('demo') ? 'demo' : 'prod',
      totalFormalitiesIfAny: list?.['hydra:totalItems'] ?? null,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
};
