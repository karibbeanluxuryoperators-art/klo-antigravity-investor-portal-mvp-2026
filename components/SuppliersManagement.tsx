import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserCheck, Search, Filter, ChevronDown, ChevronUp,
  Check, X, MessageSquare, ExternalLink, Package,
  MapPin, Calendar, Info, Loader2, AlertCircle,
  ClipboardList, Clock, DollarSign, User, Mail,
  FileText, Save, RefreshCw, LogOut, Phone, Plus,
} from 'lucide-react';
import { ClientManagement } from './ClientManagement';
import { LeadsManagement } from './LeadsManagement';
import { DataTable, StatusPill, type Column, type FilterOption, type BulkAction, type Language } from './ui/DataTable';
import { AdminSidebar, type AdminSection } from './ui/AdminSidebar';

interface Supplier {
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
}

interface Booking {
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
}

interface SuppliersManagementProps {
  lang: Language;
  onViewAssets: (supplierId: string) => void;
  onSignOut?: () => void;
  signedInEmail?: string | null;
}

// v1.7: trilingual copy for every user-visible string in the admin UI.
// Admin is internal so we cover fewer strings than the supplier portal,
// but every label, button, and modal header is in all 3 languages.
const T_ADMIN: Record<string, { EN: string; ES: string; PT: string }> = {
  // Section eyebrows
  booking_details:    { EN: 'Booking Details', ES: 'Detalles de Reserva', PT: 'Detalhes da Reserva' },
  asset_info:         { EN: 'Asset Information', ES: 'Información del Activo', PT: 'Informações do Ativo' },
  guest_details:      { EN: 'Guest Details', ES: 'Detalles del Huésped', PT: 'Detalhes do Hóspede' },
  journey_dates:      { EN: 'Journey Dates', ES: 'Fechas del Viaje', PT: 'Datas da Viagem' },
  financials:         { EN: 'Financials', ES: 'Finanzas', PT: 'Finanças' },
  total_price:        { EN: 'Total Price', ES: 'Precio Total', PT: 'Preço Total' },
  duration:           { EN: 'Duration', ES: 'Duración', PT: 'Duração' },
  days:               { EN: 'days', ES: 'días', PT: 'dias' },
  management_notes:   { EN: 'Management Notes', ES: 'Notas Internas', PT: 'Notas Internas' },
  notes_placeholder:  { EN: 'Add internal notes about this booking...', ES: 'Agrega notas internas sobre esta reserva...', PT: 'Adicione notas internas sobre esta reserva...' },
  // Top-level section subtitles
  network_mgmt:       { EN: 'Network Management', ES: 'Gestión de Red', PT: 'Gestão de Rede' },
  journey_orch:       { EN: 'Journey Orchestration', ES: 'Orquestación de Viajes', PT: 'Orquestração de Viagens' },
  client_mgmt:        { EN: 'UHNWI Guest Relations', ES: 'Relaciones con Huéspedes UHNWI', PT: 'Relações com Hóspedes UHNWI' },
  // Filter + search
  search_partners:    { EN: 'Search by business, contact, location...', ES: 'Buscar por empresa, contacto, ubicación...', PT: 'Buscar por empresa, contato, localização...' },
  search_bookings:    { EN: 'Search by guest, asset, email...',         ES: 'Buscar por huésped, activo, email...',     PT: 'Buscar por hóspede, ativo, email...' },
  all:                { EN: 'All', ES: 'Todos', PT: 'Todos' },
  pending:            { EN: 'Pending', ES: 'Pendientes', PT: 'Pendentes' },
  approved:           { EN: 'Approved', ES: 'Aprobados', PT: 'Aprovados' },
  rejected:           { EN: 'Rejected', ES: 'Rechazados', PT: 'Rejeitados' },
  confirmed:          { EN: 'Confirmed', ES: 'Confirmadas', PT: 'Confirmadas' },
  cancelled:          { EN: 'Cancelled', ES: 'Canceladas', PT: 'Canceladas' },
  // Column headers
  th_partner:         { EN: 'Partner',      ES: 'Socio',         PT: 'Parceiro' },
  th_contact:         { EN: 'Contact',      ES: 'Contacto',      PT: 'Contato' },
  th_type:            { EN: 'Type',         ES: 'Tipo',          PT: 'Tipo' },
  th_location:        { EN: 'Location',     ES: 'Ubicación',     PT: 'Localização' },
  th_submitted:       { EN: 'Submitted',    ES: 'Enviado',       PT: 'Enviado' },
  th_actions:         { EN: 'Actions',      ES: 'Acciones',      PT: 'Ações' },
  th_guest:           { EN: 'Guest', ES: 'Huésped', PT: 'Hóspede' },
  th_asset:           { EN: 'Asset', ES: 'Activo', PT: 'Ativo' },
  th_dates:           { EN: 'Dates', ES: 'Fechas', PT: 'Datas' },
  th_total:           { EN: 'Total', ES: 'Total', PT: 'Total' },
  th_status:          { EN: 'Status', ES: 'Estado', PT: 'Estado' },
  // Buttons
  approve:            { EN: 'Approve', ES: 'Aprobar', PT: 'Aprovar' },
  reject:             { EN: 'Reject', ES: 'Rechazar', PT: 'Rejeitar' },
  confirm:            { EN: 'Confirm', ES: 'Confirmar', PT: 'Confirmar' },
  cancel:             { EN: 'Cancel', ES: 'Cancelar', PT: 'Cancelar' },
  view:               { EN: 'View', ES: 'Ver', PT: 'Ver' },
  close:              { EN: 'Close', ES: 'Cerrar', PT: 'Fechar' },
  save_notes:         { EN: 'Save Notes', ES: 'Guardar Notas', PT: 'Salvar Notas' },
  save:               { EN: 'Save', ES: 'Guardar', PT: 'Salvar' },
  sync_calendars:     { EN: 'Sync All Calendars', ES: 'Sincronizar Calendarios', PT: 'Sincronizar Calendários' },
  sign_out:           { EN: 'Sign out', ES: 'Cerrar sesión', PT: 'Sair' },
  signed_in_as:       { EN: 'Signed in as', ES: 'Conectado como', PT: 'Conectado como' },
  no_suppliers:       { EN: 'No partners yet', ES: 'Aún no hay socios', PT: 'Ainda não há parceiros' },
  no_bookings:        { EN: 'No bookings yet', ES: 'Sin reservas aún', PT: 'Sem reservas ainda' },
  no_match:           { EN: 'No matches found', ES: 'Sin coincidencias', PT: 'Sem correspondências' },
  no_match_hint:      { EN: 'Try a different search or filter.', ES: 'Prueba con otra búsqueda o filtro.', PT: 'Tente outra pesquisa ou filtro.' },
  // Asset type labels (admin-side)
  asset_staff:        { EN: 'Staff', ES: 'Personal', PT: 'Equipe' },
  asset_aircraft:     { EN: 'Aircraft', ES: 'Aeronave', PT: 'Aeronave' },
  asset_vessel:       { EN: 'Vessel', ES: 'Embarcación', PT: 'Embarcação' },
  asset_vehicle:      { EN: 'Vehicle', ES: 'Vehículo', PT: 'Veículo' },
  asset_lodging:      { EN: 'Lodging', ES: 'Alojamiento', PT: 'Hospedagem' },
  // Bulk actions
  bulk_approve:       { EN: 'Approve selected',  ES: 'Aprobar seleccionados',  PT: 'Aprovar selecionados' },
  bulk_reject:        { EN: 'Reject selected',   ES: 'Rechazar seleccionados', PT: 'Rejeitar selecionados' },
  bulk_confirm:       { EN: 'Confirm selected',  ES: 'Confirmar seleccionados',PT: 'Confirmar selecionados' },
  bulk_cancel:        { EN: 'Cancel selected',   ES: 'Cancelar seleccionados', PT: 'Cancelar selecionados' },
  bulk_confirm_q:     { EN: 'Approve {n} partner(s)?', ES: '¿Aprobar {n} socio(s)?', PT: 'Aprovar {n} parceiro(s)?' },
  bulk_reject_q:      { EN: 'Reject {n} partner(s)?',  ES: '¿Rechazar {n} socio(s)?', PT: 'Rejeitar {n} parceiro(s)?' },
  bulk_confirm_b_q:   { EN: 'Confirm {n} booking(s)?',  ES: '¿Confirmar {n} reserva(s)?', PT: 'Confirmar {n} reserva(s)?' },
  bulk_cancel_b_q:    { EN: 'Cancel {n} booking(s)?',   ES: '¿Cancelar {n} reserva(s)?', PT: 'Cancelar {n} reserva(s)?' },
  // Misc
  view_assets:        { EN: 'View inventory',  ES: 'Ver inventario', PT: 'Ver inventário' },
  sync_calendar:      { EN: 'Sync', ES: 'Sincronizar', PT: 'Sincronizar' },
  refresh:            { EN: 'Refresh', ES: 'Actualizar', PT: 'Atualizar' },
  search:             { EN: 'Search', ES: 'Buscar', PT: 'Pesquisar' },
  // Empty hints
  no_partners_hint:   { EN: 'Partner applications submitted via /supplier/apply will appear here.', ES: 'Las solicitudes de socios enviadas por /supplier/apply aparecerán aquí.', PT: 'Os pedidos de parceiros enviados por /supplier/apply aparecerão aqui.' },
  no_bookings_hint:   { EN: 'Reservations created from /admin Reservas or via the partner dashboard will appear here.', ES: 'Las reservas creadas desde /admin Reservas o desde el panel de socios aparecerán aquí.', PT: 'As reservas criadas em /admin Reservas ou no painel do parceiro aparecerão aqui.' },
};

