// Agent Formalités — mène une formalité de bout en bout à partir d'une
// conversation : collecte des informations, création du dossier, génération
// des statuts et des actes annexes.
//
// Boucle d'outils manuelle (Claude API + tool use) : l'agent dit QUOI faire,
// chaque outil exécute côté serveur avec les contrôles d'accès du cabinet.
// L'agent ne signe et ne dépose JAMAIS : signature Yousign, validation interne
// et dépôt INPI restent des actions humaines depuis la page du dossier.
//
// Historique : le client renvoie à chaque tour l'historique complet renvoyé au
// tour précédent (messages Anthropic, blocs thinking inclus, sans modification).
// Le dossier courant est porté par ctx.dossierId (jamais par le modèle).

const { toFile } = require('@anthropic-ai/sdk');
const { getAnthropic, MODELS, draftDocument, searchLegalChunks } = require('./ai');
const { extractText } = require('./text-extract');
const { getSupabaseAdmin } = require('./db');
const { buildPipeline } = require('./orchestrator');
const { buildPersonneMorale } = require('./inpi-builder');
const { markdownToDocx } = require('./markdown-docx');
const { Packer } = require('docx');
const {
  generateStatutsForDossier, storeDossierDocument, signedUrl,
} = require('./dossier-docs');
const { SUPPORTED_FORMES } = require('./doc-generator');

const MAX_ITERATIONS = 12;

// Pièces jointes acceptées dans le chat (lues par Claude).
const ATTACHMENT_TYPES = {
  'application/pdf': 'document',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};
const DOCX_MAX_CHARS = 60000;

// Tarifs ($ / million de tokens) pour l'estimation affichée dans les logs :
// Opus 5.5 pour l'agent, Sonnet 5 pour la rédaction des actes (MODELS.balanced).
const PRICES = { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 };
const DRAFT_PRICES = { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 };

function costUsd(u, p) {
  return (u.input * p.input + u.output * p.output + u.cacheWrite * p.cacheWrite + u.cacheRead * p.cacheRead) / 1e6;
}
const CREATION_FORMES = ['SASU', 'SAS', 'EURL', 'SARL', 'SCI', 'HOLDING'];

// ─── Actes annexes rédigés par l'IA ───────────────────────────────
const ACTES = {
  declaration_non_condamnation: "Déclaration sur l'honneur de non-condamnation et de filiation du dirigeant",
  liste_souscripteurs: 'Liste des souscripteurs et état des versements',
  attestation_domiciliation: 'Attestation de domiciliation du siège social',
  pouvoir_formalites: 'Pouvoir pour accomplir les formalités',
  annonce_legale: "Avis de constitution (annonce légale)",
  decision_nomination: 'Acte de nomination du premier dirigeant',
  pv_decision: "Procès-verbal de décision des associés",
  annonce_modification: "Avis de modification (annonce légale)",
  pv_dissolution: 'Procès-verbal de dissolution anticipée',
  autre: 'Document juridique',
};

// ─── Définition des outils ────────────────────────────────────────
const PERSONNE = {
  type: 'object',
  properties: {
    nom: { type: 'string' },
    prenoms: { type: 'array', items: { type: 'string' } },
    dateNaissance: { type: 'string', description: 'YYYY-MM-DD' },
    lieuNaissance: { type: 'string', description: 'Commune de naissance' },
    nationalite: { type: 'string', description: 'Code ISO3, ex FRA' },
    sexe: { type: 'string', description: 'M ou F' },
    adresse: {
      type: 'object',
      properties: {
        voie: { type: 'string' }, complement: { type: 'string' },
        codePostal: { type: 'string' }, commune: { type: 'string' },
      },
    },
  },
};

