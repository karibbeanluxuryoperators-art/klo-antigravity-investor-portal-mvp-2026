-- Migration: Platform pricing v0.5 (asset cost transparency + KLO service fee)
-- Date: 2026-07-25
-- Phase A of the bundling roadmap.
--
-- What it does:
--   1. Adds pillar + cost_to_klo columns to assets (so we know what suppliers quote)
--   2. Adds curated_by_*, klo_service_fee, klo_markup_pct, bundle_price to experiences
--   3. Adds experience_id, bundle_id, asset_cost_to_klo, supplier_payout,
--      klo_service_revenue, client_price, klo_revenue to bookings
--   4. Creates platform_settings table for global KLO markup default
--
-- The pricing model (v0.5):
--   - Each asset has `cost_to_klo` = what the supplier quoted to KLO
--   - KLO passes the asset cost through to the client with NO markup
--   - KLO adds its own `klo_service_fee` (champagne, red carpet, butler, transitions)
--   - The KLO service fee has its own `klo_markup_pct` (default 10%, from settings)
--   - Total client price = sum(assets.cost_to_klo) + klo_service_fee * (1 + klo_markup/100)
--   - KLO revenue = klo_service_fee * (1 + klo_markup/100) — KLO's only revenue stream
--   - Supplier payout = cost_to_klo — suppliers see their own cost, not KLO's service fee
--
-- Run in Supabase Studio SQL Editor (idempotent — safe to re-run).

-- 1. assets table — pillar + cost transparency
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS pillar TEXT CHECK (pillar IN ('AVIATION', 'YACHTS', 'LODGING', 'STAFF', 'TRANSPORT')),
  ADD COLUMN IF NOT EXISTS cost_to_klo NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS cost_currency TEXT DEFAULT 'USD';

CREATE INDEX IF NOT EXISTS idx_assets_pillar ON assets (pillar) WHERE pillar IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_supplier_pillar
  ON assets (supplier_id, pillar)
  WHERE supplier_id IS NOT NULL AND pillar IS NOT NULL;

-- 2. experiences table — bundling + KLO service fee
ALTER TABLE experiences
  ADD COLUMN IF NOT EXISTS curated_by_email TEXT,
  ADD COLUMN IF NOT EXISTS curated_by_role TEXT CHECK (curated_by_role IN ('admin', 'supplier')),
  ADD COLUMN IF NOT EXISTS is_supplier_published BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS klo_service_fee NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS klo_markup_pct NUMERIC(5, 2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS bundle_price NUMERIC(12, 2);

CREATE INDEX IF NOT EXISTS idx_experiences_curator
  ON experiences (curated_by_email, curated_by_role)
  WHERE curated_by_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_experiences_published
  ON experiences (status, is_supplier_published)
  WHERE status = 'PUBLISHED';

-- 3. bookings table — link to experience + financial tracking
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS experience_id TEXT REFERENCES experiences(id),
  ADD COLUMN IF NOT EXISTS bundle_id UUID,
  ADD COLUMN IF NOT EXISTS asset_cost_to_klo NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS supplier_payout NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS klo_service_revenue NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS client_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS klo_revenue NUMERIC(12, 2);

CREATE INDEX IF NOT EXISTS idx_bookings_experience ON bookings (experience_id) WHERE experience_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_bundle    ON bookings (bundle_id)    WHERE bundle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_created   ON bookings (created_at DESC);

-- 4. platform_settings — global defaults (single-row-per-key, JSONB value)
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Seed the only setting we have for now. Future settings (currency, etc.)
-- use the same key/value pattern.
INSERT INTO platform_settings (key, value, updated_by) VALUES
  ('default_klo_markup_pct', '10.00'::jsonb, 'system')
ON CONFLICT (key) DO NOTHING;

-- RLS: same pattern as user_roles. Block anon access. Service role bypasses.
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon cannot read platform_settings" ON platform_settings;
CREATE POLICY "anon cannot read platform_settings"
  ON platform_settings FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "anon cannot write platform_settings" ON platform_settings;
CREATE POLICY "anon cannot write platform_settings"
  ON platform_settings FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
