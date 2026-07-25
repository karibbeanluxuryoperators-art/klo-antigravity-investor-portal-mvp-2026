-- Migration: lead_id + converted_to_client_id for Lead → Client conversion
-- Date: 2026-07-24
-- Phase 2 of the CRM roadmap.
--
-- What it does:
--   1. clients.lead_id — back-reference to the lead this client came from (if any)
--   2. leads.converted_to_client_id — forward-reference to the client this lead became (if any)
--
-- Both columns are nullable text FKs. They're text because the rest of the
-- schema uses crypto.randomUUID() for IDs, not Supabase's auto-increment.
--
-- Either column being non-NULL means "this lead is now this client" and the
-- UI hides the Convert button to prevent double-conversion.
--
-- The /api/leads/:id/convert endpoint uses a single transaction (insert into
-- clients + update leads) so we never end up with a half-converted state.
--
-- Run this in Supabase Studio SQL editor (one-time). IF NOT EXISTS makes it
-- safe to re-run.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS lead_id TEXT REFERENCES leads(id);
ALTER TABLE leads   ADD COLUMN IF NOT EXISTS converted_to_client_id TEXT REFERENCES clients(id);

-- Indexes — for the "find the client for this lead" and "find the lead for this client" lookups.
-- These are O(1) on a B-tree. Without them, every conversion lookup would be a table scan.
CREATE INDEX IF NOT EXISTS idx_clients_lead_id              ON clients (lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_converted_to_client_id ON leads (converted_to_client_id) WHERE converted_to_client_id IS NOT NULL;
