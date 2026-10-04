// Connaissances propres au cabinet, générées sur le VPS à partir de son
// historique de formalités et JAMAIS versionnées (le dépôt est public) :
//   /opt/compta-proxy/data/inpi-playbook.md   guide d'expertise anonymisé
//   /opt/compta-proxy/data/modeles/<cat>.md   modèles de rédaction anonymisés,
//                                             tirés de pièces validées par le greffe
// Lus à la demande, avec cache invalidé quand le fichier change.

const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = process.env.KNOWLEDGE_DIR || '/opt/compta-proxy/data';
const MODELE_MAX_CHARS = 30000;

const cache = new Map();

function readCached(file) {
  try {
    const { mtimeMs } = fs.statSync(file);
    const hit = cache.get(file);
    if (hit && hit.mtimeMs === mtimeMs) return hit.text;
    const text = fs.readFileSync(file, 'utf8');
    cache.set(file, { mtimeMs, text });
    return text;
  } catch {
    return null;
  }
}

function playbook() {
  return readCached(path.join(DATA_DIR, 'inpi-playbook.md'));
}

// Modèle de rédaction d'une catégorie (statuts_sasu, non_condamnation, mandat…).
function modele(categorie) {
  if (!/^[a-z_]+$/.test(String(categorie || ''))) return null;
  const text = readCached(path.join(DATA_DIR, 'modeles', `${categorie}.md`));
  return text ? text.slice(0, MODELE_MAX_CHARS) : null;
}

function modelesDisponibles() {
  try {
    return fs.readdirSync(path.join(DATA_DIR, 'modeles')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
  } catch {
    return [];
  }
}

module.exports = { playbook, modele, modelesDisponibles };