const TOOLS = [
  {
    name: 'enregistrer_dossier',
    description:
      "Crée le dossier de formalité (au premier appel) puis met à jour ses informations. N'envoie que les champs connus ou modifiés : ils sont fusionnés avec l'existant (les listes remplacent la précédente). Renvoie la référence du dossier et la liste des informations encore manquantes. Appelle-le dès que la forme juridique et la dénomination (ou la société concernée) sont connues, puis à chaque nouvelle information.",
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        typeFormalite: { type: 'string', enum: ['CREATION', 'MODIFICATION', 'RADIATION'] },
        formeJuridique: { type: 'string', enum: ['SASU', 'SAS', 'EURL', 'SARL', 'SCI', 'HOLDING', 'AE', 'AUTRE'] },
        denomination: { type: 'string' },
        sigle: { type: 'string' },
        nomCommercial: { type: 'string' },
        objet: { type: 'string', description: 'Objet social rédigé (formulation statutaire)' },
        activitePrincipale: { type: 'string', description: "Description courte de l'activité réellement exercée" },
        codeApe: { type: 'string', description: 'Code APE/NAF, ex 7022Z' },
        capitalEuros: { type: 'number' },
        nbTitres: { type: 'integer', description: "Nombre total d'actions ou de parts" },
        capitalVariable: { type: 'boolean' },
        dureeAnnees: { type: 'integer' },
        dateClotureExercice: { type: 'string', description: 'MM-DD, ex 12-31' },
        datePremiereCloture: { type: 'string', description: 'YYYY-MM-DD' },
        dateDebutActivite: { type: 'string', description: 'YYYY-MM-DD' },
        siege: PERSONNE.properties.adresse,
        domiciliationChezDirigeant: { type: 'boolean' },
        societeDomiciliation: { type: 'boolean' },
        dirigeant: {
          ...PERSONNE,
          properties: { ...PERSONNE.properties, role: { type: 'string', description: 'PRESIDENT, GERANT, DG…' } },
        },
        associes: {
          type: 'array',
          items: {
            ...PERSONNE,
            properties: {
              ...PERSONNE.properties,
              apportEuros: { type: 'number' },
              apportNatureEuros: { type: 'number' },
              pourcentage: { type: 'number' },
              nbTitres: { type: 'integer' },
            },
          },
        },
        regimeImposition: { type: 'string', enum: ['IS', 'IR'] },
        regimeTVA: { type: 'string', enum: ['FRANCHISE_BASE', 'REEL_SIMPLIFIE', 'REEL_NORMAL'] },
        siren: { type: 'string', description: 'Pour une modification ou une cessation' },
        operation: { type: 'string', description: "Pour une modification/cessation : description précise de l'opération (ex transfert de siège au …, nomination de …)" },
        dateEffet: { type: 'string', description: "Date d'effet de l'opération, YYYY-MM-DD" },
      },
    },
  },
  {
    name: 'generer_statuts',
    description:
      'Génère les statuts (.docx éditable) de la société à partir des données du dossier et les ajoute aux pièces. Uniquement pour une création SASU, SAS, EURL, SARL ou SCI, une fois dénomination, objet, capital, siège, dirigeant et associés renseignés.',
    eager_input_streaming: true,
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'rediger_acte',
    description:
      "Rédige un acte annexe (.docx) à partir des données du dossier et l'ajoute aux pièces. Types : " +
      Object.entries(ACTES).map(([k, v]) => `${k} (${v})`).join(', ') +
      '. Utilise "instructions" pour préciser le contenu (ex résolutions d\'un PV, titre d\'un document "autre").',
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: Object.keys(ACTES) },
        instructions: { type: 'string' },
      },
      required: ['type'],
    },
  },
  {
    name: 'etat_dossier',
    description:
      "Renvoie l'avancement du dossier courant (étapes : collecte, identité, rédaction, signature, contrôle, dépôt INPI) et la liste de ses documents.",
    eager_input_streaming: true,
    input_schema: { type: 'object', properties: {} },
  },
];

