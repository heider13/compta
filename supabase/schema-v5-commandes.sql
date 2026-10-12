-- Chat public (page Indépendants et TPE) et commandes d'entrepreneurs.
-- La conversation est conservée côté serveur : le navigateur ne peut pas réécrire
-- l'historique pour contourner le paiement. Accès backend uniquement (RLS sans politique).

create table if not exists public.commandes (
  id uuid primary key default gen_random_uuid(),
  ip_hash text,
  messages jsonb not null default '[]'::jsonb,       -- historique de la conversation (format Claude)
  affichage jsonb not null default '[]'::jsonb,      -- fil affiché (messages, formulaires, offre)
  pending_form jsonb,                                -- formulaire de l'agent en attente de réponse
  tours integer not null default 0,
  offre jsonb,                                       -- formalité proposée : code, libellé, prix
  statut text not null default 'ouverte'
    check (statut in ('ouverte', 'offre', 'paiement', 'payee', 'annulee')),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  stripe_session_id text,
  paye_le timestamptz,
  montant_ttc_cents integer,
  dossier_id uuid references public.dossiers(id) on delete set null,
  usage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists commandes_ip_idx on public.commandes(ip_hash, created_at);
create index if not exists commandes_user_idx on public.commandes(user_id);
create index if not exists commandes_stripe_idx on public.commandes(stripe_session_id);
alter table public.commandes enable row level security;

-- Conversation de l'espace entrepreneur (après paiement), distincte de la partie gratuite
alter table public.commandes add column if not exists messages_client jsonb not null default '[]'::jsonb;
alter table public.commandes add column if not exists affichage_client jsonb not null default '[]'::jsonb;
alter table public.commandes add column if not exists pending_form_client jsonb;
