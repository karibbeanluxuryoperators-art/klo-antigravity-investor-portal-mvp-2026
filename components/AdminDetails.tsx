import React, { useEffect, useState } from 'react';
import {
  Mail, MessageSquare, Phone, MapPin, Package, Calendar, Clock,
  DollarSign, User, Sparkles, ExternalLink, FileText, Edit3, Save,
  Loader2, AlertCircle, Inbox, X as XIcon, Check, Trash2,
} from 'lucide-react';
import {
  AdminDetailLayout, DetailCard, DetailField, DetailGrid,
  type Language, type AdminSection,
} from './ui/AdminDetailLayout';
import { DataTable, StatusPill, type Column } from './ui/DataTable';
import { getSupplierSession } from '../services/supabase';

// v1.8.0 Step 6: Admin detail pages (4 routes).
//
// Each page is a thin wrapper around AdminDetailLayout with:
//   * Tab config (Profile / Activity / Notes)
//   * Data loaders via /api/{section}/:id
//   * Action buttons (status change, delete, etc.)
//
// All 4 pages share the same dark theme + trilingual copy as the rest of
// /admin. None of them need to know about routing — App.tsx dispatches to
// the right one based on pathname.

async function authedFetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const session = await getSupplierSession();
  const token = session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function whatsappLink(phone: string | null, whatsapp: string | null): string | null {
  const raw = (whatsapp || phone || '').replace(/\D/g, '');
  if (!raw) return null;
  return `https://wa.me/${raw}`;
}

// ── 1. Supplier detail ────────────────────────────────────────────────
export interface SupplierRecord {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  whatsapp: string;
  location: string;
  asset_type: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  google_calendar_id?: string;
  created_at: string;
  telegram_chat_id?: string;
}

interface SupplierDetailProps {
  id: string;
  lang: Language;
  signedInEmail?: string | null;
  onSignOut?: () => void;
  counts?: Partial<Record<AdminSection, number>>;
  pendingSuppliersCount?: number;
  newLeadsCount?: number;
}

const ASSET_TYPE_LABEL: Record<string, { EN: string; ES: string; PT: string }> = {
  STAFF:    { EN: 'Staff',    ES: 'Personal',    PT: 'Equipe' },
  AIRCRAFT: { EN: 'Aircraft', ES: 'Aeronave',    PT: 'Aeronave' },
  VESSEL:   { EN: 'Vessel',   ES: 'Embarcación', PT: 'Embarcação' },
  VEHICLE:  { EN: 'Vehicle',  ES: 'Vehículo',    PT: 'Veículo' },
  LODGING:  { EN: 'Lodging',  ES: 'Alojamiento', PT: 'Hospedagem' },
};