const SYSTEM_PROMPT = `Tu es l'Agent Formalités de Legaly AI, plateforme française pour cabinets d'experts-comptables, avocats et formalistes. Tu prends en charge une formalité juridique d'entreprise de bout en bout : tu recueilles les informations, tu crées le dossier, tu génères les statuts et tous les actes nécessaires, puis tu indiques au professionnel ce qu'il lui reste à faire.

<perimetre>
- Créations de sociétés : SASU, SAS, EURL, SARL, SCI, holding (SAS).
- Modifications (transfert de siège, changement de dirigeant, d'objet, de dénomination, de capital…) et cessations (dissolution, radiation) : dossier + procès-verbal + annonce légale.
- Tu ne signes rien, tu ne déposes rien à l'INPI et tu n'envoies rien à des tiers : la signature électronique, la validation interne et le dépôt se font par le professionnel depuis la page du dossier.
</perimetre>

<documents_joints>
Le professionnel peut joindre des documents : pièces d'identité, statuts, procès-verbaux d'assemblée, Kbis, annonces légales, justificatifs de domicile, contrats de domiciliation, attestations de dépôt des fonds…
- Lis-les attentivement et utilise-les comme source prioritaire : extrais les informations utiles (identité et date/lieu de naissance du dirigeant, dénomination, SIREN, capital, siège, décisions votées…) et enregistre-les avec enregistrer_dossier.
- Dis brièvement ce que tu as trouvé dans chaque document, et signale ce qui est illisible, expiré, incohérent avec le reste du dossier ou contradictoire entre deux documents.
- Pour une modification, un PV d'assemblée suffit souvent à identifier l'opération : déduis-la et fais-la confirmer.
- Ne recopie jamais en entier dans tes réponses un numéro de pièce d'identité ou une donnée bancaire.
- Les fichiers joints sont automatiquement rangés dans les pièces du dossier.
</documents_joints>

<methode>
1. Comprends l'opération. Si la forme juridique n'est pas donnée, propose la plus adaptée en une phrase et demande confirmation.
2. Dès que la forme et la dénomination (ou la société concernée) sont connues, appelle enregistrer_dossier, puis rappelle-le à chaque nouvelle information.
3. Demande les informations manquantes par petits groupes logiques (au plus 5 questions à la fois, numérotées), en t'appuyant sur la liste "manquants" renvoyée par l'outil. Ne redemande jamais ce qui est déjà connu.
4. Rédige toi-même l'objet social au format statutaire à partir de l'activité décrite, et déduis le code APE le plus probable ; présente-les pour validation.
5. Quand les données d'une création sont complètes : generer_statuts, puis les actes du dossier de constitution adaptés à la forme (declaration_non_condamnation pour chaque dirigeant, liste_souscripteurs pour une SAS/SASU, attestation_domiciliation, pouvoir_formalites, annonce_legale). Pour une modification ou une cessation : pv_decision ou pv_dissolution, puis annonce_modification, puis pouvoir_formalites.
6. Termine par un récapitulatif : documents produits, informations à vérifier, et prochaines étapes humaines (relire les actes, fournir les pièces d'identité, déposer le capital et obtenir l'attestation de dépôt des fonds, publier l'annonce, envoyer en signature, valider, déposer à l'INPI).
</methode>

<regles>
- N'invente JAMAIS une donnée personnelle ou d'identification (nom, date ou lieu de naissance, adresse, SIREN, montant). Si elle manque, demande-la ; si le professionnel veut avancer sans, laisse le champ vide et signale-le.
- Les valeurs par défaut usuelles sont acceptables si tu les annonces : durée 99 ans, clôture au 31 décembre, impôt sur les sociétés (IR pour une SCI), franchise en base de TVA.
- Vérifie la cohérence : somme des apports = capital, répartition des titres, dirigeant cohérent avec la forme (président pour SAS/SASU, gérant pour SARL/EURL/SCI), associé unique pour SASU/EURL, au moins deux associés pour SAS/SARL/SCI.
- Signale les points d'attention juridiques utiles (capital faible, activité réglementée, apport en nature nécessitant un commissaire aux apports…) sans faire de longues dissertations.
- Réponds en français, de façon concise et structurée (Markdown léger). Quand un outil échoue, explique simplement le problème et la marche à suivre.
- Les documents produits sont des projets à faire relire par le professionnel ; dis-le une fois dans le récapitulatif final.
</regles>`;

// ─── Fusion des données ───────────────────────────────────────────
const DATA_KEYS = Object.keys(TOOLS[0].input_schema.properties);

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function mergeData(base, patch) {
  const out = { ...(base || {}) };
  for (const [k, v] of Object.entries(patch || {})) {
    if (v === undefined || v === null) continue;
    if (isPlainObject(v) && isPlainObject(out[k])) out[k] = mergeData(out[k], v);
    else out[k] = v;
  }
  return out;
}

