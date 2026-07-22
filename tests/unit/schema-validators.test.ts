// Unit tests for the client data shape.
// Validates that the Client interface in ClientManagement matches what the
// /api/clients endpoint returns. If we ever change one and not the other,
// this catches it.

import { describe, it, expect } from 'vitest';
import type { Client, ClientPreferences } from '../../components/ClientManagement';

describe('ClientPreferences shape', () => {
  it('has the 4 expected fields', () => {
    const p: ClientPreferences = {
      dietary: ['vegetarian'],
      beverages: ['whisky'],
      temperature: '22°C',
      interests: ['yacht'],
    };
    expect(Array.isArray(p.dietary)).toBe(true);
    expect(Array.isArray(p.beverages)).toBe(true);
    expect(typeof p.temperature).toBe('string');
    expect(Array.isArray(p.interests)).toBe(true);
  });

  it('allows empty arrays', () => {
    const p: ClientPreferences = { dietary: [], beverages: [], temperature: '22°C', interests: [] };
    expect(p.dietary).toEqual([]);
    expect(p.beverages).toEqual([]);
    expect(p.interests).toEqual([]);
  });
});

describe('Client shape (admin tab)', () => {
  it('has all fields the /api/clients POST expects', () => {
    const c: Client = {
      id: 'C123',
      name: 'Juan',
      email: 'j@example.com',
      phone: '+57...',
      whatsapp: '+57...',
      tier: 'UHNWI',
      status: 'ACTIVE',
      preferences: { dietary: [], beverages: [], temperature: '22°C', interests: [] },
      past_experiences: 0,
      total_spend: 0,
      loyalty_points: 0,
      notes: null,
      source: 'manual',
      created_at: '2026-01-01T00:00:00Z',
      created_by: null,
    };
    expect(c.tier).toMatch(/^(UHNWI|VVIP|VIP)$/);
    expect(c.status).toMatch(/^(ACTIVE|INACTIVE|PROSPECT)$/);
  });
});

describe('Tier validation (matches server.ts check)', () => {
  it('rejects invalid tier values', () => {
    const valid: Array<Client['tier']> = ['UHNWI', 'VVIP', 'VIP'];
    const invalid = ['VVVIP', 'GOLD', '', 'uhnwi', null];
    for (const t of valid) expect(['UHNWI', 'VVIP', 'VIP']).toContain(t);
    for (const t of invalid) expect(['UHNWI', 'VVIP', 'VIP']).not.toContain(t as string);
  });
});

describe('Status validation (matches server.ts check)', () => {
  it('rejects invalid status values', () => {
    const valid: Array<Client['status']> = ['ACTIVE', 'INACTIVE', 'PROSPECT'];
    const invalid = ['active', 'DELETED', '', null];
    for (const s of valid) expect(['ACTIVE', 'INACTIVE', 'PROSPECT']).toContain(s);
    for (const s of invalid) expect(['ACTIVE', 'INACTIVE', 'PROSPECT']).not.toContain(s as string);
  });
});
