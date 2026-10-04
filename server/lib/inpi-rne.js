// Lecture du Registre national des entreprises (API RNE de l'INPI) : fiche à
// jour d'une entreprise, au même format que les liasses du Guichet unique.
// Sert de base aux modifications et radiations (la liasse = fiche actuelle +
// changements). Accès API activé sur le compte INPI du cabinet le 2026-10-04.
// Lecture seule.

const { getSupabaseAdmin } = require('./db');
const { decrypt } = require('./encryption');

const RNE_BASE = 'https://registre-national-entreprises.inpi.fr';
const tokens = new Map(); // orgId → { token, exp }

async function rneToken(orgId) {
  const hit = tokens.get(orgId);
  if (hit && hit.exp > Date.now()) return hit.token;
  const { data: org } = await getSupabaseAdmin()
    .from('organizations').select('inpi_username, inpi_password_encrypted')
    .eq('id', orgId).maybeSingle();
  if (!org?.inpi_username || !org?.inpi_password_encrypted) {
    throw Object.assign(new Error('Identifiants INPI non configurés pour ce cabinet.'), { status: 403 });
  }
  const r = await fetch(`${RNE_BASE}/api/sso/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: org.inpi_username, password: decrypt(org.inpi_password_encrypted) }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw Object.assign(new Error(
      /connection_type_not_allowed/.test(txt)
        ? "L'accès API RNE n'est pas activé sur le compte INPI du cabinet (data.inpi.fr)."
        : `Connexion RNE impossible (HTTP ${r.status}).`,
    ), { status: r.status });
  }
  const { token } = await r.json();
  tokens.set(orgId, { token, exp: Date.now() + 50 * 60 * 1000 });
  return token;
}

// Fiche RNE d'une entreprise : { siren, formality: { content, typePersonne, formeJuridique, … } }
async function getCompany(orgId, siren) {
  const s = String(siren || '').replace(/\D/g, '');
  if (s.length !== 9) throw Object.assign(new Error(`SIREN invalide : ${siren}`), { status: 400 });
  const token = await rneToken(orgId);
  const r = await fetch(`${RNE_BASE}/api/companies/${s}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 404) throw Object.assign(new Error(`Entreprise ${s} introuvable au RNE.`), { status: 404 });
  if (!r.ok) throw Object.assign(new Error(`Lecture RNE impossible (HTTP ${r.status}).`), { status: r.status });
  return r.json();
}

// Résumé lisible de la fiche (pour l'agent).
function summarizeCompany(company) {
  const f = company?.formality || {};
  const c = f.content || {};
  const pm = c.personneMorale;
  const pp = c.personnePhysique;
  const ident = pm?.identite || pp?.identite || {};
  const adr = (pm || pp)?.adresseEntreprise?.adresse || {};
  const personne = (x) => x?.individu?.descriptionPersonne || x?.descriptionPersonne || {};
  return {
    siren: company?.siren,
    typePersonne: f.typePersonne,
    formeJuridique: f.formeJuridique,
    denomination: ident.entreprise?.denomination || [personne(pp?.identite?.entrepreneur).prenoms?.[0], personne(pp?.identite?.entrepreneur).nom].filter(Boolean).join(' ') || null,
    objet: ident.description?.objet || null,
    capital: ident.description?.montantCapital ?? null,
    codeApe: ident.entreprise?.codeApe || null,
    siege: [adr.numVoie, adr.typeVoie, adr.voie, adr.codePostal, adr.commune].filter(Boolean).join(' ') || null,
    dirigeants: (pm?.composition?.pouvoirs || [])
      .filter((p) => p.actif !== false)
      .map((p) => ({
        role: p.roleEntreprise,
        nom: personne(p).nom || p.entreprise?.denomination || null,
        prenoms: personne(p).prenoms || [],
      })),
    beneficiairesEffectifs: (pm?.beneficiairesEffectifs || []).length,
    etablissementsOuverts: company?.nombreEtablissementsOuverts ?? null,
    derniereMiseAJour: company?.updatedAt || null,
  };
}

module.exports = { getCompany, summarizeCompany };