function hasAdresse(a) {
  return Boolean(a?.voie && a?.codePostal && a?.commune);
}

function personneManquants(p, label) {
  const m = [];
  if (!p?.nom) m.push(`${label} : nom`);
  if (!p?.prenoms?.length || !p.prenoms[0]) m.push(`${label} : prénom(s)`);
  if (!p?.dateNaissance) m.push(`${label} : date de naissance`);
  if (!p?.lieuNaissance) m.push(`${label} : lieu de naissance`);
  if (!p?.nationalite) m.push(`${label} : nationalité`);
  if (!hasAdresse(p?.adresse)) m.push(`${label} : adresse personnelle`);
  return m;
}

function computeManquants(d) {
  const type = d.typeFormalite || 'CREATION';
  const m = [];
  if (type !== 'CREATION') {
    if (!d.denomination) m.push('dénomination de la société');
    if (!d.siren) m.push('SIREN');
    if (!d.formeJuridique) m.push('forme juridique');
    if (!d.operation) m.push("description de l'opération");
    if (!d.dateEffet) m.push("date d'effet");
    return m;
  }
  const forme = d.formeJuridique;
  if (!forme) m.push('forme juridique');
  if (!d.denomination) m.push('dénomination');
  if (!d.objet) m.push('objet social');
  if (!(Number(d.capitalEuros) > 0)) m.push('capital social');
  if (!hasAdresse(d.siege)) m.push('adresse du siège');
  m.push(...personneManquants(d.dirigeant, 'dirigeant'));
  const pluri = ['SAS', 'SARL', 'SCI', 'HOLDING'].includes(forme);
  const associes = d.associes || [];
  if (pluri) {
    if (associes.length < 2) m.push('associés (au moins deux, avec leurs apports)');
    associes.forEach((a, i) => {
      if (!a.nom) m.push(`associé ${i + 1} : nom`);
      if (!(Number(a.apportEuros) >= 0) || a.apportEuros === undefined) m.push(`associé ${i + 1} : montant de l'apport`);
    });
    const total = associes.reduce((s, a) => s + (Number(a.apportEuros) || 0), 0);
    if (associes.length && Number(d.capitalEuros) > 0 && Math.round(total) !== Math.round(Number(d.capitalEuros))) {
      m.push(`cohérence : apports (${total} €) ≠ capital (${d.capitalEuros} €)`);
    }
  }
  return m;
}

// ─── Accès au dossier ─────────────────────────────────────────────
async function loadDossier(supa, ctx) {
  if (!ctx.dossierId) return null;
  const { data: dossier } = await supa.from('dossiers').select('*').eq('id', ctx.dossierId).maybeSingle();
  if (!dossier) {
    const e = new Error('Dossier introuvable.');
    e.code = 'not_found';
    throw e;
  }
  const allowed =
    ctx.isAdmin || dossier.user_id === ctx.userId ||
    (dossier.organization_id && dossier.organization_id === ctx.orgId);
  if (!allowed) {
    const e = new Error('Accès refusé à ce dossier.');
    e.code = 'forbidden';
    throw e;
  }
  return dossier;
}

function dossierUrl(dossier) {
  return `/dossiers/${dossier.id}`;
}

