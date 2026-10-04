// Formalités en lot — suppose requireUser + requireOrg en amont.
//
//   POST /api/lots/plan                       {texte | fichier:{name,data}} → découpage en formalités (aperçu)
//   POST /api/lots                            {label, formalites[]}         → crée les dossiers et lance la préparation
//   GET  /api/lots                            → lots du cabinet (compteurs)
//   GET  /api/lots/:id                        → formalités du lot et leur avancement
//   POST /api/lots/formalites/:dossierId/relancer
//   GET  /api/lots/formalites/:dossierId/historique → conversation de l'agent (reprise dans le chat)

const express = require('express');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const { execFile } = require('child_process');
const router = express.Router();

const lots = require('../lib/batch');

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch((e) => {
    console.error('[lots]', e.message);
    res.status(e.status || 500).json({ error: 'batch_error', detail: String(e.message).slice(0, 300) });
  });
}

const ctxDe = (req) => ({ userId: req.user.id, orgId: req.currentOrgId, isAdmin: req.profile?.role === 'admin' });

// Tableur (.xlsx, .xls, .ods) → CSV via LibreOffice ; .csv / .txt lus tels quels.
async function texteDuFichier({ name, data }) {
  const buffer = Buffer.from(String(data || ''), 'base64');
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw Object.assign(new Error('Fichier vide ou trop lourd (5 Mo max).'), { status: 400 });
  const ext = String(name || '').split('.').pop().toLowerCase();
  if (['csv', 'txt', 'tsv'].includes(ext)) return buffer.toString('utf8');
  if (!['xlsx', 'xls', 'ods'].includes(ext)) throw Object.assign(new Error('Formats acceptés : Excel (.xlsx, .xls), .ods, .csv ou .txt.'), { status: 400 });
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lot-'));
  try {
    const src = path.join(dir, `liste.${ext}`);
    await fs.writeFile(src, buffer);
    await new Promise((ok, ko) => execFile('soffice', ['--headless', '--norestore', `-env:UserInstallation=file://${dir}/profile`, '--convert-to', 'csv:Text - txt - csv (StarCalc):59,34,76', '--outdir', dir, src], { timeout: 60000 }, (e) => (e ? ko(e) : ok())));
    return await fs.readFile(path.join(dir, 'liste.csv'), 'utf8');
  } catch (e) {
    throw Object.assign(new Error(`Lecture du tableur impossible : ${e.message}`), { status: 400 });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

router.post('/plan', asyncRoute(async (req, res) => {
  let texte = String(req.body?.texte || '');
  if (req.body?.fichier) texte = `${texte}\n\n${await texteDuFichier(req.body.fichier)}`.trim();
  if (!texte.trim()) return res.status(400).json({ error: 'empty', detail: 'Collez une liste ou joignez un tableur.' });
  res.json(await lots.planifier(texte));
}));

router.post('/', asyncRoute(async (req, res) => {
  res.status(202).json(await lots.lancer({ ctx: ctxDe(req), label: req.body?.label, formalites: req.body?.formalites }));
}));

router.get('/', asyncRoute(async (req, res) => {
  res.json({ lots: await lots.lister(req.currentOrgId) });
}));

router.get('/:id', asyncRoute(async (req, res) => {
  res.json(await lots.detail(req.currentOrgId, req.params.id));
}));

router.post('/formalites/:dossierId/relancer', asyncRoute(async (req, res) => {
  res.json(await lots.relancer({ ctx: ctxDe(req), dossierId: req.params.dossierId }));
}));

router.get('/formalites/:dossierId/historique', asyncRoute(async (req, res) => {
  res.json(await lots.historique(req.currentOrgId, req.params.dossierId));
}));

module.exports = router;
