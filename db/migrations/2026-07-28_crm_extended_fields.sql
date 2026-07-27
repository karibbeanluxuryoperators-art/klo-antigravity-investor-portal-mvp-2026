-- ── KLO CRM extended fields (v1.8.0) ──────────────────────────────────────
-- Research-based standard fields for clients / leads / suppliers.
-- Sources: Salesforce Industry CRM (CDM), SIA Vendor Profile, Zanda, Altrata,
--          Family Office CRM.
--
-- All columns are nullable and idempotent. Until applied, the server endpoints
-- POST/PATCH /api/{clients,leads,suppliers} will skip these fields and the
-- admin UI will hide them (see services/formatters.ts + EntityConfigs).
--
-- Run this ONCE in the Supabase Studio SQL editor. Safe to re-run.
--
-- After running, also verify the columns are queryable:
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='clients' order by ordinal_position;
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='leads' order by ordinal_position;
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='suppliers' order by ordinal_position;

-- ──────────────────────────────────────────────────────────────────────────
-- CLIENTS — UHNWI / VVIP / VIP profile enrichment
-- ──────────────────────────────────────────────────────────────────────────
alter table public.clients
  add column if not exists tax_id           text,                    -- RUT/NIT/Tax ID for invoicing (CD: tax_id)
  add column if not exists alt_phones       text[]    default '{}',  -- backup phone numbers (CDM: alternatephone)
  add column if not exists alt_emails       text[]    default '{}',  -- backup emails (CDM: alternateemail)
  add column if not exists job_title        text,                    -- "CEO", "Family Office Director" (CDM: title)
  add column if not exists company          text,                    -- for corporate clients
  add column if not exists industry         text,                    -- "Family Office", "PE", "Family Trust" (CD: industry)
  add column if not exists nationality      text,                    -- passport ISO country (Family Office CRM)
  add column if not exists country_residence text,                   -- ISO-3166-1 alpha-2 (Altrata: residenceCountry)
  add column if not exists city_residence   text,                    -- Miami, Bogotá, etc.
  add column if not exists source_of_wealth text,                    -- "Family inheritance", "Founder exit" (Family Office CRM)
  add column if not exists net_worth_band   text,                    -- "USD 5-10M", "USD 50M+", "USD 500M+" (Altrata bands)
  add column if not exists date_of_birth    date,                    -- for birthday campaigns
  add column if not exists preferred_language text default 'ES',     -- 'EN' | 'ES' | 'PT' (Zanda: language)
  add column if not exists address_line     text,                    -- full address line 1
  add column if not exists passport_number  text,                    -- for KYC / private aviation manifests
  add column if not exists passport_expiry  date,                    -- private aviation / yacht crew need it
  add column if not exists emergency_contact text,                   -- "Spouse: +57...; Lawyer: +1..."
  add column if not exists linkedin_url     text,                    -- CDM: LinkedIn handle
  add column if not exists tags             text[]    default '{}';  -- free-form: ["vip-returning","press-shy","event-2025"]

create index if not exists clients_tax_id_idx          on public.clients (tax_id)        where tax_id is not null;
create index if not exists clients_nationality_idx     on public.clients (nationality)   where nationality is not null;
create index if not exists clients_country_residence_idx on public.clients (country_residence) where country_residence is not null;
create index if not exists clients_net_worth_band_idx  on public.clients (net_worth_band)  where net_worth_band is not null;
create index if not exists clients_tags_idx            on public.clients using gin (tags);
create index if not exists clients_alt_phones_idx      on public.clients using gin (alt_phones);
create index if not exists clients_alt_emails_idx      on public.clients using gin (alt_emails);

-- ──────────────────────────────────────────────────────────────────────────
-- LEADS — Inbound inquiry enrichment
-- ──────────────────────────────────────────────────────────────────────────
alter table public.leads
  add column if not exists notes             text,                   -- admin internal notes (different from message)
  add column if not exists preferred_language text default 'ES',     -- 'EN' | 'ES' | 'PT'
  add column if not exists nationality       text,                   -- ISO-3166-1 alpha-2
  add column if not exists origin            text,                   -- departure city "BOG", "MIA"
  add column if not exists destination       text,                   -- "CTG", "SMR"
  add column if not exists travel_date       date,                   -- start of trip
  add column if not exists travel_end_date   date,                   -- end of trip
  add column if not exists travelers         integer,                -- party size
  add column if not exists budget_min        numeric(12,2),          -- USD
  add column if not exists budget_max        numeric(12,2),          -- USD
  add column if not exists trip_type         text,                   -- 'LEISURE' | 'BUSINESS' | 'WEDDING' | 'BIRTHDAY' | 'OTHER'
  add column if not exists accommodation     text,                   -- 'YACHT' | 'PRIVATE_VILLA' | 'HOTEL_5STAR' | 'MIXED'
  add column if not exists pillar_interest   text,                   -- primary pillar they're asking about
  add column if not exists experience_interest text,                 -- experience_id (FK reserved)
  add column if not exists job_title         text,                   -- for corporate leads
  add column if not exists tags              text[] default '{}',    -- campaign attribution
  add column if not exists utm_source        text,                   -- 'instagram', 'referral', etc.
  add column if not exists utm_campaign      text,                   -- for paid-ad attribution
  add column if not exists tax_id            text;                   -- some leads want a quote for their company

