import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Inbox, Search, Mail, Phone, MessageSquare,
  Calendar, DollarSign, MapPin, ExternalLink,
  Check, X as XIcon, Loader2, AlertCircle,
  ChevronDown, ChevronUp, Trash2, RefreshCw,
  User, Sparkles,
} from 'lucide-react';
import { getSupplierSession } from '../services/supabase';

// v1.8.0 Step 3.2: auth-aware fetch helper (mirrors ClientManagement).
// Admin endpoints require `Authorization: Bearer <access_token>`.
async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const session = await getSupplierSession();
  const token = session?.access_token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(input, { ...init, headers });
}

// Local Language alias - see SupplierPortal.tsx for rationale
type Language = 'EN' | 'ES' | 'PT';

export interface Lead {
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

interface LeadsManagementProps {
  lang: Language;
}

// v1.8.0 Step 4: trilingual copy for the Leads tab.
const T_LEADS: Record<string, { EN: string; ES: string; PT: string }> = {
  search:           { EN: 'Search leads by name, email, or source...',
                      ES: 'Buscar leads por nombre, email u origen...',
                      PT: 'Pesquisar leads por nome, email ou origem...' },
  empty:            { EN: 'No leads yet. Submissions from "Plan Your Trip" will land here.',
                      ES: 'Aún no hay leads. Los envíos de "Planifica tu Viaje" aparecerán aquí.',
                      PT: 'Ainda não há leads. Os envios de "Planeje Sua Viagem" aparecerão aqui.' },
  empty_filter:     { EN: 'No leads match your filters.',
                      ES: 'Ningún lead coincide con tus filtros.',
                      PT: 'Nenhum lead corresponde aos seus filtros.' },
  loading:          { EN: 'Loading leads...', ES: 'Cargando leads...', PT: 'Carregando leads...' },
  err_load:         { EN: 'Failed to load leads.',
                      ES: 'Error cargando leads.',
                      PT: 'Erro ao carregar leads.' },
  // Eyebrow / section
  inbound:          { EN: 'Inbound', ES: 'Entrantes', PT: 'Entrantes' },
  total_count:      { EN: 'Total Leads', ES: 'Leads Totales', PT: 'Leads Totais' },
  new_count:        { EN: 'New', ES: 'Nuevos', PT: 'Novos' },
  qualified_count:  { EN: 'Qualified', ES: 'Calificados', PT: 'Qualificados' },
  won_count:        { EN: 'Won', ES: 'Ganados', PT: 'Ganhos' },
  // Status labels (fallback to status name for unknown)
  status_NEW:       { EN: 'New', ES: 'Nuevo', PT: 'Novo' },
  status_CONTACTED: { EN: 'Contacted', ES: 'Contactado', PT: 'Contatado' },
  status_QUALIFIED: { EN: 'Qualified', ES: 'Calificado', PT: 'Qualificado' },
  status_WON:       { EN: 'Won', ES: 'Ganado', PT: 'Ganho' },
  status_LOST:      { EN: 'Lost', ES: 'Perdido', PT: 'Perdido' },
  // Filters
  all:              { EN: 'All', ES: 'Todos', PT: 'Todos' },
  // Card sections
  contact:          { EN: 'Contact', ES: 'Contacto', PT: 'Contato' },
  trip:             { EN: 'Trip Details', ES: 'Detalles del Viaje', PT: 'Detalhes da Viagem' },
  message:          { EN: 'Message', ES: 'Mensaje', PT: 'Mensagem' },
  no_message:       { EN: 'No message provided.',
                      ES: 'Sin mensaje.',
                      PT: 'Sem mensagem.' },
  // Field labels
  experience_type:  { EN: 'Experience', ES: 'Experiencia', PT: 'Experiência' },
  budget:           { EN: 'Budget', ES: 'Presupuesto', PT: 'Orçamento' },
  travel_dates:     { EN: 'Travel Dates', ES: 'Fechas', PT: 'Datas' },
  special_requests: { EN: 'Special Requests', ES: 'Solicitudes Especiales', PT: 'Pedidos Especiais' },
  source:           { EN: 'Source', ES: 'Origen', PT: 'Origem' },
  received:         { EN: 'Received', ES: 'Recibido', PT: 'Recebido' },
  // Status transitions
  mark_contacted:   { EN: 'Mark Contacted', ES: 'Marcar Contactado', PT: 'Marcar Contatado' },
  mark_qualified:   { EN: 'Mark Qualified', ES: 'Marcar Calificado', PT: 'Marcar Qualificado' },
  mark_won:         { EN: 'Mark Won', ES: 'Marcar Ganado', PT: 'Marcar Ganho' },
  mark_lost:        { EN: 'Mark Lost', ES: 'Marcar Perdido', PT: 'Marcar Perdido' },
  reopen:           { EN: 'Reopen as New', ES: 'Reabrir como Nuevo', PT: 'Reabrir como Novo' },
  // Actions
  whatsapp:         { EN: 'WhatsApp', ES: 'WhatsApp', PT: 'WhatsApp' },
  email:            { EN: 'Email', ES: 'Email', PT: 'Email' },
  delete:           { EN: 'Delete', ES: 'Eliminar', PT: 'Excluir' },
  refresh:          { EN: 'Refresh', ES: 'Actualizar', PT: 'Atualizar' },
  err_status:       { EN: 'Status update failed', ES: 'Error al actualizar estado', PT: 'Erro ao atualizar status' },
  err_delete:       { EN: 'Delete failed', ES: 'Error al eliminar', PT: 'Erro ao excluir' },
  confirm_delete:   { EN: 'Delete this lead? This cannot be undone.',
                      ES: '¿Eliminar este lead? No se puede deshacer.',
                      PT: 'Excluir este lead? Não pode ser desfeito.' },
};

const t = (key: keyof typeof T_LEADS, lang: Language): string => {
  const entry = T_LEADS[key];
  return (entry && (entry[lang] || entry.EN)) || '';
};

// Status pill colors — gold for high-value, neutral for in-progress, soft red for lost.
const STATUS_COLORS: Record<string, string> = {
  NEW:       'bg-[#B8963E]/20 text-[#B8963E] border-[#B8963E]/40',
  CONTACTED: 'bg-white/10 text-white/80 border-white/20',
  QUALIFIED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  WON:       'bg-[#B8963E] text-white border-[#B8963E]',
  LOST:      'bg-red-500/10 text-red-300 border-red-500/30',
};

const formatBudget = (n: number | null, lang: Language): string => {
  if (n == null) return '—';
  const formatted = n.toLocaleString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US', { maximumFractionDigits: 0 });
  return `$${formatted}`;
};

const formatDate = (iso: string, lang: Language): string => {
  try {
    return new Date(iso).toLocaleDateString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
};

const formatRelative = (iso: string, lang: Language): string => {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60000);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (min < 1) return lang === 'ES' ? 'ahora' : lang === 'PT' ? 'agora' : 'now';
    if (min < 60) return lang === 'ES' ? `hace ${min}m` : lang === 'PT' ? `há ${min}m` : `${min}m ago`;
    if (hr < 24) return lang === 'ES' ? `hace ${hr}h` : lang === 'PT' ? `há ${hr}h` : `${hr}h ago`;
    if (day < 30) return lang === 'ES' ? `hace ${day}d` : lang === 'PT' ? `há ${day}d` : `${day}d ago`;
    return formatDate(iso, lang);
  } catch {
    return iso;
  }
};

