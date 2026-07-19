// ── KLO Public Config Handler ────────────────────────────────────────────────
// v1.7.1: short-circuited from api/index.ts. Returns the public Supabase
// config (URL + anon key) to the browser. The browser uses this to build
// the Supabase client for magic-link auth.
//
// Why a separate file? The api/index.ts wrapper short-circuits /api/health
// and /api/config because the Vercel auto-detect of api/index.ts strips the
// /api prefix from req.url before the inner Express app sees it — so an
// Express route registered as app.get("/api/config", ...) never matches.
// The smoke test for /api/health works because the wrapper handles it.
// /api/config needs the same treatment.
//
// Security: the anon key is designed by Supabase to be public (it can only
// read/write rows allowed by RLS policies, and we have RLS off right now
// per AGENTS.md § 3.3). When RLS goes on, this endpoint becomes truly
// safe to ship. The service key is never exposed.

import type { IncomingMessage, ServerResponse } from 'http';

export function configHandler(req: IncomingMessage, res: ServerResponse): void {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json');
  // CORS not needed — same-origin request from the SPA. The browser
  // already includes cookies/credentials if needed.
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify({
    supabase: {
      url: process.env.SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || '',
    },
  }));
}
