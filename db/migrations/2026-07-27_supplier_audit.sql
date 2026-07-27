-- Migration: supplier audit fields
-- Date: 2026-07-27
-- Phase: optional follow-up
--
-- Adds created_by / updated_by to suppliers so /admin → Suppliers can
-- record which admin created or last edited each row. The migration is
-- idempotent and safe to re-run. Until applied, the server endpoint
-- skips these fields (see POST /api/suppliers in server.ts).
--
-- Run this once in the Supabase Studio SQL editor. After it succeeds the
-- server can be simplified to set both columns on every write.

alter table public.suppliers
  add column if not exists created_by text,
  add column if not exists updated_by text,
  add column if not exists updated_at timestamptz default now();

-- Indexes for the "who created/updated supplier X" lookups in /admin
create index if not exists suppliers_created_by_idx on public.suppliers (created_by) where created_by is not null;
create index if not exists suppliers_updated_by_idx on public.suppliers (updated_by) where updated_by is not null;

-- Trigger: keep updated_at fresh on every UPDATE.
create or replace function public.touch_supplier_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_supplier_updated_at on public.suppliers;
create trigger trg_supplier_updated_at
  before update on public.suppliers
  for each row execute function public.touch_supplier_updated_at();

-- Smoke check (run after to confirm columns exist):
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'suppliers'
--   order by ordinal_position;
