// Test hors ligne des propositions d'échéances (aucun appel au RNE ni à la base).
// Lancer : node tests/test-echeances.js

const assert = require('node:assert');
const { propositionComptes, propositionInterne } = require('../lib/echeances')._interne;

const iso = (d) => d.toISOString().slice(0, 10);
const ilYaMois = (n) => { const d = new Date(); d.setUTCMonth(d.getUTCMonth() - n); return d; };
const ddmm = (d) => `${String(d.getUTCDate()).padStart(2, '0')}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
const client = { id: 'c1', siren: '123456789', denomination: 'SOCIETE TEST' };

// Exercice clos il y a 5 mois, comptes précédents déposés : approbation dans ~1 mois → proposée
const clos5 = ilYaMois(5);
const precedent = new Date(clos5); precedent.setUTCFullYear(precedent.getUTCFullYear() - 1);
const p = propositionComptes(client, { dernier: iso(precedent), verifie_le: new Date().toISOString() });
assert.ok(p, 'approbation proche : proposée');
assert.strictEqual(p.type, 'comptes_annuels');
assert.ok(p.cle.startsWith('comptes:c1:'));
assert.match(p.detail, /Approbation/);
assert.match(p.demande_agent, /Ne crée aucun brouillon/);

// Exercice clos il y a 2 mois : approbation dans ~4 mois → trop tôt
const clos2 = ilYaMois(2);
const prec2 = new Date(clos2); prec2.setUTCFullYear(prec2.getUTCFullYear() - 1);
assert.strictEqual(propositionComptes(client, { dernier: iso(prec2), verifie_le: new Date().toISOString() }), null, 'trop tôt');

// Comptes du dernier exercice déjà déposés : rien à proposer
assert.strictEqual(propositionComptes(client, { dernier: iso(clos5), verifie_le: new Date().toISOString() }), null, 'déjà déposés');

// Clôture connue seulement par la fiche RNE (aucun dépôt), exercice clos il y a 9 mois : en retard
const clos9 = ilYaMois(9);
const r = propositionComptes(client, { dernier: null, ddmm: ddmm(clos9), verifie_le: new Date().toISOString() });
assert.ok(r && /En retard/.test(r.detail), 'en retard');

// Lecture RNE en échec ou absente : pas de proposition
assert.strictEqual(propositionComptes(client, { erreur: 'x', verifie_le: new Date().toISOString() }), null);
assert.strictEqual(propositionComptes(client, undefined), null);

// Échéance interne
const i = propositionInterne({ id: 'd1', client_name: 'SOCIETE TEST', reference: 'CMP-1', internal_due_date: iso(new Date()) });
assert.strictEqual(i.cle, `interne:d1:${iso(new Date())}`);
assert.strictEqual(i.dossier_id, 'd1');

console.log('test-echeances : OK');