create index if not exists leads_preferred_language_idx  on public.leads (preferred_language);
create index if not exists leads_origin_idx              on public.leads (origin)        where origin is not null;
create index if not exists leads_destination_idx         on public.leads (destination)   where destination is not null;
create index if not exists leads_travel_date_idx         on public.leads (travel_date)   where travel_date is not null;
create index if not exists leads_pillar_interest_idx     on public.leads (pillar_interest) where pillar_interest is not null;
create index if not exists leads_tags_idx                on public.leads using gin (tags);

-- ──────────────────────────────────────────────────────────────────────────
-- SUPPLIERS — Vendor profile enrichment (SIA + Vendorful standard)
-- ──────────────────────────────────────────────────────────────────────────
alter table public.suppliers
  add column if not exists pillar            text,                   -- primary pillar (suppliers.pillar was missing)
  add column if not exists country           text,                   -- ISO-3166-1 alpha-2 of HQ
  add column if not exists city              text,
  add column if not exists tax_id            text,                   -- NIT/RFC for invoicing
  add column if not exists website           text,
  add column if not exists instagram         text,
  add column if not exists linkedin_url      text,
  add column if not exists years_in_business integer,                -- "since 2005"
  add column if not exists fleet_size        integer,                -- # of aircraft / yachts / vehicles / rooms / staff
  add column if not exists license_number    text,                   -- tourism license, aviation permit
  add column if not exists insurance_provider text,
  add column if not exists insurance_expiry   date,
  add column if not exists bank_name         text,                   -- for payouts
  add column if not exists bank_account_last4 text,                  -- last 4 only — never store full account numbers
  add column if not exists commission_pct    numeric(5,2) default 5.00, -- 5% default per v0.5 model (cross-supplier bundles)
  add column if not exists payment_terms     text default 'NET_48',  -- 'NET_24' | 'NET_48' | 'NET_72'
  add column if not exists rating_avg        numeric(3,2),            -- 1.00 - 5.00, computed from guest feedback
  add column if not exists rating_count      integer default 0,
  add column if not exists tags              text[] default '{}';    -- 'luxury-yachts','helicopter','padi-cert'

-- pillar is the primary pillar (asset_type is legacy, both stay for back-compat)
-- Make pillar mirror asset_type for existing rows that already have asset_type
update public.suppliers
  set pillar = asset_type
  where pillar is null and asset_type is not null;

create index if not exists suppliers_pillar_idx        on public.suppliers (pillar)     where pillar is not null;
create index if not exists suppliers_country_idx       on public.suppliers (country)    where country is not null;
create index if not exists suppliers_tax_id_idx        on public.suppliers (tax_id)     where tax_id is not null;
create index if not exists suppliers_tags_idx          on public.suppliers using gin (tags);
create index if not exists suppliers_commission_pct_idx on public.suppliers (commission_pct);

-- ──────────────────────────────────────────────────────────────────────────
-- Smoke check (run after to confirm columns exist)
-- ──────────────────────────────────────────────────────────────────────────
-- select table_name, count(*) as new_columns
-- from information_schema.columns
-- where table_schema='public'
--   and table_name in ('clients','leads','suppliers')
--   and column_name in (
--     'tax_id','alt_phones','alt_emails','job_title','company','industry','nationality',
--     'country_residence','city_residence','source_of_wealth','net_worth_band',
--     'date_of_birth','preferred_language','address_line','passport_number',
--     'passport_expiry','emergency_contact','linkedin_url','tags',
--     'notes','origin','destination','travel_date','travel_end_date','travelers',
--     'budget_min','budget_max','trip_type','accommodation','pillar_interest',
--     'experience_interest','utm_source','utm_campaign',
--     'pillar','country','city','website','instagram','years_in_business',
--     'fleet_size','license_number','insurance_provider','insurance_expiry',
--     'bank_name','bank_account_last4','commission_pct','payment_terms',
--     'rating_avg','rating_count'
--   )
-- group by table_name
-- order by table_name;
-- expected: clients 22, leads 21, suppliers 24
