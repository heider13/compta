// OCR de pièces d'identité (CNI, passeport, titre de séjour) via tesseract.js.
//
// Stratégie en deux temps :
//   1. Parsing MRZ (Machine Readable Zone — les lignes de A-Z0-9< en bas du
//      document). Formats gérés : TD1 (CNI 2021+, 3×30), TD3 (passeport, 2×44),
//      CNI française ancien format (2×36). Le MRZ est en police OCR-B normalisée,
//      c'est la source la plus fiable.
//   2. Fallback heuristique sur le texte libre (libellés "Nom", "Prénom(s)",
//      "Né(e) le"…) si aucun MRZ exploitable.
//
// Retour : { fields, method: 'mrz'|'heuristic'|'none', confidence }

const { createWorker } = require('tesseract.js');

let _workerPromise = null;

function getWorker() {
  if (!_workerPromise) {
    // fra pour le texte libre, eng aide sur le MRZ (A-Z0-9<)
    _workerPromise = createWorker(['fra', 'eng']);
  }
  return _workerPromise;
}

// Ferme le worker (tests / arrêt propre). En prod on le garde chaud.
async function terminate() {
  if (_workerPromise) {
    const w = await _workerPromise;
    _workerPromise = null;
    await w.terminate();
  }
}

// ─── Utilitaires MRZ ─────────────────────────────────────────────

// Corrige les confusions OCR classiques dans les segments numériques du MRZ.
function fixDigits(s) {
  return s.replace(/O/g, '0').replace(/I/g, '1').replace(/B/g, '8').replace(/S/g, '5').replace(/Z/g, '2');
}

// Date MRZ YYMMDD → ISO.
// kind='birth'  : yy > année courante (2 chiffres) → 19xx, sinon 20xx.
// kind='expiry' : toujours 20xx (aucun document en circulation n'expire en 19xx).
function mrzDateToIso(yymmdd, kind = 'birth') {
  const s = fixDigits(yymmdd);
  if (!/^\d{6}$/.test(s)) return null;
  const yy = Number(s.slice(0, 2));
  const nowYY = new Date().getFullYear() % 100;
  const year = kind === 'expiry' ? 2000 + yy : yy > nowYY ? 1900 + yy : 2000 + yy;
  const mm = s.slice(2, 4);
  const dd = s.slice(4, 6);
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return null;
  return `${year}-${mm}-${dd}`;
}

function parseSex(c) {
  if (c === 'M') return 'M';
  if (c === 'F') return 'F';
  return null;
}

// "DUPONT<<JEAN<PIERRE" → { nom: 'DUPONT', prenoms: ['JEAN', 'PIERRE'] }
function parseMrzName(field) {
  const [nomPart, prenomsPart] = field.split('<<');
  const nom = (nomPart || '').replace(/</g, ' ').trim();
  const prenoms = (prenomsPart || '')
    .split('<')
    .map((p) => p.trim())
    .filter(Boolean);
  return { nom, prenoms };
}

// Extrait les lignes candidates MRZ du texte OCR brut.
function extractMrzLines(rawText) {
  return rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, '').toUpperCase())
    .filter((l) => l.length >= 28 && /^[A-Z0-9<]+$/.test(l) && l.includes('<'));
}

// TD3 — passeport : 2 lignes de 44.
//   L1: P<FRADUPONT<<JEAN<PIERRE<<<<...
//   L2: 24XX12345 6 FRA 900101 7 M 300101 5 ...
function parseTd3(lines) {
  const l1 = lines.find((l) => l.startsWith('P<') && l.length >= 40);
  if (!l1) return null;
  const idx = lines.indexOf(l1);
  const l2 = lines[idx + 1];
  if (!l2 || l2.length < 40) return null;

  const { nom, prenoms } = parseMrzName(l1.slice(5));
  return {
    typeDocument: 'PASSEPORT',
    // Numéro alphanumérique : pas de correction O→0 etc., elle corromprait
    // les lettres légitimes.
    numeroDocument: l2.slice(0, 9).replace(/</g, ''),
    nationalite: l2.slice(10, 13).replace(/</g, ''),
    dateNaissance: mrzDateToIso(l2.slice(13, 19)),
    sexe: parseSex(l2[20]),
    dateExpiration: mrzDateToIso(l2.slice(21, 27), 'expiry'),
    nom,
    prenoms,
  };
}

