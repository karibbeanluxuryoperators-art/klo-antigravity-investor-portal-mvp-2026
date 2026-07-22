-- ── KLO clients table (v1.8.0 Step 2) ──────────────────────────────────────
-- UHNWI / VVIP / VIP client profiles for the admin Concierge OS.
-- Replaces the v1.7 denormalized guest_name/email on bookings with proper
-- relational client records so the platform can support guest preferences,
-- tier-based pricing, loyalty tracking, and the BP's Y1 "UHNWI guest
-- relations" feature.
--
-- Run this in the Supabase Studio SQL Editor AFTER 2026-07-20_user_roles.sql.
--
-- To backfill existing bookings (optional, one-time):
--   insert into public.clients (id, name, email, tier, status, source)
--   select distinct on (guest_email)
--     'C' || extract(epoch from now())::bigint || '_' || row_number() over (),
--     guest_name, guest_email, 'VIP', 'ACTIVE', 'backfill_bookings'
--   from public.bookings
--   where guest_email is not null and guest_email <> ''
--   on conflict (email) do nothing;
--
--   update public.bookings b
--     set client_id = c.id
--   from public.clients c
--   where b.guest_email = c.email and b.client_id is null;

create table if not exists public.clients (
  id text primary key,
  name text not null,
  email text unique,
  phone text,
  whatsapp text,
  tier text not null default 'UHNWI' check (tier in ('UHNWI', 'VVIP', 'VIP')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'PROSPECT')),
  preferences jsonb not null default '{
    "dietary": [],
    "beverages": [],
    "temperature": "22°C",
    "interests": []
  }'::jsonb,
  past_experiences integer not null default 0,
  total_spend numeric(12, 2) not null default 0,
  loyalty_points integer not null default 0,
  notes text,
  source text,                  -- 'manual' | 'lead' | 'backfill_bookings' | 'referral'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text               -- email of admin who created the record
);

create index if not exists clients_email_idx on public.clients (email);
create index if not exists clients_tier_idx on public.clients (tier);
create index if not exists clients_status_idx on public.clients (status);
create index if not exists clients_created_at_idx on public.clients (created_at desc);

-- Add FK on bookings.client_id (nullable, so existing bookings don't break).
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'client_id'
  ) then
    alter table public.bookings
      add column client_id text references public.clients(id) on delete set null;
  end if;
end$$;

create index if not exists bookings_client_id_idx on public.bookings (client_id);

-- updated_at trigger so we always know when a client was last touched.
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- RLS: same as user_roles — anon/authenticated cannot read or write.
-- The server reads/writes via SUPABASE_SERVICE_KEY which bypasses RLS.
alter table public.clients enable row level security;

drop policy if exists "anon cannot read clients" on public.clients;
create policy "anon cannot read clients"
  on public.clients for select
  to anon, authenticated
  using (false);

drop policy if exists "anon cannot write clients" on public.clients;
create policy "anon cannot write clients"
  on public.clients for all
  to anon, authenticated
  using (false)
  with check (false);