// ─── Exécution des outils ─────────────────────────────────────────
async function toolEnregistrer(supa, ctx, input) {
  const patch = Object.fromEntries(Object.entries(input || {}).filter(([k]) => DATA_KEYS.includes(k)));
  let dossier = await loadDossier(supa, ctx);
  const data = mergeData(dossier?.metadata?.agent_data, patch);
  const type = data.typeFormalite || 'CREATION';
  const forme = data.formeJuridique ? String(data.formeJuridique).toUpperCase() : null;
  const isSocieteCreation = type === 'CREATION' && CREATION_FORMES.includes(forme);

  const fields = {
    client_name: data.denomination ? String(data.denomination).toUpperCase() : 'Nouveau dossier',
    type_formalite: type,
    forme_juridique: forme && ['AE', 'EI', 'SASU', 'SAS', 'EURL', 'SARL', 'SCI', 'SA', 'SNC', 'HOLDING', 'AUTRE'].includes(forme) ? forme : null,
    naf_code: data.codeApe || null,
    siren: data.siren || null,
  };
  if (isSocieteCreation) fields.inpi_content = buildPersonneMorale(data);

  if (!dossier) {
    const { data: created, error } = await supa
      .from('dossiers')
      .insert({
        ...fields,
        user_id: ctx.userId,
        organization_id: ctx.orgId,
        reference: `CMP-${Date.now().toString(36).toUpperCase()}`,
        statut: 'DRAFT',
        assigned_to: ctx.userId,
        metadata: { agent_data: data, created_by_agent: true },
      })
      .select()
      .single();
    if (error) throw new Error(`Création du dossier impossible : ${error.message}`);
    dossier = created;
    ctx.dossierId = dossier.id;
    try {
      await supa.from('audit_logs').insert({
        organization_id: ctx.orgId, user_id: ctx.userId,
        action: 'agent.dossier.created', resource_type: 'dossier', resource_id: dossier.id,
        metadata: { type_formalite: type, forme },
      });
    } catch {}
  } else {
    const { data: updated, error } = await supa
      .from('dossiers')
      .update({ ...fields, metadata: { ...(dossier.metadata || {}), agent_data: data } })
      .eq('id', dossier.id)
      .select()
      .single();
    if (error) throw new Error(`Mise à jour du dossier impossible : ${error.message}`);
    dossier = updated;
  }

  const manquants = computeManquants(data);
  return {
    result: {
      dossier: { reference: dossier.reference, type: type, forme, denomination: fields.client_name },
      manquants,
      complet: manquants.length === 0,
      statuts_disponibles: type === 'CREATION' && SUPPORTED_FORMES.includes(forme === 'HOLDING' ? 'SAS' : forme),
    },
    event: {
      kind: 'dossier',
      label: `Dossier ${dossier.reference} enregistré`,
      detail: manquants.length ? `${manquants.length} information(s) manquante(s)` : 'Informations complètes',
      href: dossierUrl(dossier),
      dossier: { id: dossier.id, reference: dossier.reference, denomination: fields.client_name },
    },
  };
}

async function toolStatuts(supa, ctx) {
  const dossier = await loadDossier(supa, ctx);
  if (!dossier) throw new Error("Aucun dossier : appelle d'abord enregistrer_dossier.");
  const overrides = String(dossier.forme_juridique).toUpperCase() === 'HOLDING' ? { formeJuridique: 'SAS' } : {};
  const doc = await generateStatutsForDossier(supa, dossier, ctx.userId, overrides);
  const url = await signedUrl(supa, doc.file_path);
  return {
    result: { document: doc.name, ajoute_aux_pieces: true },
    event: { kind: 'document', label: 'Statuts générés', detail: doc.name, href: url, docHref: dossierUrl(dossier) },
  };
}

