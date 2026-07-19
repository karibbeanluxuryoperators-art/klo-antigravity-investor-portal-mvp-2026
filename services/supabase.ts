// ── KLO Supabase Browser Client ───────────────────────────────────────────────
// Browser-safe Supabase client (uses the anon key, not the service key).
// Used by the supplier portal for magic-link authentication.
//
// Auth model:
//   - Suppliers sign in by email — no password, no "forgot password" flow.
//   - We call signInWithOtp({ email, options: { emailRedirectTo: ... } }).
//   - Supabase sends the magic link, the user clicks it, the SPA receives the
//     access/refresh tokens in the URL hash (#access_token=...).
//   - On mount, the auth gate calls getSession() to pick up the new session
//     (or wait for the onAuthStateChange event with INITIAL_SESSION).
//   - The supplier row is then looked up by email via /api/suppliers/lookup.
//
// Env vars (must be set with VITE_ prefix so Vite exposes them to the bundle):
//   VITE_SUPABASE_URL        — e.g. https://vygfumqzlnloytmoaxav.supabase.co
//   VITE_SUPABASE_ANON_KEY   — sb_publishable_... (browser-safe)
//
// Gotcha: do NOT import the service-key Supabase client in the browser. It
// can read+write every row in every table. Only the server (server.ts) should
// have it. This file uses the anon key, which is safe to ship to the client.

import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";
import type { KLOUser } from "./firebase";

// Lazy singleton — we only build the client when we actually need it, so
// SSR / static-parse paths don't crash if the env vars are missing.
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Surface a clear error in the console instead of a silent crash. The
    // auth gate will catch this and show a "config missing" state.
    console.error(
      "[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. " +
      "Add them to .env.local and to Vercel environment variables."
    );
    return null;
  }
  _client = createClient(url, key, {
    auth: {
      // Supabase detects the access_token in the URL hash and exchanges it for
      // a session automatically. Default is true; we set it explicitly for
      // clarity because this is the centerpiece of the magic-link flow.
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return _client;
}

// ── Magic-link sign-in ────────────────────────────────────────────────────────

export type MagicLinkResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Sends a magic link to the given email. The link redirects back to
 * `redirectTo` (must be in the Supabase allow-list) with #access_token=...
 * in the hash. The auth gate handles the rest on the dashboard mount.
 */
export async function sendSupplierMagicLink(
  email: string,
  redirectTo: string
): Promise<MagicLinkResult> {
  const client = getClient();
  if (!client) {
    return { ok: false, error: "Supabase client is not configured. Check VITE_SUPABASE_* env vars." };
  }
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  try {
    const { error } = await client.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: redirectTo,
        // Default email template is fine for v1.5. We can swap in a branded
        // template later via Supabase Dashboard → Auth → Email Templates.
        shouldCreateUser: true,
      },
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to send magic link." };
  }
}

// ── Session helpers ───────────────────────────────────────────────────────────

/** Returns the current session (may be null). Reads from localStorage. */
export async function getSupplierSession(): Promise<Session | null> {
  const client = getClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session;
}

/** Returns the current user, or null if no session. */
export async function getSupplierUser(): Promise<User | null> {
  const session = await getSupplierSession();
  return session?.user ?? null;
}

/**
 * Subscribe to auth state changes. The callback fires on:
 *   - INITIAL_SESSION  — the result of detectSessionInUrl processing the URL
 *                        hash on the redirect target. This is the event we
 *                        wait for after a magic-link click.
 *   - SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY
 *
 * Returns an unsubscribe function.
 */
export function onSupplierAuthChange(
  callback: (session: Session | null) => void
): () => void {
  const client = getClient();
  if (!client) {
    // No client → immediately fire null and return a no-op unsubscribe.
    callback(null);
    return () => {};
  }
  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}

/** Sign out and clear the local session. */
export async function signOutSupplier(): Promise<void> {
  const client = getClient();
  if (!client) return;
  await client.auth.signOut();
}

// ── Adapter: Supabase user → KLOUser ──────────────────────────────────────────
// SupplierDashboard.tsx expects a KLOUser (uid, email, name, photo, role).
// We synthesize one from the Supabase session user. The dashboard only uses
// user.uid and user.email for the /api/suppliers/lookup call; the rest are
// display fields we can fill with safe defaults.

export function supabaseUserToKLO(user: User): KLOUser {
  // Supabase user.id is a UUID. SupplierDashboard passes it as `uid` to the
  // /api/suppliers/lookup endpoint, which will fall through to the email
  // branch (since no row will have a matching firebase_uid) and find the
  // supplier by email. That's the entire v1.5 contract.
  const email = user.email ?? "";
  const meta = (user.user_metadata ?? {}) as Record<string, any>;
  return {
    uid: user.id,
    email,
    name: (meta.full_name as string) || (meta.name as string) || email.split("@")[0] || "Partner",
    photo: (meta.avatar_url as string) || null,
    // Magic-link users are partners (not admin). The role gate on the
    // dashboard is role-agnostic in v1.5.
    role: "PARTNER",
  };
}
