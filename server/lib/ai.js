// Assistant IA fiscal/comptable/juridique — RAG + Claude.
// - Embedding des questions via le service Solon local (127.0.0.1:8100)
// - Recherche pgvector (match_legal_chunks) dans Supabase
// - Réponse Claude Opus 4.8 en streaming, avec citations des sources

const Anthropic = require('@anthropic-ai/sdk');
const { getSupabaseAdmin } = require('./db');

const EMBED_URL = process.env.EMBED_SERVICE_URL || 'http://127.0.0.1:8100';
const CLAUDE_MODEL = 'claude-opus-4-8';

let _anthropic = null;
function getAnthropic() {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      const e = new Error('ANTHROPIC_API_KEY manquant — configurer /etc/compta-proxy.env');
      e.status = 500;
      e.code = 'anthropic_not_configured';
      throw e;
    }
    _anthropic = new Anthropic();
  }
  return _anthropic;
}

async function embed(texts, kind = 'query') {
  const res = await fetch(`${EMBED_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, kind }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    const e = new Error(`Service embeddings ${res.status}: ${txt.slice(0, 200)}`);
    e.status = 502;
    e.code = 'embed_service_error';
    throw e;
  }
  const json = await res.json();
  return json.embeddings;
}

async function searchLegalChunks(question, { matchCount = 8, minSimilarity = 0.35 } = {}) {
  const [queryEmbedding] = await embed([question], 'query');
  const supa = getSupabaseAdmin();
  const { data, error } = await supa.rpc('match_legal_chunks', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    min_similarity: minSimilarity,
  });
  if (error) {
    const e = new Error(`pgvector: ${error.message}`);
    e.status = 500;
    e.code = 'vector_search_error';
    throw e;
  }
  return data || [];
}

const SYSTEM_PROMPT = `Tu es l'assistant fiscal, comptable et juridique de Compta, une plateforme SaaS pour experts-comptables, avocats et directions juridiques françaises.

<contexte_metier>
Tes utilisateurs sont des professionnels du chiffre et du droit. Réponds à leur niveau : précis, technique, avec les références exactes (articles de code, BOFiP, directives). Domaines : droit des sociétés français, fiscalité (IS, IR, TVA, régimes micro), comptabilité (PCG), formalités INPI/Guichet Unique, droit européen applicable.
</contexte_metier>

<regles_de_reponse>
- Appuie chaque affirmation juridique sur les EXTRAITS DE SOURCES fournis ci-dessous quand ils sont pertinents. Cite-les au format [n] où n est le numéro de l'extrait.
- Si les sources fournies ne couvrent pas la question, dis-le explicitement et réponds sur tes connaissances générales en le signalant clairement ("Sur la base de mes connaissances générales, à vérifier :").
- Mentionne les dates de version des textes quand elles sont fournies — le droit change.
- Termine par une ligne "⚖️ Cette réponse est fournie à titre informatif et ne constitue pas une consultation juridique."
- Si la question sort du droit/fiscal/comptable, redirige poliment vers le sujet de la plateforme.
- Réponds en français, en Markdown structuré (titres courts, listes).
</regles_de_reponse>`;

function buildContextBlock(chunks) {
  if (!chunks.length) {
    return "AUCUNE SOURCE INDEXÉE PERTINENTE TROUVÉE pour cette question. Signale-le et réponds sur connaissances générales avec prudence.";
  }
  return chunks
    .map((c, i) => {
      const version = c.date_version ? ` (version du ${c.date_version})` : '';
      return `[${i + 1}] ${c.title}${version} — ${c.source.toUpperCase()} ${c.source_id}\nURL: ${c.url || 'n/a'}\n${c.content}`;
    })
    .join('\n\n---\n\n');
}

// Lance le stream Claude. `history` = [{role, content}] des tours précédents.
function streamAnswer({ question, history = [], chunks }) {
  const client = getAnthropic();
  const contextBlock = buildContextBlock(chunks);

  const messages = [
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: `EXTRAITS DE SOURCES OFFICIELLES :\n\n${contextBlock}\n\n---\n\nQUESTION : ${question}`,
    },
  ];

  return client.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages,
  });
}

// ─── Rédaction de documents légaux / contractuels ────────────────

const DOC_TYPES = {
  contrat_prestation: 'Contrat de prestation de services',
  cgv: 'Conditions générales de vente',
  bail_commercial: 'Bail commercial',
  pacte_associes: "Pacte d'associés",
  pv_ag: "Procès-verbal d'assemblée générale",
  contrat_travail: 'Contrat de travail',
  nda: 'Accord de confidentialité (NDA)',
  cession_parts: 'Acte de cession de parts sociales',
  mandat: 'Mandat',
  autre: 'Document juridique',
};

const DRAFT_SYSTEM = `Tu es un juriste rédacteur au sein de Compta, plateforme pour cabinets français (experts-comptables, avocats).

Tu rédiges des documents juridiques et contractuels de droit français, prêts à être retravaillés par le professionnel.

<regles>
- Produis un document COMPLET et structuré en Markdown : titre, préambule/parties, articles numérotés, clauses standard du type de document demandé, signatures.
- Adapte au droit français en vigueur. Quand une clause dépend d'un choix non précisé, insère un champ à compléter entre crochets : [À COMPLÉTER : ...].
- Appuie-toi sur les EXTRAITS DE SOURCES fournis quand ils sont pertinents (cite l'article dans la clause concernée).
- Reste neutre et équilibré entre les parties sauf instruction contraire.
- Termine par : "⚖️ Projet généré automatiquement — à faire relire par un professionnel avant signature."
- Réponds UNIQUEMENT avec le document en Markdown, sans commentaire d'introduction.
</regles>`;

async function draftDocument({ docType, brief, chunks = [] }) {
  const client = getAnthropic();
  const label = DOC_TYPES[docType] || DOC_TYPES.autre;
  const context = chunks.length
    ? chunks
        .map((c, i) => `[${i + 1}] ${c.title} (${c.source}) — ${c.content}`)
        .join('\n\n---\n\n')
    : 'Aucune source spécifique fournie ; appuie-toi sur le droit français général.';

  const msg = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    thinking: { type: 'adaptive' },
    system: [{ type: 'text', text: DRAFT_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: `SOURCES OFFICIELLES :\n${context}\n\n---\n\nTYPE DE DOCUMENT : ${label}\n\nBRIEF DU PROFESSIONNEL :\n${brief}\n\nRédige le document complet en Markdown.`,
    }],
  });

  const text = (msg.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return { title: label, markdown: text, refused: msg.stop_reason === 'refusal', usage: msg.usage };
}

// ─── Agent de pré-remplissage de formalité ───────────────────────
// À partir d'un brief en langage naturel, extrait un JSON normalisé que
// chaque wizard mappe dans sa structure (même pattern que l'OCR).

const PREFILL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    formeJuridique: { type: 'string', description: 'AE, SASU, SAS, EURL, SARL, SCI, HOLDING ou vide' },
    denomination: { type: 'string' },
    sigle: { type: 'string' },
    objet: { type: 'string', description: "Objet social / description de l'activité" },
    capitalEuros: { type: 'number', description: 'Capital social en euros (0 si inconnu)' },
    dureeAnnees: { type: 'integer' },
    codeApe: { type: 'string', description: 'Code APE/NAF si déductible (ex 7022Z), sinon vide' },
    dateDebutActivite: { type: 'string', description: 'YYYY-MM-DD ou vide' },
    siege: {
      type: 'object', additionalProperties: false,
      properties: {
        voie: { type: 'string' }, codePostal: { type: 'string' }, commune: { type: 'string' },
      },
      required: ['voie', 'codePostal', 'commune'],
    },
    dirigeant: {
      type: 'object', additionalProperties: false,
      properties: {
        nom: { type: 'string' }, prenoms: { type: 'array', items: { type: 'string' } },
        dateNaissance: { type: 'string', description: 'YYYY-MM-DD ou vide' },
        lieuNaissance: { type: 'string' }, sexe: { type: 'string', description: 'M ou F' },
        nationalite: { type: 'string', description: 'code ISO3 ex FRA' },
        role: { type: 'string', description: 'PRESIDENT, GERANT, etc.' },
      },
      required: ['nom', 'prenoms', 'dateNaissance', 'lieuNaissance', 'sexe', 'nationalite', 'role'],
    },
    associes: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          nom: { type: 'string' }, prenoms: { type: 'array', items: { type: 'string' } },
          apportEuros: { type: 'number' }, pourcentage: { type: 'number' },
        },
        required: ['nom', 'prenoms', 'apportEuros', 'pourcentage'],
      },
    },
    capitalVariable: { type: 'boolean' },
    champsManquants: {
      type: 'array', items: { type: 'string' },
      description: 'Libellés des informations clés absentes du brief, à demander au professionnel',
    },
  },
  required: ['formeJuridique', 'denomination', 'objet', 'capitalEuros', 'dirigeant', 'associes', 'champsManquants'],
};

const PREFILL_SYSTEM = `Tu es un agent de saisie de formalités juridiques INPI. À partir de la description d'une opération par un professionnel, tu extrais les informations structurées pour pré-remplir une liasse.

<regles>
- N'invente JAMAIS de données non déductibles (nom, date de naissance, adresse précise, SIREN). Laisse le champ vide et ajoute-le à "champsManquants".
- Déduis le code APE/NAF le plus probable de l'activité décrite quand c'est raisonnable ; sinon laisse vide.
- Capital : si non précisé, mets 0 et signale-le dans champsManquants.
- Durée société : 99 ans par défaut si non précisé.
- Le rôle du dirigeant dépend de la forme : PRESIDENT pour SAS/SASU, GERANT pour SARL/EURL/SCI.
- Sexe/nationalité du dirigeant : ne déduis le sexe du prénom que si évident ; nationalité FRA par défaut seulement si le contexte l'indique clairement, sinon vide.
- Sois exhaustif sur champsManquants : tout ce qu'il faudra saisir à la main.
</regles>`;

async function prefillFormality({ formeJuridique, brief }) {
  const client = getAnthropic();
  const msg = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    system: [{ type: 'text', text: PREFILL_SYSTEM, cache_control: { type: 'ephemeral' } }],
    output_config: { format: { type: 'json_schema', schema: PREFILL_SCHEMA } },
    messages: [{
      role: 'user',
      content: `Forme juridique visée : ${formeJuridique || 'à déduire du texte'}.\n\nDescription de l'opération :\n${brief}\n\nExtrais les informations structurées.`,
    }],
  });
  const text = (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    data = m ? JSON.parse(m[0]) : null;
  }
  return { data, refused: msg.stop_reason === 'refusal', usage: msg.usage };
}