export const SupplierDetail: React.FC<SupplierDetailProps> = (props) => {
  const { id, lang, signedInEmail, onSignOut, counts, pendingSuppliersCount, newLeadsCount } = props;
  const [assets, setAssets] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  // Action handlers
  const updateStatus = async (s: SupplierRecord, status: 'APPROVED' | 'REJECTED') => {
    await authedFetchJSON(`/api/suppliers/${s.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    window.location.reload();
  };

  // Prefetch assets + bookings for the "Inventory" / "Bookings" tabs
  useEffect(() => {
    authedFetchJSON<any[]>(`/api/suppliers/${id}/assets`).then(setAssets).catch(() => setAssets([]));
    authedFetchJSON<any[]>(`/api/bookings?supplier_id=${id}`).then(setBookings).catch(() => setBookings([]));
  }, [id]);

  const assetColumns: Column<any>[] = [
    { key: 'name', label: { EN: 'Asset', ES: 'Activo', PT: 'Ativo' }, render: (a) => <span className="text-white">{a.name}</span> },
    { key: 'type', label: { EN: 'Type', ES: 'Tipo', PT: 'Tipo' }, render: (a) => <span className="text-xs text-white/60 uppercase tracking-widest">{a.type}</span> },
    { key: 'location', label: { EN: 'Location', ES: 'Ubicación', PT: 'Localização' }, render: (a) => <span className="text-xs text-white/60">{a.location}</span>, hideOnMobile: true },
    { key: 'price', label: { EN: 'Price', ES: 'Precio', PT: 'Preço' }, align: 'right', render: (a) => <span className="text-[#B8963E] font-serif italic">{a.price_per_unit}</span> },
    { key: 'status', label: { EN: 'Status', ES: 'Estado', PT: 'Estado' }, render: (a) => <StatusPill status={a.status} lang={lang} /> },
  ];

  const bookingColumns: Column<any>[] = [
    { key: 'guest', label: { EN: 'Guest', ES: 'Huésped', PT: 'Hóspede' }, render: (b) => <div><div className="text-sm text-white">{b.guest_name}</div><div className="text-[10px] text-white/40">{b.guest_email}</div></div> },
    { key: 'asset', label: { EN: 'Asset', ES: 'Activo', PT: 'Ativo' }, render: (b) => <span className="text-sm text-white">{b.asset_name || b.assets?.name}</span>, hideOnMobile: true },
    { key: 'dates', label: { EN: 'Dates', ES: 'Fechas', PT: 'Datas' }, render: (b) => <span className="text-xs text-white/60">{new Date(b.start_date).toLocaleDateString()}</span> },
    { key: 'total', label: { EN: 'Total', ES: 'Total', PT: 'Total' }, align: 'right', render: (b) => <span className="text-[#B8963E] font-serif italic">{b.total_price}</span> },
    { key: 'status', label: { EN: 'Status', ES: 'Estado', PT: 'Estado' }, render: (b) => <StatusPill status={b.status} lang={lang} /> },
  ];

  return (
    <AdminDetailLayout<SupplierRecord>
      section="SUPPLIERS"
      backHref="/admin"
      backLabel={{ EN: 'Back to Suppliers', ES: 'Volver a Socios', PT: 'Voltar a Parceiros' }}
      pageEyebrow={{ EN: 'Network Management', ES: 'Gestión de Red', PT: 'Gestão de Rede' }}
      endpoint={`/api/suppliers/${id}`}
      lang={lang}
      signedInEmail={signedInEmail}
      onSignOut={onSignOut}
      counts={counts}
      pendingSuppliersCount={pendingSuppliersCount}
      newLeadsCount={newLeadsCount}
      renderHeader={(s) => (
        <span className="text-3xl md:text-4xl font-serif italic text-white flex items-center gap-3 flex-wrap">
          {s.business_name}
          <StatusPill status={s.status} lang={lang} />
        </span>
      )}
      headerActions={(s) => (
        <>
          {s.status === 'PENDING' && (
            <>
              <button
                onClick={() => updateStatus(s, 'APPROVED')}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#B8963E] text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#B8963E]/90"
              >
                <Check size={12} /> {lang === 'ES' ? 'Aprobar' : lang === 'PT' ? 'Aprovar' : 'Approve'}
              </button>
              <button
                onClick={() => updateStatus(s, 'REJECTED')}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-300 border border-red-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20"
              >
                <XIcon size={12} /> {lang === 'ES' ? 'Rechazar' : lang === 'PT' ? 'Rejeitar' : 'Reject'}
              </button>
            </>
          )}
        </>
      )}
      tabs={[
        {
          key: 'profile',
          label: { EN: 'Profile', ES: 'Perfil', PT: 'Perfil' },
          render: (s) => (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <DetailCard title={{ EN: 'Business Information', ES: 'Información del Negocio', PT: 'Informações do Negócio' }} lang={lang}>
                  <DetailGrid>
                    <DetailField lang={lang} label={{ EN: 'Business Name', ES: 'Razón Social', PT: 'Razão Social' }} value={s.business_name} />
                    <DetailField lang={lang} label={{ EN: 'Asset Type', ES: 'Tipo de Activo', PT: 'Tipo de Ativo' }} value={ASSET_TYPE_LABEL[s.asset_type]?.[lang] || s.asset_type} />
                    <DetailField lang={lang} label={{ EN: 'Location', ES: 'Ubicación', PT: 'Localização' }} value={s.location} />
                    <DetailField lang={lang} label={{ EN: 'Google Calendar', ES: 'Google Calendar', PT: 'Google Calendar' }} value={s.google_calendar_id || '—'} mono />
                    <DetailField lang={lang} label={{ EN: 'Telegram Chat ID', ES: 'Telegram Chat ID', PT: 'Telegram Chat ID' }} value={s.telegram_chat_id || '—'} mono />
                    <DetailField lang={lang} label={{ EN: 'Submitted', ES: 'Enviado', PT: 'Enviado' }} value={new Date(s.created_at).toLocaleString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US')} />
                  </DetailGrid>
                  {s.description && (
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40 mb-2">
                        {lang === 'ES' ? 'Descripción' : lang === 'PT' ? 'Descrição' : 'Description'}
                      </p>
                      <p className="text-sm text-white/70 leading-relaxed italic border-l-2 border-[#B8963E]/30 pl-4">
                        "{s.description}"
                      </p>
                    </div>
                  )}
                </DetailCard>
              </div>
              <div className="space-y-6">
                <DetailCard title={{ EN: 'Contact', ES: 'Contacto', PT: 'Contato' }} lang={lang}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#B8963E]/15 flex items-center justify-center text-[#B8963E]">
                      <User size={18} />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{s.contact_name}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-[0.3em]">
                        {lang === 'ES' ? 'Contacto principal' : lang === 'PT' ? 'Contato principal' : 'Primary contact'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    {s.email && (
                      <a href={`mailto:${s.email}`} className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/80 transition-colors">
                        <Mail size={14} className="text-white/40" />
                        <span className="flex-1 truncate">{s.email}</span>
                        <ExternalLink size={11} className="text-white/30" />
                      </a>
                    )}
                    {s.whatsapp && (
                      <a href={whatsappLink(s.whatsapp, null) || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-sm text-emerald-300 transition-colors">
                        <MessageSquare size={14} />
                        <span className="flex-1">{s.whatsapp}</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </DetailCard>
              </div>
            </div>
          ),
        },
        {
          key: 'inventory',
          label: { EN: `Inventory (${assets.length})`, ES: `Inventario (${assets.length})`, PT: `Inventário (${assets.length})` },
          render: () => (
            <DataTable
              rows={assets}
              columns={assetColumns}
              rowKey={(a) => a.id}
              lang={lang}
              emptyTitle={{ EN: 'No assets yet', ES: 'Sin activos aún', PT: 'Sem ativos ainda' }}
              emptyHint={{ EN: 'This partner has not added any inventory yet.', ES: 'Este socio aún no ha añadido inventario.', PT: 'Este parceiro ainda não adicionou inventário.' }}
            />
          ),
        },
        {
          key: 'bookings',
          label: { EN: `Bookings (${bookings.length})`, ES: `Reservas (${bookings.length})`, PT: `Reservas (${bookings.length})` },
          render: () => (
            <DataTable
              rows={bookings}
              columns={bookingColumns}
              rowKey={(b) => b.id}
              lang={lang}
              emptyTitle={{ EN: 'No bookings yet', ES: 'Sin reservas aún', PT: 'Sem reservas ainda' }}
              emptyHint={{ EN: 'This partner has no incoming reservations yet.', ES: 'Este socio aún no tiene reservas.', PT: 'Este parceiro ainda não tem reservas.' }}
            />
          ),
        },
      ]}
    />
  );
};

// ── 2. Client detail ─────────────────────────────────────────────────
export interface ClientRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  tier: 'UHNWI' | 'VVIP' | 'VIP';
  status: 'ACTIVE' | 'INACTIVE' | 'PROSPECT';
  preferences: { dietary: string[]; beverages: string[]; temperature: string; interests: string[] };
  past_experiences: number;
  total_spend: number;
  loyalty_points: number;
  notes: string | null;
  source: string | null;
  created_at: string;
  created_by: string | null;
  booking_count?: number;
}

interface ClientDetailProps extends Omit<SupplierDetailProps, 'id'> {
  id: string;
}

export const ClientDetail: React.FC<ClientDetailProps> = (props) => {
  const { id, lang, signedInEmail, onSignOut, counts, pendingSuppliersCount, newLeadsCount } = props;
  return (
    <AdminDetailLayout<ClientRecord>
      section="CLIENTS"
      backHref="/admin"
      backLabel={{ EN: 'Back to Clients', ES: 'Volver a Clientes', PT: 'Voltar a Clientes' }}
      pageEyebrow={{ EN: 'UHNWI Guest Relations', ES: 'Relaciones Huéspedes UHNWI', PT: 'Relações Hóspedes UHNWI' }}
      endpoint={`/api/clients/${id}`}
      lang={lang}
      signedInEmail={signedInEmail}
      onSignOut={onSignOut}
      counts={counts}
      pendingSuppliersCount={pendingSuppliersCount}
      newLeadsCount={newLeadsCount}
      renderHeader={(c) => (
        <span className="text-3xl md:text-4xl font-serif italic text-white flex items-center gap-3 flex-wrap">
          {c.name}
          <StatusPill status={c.tier} lang={lang} />
          <StatusPill status={c.status} lang={lang} />
        </span>
      )}
      tabs={[
        {
          key: 'profile',
          label: { EN: 'Profile', ES: 'Perfil', PT: 'Perfil' },
          render: (c) => (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <DetailCard title={{ EN: 'Intelligence', ES: 'Inteligencia', PT: 'Inteligência' }} lang={lang}>
                  <DetailGrid cols={3}>
                    <DetailField lang={lang} label={{ EN: 'Tier', ES: 'Nivel', PT: 'Nível' }} value={c.tier} accent />
                    <DetailField lang={lang} label={{ EN: 'Status', ES: 'Estado', PT: 'Status' }} value={c.status} />
                    <DetailField lang={lang} label={{ EN: 'Source', ES: 'Origen', PT: 'Origem' }} value={c.source} />
                    <DetailField lang={lang} label={{ EN: 'Past Experiences', ES: 'Experiencias Pasadas', PT: 'Experiências Passadas' }} value={c.past_experiences} />
                    <DetailField lang={lang} label={{ EN: 'Total Spend', ES: 'Gasto Total', PT: 'Gasto Total' }} value={`$${(c.total_spend || 0).toLocaleString()}`} accent />
                    <DetailField lang={lang} label={{ EN: 'Loyalty Points', ES: 'Puntos de Lealtad', PT: 'Pontos de Fidelidade' }} value={c.loyalty_points} />
                    <DetailField lang={lang} label={{ EN: 'Cabin Temp', ES: 'Temp Cabina', PT: 'Temp Cabine' }} value={c.preferences?.temperature} />
                    <DetailField lang={lang} label={{ EN: 'Created', ES: 'Creado', PT: 'Criado' }} value={new Date(c.created_at).toLocaleDateString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US')} />
                    <DetailField lang={lang} label={{ EN: 'Created By', ES: 'Creado Por', PT: 'Criado Por' }} value={c.created_by || '—'} />
                  </DetailGrid>
                </DetailCard>

                <DetailCard title={{ EN: 'Preferences', ES: 'Preferencias', PT: 'Preferências' }} lang={lang}>
                  <div className="space-y-4">
                    <PrefList lang={lang} label={{ EN: 'Dietary', ES: 'Requisitos Dietéticos', PT: 'Requisitos Dietéticos' }} items={c.preferences?.dietary} />
                    <PrefList lang={lang} label={{ EN: 'Beverages', ES: 'Bebidas Preferidas', PT: 'Bebidas Preferidas' }} items={c.preferences?.beverages} />
                    <PrefList lang={lang} label={{ EN: 'Interests', ES: 'Intereses', PT: 'Interesses' }} items={c.preferences?.interests} />
                  </div>
                </DetailCard>
              </div>

              <div className="space-y-6">
                <DetailCard title={{ EN: 'Contact', ES: 'Contacto', PT: 'Contato' }} lang={lang}>
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/80">
                      <Mail size={14} className="text-white/40" /> <span className="flex-1 truncate">{c.email}</span>
                    </a>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/80">
                      <Phone size={14} className="text-white/40" /> <span className="flex-1">{c.phone}</span>
                    </a>
                  )}
                  {c.whatsapp && (
                    <a href={whatsappLink(c.phone, c.whatsapp) || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-sm text-emerald-300">
                      <MessageSquare size={14} /> <span className="flex-1">{c.whatsapp}</span>
                    </a>
                  )}
                </DetailCard>

                {c.notes && (
                  <DetailCard title={{ EN: 'Internal Notes', ES: 'Notas Internas', PT: 'Notas Internas' }} lang={lang}>
                    <p className="text-sm text-white/70 leading-relaxed italic border-l-2 border-[#B8963E]/30 pl-4">
                      "{c.notes}"
                    </p>
                  </DetailCard>
                )}
              </div>
            </div>
          ),
        },
        {
          key: 'bookings',
          label: { EN: 'Bookings', ES: 'Reservas', PT: 'Reservas' },
          render: () => (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-white/40">
              <p className="text-sm">
                {lang === 'ES' ? 'Próximamente — vincula esta vista a /api/bookings?client_id=...' : lang === 'PT' ? 'Em breve — vincule esta vista a /api/bookings?client_id=...' : 'Coming soon — link this view to /api/bookings?client_id=...'}
              </p>
              <p className="text-[10px] mt-2 text-white/30">
                {lang === 'ES' ? 'Requiere migración adicional' : lang === 'PT' ? 'Requer migração adicional' : 'Requires additional migration'}
              </p>
            </div>
          ),
        },
      ]}
    />
  );
};

const PrefList: React.FC<{ lang: Language; label: any; items: string[] }> = ({ lang, label, items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40 mb-2">{label[lang] || label.EN}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="text-[10px] font-bold uppercase tracking-widest text-[#B8963E] bg-[#B8963E]/10 border border-[#B8963E]/30 px-3 py-1 rounded-full">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

// ── 3. Booking detail ────────────────────────────────────────────────
export interface BookingRecord {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_type: string;
  guest_name: string;
  guest_email: string;
  start_date: string;
  end_date: string;
  total_price: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  notes: string;
  created_at: string;
  assets?: { name: string; type: string; supplier_id: string; suppliers?: { business_name: string; contact_name: string; email: string; whatsapp: string } };
}

interface BookingDetailProps extends Omit<SupplierDetailProps, 'id'> {
  id: string;
}

export const BookingDetail: React.FC<BookingDetailProps> = (props) => {
  const { id, lang, signedInEmail, onSignOut, counts, pendingSuppliersCount, newLeadsCount } = props;
  const [notes, setNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState(false);

  return (
    <AdminDetailLayout<BookingRecord>
      section="BOOKINGS"
      backHref="/admin"
      backLabel={{ EN: 'Back to Bookings', ES: 'Volver a Reservas', PT: 'Voltar a Reservas' }}
      pageEyebrow={{ EN: 'Journey Orchestration', ES: 'Orquestación de Viajes', PT: 'Orquestração de Viagens' }}
      endpoint={`/api/bookings/${id}`}
      lang={lang}
      signedInEmail={signedInEmail}
      onSignOut={onSignOut}
      counts={counts}
      pendingSuppliersCount={pendingSuppliersCount}
      newLeadsCount={newLeadsCount}
      renderHeader={(b) => (
        <span className="text-3xl md:text-4xl font-serif italic text-white flex items-center gap-3 flex-wrap">
          {b.guest_name}
          <StatusPill status={b.status} lang={lang} />
        </span>
      )}
      headerActions={(b) => (
        <>
          {b.status === 'PENDING' && (
            <button
              onClick={async () => { await authedFetchJSON(`/api/bookings/${b.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMED' }) }); window.location.reload(); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/25"
            >
              <Check size={12} /> {lang === 'ES' ? 'Confirmar' : lang === 'PT' ? 'Confirmar' : 'Confirm'}
            </button>
          )}
          {b.status !== 'CANCELLED' && (
            <button
              onClick={async () => { await authedFetchJSON(`/api/bookings/${b.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) }); window.location.reload(); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-300 border border-red-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20"
            >
              <XIcon size={12} /> {lang === 'ES' ? 'Cancelar' : lang === 'PT' ? 'Cancelar' : 'Cancel'}
            </button>
          )}
        </>
      )}
      tabs={[
        {
          key: 'overview',
          label: { EN: 'Overview', ES: 'Resumen', PT: 'Visão Geral' },
          render: (b) => {
            const start = new Date(b.start_date);
            const end = new Date(b.end_date);
            const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DetailCard title={{ EN: 'Asset', ES: 'Activo', PT: 'Ativo' }} lang={lang}>
                  <DetailField lang={lang} label={{ EN: 'Name', ES: 'Nombre', PT: 'Nome' }} value={b.asset_name || b.assets?.name} />
                  <DetailField lang={lang} label={{ EN: 'Type', ES: 'Tipo', PT: 'Tipo' }} value={b.asset_type || b.assets?.type} />
                  {b.assets?.suppliers && (
                    <>
                      <DetailField lang={lang} label={{ EN: 'Supplier', ES: 'Socio', PT: 'Parceiro' }} value={b.assets.suppliers.business_name} />
                      <DetailField lang={lang} label={{ EN: 'Supplier Contact', ES: 'Contacto del Socio', PT: 'Contato do Parceiro' }} value={b.assets.suppliers.contact_name} />
                    </>
                  )}
                </DetailCard>
                <DetailCard title={{ EN: 'Guest', ES: 'Huésped', PT: 'Hóspede' }} lang={lang}>
                  <DetailField lang={lang} label={{ EN: 'Name', ES: 'Nombre', PT: 'Nome' }} value={b.guest_name} />
                  <DetailField lang={lang} label={{ EN: 'Email', ES: 'Email', PT: 'Email' }} value={b.guest_email} />
                </DetailCard>
                <DetailCard title={{ EN: 'Journey', ES: 'Viaje', PT: 'Viagem' }} lang={lang}>
                  <DetailField lang={lang} label={{ EN: 'Start', ES: 'Inicio', PT: 'Início' }} value={start.toLocaleDateString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US')} />
                  <DetailField lang={lang} label={{ EN: 'End', ES: 'Fin', PT: 'Fim' }} value={end.toLocaleDateString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US')} />
                  <DetailField lang={lang} label={{ EN: 'Duration', ES: 'Duración', PT: 'Duração' }} value={`${days} ${lang === 'ES' ? 'días' : lang === 'PT' ? 'dias' : 'days'}`} />
                  <DetailField lang={lang} label={{ EN: 'Total', ES: 'Total', PT: 'Total' }} value={b.total_price} accent />
                </DetailCard>
              </div>
            );
          },
        },
        {
          key: 'notes',
          label: { EN: 'Internal Notes', ES: 'Notas Internas', PT: 'Notas Internas' },
          render: (b) => {
            if (notes === '' && b.notes) setNotes(b.notes);
            return (
              <div className="space-y-4">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={lang === 'ES' ? 'Notas internas sobre esta reserva...' : lang === 'PT' ? 'Notas internas sobre esta reserva...' : 'Internal notes about this booking...'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 min-h-[200px] resize-y"
                />
                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      setSavingNotes(true);
                      try {
                        await authedFetchJSON(`/api/bookings/${b.id}`, { method: 'PATCH', body: JSON.stringify({ notes }) });
                      } finally { setSavingNotes(false); }
                    }}
                    disabled={savingNotes}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#B8963E] text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#B8963E]/90 disabled:opacity-50"
                  >
                    {savingNotes ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {lang === 'ES' ? 'Guardar Notas' : lang === 'PT' ? 'Salvar Notas' : 'Save Notes'}
                  </button>
                </div>
              </div>
            );
          },
        },
      ]}
    />
  );
};

// ── 4. Lead detail ───────────────────────────────────────────────────
export interface LeadRecord {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  experience_type: string | null;
  budget: number | null;
  travel_dates: string | null;
  special_requests: string | null;
  message: string | null;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'WON' | 'LOST';
  timestamp: string;
  source: string | null;
}

interface LeadDetailProps extends Omit<SupplierDetailProps, 'id'> {
  id: string;
}

export const LeadDetail: React.FC<LeadDetailProps> = (props) => {
  const { id, lang, signedInEmail, onSignOut, counts, pendingSuppliersCount, newLeadsCount } = props;

  const updateStatus = async (l: LeadRecord, status: LeadRecord['status']) => {
    await authedFetchJSON(`/api/leads/${l.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    window.location.reload();
  };

  const deleteLead = async (l: LeadRecord) => {
    if (!confirm(lang === 'ES' ? '¿Eliminar este lead? No se puede deshacer.' : lang === 'PT' ? 'Excluir este lead? Não pode ser desfeito.' : 'Delete this lead? This cannot be undone.')) return;
    await authedFetchJSON(`/api/leads/${l.id}`, { method: 'DELETE' });
    window.location.href = '/admin';
  };

  return (
    <AdminDetailLayout<LeadRecord>
      section="LEADS"
      backHref="/admin"
      backLabel={{ EN: 'Back to Leads', ES: 'Volver a Leads', PT: 'Voltar a Leads' }}
      pageEyebrow={{ EN: 'Inbound Inquiries', ES: 'Consultas Entrantes', PT: 'Consultas Entrantes' }}
      endpoint={`/api/leads/${id}`}
      lang={lang}
      signedInEmail={signedInEmail}
      onSignOut={onSignOut}
      counts={counts}
      pendingSuppliersCount={pendingSuppliersCount}
      newLeadsCount={newLeadsCount}
      renderHeader={(l) => (
        <span className="text-3xl md:text-4xl font-serif italic text-white flex items-center gap-3 flex-wrap">
          {l.name || (lang === 'ES' ? 'Sin nombre' : lang === 'PT' ? 'Sem nome' : 'Unnamed')}
          <StatusPill status={l.status} lang={lang} />
        </span>
      )}
      headerActions={(l) => (
        <>
          {l.status === 'NEW' && (
            <button
              onClick={() => updateStatus(l, 'CONTACTED')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-white/15"
            >
              {lang === 'ES' ? 'Marcar Contactado' : lang === 'PT' ? 'Marcar Contatado' : 'Mark Contacted'}
            </button>
          )}
          {l.status !== 'WON' && (
            <button
              onClick={() => updateStatus(l, 'WON')}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#B8963E] text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#B8963E]/90"
            >
              <Sparkles size={12} /> {lang === 'ES' ? 'Marcar Ganado' : lang === 'PT' ? 'Marcar Ganho' : 'Mark Won'}
            </button>
          )}
          <button
            onClick={() => deleteLead(l)}
            className="flex items-center gap-2 px-4 py-2.5 text-red-300/70 hover:text-red-300 hover:bg-red-500/10 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
          >
            <Trash2 size={12} /> {lang === 'ES' ? 'Eliminar' : lang === 'PT' ? 'Excluir' : 'Delete'}
          </button>
        </>
      )}
      tabs={[
        {
          key: 'profile',
          label: { EN: 'Inquiry', ES: 'Consulta', PT: 'Consulta' },
          render: (l) => (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <DetailCard title={{ EN: 'Message', ES: 'Mensaje', PT: 'Mensagem' }} lang={lang}>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                    {l.message || <span className="text-white/30 italic">{lang === 'ES' ? 'Sin mensaje' : lang === 'PT' ? 'Sem mensagem' : 'No message'}</span>}
                  </p>
                </DetailCard>
                {l.special_requests && (
                  <DetailCard title={{ EN: 'Special Requests', ES: 'Solicitudes Especiales', PT: 'Pedidos Especiais' }} lang={lang}>
                    <p className="text-sm text-white/70 italic border-l-2 border-[#B8963E]/30 pl-4">
                      "{l.special_requests}"
                    </p>
                  </DetailCard>
                )}
              </div>
              <div className="space-y-6">
                <DetailCard title={{ EN: 'Contact', ES: 'Contacto', PT: 'Contato' }} lang={lang}>
                  {l.email && (
                    <a href={`mailto:${l.email}`} className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/80">
                      <Mail size={14} className="text-white/40" /> <span className="flex-1 truncate">{l.email}</span>
                      <ExternalLink size={11} className="text-white/30" />
                    </a>
                  )}
                  {(l.whatsapp || l.phone) && (
                    <a href={whatsappLink(l.phone, l.whatsapp) || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-sm text-emerald-300">
                      <MessageSquare size={14} /> <span className="flex-1">{l.whatsapp || l.phone}</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </DetailCard>
                <DetailCard title={{ EN: 'Trip', ES: 'Viaje', PT: 'Viagem' }} lang={lang}>
                  {l.experience_type && <DetailField lang={lang} label={{ EN: 'Experience', ES: 'Experiencia', PT: 'Experiência' }} value={l.experience_type} />}
                  {l.travel_dates && <DetailField lang={lang} label={{ EN: 'Dates', ES: 'Fechas', PT: 'Datas' }} value={l.travel_dates} />}
                  {l.budget != null && <DetailField lang={lang} label={{ EN: 'Budget', ES: 'Presupuesto', PT: 'Orçamento' }} value={`$${l.budget.toLocaleString()}`} accent />}
                  <DetailField lang={lang} label={{ EN: 'Source', ES: 'Origen', PT: 'Origem' }} value={l.source} />
                  <DetailField lang={lang} label={{ EN: 'Received', ES: 'Recibido', PT: 'Recebido' }} value={new Date(l.timestamp).toLocaleString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US')} />
                </DetailCard>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
};
