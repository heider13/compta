// GET  /api/formalites/:id/attachments     -> liste pièces jointes
// POST /api/formalites/:id/attachments     -> ajoute une pièce (PDF en base64)
//
// Body POST :
// {
//   nomDocument: "Pièce d'identité.pdf",
//   typeDocument: "PJ_01",
//   documentBase64: "JVBERi0xLjQK...",
//   documentExtension: "pdf",
//   path: "personnePhysique.ppRubriqueIdentiteEntreprise...."
// }

const inpi = require('../../_lib/inpi');
const { requireUser } = require('../../_lib/auth');

module.exports = async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'missing_id' });

  try {
    if (req.method === 'GET') {
      const data = await inpi.listAttachments(id);
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.documentBase64 || !body.nomDocument) {
        return res.status(400).json({ error: 'missing_fields', required: ['nomDocument', 'documentBase64'] });
      }
      if (body.documentBase64.length > 14_000_000) {
        return res.status(413).json({ error: 'pdf_too_large', max_size_mb: 10 });
      }
      const data = await inpi.request(`/api/formalities/${id}/attachments`, {
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
      return res.status(201).json(data);
    }
  } catch (e) {
    return res.status(e.status || 502).json({ error: 'inpi_request_failed', detail: String(e.message), payload: e.payload });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
};
