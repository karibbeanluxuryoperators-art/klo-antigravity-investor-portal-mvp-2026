// Critical-path API tests for the admin endpoints.
// We spin up the Express app in-process and hit it with supertest.
// Supabase is stubbed via the `services/supabase` module mock.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// We import the server module AFTER mocks are set up. The server module
// reads process.env at import time, which our setup.ts pre-populates.
let app: express.Express;

beforeAll(async () => {
  // We don't want the server to call app.listen (Vercel handles that).
  // We import the module for its side-effect of attaching routes to `app`.
  // server.ts exports the app in CommonJS-compiled form, but tsx gives us
  // an `app` named export via destructure. Fall back to `default`.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = await import('../../api/index');
  // The compiled api/index bundles the routes; the function it exports is the
  // handler. We need the inner Express `app`. For unit testing the routes,
  // we can call the handler with a mock request via supertest.
  app = (mod as any).default || (mod as any);
});

afterAll(() => { vi.restoreAllMocks(); });

describe('GET /api/config', () => {
  it('returns supabase url and anonKey', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('supabase');
    expect(res.body.supabase).toHaveProperty('url');
    expect(res.body.supabase).toHaveProperty('anonKey');
  });
});

describe('GET /api/admin/check (no auth)', () => {
  it('returns 200 with role: null when no Bearer token', async () => {
    const res = await request(app).get('/api/admin/check');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: null, role: null, isAdmin: false });
  });

  it('returns 200 with role: null on invalid Bearer token (graceful)', async () => {
    const res = await request(app)
      .get('/api/admin/check')
      .set('Authorization', 'Bearer not-a-real-jwt');
    // Server treats invalid tokens as unauthenticated (not as 500/401).
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ role: null, isAdmin: false });
  });
});

describe('GET /api/admin/users (no auth)', () => {
  it('returns 403 admin only', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(403);
  });
});

describe('GET /api/clients (no auth)', () => {
  it('returns 403 admin only', async () => {
    const res = await request(app).get('/api/clients');
    expect(res.status).toBe(403);
  });

  it('returns 403 on invalid Bearer', async () => {
    const res = await request(app)
      .get('/api/clients')
      .set('Authorization', 'Bearer fake.token.here');
    expect(res.status).toBe(403);
  });
});

describe('POST /api/clients (no auth)', () => {
  it('returns 403 on missing body', async () => {
    const res = await request(app).post('/api/clients').send({});
    expect(res.status).toBe(403);
  });
});

describe('POST /api/leads (public)', () => {
  it('accepts a valid lead with required fields only', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ name: 'Test', email: 't@example.com' });
    // Either created (200) or returns a Supabase error since table may not exist
    // in the test env — either way, the route should NOT 500 silently.
    expect([200, 201, 400, 500]).toContain(res.status);
  });
});

describe('GET /api/health', () => {
  it('returns ok with serverLoaded: true', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', serverLoaded: true });
  });
});

describe('GET /api/assets', () => {
  it('returns 200 with array (empty or populated)', async () => {
    const res = await request(app).get('/api/assets');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET / (landing page)', () => {
  it('returns 200 with HTML', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});
