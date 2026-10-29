// Publication des annonces légales d'un dossier via l'API Les Echos Le Parisien Services
// (lib/lelps.js) : tarifs par journal, commande, suivi, attestation de parution.
//
// L'annonce est rédigée par l'agent (metadata.annonces_legales) ; la COMMANDE est toujours un
// geste humain confirmé (elle est facturée) : jamais déclenchée par l'agent.
//
// Données : metadata.parcours.annonce.publications = [{ reference, departement, type, journal,
//   date_parution, ttc, statut, commandee_le, attestation_id, justificatif_url, maj }]
// Statuts de l'API : pending → review → validated → published ; refused ; canceled.

const crypto = require('node:crypto');
const lelps = require('./lelps');

const erreur = (message, status) => Object.assign(new Error(message), { status });
const FINAUX = new Set(['published', 'canceled']);
const ACTIFS = new Set(['pending', 'review', 'validated', 'published']);
const LIBELLES = {
  pending: 'en cours de création', review: 'en relecture par le journal', validated: 'validée',
  published: 'parue', refused: 'refusée par le journal', canceled: 'annulée',
};

async function dossierExige(supa, orgId, dossierId) {
  const { data } = await supa.from('dossiers').select('id, reference, client_name, organization_id, metadata')
    .eq('id', dossierId).eq('organization_id', orgId).maybeSingle();
  if (!data) throw erreur('Dossier introuvable.', 404);
  return data;
}

// Écrit la liste des publications (et le statut des annonces rédigées) en relisant le dossier
async function enregistrer(supa, orgId, dossierId, modifier) {
  const d = await dossierExige(supa, orgId, dossierId);
  const meta = d.metadata || {};
  const parcours = { ...(meta.parcours || {}) };
  const annonce = { ...(parcours.annonce || {}) };
  const avant = annonce.publications || [];
  const publications = modifier(avant.map((p) => ({ ...p })));
  annonce.publications = publications;
  parcours.annonce = annonce;
  // Historique des annonces rédigées (page « Annonces légales ») : redigee → commandee → parue
  const annonces = (meta.annonces_legales || []).map((a, i, tout) => {
    if (i !== tout.length - 1) return a;
    const actives = publications.filter((p) => ACTIFS.has(p.statut));
    const statut = actives.some((p) => p.statut === 'published') ? 'parue' : actives.length ? 'commandee' : 'redigee';
    return { ...a, statut };
  });
  await supa.from('dossiers').update({ metadata: { ...meta, annonces_legales: annonces, parcours } }).eq('id', dossierId).eq('organization_id', orgId);
  return publications;
}

// Dernière annonce rédigée du dossier, et son texte pour un département
function annonceRedigee(meta, departement) {
  const entree = (meta.annonces_legales || []).at(-1);
  if (!entree) throw erreur("Aucune annonce rédigée : demandez d'abord à l'agent de la rédiger.", 400);
  const textes = entree.annonces || [];
  const dep = departement ? lelps.codeDepartement(departement) : null;
  const a = dep ? textes.find((x) => lelps.codeDepartement(x.departement) === dep) : textes[0];
  if (!a) throw erreur(`Pas d'annonce rédigée pour le département ${departement}.`, 400);
  return { entree, texte: a.texte, departement: lelps.codeDepartement(a.departement) };
}

