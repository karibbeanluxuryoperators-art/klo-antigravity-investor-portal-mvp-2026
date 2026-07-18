-- Supabase Schema for KLO
-- Apply in Supabase SQL editor (one-time setup).
-- Then apply supabase_migration_partner_flow.sql for the partner flow.

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  experience_type TEXT,
  budget TEXT,
  travel_dates TEXT,
  special_requests TEXT,
  message TEXT,
  status TEXT DEFAULT 'NEW',
  timestamp TIMESTAMPTZ DEFAULT now(),
  source TEXT
);

-- Assets Table
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  supplier_id TEXT,
  name TEXT,
  type TEXT,
  location TEXT,
  description TEXT,
  price_per_unit TEXT,
  price_type TEXT,
  capacity INTEGER,
  amenities JSONB,
  images JSONB,
  status TEXT DEFAULT 'ACTIVE',
  google_calendar_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  asset_id TEXT REFERENCES assets(id),
  guest_name TEXT,
  guest_email TEXT,
  start_date TEXT,
  end_date TEXT,
  total_price TEXT,
  status TEXT DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  business_name TEXT,
  contact_name TEXT,
  email TEXT,
  whatsapp TEXT,
  location TEXT,
  asset_type TEXT,
  description TEXT,
  status TEXT DEFAULT 'PENDING',
  google_calendar_id TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Asset Availability Table
CREATE TABLE IF NOT EXISTS asset_availability (
  id TEXT PRIMARY KEY,
  asset_id TEXT REFERENCES assets(id),
  date TEXT,
  status TEXT,
  price_override TEXT,
  source TEXT DEFAULT 'MANUAL',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(asset_id, date)
);
