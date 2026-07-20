// ── Vite plugin: rewrite @opentelemetry/api literal in Supabase chunk ────────
//
// Supabase's JS SDK has a runtime `import("@opentelemetry/api")` (the
// argument is a string variable, not a static import, so Vite can't resolve
// it). When the browser runs that import, it tries to fetch the bare
// specifier as a URL, hits the SPA catch-all (returns index.html with
// text/html), and the module loader throws a TypeError about MIME type —
// leaving the user staring at a blank page after clicking the magic-link
// button.
//
// This plugin:
//   1. Emits src/opentelemetry-shim.ts as /assets/otel-shim.js.
//   2. Rewrites the literal string "@opentelemetry/api" in the main bundle
//      to "./otel-shim.js" so the dynamic import resolves to a real module
//      URL that returns valid JavaScript.

import type { Plugin } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const SHIM_OUT_PATH = 'assets/otel-shim.js';
const LITERAL_TO_REPLACE = '"@opentelemetry/api"';
// Use an absolute URL (./assets/...) so the browser resolves the import
// correctly regardless of the current page URL. With a bare relative path
// like "./otel-shim.js", the browser resolves it relative to the
// *document* URL — so on /supplier/login, it becomes /supplier/otel-shim.js,
// which doesn't exist, which hits the SPA catch-all and returns index.html
// with text/html — which is exactly the MIME type error we were chasing.
// The leading "./" before "assets" is what Vite produces when `base: "./"`
// is set in vite.config.ts, so the URL stays relative-to-origin instead of
// protocol-relative, and works the same on https://, file://, etc.
const REPLACEMENT = '"./assets/otel-shim.js"';

export function otelShimPlugin(): Plugin {
  return {
    name: 'klo-otel-shim',
    enforce: 'post',
    async writeBundle(options) {
      // The shim source is plain ESM JavaScript (with one `export type` line
      // that's safe to ship as a comment). We just copy it.
      const shimPath = path.resolve(__dirname, 'src/opentelemetry-shim.ts');
      const shimSource = await fs.readFile(shimPath, 'utf-8');
      const outDir = options.dir ?? 'dist';
      const outPath = path.join(outDir, SHIM_OUT_PATH);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, shimSource);
      // eslint-disable-next-line no-console
      console.log(`[klo-otel-shim] wrote ${outPath} (${shimSource.length} bytes)`);
    },
    // renderChunk fires during the render phase, BEFORE Vite computes the
    // chunk's content hash. By mutating the code here we ensure the
    // emitted JS file gets a NEW hash, so the CDN serves the updated
    // version instead of serving the cached old one.
    renderChunk(code, chunk) {
      if (!chunk.fileName.endsWith('.js')) return null;
      if (!code.includes(LITERAL_TO_REPLACE)) return null;
      const next = code.split(LITERAL_TO_REPLACE).join(REPLACEMENT);
      // eslint-disable-next-line no-console
      console.log(`[klo-otel-shim] rewrote ${chunk.fileName}`);
      return next;
    },
  };
}
