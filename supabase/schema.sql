-- ============================================================
-- Compta — schema initial
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ─── Enums ───────────────────────────────────────────────
create type dossier_statut as enum (
  'RECEIVED',
  'VALIDATION_PENDING',
  'AMENDMENT_PENDING',
  'PAYMENT_PENDING',
  'SIGNATURE_PENDING',
  'VALIDATED',
  'REJECTED'
);

create type formalite_type as enum (
  'CREATION',
  'MODIFICATION',
  'RADIATION'
);

create type doc_status as enum ('TRANSMIS', 'A_CORRIGER', 'OFFICIEL');

create type payment_status as enum ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- ─── profiles (extension de auth.users) ──────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-créer un profile à chaque signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── dossiers ────────────────────────────────────────────
create table public.dossiers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  reference       text unique,                          -- ex. DOS-2025-001
  client_name     text not null,
  client_initials text,
  type_formalite  formalite_type not null,
  naf_code        text,
  nature          text,                                 -- ex. "Libérale"
  siren           text,
  inpi_reference  text,
  signature_type  text default 'Simple',                -- "Simple" | "Avancée RGS"
  statut          dossier_statut not null default 'RECEIVED',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index dossiers_user_id_idx on public.dossiers(user_id);
create index dossiers_statut_idx  on public.dossiers(statut);

-- ─── dossier_events (timeline INPI) ──────────────────────
create table public.dossier_events (
  id          uuid primary key default gen_random_uuid(),
  dossier_id  uuid not null references public.dossiers(id) on delete cascade,
  statut      dossier_statut not null,
  description text,
  occurred_at timestamptz not null default now()
);

create index dossier_events_dossier_idx on public.dossier_events(dossier_id);

-- ─── dossier_documents ───────────────────────────────────
create table public.dossier_documents (
  id          uuid primary key default gen_random_uuid(),
  dossier_id  uuid not null references public.dossiers(id) on delete cascade,
  name        text not null,
  file_path   text,                                    -- chemin dans le bucket Storage
  size_bytes  bigint,
  mime_type   text,
  status      doc_status not null default 'TRANSMIS',
  created_at  timestamptz not null default now()
);

create index dossier_documents_dossier_idx on public.dossier_documents(dossier_id);

-- ─── payments ────────────────────────────────────────────
create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  dossier_id          uuid not null references public.dossiers(id) on delete cascade,
  amount_cents        integer not null,
  currency            text not null default 'EUR',
  status              payment_status not null default 'PENDING',
  method              text,                            -- ex. "card", "sepa"
  card_last4          text,
  paid_at             timestamptz,
  created_at          timestamptz not null default now()
);

create index payments_dossier_idx on public.payments(dossier_id);

-- ─── updated_at auto ─────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger dossiers_updated_at  before update on public.dossiers
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS — chaque user ne voit que ses propres données
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.dossiers          enable row level security;
alter table public.dossier_events    enable row level security;
alter table public.dossier_documents enable row level security;
alter table public.payments          enable row level security;

-- profiles : on lit/édite son propre profil
create policy "profiles self select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

-- dossiers : owner-only
create policy "dossiers owner all" on public.dossiers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- events / documents / payments : passent par dossier.user_id
create policy "events via dossier" on public.dossier_events
  for all using (exists (
    select 1 from public.dossiers d where d.id = dossier_id and d.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.dossiers d where d.id = dossier_id and d.user_id = auth.uid()
  ));

create policy "documents via dossier" on public.dossier_documents
  for all using (exists (
    select 1 from public.dossiers d where d.id = dossier_id and d.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.dossiers d where d.id = dossier_id and d.user_id = auth.uid()
  ));

create policy "payments via dossier" on public.payments
  for all using (exists (
    select 1 from public.dossiers d where d.id = dossier_id and d.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.dossiers d where d.id = dossier_id and d.user_id = auth.uid()
  ));

-- ============================================================
-- Storage bucket pour les pièces (à activer manuellement si tu veux)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('dossier-docs', 'dossier-docs', false);
