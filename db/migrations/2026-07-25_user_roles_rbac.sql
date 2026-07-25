-- Migration: User roles RBAC v2 (medium complexity)
-- Date: 2026-07-25
-- Phase 4 of the CRM roadmap.
--
-- Changes:
--   1. Adds `job_title` text column (e.g. "COO", "Sales Lead", "Concierge Manager")
--      for display/audit purposes. NOT used for permissions.
--   2. Expands the role check to include 5 roles:
--        - admin   : full access to /admin and /supplier
--        - sales   : /admin only — leads + clients (read/write)
--        - ops     : /admin only — clients + bookings + experiences (read/write)
--        - partner : /supplier only — own portal, no /admin
--        - viewer  : /admin only — read-only across all tabs
--   3. Adds `permissions jsonb` column for granular overrides.
--      Default: NULL = inherit from role. Set to override specific resources.
--      Schema: { "leads": { "read": true, "write": true, "delete": false }, ... }
--      Resources: leads, clients, suppliers, assets, experiences, bookings, settings, users
--      Actions:   read, write, delete, publish (where applicable)
--
-- The server reads this table via SUPABASE_SERVICE_KEY which bypasses RLS.
-- The /api/admin/check endpoint returns the role + job_title + permissions
-- so the client can decide what to render.
--
-- Backward compat: existing rows keep their role. The CHECK constraint
-- recreation requires dropping and re-adding — but the new constraint
-- INCLUDES the old values, so no rows are rejected.
--
-- Run in Supabase Studio SQL Editor (idempotent).

-- Drop the old constraint, add the new one with more roles.
-- Defensive: find the actual CHECK constraint name from pg_constraint (Postgres
-- sometimes auto-names it as just "user_roles_check" or similar) and drop it.
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.user_roles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%IN%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.user_roles DROP CONSTRAINT %I', constraint_name);
  END IF;
END$$;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('admin', 'sales', 'ops', 'partner', 'viewer'));

-- Add job_title (display only, not used for permissions).
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS job_title text;

-- Add permissions (granular overrides; NULL = inherit from role).
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS permissions jsonb;

-- Helper view for the server to read user+role+permissions in one query.
-- (Server can also just SELECT * FROM user_roles; the view is convenience.)
create or replace view public.user_roles_v as
  select
    email,
    role,
    job_title,
    permissions,
    granted_by,
    granted_at,
    notes
  from public.user_roles;
