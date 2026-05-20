// Routes exposant la recherche d'entreprises (API gouv) au frontend,
// et import d'une fiche client à partir d'un SIREN.

const express = require('express');
const router = express.Router();

const pappers = require('../lib/pappers');
const { getSupabaseAdmin } = require('../lib/db');

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

router.get(
  '/siren/:siren',
  asyncRoute(async (req, res) => {
    let data;
    try {
      data = await pappers.searchBySiren(req.params.siren);
    } catch (e) {
      if (e.status === 400) return res.status(400).json({ error: 'siren_invalid' });
      throw e;
    }
    if (!data) return res.status(404).json({ error: 'not_found' });
    // On omet le raw dans la réponse standard (le front peut le re-demander via import).
    const { raw, ...summary } = data;
    res.json(summary);
  }),
);

router.get(
  '/search',
  asyncRoute(async (req, res) => {
    const q = req.query.q;
    const limit = req.query.limit;
    if (!q || !String(q).trim()) return res.status(400).json({ error: 'missing_query' });
    const data = await pappers.searchByName(q, limit);
    res.json(data);
  }),
);

router.post(
  '/import',
  asyncRoute(async (req, res) => {
    const { siren } = req.body || {};
    if (!siren) return res.status(400).json({ error: 'missing_siren' });

    let entreprise;
    try {
      entreprise = await pappers.searchBySiren(siren);
    } catch (e) {
      if (e.status === 400) return res.status(400).json({ error: 'siren_invalid' });
      throw e;
    }
    if (!entreprise) return res.status(404).json({ error: 'not_found' });

    const supa = getSupabaseAdmin();

    // Évite les doublons : si un client avec ce SIREN existe déjà dans l'org, on le renvoie.
    const { data: existing } = await supa
      .from('clients')
      .select('*')
      .eq('organization_id', req.currentOrgId)
      .eq('siren', entreprise.siren)
      .is('archived_at', null)
      .maybeSingle();
    if (existing) {
      return res.json({ client: existing, already_existed: true });
    }

    const insertPayload = {
      organization_id: req.currentOrgId,
      siren: entreprise.siren,
      denomination: entreprise.denomination || `SIREN ${entreprise.siren}`,
      forme_juridique: entreprise.forme_juridique || null,
      code_naf: entreprise.code_naf || null,
      date_immatriculation: entreprise.date_immatriculation || null,
      adresse_siege: entreprise.adresse_siege || null,
      pappers_data: entreprise.raw || null,
      source: 'pappers',
    };

    const { data: client, error } = await supa
      .from('clients')
      .insert(insertPayload)
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'db_error', detail: error.message });

    res.status(201).json({ client });
  }),
);

module.exports = router;
