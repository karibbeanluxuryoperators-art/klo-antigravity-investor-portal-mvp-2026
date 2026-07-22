// Shared test setup. Stubs out the Supabase client so we can run unit
// + integration tests in-process without hitting the real database.

import { vi, beforeAll, afterAll } from 'vitest';

// Provide env vars BEFORE any module reads them. The build / server expects these.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'test-service-key';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';

// Suppress noisy logs from intentional 4xx/5xx tests.
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? '');
    if (msg.includes('Failed to load resource') || msg.includes('ECONNREFUSED')) return;
    originalConsoleError(...args);
  };
});
afterAll(() => { console.error = originalConsoleError; });

// Make `vi` available as a global for ergonomic tests if desired.
declare global {
  // eslint-disable-next-line no-var
  var __vi: typeof import('vitest').vi;
}
(globalThis as unknown as { __vi: typeof vi }).__vi = vi;
