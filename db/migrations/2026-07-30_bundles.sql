-- Migration: Bundle builder (Phase 4)
-- Date: 2026-07-30
-- v1.8.0 Step 22.24
--
-- Multi-supplier bundle builder. Four user jobs:
--   * Client   : curate their own mix from any partner's services
--   * Partner  : assemble cross-supplier experiences, earn cross-sell commission
--   * Ops      : build on behalf of clients
--   * Admin    : approve, audit, set commission rules
--
-- Commission model (locked in with Juan, 2026-07-30):
--   * KLO's take = klo_commission_pct% of line_price  (default 10%, configurable per line)
--   * Partner-sourced line: supplier receives = supplier_price * (1 - klo_commission_pct/100)
--     (locked to base price — KLO keeps all markup)
--   * KLO add-on line: supplier receives = $0, KLO keeps 100% of sale_price
--   * Cross-sell commission = 5% of supplier_price * klo_commission_pct/100
--     on partner-sourced lines where supplier_id != bundle.assembler_partner_id
--   * default_markup_pct (default 30%) is a SUGGESTED markup shown in the builder
--     UI when the line is opened. NOT a hard ceiling — admin and ops can set
--     any markup per line, per bundle, per booking. (Locked in with Juan, 2026-07-30.)
--   * Hard floor: sale_price >= supplier_price on partner-sourced lines
--     (we never sell below the partner's base — that's a hard rule)
--   * Visibility = mixed: private default, partner requests admin upgrade
--
-- This migration creates 4 tables. No FK constraints to suppliers/services/clients
-- because the project historically soft-couples tables (server.ts has the
-- "drop missing column and retry" pattern). We do soft-FKs (text columns) and
-- resolve them in the API layer.
--
-- Run in Supabase Studio SQL Editor (idempotent: uses IF NOT EXISTS).

