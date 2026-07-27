// Webhook dispatcher — diffuse les évènements internes vers les URL HTTP
// enregistrées par les organisations (table `public.webhooks`).
//
// Évènements supportés (préfixés par ressource) :
//   - dossier.created
//   - dossier.updated
//   - dossier.status_changed
//   - dossier.validated
//   - dossier.rejected
//   - client.created
//   - client.updated
//
// Sécurité : chaque payload est signé HMAC-SHA256 avec le `secret` du webhook.
//   Header de la requête sortante : `X-Legaly-Signature: <hex>`
//
// Fiabilité MVP : timeout 5s, 1 retry après 30s en cas d'échec (status >=400 ou réseau).
// Sur prod, à remplacer par une vraie queue (BullMQ + Redis) avec back-off exponentiel.

const crypto = require('crypto');
const { getSupabaseAdmin } = require('./db');

const TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 30000;

/**
 * Calcule la signature HMAC SHA-256 d'un body JSON.
 */
function sign(secret, bodyString) {
  return crypto.createHmac('sha256', secret).update(bodyString).digest('hex');
}

/**
 * Envoie un POST HTTP signé vers une URL.
 * @returns {Promise<{ ok: boolean, status?: number, error?: string }>}
 */
async function postSigned(url, secret, bodyString) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const signature = sign(secret, bodyString);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Legaly-Signature': signature,
        'User-Agent': 'Compta-Webhooks/1.0',
      },
      body: bodyString,
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Met à jour le compteur de succès ou d'échec d'un webhook après tentative.
 */
async function recordOutcome(webhookId, success) {
  const supa = getSupabaseAdmin();
  if (success) {
    await supa
      .from('webhooks')
      .update({ last_triggered_at: new Date().toISOString(), failure_count: 0 })
      .eq('id', webhookId);
  } else {
    // Incrément manuel (pas d'increment atomique natif Supabase REST sans RPC).
    const { data: cur } = await supa
      .from('webhooks')
      .select('failure_count')
      .eq('id', webhookId)
      .single();
    const next = ((cur?.failure_count ?? 0) + 1);
    await supa
      .from('webhooks')
      .update({ failure_count: next, last_triggered_at: new Date().toISOString() })
      .eq('id', webhookId);
  }
}

/**
 * Dispatch d'un évènement à toutes les webhooks actives de l'organisation
 * qui ont l'event dans leur liste `events`.
 *
 * @param {string} orgId        Organization UUID
 * @param {string} event        ex. 'dossier.created'
 * @param {object} payload      Payload arbitraire JSON-serializable
 * @returns {Promise<{ dispatched: number, failed: number }>}
 */
async function dispatchEvent(orgId, event, payload) {
  if (!orgId || !event) return { dispatched: 0, failed: 0 };

  const supa = getSupabaseAdmin();
  // events est text[] → contains via `.contains()` avec un array
  const { data: hooks, error } = await supa
    .from('webhooks')
    .select('id, url, secret, events')
    .eq('organization_id', orgId)
    .eq('active', true)
    .contains('events', [event]);

  if (error || !hooks || hooks.length === 0) {
    return { dispatched: 0, failed: 0 };
  }

  const body = JSON.stringify({
    event,
    payload,
    organization_id: orgId,
    timestamp: new Date().toISOString(),
  });

  let dispatched = 0;
  let failed = 0;

  // On envoie en parallèle pour ne pas bloquer l'appelant trop longtemps.
  await Promise.all(
    hooks.map(async (h) => {
      const first = await postSigned(h.url, h.secret, body);
      if (first.ok) {
        dispatched++;
        recordOutcome(h.id, true).catch(() => {});
        return;
      }
      // Retry 1x après 30s — fire-and-forget pour ne pas tenir la connexion.
      setTimeout(async () => {
        const second = await postSigned(h.url, h.secret, body);
        recordOutcome(h.id, second.ok).catch(() => {});
      }, RETRY_DELAY_MS).unref?.();
      failed++;
      // On enregistre dès maintenant le premier échec : si le retry réussit,
      // le `failure_count` sera reset à 0.
      recordOutcome(h.id, false).catch(() => {});
    }),
  );

  return { dispatched, failed };
}

/**
 * Helper : lance un dispatch en arrière-plan sans bloquer la route HTTP courante.
 * Idéal pour brancher depuis n'importe quel handler Express :
 *
 *   fireAndForget(req.currentOrgId, 'dossier.created', { id, ... })
 */
function fireAndForget(orgId, event, payload) {
  dispatchEvent(orgId, event, payload).catch((err) => {
    console.error(`[webhook] dispatch ${event} failed:`, err.message);
  });
}

module.exports = {
  dispatchEvent,
  fireAndForget,
  sign,
};
