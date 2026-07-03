// Conversion PDF → images PNG pour l'OCR, via pdftoppm (poppler-utils).
// Dépendance système : `apt install poppler-utils` sur le VPS.
//
// RGPD : les fichiers temporaires sont écrits dans un répertoire éphémère
// et supprimés dans le finally, même en cas d'erreur.

const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const PDF_MAGIC = '%PDF-';

function isPdf(buffer) {
  return buffer.slice(0, 5).toString('latin1') === PDF_MAGIC;
}

// Convertit les `maxPages` premières pages en PNG (300 dpi par défaut —
// suffisant pour la zone MRZ). Retourne un tableau de Buffers.
async function pdfToPngPages(pdfBuffer, { maxPages = 2, dpi = 300 } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'compta-ocr-'));
  const pdfPath = path.join(dir, 'in.pdf');
  try {
    await fs.writeFile(pdfPath, pdfBuffer);

    await new Promise((resolve, reject) => {
      execFile(
        'pdftoppm',
        ['-png', '-r', String(dpi), '-f', '1', '-l', String(maxPages), pdfPath, path.join(dir, 'page')],
        { timeout: 30_000 },
        (err) => {
          if (!err) return resolve();
          if (err.code === 'ENOENT') {
            const e = new Error(
              'pdftoppm introuvable — installer poppler-utils sur le serveur (apt install poppler-utils).',
            );
            e.code = 'pdftoppm_missing';
            e.status = 500;
            return reject(e);
          }
          const e = new Error(`Conversion PDF échouée : ${err.message}`);
          e.code = 'pdf_conversion_failed';
          e.status = 422;
          reject(e);
        },
      );
    });

    const files = (await fs.readdir(dir))
      .filter((f) => f.startsWith('page') && f.endsWith('.png'))
      .sort();
    const buffers = [];
    for (const f of files) {
      buffers.push(await fs.readFile(path.join(dir, f)));
    }
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
