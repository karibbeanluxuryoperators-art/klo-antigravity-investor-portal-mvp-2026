-- ── KLO user_roles table (v1.8.0) ──────────────────────────────────────────────
-- Maps email -> role. Used by AdminGate to gate /admin access.
-- Replaces the v1.7 hardcoded ADMIN_EMAILS array in AdminGate.tsx.
--
-- Run this in the Supabase Studio SQL Editor BEFORE deploying v1.8.0:
--   1. Open Supabase Studio for the klo-fullstack-66f70 project
--   2. Go to SQL Editor
--   3. New query, paste this whole file
--   4. Click "Run" (or Ctrl+Enter)
--   5. Verify the table exists and the 2 seed rows are present
--
-- To grant admin to a new user later, run:
--   insert into public.user_roles (email, role, granted_by, notes)
--   values ('new-admin@example.com', 'admin', 'juan.molina@karibbeanluxuryoperators.lat', 'CMO / agency partner');
--
-- To revoke:
--   delete from public.user_roles where email = 'old-admin@example.com';
--
-- RLS note: this table is ONLY readable/writable by the service role
-- (the server's SUPABASE_SERVICE_KEY). The browser anon key cannot see
-- or modify it. So even a signed-in supplier cannot promote themselves.

create table if not exists public.user_roles (
  email text primary key,
  role text not null check (role in ('admin', 'partner', 'viewer')),
  granted_by text,
  granted_at timestamptz default now(),
  notes text
);

alter table public.user_roles enable row level security;

-- Block all anon/authenticated access. The server reads this table via
-- the service-role key (SUPABASE_SERVICE_KEY) which bypasses RLS.
drop policy if exists "anon cannot read user_roles" on public.user_roles;
create policy "anon cannot read user_roles"
  on public.user_roles for select
  to anon, authenticated
  using (false);

drop policy if exists "anon cannot write user_roles" on public.user_roles;
create policy "anon cannot write user_roles"
  on public.user_roles for all
  to anon, authenticated
  using (false)
  with check (false);

-- Seed the first two admins. juan.molina@karibbeanluxuryoperators.lat is
-- the founder COO; karibbeanluxuryoperators@gmail.com is the shared
-- admin account (used for service-account level access).
insert into public.user_roles (email, role, granted_by, notes) values
  ('juan.molina@karibbeanluxuryoperators.lat', 'admin', 'system', 'Founder COO'),
  ('karibbeanluxuryoperators@gmail.com', 'admin', 'system', 'Shared admin')
on conflict (email) do nothing;
