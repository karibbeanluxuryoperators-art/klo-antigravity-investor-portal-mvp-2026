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
  CONFIRMED: 'bg-gold/10 text-gold border-gold/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
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

  const openEditModal = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
    } else {
      // Derive a sensible default type from the supplier's pillar
      // (was hard-coded to LODGING — broadened to cover all 5 pillars).
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

      setEditingAsset({
        name: '', type: defaultType, location: supplierData?.location || 'Cartagena',
        description: '', price_per_unit: '', price_type: defaultPriceType, capacity: 1,
        amenities: [], images: [], status: 'ACTIVE',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAsset(null);
  };

  const handleSaveAsset = async () => {
    if (!editingAsset || !supplierId) return;
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
        }
      }
      closeModal();
    } catch (err) {
      console.error('Failed to save asset', err);
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

  const TABS = [
    { id: 'dashboard', label: { EN: 'Overview', ES: 'Resumen', PT: 'Visão' }, icon: BarChart3 },
    { id: 'assets',    label: { EN: 'Assets', ES: 'Activos', PT: 'Ativos' }, icon: Package },
    { id: 'bundles',   label: { EN: 'Bundles', ES: 'Paquetes', PT: 'Pacotes' }, icon: Layers },
    { id: 'bookings',  label: { EN: 'Bookings', ES: 'Reservas', PT: 'Reservas' }, icon: Calendar },
    { id: 'settings',  label: { EN: 'Settings', ES: 'Ajustes', PT: 'Config' }, icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-luxury-black">
        {/* v1.5: skeleton shell that mirrors the real layout, so the page
            doesn't flash blank while /api/suppliers/lookup and
            /api/suppliers/:id/assets are in flight. Three pulse layers:
            header bar, 4 stat cards, two content rows. */}
        <div className="bg-luxury-slate border-b border-border-main">
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
                <div key={i} className="h-9 w-20 rounded-t-xl bg-white/3 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* 4 stat-card skeletons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-luxury-slate border border-border-main rounded-2xl p-6">
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
            <div className="bg-luxury-slate border border-border-main rounded-2xl h-64 animate-pulse" />
            <div className="bg-luxury-slate border border-border-main rounded-2xl h-64 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!supplierId) {
    return (
      <div className="min-h-screen bg-luxury-black flex items-center justify-center p-8">
        <div className="max-w-lg text-center space-y-6">
          <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto text-gold">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-3xl font-serif italic text-text-main">No Partner Profile Found</h2>
          <p className="text-text-main/50 font-light leading-relaxed">
            {lang === 'EN'
              ? "You don't have a partner profile yet. Complete the supplier application first to access your dashboard."
              : lang === 'ES'
              ? "Aún no tienes un perfil de socio. Completa la solicitud de proveedor primero para acceder a tu panel."
              : "Você ainda não tem um perfil de parceiro. Complete o cadastro de fornecedor primeiro."}
          </p>
          <button onClick={onBack}
            className="px-8 py-4 bg-gold text-luxury-black rounded-full font-semibold text-xs uppercase tracking-widest hover:bg-white transition-all">
            {lang === 'EN' ? 'Go Back' : lang === 'ES' ? 'Volver' : 'Voltar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-black">
      {/* Header */}
      <div className="bg-luxury-slate border-b border-border-main">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="text-text-main/40 hover:text-text-main transition-colors">
                <ChevronRight size={20} className="rotate-180" />
              </button>
              <div>
                {/* v1.5: small trilingual greeting above the business name.
                    Keeps the existing title hierarchy but adds the human
                    touch the handoff asked for ("Welcome back, {name}"). */}
                <p className="text-[10px] text-gold/80 uppercase tracking-[0.3em] font-semibold mb-1">
                  {lang === 'EN' ? `Welcome back, ${user.name?.split(' ')[0] || 'Partner'}` : lang === 'ES' ? `Bienvenido de nuevo, ${user.name?.split(' ')[0] || 'Socio'}` : `Bem-vindo de volta, ${user.name?.split(' ')[0] || 'Parceiro'}`}
                </p>
                <h1 className="text-2xl font-serif italic text-text-main">
                  {supplierData?.business_name || user.name}
                </h1>
                <p className="text-[10px] text-text-main/40 uppercase tracking-widest font-semibold">
                  {supplierData?.asset_type} Partner · {supplierData?.location}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[8px] px-3 py-1 rounded-full border uppercase tracking-widest font-bold ${
                supplierData?.status === 'APPROVED'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-white/10 text-white/60 border-white/20'
              }`}>
                {supplierData?.status}
              </span>
              <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center text-gold font-serif text-lg">
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
                  className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-[11px] font-semibold uppercase tracking-widest transition-all ${
                    activeTab === tab.id
                      ? 'bg-luxury-black text-gold border-t-2 border-gold'
                      : 'text-text-main/40 hover:text-text-main/70 hover:bg-white/5'
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
        <div className="bg-red-500/10 border-b border-red-500/20">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <AlertCircle size={18} className="text-red-400 shrink-0" />
              <p className="text-sm text-red-300 truncate">
                {lang === 'EN'
                  ? `We couldn’t load your dashboard. (${loadError})`
                  : lang === 'ES'
                  ? `No pudimos cargar tu panel. (${loadError})`
                  : `Não foi possível carregar seu painel. (${loadError})`}
              </p>
            </div>
            <button
              onClick={() => setReloadKey(k => k + 1)}
              className="px-5 py-2 border border-red-400/40 text-red-300 text-[10px] uppercase tracking-widest font-semibold rounded hover:bg-red-500/20 transition-all shrink-0"
            >
              {lang === 'EN' ? 'Retry' : lang === 'ES' ? 'Reintentar' : 'Tentar novamente'}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ── DASHBOARD TAB ── */}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: { EN: 'Total Assets', ES: 'Total Activos', PT: 'Total Ativos' }, value: stats.totalAssets, icon: Package, color: 'text-gold' },
                  { label: { EN: 'Active Listings', ES: 'Activos', PT: 'Ativos' }, value: stats.activeAssets, icon: Eye, color: 'text-emerald-400' },
                  { label: { EN: 'Pending Bookings', ES: 'Reservas Pendientes', PT: 'Reservas Pendentes' }, value: stats.pendingBookings, icon: Clock, color: 'text-amber-400' },
                  { label: { EN: 'Total Earnings', ES: 'Ganancias Totales', PT: 'Ganhos Totais' }, value: `$${stats.totalEarnings.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-gold' },
                ].map((stat, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className="bg-luxury-slate border border-border-main rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">{stat.label[lang]}</span>
                      <stat.icon size={16} className={stat.color} />
                    </div>
                    <span className="text-3xl font-serif italic text-text-main">{stat.value}</span>
                  </motion.div>
                ))}
              </div>

              {/* Recent Bookings */}
              <div className="bg-luxury-slate border border-border-main rounded-2xl overflow-hidden">
                <div className="px-8 py-6 border-b border-border-main flex items-center justify-between">
                  <h3 className="text-lg font-serif italic text-text-main">
                    {lang === 'EN' ? 'Recent Bookings' : lang === 'ES' ? 'Reservas Recientes' : 'Reservas Recentes'}
                  </h3>
                  <button onClick={() => setActiveTab('bookings')}
                    className="text-[10px] text-gold uppercase tracking-widest font-semibold hover:text-white transition-colors flex items-center gap-1">
                    {lang === 'EN' ? 'View All' : lang === 'ES' ? 'Ver Todas' : 'Ver Todas'} <ChevronRight size={12} />
                  </button>
                </div>
                {bookings.length === 0 ? (
                  <div className="p-12 text-center text-text-main/30 text-sm">
                    {lang === 'EN' ? 'No bookings yet' : lang === 'ES' ? 'Sin reservas aún' : 'Nenhuma reserva ainda'}
                  </div>
                ) : (
                  <div className="divide-y divide-border-main">
                    {bookings.slice(0, 5).map(b => (
                      <div key={b.id} className="px-8 py-5 flex items-center justify-between hover:bg-white/3 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center text-gold">
                            <Users size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-main">{b.guest_name}</p>
                            <p className="text-[10px] text-text-main/40">{b.asset_name} · {b.start_date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-[8px] px-3 py-1 rounded-full border uppercase tracking-widest font-bold ${BOOKING_STATUS_COLORS[b.status] || 'bg-white/5 text-white/40'}`}>
                            {b.status}
                          </span>
                          <span className="text-sm font-bold text-gold">{b.total_price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assets Preview */}
              <div className="bg-luxury-slate border border-border-main rounded-2xl overflow-hidden">
                <div className="px-8 py-6 border-b border-border-main flex items-center justify-between">
                  <h3 className="text-lg font-serif italic text-text-main">
                    {lang === 'EN' ? 'Your Assets' : lang === 'ES' ? 'Tus Activos' : 'Seus Ativos'}
                  </h3>
                  <button onClick={() => setActiveTab('assets')}
                    className="text-[10px] text-gold uppercase tracking-widest font-semibold hover:text-white transition-colors flex items-center gap-1">
                    {lang === 'EN' ? 'Manage' : lang === 'ES' ? 'Gestionar' : 'Gerenciar'} <ChevronRight size={12} />
                  </button>
                </div>
                {assets.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-text-main/30 text-sm mb-4">
                      {lang === 'EN' ? 'No assets yet — add your first one!' : lang === 'ES' ? 'Sin activos aún — ¡agrega el primero!' : 'Nenhum ativo ainda — adicione o primeiro!'}
                    </p>
                    <button onClick={() => openEditModal()}
                      className="px-6 py-3 bg-gold text-luxury-black rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-all">
                      <Plus size={12} className="inline mr-2" /> Add First Asset
                    </button>
                  </div>
                ) : (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {assets.slice(0, 3).map(asset => {
                      const Icon = ASSET_TYPE_ICONS[asset.type] || Package;
                      return (
                        <div key={asset.id} className="bg-luxury-black border border-border-main rounded-xl p-5 flex items-center gap-4">
                          <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center text-gold shrink-0">
                            <Icon size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-main truncate">{asset.name}</p>
                            <p className="text-[10px] text-text-main/40">{ASSET_TYPE_LABELS[asset.type]?.[lang] || asset.type}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── ASSETS TAB ── */}
          {activeTab === 'assets' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-main/30" size={18} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder={lang === 'EN' ? 'Search assets...' : lang === 'ES' ? 'Buscar activos...' : 'Pesquisar ativos...'}
                    className="bg-luxury-slate border border-border-main rounded-full py-3 pl-12 pr-6 focus:outline-none focus:border-gold/50 transition-all text-sm text-text-main w-full sm:w-64" />
                </div>
                <button onClick={() => openEditModal()}
                  className="px-6 py-3 bg-gold text-luxury-black rounded-full font-semibold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white transition-all shrink-0">
                  <Plus size={14} /> {lang === 'EN' ? 'Add Asset' : lang === 'ES' ? 'Agregar' : 'Adicionar'}
                </button>
              </div>

              {filteredAssets.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <Package size={48} className="text-text-main/10 mx-auto mb-4" />
                  {assets.length === 0 ? (
                    <>
                      <p className="text-text-main/50 text-sm">
                        {lang === 'EN' ? 'You have not listed any assets yet.' : lang === 'ES' ? 'Aún no has listado ningún activo.' : 'Você ainda não listou nenhum ativo.'}
                      </p>
                      <button onClick={() => openEditModal()}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-luxury-black rounded-full font-semibold text-xs uppercase tracking-widest hover:bg-white transition-all">
                        <Plus size={14} /> {lang === 'EN' ? 'List your first asset' : lang === 'ES' ? 'Lista tu primer activo' : 'Liste seu primeiro ativo'}
                      </button>
                    </>
                  ) : (
                    <p className="text-text-main/30 text-sm">
                      {lang === 'EN' ? 'No assets match your search' : lang === 'ES' ? 'Sin resultados' : 'Nenhum resultado'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAssets.map(asset => {
                    const Icon = ASSET_TYPE_ICONS[asset.type] || Package;
                    const isSyncing = syncingCalendar === asset.id;

                    return (
                      <motion.div key={asset.id} layout
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-luxury-slate border border-border-main rounded-2xl overflow-hidden group">
                        {/* Card header */}
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              asset.status === 'ACTIVE' ? 'bg-gold/10 text-gold' : 'bg-white/5 text-text-main/40'
                            }`}>
                              <Icon size={22} />
                            </div>
                            <span className={`text-[8px] px-2 py-1 rounded-full border uppercase tracking-widest font-bold ${
                              asset.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : asset.status === 'PENDING'
                                ? 'bg-white/10 text-white/60 border-white/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {asset.status}
                            </span>
                          </div>
                          <h3 className="text-lg font-serif italic text-text-main mb-1">{asset.name}</h3>
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-[10px] text-text-main/40 uppercase tracking-widest">{ASSET_TYPE_LABELS[asset.type]?.[lang]}</span>
                            <span className="text-text-main/20">·</span>
                            <span className="text-[10px] text-text-main/40">{asset.location}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xl font-serif italic text-gold">{asset.price_per_unit}</span>
                            <span className="text-[10px] text-text-main/40">{asset.capacity} PAX</span>
                          </div>
                        </div>

                        {/* Card actions */}
                        <div className="border-t border-border-main flex divide-x divide-border-main">
                          <button onClick={() => openEditModal(asset)}
                            className="flex-1 py-3 text-[10px] uppercase tracking-widest font-semibold text-text-main/50 hover:text-gold hover:bg-gold/5 transition-all flex items-center justify-center gap-1.5">
                            <Edit2 size={12} /> Edit
                          </button>
                          <button onClick={() => handleSyncCalendar(asset.id)}
                            disabled={isSyncing}
                            className="flex-1 py-3 text-[10px] uppercase tracking-widest font-semibold text-text-main/50 hover:text-blue-400 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-1.5">
                            {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                            Sync
                          </button>
                          <button onClick={() => handleDeleteAsset(asset.id)}
                            className="flex-1 py-3 text-[10px] uppercase tracking-widest font-semibold text-text-main/30 hover:text-red-400 hover:bg-red-500/5 transition-all flex items-center justify-center gap-1.5">
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── BOOKINGS TAB ── */}
          {activeTab === 'bookings' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-main/30" size={18} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={lang === 'EN' ? 'Search bookings...' : lang === 'ES' ? 'Buscar reservas...' : 'Pesquisar reservas...'}
                  className="bg-luxury-slate border border-border-main rounded-full py-3 pl-12 pr-6 focus:outline-none focus:border-gold/50 transition-all text-sm text-text-main w-full sm:w-64" />
              </div>

              {loadingBookings ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-gold" size={32} /></div>
              ) : filteredBookings.length === 0 ? (
                <div className="py-20 text-center">
                  <Calendar size={48} className="text-text-main/10 mx-auto mb-4" />
                  <p className="text-text-main/30 text-sm">
                    {bookings.length === 0
                      ? (lang === 'EN' ? 'No bookings yet' : lang === 'ES' ? 'Sin reservas aún' : 'Nenhuma reserva ainda')
                      : (lang === 'EN' ? 'No results' : lang === 'ES' ? 'Sin resultados' : 'Nenhum resultado')}
                  </p>
                </div>
              ) : (
                <div className="bg-luxury-slate border border-border-main rounded-2xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border-main bg-white/3">
                        <th className="px-6 py-5 text-left text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">Guest</th>
                        <th className="px-6 py-5 text-left text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">Asset</th>
                        <th className="px-6 py-5 text-left text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">Dates</th>
                        <th className="px-6 py-5 text-left text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">Total</th>
                        <th className="px-6 py-5 text-left text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main">
                      {filteredBookings.map(b => (
                        <tr key={b.id} className="hover:bg-white/3 transition-colors">
                          <td className="px-6 py-5">
                            <div className="text-sm font-medium text-text-main">{b.guest_name}</div>
                            <div className="text-[10px] text-text-main/40">{b.guest_email}</div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-sm text-text-main">{b.asset_name || '—'}</div>
                            <div className="text-[10px] text-text-main/40 uppercase">{b.asset_type}</div>
                          </td>
                          <td className="px-6 py-5 text-xs text-text-main/60">{b.start_date} → {b.end_date}</td>
                          <td className="px-6 py-5">
                            <span className="text-sm font-bold text-gold">{b.total_price}</span>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`text-[8px] px-3 py-1 rounded-full border uppercase tracking-widest font-bold ${BOOKING_STATUS_COLORS[b.status] || 'bg-white/5 text-white/40'}`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
              <div className="bg-luxury-slate border border-border-main rounded-2xl overflow-hidden">
                <div className="px-8 py-6 border-b border-border-main">
                  <h3 className="text-xl font-serif italic text-text-main">Account Settings</h3>
                  <p className="text-[11px] text-text-main/40 mt-1">{lang === 'EN' ? 'Manage your partner profile' : lang === 'ES' ? 'Gestiona tu perfil de socio' : 'Gerencie seu perfil de parceiro'}</p>
                </div>
                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">Business Name</label>
                      <input value={supplierData?.business_name || ''} readOnly
                        className="w-full bg-luxury-black border border-border-main rounded-xl py-3 px-4 text-sm text-text-main" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">Contact</label>
                        <input value={supplierData?.contact_name || ''} readOnly
                          className="w-full bg-luxury-black border border-border-main rounded-xl py-3 px-4 text-sm text-text-main" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">Location</label>
                        <input value={supplierData?.location || ''} readOnly
                          className="w-full bg-luxury-black border border-border-main rounded-xl py-3 px-4 text-sm text-text-main" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">Email</label>
                      <input value={supplierData?.email || ''} readOnly
                        className="w-full bg-luxury-black border border-border-main rounded-xl py-3 px-4 text-sm text-text-main" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">WhatsApp</label>
                      <input value={supplierData?.whatsapp || ''} readOnly
                        className="w-full bg-luxury-black border border-border-main rounded-xl py-3 px-4 text-sm text-text-main" />
                    </div>
                  </div>
                  <p className="text-[10px] text-text-main/30 italic">Profile edits coming soon. Contact KLO admin to update your details.</p>
                </div>
              </div>

              {/* Telegram Settings */}
              <div className="bg-luxury-slate border border-border-main rounded-2xl overflow-hidden">
                <div className="px-8 py-6 border-b border-border-main flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif italic text-text-main">Telegram Notifications</h3>
                    <p className="text-[11px] text-text-main/40 mt-1 leading-relaxed">
                      {lang === 'EN'
                        ? 'Receive booking notifications directly on Telegram. Start a chat with your KLO bot and send your Chat ID.'
                        : lang === 'ES'
                        ? 'Recibe notificaciones de reservas en Telegram. Inicia un chat con tu bot de KLO.'
                        : 'Receba notificações de reservas no Telegram.'}
                    </p>
                  </div>
                </div>
                <div className="p-8 space-y-4">
                  <div className="bg-gold/5 border border-gold/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle size={16} className="text-gold mt-0.5 shrink-0" />
                    <p className="text-xs text-text-main/60 leading-relaxed">
                      {lang === 'EN'
                        ? 'To get your Chat ID: open Telegram, search for your KLO bot, send /start, then send /id. Copy the number it returns.'
                        : lang === 'ES'
                        ? 'Para obtener tu ID: abre Telegram, busca tu bot de KLO, envía /start, luego /id.'
                        : 'Para obter seu ID: abra o Telegram, busque seu bot KLO, envie /start, depois /id.'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">Telegram Chat ID</label>
                    <div className="flex gap-3">
                      <input value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)}
                        placeholder="123456789"
                        className="flex-1 bg-luxury-black border border-border-main rounded-xl py-3 px-4 text-sm text-text-main focus:outline-none focus:border-gold/50" />
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
              className="relative w-full max-w-xl bg-luxury-slate border border-border-main rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button onClick={closeModal} className="absolute top-6 right-6 text-text-main/40 hover:text-text-main">
                <X size={20} />
              </button>
              <h3 className="text-2xl font-serif italic text-text-main mb-6">
                {editingAsset.id ? (lang === 'EN' ? 'Edit Asset' : lang === 'ES' ? 'Editar Activo' : 'Editar Ativo')
                  : (lang === 'EN' ? 'Add New Asset' : lang === 'ES' ? 'Agregar Activo' : 'Adicionar Ativo')}
              </h3>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">
                    {lang === 'EN' ? 'Asset Name' : lang === 'ES' ? 'Nombre del Activo' : 'Nome do Ativo'}
                  </label>
                  <input value={editingAsset.name || ''} onChange={e => setEditingAsset({ ...editingAsset, name: e.target.value })}
                    className="w-full bg-luxury-black border border-border-main rounded-xl py-3 px-4 text-sm text-text-main focus:outline-none focus:border-gold/50" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">Type</label>
                    <select value={editingAsset.type || 'LODGING'} onChange={e => setEditingAsset({ ...editingAsset, type: e.target.value })}
                      className="w-full bg-luxury-black border border-border-main rounded-xl py-3 px-4 text-sm text-text-main focus:outline-none focus:border-gold/50 appearance-none">
                      {Object.entries(ASSET_TYPE_LABELS).map(([val, lbl]) => (
                        <option key={val} value={val}>{lbl[lang]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">Location</label>
                    <input value={editingAsset.location || ''} onChange={e => setEditingAsset({ ...editingAsset, location: e.target.value })}
                      className="w-full bg-luxury-black border border-border-main rounded-xl py-3 px-4 text-sm text-text-main focus:outline-none focus:border-gold/50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">Price</label>
                    <input value={editingAsset.price_per_unit || ''} onChange={e => setEditingAsset({ ...editingAsset, price_per_unit: e.target.value })}
                      placeholder="$0.00"
                      className="w-full bg-luxury-black border border-border-main rounded-xl py-3 px-4 text-sm text-text-main focus:outline-none focus:border-gold/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">Capacity (PAX)</label>
                    <input type="number" value={editingAsset.capacity || 1} onChange={e => setEditingAsset({ ...editingAsset, capacity: parseInt(e.target.value) || 1 })}
                      className="w-full bg-luxury-black border border-border-main rounded-xl py-3 px-4 text-sm text-text-main focus:outline-none focus:border-gold/50" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">Description</label>
                  <textarea value={editingAsset.description || ''} onChange={e => setEditingAsset({ ...editingAsset, description: e.target.value })}
                    rows={3}
                    className="w-full bg-luxury-black border border-border-main rounded-xl py-3 px-4 text-sm text-text-main focus:outline-none focus:border-gold/50 resize-none" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">Status</label>
                  <select value={editingAsset.status || 'ACTIVE'} onChange={e => setEditingAsset({ ...editingAsset, status: e.target.value })}
                    className="w-full bg-luxury-black border border-border-main rounded-xl py-3 px-4 text-sm text-text-main focus:outline-none focus:border-gold/50 appearance-none">
                    <option value="ACTIVE">Active</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="OFFLINE">Offline</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button onClick={closeModal}
                  className="flex-1 py-4 bg-white/5 border border-border-main rounded-xl text-[11px] uppercase tracking-widest font-semibold text-text-main hover:bg-white/10 transition-all">
                  {lang === 'EN' ? 'Cancel' : lang === 'ES' ? 'Cancelar' : 'Cancelar'}
                </button>
                <button onClick={handleSaveAsset} disabled={saving}
                  className="flex-1 py-4 bg-gold text-luxury-black rounded-xl text-[11px] uppercase tracking-widest font-semibold flex items-center justify-center gap-2 hover:bg-white transition-all disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {saving ? (lang === 'EN' ? 'Saving...' : lang === 'ES' ? 'Guardando...' : 'Salvando...')
                    : (lang === 'EN' ? 'Save Asset' : lang === 'ES' ? 'Guardar' : 'Salvar')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