const txAdmin = (key: keyof typeof T_ADMIN, lang: Language): string => {
  const entry = T_ADMIN[key];
  return (entry && (entry[lang] || entry.EN)) || '';
};

const ASSET_TYPE_LABEL: Record<string, { EN: string; ES: string; PT: string }> = {
  STAFF:    { EN: 'Staff',    ES: 'Personal',    PT: 'Equipe' },
  AIRCRAFT: { EN: 'Aircraft', ES: 'Aeronave',    PT: 'Aeronave' },
  VESSEL:   { EN: 'Vessel',   ES: 'Embarcación', PT: 'Embarcação' },
  VEHICLE:  { EN: 'Vehicle',  ES: 'Vehículo',    PT: 'Veículo' },
  LODGING:  { EN: 'Lodging',  ES: 'Alojamiento', PT: 'Hospedagem' },
};

const SUPPLIER_STATUS_FILTERS: FilterOption[] = [
  { value: 'ALL',      label: { EN: 'All',       ES: 'Todos',       PT: 'Todos' } },
  { value: 'PENDING',  label: { EN: 'Pending',   ES: 'Pendientes',  PT: 'Pendentes' } },
  { value: 'APPROVED', label: { EN: 'Approved',  ES: 'Aprobados',   PT: 'Aprovados' } },
  { value: 'REJECTED', label: { EN: 'Rejected',  ES: 'Rechazados',  PT: 'Rejeitados' } },
];