async function toolActe(supa, ctx, input) {
  const type = input?.type;
  if (!ACTES[type]) throw new Error(`Type d'acte inconnu : ${type}`);
  const dossier = await loadDossier(supa, ctx);
  if (!dossier) throw new Error("Aucun dossier : appelle d'abord enregistrer_dossier.");
  const data = dossier.metadata?.agent_data || {};
  const label = type === 'autre' && input.instructions ? input.instructions.slice(0, 80) : ACTES[type];

  const brief = [
    `Acte demandé : ${ACTES[type]}.`,
    `Formalité : ${data.typeFormalite || dossier.type_formalite} — référence ${dossier.reference}.`,
    'Données du dossier (JSON) :',
    JSON.stringify(data, null, 2),
    input.instructions ? `Instructions du professionnel : ${input.instructions}` : '',
    "Utilise exactement ces données. Pour toute donnée absente, insère un champ [À COMPLÉTER : …]. Date du jour : " +
      new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + '.',
  ].filter(Boolean).join('\n');

  let chunks = [];
  try {
    chunks = await searchLegalChunks(`${ACTES[type]} ${data.formeJuridique || ''}`, { matchCount: 4, minSimilarity: 0.35 });
  } catch { /* rédaction possible sans sources */ }

  const draft = await draftDocument({ docType: 'autre', title: label, brief, chunks });
  if (draft.refused) throw new Error('Rédaction refusée par le modèle.');
  if (ctx.draftUsage && draft.usage) {
    ctx.draftUsage.calls += 1;
    ctx.draftUsage.input += draft.usage.input_tokens || 0;
    ctx.draftUsage.output += draft.usage.output_tokens || 0;
    ctx.draftUsage.cacheWrite += draft.usage.cache_creation_input_tokens || 0;
    ctx.draftUsage.cacheRead += draft.usage.cache_read_input_tokens || 0;
  }
  const buffer = await Packer.toBuffer(markdownToDocx(label, draft.markdown));
  // Supabase Storage refuse les clés non ASCII (accents) : on translittère.
  const slug = (s, n) => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, n);
  const filename = `${slug(label, 70)}-${slug(dossier.client_name, 30)}.docx`;
  const doc = await storeDossierDocument(supa, dossier, { buffer, filename, docType: type.toUpperCase(), userId: ctx.userId });
  const url = await signedUrl(supa, doc.file_path);
  return {
    result: { document: doc.name, ajoute_aux_pieces: true },
    event: { kind: 'document', label, detail: doc.name, href: url, docHref: dossierUrl(dossier) },
  };
}

async function toolEtat(supa, ctx) {
  const dossier = await loadDossier(supa, ctx);
  if (!dossier) return { result: { dossier: null, message: 'Aucun dossier créé pour le moment.' } };
  const { data: documents } = await supa
    .from('dossier_documents')
    .select('id, name, doc_type, status, mime_type, created_at')
    .eq('dossier_id', dossier.id);
  const pipeline = buildPipeline(dossier, documents || []);
  return {
    result: {
      reference: dossier.reference,
      progression: pipeline.progress,
      etapes: pipeline.steps.map((s) => ({ etape: s.title, statut: s.status, detail: s.detail })),
      documents: (documents || []).map((d) => d.name),
    },
    event: { kind: 'pipeline', label: 'Avancement du dossier', detail: `${pipeline.progress.percent} %`, href: `/dossiers/${dossier.id}/orchestrator`, pipeline },
  };
}

const TOOL_LABELS = {
  enregistrer_dossier: 'Enregistrement du dossier',
  generer_statuts: 'Rédaction des statuts',
  rediger_acte: "Rédaction d'un acte",
  etat_dossier: "Lecture de l'avancement",
};

async function runTool(name, input, ctx) {
  const supa = getSupabaseAdmin();
  if (!isPlainObject(input)) throw new Error('Paramètres invalides.');
  switch (name) {
    case 'enregistrer_dossier': return toolEnregistrer(supa, ctx, input);
    case 'generer_statuts': return toolStatuts(supa, ctx);
    case 'rediger_acte': return toolActe(supa, ctx, input);
    case 'etat_dossier': return toolEtat(supa, ctx);
    default: throw new Error(`Outil inconnu : ${name}`);
  }
}

// ─── Boucle de l'agent ────────────────────────────────────────────
// emit(event, data) : 'text' {text} | 'tool' {id, name, status, label, ...} | 'dossier' {...}
// Transforme les pièces jointes en blocs de contenu Claude.
// PDF et images passent par l'API Files (envoyés une fois, référencés ensuite
// par file_id : l'historique reste léger). Les .docx sont convertis en texte.
async function attachmentBlocks(client, attachments) {
  const blocks = [];
  for (const a of attachments) {
    const kind = ATTACHMENT_TYPES[a.mime];
    if (kind === 'docx') {
      const { text } = await extractText(a.buffer);
      const clipped = String(text || '').slice(0, DOCX_MAX_CHARS);
      blocks.push({
        type: 'text',
        text: `Contenu du document joint « ${a.name} » :\n"""\n${clipped || '(document vide ou illisible)'}\n"""`,
      });
      continue;
    }
    const uploaded = await client.files.upload({
      file: await toFile(a.buffer, a.name, { type: a.mime }),
    });
    a.fileId = uploaded.id;
    if (kind === 'document') {
      blocks.push({ type: 'document', source: { type: 'file', file_id: uploaded.id }, title: a.name });
    } else {
      blocks.push({ type: 'text', text: `Image jointe : « ${a.name} »` });
      blocks.push({ type: 'image', source: { type: 'file', file_id: uploaded.id } });
    }
  }
  return blocks;
}

