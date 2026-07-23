-- ── KLO trilingual data model (v1.8.0) ──────────────────────────────────
-- Adds EN/ES/PT content columns to clients and suppliers so the platform
-- can store language-specific business names, descriptions, and notes
-- while the existing single-language columns act as a fallback.
--
-- Deferred per the post-funding roadmap, but laying out the schema NOW
-- is cheap and avoids a painful rename later.
--
-- Run this in the Supabase Studio SQL Editor AFTER:
--   2026-07-20_user_roles.sql
--   2026-07-20_clients.sql
--
-- Strategy:
--   * name_en / name_es / name_pt are nullable
--   * The application reads them in this order:
--       preferred language → fallback to base `name` / `business_name`
--   * Initial value: copy current `name` / `business_name` into all 3 columns
--     so the fallback behavior matches the legacy field for every locale.
--   * No breaking changes — base columns stay as the canonical Spanish value.

-- ── clients ─────────────────────────────────────────────────────────────
alter table public.clients
  add column if not exists name_en text,
  add column if not exists name_es text,
  add column if not exists name_pt text;

-- Backfill: copy existing `name` into all three locales (assumes ES).
update public.clients
  set
    name_en = coalesce(name_en, name),
    name_es = coalesce(name_es, name),
    name_pt = coalesce(name_pt, name)
  where name_en is null or name_es is null or name_pt is null;

-- ── suppliers ───────────────────────────────────────────────────────────
-- business_name is the public-facing name (already used in cards, emails).
-- contact_name is the person the admin talks to (not trilingual — proper
-- nouns are fine as-is, no need to over-engineer).
alter table public.suppliers
  add column if not exists business_name_en text,
  add column if not exists business_name_es text,
  add column if not exists business_name_pt text,
  add column if not exists description_en text,
  add column if not exists description_es text,
  add column if not exists description_pt text;

-- Backfill from current values (assumes ES for both).
update public.suppliers
  set
    business_name_en = coalesce(business_name_en, business_name),
    business_name_es = coalesce(business_name_es, business_name),
    business_name_pt = coalesce(business_name_pt, business_name),
    description_en   = coalesce(description_en,   description),
    description_es   = coalesce(description_es,   description),
    description_pt   = coalesce(description_pt,   description)
  where business_name_en is null
     or business_name_es is null
     or business_name_pt is null
     or description_en   is null
     or description_es   is null
     or description_pt   is null;

-- ── assets (also benefit from trilingual descriptions) ──────────────────
-- Asset names are short labels (e.g. "Gulfstream G650") — no trilingual
-- treatment needed. But asset descriptions are user-facing marketing copy
-- and should be trilingual.
alter table public.assets
  add column if not exists description_en text,
  add column if not exists description_es text,
  add column if not exists description_pt text;

update public.assets
  set
    description_en = coalesce(description_en, description),
    description_es = coalesce(description_es, description),
    description_pt = coalesce(description_pt, description)
  where description_en is null or description_es is null or description_pt is null;

-- ── bundles (multi-supplier packages) ───────────────────────────────────
-- Bundle names and descriptions are user-facing — trilingual.
alter table public.bundles
  add column if not exists name_en text,
  add column if not exists name_es text,
  add column if not exists name_pt text,
  add column if not exists description_en text,
  add column if not exists description_es text,
  add column if not exists description_pt text;

update public.bundles
  set
    name_en = coalesce(name_en, name),
    name_es = coalesce(name_es, name),
    name_pt = coalesce(name_pt, name),
    description_en = coalesce(description_en, description),
    description_es = coalesce(description_es, description),
    description_pt = coalesce(description_pt, description)
  where name_en is null or name_es is null or name_pt is null
     or description_en is null or description_es is null or description_pt is null;

-- ── Indexes (read-mostly columns, useful for filtering by locale later) ─
create index if not exists clients_name_en_idx     on public.clients (name_en);
create index if not exists clients_name_es_idx     on public.clients (name_es);
create index if not exists clients_name_pt_idx     on public.clients (name_pt);

create index if not exists suppliers_business_name_en_idx on public.suppliers (business_name_en);
create index if not exists suppliers_business_name_es_idx on public.suppliers (business_name_es);
create index if not exists suppliers_business_name_pt_idx on public.suppliers (business_name_pt);

-- ── Application contract (reference) ────────────────────────────────────
-- Whenever a locale-aware read is needed, the API should resolve like:
--
--   function pickLocalized(value, lang) {
--     return value[`name_${lang.toLowerCase()}`] || value.name || null;
--   }
--
-- The base `name` / `business_name` column is the canonical Spanish value
-- (the source of truth for SEO, legal docs, and ad campaigns). The
-- _en / _es / _pt columns override it when present.

-- ── Smoke check (run after to confirm columns exist) ────────────────────
-- select column_name from information_schema.columns
--  where table_schema='public' and table_name in ('clients','suppliers','assets','bundles')
--    and column_name like '%\_en' or column_name like '%\_es' or column_name like '%\_pt'
--  order by table_name, column_name;
-- expected: 6 client cols, 6 supplier cols, 3 asset cols, 6 bundle cols = 21 rows
