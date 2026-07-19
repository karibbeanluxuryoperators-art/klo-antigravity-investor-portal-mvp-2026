// Vercel serverless entry point.
// @vercel/node compiles this TypeScript file and its imports (server.ts).
//
// Why a wrapper at all? Vercel cold-starts can race: the first request arrives
// before `import('../server.js')` has resolved. We keep a shared `app` reference
// and lazily wait for it on every request. Once loaded, subsequent requests are
// a single microtask (the cached promise).
//
// Why pass through instead of re-routing? Express's `app.all('/api/(.*)')` and
// similar wildcard routes *strip* the matched prefix from `req.url` before the
// inner app sees it — so `app(req, res)` would receive `/assets` and try to
// match a route registered as `/api/assets`. By using a non-capturing
// `'/api/*'` (or just `*` with a manual guard) we keep the original URL intact.

import type { IncomingMessage, ServerResponse } from 'http';

let app: any = null;
let loadError: any = null;
let loadingPromise: Promise<void> | null = null;

function loadServer(): Promise<void> {
  if (loadingPromise) return loadingPromise;
  loadingPromise = import('../server.js')
    .then((mod: any) => {
      app = mod.default || mod;
      if (typeof app !== 'function') {
        throw new Error(
          `server.js did not export a callable Express app (got ${typeof app}). ` +
          'Check that server.ts still has `export default app` at the bottom.'
        );
      }
      console.log('[klo-api] server.ts loaded OK');
    })
    .catch((err: any) => {
      loadError = err;
      console.error('[klo-api] server.ts LOAD FAILED:', err?.message || err);
    });
  return loadingPromise;
}

// Top-level handler passed to Vercel. NOT a VercelRequest/VercelResponse
// because importing those types is a build-time concern only.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Lazy-load on first request. After that, loadingPromise resolves instantly.
  if (!app && !loadError) await loadServer();

  // Health probe — answered by the wrapper so it's always available even if
  // server.ts crashed on import.
  const url = req.url || '';
  if (url === '/api/health' || url.startsWith('/api/health?')) {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      status: loadError ? 'error' : 'ok',
      timestamp: new Date().toISOString(),
      runtime: 'vercel-serverless',
      serverLoaded: !!app,
      error: loadError ? { message: loadError.message } : undefined,
    }));
    return;
  }

  // v1.7.1: public config short-circuit. The browser fetches this to
  // bootstrap the Supabase client (URL + anon key). We answer it from
  // the wrapper because the Vercel auto-detect of api/index.ts strips
  // the `/api` prefix from req.url before the inner Express app sees it
  // — so the Express route for `/api/config` would not match and the
  // request would fall through to the SPA catch-all. Handled here
  // instead, the same way /api/health is. Inlined (not a separate
  // file) because Vercel's bundler doesn't pick up sibling .ts files
  // referenced via require from the auto-detected entry.
  if (url === '/api/config' || url.startsWith('/api/config?')) {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify({
      supabase: {
        url: process.env.SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || '',
      },
    }));
    return;
  }

  if (!app) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: loadError?.message || 'server.ts not loaded' }));
    return;
  }

  // Pass-through. The inner Express app has routes registered with the `/api/`
  // prefix — we must NOT strip it. Returning the result of app(req, res) makes
  // Express handle the response lifecycle (writes headers, calls res.end()).
  return (app as any)(req, res);
}
