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

  // /api/og-image — server-rendered SVG social card. Inline here (same
  // reason as /api/config) so Vercel's bundler picks it up. 1200x630 SVG that
  // matches the Open Graph image dimensions. Crisp on retina because SVG.
  if (url === '/api/og-image' || url.startsWith('/api/og-image?')) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a1518"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#B8963E"/>
      <stop offset="100%" stop-color="#8a6f2e"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="980" cy="120" r="180" fill="url(#gold)" opacity="0.15"/>
  <circle cx="180" cy="540" r="220" fill="url(#gold)" opacity="0.10"/>
  <line x1="80" y1="80" x2="180" y2="80" stroke="url(#gold)" stroke-width="2"/>
  <line x1="80" y1="80" x2="80" y2="180" stroke="url(#gold)" stroke-width="2"/>
  <text x="80" y="130" font-family="'Inter', sans-serif" font-size="14" fill="#B8963E" letter-spacing="6" font-weight="700">KARIBBEAN LUXURY OPERATORS</text>
  <text x="80" y="320" font-family="'Cormorant Garamond', serif" font-size="92" fill="#f4efe6" font-weight="600" font-style="italic">KLO</text>
  <text x="80" y="400" font-family="'Cormorant Garamond', serif" font-size="42" fill="#B8963E" font-weight="300">Lujo incomparable</text>
  <text x="80" y="445" font-family="'Cormorant Garamond', serif" font-size="42" fill="#B8963E" font-weight="300">en el Caribe Colombiano</text>
  <line x1="80" y1="500" x2="200" y2="500" stroke="url(#gold)" stroke-width="2"/>
  <text x="80" y="540" font-family="'Inter', sans-serif" font-size="18" fill="#f4efe6" opacity="0.7" letter-spacing="2">Aviation · Transport · Yachts · Lodging · Staff</text>
  <text x="80" y="570" font-family="'Inter', sans-serif" font-size="14" fill="#B8963E" letter-spacing="3">karibbeanluxuryoperators.lat</text>
</svg>`;
    res.statusCode = 200;
    res.setHeader('content-type', 'image/svg+xml; charset=utf-8');
    res.setHeader('cache-control', 'public, max-age=3600, s-maxage=86400');
    res.end(svg);
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
