-- v9 : mémoire client de l'agent et propositions d'échéances (vue « Aujourd'hui »)

-- Ce que l'agent (ou le cabinet) a retenu d'un client : préférences, particularités.
-- Visible et modifiable par le cabinet depuis la fiche client ; relu par l'agent à chaque tour.
create table if not exists public.memoire_client (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  contenu text not null check (char_length(contenu) between 1 and 500),
  source text not null default 'cabinet' check (source in ('agent', 'cabinet')),
  dossier_id uuid references public.dossiers(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists memoire_client_client_idx on public.memoire_client(client_id, created_at);

alter table public.memoire_client enable row level security;
drop policy if exists "memoire org members all" on public.memoire_client;
create policy "memoire org members all" on public.memoire_client
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop trigger if exists memoire_client_updated_at on public.memoire_client;
create trigger memoire_client_updated_at before update on public.memoire_client
  for each row execute function public.set_updated_at();

-- Échéances préparées chaque lundi (et à la demande) : de simples propositions,
-- que le cabinet accepte, ignore ou marque comme faites. Rien n'est lancé sans lui.
create table if not exists public.propositions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cle text not null,
  type text not null,
  titre text not null,
  detail text,
  echeance date,
  client_id uuid references public.clients(id) on delete cascade,
  dossier_id uuid references public.dossiers(id) on delete cascade,
  demande_agent text,
  statut text not null default 'proposee' check (statut in ('proposee', 'acceptee', 'ignoree', 'faite')),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, cle)
);
create index if not exists propositions_org_statut_idx on public.propositions(organization_id, statut, echeance);

alter table public.propositions enable row level security;
drop policy if exists "propositions org members all" on public.propositions;
create policy "propositions org members all" on public.propositions
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
