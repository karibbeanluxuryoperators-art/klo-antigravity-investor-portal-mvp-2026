import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers, Package, BarChart3, Users, ClipboardList, UserCheck, Inbox,
  TrendingUp, DollarSign, Clock, Sparkles, Settings, Mail, Shield,
  Loader2, AlertCircle, RefreshCw, ExternalLink, Eye, AlertTriangle,
  CheckCircle2, Server, Database, Globe, X, Check, Archive,
} from 'lucide-react';
import { DataTable, StatusPill, type Column } from './ui/DataTable';
import { getSupplierSession } from '../services/supabase';

// v1.8.0 Step 8: BUNDLES, STATS, SETTINGS admin sidebar views.
// These fill in the three sidebar sections that previously showed
// "coming soon" placeholders. Same dark theme, trilingual EN/ES/PT
// as the rest of /admin. None require new tables — they pull from
// the same Supabase data the existing tabs use.

type Language = 'EN' | 'ES' | 'PT';

const tx = (obj: { EN: string; ES: string; PT: string } | string | undefined, lang: Language) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.EN;
};

async function authedFetchJSON<T>(url: string): Promise<T> {
  const session = await getSupplierSession();
  const token = session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// POST/PATCH/DELETE helper — same auth pattern as authedFetchJSON, with JSON body.
async function authedFetchSend<T>(url: string, method: 'POST' | 'PATCH' | 'PUT', body?: any): Promise<T> {
  const session = await getSupplierSession();
  const token = session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// DELETE helper — no body.
async function authedFetchDelete<T>(url: string): Promise<T> {
  const session = await getSupplierSession();
  const token = session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'DELETE', headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ════════════════════════════════════════════════════════════════════════
// BUNDLES — admin view of all bundles across all suppliers
// ════════════════════════════════════════════════════════════════════════
type BundleStatus = 'DRAFT' | 'PROPOSED' | 'APPROVED' | 'ARCHIVED';
type BundleVisibility = 'private' | 'partner_scoped' | 'public';

interface AdminBundleV2 {
  id: string;
  name: string;
  description: string | null;
  status: BundleStatus;
  visibility: BundleVisibility;
  assembled_by_email: string | null;
  assembled_by_role: string | null;
  assembler_partner_id: string | null;
  client_id: string | null;
  notes: string | null;
  created_at: string;
}

interface BundleItemV2 {
  id: string;
  bundle_id: string;
  line_type: 'partner_sourced' | 'klo_addon';
  service_id: string | null;
  service_kind: string | null;
  service_name: string | null;
  supplier_id: string | null;
  supplier_price: number | null;
  sale_price: number;
  klo_commission_pct: number;
  default_markup_pct: number;
  quantity: number;
  sort_order: number;
  notes: string | null;
}

interface BundleTotals {
  total_client_paid: number;
  total_supplier_payout: number;
  total_klo_revenue: number;
  cross_sell_payout: number;
  cross_sell_partner_email: string | null;
}

interface VisibilityRequest {
  id: string;
  bundle_id: string;
  requested_visibility: BundleVisibility;
  requested_by_email: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_at: string;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

const T_BUNDLES: Record<string, { EN: string; ES: string; PT: string }> = {
  title:           { EN: 'Multi-partner Packages',  ES: 'Paquetes Multi-socio', PT: 'Pacotes Multi-parceiro' },
  empty:           { EN: 'No bundles yet', ES: 'Sin paquetes aún', PT: 'Sem pacotes ainda' },
  emptyHint:       { EN: 'When partners create bundles in their dashboard, they appear here.', ES: 'Cuando los socios crean paquetes en su panel, aparecen aquí.', PT: 'Quando os parceiros criam pacotes no painel, aparecem aqui.' },
  col_bundle:      { EN: 'Bundle', ES: 'Paquete', PT: 'Pacote' },
  col_assembler:   { EN: 'Assembler', ES: 'Ensamblador', PT: 'Montador' },
  col_visibility:  { EN: 'Visibility', ES: 'Visibilidad', PT: 'Visibilidade' },
  col_status:      { EN: 'Status', ES: 'Estado', PT: 'Estado' },
  col_created:     { EN: 'Created', ES: 'Creado', PT: 'Criado' },
  col_items:       { EN: 'Items', ES: 'Items', PT: 'Itens' },
  col_total:       { EN: 'Total', ES: 'Total', PT: 'Total' },
  filter_status:   { EN: 'Status', ES: 'Estado', PT: 'Estado' },
  filter_visibility:{ EN: 'Visibility', ES: 'Visibilidad', PT: 'Visibilidade' },
  view_detail:     { EN: 'View detail', ES: 'Ver detalle', PT: 'Ver detalhe' },
  detail_title:    { EN: 'Bundle Detail', ES: 'Detalle del paquete', PT: 'Detalhe do pacote' },
  commission_title:{ EN: 'Commission Breakdown', ES: 'Desglose de comisiones', PT: 'Detalhamento de comissões' },
  actions_title:   { EN: 'Admin Actions', ES: 'Acciones de admin', PT: 'Ações de admin' },
  approve:         { EN: 'Approve', ES: 'Aprobar', PT: 'Aprovar' },
  reject:          { EN: 'Reject', ES: 'Rechazar', PT: 'Rejeitar' },
  archive:         { EN: 'Archive', ES: 'Archivar', PT: 'Arquivar' },
  pending_requests:{ EN: 'Pending Visibility Requests', ES: 'Solicitudes de visibilidad pendientes', PT: 'Solicitações de visibilidade pendentes' },
  no_pending:      { EN: 'No pending visibility requests.', ES: 'Sin solicitudes de visibilidad pendientes.', PT: 'Sem solicitações de visibilidade pendentes.' },
  request_bundle:  { EN: 'Bundle', ES: 'Paquete', PT: 'Pacote' },
  request_visibility:{ EN: 'Requested', ES: 'Solicitado', PT: 'Solicitado' },
  requested_by:    { EN: 'Requested by', ES: 'Solicitado por', PT: 'Solicitado por' },
  decision_notes:  { EN: 'Notes (optional)', ES: 'Notas (opcional)', PT: 'Notas (opcional)' },
  approve_success: { EN: 'Approved.', ES: 'Aprobado.', PT: 'Aprovado.' },
  reject_success:  { EN: 'Rejected.', ES: 'Rechazado.', PT: 'Rejeitado.' },
  archive_confirm: { EN: 'Archive this bundle? It will be hidden but recoverable from DB.', ES: '¿Archivar este paquete? Quedará oculto pero recuperable desde la BD.', PT: 'Arquivar este pacote? Ficará oculto, mas recuperável do BD.' },
  // Detail modal
  line_items:      { EN: 'Line items', ES: 'Items', PT: 'Itens' },
  service:         { EN: 'Service', ES: 'Servicio', PT: 'Serviço' },
  type:            { EN: 'Type', ES: 'Tipo', PT: 'Tipo' },
  cost:            { EN: 'Cost', ES: 'Costo', PT: 'Custo' },
  price:           { EN: 'Price', ES: 'Precio', PT: 'Preço' },
  qty:             { EN: 'Qty', ES: 'Cant', PT: 'Qtd' },
  subtotal:        { EN: 'Subtotal', ES: 'Subtotal', PT: 'Subtotal' },
  client_paid:     { EN: 'Client paid', ES: 'Pagado por cliente', PT: 'Pago pelo cliente' },
  supplier_payout: { EN: 'Partner payout',  ES: 'Pago a socio',     PT: 'Pagamento ao parceiro'    },
  klo_revenue:     { EN: 'KLO revenue', ES: 'Ingreso KLO', PT: 'Receita KLO' },
  cross_sell:      { EN: 'Cross-sell payout', ES: 'Pago cross-sell', PT: 'Pagamento cross-sell' },
  close:           { EN: 'Close', ES: 'Cerrar', PT: 'Fechar' },
  no_items:        { EN: 'No line items.', ES: 'Sin items.', PT: 'Sem itens.' },
  unknown_bundle:  { EN: 'Unknown bundle', ES: 'Paquete desconocido', PT: 'Pacote desconhecido' },
};
const tb = (k: keyof typeof T_BUNDLES, l: Language) => T_BUNDLES[k][l] || T_BUNDLES[k].EN;

// Inline status pill for bundle-specific statuses that StatusPill may not know.
const BundleStatusPill: React.FC<{ status: BundleStatus; lang: Language }> = ({ status }) => {
  const colorMap: Record<BundleStatus, string> = {
    DRAFT:    'bg-white/10 text-white/70 border-white/20',
    PROPOSED: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    APPROVED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    ARCHIVED: 'bg-red-500/10 text-red-300 border-red-500/30',
  };
  return (
    <span className={`inline-block text-[9px] px-2.5 py-1 rounded-full border uppercase tracking-[0.2em] font-bold ${colorMap[status] || 'bg-white/5 text-white/60 border-white/10'}`}>
      {status}
    </span>
  );
};

const VisibilityPill: React.FC<{ visibility: BundleVisibility }> = ({ visibility }) => {
  const colorMap: Record<BundleVisibility, string> = {
    private:        'bg-white/10 text-white/70 border-white/20',
    partner_scoped: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    public:         'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  };
  return (
    <span className={`inline-block text-[9px] px-2.5 py-1 rounded-full border uppercase tracking-[0.2em] font-bold ${colorMap[visibility] || 'bg-white/5 text-white/60 border-white/10'}`}>
      {visibility.replace('_', ' ')}
    </span>
  );
};

const LineTypeBadge: React.FC<{ lineType: string }> = ({ lineType }) => {
  const isAddon = lineType === 'klo_addon';
  return (
    <span className={`inline-block text-[9px] px-2 py-0.5 rounded border uppercase tracking-[0.2em] font-bold ${
      isAddon
        ? 'bg-[#B8963E]/15 text-[#B8963E] border-[#B8963E]/30'
        : 'bg-white/5 text-white/70 border-white/10'
    }`}>
      {isAddon ? 'KLO ADDON' : 'PARTNER'}
    </span>
  );
};

const fmtMoney = (n: number | null | undefined) => {
  const v = Number(n || 0);
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtDate = (iso: string | null | undefined, lang: Language) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US');
  } catch { return iso; }
};

const fmtDateTime = (iso: string | null | undefined, lang: Language) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US');
  } catch { return iso; }
};

// ── Detail Modal ──────────────────────────────────────────────────────
const BundleDetailModal: React.FC<{
  bundleId: string | null;
  bundleNameHint?: string;
  onClose: () => void;
  lang: Language;
  onChanged: () => void;
}> = ({ bundleId, bundleNameHint, onClose, lang, onChanged }) => {
  const [bundle, setBundle] = useState<AdminBundleV2 | null>(null);
  const [items, setItems] = useState<BundleItemV2[]>([]);
  const [totals, setTotals] = useState<BundleTotals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!bundleId) return;
    setLoading(true); setError(null);
    try {
      const data = await authedFetchJSON<{ bundle: AdminBundleV2; items: BundleItemV2[]; totals: BundleTotals }>(`/api/bundles/${bundleId}`);
      setBundle(data.bundle);
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotals(data.totals);
    } catch (e: any) {
      setError(e.message || 'load failed');
    } finally {
      setLoading(false);
    }
  }, [bundleId]);

  useEffect(() => {
    if (bundleId) loadDetail();
  }, [bundleId, loadDetail]);

  const setStatus = async (newStatus: BundleStatus) => {
    if (!bundle) return;
    setActionBusy(newStatus);
    try {
      await authedFetchSend(`/api/bundles/${bundle.id}`, 'PATCH', { status: newStatus });
      await loadDetail();
      onChanged();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    } finally { setActionBusy(null); }
  };

  const archiveBundle = async () => {
    if (!bundle) return;
    if (!confirm(tb('archive_confirm', lang))) return;
    setActionBusy('ARCHIVE');
    try {
      await authedFetchDelete(`/api/bundles/${bundle.id}`);
      onChanged();
      onClose();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    } finally { setActionBusy(null); }
  };

  return (
    <AnimatePresence>
      {bundleId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-4xl bg-[#0a1518] border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0a1518] border-b border-white/10 p-6 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#B8963E] font-bold mb-1">{tb('detail_title', lang)}</p>
                <h2 className="text-xl font-serif italic text-white truncate">
                  {bundle?.name || bundleNameHint || tb('unknown_bundle', lang)}
                </h2>
                {bundle?.description && <p className="text-xs text-white/50 mt-1 line-clamp-2">{bundle.description}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title={tb('close', lang)}
              >
                <X size={18} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64 gap-3">
                <Loader2 className="animate-spin text-[#B8963E]" size={28} />
                <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                  {lang === 'ES' ? 'Cargando…' : lang === 'PT' ? 'Carregando…' : 'Loading…'}
                </span>
              </div>
            ) : error ? (
              <div className="p-6">
                <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            ) : bundle ? (
              <div className="p-6 space-y-6">
                {/* Meta */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetaField label={tb('col_status', lang)} value={<BundleStatusPill status={bundle.status} lang={lang} />} />
                  <MetaField label={tb('col_visibility', lang)} value={<VisibilityPill visibility={bundle.visibility} />} />
                  <MetaField label={tb('col_assembler', lang)} value={
                    <div>
                      <div className="text-sm text-white truncate">{bundle.assembled_by_email || '—'}</div>
                      {bundle.assembled_by_role && <div className="text-[10px] text-white/40 uppercase tracking-widest">{bundle.assembled_by_role}</div>}
                    </div>
                  } />
                  <MetaField label={tb('col_created', lang)} value={<span className="text-sm text-white">{fmtDate(bundle.created_at, lang)}</span>} />
                </div>

                {bundle.notes && (
                  <div className="rounded-xl bg-white/[0.02] border border-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold mb-1">Notes</p>
                    <p className="text-sm text-white/70 whitespace-pre-wrap">{bundle.notes}</p>
                  </div>
                )}

                {/* Line items */}
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#B8963E] mb-3">{tb('line_items', lang)}</h3>
                  {items.length === 0 ? (
                    <p className="text-sm text-white/40 italic">{tb('no_items', lang)}</p>
                  ) : (
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/10">
                          <tr>
                            <th className="px-3 py-3 text-[9px] uppercase tracking-[0.3em] text-[#B8963E] font-bold">{tb('service', lang)}</th>
                            <th className="px-3 py-3 text-[9px] uppercase tracking-[0.3em] text-[#B8963E] font-bold">{tb('type', lang)}</th>
                            <th className="px-3 py-3 text-[9px] uppercase tracking-[0.3em] text-[#B8963E] font-bold text-right">{tb('cost', lang)}</th>
                            <th className="px-3 py-3 text-[9px] uppercase tracking-[0.3em] text-[#B8963E] font-bold text-right">{tb('price', lang)}</th>
                            <th className="px-3 py-3 text-[9px] uppercase tracking-[0.3em] text-[#B8963E] font-bold text-right">{tb('qty', lang)}</th>
                            <th className="px-3 py-3 text-[9px] uppercase tracking-[0.3em] text-[#B8963E] font-bold text-right">{tb('subtotal', lang)}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {items.map((it) => {
                            const sub = Number(it.sale_price || 0) * Number(it.quantity || 1);
                            return (
                              <tr key={it.id} className="hover:bg-white/[0.02]">
                                <td className="px-3 py-3 text-sm text-white">{it.service_name || it.service_kind || it.service_id || '—'}</td>
                                <td className="px-3 py-3"><LineTypeBadge lineType={it.line_type} /></td>
                                <td className="px-3 py-3 text-sm text-white/70 text-right">
                                  {it.line_type === 'klo_addon' ? <span className="text-white/30">—</span> : fmtMoney(it.supplier_price)}
                                </td>
                                <td className="px-3 py-3 text-sm text-white text-right">{fmtMoney(it.sale_price)}</td>
                                <td className="px-3 py-3 text-sm text-white/70 text-right">{Number(it.quantity || 1)}</td>
                                <td className="px-3 py-3 text-sm font-bold text-[#B8963E] font-serif italic text-right">{fmtMoney(sub)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Commission breakdown */}
                {totals && (
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#B8963E] mb-3">{tb('commission_title', lang)}</h3>
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <CommissionRow label={tb('client_paid', lang)} value={fmtMoney(totals.total_client_paid)} accent="text-white" />
                      <CommissionRow label={tb('supplier_payout', lang)} value={fmtMoney(totals.total_supplier_payout)} accent="text-white" />
                      <CommissionRow label={tb('klo_revenue', lang)} value={fmtMoney(totals.total_klo_revenue)} accent="text-[#B8963E]" />
                      {Number(totals.cross_sell_payout || 0) > 0 && (
                        <CommissionRow
                          label={tb('cross_sell', lang)}
                          value={fmtMoney(totals.cross_sell_payout)}
                          accent="text-amber-400"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#B8963E] mb-3">{tb('actions_title', lang)}</h3>
                  <div className="flex flex-wrap gap-2">
                    {bundle.status !== 'APPROVED' && (
                      <button
                        onClick={() => setStatus('APPROVED')}
                        disabled={actionBusy != null}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                        {actionBusy === 'APPROVED' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        {tb('approve', lang)}
                      </button>
                    )}
                    {bundle.status !== 'ARCHIVED' && (
                      <>
                        {bundle.status !== 'DRAFT' && bundle.status !== 'REJECTED' && (
                          <button
                            onClick={() => setStatus('DRAFT')}
                            disabled={actionBusy != null}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white/80 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                          >
                            {actionBusy === 'DRAFT' ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                            {tb('reject', lang)}
                          </button>
                        )}
                        <button
                          onClick={archiveBundle}
                          disabled={actionBusy != null}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                          {actionBusy === 'ARCHIVE' ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
                          {tb('archive', lang)}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const MetaField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold mb-1">{label}</p>
    <div>{value}</div>
  </div>
);

const CommissionRow: React.FC<{ label: string; value: string; accent: string }> = ({ label, value, accent }) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
    <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold">{label}</span>
    <span className={`text-base font-serif italic font-bold ${accent}`}>{value}</span>
  </div>
);

// ── Visibility request card ───────────────────────────────────────────
const VisibilityRequestCard: React.FC<{
  req: VisibilityRequest;
  bundleName: string | undefined;
  onDecided: () => void;
  lang: Language;
}> = ({ req, bundleName, onDecided, lang }) => {
  const [busy, setBusy] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [notes, setNotes] = useState('');

  const decide = async (decision: 'APPROVED' | 'REJECTED') => {
    setBusy(decision);
    try {
      await authedFetchSend(`/api/bundles/visibility-requests/${req.id}/review`, 'POST', { decision, notes: notes.trim() || undefined });
      onDecided();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    } finally { setBusy(null); }
  };

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400 font-bold">{tb('request_visibility', lang)}</p>
            <VisibilityPill visibility={req.requested_visibility} />
          </div>
          <p className="text-base text-white font-serif italic mt-1 truncate">{bundleName || req.bundle_id}</p>
          <p className="text-[10px] text-white/40 mt-0.5">
            {tb('requested_by', lang)}: <span className="text-white/70">{req.requested_by_email}</span>
            {' · '}
            {fmtDateTime(req.requested_at, lang)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => decide('APPROVED')}
            disabled={busy != null}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {busy === 'APPROVED' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {tb('approve', lang)}
          </button>
          <button
            onClick={() => decide('REJECTED')}
            disabled={busy != null}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {busy === 'REJECTED' ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
            {tb('reject', lang)}
          </button>
        </div>
      </div>
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={tb('decision_notes', lang)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8963E]"
      />
    </div>
  );
};

export const AdminBundlesView: React.FC<{ lang: Language }> = ({ lang }) => {
  const [bundles, setBundles] = useState<AdminBundleV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('ALL');
  const [openBundleId, setOpenBundleId] = useState<string | null>(null);
  const [openBundleName, setOpenBundleName] = useState<string | undefined>(undefined);

  // Visibility requests queue
  const [pendingRequests, setPendingRequests] = useState<VisibilityRequest[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  // Local bundle-name cache for request cards (requests only carry bundle_id).
  const [bundleNameMap, setBundleNameMap] = useState<Record<string, string>>({});

  const fetchBundles = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (visibilityFilter !== 'ALL') params.set('visibility', visibilityFilter);
      const qs = params.toString();
      const data = await authedFetchJSON<{ bundles: AdminBundleV2[] }>(`/api/bundles${qs ? `?${qs}` : ''}`);
      const list = Array.isArray(data?.bundles) ? data.bundles : [];
      setBundles(list);
      // Update name cache for any requests that referenced these.
      setBundleNameMap((prev) => {
        const next = { ...prev };
        for (const b of list) next[b.id] = b.name;
        return next;
      });
    } catch (e: any) {
      setError(e.message || 'load failed');
      setBundles([]);
    } finally { setLoading(false); }
  }, [statusFilter, visibilityFilter]);

  const fetchPendingRequests = useCallback(async () => {
    setPendingLoading(true); setPendingError(null);
    try {
      const data = await authedFetchJSON<{ requests: VisibilityRequest[] }>('/api/bundles/visibility-requests/pending');
      setPendingRequests(Array.isArray(data?.requests) ? data.requests : []);
    } catch (e: any) {
      // 403 if non-admin — silently hide the queue.
      setPendingError(null);
      setPendingRequests([]);
    } finally { setPendingLoading(false); }
  }, []);

  useEffect(() => { fetchBundles(); }, [fetchBundles]);
  useEffect(() => { fetchPendingRequests(); }, [fetchPendingRequests]);

  const onRowClick = (b: AdminBundleV2) => {
    setOpenBundleId(b.id);
    setOpenBundleName(b.name);
  };

  // Compute client-paid total from sale_price*quantity for the row preview.
  // The server's computeBundlePayouts is only available via the detail endpoint,
  // so the list view shows a pre-computed total_client_paid in the row only
  // when present. Since the list endpoint doesn't return totals, we render '—'.
  // (Optional: client-side recompute if all needed fields are present.)
  const computeRowTotal = (b: AdminBundleV2): number | null => {
    // The list endpoint doesn't include items. If a future field shows up, use it.
    if (typeof (b as any).total_client_paid === 'number') return (b as any).total_client_paid;
    return null;
  };

  const columns: Column<AdminBundleV2>[] = [
    {
      key: 'name',
      label: T_BUNDLES.col_bundle,
      sortValue: (b) => b.name,
      render: (b) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[#B8963E]/15 flex items-center justify-center text-[#B8963E] shrink-0">
            <Layers size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{b.name}</div>
            {b.description && <div className="text-[10px] text-white/40 truncate max-w-[300px]">{b.description}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'assembled_by_email',
      label: T_BUNDLES.col_assembler,
      sortValue: (b) => b.assembled_by_email || '',
      hideOnMobile: true,
      render: (b) => (
        <div>
          <div className="text-sm text-white truncate max-w-[200px]">{b.assembled_by_email || '—'}</div>
          {b.assembled_by_role && <div className="text-[10px] text-white/40 uppercase tracking-widest">{b.assembled_by_role}</div>}
        </div>
      ),
    },
    {
      key: 'visibility',
      label: T_BUNDLES.col_visibility,
      sortValue: (b) => b.visibility,
      width: 'w-36',
      render: (b) => <VisibilityPill visibility={b.visibility} />,
    },
    {
      key: 'status',
      label: T_BUNDLES.col_status,
      sortValue: (b) => b.status,
      width: 'w-32',
      render: (b) => <BundleStatusPill status={b.status} lang={lang} />,
    },
    {
      key: 'created_at',
      label: T_BUNDLES.col_created,
      sortValue: (b) => new Date(b.created_at),
      hideOnMobile: true,
      align: 'right',
      width: 'w-32',
      render: (b) => <span className="text-[10px] text-white/40">{fmtDate(b.created_at, lang)}</span>,
    },
    {
      key: 'total_client_paid',
      label: T_BUNDLES.col_total,
      sortValue: (b) => computeRowTotal(b) ?? -1,
      hideOnMobile: true,
      align: 'right',
      width: 'w-32',
      render: (b) => {
        const v = computeRowTotal(b);
        return v != null ? (
          <span className="text-sm font-bold text-[#B8963E] font-serif italic">{fmtMoney(v)}</span>
        ) : <span className="text-white/30">—</span>;
      },
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 className="animate-spin text-[#B8963E]" size={28} />
      <span className="text-xs uppercase tracking-[0.3em] text-white/40">{lang === 'ES' ? 'Cargando…' : lang === 'PT' ? 'Carregando…' : 'Loading…'}</span>
    </div>;
  }
  if (error) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 flex items-start gap-3">
      <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
      <p className="text-sm text-red-300">{error}</p>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* ── Visibility requests queue (admin only) ─────────────── */}
      {!pendingLoading && pendingRequests.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Eye size={14} className="text-amber-400" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400">
              {tb('pending_requests', lang)} ({pendingRequests.length})
            </h3>
          </div>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <VisibilityRequestCard
                key={req.id}
                req={req}
                bundleName={bundleNameMap[req.bundle_id]}
                onDecided={() => { fetchPendingRequests(); fetchBundles(); }}
                lang={lang}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Filter row ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-white/5 rounded-full p-1 border border-white/10 flex-wrap max-w-full">
          {(['ALL', 'DRAFT', 'PROPOSED', 'APPROVED', 'ARCHIVED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                statusFilter === s ? 'bg-[#B8963E] text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex bg-white/5 rounded-full p-1 border border-white/10 flex-wrap max-w-full">
          {(['ALL', 'private', 'partner_scoped', 'public'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVisibilityFilter(v)}
              className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                visibilityFilter === v ? 'bg-[#B8963E] text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              {v === 'ALL' ? v : v.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <DataTable<AdminBundleV2>
        rows={bundles}
        columns={columns}
        rowKey={(b) => b.id}
        searchFields={['name', 'description', 'assembled_by_email']}
        searchPlaceholder={{ EN: 'Search bundles…', ES: 'Buscar paquetes…', PT: 'Buscar pacotes…' }}
        defaultSort={{ key: 'created_at', order: 'desc' }}
        pageSize={25}
        lang={lang}
        urlStateKey="admin_bundles_v2"
        onRowClick={onRowClick}
        emptyTitle={{ EN: 'No bundles yet', ES: 'Sin paquetes aún', PT: 'Sem pacotes ainda' }}
        emptyHint={{ EN: 'When partners create bundles in their dashboard, they appear here.', ES: 'Cuando los socios crean paquetes en su panel, aparecen aquí.', PT: 'Quando os parceiros criam pacotes no painel, aparecem aqui.' }}
      />

      <BundleDetailModal
        bundleId={openBundleId}
        bundleNameHint={openBundleName}
        onClose={() => setOpenBundleId(null)}
        lang={lang}
        onChanged={fetchBundles}
      />
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════
// STATS — KPI dashboard (suppliers, bookings, clients, leads)
// ════════════════════════════════════════════════════════════════════════
interface StatsData {
  counts: {
    suppliers: { total: number; approved: number; pending: number };
    bookings:  { total: number; confirmed: number; pending: number };
    clients:   { total: number; uhnwi: number };
    leads:     { total: number; new: number; won: number };
    bundles:   number;
  };
  recentLeads: Array<{ id: string; name: string | null; source: string | null; status: string; timestamp: string }>;
}

const T_STATS: Record<string, { EN: string; ES: string; PT: string }> = {
  title:          { EN: 'KPIs & Activity', ES: 'KPIs y Actividad', PT: 'KPIs e Atividade' },
  refresh:        { EN: 'Refresh', ES: 'Actualizar', PT: 'Atualizar' },
  network:        { EN: 'Network', ES: 'Red', PT: 'Rede' },
  journey:        { EN: 'Journey', ES: 'Viajes', PT: 'Viagens' },
  guests:         { EN: 'Guests', ES: 'Huéspedes', PT: 'Hóspedes' },
  pipeline:       { EN: 'Pipeline', ES: 'Embudo', PT: 'Funil' },
  partners_total: { EN: 'Total partners', ES: 'Total socios', PT: 'Total parceiros' },
  partners_approved: { EN: 'Approved', ES: 'Aprobados', PT: 'Aprovados' },
  partners_pending:  { EN: 'Pending',  ES: 'Pendientes', PT: 'Pendentes' },
  bookings_total:    { EN: 'Total bookings', ES: 'Total reservas', PT: 'Total reservas' },
  bookings_confirmed:{ EN: 'Confirmed',       ES: 'Confirmadas',  PT: 'Confirmadas' },
  bookings_pending:  { EN: 'Pending',         ES: 'Pendientes',   PT: 'Pendentes' },
  clients_total:     { EN: 'Total guests',    ES: 'Total huéspedes', PT: 'Total hóspedes' },
  clients_uhnwi:     { EN: 'UHNWI',           ES: 'UHNWI',           PT: 'UHNWI' },
  leads_total:       { EN: 'Total leads',     ES: 'Total leads',     PT: 'Total leads' },
  leads_new:         { EN: 'New (untreated)', ES: 'Nuevos (sin tratar)', PT: 'Novos (sem tratar)' },
  leads_won:         { EN: 'Won',             ES: 'Ganados',         PT: 'Ganhos' },
  bundles:           { EN: 'Total bundles',   ES: 'Total paquetes',   PT: 'Total pacotes' },
  recent:            { EN: 'Recent activity', ES: 'Actividad reciente', PT: 'Atividade recente' },
  no_recent:         { EN: 'No recent activity.', ES: 'Sin actividad reciente.', PT: 'Sem atividade recente.' },
  conversion_hint:   { EN: 'Of all leads',   ES: 'De todos los leads', PT: 'De todos os leads' },
};
const ts = (k: keyof typeof T_STATS, l: Language) => T_STATS[k][l] || T_STATS[k].EN;

export const AdminStatsView: React.FC<{ lang: Language }> = ({ lang }) => {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true); setError(null);
    try {
      const d = await authedFetchJSON<StatsData>('/api/admin/stats');
      setData(d);
    } catch (e: any) {
      setError(e.message || 'load failed');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 className="animate-spin text-[#B8963E]" size={28} />
      <span className="text-xs uppercase tracking-[0.3em] text-white/40">{lang === 'ES' ? 'Cargando…' : lang === 'PT' ? 'Carregando…' : 'Loading…'}</span>
    </div>;
  }
  if (error) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 flex items-start gap-3">
      <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
      <p className="text-sm text-red-300">{error}</p>
    </div>;
  }
  if (!data) return null;

  const c = data.counts;
  const conversionPct = c.leads.total > 0 ? Math.round((c.leads.won / c.leads.total) * 100) : 0;
  const approvalPct = c.suppliers.total > 0 ? Math.round((c.suppliers.approved / c.suppliers.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button onClick={fetch} disabled={loading} className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/10 transition-all disabled:opacity-50" title={ts('refresh', lang)}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Network (Partners) */}
      <Section title={ts('network', lang)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard label={ts('partners_total', lang)} value={c.suppliers.total} icon={Users} accent="text-white" />
          <KpiCard label={ts('partners_approved', lang)} value={c.suppliers.approved} icon={CheckCircle2} accent="text-emerald-400" />
          <KpiCard label={ts('partners_pending', lang)} value={c.suppliers.pending} icon={Clock} accent="text-amber-400" />
        </div>
        {c.suppliers.total > 0 && (
          <ProgressBar label={lang === 'ES' ? 'Tasa de aprobación' : lang === 'PT' ? 'Taxa de aprovação' : 'Approval rate'} pct={approvalPct} accent="bg-emerald-500" />
        )}
      </Section>

      {/* Journey (Bookings) */}
      <Section title={ts('journey', lang)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard label={ts('bookings_total', lang)} value={c.bookings.total} icon={ClipboardList} accent="text-white" />
          <KpiCard label={ts('bookings_confirmed', lang)} value={c.bookings.confirmed} icon={CheckCircle2} accent="text-emerald-400" />
          <KpiCard label={ts('bookings_pending', lang)} value={c.bookings.pending} icon={Clock} accent="text-amber-400" />
        </div>
        <KpiCard label={ts('bundles', lang)} value={c.bundles} icon={Layers} accent="text-[#B8963E]" small />
      </Section>

      {/* Guests (Clients) */}
      <Section title={ts('guests', lang)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <KpiCard label={ts('clients_total', lang)} value={c.clients.total} icon={UserCheck} accent="text-white" />
          <KpiCard label={ts('clients_uhnwi', lang)} value={c.clients.uhnwi} icon={Sparkles} accent="text-[#B8963E]" />
        </div>
      </Section>

      {/* Pipeline (Leads) */}
      <Section title={ts('pipeline', lang)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard label={ts('leads_total', lang)} value={c.leads.total} icon={Inbox} accent="text-white" />
          <KpiCard label={ts('leads_new', lang)} value={c.leads.new} icon={Sparkles} accent="text-[#B8963E]" />
          <KpiCard label={ts('leads_won', lang)} value={c.leads.won} icon={TrendingUp} accent="text-emerald-400" />
        </div>
        {c.leads.total > 0 && (
          <ProgressBar label={lang === 'ES' ? 'Tasa de conversión' : lang === 'PT' ? 'Taxa de conversão' : 'Conversion rate'} pct={conversionPct} accent="bg-[#B8963E]" hint={ts('conversion_hint', lang)} />
        )}
      </Section>

      {/* Recent activity */}
      <Section title={ts('recent', lang)}>
        {data.recentLeads.length === 0 ? (
          <p className="text-sm text-white/40 italic">{ts('no_recent', lang)}</p>
        ) : (
          <div className="space-y-2">
            {data.recentLeads.map((l) => (
              <a
                key={l.id}
                href={`/admin/leads/${l.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#B8963E]/30 hover:bg-white/[0.05] transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-[#B8963E]/15 flex items-center justify-center text-[#B8963E] shrink-0">
                  <Inbox size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{l.name || (lang === 'ES' ? 'Sin nombre' : lang === 'PT' ? 'Sem nome' : 'Unnamed')}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] truncate">{l.source || '—'}</div>
                </div>
                <StatusPill status={l.status} lang={lang} />
                <span className="text-[10px] text-white/30 hidden md:inline">{new Date(l.timestamp).toLocaleString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US')}</span>
              </a>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
    <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#B8963E]">{title}</h3>
    {children}
  </div>
);

const KpiCard: React.FC<{
  label: string; value: number | string; icon: React.ElementType; accent: string; small?: boolean;
}> = ({ label, value, icon: Icon, accent, small }) => (
  <div className={`rounded-2xl border border-white/10 bg-white/5 ${small ? 'p-4' : 'p-6'}`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold">{label}</span>
      <Icon size={16} className={accent} />
    </div>
    <span className={`font-serif italic ${small ? 'text-2xl' : 'text-4xl'} ${accent}`}>{value}</span>
  </div>
);

const ProgressBar: React.FC<{ label: string; pct: number; accent: string; hint?: string }> = ({ label, pct, accent, hint }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold">{label}</span>
      <span className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-bold">{pct}% {hint && <span className="text-white/30">· {hint}</span>}</span>
    </div>
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`h-full ${accent} rounded-full`}
      />
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════
// SETTINGS — admin allowlist + integrations
// ════════════════════════════════════════════════════════════════════════
interface AdminUser {
  email: string;
  role: 'admin' | 'sales' | 'ops' | 'partner' | 'viewer';
  job_title: string | null;
  permissions: any | null;
  granted_by: string | null;
  granted_at: string;
  notes: string | null;
}

const T_SETTINGS: Record<string, { EN: string; ES: string; PT: string }> = {
  title:         { EN: 'Roles & Integrations', ES: 'Roles e Integraciones', PT: 'Funções e Integrações' },
  intro:         { EN: 'Manage who has access to /admin and view integration status.',
                   ES: 'Gestiona quién tiene acceso a /admin y revisa el estado de las integraciones.',
                   PT: 'Gerencie quem tem acesso ao /admin e visualize o status das integrações.' },
  // Admin allowlist
  allowlist:     { EN: 'Admin Allowlist',       ES: 'Lista de Administradores', PT: 'Lista de Administradores' },
  allowlistHint: { EN: 'Grant or revoke admin/partner/viewer roles. You cannot revoke your own role.',
                   ES: 'Otorga o revoca roles admin/partner/viewer. No puedes revocar tu propio rol.',
                   PT: 'Conceda ou revogue funções admin/partner/viewer. Você não pode revogar sua própria função.' },
  add_role:      { EN: 'Grant role',             ES: 'Conceder rol',             PT: 'Conceder função' },
  email:         { EN: 'Email',                  ES: 'Email',                    PT: 'Email' },
  role:          { EN: 'Role',                   ES: 'Rol',                      PT: 'Função' },
  notes:         { EN: 'Notes (optional)',       ES: 'Notas (opcional)',         PT: 'Notas (opcional)' },
  revoke:        { EN: 'Revoke',                 ES: 'Revocar',                  PT: 'Revogar' },
  cannot_self:   { EN: 'You cannot revoke your own admin role.', ES: 'No puedes revocar tu propio rol.', PT: 'Você não pode revogar sua própria função.' },
  // Integrations
  integrations:  { EN: 'Integrations',          ES: 'Integraciones',            PT: 'Integrações' },
  supabase:      { EN: 'Supabase',               ES: 'Supabase',                 PT: 'Supabase' },
  supabaseDesc:  { EN: 'Postgres + Auth + RLS for clients, suppliers, bookings, leads, bundles, user_roles.',
                   ES: 'Postgres + Auth + RLS para clientes, socios, reservas, leads, paquetes, user_roles.',
                   PT: 'Postgres + Auth + RLS para clientes, parceiros, reservas, leads, pacotes, user_roles.' },
  ai_assistant:  { EN: 'AI Concierge (María)',   ES: 'Asistente IA (María)',     PT: 'Assistente IA (María)' },
  aiDesc:        { EN: 'Google GenAI-powered trilingual chatbot. Detects user language and responds in kind.',
                   ES: 'Chatbot trilingüe potenciado por Google GenAI. Detecta el idioma del usuario y responde en el mismo.',
                   PT: 'Chatbot trilíngue com Google GenAI. Detecta o idioma do usuário e responde no mesmo idioma.' },
  stripe:        { EN: 'Stripe Connect',         ES: 'Stripe Connect',           PT: 'Stripe Connect' },
  stripeDesc:    { EN: '80/20 split + 48h payout to partners. Not yet wired — post-funding scope.',
                   ES: 'Reparto 80/20 + pago a 48h a socios. Aún no conectado — post-financiación.',
                   PT: 'Repartição 80/20 + pagamento em 48h. Ainda não conectado — pós-financiamento.' },
  google_cal:    { EN: 'Google Calendar',        ES: 'Google Calendar',          PT: 'Google Calendar' },
  googleCalDesc: { EN: 'Per-asset calendar sync for supplier availability.',
                   ES: 'Sincronización de calendario por activo para disponibilidad de socios.',
                   PT: 'Sincronização de calendário por ativo para disponibilidade de parceiros.' },
  telegram:      { EN: 'Telegram',               ES: 'Telegram',                 PT: 'Telegram' },
  telegramDesc:  { EN: 'Per-partner chat ID for booking notifications.',
                   ES: 'Chat ID por socio para notificaciones de reservas.',
                   PT: 'Chat ID por parceiro para notificações de reservas.' },
  status_live:   { EN: 'Live',                   ES: 'Activo',                   PT: 'Ativo' },
  status_post:   { EN: 'Post-funding',           ES: 'Post-financiación',        PT: 'Pós-financiamento' },
};
const tst = (k: keyof typeof T_SETTINGS, l: Language) => T_SETTINGS[k][l] || T_SETTINGS[k].EN;

export const AdminSettingsView: React.FC<{ lang: Language; signedInEmail?: string | null }> = ({ lang, signedInEmail }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'sales' | 'ops' | 'partner' | 'viewer'>('viewer');
  const [jobTitle, setJobTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true); setError(null);
    try {
      const data = await authedFetchJSON<{ users: AdminUser[] }>('/api/admin/users');
      setUsers(data.users || []);
    } catch (e: any) {
      setError(e.message || 'load failed');
      setUsers([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await getSupplierSession())?.access_token || ''}` },
        body: JSON.stringify({
          email,
          role,
          job_title: jobTitle || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setEmail(''); setJobTitle(''); setNotes('');
      await fetchUsers();
    } catch (e: any) {
      alert(`Grant failed: ${e.message}`);
    } finally { setSubmitting(false); }
  };

  const revoke = async (target: AdminUser) => {
    if (target.email === signedInEmail) { alert(tst('cannot_self', lang)); return; }
    if (!confirm(`${lang === 'ES' ? '¿Revocar' : lang === 'PT' ? 'Revogar' : 'Revoke'} ${target.email}?`)) return;
    try {
      const res = await fetch(`/api/admin/users?email=${encodeURIComponent(target.email)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${(await getSupplierSession())?.access_token || ''}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await fetchUsers();
    } catch (e: any) {
      alert(`Revoke failed: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/60 leading-relaxed">{tst('intro', lang)}</p>

      {/* ── Admin allowlist ───────────────────────────────────────── */}
      <Section title={tst('allowlist', lang)}>
        <p className="text-xs text-white/40">{tst('allowlistHint', lang)}</p>

        {/* Grant form */}
        <form onSubmit={grant} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={tst('email', lang)}
            className="md:col-span-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8963E]"
          />
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder={lang === 'ES' ? 'Cargo (ej. COO)' : lang === 'PT' ? 'Cargo (ex. COO)' : 'Job title (e.g. COO)'}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8963E]"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#B8963E]"
          >
            <option value="admin">{lang === 'ES' ? 'admin (todo)' : lang === 'PT' ? 'admin (tudo)' : 'admin (full)'}</option>
            <option value="sales">sales</option>
            <option value="ops">ops</option>
            <option value="partner">partner</option>
            <option value="viewer">{lang === 'ES' ? 'viewer (solo lectura)' : lang === 'PT' ? 'viewer (somente leitura)' : 'viewer (read-only)'}</option>
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-[#B8963E] text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#B8963E]/90 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
            {tst('add_role', lang)}
          </button>
        </form>

        {error && <p className="text-xs text-red-300">{error}</p>}

        {/* Users list */}
        {loading ? (
          <div className="flex items-center gap-2 text-white/40 text-xs py-4">
            <Loader2 className="animate-spin" size={14} /> {lang === 'ES' ? 'Cargando…' : lang === 'PT' ? 'Carregando…' : 'Loading…'}
          </div>
        ) : users.length === 0 ? (
          <p className="text-xs text-white/40 italic py-4">{lang === 'ES' ? 'Sin usuarios con rol todavía.' : lang === 'PT' ? 'Sem usuários com função ainda.' : 'No users with roles yet.'}</p>
        ) : (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-[9px] uppercase tracking-[0.3em] text-[#B8963E] font-bold">{tst('email', lang)}</th>
                  <th className="px-4 py-3 text-[9px] uppercase tracking-[0.3em] text-[#B8963E] font-bold">{tst('role', lang)}</th>
                  <th className="px-4 py-3 text-[9px] uppercase tracking-[0.3em] text-[#B8963E] font-bold hidden lg:table-cell">
                    {lang === 'ES' ? 'Cargo' : lang === 'PT' ? 'Cargo' : 'Job Title'}
                  </th>
                  <th className="px-4 py-3 text-[9px] uppercase tracking-[0.3em] text-[#B8963E] font-bold hidden md:table-cell">{tst('notes', lang)}</th>
                  <th className="px-4 py-3 text-[9px] uppercase tracking-[0.3em] text-[#B8963E] font-bold text-right">—</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.email} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-sm text-white">{u.email}</td>
                    <td className="px-4 py-3"><StatusPill status={u.role.toUpperCase()} lang={lang} /></td>
                    <td className="px-4 py-3 text-xs text-white/60 hidden lg:table-cell">{u.job_title || '—'}</td>
                    <td className="px-4 py-3 text-xs text-white/40 hidden md:table-cell">{u.notes || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => revoke(u)}
                        disabled={u.email === signedInEmail}
                        className="text-[10px] uppercase tracking-widest text-red-300/70 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {tst('revoke', lang)}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Integrations ──────────────────────────────────────────── */}
      <Section title={tst('integrations', lang)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <IntegrationRow icon={Database} name={tst('supabase', lang)} description={tst('supabaseDesc', lang)} status="live" statusLabel={tst('status_live', lang)} lang={lang} />
          <IntegrationRow icon={Sparkles} name={tst('ai_assistant', lang)} description={tst('aiDesc', lang)} status="live" statusLabel={tst('status_live', lang)} lang={lang} />
          <IntegrationRow icon={DollarSign} name={tst('stripe', lang)} description={tst('stripeDesc', lang)} status="post" statusLabel={tst('status_post', lang)} lang={lang} />
          <IntegrationRow icon={Calendar} name={tst('google_cal', lang)} description={tst('googleCalDesc', lang)} status="live" statusLabel={tst('status_live', lang)} lang={lang} />
          <IntegrationRow icon={Mail} name={tst('telegram', lang)} description={tst('telegramDesc', lang)} status="live" statusLabel={tst('status_live', lang)} lang={lang} />
        </div>
      </Section>
    </div>
  );
};

const Calendar = ({ size, className }: { size: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const IntegrationRow: React.FC<{
  icon: React.ElementType; name: string; description: string;
  status: 'live' | 'post'; statusLabel: string; lang: Language;
}> = ({ icon: Icon, name, description, status, statusLabel, lang }) => (
  <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${status === 'live' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
      <Icon size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-white">{name}</span>
        <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-[0.2em] font-bold ${status === 'live' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/40 border-white/10'}`}>
          {statusLabel}
        </span>
      </div>
      <p className="text-xs text-white/50 mt-1 leading-relaxed">{description}</p>
    </div>
  </div>
);
