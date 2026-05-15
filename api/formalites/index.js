// GET  /api/formalites              -> liste paginée
// POST /api/formalites              -> crée une formalité (auto-entrepreneur)
//
// Query params (GET) :
//   status, typeFormalite, siren, referenceClientMandataire,
//   page (def 1), itemsPerPage (def 20)

const inpi = require('../_lib/inpi');
const { requireUser, admin } = require('../_lib/auth');

module.exports = async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method === 'GET') return list(req, res, user);
  if (req.method === 'POST') return create(req, res, user);
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
};

async function list(req, res, user) {
  const { status, typeFormalite, siren, referenceClientMandataire, page, itemsPerPage } = req.query;

  let result;
  try {
    result = await inpi.listFormalities({
      status: status ? (Array.isArray(status) ? status : [status]) : undefined,
      typeFormalite,
      siren,
      referenceClientMandataire,
      page: page || 1,
      itemsPerPage: itemsPerPage || 20,
      'order[statusDate]': 'desc',
    });
  } catch (e) {
    return res.status(502).json({ error: 'inpi_unreachable', detail: String(e.message) });
  }

  const items = (result?.['hydra:member'] || []).map(mapFormality);
  return res.status(200).json({
    items,
    total: result?.['hydra:totalItems'] || 0,
  });
}

async function create(req, res, user) {
  const body = req.body || {};
  if (!body.content || !body.companyName) {
    return res.status(400).json({ error: 'missing_fields', required: ['companyName', 'content'] });
  }

  const payload = {
    companyName: body.companyName,
    referenceMandataire: body.referenceMandataire || `compta-${user.id.slice(0, 8)}-${Date.now()}`,
    nomDossier: body.nomDossier || body.companyName,
    typeFormalite: body.typeFormalite || 'C',
    typePersonne: 'P',
    diffusionINSEE: body.diffusionINSEE || 'O',
    indicateurEntreeSortieRegistre: body.indicateurEntreeSortieRegistre !== false,
    content: body.content,
    ...(body.observationSignature ? { observationSignature: body.observationSignature } : {}),
    ...(body.numNat ? { numNat: body.numNat } : {}),
  };

  let inpiFormality;
  try {
    inpiFormality = await inpi.createFormality(payload);
  } catch (e) {
    return res.status(e.status || 502).json({ error: 'inpi_create_failed', detail: String(e.message), payload: e.payload });
  }

  const { data: dossier, error } = await admin()
    .from('dossiers')
    .insert({
      user_id: user.id,
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

  return res.status(201).json({ inpi: mapFormality(inpiFormality), dossier });
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
