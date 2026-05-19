-- ============================================================
-- Compta v3 — Pivot B2B : multi-tenant cabinets juridiques
-- À exécuter en deux phases (Postgres limite enum ALTER + USE en même tx)
-- ============================================================

-- ─── Phase A : types + tables (sans utiliser les nouveaux enum values) ──

-- Forme juridique des entreprises gérées
do $$ begin
  create type forme_juridique as enum (
    'AE', 'EI', 'SASU', 'SAS', 'EURL', 'SARL', 'SCI', 'SA', 'SNC', 'HOLDING', 'AUTRE'
  );
exception when duplicate_object then null; end $$;

-- Rôles dans un cabinet
do $$ begin
  create type membership_role as enum ('owner', 'admin', 'collaborator', 'readonly');
exception when duplicate_object then null; end $$;

-- Direction des factures
do $$ begin
  create type invoice_direction as enum ('platform_to_cabinet', 'cabinet_to_client');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'cancelled');
exception when duplicate_object then null; end $$;

-- ─── Organizations (cabinets) ───────────────────────────────
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  siren text,
  contact_email text,
  contact_phone text,
  -- INPI mandataire credentials (chiffrés côté backend avant insert)
  inpi_username text,
  inpi_password_encrypted text,
  inpi_env text default 'prod' check (inpi_env in ('prod', 'demo')),
  -- Billing
  plan text default 'cabinet' check (plan in ('cabinet', 'pro', 'enterprise')),
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  -- Marque blanche
  white_label_config jsonb default '{}'::jsonb,
  -- Meta
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_slug_idx on public.organizations(slug);

-- ─── Memberships : qui appartient à quel cabinet ─────────────
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role membership_role not null default 'collaborator',
  invited_by uuid references auth.users(id),
  invited_at timestamptz,
  joined_at timestamptz default now(),
  created_at timestamptz not null default now(),
  unique (user_id, organization_id)
);

create index if not exists memberships_user_idx on public.memberships(user_id);
create index if not exists memberships_org_idx on public.memberships(organization_id);

-- ─── Clients (entreprises gérées par les cabinets) ───────────
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- Identité société
  siren text,
  denomination text not null,
  forme_juridique forme_juridique,
  code_naf text,
  capital_social_cents bigint,
  date_immatriculation date,
  adresse_siege jsonb,
  -- Contact principal
  contact_email text,
  contact_phone text,
  contact_first_name text,
  contact_last_name text,
  -- Données externes
  pappers_data jsonb,
  source text default 'manual' check (source in ('manual', 'pappers', 'rne', 'import', 'api')),
  -- Meta
  metadata jsonb default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_org_idx on public.clients(organization_id);
create index if not exists clients_siren_idx on public.clients(organization_id, siren);

-- ─── Refonte dossiers : ajout multitenant + client + assigned_to ──
alter table public.dossiers add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.dossiers add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.dossiers add column if not exists forme_juridique forme_juridique;
alter table public.dossiers add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table public.dossiers add column if not exists priority text default 'normal' check (priority in ('low', 'normal', 'high', 'urgent'));
alter table public.dossiers add column if not exists internal_due_date date;
alter table public.dossiers add column if not exists tags text[] default '{}';

create index if not exists dossiers_org_idx on public.dossiers(organization_id);
create index if not exists dossiers_client_idx on public.dossiers(client_id);
create index if not exists dossiers_assigned_idx on public.dossiers(assigned_to);

-- ─── Tasks (todo list par dossier) ───────────────────────────
create table if not exists public.dossier_tasks (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references auth.users(id),
  due_date date,
  done boolean not null default false,
  done_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists dossier_tasks_dossier_idx on public.dossier_tasks(dossier_id);
create index if not exists dossier_tasks_org_idx on public.dossier_tasks(organization_id);
create index if not exists dossier_tasks_assigned_idx on public.dossier_tasks(assigned_to) where done = false;

-- ─── Notifications ──────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx on public.notifications(user_id) where read_at is null;

-- ─── Audit log ──────────────────────────────────────────────
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_org_idx on public.audit_logs(organization_id, created_at desc);
create index if not exists audit_logs_resource_idx on public.audit_logs(resource_type, resource_id);

-- ─── Invoices ───────────────────────────────────────────────
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  dossier_id uuid references public.dossiers(id) on delete set null,
  direction invoice_direction not null,
  number text,
  amount_cents bigint not null,
  vat_cents bigint default 0,
  currency text default 'EUR',
  status invoice_status default 'draft',
  due_date date,
  paid_at timestamptz,
  stripe_invoice_id text,
  pdf_path text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_org_idx on public.invoices(organization_id, created_at desc);

-- ─── API keys ───────────────────────────────────────────────
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  key_hash text not null,
  prefix text not null,
  scopes text[] default '{read}',
  last_used_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists api_keys_org_idx on public.api_keys(organization_id) where revoked_at is null;
create index if not exists api_keys_prefix_idx on public.api_keys(prefix);

-- ─── Webhooks ───────────────────────────────────────────────
create table if not exists public.webhooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  url text not null,
  events text[] not null,
  secret text not null,
  active boolean not null default true,
  failure_count integer default 0,
  last_triggered_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists webhooks_org_idx on public.webhooks(organization_id) where active = true;

-- ─── Helpers RLS multi-tenant ───────────────────────────────
create or replace function public.user_orgs()
returns setof uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.memberships where user_id = auth.uid()
$$;

create or replace function public.user_role_in(_org_id uuid)
returns membership_role language sql stable security definer set search_path = public as $$
  select role from public.memberships where user_id = auth.uid() and organization_id = _org_id
$$;

create or replace function public.is_org_member(_org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships where user_id = auth.uid() and organization_id = _org_id)
$$;

-- ─── updated_at auto sur les nouvelles tables ───────────────
drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
drop trigger if exists clients_updated_at on public.clients;
create trigger clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();
