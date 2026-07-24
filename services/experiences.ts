// ── KLO Experiences client (v1.8.0 Step 11) ────────────────────────────────────
// Typed wrapper for the public.experiences table.
//
// Admin operations require a Bearer token (SUPABASE_SERVICE_KEY on the server).
// The browser anon key can only read rows where status='PUBLISHED'.
//
// Used by:
//   - components/admin/EntityEditor (CRUD UI for the admin)
//   - components/Experiences.tsx (public site section, list + detail)
//   - api/chat.ts (bot context: María knows the 6 starter experiences)

export type ExperiencePillar = 'AVIATION' | 'YACHTS' | 'LODGING' | 'STAFF' | 'TRANSPORT';
export type ExperienceStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ExperienceCurrency = 'USD' | 'EUR' | 'COP' | 'MXN' | 'BRL';

export interface ExperienceItineraryDay {
  day: number;
  title: { EN: string; ES: string; PT: string };
  body: { EN: string; ES: string; PT: string };
}

export interface Experience {
  id: string;
  title: string;
  title_en: string | null;
  title_es: string | null;
  title_pt: string | null;

  eyebrow: string | null;
  eyebrow_en: string | null;
  eyebrow_es: string | null;
  eyebrow_pt: string | null;

  summary: string | null;
  summary_en: string | null;
  summary_es: string | null;
  summary_pt: string | null;

  description: string | null;
  description_en: string | null;
  description_es: string | null;
  description_pt: string | null;

  pillars: ExperiencePillar[];
  days: number;
  price_from: number;
  currency: ExperienceCurrency;
  hero_image: string;
  gallery: string[];

  itinerary: ExperienceItineraryDay[];

  vendor_ids: string[];
  asset_ids: string[];

  status: ExperienceStatus;
  featured: boolean;
  display_order: number;

  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// ── Read helpers (public, no auth needed for PUBLISHED rows) ─────────────────

/**
 * Fetches experiences. Defaults to PUBLISHED only (the public-site use case).
 * Pass `{ status: 'ALL' }` to get all rows (admin use case).
 */
export async function listExperiences(
  options: { status?: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | 'ALL'; bearer?: string } = {}
): Promise<Experience[]> {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  const headers: Record<string, string> = {};
  if (options.bearer) headers['Authorization'] = `Bearer ${options.bearer}`;

  const res = await fetch(`/api/experiences?${params.toString()}`, { headers });
  if (!res.ok) {
    console.error('listExperiences failed', res.status, await res.text());
    return [];
  }
  return (await res.json()) as Experience[];
}

/**
 * Fetches a single experience by id. Returns null if not found.
 */
export async function getExperience(
  id: string,
  bearer?: string
): Promise<Experience | null> {
  const headers: Record<string, string> = {};
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`;

  const res = await fetch(`/api/experiences/${id}`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error('getExperience failed', res.status, await res.text());
    return null;
  }
  return (await res.json()) as Experience;
}

// ── Write helpers (admin only) ────────────────────────────────────────────────

export type ExperienceInput = Omit<
  Experience,
  'created_at' | 'updated_at' | 'created_by' | 'updated_by'
> &
  Partial<Pick<Experience, 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>>;

/**
 * Creates a new experience. Admin only (returns 401/403 without Bearer).
 * Returns the created row.
 */
export async function createExperience(
  input: ExperienceInput,
  bearer: string
): Promise<Experience | { error: string }> {
  const res = await fetch('/api/experiences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text();
    return { error: `${res.status}: ${body}` };
  }
  return (await res.json()) as Experience;
}

/**
 * Patches an experience. Admin only. Returns the updated row.
 */
export async function updateExperience(
  id: string,
  patch: Partial<ExperienceInput>,
  bearer: string
): Promise<Experience | { error: string }> {
  const res = await fetch(`/api/experiences/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.text();
    return { error: `${res.status}: ${body}` };
  }
  return (await res.json()) as Experience;
}

/**
 * Soft-deletes (archives) an experience. Admin only.
 */
export async function archiveExperience(
  id: string,
  bearer: string
): Promise<{ ok: true } | { error: string }> {
  const res = await fetch(`/api/experiences/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${bearer}` },
  });
  if (!res.ok) {
    const body = await res.text();
    return { error: `${res.status}: ${body}` };
  }
  return { ok: true };
}

/**
 * Toggles an experience between DRAFT and PUBLISHED. Admin only.
 */
export async function togglePublish(
  id: string,
  currentStatus: ExperienceStatus,
  bearer: string
): Promise<Experience | { error: string }> {
  const next: ExperienceStatus = currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
  return updateExperience(id, { status: next }, bearer);
}

// ── Display helpers ──────────────────────────────────────────────────────────

/**
 * Returns the experience title in the requested language, with a 3-tier
 * fallback: requested lang → English → id.
 */
export function experienceTitle(
  exp: Pick<Experience, 'id' | 'title_en' | 'title_es' | 'title_pt' | 'title'>,
  lang: 'EN' | 'ES' | 'PT'
): string {
  return (
    (lang === 'EN' ? exp.title_en : lang === 'ES' ? exp.title_es : exp.title_pt) ||
    exp.title_en ||
    exp.title ||
    exp.id
  );
}

export function experienceSummary(
  exp: Pick<Experience, 'summary_en' | 'summary_es' | 'summary_pt' | 'summary'>,
  lang: 'EN' | 'ES' | 'PT'
): string {
  return (
    (lang === 'EN' ? exp.summary_en : lang === 'ES' ? exp.summary_es : exp.summary_pt) ||
    exp.summary_en ||
    exp.summary ||
    ''
  );
}

export function experienceDescription(
  exp: Pick<Experience, 'description_en' | 'description_es' | 'description_pt' | 'description'>,
  lang: 'EN' | 'ES' | 'PT'
): string {
  return (
    (lang === 'EN' ? exp.description_en : lang === 'ES' ? exp.description_es : exp.description_pt) ||
    exp.description_en ||
    exp.description ||
    ''
  );
}

export function experienceItinerary(
  exp: Pick<Experience, 'itinerary'>,
  lang: 'EN' | 'ES' | 'PT'
): Array<{ day: number; title: string; body: string }> {
  return (exp.itinerary || []).map((d) => ({
    day: d.day,
    title: d.title?.[lang] || d.title?.EN || '',
    body: d.body?.[lang] || d.body?.EN || '',
  }));
}

export function pillarLabel(
  pillar: ExperiencePillar,
  lang: 'EN' | 'ES' | 'PT'
): string {
  const T: Record<ExperiencePillar, { EN: string; ES: string; PT: string }> = {
    AVIATION:  { EN: 'Aviation',   ES: 'Aviación',    PT: 'Aviação' },
    YACHTS:    { EN: 'Yachts',     ES: 'Yates',       PT: 'Iates' },
    LODGING:   { EN: 'Lodging',    ES: 'Alojamiento', PT: 'Hospedagem' },
    STAFF:     { EN: 'Staff',      ES: 'Personal',    PT: 'Equipe' },
    TRANSPORT: { EN: 'Transport',  ES: 'Transporte',  PT: 'Transporte' },
  };
  return T[pillar][lang] || T[pillar].EN;
}

export function formatPrice(amount: number, currency: ExperienceCurrency): string {
  const symbols: Record<ExperienceCurrency, string> = {
    USD: '$', EUR: '€', COP: 'COL$', MXN: 'MX$', BRL: 'R$',
  };
  return `${symbols[currency]}${amount.toLocaleString('en-US')}`;
}
