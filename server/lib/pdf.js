// Conversion PDF → images PNG pour l'OCR, via poppler-utils.
// Outil principal : pdftoppm. Fallback : pdftocairo (plus tolérant sur
// certains PDF générés par des scanners/imprimantes exotiques).
// Dépendance système : `apt install poppler-utils` sur le VPS.
//
// RGPD : les fichiers temporaires sont écrits dans un répertoire éphémère
// et supprimés dans le finally, même en cas d'erreur.

const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const PDF_MAGIC = '%PDF-';
const CONVERT_TIMEOUT_MS = 60_000;

function isPdf(buffer) {
  return buffer.slice(0, 5).toString('latin1') === PDF_MAGIC;
}

// Exécute un convertisseur poppler et capture stderr pour le diagnostic.
function runConverter(bin, args) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { timeout: CONVERT_TIMEOUT_MS }, (err, _stdout, stderr) => {
      if (!err) return resolve();
      if (err.code === 'ENOENT') {
        const e = new Error(`${bin} introuvable — installer poppler-utils (apt install poppler-utils).`);
        e.code = 'poppler_missing';
        e.status = 500;
        return reject(e);
      }
      const reason = err.killed
        ? `timeout ${CONVERT_TIMEOUT_MS / 1000}s dépassé`
        : (stderr || err.message || '').toString().trim().slice(0, 300);
      const e = new Error(`${bin} : ${reason}`);
      e.code = 'pdf_conversion_failed';
      e.status = 422;
      reject(e);
    });
  });
}

async function readPages(dir) {
  const files = (await fs.readdir(dir))
    .filter((f) => f.startsWith('page') && f.endsWith('.png'))
    .sort();
  const buffers = [];
  for (const f of files) {
    buffers.push(await fs.readFile(path.join(dir, f)));
  }
  return buffers;
}

// Convertit les `maxPages` premières pages en PNG (300 dpi par défaut —
// suffisant pour la zone MRZ). Retourne un tableau de Buffers.
async function pdfToPngPages(pdfBuffer, { maxPages = 2, dpi = 300 } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'compta-ocr-'));
  const pdfPath = path.join(dir, 'in.pdf');
  try {
    await fs.writeFile(pdfPath, pdfBuffer);

    const commonArgs = ['-png', '-r', String(dpi), '-f', '1', '-l', String(maxPages), pdfPath, path.join(dir, 'page')];

    let firstError = null;
    try {
      await runConverter('pdftoppm', commonArgs);
    } catch (e) {
      if (e.code === 'poppler_missing') throw e;
      firstError = e;
      // Fallback : pdftocairo accepte des PDF que pdftoppm rejette
      // (transparences, encodages de scanner particuliers, etc.)
      try {
        await runConverter('pdftocairo', commonArgs);
      } catch (e2) {
        if (e2.code === 'poppler_missing') throw firstError;
        const e3 = new Error(
          `Conversion PDF échouée. pdftoppm → ${firstError.message} ; pdftocairo → ${e2.message}`,
        );
        e3.code = 'pdf_conversion_failed';
        e3.status = 422;
        throw e3;
      }
    }

    const buffers = await readPages(dir);
    if (!buffers.length) {
      const e = new Error('Le PDF ne contient aucune page convertible.');
      e.code = 'pdf_no_pages';
      e.status = 422;
      throw e;
    }
    return buffers;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

module.exports = { isPdf, pdfToPngPages };
