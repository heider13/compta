// Paiement des formalités du Guichet unique — en LECTURE seule : l'API mandataire
// ne permet ni de payer ni d'envoyer une délégation de paiement (actions humaines
// sur procedures.inpi.fr). On lit les paniers (montant, détail, statut, payeur) pour :
//   - afficher « à payer / délégation en attente / payé » et le montant ;
//   - alerter quand un paiement ou une délégation traîne ;
//   - refacturer les frais officiels au client.
//
// Délégation : le payeur d'un panier est la personne qui paie. Quand son e-mail
// n'est pas celui d'un membre du cabinet (ni l'identifiant INPI), c'est une
// délégation de paiement à un tiers (en général le client).

const inpi = require('../inpi');
const { getSupabaseAdmin } = require('./db');

const STATUTS_PAIEMENT = ['PAYMENT_PENDING', 'AMENDMENT_PAYMENT_PENDING'];
const ALERTE_JOURS = Number(process.env.PAIEMENT_ALERTE_JOURS || 3);
// Lien direct vers une formalité sur le Guichet unique (même identifiant que l'API),
// où se trouvent le paiement et la délégation de paiement ; connexion demandée si besoin.
const GU_FORMALITE_URL = process.env.GU_FORMALITE_URL || 'https://guichet-unique.inpi.fr/{id}';
const GU_ACCUEIL = 'https://procedures.inpi.fr/?/';

const cacheEmails = new Map(); // orgId → { emails, exp }

async function emailsCabinet(orgId) {
  const hit = cacheEmails.get(orgId);
  if (hit && hit.exp > Date.now()) return hit.emails;
  const supa = getSupabaseAdmin();
  const emails = new Set();
  const { data: org } = await supa.from('organizations').select('inpi_username').eq('id', orgId).maybeSingle();
  if (org?.inpi_username && /@/.test(org.inpi_username)) emails.add(org.inpi_username.toLowerCase());
  const { data: membres } = await supa.from('memberships').select('user_id').eq('organization_id', orgId);
  for (const m of membres || []) {
    try {
      const { data } = await supa.auth.admin.getUserById(m.user_id);
      if (data?.user?.email) emails.add(data.user.email.toLowerCase());
    } catch {}
  }
  const list = [...emails];
  cacheEmails.set(orgId, { emails: list, exp: Date.now() + 10 * 60 * 1000 });
  return list;
}

function lienGuichet(f) {
  if (GU_FORMALITE_URL) {
    return { url: GU_FORMALITE_URL.replace('{id}', encodeURIComponent(f.id)).replace('{liasse}', encodeURIComponent(f.liasseNumber || '')), direct: true };
  }
  return { url: GU_ACCUEIL, direct: false };
}

const jours = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);

// Synthèse de paiement d'une formalité (liste ou détail du Guichet unique).
function paiementDe(f, emails = []) {
  const paniers = (f.carts || []).map((c) => {
    const mail = c.payer?.payerMail ? String(c.payer.payerMail).toLowerCase() : null;
    return {
      id: c.id,
      statut: c.status, // TO_PAY, PAID, REFUNDED, CANCELED
      total_cents: c.total || 0,
      date: c.paymentDate || c.updated || c.created || null,
      cree_le: c.created || null,
      payeur: mail,
      delegation: Boolean(mail && emails.length && !emails.includes(mail)),
      lignes: (c.cartRates || []).map((r) => ({
        libelle: r.rate?.label || r.rate?.code || 'Frais',
        beneficiaire: r.recipientName || null,
        montant_cents: r.subTotal ?? r.amount ?? 0,
      })),
    };
  });
  const somme = (st) => paniers.filter((p) => p.statut === st).reduce((s, p) => s + p.total_cents, 0);
  const aPayer = paniers.filter((p) => p.statut === 'TO_PAY');
  const delegation = aPayer.find((p) => p.delegation);
  const a_payer_cents = somme('TO_PAY');
  const paye_cents = somme('PAID');
  // Un brouillon non signé a déjà un panier « à payer » : c'est le montant prévu,
  // payable seulement une fois la formalité au stade du paiement.
  const auPaiement = STATUTS_PAIEMENT.includes(f.status);
  let statut = 'aucun';
  if (a_payer_cents > 0 && auPaiement) statut = delegation ? 'delegation_en_attente' : 'a_payer';
  else if (a_payer_cents > 0) statut = 'a_venir';
  else if (paye_cents > 0) statut = 'paye';
  const depuis = aPayer.map((p) => p.cree_le).filter(Boolean).sort()[0] || (STATUTS_PAIEMENT.includes(f.status) ? f.statusDate : null);
  return {
    statut,
    a_payer_cents,
    paye_cents,
    rembourse_cents: somme('REFUNDED'),
    delegation: delegation ? { email: delegation.payeur } : null,
    depuis: statut === 'a_payer' || statut === 'delegation_en_attente' ? depuis : null,
    jours_attente: statut === 'a_payer' || statut === 'delegation_en_attente' ? jours(depuis) : null,
    paniers: paniers.filter((p) => p.statut !== 'CANCELED'),
    guichet: lienGuichet(f),
  };
}

