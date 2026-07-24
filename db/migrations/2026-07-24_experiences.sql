-- ── KLO experiences table (v1.8.0) ────────────────────────────────────────────
-- Multi-day curated packages that bundle suppliers + assets.
-- The 6th pillar of KLO: "Curated Experiences" / "Experiencias Curadas".
--
-- This is the table that powers:
--   1. The public site "Experiences" section (cards, hero images, prices)
--   2. The /admin Experiences tab (EntityEditor CRUD)
--   3. María the bot (recommends experiences by destination)
--   4. The PlanTripModal pre-fill (selecting an experience from a card)
--
-- Run this in the Supabase Studio SQL Editor BEFORE deploying v1.8.0 Step 11:
--   1. Open Supabase Studio for the klo-fullstack-66f70 project
--   2. Go to SQL Editor
--   3. New query, paste this whole file
--   4. Click "Run" (or Ctrl+Enter)
--   5. Verify the table exists
--
-- All admin writes go through SUPABASE_SERVICE_KEY (server-side only).
-- The browser anon key can only read rows where status='PUBLISHED' (public site).

create table if not exists public.experiences (
  id text primary key,
  -- Trilingual content. The 3 separate columns are the source of truth;
  -- the legacy `title` / `eyebrow` / `summary` / `description` columns are
  -- kept for backward-compat and backfilled from the English column on insert.
  title text not null,
  title_en text,
  title_es text,
  title_pt text,

  eyebrow text,
  eyebrow_en text,
  eyebrow_es text,
  eyebrow_pt text,

  summary text,
  summary_en text,
  summary_es text,
  summary_pt text,

  description text,
  description_en text,
  description_es text,
  description_pt text,

  -- Which KLO pillars does this experience touch?
  -- Values: 'AVIATION' | 'YACHTS' | 'LODGING' | 'STAFF' | 'TRANSPORT'
  pillars text[] not null default '{}',

  -- Trip length
  days int not null default 1 check (days >= 1 and days <= 30),

  -- Pricing (USD by default; currency column allows future expansion)
  price_from numeric not null default 0 check (price_from >= 0),
  currency text not null default 'USD' check (currency in ('USD', 'EUR', 'COP', 'MXN', 'BRL')),

  -- Hero image (required for the public card; admins upload via the
  -- EntityEditor image field, stored as base64 in v1, supabase storage in v2)
  hero_image text not null,

  -- Optional additional images for the gallery (max 5 enforced at app layer)
  gallery text[] not null default '{}',

  -- Itinerary is a list of {day, title{EN,ES,PT}, body{EN,ES,PT}} objects.
  -- Stored as jsonb to keep the schema flexible. The EntityEditor renders
  -- a "list of items" editor with the configured sub-fields.
  itinerary jsonb not null default '[]'::jsonb,

  -- Cross-references to the supplier + asset tables. These are the actual
  -- vendors that fulfill this experience. Soft FKs (no DB-level FK constraint
  -- because the admin might publish before vendors are seeded).
  vendor_ids text[] not null default '{}',
  asset_ids text[] not null default '{}',

  -- Lifecycle: DRAFT (admin only) | PUBLISHED (public site) | ARCHIVED (hidden)
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),

  -- Featured: show with a gold badge on the Experiences section
  featured boolean not null default false,

  -- Display order: lower numbers appear first (admin-controlled)
  display_order int not null default 0,

  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

-- Indexes for the public site queries
create index if not exists experiences_status_idx on public.experiences(status);
create index if not exists experiences_pillars_idx on public.experiences using gin(pillars);
create index if not exists experiences_display_order_idx on public.experiences(display_order, created_at desc);
create index if not exists experiences_featured_idx on public.experiences(featured) where featured = true;

-- RLS: only PUBLISHED rows are readable by the anon key. All writes go
-- through the server's SUPABASE_SERVICE_KEY which bypasses RLS.
alter table public.experiences enable row level security;

drop policy if exists "anon can read published experiences" on public.experiences;
create policy "anon can read published experiences"
  on public.experiences for select
  to anon, authenticated
  using (status = 'PUBLISHED');

drop policy if exists "anon cannot write experiences" on public.experiences;
create policy "anon cannot write experiences"
  on public.experiences for all
  to anon, authenticated
  using (false)
  with check (false);

-- Trigger to keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists experiences_touch_updated_at on public.experiences;
create trigger experiences_touch_updated_at
  before update on public.experiences
  for each row execute function public.touch_updated_at();