async function runAgentTurn({ history, input, attachments = [], ctx, emit }) {
  const client = getAnthropic();
  const docBlocks = attachments.length ? await attachmentBlocks(client, attachments) : [];
  const userText = input || 'Voici des documents pour le dossier : analyse-les.';
  const userContent = docBlocks.length ? [...docBlocks, { type: 'text', text: userText }] : userText;
  const messages = [...history, { role: 'user', content: userContent }];
  const usage = { calls: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };
  ctx.draftUsage = { calls: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stream = client.beta.messages.stream({
      model: MODELS.agent,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Cache : prompt système + outils, et (top-level) tout l'historique jusqu'au
      // dernier bloc — chaque appel de la boucle relit l'historique en cache.
      cache_control: { type: 'ephemeral' },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: TOOLS,
      messages,
    });
    stream.on('text', (delta) => emit('text', { text: delta }));

    let message;
    try {
      message = await stream.finalMessage();
      const u = message.usage || {};
      usage.calls += 1;
      usage.input += u.input_tokens || 0;
      usage.output += u.output_tokens || 0;
      usage.cacheWrite += u.cache_creation_input_tokens || 0;
      usage.cacheRead += u.cache_read_input_tokens || 0;
    } catch (err) {
      if (err?.status) throw err; // erreur API typée : on remonte
      emit('text', { text: '\n' });
      continue; // entrée d'outil illisible : on relance le tour
    }

    const toolUses = message.content.filter((b) => b.type === 'tool_use');

    // Un refus ou une coupure max_tokens peut laisser un tool_use sans résultat :
    // on n'ajoute pas ce tour à l'historique (il rendrait le suivant invalide).
    if (message.stop_reason === 'refusal') {
      emit('text', { text: '\n\nJe ne peux pas traiter cette demande.' });
      if (!toolUses.length) messages.push({ role: 'assistant', content: message.content });
      break;
    }
    if (message.stop_reason === 'max_tokens' && toolUses.length) {
      throw new Error('Réponse tronquée (max_tokens), relancez votre demande.');
    }

    messages.push({ role: 'assistant', content: message.content });
    if (message.stop_reason !== 'tool_use' || toolUses.length === 0) break;

    const results = [];
    for (const tu of toolUses) {
      emit('tool', { id: tu.id, name: tu.name, status: 'start', label: TOOL_LABELS[tu.name] || tu.name });
      try {
        const { result, event } = await runTool(tu.name, tu.input, ctx);
        emit('tool', { id: tu.id, name: tu.name, status: 'done', ...(event || { label: TOOL_LABELS[tu.name] }) });
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
      } catch (e) {
        console.error('[agent tool]', tu.name, e.message);
        emit('tool', { id: tu.id, name: tu.name, status: 'error', label: TOOL_LABELS[tu.name] || tu.name, detail: e.message });
        results.push({ type: 'tool_result', tool_use_id: tu.id, is_error: true, content: String(e.message).slice(0, 500) });
      }
    }
    messages.push({ role: 'user', content: results });
  }

  usage.agentCostUsd = Math.round(costUsd(usage, PRICES) * 1000) / 1000;
  usage.drafts = ctx.draftUsage;
  usage.draftsCostUsd = Math.round(costUsd(ctx.draftUsage, DRAFT_PRICES) * 1000) / 1000;
  usage.costUsd = Math.round((usage.agentCostUsd + usage.draftsCostUsd) * 1000) / 1000;
  console.log('[agent usage]', JSON.stringify(usage));
  return { messages, dossierId: ctx.dossierId || null, usage };
}

module.exports = { runAgentTurn, ACTES, ATTACHMENT_TYPES };
