-- Migration: archived_at for soft delete across all entities
-- Date: 2026-07-24
-- Phase 1 of the CRM roadmap (soft delete + restore).
--
-- What it does:
--   Adds an `archived_at TIMESTAMPTZ` column to every entity table.
--   NULL  = active record
--   NOT NULL = archived at that timestamp (recoverable via /api/{entity}/:id/restore)
--
-- Why soft delete vs hard delete:
--   - Lead that didn't become a client — keep the history (campaign attribution)
--   - Client who churned — keep their bookings for reactivation
--   - Supplier that churned — keep their assets + bookings for reference
--   - Experience that was retired — keep it as "no longer offered" reference
--   - Bookings are historical records and should NEVER be hard-deleted
--
-- Indexes: a partial index on `archived_at IS NULL` for each table makes
--   the "list active" query fast. The RLS policies from earlier migrations
--   still apply — archived rows are visible to admins the same as active ones.
--
-- Run this in Supabase Studio SQL editor (one-time). It uses ALTER TABLE
-- ADD COLUMN IF NOT EXISTS so it's safe to re-run.

ALTER TABLE leads       ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE clients     ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE suppliers   ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE assets      ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE bookings    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Partial indexes — only index active rows. The "list active" path (90% of
-- queries) becomes a single B-tree lookup, the "list archived" path is a
-- sequential scan on a tiny subset.
CREATE INDEX IF NOT EXISTS idx_leads_active       ON leads (created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_active     ON clients (created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_active   ON suppliers (created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_active      ON assets (created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_experiences_active ON experiences (display_order, created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_active    ON bookings (created_at DESC) WHERE archived_at IS NULL;

-- Separate indexes on archived_at DESC for the "show archived" view,
-- ordered by most-recently-archived first.
CREATE INDEX IF NOT EXISTS idx_leads_archived       ON leads (archived_at DESC) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_archived     ON clients (archived_at DESC) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_archived   ON suppliers (archived_at DESC) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_archived      ON assets (archived_at DESC) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_experiences_archived ON experiences (archived_at DESC) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_archived    ON bookings (archived_at DESC) WHERE archived_at IS NOT NULL;
