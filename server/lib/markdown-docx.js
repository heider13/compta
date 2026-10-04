// Conversion Markdown → .docx (titres, paragraphes, gras) pour les documents
// rédigés par l'IA. Partagé par /api/ai/draft-document et l'agent formalités.

const {
  Document, Paragraph, TextRun, HeadingLevel, AlignmentType,
} = require('docx');

function markdownToDocx(title, markdown) {
  const lines = markdown.split(/\r?\n/);
  const children = [];
  for (const line of lines) {
    const t = line.trim();
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
      // gras markdown **...**
      const runs = [];
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      for (const p of parts) {
        if (!p) continue;
        const bm = p.match(/^\*\*([^*]+)\*\*$/);
        runs.push(new TextRun({ text: bm ? bm[1] : p, bold: !!bm, size: 22 }));
      }
      children.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 100 },
        indent: bullet ? { left: 360 } : undefined,
        children: runs,
      }));
    }
  }
  return new Document({ creator: 'Legaly AI', title, sections: [{ children }] });
}

module.exports = { markdownToDocx };
