import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package, Users, DollarSign, Clock, Calendar,
  Plane, Ship, Home, Car, UserCheck,
  Plus, Search, Edit2, Trash2, Eye, EyeOff,
  X, Check, Loader2, TrendingUp, MessageSquare,
  ChevronRight, BarChart3, Settings, AlertCircle,
  ExternalLink, RefreshCw, Send, Layers
} from 'lucide-react';
import { AssetType } from '../types';
import { KLOUser } from '../services/firebase';

// Local Language alias — see SupplierPortal.tsx for rationale
type Language = 'EN' | 'ES' | 'PT';
import { MiniCalendar } from './MiniCalendar';
import { PartnerBundles } from './PartnerBundles';
import { DataTable, StatusPill, type Column, type FilterOption } from './ui/DataTable';

interface Asset {
  id: string;
  supplier_id: string;
  name: string;
  type: string;
  location: string;
  description: string;
  price_per_unit: string;
  price_type: string;
  capacity: number;
  amenities: string[];
  images: string[];
  status: string;
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
  status: string;
  notes: string;
  created_at: string;
}

interface SupplierDashboardProps {
  user: KLOUser;
  lang: Language;
  onBack: () => void;
  initialTab?: 'dashboard' | 'assets' | 'bookings' | 'settings' | 'bundles';
}

const ASSET_TYPE_ICONS: Record<string, React.ElementType> = {
  STAFF: Users,
  AIRCRAFT: Plane,
  VESSEL: Ship,
  VEHICLE: Car,
  LODGING: Home,
};

const ASSET_TYPE_LABELS: Record<string, Record<Language, string>> = {
  STAFF:    { EN: 'Staff', ES: 'Personal', PT: 'Equipe' },
  AIRCRAFT: { EN: 'Aircraft', ES: 'Aeronave', PT: 'Aeronave' },
  VESSEL:   { EN: 'Vessel', ES: 'Embarcación', PT: 'Embarcação' },
  VEHICLE:  { EN: 'Vehicle', ES: 'Vehículo', PT: 'Veículo' },
  LODGING:  { EN: 'Lodging', ES: 'Alojamiento', PT: 'Hospedagem' },
};

const BOOKING_STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-white/10 text-white/70 border-white/20',
  CONFIRMED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
};

