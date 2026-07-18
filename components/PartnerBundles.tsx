import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package, Plus, X, Check, Loader2, Layers,
  AlertCircle, ChevronDown, ChevronRight, Send,
  DollarSign, Calendar
} from 'lucide-react';
import { Bundle, BundleItem, AvailableAsset } from '../types';

// Local Language alias — see SupplierPortal.tsx for rationale
type Language = 'EN' | 'ES' | 'PT';

interface PartnerBundlesProps {
  supplierId: string;
  lang: Language;
}

interface SelectedAsset extends AvailableAsset {
  qty: number;
}

// Parse "$1,200.00" / "1200" / "USD 1200" → 1200
const parsePrice = (raw: string | null | undefined): number => {
  if (!raw) return 0;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
};

const formatPrice = (n: number) =>
  `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export const PartnerBundles: React.FC<PartnerBundlesProps> = ({ supplierId, lang }) => {
  // Trilingual copy (matches PartnersPage.tsx pattern)
  const t = {
    EN: {
      eyebrow: 'Multi-Supplier Bundles',
      title: 'Your Bundles',
      sub: 'Combine services from approved KLO suppliers into a single bookable package.',
      create: 'Create Bundle',
      new: 'New Bundle',
      empty: 'No bundles yet. Create your first to combine services from approved suppliers.',
      loading: 'Loading bundles…',
      error: 'Could not load bundles.',
      items: 'items',
      approvedAt: 'Approved',
      createdAt: 'Created',
      readOnly: 'Read-only — this bundle is locked.',
      status: {
        PENDING:  'Pending Review',
        APPROVED: 'Approved',
        REJECTED: 'Rejected',
      },
      modal: {
        name: 'Bundle Name',
        namePh: 'e.g. Cartagena Weekend Escape',
        desc: 'Description',
        descPh: 'What does this bundle offer? (optional)',
        pickAssets: 'Choose assets from approved suppliers',
        pickHint: 'Select assets, then set quantity for each.',
        none: 'No available assets found. At least one supplier must be APPROVED with ACTIVE assets.',
        qty: 'Qty',
        from: 'from',
        total: 'Live total',
        submit: 'Create Bundle',
        submitting: 'Creating…',
        cancel: 'Cancel',
        selectAll: 'All',
      },
      errors: {
        name: 'Please enter a name and pick at least one asset.',
        createFailed: 'Could not create bundle.',
      },
    },
    ES: {
      eyebrow: 'Paquetes Multi-Proveedor',
      title: 'Tus Paquetes',
      sub: 'Combina servicios de proveedores KLO aprobados en un solo paquete reservable.',
      create: 'Crear Paquete',
      new: 'Nuevo Paquete',
      empty: 'Aún no tienes paquetes. Crea el primero combinando servicios de proveedores aprobados.',
      loading: 'Cargando paquetes…',
      error: 'No se pudieron cargar los paquetes.',
      items: 'ítems',
      approvedAt: 'Aprobado',
      createdAt: 'Creado',
      readOnly: 'Solo lectura — este paquete está bloqueado.',
      status: {
        PENDING:  'Pendiente',
        APPROVED: 'Aprobado',
        REJECTED: 'Rechazado',
      },
      modal: {
        name: 'Nombre del Paquete',
        namePh: 'p. ej. Fin de semana en Cartagena',
        desc: 'Descripción',
        descPh: '¿Qué ofrece este paquete? (opcional)',
        pickAssets: 'Elige activos de proveedores aprobados',
        pickHint: 'Selecciona activos y luego define la cantidad.',
        none: 'No hay activos disponibles. Al menos un proveedor debe estar APROBADO con activos ACTIVOS.',
        qty: 'Cant.',
        from: 'de',
        total: 'Total en vivo',
        submit: 'Crear Paquete',
        submitting: 'Creando…',
        cancel: 'Cancelar',
        selectAll: 'Todos',
      },
      errors: {
        name: 'Ingresa un nombre y selecciona al menos un activo.',
        createFailed: 'No se pudo crear el paquete.',
      },
    },
    PT: {
      eyebrow: 'Pacotes Multi-Fornecedor',
      title: 'Seus Pacotes',
      sub: 'Combine serviços de fornecedores KLO aprovados em um único pacote reservável.',
      create: 'Criar Pacote',
      new: 'Novo Pacote',
      empty: 'Sem pacotes ainda. Crie o primeiro combinando serviços de fornecedores aprovados.',
      loading: 'Carregando pacotes…',
      error: 'Não foi possível carregar os pacotes.',
      items: 'itens',
      approvedAt: 'Aprovado',
      createdAt: 'Criado',
      readOnly: 'Somente leitura — este pacote está bloqueado.',
      status: {
        PENDING:  'Pendente',
        APPROVED: 'Aprovado',
        REJECTED: 'Rejeitado',
      },
      modal: {
        name: 'Nome do Pacote',
        namePh: 'ex. Final de semana em Cartagena',
        desc: 'Descrição',
        descPh: 'O que este pacote oferece? (opcional)',
        pickAssets: 'Escolha ativos de fornecedores aprovados',
        pickHint: 'Selecione os ativos e defina a quantidade.',
        none: 'Nenhum ativo disponível. Pelo menos um fornecedor deve estar APROVADO com ativos ATIVOS.',
        qty: 'Qtd.',
        from: 'de',
        total: 'Total ao vivo',
        submit: 'Criar Pacote',
        submitting: 'Criando…',
        cancel: 'Cancelar',
        selectAll: 'Todos',
      },
      errors: {
        name: 'Digite um nome e selecione pelo menos um ativo.',
        createFailed: 'Não foi possível criar o pacote.',
      },
    },
  }[lang];

  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<AvailableAsset[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Record<string, SelectedAsset>>({});
  const [collapsedSuppliers, setCollapsedSuppliers] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadBundles = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/bundles?supplier_id=${encodeURIComponent(supplierId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setBundles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setLoadError(err?.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supplierId) loadBundles();
  }, [supplierId]);

  // Group available assets by supplier business_name for the picker
  const grouped = useMemo(() => {
    const map: Record<string, AvailableAsset[]> = {};
    for (const a of availableAssets) {
      const key = a.business_name || 'Unknown';
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return map;
  }, [availableAssets]);

  const liveTotal = useMemo(() => {
    return (Object.values(selected) as SelectedAsset[]).reduce<number>((sum, s) => {
      return sum + parsePrice(s.price_per_unit) * (s.qty || 1);
    }, 0);
  }, [selected]);

  const openCreate = async () => {
    setName('');
    setDescription('');
    setSelected({});
    setSubmitError(null);
    setIsCreateOpen(true);
    setLoadingAvailable(true);
    try {
      const res = await fetch('/api/bundles/available-assets');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setAvailableAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load available assets', err);
      setAvailableAssets([]);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const closeCreate = () => {
    if (submitting) return;
    setIsCreateOpen(false);
  };

  const toggleAsset = (asset: AvailableAsset) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[asset.id]) {
        delete next[asset.id];
      } else {
        next[asset.id] = { ...asset, qty: 1 };
      }
      return next;
    });
  };

  const setQty = (assetId: string, qty: number) => {
    setSelected(prev => {
      const cur = prev[assetId];
      if (!cur) return prev;
      const safe = Math.max(1, Math.floor(qty) || 1);
      return { ...prev, [assetId]: { ...cur, qty: safe } };
    });
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!name.trim() || Object.keys(selected).length === 0) {
      setSubmitError(t.errors.name);
      return;
    }
    setSubmitting(true);
    try {
      const items = (Object.values(selected) as SelectedAsset[]).map(s => ({
        asset_id: s.id,
        qty: s.qty,
      }));
      const res = await fetch('/api/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_supplier_id: supplierId,
          name: name.trim(),
          description: description.trim() || null,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || t.errors.createFailed);
      }
      setIsCreateOpen(false);
      await loadBundles();
    } catch (err: any) {
      setSubmitError(err?.message || t.errors.createFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    PENDING:  'bg-amber-500/10  text-amber-400  border-amber-500/20',
    APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    REJECTED: 'bg-red-500/10    text-red-400    border-red-500/20',
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return iso; }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-2 font-semibold">
            {t.eyebrow}
          </p>
          <h2 className="text-3xl font-serif italic text-text-main">{t.title}</h2>
          <p className="text-sm text-text-main/40 font-light mt-1 max-w-xl">{t.sub}</p>
        </div>
        <button
          onClick={openCreate}
          className="px-6 py-3 bg-gold text-luxury-black rounded-full font-semibold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white transition-all self-start"
        >
          <Plus size={14} /> {t.create}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-gold" size={32} />
          <p className="text-xs uppercase tracking-widest text-text-main/40">{t.loading}</p>
        </div>
      ) : loadError ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
          <AlertCircle size={28} className="text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-300">{loadError}</p>
        </div>
      ) : bundles.length === 0 ? (
        <div className="bg-luxury-slate border border-border-main rounded-2xl p-16 text-center">
          <Layers size={42} className="text-text-main/20 mx-auto mb-4" />
          <p className="text-text-main/40 text-sm font-light">{t.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bundles.map(b => {
            const isLocked = b.status === 'APPROVED' || b.status === 'REJECTED';
            return (
              <div
                key={b.id}
                className="bg-luxury-slate border border-border-main rounded-2xl overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <h3 className="text-lg font-serif italic text-text-main leading-tight flex-1 min-w-0">
                      {b.name}
                    </h3>
                    <span
                      className={`shrink-0 text-[8px] px-3 py-1 rounded-full border uppercase tracking-widest font-bold ${
                        STATUS_COLORS[b.status] || 'bg-white/5 text-white/40'
                      }`}
                    >
                      {t.status[b.status as keyof typeof t.status] || b.status}
                    </span>
                  </div>

                  {b.description && (
                    <p className="text-xs text-text-main/50 font-light leading-relaxed mb-4 line-clamp-2">
                      {b.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-main">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">
                        {t.items}
                      </p>
                      <p className="text-sm font-medium text-text-main">{b.items_count ?? b.items?.length ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold text-right">
                        {t.createdAt}
                      </p>
                      <p className="text-sm text-text-main/70 text-right">{formatDate(b.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">
                        Total
                      </p>
                      <p className="text-lg font-serif italic text-gold">{b.total_price}</p>
                    </div>
                  </div>

                  {isLocked && (
                    <p className="mt-3 text-[10px] text-text-main/30 italic flex items-center gap-1.5">
                      <Lock size={10} /> {t.readOnly}
                    </p>
                  )}
                </div>

                {/* Items list (collapsible preview) */}
                {b.items && b.items.length > 0 && (
                  <BundleItemsPreview items={b.items} lang={lang} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Bundle modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeCreate}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl bg-luxury-slate border border-border-main rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button
                onClick={closeCreate}
                disabled={submitting}
                className="absolute top-6 right-6 text-text-main/40 hover:text-text-main"
              >
                <X size={20} />
              </button>
              <h3 className="text-2xl font-serif italic text-text-main mb-6 flex items-center gap-3">
                <Package size={20} className="text-gold" /> {t.new}
              </h3>

              <div className="space-y-6">
                {/* Name + description */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">
                    {t.modal.name}
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t.modal.namePh}
                    className="w-full bg-luxury-black border border-border-main rounded-xl py-3 px-4 text-sm text-text-main focus:outline-none focus:border-gold/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">
                    {t.modal.desc}
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder={t.modal.descPh}
                    rows={3}
                    className="w-full bg-luxury-black border border-border-main rounded-xl py-3 px-4 text-sm text-text-main focus:outline-none focus:border-gold/50 resize-none"
                  />
                </div>

                {/* Asset picker */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-text-main/40 font-semibold">
                      {t.modal.pickAssets}
                    </label>
                    <p className="text-[11px] text-text-main/30 mt-1">{t.modal.pickHint}</p>
                  </div>

                  {loadingAvailable ? (
                    <div className="py-10 flex justify-center">
                      <Loader2 className="animate-spin text-gold" size={24} />
                    </div>
                  ) : availableAssets.length === 0 ? (
                    <div className="bg-luxury-black border border-border-main rounded-xl p-8 text-center text-text-main/40 text-xs">
                      {t.modal.none}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                      {(Object.entries(grouped) as [string, AvailableAsset[]][]).map(([supplierName, assets]) => {
                        const collapsed = collapsedSuppliers[supplierName];
                        return (
                          <div
                            key={supplierName}
                            className="bg-luxury-black border border-border-main rounded-xl overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedSuppliers(prev => ({ ...prev, [supplierName]: !prev[supplierName] }))
                              }
                              className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/3 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {collapsed ? <ChevronRight size={14} className="text-gold" /> : <ChevronDown size={14} className="text-gold" />}
                                <span className="text-sm font-medium text-text-main">{supplierName}</span>
                                <span className="text-[10px] text-text-main/40 uppercase tracking-widest">
                                  ({assets.length})
                                </span>
                              </div>
                              <span className="text-[10px] text-gold uppercase tracking-widest font-semibold">
                                {t.modal.from}
                              </span>
                            </button>
                            {!collapsed && (
                              <div className="px-4 pb-4 space-y-2">
                                {assets.map(a => {
                                  const isSelected = !!selected[a.id];
                                  return (
                                    <div
                                      key={a.id}
                                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-gold/10 border-gold/40'
                                          : 'bg-luxury-slate border-border-main hover:border-gold/30'
                                      }`}
                                      onClick={() => toggleAsset(a)}
                                    >
                                      <div
                                        className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                                          isSelected ? 'bg-gold border-gold' : 'border-text-main/30'
                                        }`}
                                      >
                                        {isSelected && <Check size={12} className="text-luxury-black" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-text-main truncate">{a.name}</p>
                                        <p className="text-[10px] text-text-main/40 uppercase tracking-widest">
                                          {a.type} · {a.location}
                                        </p>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <p className="text-sm font-serif italic text-gold">
                                          {a.price_per_unit}
                                        </p>
                                        {isSelected && (
                                          <div
                                            className="flex items-center gap-1.5 mt-1.5"
                                            onClick={e => e.stopPropagation()}
                                          >
                                            <label className="text-[9px] text-text-main/50 uppercase tracking-widest">
                                              {t.modal.qty}
                                            </label>
                                            <input
                                              type="number"
                                              min={1}
                                              value={selected[a.id]?.qty ?? 1}
                                              onChange={e => setQty(a.id, parseInt(e.target.value))}
                                              className="w-14 bg-luxury-black border border-border-main rounded px-2 py-1 text-xs text-text-main text-center focus:outline-none focus:border-gold/50"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Live total */}
                <div className="bg-luxury-black border border-gold/20 rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-text-main/60">
                    <DollarSign size={14} className="text-gold" />
                    <span className="text-[10px] uppercase tracking-widest font-semibold">
                      {t.modal.total}
                    </span>
                  </div>
                  <span className="text-2xl font-serif italic text-gold">{formatPrice(liveTotal)}</span>
                </div>

                {submitError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-300">{submitError}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={closeCreate}
                  disabled={submitting}
                  className="flex-1 py-4 bg-white/5 border border-border-main rounded-xl text-[11px] uppercase tracking-widest font-semibold text-text-main hover:bg-white/10 transition-all"
                >
                  {t.modal.cancel}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-4 bg-gold text-luxury-black rounded-xl text-[11px] uppercase tracking-widest font-semibold flex items-center justify-center gap-2 hover:bg-white transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> {t.modal.submitting}
                    </>
                  ) : (
                    <>
                      <Send size={14} /> {t.modal.submit}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Small inline sub-component for the items preview block
const BundleItemsPreview: React.FC<{ items: BundleItem[]; lang: Language }> = ({ items, lang }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border-main">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-6 py-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-text-main/40 hover:text-text-main hover:bg-white/3 transition-colors"
      >
        <span>{open ? 'Hide' : 'Show'} items</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div className="px-6 pb-4 divide-y divide-border-main">
          {items.map(it => (
            <div key={it.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-text-main truncate">
                  {it.asset_name ?? it.asset_id}
                </p>
                <p className="text-[10px] text-text-main/40 uppercase tracking-widest">
                  {it.asset_type ?? '—'}{it.supplier_business_name ? ` · ${it.supplier_business_name}` : ''}
                </p>
              </div>
              <span className="text-xs text-gold font-medium">×{it.qty}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Tiny inline Lock icon (avoid adding to lucide-react just for this)
const Lock: React.FC<{ size?: number }> = ({ size = 12 }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
