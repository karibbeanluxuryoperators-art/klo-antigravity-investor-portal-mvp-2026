-- ═══════════════════════════════════════════════════════════════════════════
-- KLO Partner Flow Migration
-- Adds:
--   1. firebase_uid / telegram_chat_id columns to suppliers (idempotent)
--   2. bundles table (a multi-supplier package owned by a partner)
--   3. bundle_items table (asset references inside a bundle)
--   4. approval_notifications table (audit log of Telegram / email sent)
--
-- All statements are idempotent — safe to re-run.
-- Apply via the Supabase SQL editor or `supabase db execute`.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Add columns to suppliers (idempotent) ──────────────────────────────
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS firebase_uid TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Helpful indexes for the supplier lookup flow
CREATE INDEX IF NOT EXISTS idx_suppliers_firebase_uid ON suppliers (firebase_uid);
CREATE INDEX IF NOT EXISTS idx_suppliers_email         ON suppliers (email);

-- ── 2. bundles table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bundles (
  id                  TEXT PRIMARY KEY,
  owner_supplier_id   TEXT,
  name                TEXT,
  description         TEXT,
  total_price         TEXT,
  status              TEXT DEFAULT 'PENDING',
  created_at          TIMESTAMPTZ DEFAULT now(),
  approved_at         TIMESTAMPTZ,
  approved_by         TEXT
);

CREATE INDEX IF NOT EXISTS idx_bundles_owner     ON bundles (owner_supplier_id);
CREATE INDEX IF NOT EXISTS idx_bundles_status    ON bundles (status);
CREATE INDEX IF NOT EXISTS idx_bundles_created   ON bundles (created_at DESC);

-- ── 3. bundle_items table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bundle_items (
  id          TEXT PRIMARY KEY,
  bundle_id   TEXT REFERENCES bundles(id) ON DELETE CASCADE,
  asset_id    TEXT,
  qty         INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON bundle_items (bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_asset  ON bundle_items (asset_id);

-- ── 4. approval_notifications table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS approval_notifications (
  id                      TEXT PRIMARY KEY,
  recipient_supplier_id   TEXT,
  kind                    TEXT,
  payload                 JSONB,
  sent_telegram           BOOLEAN DEFAULT false,
  sent_email              BOOLEAN DEFAULT false,
  created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_notif_recipient
  ON approval_notifications (recipient_supplier_id);
CREATE INDEX IF NOT EXISTS idx_approval_notif_kind
  ON approval_notifications (kind);
CREATE INDEX IF NOT EXISTS idx_approval_notif_created
  ON approval_notifications (created_at DESC);
