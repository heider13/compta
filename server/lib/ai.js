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

module.exports = { embed, searchLegalChunks, streamAnswer, CLAUDE_MODEL };
