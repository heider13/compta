// Conversion Markdown → .docx (titres, paragraphes, gras, tableaux) pour les documents
// rédigés par l'IA ou par gabarit. Partagé par /api/ai/draft-document et l'agent formalités.

const {
  Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType,
} = require('docx');

// Texte avec gras markdown **...**
function runsDe(text, size = 22) {
  const runs = [];
  for (const p of text.split(/(\*\*[^*]+\*\*)/g)) {
    if (!p) continue;
    const bm = p.match(/^\*\*([^*]+)\*\*$/);
    runs.push(new TextRun({ text: bm ? bm[1] : p, bold: !!bm, size }));
  }
  return runs;
}

const cellules = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const estSeparateur = (l) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(l.trim());

// Tableau Markdown (ligne d'en-tête, séparateur |---|, lignes) → tableau Word
function tableau(lignes) {
  const rows = lignes.filter((l) => !estSeparateur(l)).map((l, i) => new TableRow({
    children: cellules(l).map((c) => new TableCell({
      children: [new Paragraph({ children: i === 0 ? [new TextRun({ text: c.replace(/\*\*/g, ''), bold: true, size: 20 })] : runsDe(c.replace(/<br\s*\/?>/gi, ' '), 20) })],
    })),
  }));
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

function markdownToDocx(title, markdown) {
  const lines = markdown.split(/\r?\n/);
  const children = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    // Tableau : lignes consécutives commençant par « | », dont la 2e est un séparateur
    if (t.startsWith('|') && lines[i + 1] && estSeparateur(lines[i + 1])) {
      const bloc = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) bloc.push(lines[i++]);
      i--;
      children.push(tableau(bloc));
      children.push(new Paragraph({ text: '' }));
      continue;
    }
    if (!t) { children.push(new Paragraph({ text: '' })); continue; }
    // Séparateur horizontal Markdown : simple espace vertical dans le Word
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { children.push(new Paragraph({ text: '' })); continue; }
    let m;
    if ((m = t.match(/^#\s+(.+)/))) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, children: [new TextRun({ text: m[1], bold: true, size: 30 })] }));
    } else if ((m = t.match(/^##\s+(.+)/))) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 }, children: [new TextRun({ text: m[1], bold: true, size: 26 })] }));
    } else if ((m = t.match(/^###\s+(.+)/))) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: m[1], bold: true, size: 24 })] }));
    } else {
      // Puces « - » / « * » / « 1. » → retrait + puce typographique
      const bullet = t.match(/^(?:[-*•]|\d+[.)])\s+(.+)/);
      const text = bullet ? t.replace(/^[-*•]\s+/, '• ') : t;
      children.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 100 },
        indent: bullet ? { left: 360 } : undefined,
        children: runsDe(text),
      }));
    }
  }
  return new Document({ creator: 'Legaly AI', title, sections: [{ children }] });
}

module.exports = { markdownToDocx };
