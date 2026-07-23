import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Inbox, Mail, Phone, MessageSquare,
  Calendar, DollarSign, MapPin, ExternalLink,
  Check, X as XIcon, Loader2, AlertCircle,
  Trash2, RefreshCw, Sparkles, User,
} from 'lucide-react';
import { getSupplierSession } from '../services/supabase';
import { DataTable, type Column, type BulkAction } from './ui/DataTable';

// v1.8.0 Step 8: Leads tab converted to DataTable for visual consistency
// with the other admin tabs (SOCIOS, RESERVAS, CLIENTES). The expandable
// card pattern from Step 4 was great for fast outreach, but at 1k+ leads
// the user needs sort/search/page/bulk first. WhatsApp + email quick actions
// are now inline in the row (no expand required). Mark Won / Mark Lost
// are also inline as quick-action buttons. Full detail page lives at
// /admin/leads/[id] (Step 6) for the full conversation context.

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

const T_LEADS: Record<string, { EN: string; ES: string; PT: string }> = {
  search:           { EN: 'Search by name, email, or source...',
                      ES: 'Buscar por nombre, email u origen...',
                      PT: 'Pesquisar por nome, email ou origem...' },
  loading:          { EN: 'Loading leads...', ES: 'Cargando leads...', PT: 'Carregando leads...' },
  err_load:         { EN: 'Failed to load leads.',
                      ES: 'Error cargando leads.',
                      PT: 'Erro ao carregar leads.' },
  inbound:          { EN: 'Inbound', ES: 'Entrantes', PT: 'Entrantes' },
  total_count:      { EN: 'Total Leads', ES: 'Leads Totales', PT: 'Leads Totais' },
  new_count:        { EN: 'New', ES: 'Nuevos', PT: 'Novos' },
  qualified_count:  { EN: 'Qualified', ES: 'Calificados', PT: 'Qualificados' },
  won_count:        { EN: 'Won', ES: 'Ganados', PT: 'Ganados' },
  status_NEW:       { EN: 'New', ES: 'Nuevo', PT: 'Novo' },
  status_CONTACTED: { EN: 'Contacted', ES: 'Contactado', PT: 'Contatado' },
  status_QUALIFIED: { EN: 'Qualified', ES: 'Calificado', PT: 'Qualificado' },
  status_WON:       { EN: 'Won', ES: 'Ganado', PT: 'Ganho' },
  status_LOST:      { EN: 'Lost', ES: 'Perdido', PT: 'Perdido' },
  all:              { EN: 'All', ES: 'Todos', PT: 'Todos' },
  no_message:       { EN: 'No message provided.',
                      ES: 'Sin mensaje.',
                      PT: 'Sem mensagem.' },
  no_match:         { EN: 'No matches found', ES: 'Sin coincidencias', PT: 'Sem correspondências' },
  no_match_hint:    { EN: 'Try a different search or filter.', ES: 'Prueba con otra búsqueda o filtro.', PT: 'Tente outra pesquisa ou filtro.' },
  mark_won:         { EN: 'Mark Won', ES: 'Marcar Ganado', PT: 'Marcar Ganho' },
  mark_lost:        { EN: 'Mark Lost', ES: 'Marcar Perdido', PT: 'Marcar Perdido' },
  mark_contacted:   { EN: 'Mark Contacted', ES: 'Marcar Contactado', PT: 'Marcar Contatado' },
  delete:           { EN: 'Delete', ES: 'Eliminar', PT: 'Excluir' },
  refresh:          { EN: 'Refresh', ES: 'Actualizar', PT: 'Atualizar' },
  err_status:       { EN: 'Status update failed', ES: 'Error al actualizar estado', PT: 'Erro ao atualizar status' },
  err_delete:       { EN: 'Delete failed', ES: 'Error al eliminar', PT: 'Erro ao excluir' },
  confirm_delete:   { EN: 'Delete {n} lead(s)? This cannot be undone.',
                      ES: '¿Eliminar {n} lead(s)? No se puede deshacer.',
                      PT: 'Excluir {n} lead(s)? Não pode ser desfeito.' },
  bulk_contacted:   { EN: 'Mark Contacted', ES: 'Marcar Contactado', PT: 'Marcar Contatado' },
  bulk_qualified:   { EN: 'Mark Qualified', ES: 'Marcar Calificado', PT: 'Marcar Qualificado' },
  bulk_won:         { EN: 'Mark Won', ES: 'Marcar Ganado', PT: 'Marcar Ganho' },
  bulk_lost:        { EN: 'Mark Lost', ES: 'Marcar Perdido', PT: 'Marcar Perdido' },
  open:             { EN: 'Open', ES: 'Abrir', PT: 'Abrir' },
  open_detail:      { EN: 'View full detail', ES: 'Ver detalle completo', PT: 'Ver detalhe completo' },
};

