// Extraction de texte multi-format pour les documents juridiques déposés par
// le formaliste (PV d'AG, statuts…). Sert d'amont à l'extraction structurée IA.
//
// Formats gérés :
//   • PDF natif      → pdftotext (couche texte). Rapide, fidèle.
//   • PDF scanné     → si la couche texte est trop maigre, fallback OCR
//                      (pdftoppm → PNG → tesseract) sur les premières pages.
//   • Image (PNG/JPG)→ OCR tesseract direct.
//   • Word .docx     → unzip word/document.xml + strip des balises XML.
//
// Dépendances système sur le VPS : poppler-utils (pdftotext/pdftoppm), unzip.
// RGPD : fichiers temporaires écrits en répertoire éphémère et supprimés.

const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { isPdf, pdfToPngPages } = require('./pdf');
const { recognizeText } = require('./ocr');

const EXEC_TIMEOUT_MS = 60_000;
const OCR_MAX_PAGES = 6; // au-delà, on plafonne (coût/temps)
const MIN_TEXT_PER_PAGE = 80; // seuil « couche texte présente »

// Signatures binaires.
const DOCX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // ZIP (PK\x03\x04)
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

function isDocx(buf) {
  return buf.slice(0, 4).equals(DOCX_MAGIC);
}
function isImage(buf) {
  return buf.slice(0, 4).equals(PNG_MAGIC) || buf.slice(0, 3).equals(JPG_MAGIC);
}

function runExec(bin, args) {
  return new Promise((resolve, reject) => {
    execFile(
      bin,
      args,
      { timeout: EXEC_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024, encoding: 'utf8' },
      (err, stdout, stderr) => {
        if (!err) return resolve(stdout || '');
        if (err.code === 'ENOENT') {
          const e = new Error(`${bin} introuvable sur le serveur.`);
          e.code = 'tool_missing';
          e.status = 500;
          return reject(e);
        }
        const reason = err.killed
          ? `timeout ${EXEC_TIMEOUT_MS / 1000}s`
          : (stderr || err.message || '').toString().trim().slice(0, 300);
        const e = new Error(`${bin} : ${reason}`);
        e.code = 'extract_failed';
        e.status = 422;
        reject(e);
      },
    );
  });
}

// PDF → couche texte via pdftotext (-layout conserve l'agencement des colonnes).
async function pdfTextLayer(pdfBuffer) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'compta-txt-'));
  const pdfPath = path.join(dir, 'in.pdf');
  try {
    await fs.writeFile(pdfPath, pdfBuffer);
    // '-' = sortie stdout
    return await runExec('pdftotext', ['-layout', '-enc', 'UTF-8', pdfPath, '-']);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

// OCR d'une série de pages images (Buffers PNG).
async function ocrPages(pageBuffers) {
  const parts = [];
  for (const buf of pageBuffers) {
    const { text } = await recognizeText(buf);
    if (text) parts.push(text);
  }
  return parts.join('\n\n');
}

// .docx → texte. Un .docx est un ZIP ; le contenu est dans word/document.xml.
async function docxText(docxBuffer) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'compta-docx-'));
  const docxPath = path.join(dir, 'in.docx');
  try {
    await fs.writeFile(docxPath, docxBuffer);
    // -p : extrait vers stdout sans décompresser tout l'archive
    const xml = await runExec('unzip', ['-p', docxPath, 'word/document.xml']);
    // Les fins de paragraphe/saut de ligne deviennent des \n, puis on retire les balises.
    return xml
      .replace(/<\/w:p>/g, '\n')
      .replace(/<w:tab\/?>/g, '\t')
      .replace(/<w:br\/?>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

// Point d'entrée : buffer → { text, source }.
// source ∈ 'pdf-text' | 'pdf-ocr' | 'image-ocr' | 'docx'
async function extractText(buffer) {
  if (isPdf(buffer)) {
    let text = '';
    try {
      text = (await pdfTextLayer(buffer)).trim();
    } catch (e) {
      if (e.code === 'tool_missing') throw e;
      text = '';
    }

    // Estime le nombre de pages via les sauts de page (\f) de pdftotext.
    const pageCount = (text.match(/\f/g) || []).length + 1;
    const dense = text.replace(/\s/g, '').length;

    // Couche texte suffisante → on la garde. Sinon PDF scanné → OCR.
    if (dense >= MIN_TEXT_PER_PAGE * pageCount && dense > 200) {
      return { text, source: 'pdf-text' };
    }
    const pages = await pdfToPngPages(buffer, { maxPages: OCR_MAX_PAGES, dpi: 220 });
    const ocr = await ocrPages(pages);
    // Si l'OCR est vide mais qu'on avait un peu de texte natif, on le renvoie.
    if (!ocr.trim() && text) return { text, source: 'pdf-text' };
    return { text: ocr, source: 'pdf-ocr' };
  }

  if (isDocx(buffer)) {
    return { text: await docxText(buffer), source: 'docx' };
  }

  if (isImage(buffer)) {
    const { text } = await recognizeText(buffer);
    return { text, source: 'image-ocr' };
  }

  const e = new Error(
    'Format non supporté. Formats acceptés : PDF, image (PNG/JPG), Word (.docx).',
  );
  e.code = 'unsupported_format';
  e.status = 415;
  throw e;
}

module.exports = { extractText, isDocx, isImage };
