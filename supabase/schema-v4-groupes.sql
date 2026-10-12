-- Groupes de sociétés (holding, filiales, sous-filiales) d'un cabinet.
-- Accès uniquement par le backend (clé service) : RLS activée sans politique.

create table if not exists public.groupes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nom text not null,
  client_id uuid references public.clients(id) on delete set null,
  created_by uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists groupes_org_idx on public.groupes(organization_id);

create table if not exists public.groupe_entites (
  id uuid primary key default gen_random_uuid(),
  groupe_id uuid not null references public.groupes(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  siren text check (siren is null or siren ~ '^[0-9]{9}$'),
  denomination text not null,
  forme text,
  ville text,
  active boolean not null default true,
  tete boolean not null default false,
  source text not null default 'manuel',      -- rne | manuel | agent
  a_verifier boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (groupe_id, siren)
);
create index if not exists groupe_entites_groupe_idx on public.groupe_entites(groupe_id);
create index if not exists groupe_entites_siren_idx on public.groupe_entites(organization_id, siren);

create table if not exists public.groupe_liens (
  id uuid primary key default gen_random_uuid(),
  groupe_id uuid not null references public.groupes(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_id uuid not null references public.groupe_entites(id) on delete cascade,
  enfant_id uuid not null references public.groupe_entites(id) on delete cascade,
  pourcentage numeric(7,4) check (pourcentage is null or (pourcentage >= 0 and pourcentage <= 100)),
  droits_vote numeric(7,4) check (droits_vote is null or (droits_vote >= 0 and droits_vote <= 100)),
  direction text,                              -- mandat exercé par le parent (Président, Gérant…)
  source text not null default 'manuel',
  a_verifier boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (parent_id, enfant_id),
  check (parent_id <> enfant_id)
);
create index if not exists groupe_liens_groupe_idx on public.groupe_liens(groupe_id);

alter table public.groupes enable row level security;
alter table public.groupe_entites enable row level security;
alter table public.groupe_liens enable row level security;
