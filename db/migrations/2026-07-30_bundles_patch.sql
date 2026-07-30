-- Migration: Bundle builder (Phase 4) — additive patch
-- Date: 2026-07-30
-- v1.8.0 Step 22.25
--
-- The bundles table already exists in production with a leaner shape
-- (id, owner_supplier_id, name, description, total_price, status, created_at, approved_at, approved_by).
-- This migration ADDS the missing columns non-destructively.
-- Idempotent: every statement uses IF NOT EXISTS / DO blocks so re-runs are safe.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. bundles: extend the existing table
-- ─────────────────────────────────────────────────────────────────────────
alter table public.bundles
  add column if not exists assembled_by_email text,
  add column if not exists assembled_by_role text
    check (assembled_by_role in ('partner', 'ops', 'admin')),
  add column if not exists assembler_partner_id text,
  add column if not exists client_id text,
  add column if not exists visibility text not null default 'private'
    check (visibility in ('private', 'partner_scoped', 'public')),
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill: if rows pre-date the migration, mark them as 'admin' assembled
update public.bundles
  set assembled_by_role = coalesce(assembled_by_role, 'admin')
where assembled_by_role is null;

-- Indexes (only after columns exist)
create index if not exists idx_bundles_assembled_by
  on public.bundles (assembled_by_email);
create index if not exists idx_bundles_assembler_partner
  on public.bundles (assembler_partner_id)
  where assembler_partner_id is not null;
create index if not exists idx_bundles_client
  on public.bundles (client_id)
  where client_id is not null;
create index if not exists idx_bundles_visibility_status
  on public.bundles (visibility, status);

-- updated_at trigger (the function may already exist from a prior migration)
drop trigger if exists trg_bundles_touch on public.bundles;
create trigger trg_bundles_touch
  before update on public.bundles
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. bundle_items: ensure all columns exist
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles(id) on delete cascade
);

-- If the table existed in a leaner form, add the missing columns.
alter table public.bundle_items
  add column if not exists line_type text not null default 'partner_sourced'
    check (line_type in ('partner_sourced', 'klo_addon')),
  add column if not exists service_id text,
  add column if not exists service_kind text,
  add column if not exists service_name text,
  add column if not exists supplier_id text,
  add column if not exists supplier_price numeric(12,2),
  add column if not exists sale_price numeric(12,2) not null default 0,
  add column if not exists klo_commission_pct numeric(5,2) not null default 10.00,
  add column if not exists default_markup_pct numeric(5,2) not null default 30.00,
  add column if not exists quantity int not null default 1 check (quantity > 0),
  add column if not exists sort_order int not null default 0,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_bundle_items_bundle
  on public.bundle_items (bundle_id, sort_order);
create index if not exists idx_bundle_items_supplier
  on public.bundle_items (supplier_id)
  where supplier_id is not null;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. bundle_bookings: create if missing (the existing project likely doesn't have this)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.bundle_bookings (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles(id),
  lead_id text,
  client_id text,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')),
  total_client_paid numeric(12,2) not null default 0,
  total_supplier_payout numeric(12,2) not null default 0,
  total_klo_revenue numeric(12,2) not null default 0,
  cross_sell_partner_email text,
  cross_sell_payout numeric(12,2) not null default 0,
  booked_at timestamptz not null default now(),
  items_snapshot jsonb not null default '[]'::jsonb,
  notes text
);
create index if not exists idx_bundle_bookings_bundle
  on public.bundle_bookings (bundle_id);
create index if not exists idx_bundle_bookings_lead
  on public.bundle_bookings (lead_id)
  where lead_id is not null;
create index if not exists idx_bundle_bookings_client
  on public.bundle_bookings (client_id)
  where client_id is not null;
create index if not exists idx_bundle_bookings_partner
  on public.bundle_bookings (cross_sell_partner_email)
  where cross_sell_partner_email is not null;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. bundle_visibility_requests: create if missing
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.bundle_visibility_requests (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles(id) on delete cascade,
  requested_visibility text not null
    check (requested_visibility in ('partner_scoped', 'public')),
  requested_by_email text not null,
  requested_at timestamptz not null default now(),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by_email text,
  reviewed_at timestamptz,
  review_notes text
);
create index if not exists idx_bundle_vis_requests_pending
  on public.bundle_visibility_requests (status, requested_at)
  where status = 'PENDING';
create index if not exists idx_bundle_vis_requests_bundle
  on public.bundle_visibility_requests (bundle_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Helper view: bundles with totals (CREATE OR REPLACE is safe)
-- ─────────────────────────────────────────────────────────────────────────
create or replace view public.bundles_with_totals as
  select
    b.*,
    coalesce(items.total_sale, 0)     as total_sale,
    coalesce(items.total_supplier, 0) as total_supplier,
    coalesce(items.line_count, 0)     as line_count
  from public.bundles b
  left join (
    select
      bundle_id,
      sum(sale_price * quantity)                                          as total_sale,
      sum(case
            when line_type = 'partner_sourced' and supplier_price is not null
            then supplier_price * (1 - klo_commission_pct/100) * quantity
            else 0
          end)                                                            as total_supplier,
      count(*)                                                            as line_count
    from public.bundle_items
    group by bundle_id
  ) items on items.bundle_id = b.id;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. RLS — only add policies if RLS isn't already on
-- ─────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'bundles' and rowsecurity = true
  ) then
    alter table public.bundles enable row level security;
  end if;
  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'bundle_items' and rowsecurity = true
  ) then
    alter table public.bundle_items enable row level security;
  end if;
  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'bundle_bookings' and rowsecurity = true
  ) then
    alter table public.bundle_bookings enable row level security;
  end if;
  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'bundle_visibility_requests' and rowsecurity = true
  ) then
    alter table public.bundle_visibility_requests enable row level security;
  end if;
end$$;

-- Policies: drop-and-recreate so re-runs work
drop policy if exists "bundles_read" on public.bundles;
create policy "bundles_read" on public.bundles
  for select using (
    (visibility = 'public' and status = 'APPROVED')
    or auth.role() = 'authenticated'
    or auth.role() = 'service_role'
  );

drop policy if exists "bundles_write" on public.bundles;
create policy "bundles_write" on public.bundles
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "bundle_items_read" on public.bundle_items;
create policy "bundle_items_read" on public.bundle_items
  for select using (auth.role() = 'authenticated' or auth.role() = 'service_role');

drop policy if exists "bundle_items_write" on public.bundle_items;
create policy "bundle_items_write" on public.bundle_items
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "bundle_bookings_read" on public.bundle_bookings;
create policy "bundle_bookings_read" on public.bundle_bookings
  for select using (auth.role() = 'authenticated' or auth.role() = 'service_role');

drop policy if exists "bundle_bookings_write" on public.bundle_bookings;
create policy "bundle_bookings_write" on public.bundle_bookings
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "bundle_vis_requests_read" on public.bundle_visibility_requests;
create policy "bundle_vis_requests_read" on public.bundle_visibility_requests
  for select using (auth.role() = 'authenticated' or auth.role() = 'service_role');

drop policy if exists "bundle_vis_requests_write" on public.bundle_visibility_requests;
create policy "bundle_vis_requests_write" on public.bundle_visibility_requests
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