const whatsappLink = (phone: string | null, whatsapp: string | null): string | null => {
  const raw = (whatsapp || phone || '').replace(/\D/g, '');
  if (!raw) return null;
  return `https://wa.me/${raw}`;
};

const sourceLabel = (s: string | null): string => {
  if (!s) return '—';
  // Map known source slugs to friendly labels (still raw — not translated here,
  // the source value is data, not UI chrome).
  const map: Record<string, string> = {
    plan_your_trip_modal: 'Plan Your Trip',
    contact_form: 'Contact Form',
    direct: 'Direct',
  };
  return map[s] || s;
};

export const LeadsManagement: React.FC<LeadsManagementProps> = ({ lang }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'WON' | 'LOST'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch('/api/leads');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Failed to load leads', e);
      setError(e?.message || t('err_load', lang));
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStatusUpdate = async (lead: Lead, newStatus: Lead['status']) => {
    setStatusUpdating(lead.id);
    try {
      const res = await authedFetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      await fetchLeads();
    } catch (e: any) {
      console.error('Status update failed', e);
      alert(`${t('err_status', lang)}: ${e.message || 'unknown'}`);
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleDelete = async (lead: Lead) => {
    // Browser confirm() — trilingual message.
    const msg = t('confirm_delete', lang);
    if (!confirm(msg)) return;
    try {
      const res = await authedFetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      await fetchLeads();
    } catch (e: any) {
      console.error('Delete failed', e);
      alert(`${t('err_delete', lang)}: ${e.message || 'unknown'}`);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────
  const sources = Array.from(new Set(leads.map(l => l.source).filter(Boolean))) as string[];

  const filtered = leads.filter(l => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (l.name || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.source || '').toLowerCase().includes(q) ||
      (l.message || '').toLowerCase().includes(q) ||
      (l.experience_type || '').toLowerCase().includes(q)
    );
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    const matchesSource = sourceFilter === 'ALL' || l.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const counts = {
    total: leads.length,
    new: leads.filter(l => l.status === 'NEW').length,
    qualified: leads.filter(l => l.status === 'QUALIFIED' || l.status === 'WON').length,
    won: leads.filter(l => l.status === 'WON').length,
  };

  // ── Render ────────────────────────────────────────────────────────────
  if (loading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#B8963E]" size={32} />
        <span className="ml-3 text-xs uppercase tracking-[0.3em] text-white/40">{t('loading', lang)}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Stat strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t('total_count', lang)} value={counts.total} accent="text-white" />
        <StatCard label={t('new_count', lang)} value={counts.new} accent="text-[#B8963E]" />
        <StatCard label={t('qualified_count', lang)} value={counts.qualified} accent="text-emerald-400" />
        <StatCard label={t('won_count', lang)} value={counts.won} accent="text-[#B8963E]" />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            placeholder={t('search', lang)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-6 focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 transition-all text-sm text-white placeholder:text-white/30"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex bg-white/5 rounded-full p-1 border border-white/10 flex-wrap">
          {(['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                statusFilter === s ? 'bg-[#B8963E] text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              {s === 'ALL' ? t('all', lang) : t(`status_${s}` as any, lang)}
            </button>
          ))}
        </div>

        {/* Source filter (only if we have > 1 source) */}
        {sources.length > 1 && (
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-full py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-white/80 focus:outline-none focus:border-[#B8963E]"
          >
            <option value="ALL">{t('all', lang)} {t('source', lang)}</option>
            {sources.map(s => (
              <option key={s} value={s}>{sourceLabel(s)}</option>
            ))}
          </select>
        )}

        <button
          onClick={fetchLeads}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 text-white/80 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
          title={t('refresh', lang)}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {t('refresh', lang)}
        </button>
      </div>

      {/* ── Error banner ───────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* ── List ───────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center gap-6 border border-dashed border-white/10 rounded-2xl">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/30">
            <Inbox size={40} />
          </div>
          <p className="text-sm uppercase tracking-widest text-white/40">
            {leads.length === 0 ? t('empty', lang) : t('empty_filter', lang)}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((lead) => {
              const isExpanded = expandedId === lead.id;
              const wa = whatsappLink(lead.phone, lead.whatsapp);
              const isNew = lead.status === 'NEW';
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  key={lead.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isNew
                      ? 'bg-[#B8963E]/[0.04] border-[#B8963E]/30 hover:border-[#B8963E]/50'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Card header — always visible, click to expand */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                    className="w-full text-left p-6 flex items-start gap-4"
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-[#B8963E]/15 rounded-xl flex items-center justify-center text-[#B8963E] font-serif text-xl shrink-0">
                      {(lead.name || '?').charAt(0).toUpperCase()}
                    </div>

                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <h3 className="text-lg font-serif italic text-white truncate">
                          {lead.name || (lang === 'ES' ? 'Sin nombre' : lang === 'PT' ? 'Sem nome' : 'Unnamed')}
                        </h3>
                        <span className={`text-[9px] px-3 py-1 rounded-full border uppercase tracking-[0.2em] font-bold ${STATUS_COLORS[lead.status] || STATUS_COLORS.NEW}`}>
                          {t(`status_${lead.status}` as any, lang)}
                        </span>
                        {isNew && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#B8963E] text-white uppercase tracking-[0.2em] font-bold flex items-center gap-1">
                            <Sparkles size={10} /> {t('inbound', lang)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
                        {lead.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail size={12} className="text-white/30" /> {lead.email}
                          </span>
                        )}
                        {(lead.phone || lead.whatsapp) && (
                          <span className="flex items-center gap-1.5">
                            <Phone size={12} className="text-white/30" /> {lead.whatsapp || lead.phone}
                          </span>
                        )}
                        {lead.experience_type && (
                          <span className="flex items-center gap-1.5">
                            <MapPin size={12} className="text-white/30" /> {lead.experience_type}
                          </span>
                        )}
                        {lead.budget != null && (
                          <span className="flex items-center gap-1.5 text-[#B8963E] font-semibold">
                            <DollarSign size={12} /> {formatBudget(lead.budget, lang)}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 text-white/30">
                          <Calendar size={12} /> {formatRelative(lead.timestamp, lang)}
                        </span>
                      </div>
                    </div>

                    {/* Expand chevron */}
                    <div className="text-white/30 shrink-0 mt-1">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>

                  {/* Expanded body */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-white/10"
                      >
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Left: trip details + message */}
                          <div className="space-y-4">
                            <div className="space-y-3">
                              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#B8963E]">{t('trip', lang)}</p>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                {lead.experience_type && (
                                  <Field label={t('experience_type', lang)} value={lead.experience_type} />
                                )}
                                {lead.travel_dates && (
                                  <Field label={t('travel_dates', lang)} value={lead.travel_dates} />
                                )}
                                <Field label={t('budget', lang)} value={formatBudget(lead.budget, lang)} accent />
                                <Field label={t('source', lang)} value={sourceLabel(lead.source)} />
                                <Field label={t('received', lang)} value={formatDate(lead.timestamp, lang)} />
                              </div>
                            </div>

                            {lead.special_requests && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#B8963E] mb-2">{t('special_requests', lang)}</p>
                                <p className="text-sm text-white/70 leading-relaxed italic border-l-2 border-[#B8963E]/30 pl-4">
                                  "{lead.special_requests}"
                                </p>
                              </div>
                            )}

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#B8963E] mb-2">{t('message', lang)}</p>
                              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                                {lead.message || <span className="text-white/30 italic">{t('no_message', lang)}</span>}
                              </p>
                            </div>
                          </div>

                          {/* Right: actions */}
                          <div className="space-y-4">
                            <div className="space-y-3">
                              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#B8963E]">{t('contact', lang)}</p>
                              <div className="flex flex-col gap-2">
                                {lead.email && (
                                  <a
                                    href={`mailto:${lead.email}`}
                                    className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/80 hover:bg-white/10 hover:text-white transition-all"
                                  >
                                    <Mail size={16} className="text-[#B8963E]" />
                                    <span className="flex-1 truncate">{lead.email}</span>
                                    <ExternalLink size={12} className="text-white/30" />
                                  </a>
                                )}
                                {wa && (
                                  <a
                                    href={wa}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-300 hover:bg-emerald-500/20 transition-all"
                                  >
                                    <MessageSquare size={16} />
                                    <span className="flex-1">{lead.whatsapp || lead.phone}</span>
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                                {!lead.email && !wa && (
                                  <p className="text-xs text-white/30 italic px-4 py-3 border border-dashed border-white/10 rounded-xl">
                                    {lang === 'ES' ? 'Sin datos de contacto' : lang === 'PT' ? 'Sem dados de contato' : 'No contact info'}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Status transitions */}
                            <div className="space-y-2 pt-4 border-t border-white/10">
                              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-2">
                                {t('mark_contacted', lang).split(' ').slice(0, 1).join(' ')}…
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {lead.status !== 'CONTACTED' && (
                                  <StatusButton onClick={() => handleStatusUpdate(lead, 'CONTACTED')} disabled={statusUpdating === lead.id} variant="neutral">
                                    <MessageSquare size={12} /> {t('mark_contacted', lang)}
                                  </StatusButton>
                                )}
                                {lead.status !== 'QUALIFIED' && (
                                  <StatusButton onClick={() => handleStatusUpdate(lead, 'QUALIFIED')} disabled={statusUpdating === lead.id} variant="success">
                                    <Check size={12} /> {t('mark_qualified', lang)}
                                  </StatusButton>
                                )}
                                {lead.status !== 'WON' && (
                                  <StatusButton onClick={() => handleStatusUpdate(lead, 'WON')} disabled={statusUpdating === lead.id} variant="gold">
                                    <Sparkles size={12} /> {t('mark_won', lang)}
                                  </StatusButton>
                                )}
                                {lead.status !== 'LOST' && (
                                  <StatusButton onClick={() => handleStatusUpdate(lead, 'LOST')} disabled={statusUpdating === lead.id} variant="danger">
                                    <XIcon size={12} /> {t('mark_lost', lang)}
                                  </StatusButton>
                                )}
                                {lead.status !== 'NEW' && (
                                  <StatusButton onClick={() => handleStatusUpdate(lead, 'NEW')} disabled={statusUpdating === lead.id} variant="neutral" className="col-span-2">
                                    <RefreshCw size={12} /> {t('reopen', lang)}
                                  </StatusButton>
                                )}
                              </div>
                            </div>

                            {/* Delete (destructive, bottom) */}
                            <div className="pt-4 border-t border-white/10">
                              <button
                                onClick={() => handleDelete(lead)}
                                disabled={statusUpdating === lead.id}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-300/60 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-[10px] font-bold uppercase tracking-[0.3em] transition-all"
                              >
                                <Trash2 size={12} /> {t('delete', lang)}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

// ── Sub-components ──────────────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: number; accent: string }> = ({ label, value, accent }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-2">{label}</p>
    <p className={`text-3xl font-serif italic ${accent}`}>{value}</p>
  </div>
);

const Field: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div>
    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40 mb-1">{label}</p>
    <p className={`text-xs ${accent ? 'text-[#B8963E] font-semibold' : 'text-white/80'}`}>{value}</p>
  </div>
);

interface StatusButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'gold' | 'success' | 'danger' | 'neutral';
}
const StatusButton: React.FC<StatusButtonProps> = ({ variant, children, className = '', ...rest }) => {
  const styles: Record<string, string> = {
    gold:    'bg-[#B8963E] text-white hover:bg-[#B8963E]/90 border-[#B8963E]/40',
    success: 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border-emerald-500/30',
    danger:  'bg-red-500/10 text-red-300 hover:bg-red-500/20 border-red-500/30',
    neutral: 'bg-white/5 text-white/80 hover:bg-white/10 border-white/10',
  };
  return (
    <button
      {...rest}
      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
