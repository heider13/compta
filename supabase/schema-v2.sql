-- ============================================================
-- Compta v2 — Workflow admin/client + observations
-- À exécuter après schema.sql initial.
-- ============================================================

-- ─── Roles utilisateur ───────────────────────────────────
do $$ begin
  create type user_role as enum ('client', 'admin');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists role user_role not null default 'client';

-- Update du trigger handle_new_user pour inclure le rôle (par défaut client)
-- (la fonction existante insère déjà id/first_name/last_name, le role utilise la valeur par défaut 'client')

-- ─── Statuts internes (workflow Compta avant envoi INPI) ──
do $$ begin
  alter type dossier_statut add value if not exists 'DRAFT' before 'RECEIVED';
exception when others then null; end $$;
do $$ begin
  alter type dossier_statut add value if not exists 'AWAITING_VALIDATION' before 'RECEIVED';
exception when others then null; end $$;
do $$ begin
  alter type dossier_statut add value if not exists 'INTERNAL_AMENDMENT_PENDING' before 'RECEIVED';
exception when others then null; end $$;
do $$ begin
  alter type dossier_statut add value if not exists 'VALIDATED_INTERNAL' before 'RECEIVED';
exception when others then null; end $$;

-- ─── Observations admin ↔ client ────────────────────────
create table if not exists public.dossier_observations (
  id          uuid primary key default gen_random_uuid(),
  dossier_id  uuid not null references public.dossiers(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  author_role user_role not null,
  message     text not null,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists dossier_observations_dossier_idx on public.dossier_observations(dossier_id);

alter table public.dossier_observations enable row level security;

-- Helper : est-ce que le user courant est admin ?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- ─── RLS rewrite : admin voit tout, client voit le sien ──
drop policy if exists "dossiers owner all" on public.dossiers;

create policy "dossiers client read own" on public.dossiers
  for select using (auth.uid() = user_id);
create policy "dossiers client insert own" on public.dossiers
  for insert with check (auth.uid() = user_id);
create policy "dossiers client update own draft" on public.dossiers
  for update using (auth.uid() = user_id and statut in ('DRAFT', 'INTERNAL_AMENDMENT_PENDING'))
                with check (auth.uid() = user_id);
create policy "dossiers admin all" on public.dossiers
  for all using (public.is_admin()) with check (public.is_admin());

-- Observations : auteur peut lire ses propres + admin lit tout + client lit celles de ses dossiers
create policy "observations read own dossier" on public.dossier_observations
  for select using (
    public.is_admin() or
    exists (select 1 from public.dossiers d where d.id = dossier_id and d.user_id = auth.uid())
  );
create policy "observations admin insert" on public.dossier_observations
  for insert with check (public.is_admin() and author_id = auth.uid());
create policy "observations client insert on own" on public.dossier_observations
  for insert with check (
    author_id = auth.uid() and author_role = 'client' and
    exists (select 1 from public.dossiers d where d.id = dossier_id and d.user_id = auth.uid())
  );
create policy "observations admin update" on public.dossier_observations
  for update using (public.is_admin()) with check (public.is_admin());

-- ─── Profiles : admin lit tous les profiles ─────────────
create policy "profiles admin select all" on public.profiles
  for select using (public.is_admin());
