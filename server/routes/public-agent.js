// Parcours gratuit de la page « Indépendants et TPE » — SANS authentification.
// L'orientation est un arbre de décision côté navigateur (aucun appel à l'IA) ;
// le serveur fournit la grille et enregistre le parcours choisi, en recalculant
// lui-même le prix (le navigateur ne fixe jamais un montant).
//
//   GET  /api/public/tarifs          → grille des formalités vendues
//   POST /api/public/commandes  {code, forme?, resume?, reponses: [{question, reponse}]}
//                                    → { commande_id, offre }
//   GET  /api/public/commandes/:id   → parcours enregistré + offre (reprise)

const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const tarifs = require('../lib/tarifs');
const { getSupabaseAdmin } = require('../lib/db');

const PAR_IP_JOUR = Number(process.env.PUBLIC_PARCOURS_PAR_IP || 30);
const UUID = /^[0-9a-f-]{36}$/i;
const ipHash = (req) => crypto.createHash('sha256').update(`${req.ip}|${process.env.MASTER_ENCRYPTION_KEY || ''}`).digest('hex').slice(0, 32);
const texte = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

router.get('/tarifs', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ tarifs: Object.keys(tarifs.TARIFS).map((code) => tarifs.offre(code)) });
});

router.get('/commandes/:id', async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'bad_id' });
  const { data: c } = await getSupabaseAdmin().from('commandes').select('id, statut, offre, affichage').eq('id', req.params.id).maybeSingle();
  if (!c) return res.status(404).json({ error: 'not_found' });
  res.json({ commande_id: c.id, statut: c.statut, offre: c.offre, affichage: c.affichage });
});

router.post('/commandes', async (req, res) => {
  const { code, forme, resume, reponses } = req.body || {};
  const o = tarifs.offre(String(code || ''));
  if (!o) return res.status(400).json({ error: 'code_inconnu' });
  if (!Array.isArray(reponses) || reponses.length > 12) return res.status(400).json({ error: 'reponses_invalides' });
  const supa = getSupabaseAdmin();
  const hash = ipHash(req);
  const { count } = await supa.from('commandes').select('id', { count: 'exact', head: true })
    .eq('ip_hash', hash).gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  if ((count || 0) >= PAR_IP_JOUR) return res.status(429).json({ error: 'limite', detail: 'Trop de demandes aujourd’hui depuis cette connexion. Réessayez demain.' });

  // Fil lisible par l'assistant de l'espace entrepreneur (récapitulatif de commande)
  const affichage = [];
  for (const r of reponses) {
    const q = texte(r?.question, 300);
    const a = texte(r?.reponse, 600);
    if (!q || !a) continue;
    affichage.push({ type: 'assistant', text: q }, { type: 'user', text: a });
  }
  const offre = { ...o, forme: forme ? texte(forme, 80) : null, resume: resume ? texte(resume, 600) : null };
  affichage.push({ type: 'offre', offre });
  const { data, error } = await supa.from('commandes').insert({ ip_hash: hash, affichage, offre, statut: 'offre' }).select('id').single();
  if (error) return res.status(500).json({ error: 'db_error' });
  res.status(201).json({ commande_id: data.id, offre });
});

module.exports = router;