const euros = (c) => `${(c / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

// Vérification périodique : statut de paiement recopié sur les dossiers liés et
// notification des membres du cabinet quand un paiement traîne.
async function verifierPaiements() {
  const supa = getSupabaseAdmin();
  const { data: orgs } = await supa.from('organizations').select('id').not('inpi_username', 'is', null);
  for (const { id: orgId } of orgs || []) {
    try {
      const client = inpi.forOrg(orgId);
      const emails = await emailsCabinet(orgId);
      const formalites = [];
      for (let page = 1; page <= 3; page++) {
        const r = await client.listFormalities({ page, itemsPerPage: 100, 'order[statusDate]': 'desc' });
        const m = r?.['hydra:member'] || [];
        formalites.push(...m);
        if (m.length < 100) break;
      }
      // Statut de paiement sur les dossiers liés à une formalité
      const ids = formalites.map((f) => String(f.id));
      const { data: dossiers } = await supa.from('dossiers').select('id, metadata').eq('organization_id', orgId).in('metadata->>inpi_formality_id', ids);
      for (const d of dossiers || []) {
        const f = formalites.find((x) => String(x.id) === String(d.metadata?.inpi_formality_id));
        if (!f) continue;
        const p = paiementDe(f, emails);
        const resume = { statut: p.statut, a_payer_cents: p.a_payer_cents, paye_cents: p.paye_cents, delegation: p.delegation, depuis: p.depuis, maj: new Date().toISOString() };
        if (JSON.stringify({ ...d.metadata?.inpi_paiement, maj: null }) !== JSON.stringify({ ...resume, maj: null })) {
          await supa.from('dossiers').update({ metadata: { ...(d.metadata || {}), inpi_paiement: resume } }).eq('id', d.id);
        }
      }
      // Alertes
      const { data: membres } = await supa.from('memberships').select('user_id').eq('organization_id', orgId);
      const limite = new Date(Date.now() - ALERTE_JOURS * 86400000).toISOString();
      for (const f of formalites) {
        const p = paiementDe(f, emails);
        if (!p.jours_attente || p.jours_attente < ALERTE_JOURS) continue;
        const link = `/inpi/${f.id}`;
        const societe = f.companyName || f.nomDossier || f.liasseNumber;
        const title = p.statut === 'delegation_en_attente' ? `Délégation de paiement impayée — ${societe}` : `Paiement en attente — ${societe}`;
        const body = p.statut === 'delegation_en_attente'
          ? `${euros(p.a_payer_cents)} : délégation envoyée à ${p.delegation.email}, impayée depuis ${p.jours_attente} jours. Relancez le client.`
          : `${euros(p.a_payer_cents)} à payer sur le Guichet unique depuis ${p.jours_attente} jours (liasse ${f.liasseNumber}).`;
        for (const m of membres || []) {
          const { data: deja } = await supa.from('notifications').select('id').eq('user_id', m.user_id).eq('type', 'inpi_paiement').eq('link', link).gte('created_at', limite).limit(1);
          if (deja?.length) continue;
          await supa.from('notifications').insert({ user_id: m.user_id, organization_id: orgId, type: 'inpi_paiement', title, body, link });
        }
      }
    } catch (e) {
      console.error('[paiements]', orgId, e.message);
    }
  }
}

module.exports = { paiementDe, emailsCabinet, lienGuichet, verifierPaiements, euros, STATUTS_PAIEMENT };