// TD1 — CNI format carte bancaire (2021+) : 3 lignes de 30.
//   L1: IDFRA<numéro...
//   L2: 900101 7 M 300101 5 FRA ...
//   L3: DUPONT<<JEAN<PIERRE<<<<<<
function parseTd1(lines) {
  const l1 = lines.find((l) => /^ID/.test(l) && l.length >= 28 && l.length <= 32);
  if (!l1) return null;
  const idx = lines.indexOf(l1);
  const l2 = lines[idx + 1];
  const l3 = lines[idx + 2];
  if (!l2 || !l3) return null;

  const { nom, prenoms } = parseMrzName(l3);
  return {
    typeDocument: 'CNI',
    numeroDocument: l1.slice(5, 14).replace(/</g, ''),
    dateNaissance: mrzDateToIso(l2.slice(0, 6)),
    sexe: parseSex(l2[7]),
    dateExpiration: mrzDateToIso(l2.slice(8, 14), 'expiry'),
    nationalite: l2.slice(15, 18).replace(/</g, '') || 'FRA',
    nom,
    prenoms,
  };
}

// CNI française ancien format (avant 2021) : 2 lignes de 36.
//   L1: IDFRA DUPONT <<<<<<<<<< 123456
//   L2: 123456789012 JEAN<<PIERRE 900101 7 M 1
function parseOldFrenchCni(lines) {
  const l1 = lines.find((l) => l.startsWith('IDFRA') && l.length >= 34 && l.length <= 38);
  if (!l1) return null;
  const idx = lines.indexOf(l1);
  const l2 = lines[idx + 1];
  if (!l2 || l2.length < 34) return null;

  const nom = l1.slice(5, 30).replace(/</g, ' ').trim();
  const prenoms = l2
    .slice(13, 27)
    .split(/<+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    typeDocument: 'CNI',
    numeroDocument: l2.slice(0, 12).replace(/</g, ''),
    nom,
    prenoms,
    dateNaissance: mrzDateToIso(l2.slice(27, 33)),
    sexe: parseSex(l2[34]),
    nationalite: 'FRA',
  };
}

// ─── Fallback heuristique sur texte libre ────────────────────────

function frDateToIso(d, m, y) {
  const dd = d.padStart(2, '0');
  const mm = m.padStart(2, '0');
  if (Number(mm) < 1 || Number(mm) > 12) return null;
  return `${y}-${mm}-${dd}`;
}

function parseHeuristic(rawText) {
  const text = rawText.replace(/ /g, ' ');
  const fields = {};

  const nomM = text.match(/(?:Nom|NOM)\s*[:.]?\s*([A-ZÀ-Ý][A-ZÀ-Ý' -]{1,40})(?:\n|$)/m);
  if (nomM) fields.nom = nomM[1].trim();

  const prenomM = text.match(/Pr[ée]nom\(?s?\)?\s*[:.]?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' ,-]{1,60})(?:\n|$)/im);
  if (prenomM) {
    fields.prenoms = prenomM[1]
      .split(/[,]+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  const dobM = text.match(/(?:n[ée]\(?e?\)?\s*le|naissance)\s*[:.]?\s*(\d{1,2})[\s./-](\d{1,2})[\s./-](\d{4})/i);
  if (dobM) fields.dateNaissance = frDateToIso(dobM[1], dobM[2], dobM[3]);

  const sexeM = text.match(/Sexe\s*[:.]?\s*([MF])/i);
  if (sexeM) fields.sexe = sexeM[1].toUpperCase();

  const lieuM = text.match(/(?:à|a)\s*[:.]?\s*([A-ZÀ-Ý][A-Za-zÀ-ÿ' -]{2,40})\s*(?:\(|\n)/);
  if (lieuM && fields.dateNaissance) fields.lieuNaissance = lieuM[1].trim();

  return Object.keys(fields).length >= 2 ? fields : null;
}

// ─── Point d'entrée ──────────────────────────────────────────────

async function extractIdentity(imageBuffer) {
  const worker = await getWorker();
  const { data } = await worker.recognize(imageBuffer);
  const rawText = data?.text || '';

  const mrzLines = extractMrzLines(rawText);
  const mrzResult =
    parseTd3(mrzLines) || parseTd1(mrzLines) || parseOldFrenchCni(mrzLines);

  if (mrzResult && mrzResult.nom && mrzResult.dateNaissance) {
    return { fields: mrzResult, method: 'mrz', confidence: data?.confidence ?? null };
  }

  // MRZ partiel : on le complète avec l'heuristique plutôt que de le jeter.
  const heuristic = parseHeuristic(rawText);
  if (mrzResult || heuristic) {
    return {
      fields: { ...(heuristic || {}), ...(mrzResult || {}) },
      method: mrzResult ? 'mrz_partial' : 'heuristic',
      confidence: data?.confidence ?? null,
    };
  }

  return { fields: null, method: 'none', confidence: data?.confidence ?? null };
}

module.exports = {
  extractIdentity,
  terminate,
  // Exposés pour les tests unitaires (parsing pur, sans OCR).
  _internals: { parseTd1, parseTd3, parseOldFrenchCni, parseHeuristic, extractMrzLines, mrzDateToIso },
};
