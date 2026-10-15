// Greffe compétent (registre du commerce) d'après la commune du siège : référentiel
// de l'Annuaire de l'administration (Service-Public), tribunaux de commerce et tribunaux
// des activités économiques (data/referentiels/greffes-communes.json, Licence Ouverte).
// Non couverts : Alsace-Moselle (tribunaux judiciaires) et Guadeloupe / La Réunion
// (deux tribunaux mixtes chacun) → null, à demander au professionnel.

const REF = require('../data/referentiels/greffes-communes.json');

// Communes à arrondissements : code « ville entière » → un arrondissement
const ALIAS = { 13055: '13201', 69123: '69381', 75056: '75101' };

function tribunal(codeInseeCommune) {
  const c = String(codeInseeCommune || '').trim().toUpperCase();
  if (!c) return null;
  const idx = REF.communes[c] ?? REF.communes[ALIAS[c]] ?? (c.startsWith('97') ? REF.communes[`dep:${c.slice(0, 3)}`] : undefined);
  return idx === undefined ? null : REF.tribunaux[idx];
}

// Ville du greffe pour la mention « RCS de … » : « Tribunal de commerce d'Ajaccio » → Ajaccio,
// « Tribunal des activités économiques du Havre » → Le Havre.
function villeGreffe(codeInseeCommune) {
  const t = tribunal(codeInseeCommune);
  if (!t) return null;
  const reste = t.replace(/^Tribunal (?:mixte )?(?:de commerce|des activités économiques)\s*/i, '');
  const m = /^(de la |de l'|de l’|de |d'|d’|du |des )(.+)$/i.exec(reste);
  if (!m) return null;
  const prefixe = { 'du ': 'Le ', 'des ': 'Les ', 'de la ': 'La ' }[m[1].toLowerCase()] || '';
  m[1] = m[2];
  return `${prefixe}${m[1].trim()}`;
}

module.exports = { tribunal, villeGreffe };
