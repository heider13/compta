-- Assistant IA juridique/fiscal — schéma RAG (pgvector + Solon embeddings 1024d)
-- À exécuter dans le SQL Editor Supabase.

create extension if not exists vector;

-- Documents sources (un texte officiel = un document)
create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('legifrance', 'eurlex', 'bofip')),
  source_id text not null,              -- ex: LEGIARTI000006222222, CELEX:32013R0575
  title text not null,
  url text,                             -- lien officiel citable
  doc_type text,                        -- code_article | directive | reglement | doctrine
  date_version date,                    -- version en vigueur au
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique (source, source_id)
);

-- Chunks embeddés (≤ ~400 tokens : limite 512 de Solon)
create table if not exists public.legal_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.legal_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1024) not null,      -- Solon-embeddings-large-0.1
  created_at timestamptz default now(),
  unique (document_id, chunk_index)
);

create index if not exists legal_chunks_embedding_idx
  on public.legal_chunks using hnsw (embedding vector_cosine_ops);

-- Recherche par similarité cosinus, avec jointure document pour la citation
create or replace function public.match_legal_chunks(
  query_embedding vector(1024),
  match_count int default 8,
  min_similarity float default 0.35
)
returns table (
  chunk_id uuid,
  content text,
  similarity float,
  title text,
  url text,
  source text,
  source_id text,
  doc_type text,
  date_version date
)
language sql stable as $$
  select
    c.id, c.content,
    1 - (c.embedding <=> query_embedding) as similarity,
    d.title, d.url, d.source, d.source_id, d.doc_type, d.date_version
  from public.legal_chunks c
  join public.legal_documents d on d.id = c.document_id
  where 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Historique des conversations de l'assistant (par cabinet + user)
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  user_id uuid not null,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb,                      -- [{title, url, source_id}]
  created_at timestamptz default now()
);

-- RLS : corpus juridique lisible par tout utilisateur connecté ;
-- conversations privées par cabinet.
alter table public.legal_documents enable row level security;
alter table public.legal_chunks enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

drop policy if exists "legal docs read" on public.legal_documents;
create policy "legal docs read" on public.legal_documents
  for select to authenticated using (true);

drop policy if exists "legal chunks read" on public.legal_chunks;
create policy "legal chunks read" on public.legal_chunks
  for select to authenticated using (true);

drop policy if exists "ai conv own" on public.ai_conversations;
create policy "ai conv own" on public.ai_conversations
  for all to authenticated
  using (organization_id in (select public.user_orgs()))
  with check (organization_id in (select public.user_orgs()));

drop policy if exists "ai msg own" on public.ai_messages;
create policy "ai msg own" on public.ai_messages
  for all to authenticated
  using (conversation_id in (
    select id from public.ai_conversations
    where organization_id in (select public.user_orgs())
  ));
