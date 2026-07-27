// services/formatters.ts
//
// Small helpers to normalise how the admin UI displays values coming back
// from Supabase. Some columns (business_name_en/es/pt, description_en/es/pt)
// can hold either a flat string OR a legacy object like
//   {"EN":"...","ES":"","PT":""}
// when the EntityEditor wizard saved the trilingual state into a single
// column. The detail pages then render the raw JSON which looks broken.
// `parseTrilingualValue` strips that legacy shape down to the active locale.

import type { Language } from '../components/ui/DataTable';

const LANGS: Language[] = ['EN', 'ES', 'PT'];

function tryParseJsonObject(value: string): Record<string, unknown> | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // not JSON, fall through
  }
  return null;
}

/**
 * If `value` is a JSON string of the shape {"EN":"...","ES":"...","PT":"..."},
 * return the entry for the active language (or EN as fallback). Otherwise
 * return the value untouched. Returns null for empty/undefined so callers
 * can render their own "—" placeholder.
 */
export function parseTrilingualValue(
  value: unknown,
  lang: Language,
): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    // Already a parsed object (e.g. coming from a JSONB column)
    const obj = value as Record<string, unknown>;
    const pick = (obj[lang] ?? obj.EN ?? obj[lang.toLowerCase()]) as unknown;
    if (typeof pick === 'string') return pick || null;
    if (pick !== null && pick !== undefined) return String(pick);
    return null;
  }
  if (typeof value === 'string') {
    const obj = tryParseJsonObject(value);
    if (obj) {
      const pick = obj[lang] ?? obj.EN ?? obj[lang.toLowerCase()];
      if (typeof pick === 'string') return pick || null;
      if (pick !== null && pick !== undefined) return String(pick);
      return null;
    }
    return value;
  }
  return String(value);
}

/**
 * Format any value coming back from Supabase for display in a detail field
 * or table cell. Handles JSON-stringified trilingual objects, JSON arrays,
 * and falls back to String(value) for primitives.
 */
export function displayFieldValue(
  value: unknown,
  lang: Language = 'EN',
): string {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) {
    return value.map((v) => displayFieldValue(v, lang)).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    // JSONB object — try trilingual pick first
    const tri = parseTrilingualValue(value, lang);
    if (tri) return tri;
    // Fallback: pretty-print the object keys
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${displayFieldValue(v, lang)}`)
      .join(', ');
  }
  if (typeof value === 'string') {
    const tri = parseTrilingualValue(value, lang);
    if (tri !== null) return tri;
    return value;
  }
  return String(value);
}

/**
 * Display a money amount with currency. Falls back to "$" + amount if no
 * currency column.
 */
export function displayMoney(
  amount: number | string | null | undefined,
  currency: string | null | undefined = 'USD',
): string {
  if (amount === null || amount === undefined || amount === '') return '';
  const n = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (Number.isNaN(n)) return String(amount);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency || '$'} ${n.toLocaleString('en-US')}`;
  }
}

/**
 * Display a phone number, keeping the + prefix if present.
 */
export function displayPhone(value: string | null | undefined): string {
  if (!value) return '';
  return value;
}

/**
 * Display a date in a human-readable short form.
 */
export function displayDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Re-export so the rest of the app only needs one import path
export { LANGS };