// ─── Extraction structurée d'un document juridique déposé ──────────
// (PV d'assemblée générale, statuts, traité de cession…) → données de formalité.
const DOC_EXTRACT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    documentType: { type: 'string', description: 'statuts | pv_ag | traite_cession | rapport | autre' },
    societe: {
      type: 'object', additionalProperties: false,
      properties: {
        denomination: { type: 'string' }, sigle: { type: 'string' },
        formeJuridique: { type: 'string' }, siren: { type: 'string', description: '9 chiffres ou vide' },
        capitalEuros: { type: 'number' },
      },
      required: ['denomination', 'sigle', 'formeJuridique', 'siren', 'capitalEuros'],
    },
    dateActe: { type: 'string', description: "Date de l'acte/assemblée, YYYY-MM-DD ou vide" },
    lieu: { type: 'string' },
    decisions: {
      type: 'array',
      description: 'Décisions/résolutions votées ou clauses clés du document',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          type: { type: 'string', description: 'TRANSFERT_SIEGE, CHANGEMENT_DIRIGEANT, AUGMENTATION_CAPITAL, REDUCTION_CAPITAL, CHANGEMENT_OBJET, CHANGEMENT_DENOMINATION, APPROBATION_COMPTES, AFFECTATION_RESULTAT, CESSION_PARTS, DISSOLUTION, AUTRE' },
          resume: { type: 'string', description: 'Résumé en une phrase' },
        },
        required: ['type', 'resume'],
      },
    },
    nouveauSiege: {
      type: 'object', additionalProperties: false,
      description: "Renseigné uniquement en cas de transfert de siège",
      properties: {
        voie: { type: 'string' }, codePostal: { type: 'string' }, commune: { type: 'string' },
      },
      required: ['voie', 'codePostal', 'commune'],
    },
    dirigeants: {
      type: 'array',
      description: 'Dirigeants nommés, démissionnaires ou maintenus',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          nom: { type: 'string' }, prenoms: { type: 'array', items: { type: 'string' } },
          fonction: { type: 'string', description: 'PRESIDENT, GERANT, DG, etc.' },
          sens: { type: 'string', description: 'NOMINATION, DEMISSION, MAINTIEN' },
        },
        required: ['nom', 'prenoms', 'fonction', 'sens'],
      },
    },
    capital: {
      type: 'object', additionalProperties: false,
      description: "Renseigné uniquement en cas de modification du capital",
      properties: {
        ancienEuros: { type: 'number' }, nouveauEuros: { type: 'number' },
      },
      required: ['ancienEuros', 'nouveauEuros'],
    },
    exercice: {
      type: 'object', additionalProperties: false,
      description: "Renseigné pour une approbation des comptes",
      properties: {
        dateCloture: { type: 'string', description: 'YYYY-MM-DD ou vide' },
        resultatEuros: { type: 'number' },
        affectation: { type: 'string', description: 'ex: report à nouveau, réserves, dividendes' },
      },
      required: ['dateCloture', 'resultatEuros', 'affectation'],
    },
    champsManquants: {
      type: 'array', items: { type: 'string' },
      description: 'Informations attendues mais absentes/illisibles dans le document',
    },
  },
  required: ['documentType', 'societe', 'dateActe', 'lieu', 'decisions', 'dirigeants', 'champsManquants'],
};