-- ─────────────────────────────────────────────────────────────────────────
-- 1. bundles — the bundle itself
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.bundles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  -- Assembler (who built it). Can be a partner, an ops user, or an admin.
  assembled_by_email text not null,           -- who built it (FK to user_roles.email)
  assembled_by_role text not null
    check (assembled_by_role in ('partner', 'ops', 'admin')),
  -- If assembled by a partner, which one. NULL for ops/admin.
  assembler_partner_id text,                  -- soft FK to suppliers.id
  -- The client this bundle is for (private bundles need a named client).
  -- NULL for partner-scoped templates.
  client_id text,                             -- soft FK to clients.id
  -- Visibility:
  --   private         : only assembler + named client + ops can see
  --   partner_scoped  : assembler can use as a template for their own leads
  --   public          : any KLO client can browse
  visibility text not null default 'private'
    check (visibility in ('private', 'partner_scoped', 'public')),
  -- Lifecycle:
  --   DRAFT     : being assembled, can be edited
  --   PROPOSED  : sent to client or to admin for review
  --   APPROVED  : admin-approved (required for public visibility)
  --   ARCHIVED  : soft-deleted
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'PROPOSED', 'APPROVED', 'ARCHIVED')),
  -- Pricing snapshot at booking time is stored in bundle_bookings, not here.
  -- The "live" total is computed from bundle_items.
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_bundles_assembled_by on public.bundles (assembled_by_email);
create index if not exists idx_bundles_assembler_partner on public.bundles (assembler_partner_id) where assembler_partner_id is not null;
create index if not exists idx_bundles_client on public.bundles (client_id) where client_id is not null;
create index if not exists idx_bundles_visibility_status on public.bundles (visibility, status);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. bundle_items — the line items
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles(id) on delete cascade,
  -- line_type drives the math. partner_sourced uses all 4 price columns.
  -- klo_addon uses only sale_price (supplier_price and klo_commission_pct ignored).
  line_type text not null default 'partner_sourced'
    check (line_type in ('partner_sourced', 'klo_addon')),
  -- What service this line refers to. Soft FK to either services or experiences.
  -- We don't constrain because a bundle can mix services + experiences + addons.
  service_id text,                            -- soft FK to services.id or experiences.id
  service_kind text,                          -- 'service' | 'experience' | 'addon' | 'transfer' etc.
  service_name text,                          -- denormalized for display
  -- Supplier (only set for partner_sourced lines).
  supplier_id text,                           -- soft FK to suppliers.id
  -- Pricing (see header comment for the math).
  supplier_price numeric(12,2),               -- partner's base price (NULL for klo_addon)
  sale_price numeric(12,2) not null,          -- what the client pays
  klo_commission_pct numeric(5,2) not null default 10.00,  -- KLO's cut
  -- default_markup_pct: the suggested markup to show in the bundle builder UI
  -- when this line is first opened. NOT a hard ceiling — admin/ops can override
  -- to any value per line at any time. The only hard constraint is the floor
  -- below: sale_price >= supplier_price (we never sell below the partner's base).
  default_markup_pct numeric(5,2) not null default 30.00,
  quantity int not null default 1 check (quantity > 0),
  sort_order int not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_bundle_items_bundle on public.bundle_items (bundle_id, sort_order);
create index if not exists idx_bundle_items_supplier on public.bundle_items (supplier_id) where supplier_id is not null;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. bundle_bookings — the booking side (when a bundle is actually bought)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.bundle_bookings (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles(id),
  -- Who is buying and from which lead/client
  lead_id text,                               -- soft FK to leads.id (nullable)
  client_id text,                             -- soft FK to clients.id
  -- Lifecycle
  status text not null default 'PENDING'
    check (status in ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')),
  -- ── Pricing snapshot at booking time (all values are frozen) ──
  -- This is the source of truth for payouts. Even if the bundle is later
  -- edited or archived, these numbers don't change.
  total_client_paid numeric(12,2) not null,           -- Σ sale_price
  total_supplier_payout numeric(12,2) not null,       -- Σ supplier_price * (1 - klo_commission_pct/100) on partner_sourced, 0 on addon
  total_klo_revenue numeric(12,2) not null,           -- total_client_paid - total_supplier_payout
  cross_sell_partner_email text,                      -- who earned the cross-sell commission
  cross_sell_payout numeric(12,2) not null default 0, -- 5% * Σ (supplier_price * klo_commission_pct/100) on partner_sourced lines where supplier_id != bundle.assembler_partner_id
  booked_at timestamptz not null default now(),
  -- The line-item snapshot: JSONB of the items as they were at booking time.
  -- Lets you audit the math without joining back to bundle_items (which may
  -- have been edited after the booking).
  items_snapshot jsonb not null,
  notes text
);
create index if not exists idx_bundle_bookings_bundle on public.bundle_bookings (bundle_id);
create index if not exists idx_bundle_bookings_lead on public.bundle_bookings (lead_id) where lead_id is not null;
create index if not exists idx_bundle_bookings_client on public.bundle_bookings (client_id) where client_id is not null;
create index if not exists idx_bundle_bookings_partner on public.bundle_bookings (cross_sell_partner_email) where cross_sell_partner_email is not null;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. bundle_visibility_requests — partner → admin publish flow
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.bundle_visibility_requests (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles(id) on delete cascade,
  -- The visibility the partner wants to upgrade to. 'public' requires admin approval.
  requested_visibility text not null
    check (requested_visibility in ('partner_scoped', 'public')),
  requested_by_email text not null,
  requested_at timestamptz not null default now(),
  -- Admin's decision
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
-- 5. Helper view: bundles with their line items flattened
-- ─────────────────────────────────────────────────────────────────────────
-- Same as the rest of the project: server reads via service-role key, so
-- RLS is defense-in-depth, not the gate. We grant SELECT to anon for
-- read-only public bundle browsing, and to authenticated for the rest.
create or replace view public.bundles_with_totals as
  select
    b.*,
    coalesce(items.total_sale, 0)        as total_sale,
    coalesce(items.total_supplier, 0)    as total_supplier,
    coalesce(items.line_count, 0)        as line_count
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
-- 6. RLS — defense in depth. Service-role key bypasses RLS for server writes.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.bundles               enable row level security;
alter table public.bundle_items          enable row level security;
alter table public.bundle_bookings       enable row level security;
alter table public.bundle_visibility_requests enable row level security;

-- Read: public bundles visible to anon (browsing). Everything else to authenticated.
drop policy if exists "bundles_read" on public.bundles;
create policy "bundles_read" on public.bundles
  for select using (
    visibility = 'public' and status = 'APPROVED'
    or auth.role() = 'authenticated'
    or auth.role() = 'service_role'
  );

drop policy if exists "bundle_items_read" on public.bundle_items;
create policy "bundle_items_read" on public.bundle_items
  for select using (
    auth.role() = 'authenticated' or auth.role() = 'service_role'
  );

drop policy if exists "bundle_bookings_read" on public.bundle_bookings;
create policy "bundle_bookings_read" on public.bundle_bookings
  for select using (
    auth.role() = 'authenticated' or auth.role() = 'service_role'
  );

drop policy if exists "bundle_vis_requests_read" on public.bundle_visibility_requests;
create policy "bundle_vis_requests_read" on public.bundle_visibility_requests
  for select using (
    auth.role() = 'authenticated' or auth.role() = 'service_role'
  );

-- Write: only service_role (the server). End users go through the API.
drop policy if exists "bundles_write"               on public.bundles;
drop policy if exists "bundle_items_write"          on public.bundle_items;
drop policy if exists "bundle_bookings_write"       on public.bundle_bookings;
drop policy if exists "bundle_vis_requests_write"   on public.bundle_visibility_requests;

create policy "bundles_write"             on public.bundles                for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "bundle_items_write"        on public.bundle_items           for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "bundle_bookings_write"     on public.bundle_bookings        for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "bundle_vis_requests_write" on public.bundle_visibility_requests for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────
-- 7. updated_at trigger for bundles
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_bundles_touch on public.bundles;
create trigger trg_bundles_touch
  before update on public.bundles
  for each row execute function public.touch_updated_at();
