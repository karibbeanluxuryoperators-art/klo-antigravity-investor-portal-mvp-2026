import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { otelShimPlugin } from './vite.otel-shim-plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // v1.8.0 Sprint H1: Sentry Vite plugin for source-map upload.
  // Guarded on SENTRY_AUTH_TOKEN so the build proceeds normally when the
  // token is missing. When present, it auto-uploads source maps to Sentry
  // on every production build (linked to the SENTRY_DSN / VITE_SENTRY_DSN).
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN;
  const sentryOrg = env.SENTRY_ORG;
  const sentryProject = env.SENTRY_PROJECT;
  const useSentryPlugin = Boolean(sentryAuthToken && sentryOrg && sentryProject);
  const plugins: any[] = [react(), otelShimPlugin()];
  if (useSentryPlugin) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sentryVitePlugin } = require('@sentry/vite-plugin');
    plugins.push(sentryVitePlugin({
      org: sentryOrg,
      project: sentryProject,
      authToken: sentryAuthToken,
      // Only upload on production builds, never on dev/preview.
      disable: mode !== 'production',
    }));
    console.log('[sentry] vite plugin enabled (source maps will upload)');
  }
  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins,
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // v1.7.3: alias any static `import ... from '@opentelemetry/api'`
        // (we don't have any today, but the alias makes the dep future-proof
        // for the day someone adds an OpenTelemetry-aware component). The
        // dynamic-import rewrite in vite.otel-shim-plugin.ts handles the
        // Supabase SDK's runtime `import("@opentelemetry/api")` call which
        // Vite can't statically analyze.
        '@opentelemetry/api': path.resolve(__dirname, 'src/opentelemetry-shim.ts'),
      }
    },
    css: {
      postcss: {
        plugins: [
          tailwindcss(),
          autoprefixer(),
        ],
      },
    },
  };
});