-- Trigger to backfill the legacy single-language columns from the _en column
-- on insert/update. Lets the old `<T.title>` lookup still work if a future
-- component is built before the trilingual pattern is applied.
create or replace function public.backfill_experience_legacy_columns() returns trigger as $$
begin
  if new.title_en is not null and (new.title is null or new.title = '') then
    new.title := new.title_en;
  end if;
  if new.eyebrow_en is not null and (new.eyebrow is null or new.eyebrow = '') then
    new.eyebrow := new.eyebrow_en;
  end if;
  if new.summary_en is not null and (new.summary is null or new.summary = '') then
    new.summary := new.summary_en;
  end if;
  if new.description_en is not null and (new.description is null or new.description = '') then
    new.description := new.description_en;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists experiences_backfill_legacy on public.experiences;
create trigger experiences_backfill_legacy
  before insert or update on public.experiences
  for each row execute function public.backfill_experience_legacy_columns();

-- Seed the 6 starter experiences from the brainstorm doc. All DRAFT so the
-- admin can review each one, fix any text/photo, and publish individually.
-- Photos are placeholder Unsplash URLs (free to use, no attribution required).
-- Edit in /admin → Experiencias when ready.
insert into public.experiences (
  id, title_en, title_es, title_pt,
  eyebrow_en, eyebrow_es, eyebrow_pt,
  summary_en, summary_es, summary_pt,
  description_en, description_es, description_pt,
  pillars, days, price_from, currency,
  hero_image, status, featured, display_order
) values
(
  'cartagena-week',
  'The Cartagena Week', 'La Semana en Cartagena', 'A Semana em Cartagena',
  '7 Days · 3 Pillars', '7 Días · 3 Pilares', '7 Dias · 3 Pilares',
  'Private jet from Miami, three nights in a Bocagrande penthouse, four days on a crewed catamaran. The kids'' chef handles allergies. We handle the rest.',
  'Jet privado desde Miami, tres noches en un penthouse en Bocagrande, cuatro días en un catamarán con tripulación. El chef de los niños maneja alergias. Nosotros nos encargamos del resto.',
  'Jato privado de Miami, três noites em um penthouse em Bocagrande, quatro dias em um catamarã com tripulação. O chef das crianças cuida das alergias. Cuidamos do resto.',
  'Day 1-2: Private jet from Miami/Mexico City, transfer to Casa Pompo (Bocagrande penthouse). Day 3: Full-day private yacht (Lagoon 78) to Islas del Rosario with chef on board. Day 4: Old City cultural tour with private historian + photographer. Day 5: Heli-tour to Tayrona with private picnic. Day 6: Spa at Sofitel Legend + private chef dinner at Alma. Day 7: Jet back, with photographer''s printed photo book delivered the next week.',
  'Día 1-2: Jet privado desde Miami/Ciudad de México, traslado a Casa Pombo (penthouse en Bocagrande). Día 3: Yate privado de día completo (Lagoon 78) a Islas del Rosario con chef a bordo. Día 4: Tour cultural por la Ciudad Amurallada con historiador privado + fotógrafo. Día 5: Heli-tour a Tayrona con picnic privado. Día 6: Spa en Sofitel Legend + cena con chef privado en Alma. Día 7: Regreso en jet, con libro de fotos impreso entregado la semana siguiente.',
  'Dia 1-2: Jato privado de Miami/Cidade do México, traslado para Casa Pombo (penthouse em Bocagrande). Dia 3: Iate privado de dia inteiro (Lagoon 78) para Islas del Rosario com chef a bordo. Dia 4: Passeio cultural pela Cidade Amuralhada com historiador privado + fotógrafo. Dia 5: Heli-tour para Tayrona com piquenique privativo. Dia 6: Spa no Sofitel Legend + jantar com chef privativo no Alma. Dia 7: Retorno de jato, com livro de fotos impresso entregue na semana seguinte.',
  array['AVIATION', 'YACHTS', 'LODGING', 'STAFF'], 7, 42000, 'USD',
  'https://images.unsplash.com/photo-1583997052301-0042b33fc598?w=1600&q=80',
  'DRAFT', true, 1
),
(
  'san-andres-escape',
  'The San Andrés Escape', 'La Escapada a San Andrés', 'A Fuga para San Andrés',
  '5 Days · 3 Pillars', '5 Días · 3 Pilares', '5 Dias · 3 Pilares',
  'Direct charter flight from Bogotá, an overwater villa with a private dive instructor, sunset catamaran with sommelier. 24/7 concierge, armored transport.',
  'Vuelo chárter directo desde Bogotá, villa sobre el agua con instructor de buceo privado, catamarán al atardecer con sommelier. Conserjería 24/7, transporte blindado.',
  'Voo fretado direto de Bogotá, vila sobre a água com instrutor de mergulho privativo, catamarã ao pôr do sol com sommelier. Concierge 24/7, transporte blindado.',
  'Day 1: Charter Phenom 300 from Bogotá. Day 2-3: Overwater villa + daily diving with PADI-certified divemaster. Day 4: Sunset catamaran with private DJ + sommelier wine pairing. Day 5: Return charter, with KLO photographer''s printed photo book delivered the next week.',
  'Día 1: Charter Phenom 300 desde Bogotá. Días 2-3: Villa sobre el agua + buceo diario con divemaster certificado PADI. Día 4: Catamarán al atardecer con DJ privado + maridaje con sommelier. Día 5: Regreso en charter, con libro de fotos del fotógrafo KLO entregado la próxima semana.',
  'Dia 1: Phenom 300 fretado de Bogotá. Dias 2-3: Vila sobre a água + mergulho diário com divemaster certificado PADI. Dia 4: Catamarã ao pôr do sol com DJ privativo + harmonização com sommelier. Dia 5: Retorno fretado, com livro de fotos do fotógrafo KLO entregue na semana seguinte.',
  array['AVIATION', 'LODGING', 'STAFF'], 5, 28500, 'USD',
  'https://images.unsplash.com/photo-1559666126-84f389727b9a?w=1600&q=80',
  'DRAFT', false, 2
),
(
  'amazon-wellness',
  'The Amazon Wellness Retreat', 'El Retiro de Bienestar en el Amazonas', 'O Retiro de Bem-Estar na Amazônia',
  '6 Days · 2 Pillars', '6 Días · 2 Pilares', '6 Dias · 2 Pilares',
  'Charter jet to Leticia, private eco-lodge, daily yoga, traditional plant ceremony, jungle medicine walks with a private chef. Four medical pros on standby.',
  'Jet chárter a Leticia, eco-lodge privado, yoga diario, ceremonia tradicional de plantas, caminatas de medicina selvática con chef privado. Cuatro profesionales médicos en standby.',
  'Jato fretado para Leticia, eco-lodge privativo, ioga diária, cerimônia tradicional de plantas, caminhadas de medicina da floresta com chef privativo. Quatro profissionais médicos de plantão.',
  'Day 1: Charter jet to Leticia, transfer to private eco-lodge in Reserva Natural. Day 2-3: Daily yoga, traditional ayahuasca ceremony with trained curandero (legal Colombian context), jungle medicine walks. Day 4-5: Spa treatments + private plant-based chef menu. Day 6: Return charter.',
  'Día 1: Jet chárter a Leticia, traslado al eco-lodge privado en Reserva Natural. Días 2-3: Yoga diario, ceremonia tradicional de ayahuasca con curandero entrenado (contexto legal colombiano), caminatas de medicina selvática. Días 4-5: Tratamientos de spa + menú con chef privado basado en plantas. Día 6: Regreso en chárter.',
  'Dia 1: Jato fretado para Leticia, traslado para eco-lodge privativo na Reserva Natural. Dias 2-3: Ioga diária, cerimônia tradicional de ayahuasca com curandeiro treinado (contexto legal colombiano), caminhadas de medicina da floresta. Dias 4-5: Tratamentos de spa + menu com chef privativo à base de plantas. Dia 6: Retorno fretado.',
  array['AVIATION', 'LODGING', 'STAFF'], 6, 35000, 'USD',
  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80',
  'DRAFT', false, 3
),
(
  'coffee-triangle',
  'The Coffee Triangle Discovery', 'El Descubrimiento del Triángulo del Café', 'A Descoberta do Triângulo do Café',
  '5 Days · 2 Pillars', '5 Días · 2 Pilares', '5 Dias · 2 Pilares',
  'Helicopter tour over Zona Cafetera, private hacienda with own coffee farm tour, barista + sommelier pairing, horseback ride through Cocora Valley.',
  'Tour en helicóptero sobre la Zona Cafetera, hacienda privada con tour por finca cafetera propia, maridaje con barista + sommelier, cabalgata por el Valle de Cocora.',
  'Passeio de helicóptero sobre a Zona Cafetera, fazenda privativa com tour pela própria plantação de café, harmonização com barista + sommelier, cavalgada pelo Vale de Cocora.',
  'Day 1: Helicopter tour from Armenia over Zona Cafetera. Day 2-3: Private hacienda stay + own coffee farm tour with private barista. Day 4: Horseback ride through Cocora Valley + private wine pairing dinner. Day 5: Return via Armenia.',
  'Día 1: Tour en helicóptero desde Armenia sobre la Zona Cafetera. Días 2-3: Estancia en hacienda privada + tour por finca cafetera propia con barista privado. Día 4: Cabalgata por el Valle de Cocora + cena con maridaje de vinos privado. Día 5: Regreso vía Armenia.',
  'Dia 1: Passeio de helicóptero de Armênia sobre a Zona Cafetera. Dias 2-3: Estadia em fazenda privativa + tour pela própria plantação de café com barista privativo. Dia 4: Cavalgada pelo Vale de Cocora + jantar com harmonização de vinhos privativa. Dia 5: Retorno via Armênia.',
  array['AVIATION', 'LODGING', 'STAFF'], 5, 22000, 'USD',
  'https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?w=1600&q=80',
  'DRAFT', false, 4
),
(
  'guajira-expedition',
  'The Guajira Desert Expedition', 'La Expedición al Desierto de La Guajira', 'A Expedição ao Deserto de La Guajira',
  '4 Days · 3 Pillars', '4 Días · 3 Pilares', '4 Dias · 3 Pilares',
  '4x4 private convoy from Riohacha, luxury glamping at Punta Gallinas, private Wayuu guide, sunset at Cabo de la Vela, seafood dinner under the stars.',
  'Convoy privado 4x4 desde Riohacha, glamping de lujo en Punta Gallinas, guía Wayuu privado, atardecer en Cabo de la Vela, cena de mariscos bajo las estrellas.',
  'Comboio privativo 4x4 de Riohacha, glamping de luxo em Punta Gallinas, guia Wayuu privativo, pôr do sol em Cabo de la Vela, jantar de frutos do mar sob as estrelas.',
  'Day 1: 4x4 convoy from Riohacha. Day 2: Luxury glamping at Punta Gallinas, private Wayuu guide, traditional craft workshops. Day 3: Sunset at Cabo de la Vela, private chef seafood dinner. Day 4: Return via chartered King Air.',
  'Día 1: Convoy 4x4 desde Riohacha. Día 2: Glamping de lujo en Punta Gallinas, guía Wayuu privado, talleres de artesanía tradicional. Día 3: Atardecer en Cabo de la Vela, cena de mariscos con chef privado. Día 4: Regreso en King Air chárter.',
  'Dia 1: Comboio 4x4 de Riohacha. Dia 2: Glamping de luxo em Punta Gallinas, guia Wayuu privativo, oficinas de artesanato tradicional. Dia 3: Pôr do sol em Cabo de la Vela, jantar de frutos do mar com chef privativo. Dia 4: Retorno via King Air fretado.',
  array['TRANSPORT', 'LODGING', 'STAFF'], 4, 18500, 'USD',
  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1600&q=80',
  'DRAFT', false, 5
),
(
  'bogota-weekend',
  'The Bogotá Long Weekend', 'El Fin de Semana Largo en Bogotá', 'O Fim de Semana Longo em Bogotá',
  '4 Days · 3 Pillars', '4 Días · 3 Pilares', '4 Dias · 3 Pilares',
  'Private jet to Bogotá, Four Seasons stay, after-hours Gold Museum, helicopter to Zipaquirá salt cathedral with private lunch, dinner at Leo with wine pairing.',
  'Jet privado a Bogotá, estancia en Four Seasons, Museo del Oro fuera de horario, helicóptero a la catedral de sal de Zipaquirá con almuerzo privado, cena en Leo con maridaje.',
  'Jato privativo para Bogotá, estadia no Four Seasons, Museu do Ouro fora de horário, helicóptero para a catedral de sal de Zipaquirá com almoço privativo, jantar no Leo com harmonização.',
  'Day 1: Private jet to Bogotá, Four Seasons Casa Medina. Day 2: After-hours Gold Museum + Botero with private docent. Day 3: Helicopter to Zipaquirá salt cathedral + private lunch. Day 4: Dinner at Leo with private wine pairing, return jet.',
  'Día 1: Jet privado a Bogotá, Four Seasons Casa Medina. Día 2: Museo del Oro fuera de horario + Botero con guía privado. Día 3: Helicóptero a la catedral de sal de Zipaquirá + almuerzo privado. Día 4: Cena en Leo con maridaje privado, jet de regreso.',
  'Dia 1: Jato privativo para Bogotá, Four Seasons Casa Medina. Dia 2: Museu do Ouro fora de horário + Botero com guia privativo. Dia 3: Helicóptero para a catedral de sal de Zipaquirá + almoço privativo. Dia 4: Jantar no Leo com harmonização privativa, jato de retorno.',
  array['AVIATION', 'LODGING', 'STAFF'], 4, 15000, 'USD',
  'https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=1600&q=80',
  'DRAFT', false, 6
)
on conflict (id) do nothing;
