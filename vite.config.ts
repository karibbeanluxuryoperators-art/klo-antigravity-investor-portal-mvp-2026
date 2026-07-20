import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { otelShimPlugin } from './vite.otel-shim-plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), otelShimPlugin()],
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