export const SupplierDashboard: React.FC<SupplierDashboardProps> = ({ user, lang, onBack, initialTab }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets' | 'bookings' | 'settings' | 'bundles'>(initialTab ?? 'dashboard');
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierData, setSupplierData] = useState<any>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingAsset, setEditingAsset] = useState<Partial<Asset> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // v1.8.0 Step 22.34: Sticky "Save & add another" mode for bulk asset onboarding.
  // When the partner hits the sticky button we keep the modal open and reset the
  // form to a fresh default so they can keep adding without re-clicking the
  // top-right "+ Agregar" every time. `addedInSession` is the in-modal counter
  // that shows progress ("3 added so far").
  const [addedInSession, setAddedInSession] = useState(0);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramSaved, setTelegramSaved] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Load supplier + assets
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        // Try to find supplier by Firebase UID or email
        const res = await fetch(`/api/suppliers/lookup?uid=${user.uid}&email=${encodeURIComponent(user.email)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `HTTP ${res.status}`);
        }

        if (data.supplier) {
          setSupplierId(data.supplier.id);
          setSupplierData(data.supplier);
          setTelegramChatId(data.supplier.telegram_chat_id || '');

          // Load assets for this supplier
          const assetsRes = await fetch(`/api/suppliers/${data.supplier.id}/assets`);
          const assetsData = await assetsRes.json().catch(() => []);
          if (!assetsRes.ok) {
            throw new Error(assetsData?.error || `HTTP ${assetsRes.status}`);
          }
          setAssets(Array.isArray(assetsData) ? assetsData : []);
        } else {
          // No supplier record yet
          setSupplierId(null);
        }
      } catch (err: any) {
        console.error('Failed to load supplier data', err);
        setLoadError(err?.message || 'Could not load your dashboard');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user.uid, user.email, reloadKey]);

  // Load bookings for this supplier's assets
  useEffect(() => {
    if (!supplierId || activeTab !== 'bookings') return;

    const fetchBookings = async () => {
      setLoadingBookings(true);
      try {
        const res = await fetch(`/api/bookings?supplier_id=${supplierId}`);
        const data = await res.json();
        setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load bookings', err);
      } finally {
        setLoadingBookings(false);
      }
    };
    fetchBookings();
  }, [supplierId, activeTab]);

  // Stats
  const stats = {
    totalAssets: assets.length,
    activeAssets: assets.filter(a => a.status === 'ACTIVE').length,
    pendingBookings: bookings.filter(b => b.status === 'PENDING').length,
    confirmedBookings: bookings.filter(b => b.status === 'CONFIRMED').length,
    totalEarnings: bookings
      .filter(b => b.status === 'CONFIRMED')
      .reduce((sum, b) => {
        const num = parseFloat((b.total_price || '0').replace(/[^0-9.]/g, ''));
        return sum + (isNaN(num) ? 0 : num);
      }, 0),
  };

  // Derive a sensible default type from the supplier's pillar
  // (was hard-coded to LODGING — broadened to cover all 5 pillars).
  const buildDefaultAsset = (): Partial<Asset> => {
    const SUPPLIER_TYPE_TO_ASSET: Record<string, string> = {
      VILLA:    'LODGING',
      YACHT:    'VESSEL',
      AVIATION: 'AIRCRAFT',
      GROUND:   'VEHICLE',
      STAFF:    'STAFF',
    };
    const defaultType =
      SUPPLIER_TYPE_TO_ASSET[supplierData?.asset_type as string] ?? 'LODGING';
    const defaultPriceType =
      defaultType === 'LODGING' ? 'PER_NIGHT'
      : defaultType === 'AIRCRAFT' ? 'PER_HOUR'
      : 'PER_DAY';

    return {
      name: '', type: defaultType, location: supplierData?.location || 'Cartagena',
      description: '', price_per_unit: '', price_type: defaultPriceType, capacity: 1,
      amenities: [], images: [], status: 'ACTIVE',
    };
  };

  const openEditModal = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setAddedInSession(0);
    } else {
      setEditingAsset(buildDefaultAsset());
      setAddedInSession(0);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAsset(null);
    setAddedInSession(0);
  };

  // v1.8.0 Step 22.34: `mode` controls the post-save behavior.
  //   'close'  -> save and dismiss modal (default; used by Save and Save & close)
  //   'sticky' -> save and reset the form to a fresh default, keep modal open
  //               so the partner can keep adding (e.g. Partner B's 100 vehicles).
  const handleSaveAsset = async (mode: 'close' | 'sticky' = 'close') => {
    if (!editingAsset || !supplierId) return;
    // Basic validation — name is the only hard requirement.
    if (!editingAsset.name || !editingAsset.name.trim()) {
      alert(lang === 'ES' ? 'El nombre es obligatorio' : lang === 'PT' ? 'O nome é obrigatório' : 'Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        supplier_id: supplierId,
        name: editingAsset.name,
        type: editingAsset.type,
        location: editingAsset.location,
        description: editingAsset.description,
        price_per_unit: editingAsset.price_per_unit,
        price_type: editingAsset.price_type,
        capacity: editingAsset.capacity,
        amenities: editingAsset.amenities,
        images: editingAsset.images,
        status: editingAsset.status,
      };

      if (editingAsset.id) {
        // Update existing
        const res = await fetch(`/api/assets/${editingAsset.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setAssets(prev => prev.map(a => a.id === editingAsset!.id ? { ...a, ...payload } as Asset : a));
        }
        // Edit mode always closes (no sticky here — you only edit one at a time).
        closeModal();
        return;
      } else {
        // Create new
        const res = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setAssets(prev => [{ ...payload, id: data.asset_id, created_at: new Date().toISOString() } as Asset, ...prev]);
          if (mode === 'sticky') {
            // Reset form, keep modal open, bump the counter.
            // Pre-fill the next name with the previous one + " (#N)" as a
            // sensible starting point for bulk entry (e.g. "Van Mercedes (2)").
            const previousName = (editingAsset.name || '').trim();
            const baseName = previousName.replace(/\s*\(\d+\)\s*$/, ''); // strip trailing " (N)"
            const next = addedInSession + 2; // 2 because this one was #1
            const suggested = baseName ? `${baseName} (${next})` : '';
            setEditingAsset({
              ...buildDefaultAsset(),
              // Carry over the asset type, price, location, and capacity so the
              // partner only has to type the name + (optional) tweak.
              type: editingAsset.type,
              location: editingAsset.location,
              price_per_unit: editingAsset.price_per_unit,
              price_type: editingAsset.price_type,
              capacity: editingAsset.capacity,
              name: suggested,
            });
            setAddedInSession(n => n + 1);
            // Focus the name input on next paint so the partner can keep typing.
            setTimeout(() => {
              const el = document.querySelector<HTMLInputElement>('input[data-asset-name-input]');
              el?.focus();
              el?.select();
            }, 30);
          } else {
            closeModal();
          }
        }
      }
    } catch (err) {
      console.error('Failed to save asset', err);
      alert(lang === 'ES' ? 'No se pudo guardar el activo' : lang === 'PT' ? 'Não foi possível salvar o ativo' : 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Delete this asset? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
      if (res.ok) {
        setAssets(prev => prev.filter(a => a.id !== assetId));
      }
    } catch (err) {
      console.error('Failed to delete asset', err);
    }
  };

  const handleSyncCalendar = async (assetId: string) => {
    setSyncingCalendar(assetId);
    try {
      const res = await fetch(`/api/calendar/sync/${assetId}`);
      const data = await res.json();
      if (data.success || data.synced !== undefined) {
        alert(`${data.synced || 0} dates synced from Google Calendar.`);
      }
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setSyncingCalendar(null);
    }
  };

  const handleSaveTelegram = async () => {
    if (!supplierId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/telegram`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_chat_id: telegramChatId }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramSaved(true);
        setTimeout(() => setTelegramSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save Telegram', err);
    } finally {
      setSaving(false);
    }
  };

  const filteredAssets = assets.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.location.toLowerCase().includes(search.toLowerCase())
  );

  const filteredBookings = bookings.filter(b =>
    b.guest_name.toLowerCase().includes(search.toLowerCase()) ||
    b.asset_name.toLowerCase().includes(search.toLowerCase())
  );

  // v1.8.0 Step 7: DataTable column configs for assets + bookings tabs.
  const ASSET_FILTERS: FilterOption[] = [
    { value: 'ALL',    label: { EN: 'All',    ES: 'Todos',  PT: 'Todos' } },
    { value: 'ACTIVE', label: { EN: 'Active', ES: 'Activos', PT: 'Ativos' } },
    { value: 'PENDING', label: { EN: 'Pending', ES: 'Pendientes', PT: 'Pendentes' } },
  ];
  const BOOKING_FILTERS: FilterOption[] = [
    { value: 'ALL',       label: { EN: 'All',        ES: 'Todos',        PT: 'Todos' } },
    { value: 'PENDING',   label: { EN: 'Pending',    ES: 'Pendientes',   PT: 'Pendentes' } },
    { value: 'CONFIRMED', label: { EN: 'Confirmed',  ES: 'Confirmadas',  PT: 'Confirmadas' } },
    { value: 'CANCELLED', label: { EN: 'Cancelled',  ES: 'Canceladas',   PT: 'Canceladas' } },
  ];

  const assetColumns: Column<Asset>[] = [
    {
      key: 'name',
      label: { EN: 'Asset', ES: 'Activo', PT: 'Ativo' },
      sortValue: (a) => a.name,
      render: (a) => {
        const Icon = ASSET_TYPE_ICONS[a.type] || Package;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#B8963E]/15 flex items-center justify-center text-[#B8963E] shrink-0">
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{a.name}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] truncate">
                {ASSET_TYPE_LABELS[a.type]?.[lang] || a.type} · {a.capacity} PAX
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'location',
      label: { EN: 'Location', ES: 'Ubicación', PT: 'Localização' },
      sortValue: (a) => a.location,
      hideOnMobile: true,
      render: (a) => <span className="text-xs text-white/60">{a.location}</span>,
    },
    {
      key: 'price_per_unit',
      label: { EN: 'Price', ES: 'Precio', PT: 'Preço' },
      sortValue: (a) => parseFloat((a.price_per_unit || '0').replace(/[^0-9.]/g, '')) || 0,
      align: 'right',
      width: 'w-32',
      render: (a) => <span className="text-sm font-bold text-[#B8963E] font-serif italic">{a.price_per_unit}</span>,
    },
    {
      key: 'status',
      label: { EN: 'Status', ES: 'Estado', PT: 'Estado' },
      sortValue: (a) => a.status,
      width: 'w-32',
      render: (a) => <StatusPill status={a.status} lang={lang} />,
    },
  ];

  const bookingColumns: Column<Booking>[] = [
    {
      key: 'guest_name',
      label: { EN: 'Guest', ES: 'Huésped', PT: 'Hóspede' },
      sortValue: (b) => b.guest_name,
      render: (b) => (
        <div>
          <div className="text-sm font-medium text-white">{b.guest_name}</div>
          <div className="text-[10px] text-white/40 truncate">{b.guest_email}</div>
        </div>
      ),
    },
    {
      key: 'asset_name',
      label: { EN: 'Asset', ES: 'Activo', PT: 'Ativo' },
      sortValue: (b) => b.asset_name,
      hideOnMobile: true,
      render: (b) => <span className="text-sm text-white">{b.asset_name || '—'}</span>,
    },
    {
      key: 'start_date',
      label: { EN: 'Dates', ES: 'Fechas', PT: 'Datas' },
      sortValue: (b) => new Date(b.start_date),
      hideOnMobile: true,
      render: (b) => <span className="text-xs text-white/60">{new Date(b.start_date).toLocaleDateString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US')}</span>,
    },
    {
      key: 'total_price',
      label: { EN: 'Total', ES: 'Total', PT: 'Total' },
      sortValue: (b) => parseFloat((b.total_price || '0').replace(/[^0-9.]/g, '')) || 0,
      align: 'right',
      width: 'w-32',
      render: (b) => <span className="text-sm font-bold text-[#B8963E] font-serif italic">{b.total_price}</span>,
    },
    {
      key: 'status',
      label: { EN: 'Status', ES: 'Estado', PT: 'Estado' },
      sortValue: (b) => b.status,
      width: 'w-32',
      render: (b) => <StatusPill status={b.status} lang={lang} />,
    },
  ];

  const TABS = [
    { id: 'dashboard', label: { EN: 'Overview', ES: 'Resumen', PT: 'Visão' }, icon: BarChart3 },
    { id: 'assets',    label: { EN: 'Assets', ES: 'Activos', PT: 'Ativos' }, icon: Package },
    { id: 'bundles',   label: { EN: 'Bundles', ES: 'Paquetes', PT: 'Pacotes' }, icon: Layers },
    { id: 'bookings',  label: { EN: 'Bookings', ES: 'Reservas', PT: 'Reservas' }, icon: Calendar },
    { id: 'settings',  label: { EN: 'Settings', ES: 'Ajustes', PT: 'Config' }, icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white/5 text-white">
        {/* v1.5: skeleton shell that mirrors the real layout, so the page
            doesn't flash blank while /api/suppliers/lookup and
            /api/suppliers/:id/assets are in flight. Three pulse layers:
            header bar, 4 stat cards, two content rows. */}
        <div className="bg-luxury-slate border-b border-white/10 ">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-5 h-5 rounded bg-white/5 animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-48 rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-32 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-9 w-20 rounded-full bg-white/5 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* 4 stat-card skeletons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-luxury-slate border border-white/10  rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
                  <div className="w-4 h-4 rounded bg-white/5 animate-pulse" />
                </div>
                <div className="h-8 w-16 rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
          {/* Two content rows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-luxury-slate border border-white/10  rounded-2xl h-64 animate-pulse" />
            <div className="bg-luxury-slate border border-white/10  rounded-2xl h-64 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!supplierId) {
    return (
      <div className="min-h-screen bg-white/5 text-white flex items-center justify-center p-8">
        <div className="max-w-lg text-center space-y-6">
          <div className="w-16 h-16 bg-[#B8963E]/10 rounded-full flex items-center justify-center mx-auto text-[#B8963E]">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-3xl font-serif italic text-white">No Partner Profile Found</h2>
          <p className="text-white/60 font-light leading-relaxed">
            {lang === 'EN'
              ? "You don't have a partner profile yet. Complete the supplier application first to access your dashboard."
              : lang === 'ES'
              ? "Aún no tienes un perfil de socio. Completa la solicitud de proveedor primero para acceder a tu panel."
              : "Você ainda não tem um perfil de parceiro. Complete o cadastro de fornecedor primeiro."}
          </p>
          <button onClick={onBack}
            className="px-8 py-3 bg-[#B8963E] text-white rounded-full font-semibold text-[10px] uppercase tracking-[0.3em] hover:bg-white/10 transition-all">
            {lang === 'EN' ? 'Go Back' : lang === 'ES' ? 'Volver' : 'Voltar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white/5 text-white">
      {/* Header */}
      <div className="bg-luxury-slate border-b border-white/10 ">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="text-white/60 hover:text-white transition-colors">
                <ChevronRight size={20} className="rotate-180" />
              </button>
              <div>
                {/* v1.5: small trilingual greeting above the business name.
                    Keeps the existing title hierarchy but adds the human
                    touch the handoff asked for ("Welcome back, {name}"). */}
                <p className="text-[10px] text-[#B8963E] uppercase tracking-[0.3em] font-semibold mb-1">
                  {lang === 'EN' ? `Welcome back, ${user.name?.split(' ')[0] || 'Partner'}` : lang === 'ES' ? `Bienvenido de nuevo, ${user.name?.split(' ')[0] || 'Socio'}` : `Bem-vindo de volta, ${user.name?.split(' ')[0] || 'Parceiro'}`}
                </p>
                <h1 className="text-2xl font-serif italic text-white">
                  {supplierData?.business_name || user.name}
                </h1>
                <p className="text-[10px] text-white/60 uppercase tracking-[0.3em] font-semibold">
                  {supplierData?.asset_type} Partner · {supplierData?.location}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[8px] px-3 py-1 rounded-full border uppercase tracking-widest font-bold ${
                supplierData?.status === 'APPROVED'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-white/5 text-white/60 border-white/10'
              }`}>
                {supplierData?.status}
              </span>
              <div className="w-10 h-10 bg-[#B8963E]/10 rounded-full flex items-center justify-center text-[#B8963E] font-serif text-lg">
                {user.name?.charAt(0)}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-full text-[11px] font-semibold uppercase tracking-widest transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#B8963E] text-white'
                      : 'text-white/60 hover:text-white/70 hover:bg-white/5'
                  }`}>
                  <Icon size={14} />
                  {tab.label[lang]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <AlertCircle size={18} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700 truncate">
                {lang === 'EN'
                  ? `We couldn’t load your dashboard. (${loadError})`
                  : lang === 'ES'
                  ? `No pudimos cargar tu panel. (${loadError})`
                  : `Não foi possível carregar seu painel. (${loadError})`}
              </p>
            </div>
            <button
              onClick={() => setReloadKey(k => k + 1)}
              className="px-5 py-2 border border-red-200 text-red-700 hover:bg-red-50 text-[10px] uppercase tracking-widest font-semibold rounded hover:bg-red-100 transition-all shrink-0"
            >
              {lang === 'EN' ? 'Retry' : lang === 'ES' ? 'Reintentar' : 'Tentar novamente'}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ── DASHBOARD (RESUMEN) TAB ── */}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Hero / Identity Card — 2-col: identity on left, contact summary on right */}
              <div className="bg-luxury-slate border border-white/5 rounded-2xl p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  {/* Left: business identity */}
                  <div>
                    <p className="text-xs text-[#B8963E] uppercase tracking-[0.3em] font-semibold mb-3">
                      {lang === 'EN' ? 'Welcome back' : lang === 'ES' ? 'Bienvenido de nuevo' : 'Bem-vindo de volta'}
                      <span className="text-white/40 ml-2">·</span>
                      <span className="text-white/60 ml-2 normal-case tracking-normal font-light">
                        {user.name?.split(' ')[0] || (lang === 'EN' ? 'Partner' : lang === 'ES' ? 'Socio' : 'Parceiro')}
                      </span>
                    </p>
                    <h1 className="text-4xl md:text-5xl font-serif italic text-white leading-tight mb-3">
                      {supplierData?.business_name || user.name}
                    </h1>
                    <p className="text-xs text-white/60 uppercase tracking-[0.3em] font-semibold">
                      {supplierData?.asset_type} Partner · {supplierData?.location}
                    </p>
                  </div>

                  {/* Right: contact + status summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/5 rounded-xl p-5">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/60 font-semibold mb-2">
                        {lang === 'EN' ? 'Status' : lang === 'ES' ? 'Estado' : 'Status'}
                      </p>
                      <span className={`inline-block text-[11px] px-3 py-1 rounded-full border uppercase tracking-widest font-bold ${
                        supplierData?.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-white/5 text-white/60 border-white/10'
                      }`}>
                        {supplierData?.status || '—'}
                      </span>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-5">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/60 font-semibold mb-2">
                        {lang === 'EN' ? 'Member since' : lang === 'ES' ? 'Miembro desde' : 'Membro desde'}
                      </p>
                      <p className="text-sm font-serif italic text-white">
                        {supplierData?.created_at
                          ? new Date(supplierData.created_at).toLocaleDateString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US', { month: 'short', year: 'numeric' })
                          : (lang === 'EN' ? 'Recently' : lang === 'ES' ? 'Recientemente' : 'Recentemente')}
                      </p>
                    </div>
                    {supplierData?.whatsapp && (
                      <div className="col-span-2 bg-[#B8963E]/5 border border-[#B8963E]/20 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#B8963E]/15 flex items-center justify-center text-[#B8963E] shrink-0">
                          <MessageSquare size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-[#B8963E] font-semibold">WhatsApp</p>
                          <p className="text-sm text-white font-medium truncate">{supplierData.whatsapp}</p>
                        </div>
                        <a href={`https://wa.me/${supplierData.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                          className="text-[10px] text-[#B8963E] uppercase tracking-widest font-semibold hover:text-white transition-colors flex items-center gap-1 shrink-0">
                          {lang === 'EN' ? 'Open' : lang === 'ES' ? 'Abrir' : 'Abrir'}
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* KPI tiles — bigger, gold values */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: { EN: 'Total Assets', ES: 'Total Activos', PT: 'Total Ativos' }, value: stats.totalAssets, icon: Package, color: 'text-[#B8963E]' },
                  { label: { EN: 'Active Listings', ES: 'Activos', PT: 'Ativos' }, value: stats.activeAssets, icon: Eye, color: 'text-emerald-400' },
                  { label: { EN: 'Pending Bookings', ES: 'Reservas Pendientes', PT: 'Reservas Pendentes' }, value: stats.pendingBookings, icon: Clock, color: 'text-amber-400' },
                  { label: { EN: 'Total Earnings', ES: 'Ganancias Totales', PT: 'Ganhos Totais' }, value: `$${stats.totalEarnings.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-[#B8963E]', isString: true },
                ].map((stat, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className="bg-luxury-slate border border-white/5 rounded-2xl p-7 hover:border-[#B8963E]/30 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs uppercase tracking-[0.3em] text-white/60 font-semibold">{stat.label[lang]}</span>
                      <stat.icon size={18} className={stat.color} />
                    </div>
                    <span className={`block font-serif italic text-[#B8963E] leading-none ${(stat as any).isString ? 'text-3xl md:text-4xl' : 'text-4xl md:text-5xl'}`}>
                      {stat.value}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Two-column row: Bookings (left) + Assets (right) — fills horizontal space */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Recent Bookings */}
                <div className="lg:col-span-3 bg-luxury-slate border border-white/5 rounded-2xl overflow-hidden">
                  <div className="px-7 py-5 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-xl font-serif italic text-white">
                      {lang === 'EN' ? 'Recent Bookings' : lang === 'ES' ? 'Reservas Recientes' : 'Reservas Recentes'}
                    </h3>
                    <button onClick={() => setActiveTab('bookings')}
                      className="text-xs text-[#B8963E] uppercase tracking-widest font-semibold hover:text-white transition-colors flex items-center gap-1">
                      {lang === 'EN' ? 'View All' : lang === 'ES' ? 'Ver Todas' : 'Ver Todas'} <ChevronRight size={12} />
                    </button>
                  </div>
                  {bookings.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="w-14 h-14 bg-[#B8963E]/10 rounded-full flex items-center justify-center mx-auto text-[#B8963E] mb-4">
                        <Calendar size={24} />
                      </div>
                      <p className="text-base text-white font-serif italic mb-2">
                        {lang === 'EN' ? 'Upcoming bookings' : lang === 'ES' ? 'Próximas reservas' : 'Próximas reservas'}
                      </p>
                      <p className="text-sm text-white/50 mb-5 max-w-xs mx-auto leading-relaxed">
                        {lang === 'EN'
                          ? "Once guests book your assets, you'll see them here. Set up your calendar to start receiving requests."
                          : lang === 'ES'
                          ? 'Cuando los huéspedes reserven tus activos, aparecerán aquí. Configura tu calendario para empezar a recibir solicitudes.'
                          : 'Quando os hóspedes reservarem seus ativos, eles aparecerão aqui. Configure seu calendário para começar a receber solicitações.'}
                      </p>
                      <button onClick={() => setActiveTab('settings')}
                        className="inline-flex items-center gap-2 text-sm text-[#B8963E] hover:text-white font-semibold transition-colors">
                        {lang === 'EN' ? 'Set up your calendar' : lang === 'ES' ? 'Configura tu calendario' : 'Configure seu calendário'} <ChevronRight size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {bookings.slice(0, 5).map(b => (
                        <div key={b.id} className="px-7 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-11 h-11 bg-[#B8963E]/10 rounded-xl flex items-center justify-center text-[#B8963E] shrink-0">
                              <Users size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">{b.guest_name}</p>
                              <p className="text-xs text-white/60 truncate">{b.asset_name} · {b.start_date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <span className={`text-[10px] px-3 py-1 rounded-full border uppercase tracking-widest font-bold ${BOOKING_STATUS_COLORS[b.status] || 'bg-white/5 text-white/60 border-white/10'}`}>
                              {b.status}
                            </span>
                            <span className="text-sm font-bold text-[#B8963E] font-serif italic">{b.total_price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assets Preview */}
                <div className="lg:col-span-2 bg-luxury-slate border border-white/5 rounded-2xl overflow-hidden">
                  <div className="px-7 py-5 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-xl font-serif italic text-white">
                      {lang === 'EN' ? 'Your Assets' : lang === 'ES' ? 'Tus Activos' : 'Seus Ativos'}
                    </h3>
                    <button onClick={() => setActiveTab('assets')}
                      className="text-xs text-[#B8963E] uppercase tracking-widest font-semibold hover:text-white transition-colors flex items-center gap-1">
                      {lang === 'EN' ? 'Manage' : lang === 'ES' ? 'Gestionar' : 'Gerenciar'} <ChevronRight size={12} />
                    </button>
                  </div>
                  {assets.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="w-14 h-14 bg-[#B8963E]/10 rounded-full flex items-center justify-center mx-auto text-[#B8963E] mb-4">
                        <Package size={24} />
                      </div>
                      <p className="text-base text-white font-serif italic mb-2">
                        {lang === 'EN' ? 'No assets yet' : lang === 'ES' ? 'Sin activos aún' : 'Sem ativos ainda'}
                      </p>
                      <p className="text-sm text-white/50 mb-5 leading-relaxed">
                        {lang === 'EN' ? 'List your first asset to start receiving bookings.' : lang === 'ES' ? 'Lista tu primer activo para empezar a recibir reservas.' : 'Liste seu primeiro ativo para começar a receber reservas.'}
                      </p>
                      <button onClick={() => openEditModal()}
                        className="px-6 py-3 bg-[#B8963E] text-luxury-black rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white transition-all inline-flex items-center gap-2">
                        <Plus size={14} /> {lang === 'EN' ? 'Add First Asset' : lang === 'ES' ? 'Agregar Activo' : 'Adicionar Ativo'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-5 space-y-4">
                      {assets.slice(0, 3).map(asset => {
                        const Icon = ASSET_TYPE_ICONS[asset.type] || Package;
                        return (
                          <div key={asset.id} className="bg-white/5 border border-white/5 rounded-xl p-5 hover:border-[#B8963E]/30 transition-colors">
                            <div className="flex items-start gap-4">
                              <div className="w-14 h-14 bg-[#B8963E]/15 rounded-xl flex items-center justify-center text-[#B8963E] shrink-0">
                                <Icon size={22} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-base font-medium text-white truncate">{asset.name}</p>
                                <p className="text-xs text-white/60 uppercase tracking-wider mt-0.5">
                                  {ASSET_TYPE_LABELS[asset.type]?.[lang] || asset.type}
                                  {asset.location && <span className="text-white/40"> · {asset.location}</span>}
                                </p>
                                <div className="flex items-center justify-between mt-3">
                                  <span className="text-lg font-serif italic text-[#B8963E] font-bold">{asset.price_per_unit}</span>
                                  <span className="text-xs text-white/40">{asset.capacity} PAX</span>
                                </div>
                              </div>
                            </div>
                            <button onClick={() => openEditModal(asset)}
                              className="mt-4 w-full py-2 border border-white/10 rounded-lg text-xs uppercase tracking-widest font-semibold text-white/70 hover:text-white hover:border-[#B8963E]/40 hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                              <Edit2 size={12} /> {lang === 'EN' ? 'Edit' : lang === 'ES' ? 'Editar' : 'Editar'}
                            </button>
                          </div>
                        );
                      })}
                      {assets.length >= 1 && (
                        <button onClick={() => openEditModal()}
                          className="w-full py-3 border border-dashed border-white/15 rounded-xl text-xs uppercase tracking-widest font-semibold text-white/50 hover:text-[#B8963E] hover:border-[#B8963E]/40 transition-all flex items-center justify-center gap-2">
                          <Plus size={14} /> {lang === 'EN' ? 'Add another asset' : lang === 'ES' ? 'Crear otro activo' : 'Adicionar outro ativo'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── ASSETS TAB ── */}
          {activeTab === 'assets' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div></div>
                <button onClick={() => openEditModal()}
                  className="px-6 py-3 bg-[#B8963E] text-white rounded-full font-bold text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 hover:bg-white hover:text-slate-900 transition-all shrink-0">
                  <Plus size={14} /> {lang === 'EN' ? 'Add Asset' : lang === 'ES' ? 'Agregar' : 'Adicionar'}
                </button>
              </div>

              {assets.length === 0 ? (
                <div className="bg-luxury-slate border border-white/5 rounded-2xl p-12 text-center">
                  <div className="w-14 h-14 bg-[#B8963E]/10 rounded-full flex items-center justify-center mx-auto text-[#B8963E] mb-4">
                    <Package size={24} />
                  </div>
                  <p className="text-base text-white font-serif italic mb-2">
                    {lang === 'EN' ? 'No assets yet' : lang === 'ES' ? 'Sin activos aún' : 'Sem ativos ainda'}
                  </p>
                  <p className="text-sm text-white/50 mb-5 max-w-xs mx-auto leading-relaxed">
                    {lang === 'EN'
                      ? 'List your first asset to start receiving bookings.'
                      : lang === 'ES'
                      ? 'Lista tu primer activo para empezar a recibir reservas.'
                      : 'Liste seu primeiro ativo para começar a receber reservas.'}
                  </p>
                  <button onClick={() => openEditModal()}
                    className="px-6 py-3 bg-[#B8963E] text-luxury-black rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white transition-all inline-flex items-center gap-2">
                    <Plus size={14} /> {lang === 'EN' ? 'Add your first asset' : lang === 'ES' ? 'Agrega tu primer activo' : 'Adicione seu primeiro ativo'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assets.map(a => {
                    const Icon = ASSET_TYPE_ICONS[a.type] || Package;
                    const price = (a as any).price_per_night || (a as any).price_per_day || (a as any).price_per_unit;
                    const isSyncing = syncingCalendar === a.id;
                    return (
                      <div key={a.id} className="bg-luxury-slate border border-white/5 rounded-2xl p-5 flex items-start gap-4 hover:border-[#B8963E]/30 transition-colors">
                        <div className="w-14 h-14 rounded-xl bg-[#B8963E]/15 flex items-center justify-center text-[#B8963E] shrink-0">
                          <Icon size={26} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold text-white truncate">{a.name}</h4>
                          <p className="text-xs text-white/50 truncate">
                            {ASSET_TYPE_LABELS?.[a.type]?.[lang] || a.type}
                            {a.location && <span className="text-white/40"> · {a.location}</span>}
                          </p>
                          {price != null && price !== '' && (
                            <p className="font-serif italic text-lg text-[#B8963E] mt-1">${price}</p>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <StatusPill status={a.status} lang={lang} />
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <button onClick={() => openEditModal(a)}
                            className="text-[#B8963E] hover:text-white text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1">
                            <Edit2 size={10} /> {lang === 'EN' ? 'Edit' : lang === 'ES' ? 'Editar' : 'Editar'}
                          </button>
                          <button onClick={() => handleSyncCalendar(a.id)} disabled={isSyncing}
                            className="text-blue-400 hover:text-white text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1 disabled:opacity-50"
                            title={lang === 'EN' ? 'Sync calendar' : lang === 'ES' ? 'Sincronizar' : 'Sincronizar'}>
                            {isSyncing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                          </button>
                          <button onClick={() => handleDeleteAsset(a.id)}
                            className="text-red-400 hover:text-white text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1"
                            title={lang === 'EN' ? 'Delete' : lang === 'ES' ? 'Eliminar' : 'Excluir'}>
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── BOOKINGS TAB ── */}
          {activeTab === 'bookings' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <DataTable<Booking>
                rows={bookings}
                loading={loadingBookings}
                columns={bookingColumns}
                rowKey={(b) => b.id}
                filters={{ field: 'status', options: BOOKING_FILTERS }}
                searchFields={['guest_name', 'guest_email', 'asset_name']}
                searchPlaceholder={{ EN: 'Search by guest, asset, email...', ES: 'Buscar por huésped, activo, email...', PT: 'Buscar por hóspede, ativo, email...' }}
                defaultSort={{ key: 'start_date', order: 'desc' }}
                pageSize={25}
                lang={lang}
                urlStateKey="bookings"
                emptyTitle={{ EN: 'No bookings yet', ES: 'Sin reservas aún', PT: 'Nenhuma reserva ainda' }}
                emptyHint={{ EN: 'Reservations for your assets will appear here once guests book.', ES: 'Las reservas de tus activos aparecerán aquí cuando los huéspedes reserven.', PT: 'As reservas dos seus ativos aparecerão aqui quando os hóspedes reservarem.' }}
              />
            </motion.div>
          )}

          {/* ── BUNDLES TAB ── */}
          {activeTab === 'bundles' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <PartnerBundles supplierId={supplierId} lang={lang} />
            </motion.div>
          )}

          {/* ── SETTINGS TAB ── */}
          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6 max-w-2xl">
              <div className="bg-luxury-slate border border-white/10  rounded-2xl overflow-hidden">
                <div className="px-8 py-6 border-b border-white/10">
                  <h3 className="text-xl font-serif italic text-white">{lang === 'EN' ? 'Account Settings' : lang === 'ES' ? 'Ajustes de Cuenta' : 'Configurações da Conta'}</h3>
                  <p className="text-[11px] text-white/60 mt-1">{lang === 'EN' ? 'Manage your partner profile' : lang === 'ES' ? 'Gestiona tu perfil de socio' : 'Gerencie seu perfil de parceiro'}</p>
                </div>
                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">{lang === 'EN' ? 'Business Name' : lang === 'ES' ? 'Nombre del Negocio' : 'Nome do Negócio'}</label>
                      <input value={supplierData?.business_name || ''} readOnly
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">{lang === 'EN' ? 'Contact' : lang === 'ES' ? 'Contacto' : 'Contato'}</label>
                        <input value={supplierData?.contact_name || ''} readOnly
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">{lang === 'EN' ? 'Location' : lang === 'ES' ? 'Ubicación' : 'Localização'}</label>
                        <input value={supplierData?.location || ''} readOnly
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">{lang === 'EN' ? 'Email' : lang === 'ES' ? 'Correo' : 'E-mail'}</label>
                      <input value={supplierData?.email || ''} readOnly
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">WhatsApp</label>
                      <input value={supplierData?.whatsapp || ''} readOnly
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white" />
                    </div>
                  </div>
                  <p className="text-[10px] text-white/40 italic">{lang === 'EN' ? 'Profile edits coming soon. Contact KLO admin to update your details.' : lang === 'ES' ? 'Las ediciones de perfil estarán disponibles pronto. Contacta al administrador de KLO para actualizar tus datos.' : 'Edições de perfil em breve. Contate o administrador KLO para atualizar seus dados.'}</p>
                </div>
              </div>

              {/* Telegram Settings */}
              <div className="bg-luxury-slate border border-white/10  rounded-2xl overflow-hidden">
                <div className="px-8 py-6 border-b border-white/10 flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif italic text-white">{lang === 'EN' ? 'Telegram Notifications' : lang === 'ES' ? 'Notificaciones de Telegram' : 'Notificações do Telegram'}</h3>
                    <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                      {lang === 'EN'
                        ? 'Receive booking notifications directly on Telegram. Start a chat with your KLO bot and send your Chat ID.'
                        : lang === 'ES'
                        ? 'Recibe notificaciones de reservas en Telegram. Inicia un chat con tu bot de KLO.'
                        : 'Receba notificações de reservas no Telegram.'}
                    </p>
                  </div>
                </div>
                <div className="p-8 space-y-4">
                  <div className="bg-[#B8963E]/5 border border-[#B8963E]/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle size={16} className="text-[#B8963E] mt-0.5 shrink-0" />
                    <p className="text-xs text-white/60 leading-relaxed">
                      {lang === 'EN'
                        ? 'To get your Chat ID: open Telegram, search for your KLO bot, send /start, then send /id. Copy the number it returns.'
                        : lang === 'ES'
                        ? 'Para obtener tu ID: abre Telegram, busca tu bot de KLO, envía /start, luego /id.'
                        : 'Para obter seu ID: abra o Telegram, busque seu bot KLO, envie /start, depois /id.'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">{lang === 'EN' ? 'Telegram Chat ID' : lang === 'ES' ? 'ID de Chat de Telegram' : 'ID do Chat do Telegram'}</label>
                    <div className="flex gap-3">
                      <input value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)}
                        placeholder="123456789"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30" />
                      <button onClick={handleSaveTelegram} disabled={saving}
                        className="px-6 py-3 bg-gold text-luxury-black rounded-full font-semibold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white transition-all disabled:opacity-50 shrink-0">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : telegramSaved ? <Check size={12} /> : <Send size={12} />}
                        {telegramSaved ? (lang === 'EN' ? 'Saved!' : lang === 'ES' ? '¡Guardado!' : 'Salvo!') : (lang === 'EN' ? 'Save' : lang === 'ES' ? 'Guardar' : 'Salvar')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit / Create Asset Modal */}
      <AnimatePresence>
        {isModalOpen && editingAsset && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-luxury-slate border border-white/10  rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button onClick={closeModal} className="absolute top-6 right-6 text-white/60 hover:text-white">
                <X size={20} />
              </button>
              <h3 className="text-2xl font-serif italic text-white mb-6">
                {editingAsset.id ? (lang === 'EN' ? 'Edit Asset' : lang === 'ES' ? 'Editar Activo' : 'Editar Ativo')
                  : (lang === 'EN' ? 'Add New Asset' : lang === 'ES' ? 'Agregar Activo' : 'Adicionar Ativo')}
              </h3>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">
                    {lang === 'EN' ? 'Asset Name' : lang === 'ES' ? 'Nombre del Activo' : 'Nome do Ativo'}
                  </label>
                  <input data-asset-name-input value={editingAsset.name || ''} onChange={e => setEditingAsset({ ...editingAsset, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">{lang === 'EN' ? 'Type' : lang === 'ES' ? 'Tipo' : 'Tipo'}</label>
                    <select value={editingAsset.type || 'LODGING'} onChange={e => setEditingAsset({ ...editingAsset, type: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 appearance-none">
                      {Object.entries(ASSET_TYPE_LABELS).map(([val, lbl]) => (
                        <option key={val} value={val}>{lbl[lang]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">{lang === 'EN' ? 'Location' : lang === 'ES' ? 'Ubicación' : 'Localização'}</label>
                    <input value={editingAsset.location || ''} onChange={e => setEditingAsset({ ...editingAsset, location: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">{lang === 'EN' ? 'Price' : lang === 'ES' ? 'Precio' : 'Preço'}</label>
                    <input value={editingAsset.price_per_unit || ''} onChange={e => setEditingAsset({ ...editingAsset, price_per_unit: e.target.value })}
                      placeholder={lang === 'EN' ? '$0.00' : lang === 'ES' ? '0,00 $' : 'R$ 0,00'}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">{lang === 'EN' ? 'Capacity (PAX)' : lang === 'ES' ? 'Capacidad (PAX)' : 'Capacidade (PAX)'}</label>
                    <input type="number" value={editingAsset.capacity || 1} onChange={e => setEditingAsset({ ...editingAsset, capacity: parseInt(e.target.value) || 1 })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">{lang === 'EN' ? 'Description' : lang === 'ES' ? 'Descripción' : 'Descrição'}</label>
                  <textarea value={editingAsset.description || ''} onChange={e => setEditingAsset({ ...editingAsset, description: e.target.value })}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 resize-none" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold">{lang === 'EN' ? 'Status' : lang === 'ES' ? 'Estado' : 'Estado'}</label>
                  <select value={editingAsset.status || 'ACTIVE'} onChange={e => setEditingAsset({ ...editingAsset, status: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 appearance-none">
                    <option value="ACTIVE">{lang === 'EN' ? 'Active' : lang === 'ES' ? 'Activo' : 'Ativo'}</option>
                    <option value="MAINTENANCE">{lang === 'EN' ? 'Maintenance' : lang === 'ES' ? 'Mantenimiento' : 'Manutenção'}</option>
                    <option value="OFFLINE">{lang === 'EN' ? 'Offline' : lang === 'ES' ? 'Sin conexión' : 'Offline'}</option>
                  </select>
                </div>
              </div>

              {/* v1.8.0 Step 22.34: bulk-add progress counter (only visible in create mode after at least 1 add) */}
              {!editingAsset.id && addedInSession > 0 && (
                <div className="mt-6 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300 font-semibold">
                    {lang === 'EN' ? `${addedInSession} added so far` : lang === 'ES' ? `${addedInSession} añadido(s) en esta sesión` : `${addedInSession} adicionado(s) nesta sessão`}
                  </p>
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <button onClick={closeModal}
                  className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl text-[11px] uppercase tracking-widest font-semibold text-white hover:bg-white/5 transition-all">
                  {lang === 'EN' ? 'Cancel' : lang === 'ES' ? 'Cancelar' : 'Cancelar'}
                </button>
                {editingAsset.id ? (
                  // Edit mode: single "Save" button (no sticky option).
                  <button onClick={() => handleSaveAsset('close')} disabled={saving}
                    className="flex-1 py-3 bg-[#B8963E] text-white rounded-full hover:bg-white/10 text-[11px] uppercase tracking-widest font-semibold flex items-center justify-center gap-2 hover:bg-white transition-all disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {saving ? (lang === 'EN' ? 'Saving...' : lang === 'ES' ? 'Guardando...' : 'Salvando...')
                      : (lang === 'EN' ? 'Save Asset' : lang === 'ES' ? 'Guardar' : 'Salvar')}
                  </button>
                ) : (
                  // Create mode: TWO buttons — sticky (save & add another) + close (save & exit).
                  // The sticky one is the primary CTA in gold; the close one is secondary outlined.
                  <>
                    <button onClick={() => handleSaveAsset('close')} disabled={saving}
                      className="flex-1 py-3 bg-white/5 border border-[#B8963E]/40 rounded-full text-[#B8963E] text-[11px] uppercase tracking-widest font-semibold flex items-center justify-center gap-2 hover:bg-[#B8963E]/10 transition-all disabled:opacity-50">
                      <Check size={14} />
                      {lang === 'EN' ? 'Save & Close' : lang === 'ES' ? 'Guardar y Cerrar' : 'Salvar e Fechar'}
                    </button>
                    <button onClick={() => handleSaveAsset('sticky')} disabled={saving}
                      className="flex-[1.4] py-3 bg-[#B8963E] text-white rounded-full text-[11px] uppercase tracking-widest font-semibold flex items-center justify-center gap-2 hover:bg-white hover:text-slate-900 transition-all disabled:opacity-50">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      {saving ? (lang === 'EN' ? 'Saving...' : lang === 'ES' ? 'Guardando...' : 'Salvando...')
                        : (lang === 'EN' ? 'Save & Add Another' : lang === 'ES' ? 'Guardar y Agregar Otro' : 'Salvar e Adicionar Outro')}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};














































