const BOOKING_STATUS_FILTERS: FilterOption[] = [
  { value: 'ALL',       label: { EN: 'All',        ES: 'Todos',        PT: 'Todos' } },
  { value: 'PENDING',   label: { EN: 'Pending',    ES: 'Pendientes',   PT: 'Pendentes' } },
  { value: 'CONFIRMED', label: { EN: 'Confirmed',  ES: 'Confirmadas',  PT: 'Confirmadas' } },
  { value: 'CANCELLED', label: { EN: 'Cancelled',  ES: 'Canceladas',   PT: 'Canceladas' } },
];

export const SuppliersManagement: React.FC<SuppliersManagementProps> = ({ lang, onViewAssets, onSignOut, signedInEmail }) => {
  const [activeView, setActiveView] = useState<AdminSection>('SUPPLIERS');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // ── Data fetchers ──────────────────────────────────────────────────
  const fetchSuppliers = useCallback(async () => {
    setSuppliersLoading(true);
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch suppliers', error);
      setSuppliers([]);
    } finally {
      setSuppliersLoading(false);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch bookings', error);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeView === 'SUPPLIERS' && suppliers.length === 0) fetchSuppliers();
    if (activeView === 'BOOKINGS' && bookings.length === 0) fetchBookings();
  }, [activeView, suppliers.length, bookings.length, fetchSuppliers, fetchBookings]);

  // Prefetch both on first load so badges / counts work
  useEffect(() => {
    fetchSuppliers();
    fetchBookings();
  }, [fetchSuppliers, fetchBookings]);

  // ── Counts for sidebar badges ──────────────────────────────────────
  const counts = useMemo(() => ({
    SUPPLIERS: suppliers.filter(s => s.status === 'PENDING').length,
    BOOKINGS:  bookings.filter(b => b.status === 'PENDING').length,
    CLIENTS:   0,
    LEADS:     0,
  }), [suppliers, bookings]);

  // ── Action handlers ────────────────────────────────────────────────
  const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/suppliers/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setSuppliers(prev => prev.map(s => s.id === id ? { ...s, status } : s));
      }
    } catch (error) {
      console.error('Failed to update status', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBookingStatusUpdate = async (id: string, status: 'PENDING' | 'CONFIRMED' | 'CANCELLED') => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
        if (selectedBooking?.id === id) {
          setSelectedBooking(prev => prev ? { ...prev, status } : null);
        }
      }
    } catch (error) {
      console.error('Failed to update booking status', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedBooking) return;
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/bookings/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: bookingNotes })
      });
      const data = await res.json();
      if (data.success) {
        setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, notes: bookingNotes } : b));
        setSelectedBooking(prev => prev ? { ...prev, notes: bookingNotes } : null);
      }
    } catch (error) {
      console.error('Failed to save notes', error);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/calendar/sync-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      }
    } catch (error) {
      console.error('Failed to sync all calendars', error);
      alert('Failed to sync calendars');
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Bulk actions ───────────────────────────────────────────────────
  const supplierBulk: BulkAction<Supplier>[] = useMemo(() => [
    {
      key: 'approve',
      label: { EN: 'Approve selected', ES: 'Aprobar seleccionados', PT: 'Aprovar selecionados' },
      variant: 'gold',
      icon: <Check size={12} />,
      onAction: async (rows) => {
        for (const s of rows) {
          await fetch(`/api/suppliers/${s.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'APPROVED' }),
          });
        }
        await fetchSuppliers();
      },
    },
    {
      key: 'reject',
      label: { EN: 'Reject selected', ES: 'Rechazar seleccionados', PT: 'Rejeitar selecionados' },
      variant: 'danger',
      icon: <X size={12} />,
      onAction: async (rows) => {
        for (const s of rows) {
          await fetch(`/api/suppliers/${s.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'REJECTED' }),
          });
        }
        await fetchSuppliers();
      },
    },
  ], [fetchSuppliers]);

  const bookingBulk: BulkAction<Booking>[] = useMemo(() => [
    {
      key: 'confirm',
      label: { EN: 'Confirm selected', ES: 'Confirmar seleccionados', PT: 'Confirmar selecionados' },
      variant: 'success',
      icon: <Check size={12} />,
      onAction: async (rows) => {
        for (const b of rows) {
          await fetch(`/api/bookings/${b.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'CONFIRMED' }),
          });
        }
        await fetchBookings();
      },
    },
    {
      key: 'cancel',
      label: { EN: 'Cancel selected', ES: 'Cancelar seleccionados', PT: 'Cancelar selecionados' },
      variant: 'danger',
      icon: <X size={12} />,
      onAction: async (rows) => {
        for (const b of rows) {
          await fetch(`/api/bookings/${b.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'CANCELLED' }),
          });
        }
        await fetchBookings();
      },
    },
  ], [fetchBookings]);

  // ── Column configs ─────────────────────────────────────────────────
  const supplierColumns: Column<Supplier>[] = useMemo(() => [
    {
      key: 'business_name',
      label: { EN: 'Partner', ES: 'Socio', PT: 'Parceiro' },
      sortValue: (s) => s.business_name,
      width: 'w-auto',
      render: (s) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[#B8963E]/15 flex items-center justify-center text-[#B8963E] font-serif text-lg shrink-0">
            {s.business_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate flex items-center gap-2">
              {s.business_name}
              {s.google_calendar_id && <Calendar size={12} className="text-blue-400 shrink-0" />}
            </div>
            <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] truncate">{s.contact_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: { EN: 'Contact', ES: 'Contacto', PT: 'Contato' },
      sortable: false,
      hideOnMobile: true,
      render: (s) => (
        <div className="space-y-0.5 min-w-0">
          {s.email && (
            <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 text-xs text-white/70 hover:text-[#B8963E] transition-colors">
              <Mail size={11} className="text-white/40 shrink-0" /> <span className="truncate">{s.email}</span>
            </a>
          )}
          {s.whatsapp && (
            <a href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
              <MessageSquare size={11} className="shrink-0" /> <span className="truncate">{s.whatsapp}</span>
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'asset_type',
      label: { EN: 'Type', ES: 'Tipo', PT: 'Tipo' },
      sortValue: (s) => s.asset_type,
      width: 'w-32',
      render: (s) => (
        <span className="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em]">
          {ASSET_TYPE_LABEL[s.asset_type]?.[lang] || s.asset_type}
        </span>
      ),
    },
    {
      key: 'location',
      label: { EN: 'Location', ES: 'Ubicación', PT: 'Localização' },
      sortValue: (s) => s.location,
      hideOnMobile: true,
      render: (s) => (
        <div className="flex items-center gap-1.5 text-xs text-white/60">
          <MapPin size={12} className="text-white/30 shrink-0" />
          <span className="truncate max-w-[160px]">{s.location}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: { EN: 'Status', ES: 'Estado', PT: 'Estado' },
      sortValue: (s) => s.status,
      width: 'w-32',
      render: (s) => <StatusPill status={s.status} lang={lang} />,
    },
    {
      key: 'created_at',
      label: { EN: 'Submitted', ES: 'Enviado', PT: 'Enviado' },
      sortValue: (s) => new Date(s.created_at),
      hideOnMobile: true,
      align: 'right',
      width: 'w-32',
      render: (s) => (
        <div className="flex items-center justify-end gap-1.5 text-[10px] text-white/40">
          <Clock size={11} />
          {new Date(s.created_at).toLocaleDateString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US')}
        </div>
      ),
    },
  ], [lang]);

  const bookingColumns: Column<Booking>[] = useMemo(() => [
    {
      key: 'guest_name',
      label: { EN: 'Guest', ES: 'Huésped', PT: 'Hóspede' },
      sortValue: (b) => b.guest_name,
      render: (b) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[#B8963E]/10 border border-[#B8963E]/20 flex items-center justify-center text-[#B8963E] shrink-0">
            <User size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{b.guest_name}</div>
            <div className="text-[10px] text-white/40 truncate">{b.guest_email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'asset_name',
      label: { EN: 'Asset', ES: 'Activo', PT: 'Ativo' },
      sortValue: (b) => b.asset_name,
      render: (b) => (
        <div>
          <div className="text-sm text-white truncate">{b.asset_name}</div>
          <div className="text-[9px] text-white/40 uppercase tracking-[0.3em]">{b.asset_type}</div>
        </div>
      ),
    },
    {
      key: 'start_date',
      label: { EN: 'Dates', ES: 'Fechas', PT: 'Datas' },
      sortValue: (b) => new Date(b.start_date),
      hideOnMobile: true,
      render: (b) => (
        <div className="text-xs text-white/60">
          {new Date(b.start_date).toLocaleDateString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US')}
        </div>
      ),
    },
    {
      key: 'total_price',
      label: { EN: 'Total', ES: 'Total', PT: 'Total' },
      sortValue: (b) => parseFloat((b.total_price || '0').replace(/[^0-9.]/g, '')) || 0,
      align: 'right',
      width: 'w-32',
      render: (b) => (
        <span className="text-sm font-bold text-[#B8963E] font-serif italic">{b.total_price}</span>
      ),
    },
    {
      key: 'status',
      label: { EN: 'Status', ES: 'Estado', PT: 'Estado' },
      sortValue: (b) => b.status,
      width: 'w-32',
      render: (b) => <StatusPill status={b.status} lang={lang} />,
    },
  ], [lang]);

  // ── Sidebar / sign-out ─────────────────────────────────────────────
  const handleSignOutClick = onSignOut;

  // ── Render: sidebar + content ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a1518] text-white flex">
      <AdminSidebar
        activeSection={activeView}
        onSelect={setActiveView}
        lang={lang}
        signedInEmail={signedInEmail ?? null}
        onSignOut={handleSignOutClick}
        counts={counts}
        pendingSuppliersCount={counts.SUPPLIERS}
      />

      <main className="flex-1 min-w-0 px-6 md:px-10 py-10 space-y-8 max-w-[1600px]">
        {/* Page header */}
        <PageHeader
          activeView={activeView}
          lang={lang}
          onSync={activeView === 'BOOKINGS' ? handleSyncAll : undefined}
          isSyncing={isSyncing}
        />

        {/* Active view */}
        {activeView === 'SUPPLIERS' && (
          <DataTable<Supplier>
            rows={suppliers}
            loading={suppliersLoading}
            columns={supplierColumns}
            rowKey={(s) => s.id}
            bulkActions={supplierBulk}
            filters={{ field: 'status', options: SUPPLIER_STATUS_FILTERS }}
            searchFields={['business_name', 'contact_name', 'email', 'location', 'asset_type']}
            searchPlaceholder={{ EN: 'Search partners by name, contact, email, location...', ES: 'Buscar socios por nombre, contacto, email, ubicación...', PT: 'Buscar parceiros por nome, contato, email, localização...' }}
            defaultSort={{ key: 'created_at', order: 'desc' }}
            pageSize={25}
            lang={lang}
            urlStateKey="suppliers"
            emptyTitle={{ EN: 'No partners yet', ES: 'Aún no hay socios', PT: 'Ainda não há parceiros' }}
            emptyHint={{ EN: 'Partner applications submitted via /supplier/apply will appear here.', ES: 'Las solicitudes enviadas por /supplier/apply aparecerán aquí.', PT: 'Os pedidos enviados por /supplier/apply aparecerão aqui.' }}
            onRowClick={(s) => { window.location.href = `/admin/suppliers/${s.id}`; }}
            rowActions={(s) => (
              <div className="flex items-center justify-end gap-1">
                {s.status === 'PENDING' ? (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(s.id, 'APPROVED')}
                      disabled={actionLoading === s.id}
                      className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title={txAdmin('approve', lang)}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(s.id, 'REJECTED')}
                      disabled={actionLoading === s.id}
                      className="p-2 text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title={txAdmin('reject', lang)}
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onViewAssets(s.id)}
                    className="p-2 text-white/40 hover:text-[#B8963E] hover:bg-white/5 rounded-lg transition-colors"
                    title={txAdmin('view_assets', lang)}
                  >
                    <Package size={14} />
                  </button>
                )}
              </div>
            )}
          />
        )}

        {activeView === 'BOOKINGS' && (
          <DataTable<Booking>
            rows={bookings}
            loading={bookingsLoading}
            columns={bookingColumns}
            rowKey={(b) => b.id}
            bulkActions={bookingBulk}
            filters={{ field: 'status', options: BOOKING_STATUS_FILTERS }}
            searchFields={['guest_name', 'guest_email', 'asset_name']}
            searchPlaceholder={{ EN: 'Search by guest, asset, email...', ES: 'Buscar por huésped, activo, email...', PT: 'Buscar por hóspede, ativo, email...' }}
            defaultSort={{ key: 'start_date', order: 'desc' }}
            pageSize={25}
            lang={lang}
            urlStateKey="bookings"
            emptyTitle={{ EN: 'No bookings yet', ES: 'Sin reservas aún', PT: 'Sem reservas ainda' }}
            emptyHint={{ EN: 'Reservations created from /admin Reservas or via the partner dashboard will appear here.', ES: 'Las reservas creadas desde /admin Reservas o desde el panel de socios aparecerán aquí.', PT: 'As reservas criadas em /admin Reservas ou no painel do parceiro aparecerão aqui.' }}
            onRowClick={(b) => { window.location.href = `/admin/bookings/${b.id}`; }}
            rowActions={(b) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => { setSelectedBooking(b); setBookingNotes(b.notes || ''); }}
                  className="p-2 text-white/40 hover:text-[#B8963E] hover:bg-white/5 rounded-lg transition-colors"
                  title={txAdmin('view', lang)}
                >
                  <FileText size={14} />
                </button>
              </div>
            )}
          />
        )}

        {activeView === 'CLIENTS' && <ClientManagement lang={lang} />}
        {activeView === 'LEADS' && <LeadsManagement lang={lang} />}
      </main>

      {/* Booking detail modal */}
      <AnimatePresence>
        {selectedBooking && renderBookingModal()}
      </AnimatePresence>
    </div>
  );

  // ── Booking detail modal (unchanged behavior) ────────────────────
  function renderBookingModal() {
    if (!selectedBooking) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedBooking(null)}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-[#0a1518] border border-[#B8963E]/30 rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="p-8 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#B8963E]/15 text-[#B8963E] rounded-xl flex items-center justify-center">
                <ClipboardList size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-serif italic text-white uppercase tracking-widest">{txAdmin('booking_details', lang)}</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-bold">ID: {selectedBooking.id}</p>
              </div>
            </div>
            <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors" title={txAdmin('close', lang)}>
              <X size={24} className="text-white/60" />
            </button>
          </div>

          <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-[0.4em] text-[#B8963E] font-bold">{txAdmin('asset_info', lang)}</h4>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-center gap-3">
                      <Package size={16} className="text-[#B8963E]" />
                      <span className="text-sm text-white">{selectedBooking.asset_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-0.5 bg-[#B8963E]/15 text-[#B8963E] rounded text-[9px] uppercase font-bold tracking-[0.2em]">
                        {selectedBooking.asset_type}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-[0.4em] text-[#B8963E] font-bold">{txAdmin('guest_details', lang)}</h4>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-center gap-3">
                      <User size={16} className="text-[#B8963E]" />
                      <span className="text-sm text-white">{selectedBooking.guest_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-[#B8963E]" />
                      <span className="text-sm text-white">{selectedBooking.guest_email}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-[0.4em] text-[#B8963E] font-bold">{txAdmin('journey_dates', lang)}</h4>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-[#B8963E]" />
                      <span className="text-xs text-white/60">
                        {new Date(selectedBooking.start_date).toLocaleDateString()} — {new Date(selectedBooking.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-[#B8963E]" />
                      <span className="text-xs text-white/60">
                        {Math.max(1, Math.ceil((new Date(selectedBooking.end_date).getTime() - new Date(selectedBooking.start_date).getTime()) / (1000 * 60 * 60 * 24)))} {txAdmin('days', lang)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-[0.4em] text-[#B8963E] font-bold">{txAdmin('financials', lang)}</h4>
                  <div className="p-4 bg-[#B8963E]/10 border border-[#B8963E]/30 rounded-xl">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#B8963E] font-bold mb-1">{txAdmin('total_price', lang)}</p>
                    <p className="text-2xl font-serif italic text-[#B8963E]">{selectedBooking.total_price}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] uppercase tracking-[0.4em] text-[#B8963E] font-bold">{txAdmin('management_notes', lang)}</h4>
              <textarea
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder={txAdmin('notes_placeholder', lang)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 min-h-[100px] resize-y"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="px-6 py-2 bg-[#B8963E] text-white rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-[#B8963E]/90 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingNotes ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  {txAdmin('save_notes', lang)}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              {selectedBooking.status === 'PENDING' && (
                <button
                  onClick={() => handleBookingStatusUpdate(selectedBooking.id, 'CONFIRMED')}
                  className="flex-1 py-3 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold uppercase tracking-[0.3em] text-[10px] hover:bg-emerald-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={14} /> {txAdmin('confirm', lang)}
                </button>
              )}
              {selectedBooking.status !== 'CANCELLED' && (
                <button
                  onClick={() => handleBookingStatusUpdate(selectedBooking.id, 'CANCELLED')}
                  className="flex-1 py-3 bg-red-500/10 text-red-300 border border-red-500/30 rounded-xl font-bold uppercase tracking-[0.3em] text-[10px] hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <X size={14} /> {txAdmin('cancel', lang)}
                </button>
              )}
              <button
                onClick={() => handleBookingStatusUpdate(selectedBooking.id, 'PENDING')}
                className="flex-1 py-3 bg-white/5 text-white/70 border border-white/10 rounded-xl font-bold uppercase tracking-[0.3em] text-[10px] hover:bg-white/10 transition-all"
              >
                {txAdmin('pending', lang)}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }
};

// ── Page header (replaces the 4 giant serif headings) ──────────────────
const PageHeader: React.FC<{
  activeView: AdminSection;
  lang: Language;
  onSync?: () => void;
  isSyncing?: boolean;
}> = ({ activeView, lang, onSync, isSyncing }) => {
  const titles: Record<AdminSection, { eyebrow: string; title: string }> = {
    SUPPLIERS: {
      eyebrow: lang === 'ES' ? 'Gestión de Red' : lang === 'PT' ? 'Gestão de Rede' : 'Network Management',
      title:   lang === 'ES' ? 'Socios'     : lang === 'PT' ? 'Parceiros' : 'Suppliers',
    },
    BOOKINGS: {
      eyebrow: lang === 'ES' ? 'Orquestación de Viajes' : lang === 'PT' ? 'Orquestração de Viagens' : 'Journey Orchestration',
      title:   lang === 'ES' ? 'Reservas'    : lang === 'PT' ? 'Reservas'     : 'Bookings',
    },
    CLIENTS: {
      eyebrow: lang === 'ES' ? 'Relaciones Huéspedes UHNWI' : lang === 'PT' ? 'Relações Hóspedes UHNWI' : 'UHNWI Guest Relations',
      title:   lang === 'ES' ? 'Clientes'    : lang === 'PT' ? 'Clientes'     : 'Clients',
    },
    LEADS: {
      eyebrow: lang === 'ES' ? 'Consultas Entrantes' : lang === 'PT' ? 'Consultas Entrantes' : 'Inbound Inquiries',
      title:   'Leads',
    },
    BUNDLES: {
      eyebrow: lang === 'ES' ? 'Paquetes Multi-socio' : lang === 'PT' ? 'Pacotes Multi-parceiro' : 'Multi-supplier Packages',
      title:   lang === 'ES' ? 'Paquetes' : lang === 'PT' ? 'Pacotes' : 'Bundles',
    },
    STATS: {
      eyebrow: lang === 'ES' ? 'KPIs y Actividad' : lang === 'PT' ? 'KPIs e Atividade' : 'KPIs & Activity',
      title:   lang === 'ES' ? 'Panel' : lang === 'PT' ? 'Painel' : 'Dashboard',
    },
    SETTINGS: {
      eyebrow: lang === 'ES' ? 'Roles, Integraciones' : lang === 'PT' ? 'Funções, Integrações' : 'Roles, Integrations',
      title:   lang === 'ES' ? 'Ajustes' : lang === 'PT' ? 'Configurações' : 'Settings',
    },
  };
  const t = titles[activeView];
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
      <div>
        <p className="text-[10px] text-[#B8963E] uppercase tracking-[0.4em] font-bold mb-2">{t.eyebrow}</p>
        <h1 className="text-3xl md:text-4xl font-serif italic text-white">{t.title}</h1>
      </div>
      {onSync && (
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-white/80 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
        >
          {isSyncing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
          {lang === 'ES' ? 'Sincronizar Calendarios' : lang === 'PT' ? 'Sincronizar Calendários' : 'Sync All Calendars'}
        </button>
      )}
    </div>
  );
};