const t = (key: keyof typeof T_LEADS, lang: Language): string => {
  const entry = T_LEADS[key];
  return (entry && (entry[lang] || entry.EN)) || '';
};

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
    return new Date(iso).toLocaleDateString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US');
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

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateStatus = async (lead: Lead, status: Lead['status']) => {
    setStatusUpdating(lead.id);
    try {
      const res = await authedFetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
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

  const deleteLead = async (lead: Lead) => {
    if (!confirm(t('confirm_delete', lang).replace('{n}', '1'))) return;
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

  // ── Bulk actions ───────────────────────────────────────────────────
  const bulkActions: BulkAction<Lead>[] = useMemo(() => [
    {
      key: 'contacted',
      label: t('bulk_contacted', lang),
      icon: <MessageSquare size={12} />,
      variant: 'neutral',
      onAction: async (rows) => {
        for (const l of rows) {
          await authedFetch(`/api/leads/${l.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'CONTACTED' }),
          });
        }
        await fetchLeads();
      },
    },
    {
      key: 'qualified',
      label: t('bulk_qualified', lang),
      icon: <Check size={12} />,
      variant: 'success',
      onAction: async (rows) => {
        for (const l of rows) {
          await authedFetch(`/api/leads/${l.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'QUALIFIED' }),
          });
        }
        await fetchLeads();
      },
    },
    {
      key: 'won',
      label: t('bulk_won', lang),
      icon: <Sparkles size={12} />,
      variant: 'gold',
      onAction: async (rows) => {
        for (const l of rows) {
          await authedFetch(`/api/leads/${l.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'WON' }),
          });
        }
        await fetchLeads();
      },
    },
    {
      key: 'lost',
      label: t('bulk_lost', lang),
      icon: <XIcon size={12} />,
      variant: 'danger',
      onAction: async (rows) => {
        for (const l of rows) {
          await authedFetch(`/api/leads/${l.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'LOST' }),
          });
        }
        await fetchLeads();
      },
    },
  ], [fetchLeads, lang]);

  // ── Columns ────────────────────────────────────────────────────────
  const columns: Column<Lead>[] = useMemo(() => [
    {
      key: 'name',
      label: { EN: 'Lead', ES: 'Lead', PT: 'Lead' },
      sortValue: (l) => l.name || '',
      render: (l) => {
        const isNew = l.status === 'NEW';
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-serif text-lg shrink-0 ${
              isNew ? 'bg-[#B8963E] text-white' : 'bg-[#B8963E]/15 text-[#B8963E]'
            }`}>
              {(l.name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate flex items-center gap-2">
                {l.name || (lang === 'ES' ? 'Sin nombre' : lang === 'PT' ? 'Sem nome' : 'Unnamed')}
                {isNew && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#B8963E] text-white uppercase tracking-[0.2em] font-bold">
                    {t('inbound', lang)}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-white/40 truncate">
                {l.email || l.phone || '—'}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'source',
      label: { EN: 'Source', ES: 'Origen', PT: 'Origem' },
      sortValue: (l) => l.source || '',
      hideOnMobile: true,
      width: 'w-40',
      render: (l) => <span className="text-xs text-white/60">{sourceLabel(l.source)}</span>,
    },
    {
      key: 'experience_type',
      label: { EN: 'Experience', ES: 'Experiencia', PT: 'Experiência' },
      sortValue: (l) => l.experience_type || '',
      hideOnMobile: true,
      render: (l) => <span className="text-xs text-white/60 truncate max-w-[160px]">{l.experience_type || '—'}</span>,
    },
    {
      key: 'budget',
      label: { EN: 'Budget', ES: 'Presupuesto', PT: 'Orçamento' },
      sortValue: (l) => l.budget ?? -1,
      align: 'right',
      width: 'w-32',
      render: (l) => l.budget != null ? (
        <span className="text-sm font-bold text-[#B8963E] font-serif italic">{formatBudget(l.budget, lang)}</span>
      ) : <span className="text-white/30">—</span>,
    },
    {
      key: 'status',
      label: { EN: 'Status', ES: 'Estado', PT: 'Estado' },
      sortValue: (l) => l.status,
      width: 'w-32',
      render: (l) => (
        <span className={`text-[9px] px-2.5 py-1 rounded-full border uppercase tracking-[0.2em] font-bold ${STATUS_COLORS[l.status] || STATUS_COLORS.NEW}`}>
          {t(`status_${l.status}` as any, lang)}
        </span>
      ),
    },
    {
      key: 'timestamp',
      label: { EN: 'Received', ES: 'Recibido', PT: 'Recebido' },
      sortValue: (l) => new Date(l.timestamp),
      hideOnMobile: true,
      align: 'right',
      width: 'w-32',
      render: (l) => <span className="text-[10px] text-white/40">{formatRelative(l.timestamp, lang)}</span>,
    },
  ], [lang]);

  // ── Counts for stat strip ──────────────────────────────────────────
  const counts = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => l.status === 'NEW').length,
    qualified: leads.filter(l => l.status === 'QUALIFIED' || l.status === 'WON').length,
    won: leads.filter(l => l.status === 'WON').length,
  }), [leads]);

  return (
    <div className="space-y-6">
      {/* ── Stat strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t('total_count', lang)} value={counts.total} accent="text-white" />
        <StatCard label={t('new_count', lang)} value={counts.new} accent="text-[#B8963E]" />
        <StatCard label={t('qualified_count', lang)} value={counts.qualified} accent="text-emerald-400" />
        <StatCard label={t('won_count', lang)} value={counts.won} accent="text-[#B8963E]" />
      </div>

      {/* ── DataTable ──────────────────────────────────────────────── */}
      <DataTable<Lead>
        rows={leads}
        loading={loading}
        error={error}
        columns={columns}
        rowKey={(l) => l.id}
        bulkActions={bulkActions}
        filters={{
          field: 'status',
          options: [
            { value: 'ALL',       label: { EN: 'All',        ES: 'Todos',        PT: 'Todos' } },
            { value: 'NEW',       label: { EN: 'New',        ES: 'Nuevo',        PT: 'Novo' } },
            { value: 'CONTACTED', label: { EN: 'Contacted',  ES: 'Contactado',   PT: 'Contatado' } },
            { value: 'QUALIFIED', label: { EN: 'Qualified',  ES: 'Calificado',   PT: 'Qualificado' } },
            { value: 'WON',       label: { EN: 'Won',        ES: 'Ganado',       PT: 'Ganho' } },
            { value: 'LOST',      label: { EN: 'Lost',       ES: 'Perdido',      PT: 'Perdido' } },
          ],
        }}
        searchFields={['name', 'email', 'source', 'message', 'experience_type', 'special_requests']}
        searchPlaceholder={t('search', lang)}
        defaultSort={{ key: 'timestamp', order: 'desc' }}
        pageSize={25}
        lang={lang}
        urlStateKey="leads"
        emptyTitle={{ EN: 'No leads yet', ES: 'Aún no hay leads', PT: 'Ainda não há leads' }}
        emptyHint={{ EN: 'Submissions from "Plan Your Trip" will land here.', ES: 'Los envíos de "Planifica tu Viaje" aparecerán aquí.', PT: 'Os envios de "Planeje Sua Viagem" aparecerão aqui.' }}
        onRowClick={(l) => { window.location.href = `/admin/leads/${l.id}`; }}
        rowActions={(l) => {
          const wa = whatsappLink(l.phone, l.whatsapp);
          return (
            <div className="flex items-center justify-end gap-1">
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors"
                  title={`WhatsApp: ${l.whatsapp || l.phone}`}
                >
                  <MessageSquare size={14} />
                </a>
              )}
              {l.email && (
                <a
                  href={`mailto:${l.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 text-white/40 hover:text-[#B8963E] hover:bg-white/5 rounded-lg transition-colors"
                  title={l.email}
                >
                  <Mail size={14} />
                </a>
              )}
              {l.status !== 'WON' && (
                <button
                  onClick={(e) => { e.stopPropagation(); updateStatus(l, 'WON'); }}
                  disabled={statusUpdating === l.id}
                  className="p-2 text-white/40 hover:text-[#B8963E] hover:bg-[#B8963E]/10 rounded-lg transition-colors disabled:opacity-50"
                  title={t('mark_won', lang)}
                >
                  <Sparkles size={14} />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); deleteLead(l); }}
                disabled={statusUpdating === l.id}
                className="p-2 text-white/40 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                title={t('delete', lang)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        }}
      />
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
