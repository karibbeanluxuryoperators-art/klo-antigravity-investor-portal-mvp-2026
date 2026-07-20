// ── @opentelemetry/api stub ───────────────────────────────────────────────────
// Supabase's JS SDK does a runtime `import("@opentelemetry/api")` to pick up
// W3C trace context propagation headers. If the package isn't installed, the
// SDK is supposed to silently no-op (the import is wrapped in .catch(()=>null)).
//
// BUT: in modern browsers with strict module-MIME-type checking, the import
// rejection becomes a TypeError ("Expected a JavaScript-or-Wasm module script
// but the server responded with a MIME type of 'text/html'") that bubbles up
// out of the catch — leaving the user staring at a blank page after clicking
// the magic-link button.
//
// We don't actually use OpenTelemetry in v1 — we just need the Supabase SDK
// to be happy. So we ship a no-op stub for the subset of the API that
// Supabase touches (propagation + context). The stub returns the same shape
// of object the real package does, but every method is a no-op and every
// accessor returns undefined.
//
// The vite.otel-shim-plugin.ts plugin rewrites Supabase's dynamic
// `import("@opentelemetry/api")` to `import("./otel-shim.js")` and emits
// this file as a separate chunk. Vite's resolve.alias catches any static
// imports too.
//
// When you actually want tracing (a v1.8+ feature), install the real
// @opentelemetry/api package and remove the alias + plugin from
// vite.config.ts.

const propagation = {
  inject: (_carrier, _supplier) => {
    // no-op
  },
  extract: (_carrier, _getter) => {
    return undefined;
  },
};

const context = {
  active: () => {
    return undefined;
  },
  with: (_ctx, _fn) => {
    _fn();
  },
};

const __default = { propagation, context };

export { propagation, context, __default as default };
