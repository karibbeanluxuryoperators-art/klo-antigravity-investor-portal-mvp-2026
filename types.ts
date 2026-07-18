// ── Existing klo-antigravity types (preserved) ─────────────────────────────
// Public site lang key — lowercase, supports 8 languages.
export type Language = 'en' | 'es' | 'pt' | 'it' | 'fr' | 'zh' | 'ja' | 'de';

export interface Destination {
  id: string;
  titleKey: string;
  descriptionKey: string;
  imageUrl: string;
  externalLink?: string;
}

export interface NavItem {
  labelKey: string;
  href: string;
}

// ── KLO Platform types (ported from KLO-FULLSTACK) ─────────────────────────
// Portal lang key — uppercase, trilingual (EN/ES/PT).
// Used in supplier / client / admin components ported from KLO-FULLSTACK.
export type PortalLanguage = 'EN' | 'ES' | 'PT';

export type AssetType = 'STAFF' | 'AIRCRAFT' | 'VESSEL' | 'VEHICLE' | 'LODGING';

export interface BaseAsset {
  id: string;
  name: string;
  type: AssetType;
  status: 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE' | 'OFFLINE';
  location: string;
  supplier_id: string;
  pricePerUnit: string;
  price_per_unit: string;
  capacity: number;
  image?: string;
  gallery?: string[];
  images?: string[];
  videoUrl?: string;
  description?: string;
  contactName?: string;
  bookedDates?: string[];
  amenities?: string[];
}

export interface Staff extends BaseAsset {
  type: 'STAFF';
  role: 'PILOT' | 'CAPTAIN' | 'CHEF' | 'SECURITY' | 'BUTLER' | 'CONCIERGE';
  rating: number;
  languages: string[];
}

export interface Aircraft extends BaseAsset {
  type: 'AIRCRAFT';
  model: string;
  range: string;
  tailNumber: string;
}

export interface Vessel extends BaseAsset {
  type: 'VESSEL';
  length: string;
  crewCount: number;
  vesselType: 'YACHT' | 'CATAMARAN' | 'SPEEDBOAT';
}

export interface Vehicle extends BaseAsset {
  type: 'VEHICLE';
  model: string;
  isArmored: boolean;
  driverName?: string;
}

export interface Lodging extends BaseAsset {
  type: 'LODGING';
  rooms: number;
}

export type Asset = Staff | Aircraft | Vessel | Vehicle | Lodging;

// ── Supplier ───────────────────────────────────────────────────────────────
export type SupplierStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Supplier {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  whatsapp: string;
  location: string;
  asset_type: string;
  description: string;
  status: SupplierStatus;
  firebase_uid?: string;
  telegram_chat_id?: string;
  google_calendar_id?: string;
  created_at?: string;
}

// ── Bundle (multi-supplier package) ────────────────────────────────────────
export type BundleStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Bundle {
  id: string;
  owner_supplier_id: string;
  name: string;
  description: string | null;
  total_price: string;
  status: BundleStatus;
  created_at: string;
  approved_at?: string | null;
  approved_by?: string | null;
  items?: BundleItem[];
  items_count?: number;
}

export interface BundleItem {
  id: string;
  bundle_id: string;
  asset_id: string;
  qty: number;
  asset_name?: string;
  asset_type?: string;
  asset_location?: string;
  supplier_business_name?: string;
}

export interface AvailableAsset {
  id: string;
  name: string;
  type: string;
  location: string;
  description: string;
  price_per_unit: string;
  price_type: string;
  capacity: number;
  supplier_id: string;
  business_name: string;
}