// Une annonce incomplète ne part jamais au journal
function verifierComplete(entree, texte) {
  if (/\[À COMPLÉTER/i.test(texte)) throw erreur("L'annonce contient encore des informations à compléter : faites-la compléter par l'agent avant de la publier.", 400);
  if ((entree.a_completer || []).length) throw erreur(`Informations à compléter avant publication : ${entree.a_completer.join(' ; ')}.`, 400);
}

// Type d'annonce de l'API le plus proche de l'annonce rédigée (le cabinet peut en choisir un autre)
function typeSuggere(types, entree, data = {}) {
  const forme = String(data.formeJuridique || data.forme || '').toUpperCase();
  const op = `${entree?.type || ''} ${entree?.label || ''} ${data.operation || ''}`.toLowerCase();
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cherche = (...mots) => types.find((t) => mots.every((m) => norm(t.nom).includes(norm(m))));
  if (/constitution|creation|création/.test(op)) return cherche('constitution', forme) || cherche('constitution');
  if (/liquidation|cl[oô]ture/.test(op)) return cherche('cloture', 'liquidation') || cherche('liquidation');
  if (/dissolution/.test(op)) return cherche('dissolution');
  if (/si[eè]ge|transfert/.test(op)) return cherche('transfert', 'siege') || cherche('siege');
  if (/capital/.test(op)) return cherche('capital');
  if (/d[ée]nomination/.test(op)) return cherche('denomination');
  if (/g[ée]rant|pr[ée]sident|dirigeant|nomination/.test(op)) return cherche('dirigeant') || cherche('gerant') || cherche('nomination');
  return cherche('modification') || null;
}

// Ce qu'il faut au formulaire du panneau : types, type proposé, départements rédigés
async function options(supa, orgId, dossierId) {
  if (!lelps.configure()) throw erreur('Publication des annonces pas encore configurée sur le serveur.', 400);
  const d = await dossierExige(supa, orgId, dossierId);
  const meta = d.metadata || {};
  const entree = (meta.annonces_legales || []).at(-1);
  if (!entree) throw erreur("Aucune annonce rédigée : demandez d'abord à l'agent de la rédiger.", 400);
  const types = await lelps.typesAnnonce();
  return {
    types,
    type_propose: typeSuggere(types, entree, meta.agent_data || {})?.id || null,
    departements: (entree.annonces || []).map((a) => ({ code: lelps.codeDepartement(a.departement), caracteres: a.caracteres || String(a.texte || '').length })),
    a_completer: entree.a_completer || [],
    preproduction: lelps.preproduction(),
  };
}

async function devis(supa, orgId, dossierId, { typeId, departement, date }) {
  if (!typeId) throw erreur("Choisissez le type d'annonce.", 400);
  const d = await dossierExige(supa, orgId, dossierId);
  const { entree, texte, departement: dep } = annonceRedigee(d.metadata || {}, departement);
  verifierComplete(entree, texte);
  const tarifs = await lelps.estimer({ departement: dep, typeId, contenu: lelps.contenuHtml(texte), date });
  // Les moins chers d'abord ; à prix égal, les journaux du groupe (traitement plus rapide)
  tarifs.sort((a, b) => (a.prix.ttc ?? 1e9) - (b.prix.ttc ?? 1e9) || Number(b.journal.groupe) - Number(a.journal.groupe));
  return { departement: dep, tarifs };
}

// Commande : confirmation explicite + tarif revérifié juste avant (il peut changer d'un jour à l'autre)
async function commander(supa, orgId, dossierId, { typeId, departement, journalId, date, ttc_vu: ttcVu, confirme }) {
  if (confirme !== true) throw erreur('Confirmation de la commande requise.', 400);
  if (!typeId || !journalId) throw erreur("Choisissez le type d'annonce et le journal.", 400);
  const d = await dossierExige(supa, orgId, dossierId);
  const meta = d.metadata || {};
  const { entree, texte, departement: dep } = annonceRedigee(meta, departement);
  verifierComplete(entree, texte);
  const existantes = meta.parcours?.annonce?.publications || [];
  const active = existantes.find((p) => p.departement === dep && ACTIFS.has(p.statut));
  if (active) throw erreur(`Une annonce est déjà commandée pour ce département (${active.reference}, ${LIBELLES[active.statut]}).`, 409);

  const contenu = lelps.contenuHtml(texte);
  const tarifs = await lelps.estimer({ departement: dep, typeId, contenu, date });
  const choisi = tarifs.find((t) => t.journal.id === journalId);
  if (!choisi) throw erreur("Ce journal ne peut plus publier l'annonce à cette date : relancez la recherche des tarifs.", 409);
  if (typeof ttcVu === 'number' && Math.abs((choisi.prix.ttc ?? 0) - ttcVu) > 0.005) {
    throw erreur(`Le tarif a changé : ${choisi.prix.ttc} € TTC au lieu de ${ttcVu} €. Vérifiez-le puis confirmez de nouveau.`, 409);
  }

  // Même commande rejouée (double clic, délai dépassé) = même clé : jamais deux annonces facturées.
  // Une nouvelle commande après une annulation change de clé (compteur des essais).
  const essai = existantes.filter((p) => p.departement === dep).length;
  const cle = crypto.createHash('sha256').update([dossierId, dep, typeId, journalId, choisi.dateParution, contenu, essai].join('|')).digest('hex').slice(0, 64);
  const ref = `${d.reference || d.id.slice(0, 8)}-${dep}`.slice(0, 60);
  const r = await lelps.creer({ departement: dep, typeId, contenu, date: choisi.dateParution, journalId, referenceClient: ref }, cle);

  const publication = {
    reference: r.reference,
    departement: dep,
    type: { id: typeId, nom: r.type?.name || null },
    journal: { id: journalId, nom: r.newspaper?.name || choisi.journal.nom, support: choisi.journal.support },
    date_parution: r.publicationDate || choisi.dateParution,
    ttc: r.price?.total ?? choisi.prix.ttc,
    statut: r.status || 'pending',
    commandee_le: new Date().toISOString(),
    preproduction: lelps.preproduction(),
  };
  await enregistrer(supa, orgId, dossierId, (liste) => [...liste, publication]);
  return publication;
}

async function annulerPublication(supa, orgId, dossierId, { reference }) {
  const d = await dossierExige(supa, orgId, dossierId);
  const p = (d.metadata?.parcours?.annonce?.publications || []).find((x) => x.reference === reference);
  if (!p) throw erreur('Annonce introuvable dans ce dossier.', 404);
  if (!['validated', 'refused'].includes(p.statut)) throw erreur(`Annulation impossible : l'annonce est ${LIBELLES[p.statut] || p.statut} (seule une annonce validée ou refusée peut être annulée).`, 409);
  await lelps.annuler(reference);
  await enregistrer(supa, orgId, dossierId, (liste) => liste.map((x) => (x.reference === reference ? { ...x, statut: 'canceled', maj: new Date().toISOString() } : x)));
}

// ─── Suivi (rafraîchissement du panneau ou webhook) ───
const cacheLecture = new Map(); // reference → { exp, notice }
async function lireEnCache(reference) {
  const hit = cacheLecture.get(reference);
  if (hit && hit.exp > Date.now()) return hit.notice;
  const notice = await lelps.lire(reference);
  cacheLecture.set(reference, { exp: Date.now() + 60_000, notice });
  if (cacheLecture.size > 500) cacheLecture.delete(cacheLecture.keys().next().value);
  return notice;
}

// Attestation de parution (document « certificate » de l'annonce) : copiée dans le dossier
async function recupererAttestation(supa, dossier, p, notice) {
  const cert = (notice.documents || []).find((x) => x.type === 'certificate');
  if (!cert) return null;
  const pdf = await lelps.telechargerDocument(cert.id);
  if (pdf.slice(0, 5).toString() !== '%PDF-') return null;
  const { storeDossierDocument } = require('./dossier-docs'); // chargé à la demande (génération .docx)
  const doc = await storeDossierDocument(supa, dossier, {
    buffer: pdf, filename: `Attestation de parution — ${p.journal?.nom || 'journal'} — ${p.reference}.pdf`,
    docType: 'ATTESTATION_PARUTION', mimeType: 'application/pdf',
  });
  return doc?.id || null;
}

async function synchroniser(supa, orgId, dossier) {
  if (!lelps.configure()) return false;
  const liste = dossier.metadata?.parcours?.annonce?.publications || [];
  const aSuivre = liste.filter((p) => !FINAUX.has(p.statut) || (p.statut === 'published' && (!p.attestation_id || !p.justificatif_url)));
  if (!aSuivre.length) return false;
  const maj = {};
  for (const p of aSuivre) {
    try {
      const n = await lireEnCache(p.reference);
      const m = {};
      if (n.status && n.status !== p.statut) m.statut = n.status;
      if (n.publicationDate && n.publicationDate !== p.date_parution) m.date_parution = n.publicationDate;
      if (n.publicationProofUrl && !p.justificatif_url) m.justificatif_url = n.publicationProofUrl;
      if (!p.attestation_id && n.status !== 'pending' && n.status !== 'canceled') {
        const id = await recupererAttestation(supa, dossier, p, n).catch((e) => { console.error('[annonces] attestation', p.reference, e.message); return null; });
        if (id) m.attestation_id = id;
      }
      if (Object.keys(m).length) maj[p.reference] = { ...m, maj: new Date().toISOString() };
    } catch (e) {
      console.error('[annonces] suivi', p.reference, e.message);
    }
  }
  if (!Object.keys(maj).length) return false;
  await enregistrer(supa, orgId, dossier.id, (l) => l.map((x) => (maj[x.reference] ? { ...x, ...maj[x.reference] } : x)));
  return true;
}

// Webhook « legal_notice_publication_proof_created » : retrouve le dossier puis le resynchronise
async function surJustificatif(supa, reference) {
  if (!/^[A-Z0-9-]{4,40}$/i.test(String(reference || ''))) return false;
  const { data } = await supa.from('dossiers').select('id, organization_id, metadata')
    .contains('metadata', { parcours: { annonce: { publications: [{ reference }] } } }).limit(1);
  const dossier = data?.[0];
  if (!dossier) return false;
  cacheLecture.delete(reference);
  await synchroniser(supa, dossier.organization_id, dossier);
  return true;
}

// Résumé lisible pour le panneau du dossier
function resume(p) {
  const date = p.date_parution ? new Date(`${p.date_parution}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : null;
  const prix = typeof p.ttc === 'number' ? `${p.ttc.toFixed(2).replace('.', ',')} € TTC` : null;
  const quand = p.statut === 'published' ? `parue${date ? ` le ${date}` : ''}` : p.statut === 'validated' && date ? `parution le ${date}` : LIBELLES[p.statut] || p.statut;
  return [`${p.journal?.nom || 'Journal'} (dépt ${p.departement})`, quand, prix, p.preproduction ? 'test' : null].filter(Boolean).join(' · ');
}

module.exports = {
  configure: lelps.configure, options, devis, commander, annulerPublication, synchroniser, surJustificatif, resume,
  ACTIFS, LIBELLES,
  _interne: { typeSuggere, annonceRedigee, verifierComplete },
};
