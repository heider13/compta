-- Catégorisations INPI apprises sur des formalités acceptées (fiches RNE) : une ligne par
-- (code APE, forme d'exercice) ; forme '*' = forme majoritaire. Accès backend uniquement.
create table if not exists public.inpi_categorisations (
  ape text not null,
  forme text not null default '*',
  codes jsonb not null,                -- [cat1, cat2, cat3, cat4, precision]
  forme_majoritaire text,
  echantillons integer not null default 0,
  source text not null default 'rne',
  updated_at timestamptz not null default now(),
  primary key (ape, forme)
);
alter table public.inpi_categorisations enable row level security;