const DOC_EXTRACT_SYSTEM = `Tu es un agent d'analyse de documents juridiques d'entreprise (procès-verbaux d'assemblée générale, statuts, traités de cession, rapports de gérance). On te fournit le TEXTE BRUT d'un document (issu d'un PDF, d'un scan OCR ou d'un Word) déposé par un formaliste. Tu en extrais les informations structurées utiles à la préparation d'une formalité INPI.

<regles>
- N'invente JAMAIS. Si une information n'apparaît pas clairement dans le texte, laisse le champ vide (ou 0 pour un montant) et ajoute-la à "champsManquants".
- Le texte peut être bruité (OCR imparfait) : corrige les coquilles évidentes mais ne devine pas les chiffres (SIREN, capital, montants) si le doute est réel.
- "decisions" : liste chaque résolution/décision votée dans un PV, ou les clauses structurantes de statuts. Classe chacune par type.
- Ne remplis "nouveauSiege" qu'en cas de transfert de siège, "capital" qu'en cas de modification de capital, "exercice" que pour une approbation des comptes. Sinon laisse ces objets absents.
- "dirigeants" : indique le sens (NOMINATION / DEMISSION / MAINTIEN) pour chaque personne citée en cette qualité.
- Sois précis et concis dans les résumés.
</regles>`;

async function extractDocument({ text, docTypeHint }) {
  const client = getAnthropic();
  // Plafonne l'entrée pour maîtriser les tokens (un PV/statuts tient largement).
  const clipped = String(text || '').slice(0, 24000);
  const msg = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 3072,
    thinking: { type: 'adaptive' },
    system: [{ type: 'text', text: DOC_EXTRACT_SYSTEM, cache_control: { type: 'ephemeral' } }],
    output_config: { format: { type: 'json_schema', schema: DOC_EXTRACT_SCHEMA } },
    messages: [{
      role: 'user',
      content: `Type de document supposé : ${docTypeHint || 'à déduire'}.\n\nTEXTE DU DOCUMENT :\n"""\n${clipped}\n"""\n\nExtrais les informations structurées.`,
    }],
  });
  const out = (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  let data;
  try {
    data = JSON.parse(out);
  } catch {
    const m = out.match(/\{[\s\S]*\}/);
    data = m ? JSON.parse(m[0]) : null;
  }
  return { data, refused: msg.stop_reason === 'refusal', usage: msg.usage };
}

module.exports = {
  embed, searchLegalChunks, streamAnswer, draftDocument, DOC_TYPES,
  prefillFormality, extractDocument, CLAUDE_MODEL,
};
