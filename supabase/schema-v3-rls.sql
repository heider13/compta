-- ============================================================
-- Compta v3 — Data migration + RLS multi-tenant
-- À exécuter APRÈS schema-v3.sql
-- ============================================================

-- ─── 1. Org par défaut pour les users existants ─────────────
insert into public.organizations (id, name, slug, contact_email)
values ('00000000-0000-0000-0000-000000000001'::uuid, 'Compta Default', 'default', 'admin@cabinet.fr')
on conflict (slug) do nothing;

-- Tous les profiles existants deviennent membres de cette org
-- (admin actuel = owner, autres = clients/collab selon ancien role)
insert into public.memberships (user_id, organization_id, role)
select
  p.id,
  '00000000-0000-0000-0000-000000000001'::uuid,
  case
    when p.role = 'admin' then 'owner'::membership_role
    else 'collaborator'::membership_role
  end
from public.profiles p
on conflict (user_id, organization_id) do nothing;

-- Les dossiers existants sont rattachés à l'org par défaut
update public.dossiers
set organization_id = '00000000-0000-0000-0000-000000000001'::uuid
where organization_id is null;

-- ─── 2. RLS sur les nouvelles tables ─────────────────────────
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.clients enable row level security;
alter table public.dossier_tasks enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.invoices enable row level security;
alter table public.api_keys enable row level security;
alter table public.webhooks enable row level security;

-- Organizations : visible uniquement aux membres
drop policy if exists "orgs members read" on public.organizations;
create policy "orgs members read" on public.organizations
  for select using (id in (select public.user_orgs()));

drop policy if exists "orgs owner update" on public.organizations;
create policy "orgs owner update" on public.organizations
  for update using (public.user_role_in(id) in ('owner', 'admin'));

-- Memberships : visible aux autres membres de la même org
drop policy if exists "memberships co-members read" on public.memberships;
create policy "memberships co-members read" on public.memberships
  for select using (organization_id in (select public.user_orgs()));

drop policy if exists "memberships owner manage" on public.memberships;
create policy "memberships owner manage" on public.memberships
  for all using (public.user_role_in(organization_id) in ('owner', 'admin'))
  with check (public.user_role_in(organization_id) in ('owner', 'admin'));

-- Clients : visible aux membres de l'org
drop policy if exists "clients org members all" on public.clients;
create policy "clients org members all" on public.clients
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- Tasks : pareil
drop policy if exists "tasks org members all" on public.dossier_tasks;
create policy "tasks org members all" on public.dossier_tasks
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- Notifications : owner du user
drop policy if exists "notifications self read" on public.notifications;
create policy "notifications self read" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "notifications self update" on public.notifications;
create policy "notifications self update" on public.notifications
  for update using (user_id = auth.uid());

-- Audit logs : lecture par membres de l'org, écriture libre (via service_role)
drop policy if exists "audit org members read" on public.audit_logs;
create policy "audit org members read" on public.audit_logs
  for select using (public.is_org_member(organization_id));

-- Invoices : membres de l'org
drop policy if exists "invoices org members all" on public.invoices;
create policy "invoices org members all" on public.invoices
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- API keys : owner/admin uniquement
drop policy if exists "api_keys admin manage" on public.api_keys;
create policy "api_keys admin manage" on public.api_keys
  for all using (public.user_role_in(organization_id) in ('owner', 'admin'))
  with check (public.user_role_in(organization_id) in ('owner', 'admin'));

-- Webhooks : owner/admin uniquement
drop policy if exists "webhooks admin manage" on public.webhooks;
create policy "webhooks admin manage" on public.webhooks
  for all using (public.user_role_in(organization_id) in ('owner', 'admin'))
  with check (public.user_role_in(organization_id) in ('owner', 'admin'));

-- ─── 3. Refonte RLS dossiers (multi-tenant) ─────────────────
drop policy if exists "dossiers client read own" on public.dossiers;
drop policy if exists "dossiers client insert own" on public.dossiers;
drop policy if exists "dossiers client update own draft" on public.dossiers;
drop policy if exists "dossiers admin all" on public.dossiers;
drop policy if exists "dossiers owner all" on public.dossiers;

-- Les membres du cabinet voient les dossiers du cabinet
create policy "dossiers org members read" on public.dossiers
  for select using (organization_id in (select public.user_orgs()));

-- Les membres peuvent insérer pour leur cabinet
create policy "dossiers org members insert" on public.dossiers
  for insert with check (organization_id in (select public.user_orgs()));

-- Update si membre du cabinet et dossier pas encore envoyé à l'INPI
create policy "dossiers org members update" on public.dossiers
  for update using (organization_id in (select public.user_orgs()))
  with check (organization_id in (select public.user_orgs()));

-- Delete drafts only
create policy "dossiers org members delete draft" on public.dossiers
  for delete using (
    organization_id in (select public.user_orgs())
    and statut in ('DRAFT', 'INTERNAL_AMENDMENT_PENDING')
  );

-- ─── 4. Trigger handle_new_user : créer une org au signup ───
-- Si le user signup sans invitation, on lui crée son propre cabinet (onboarding)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _org_id uuid;
  _first text;
  _last text;
  _email text;
  _slug text;
begin
  _first := new.raw_user_meta_data->>'first_name';
  _last := new.raw_user_meta_data->>'last_name';
  _email := new.email;

  -- Insère le profile
  insert into public.profiles (id, first_name, last_name)
  values (new.id, _first, _last)
  on conflict (id) do nothing;

  -- Si une invitation a été utilisée, le membership sera créé séparément
  -- Sinon : crée un cabinet par défaut "<Prénom> Cabinet" et l'user devient owner
  if (new.raw_user_meta_data->>'invitation_token') is null then
    _slug := lower(regexp_replace(
      coalesce(_first, _email, 'cabinet') || '-' || substring(new.id::text, 1, 6),
      '[^a-z0-9]+', '-', 'g'
    ));

    insert into public.organizations (name, slug, contact_email)
    values (
      coalesce(nullif(trim(_first || ' ' || coalesce(_last, '')), ''), 'Cabinet') || ' — Cabinet',
      _slug,
      _email
    )
    returning id into _org_id;

    insert into public.memberships (user_id, organization_id, role)
    values (new.id, _org_id, 'owner');
  end if;

  return new;
end; $$;
