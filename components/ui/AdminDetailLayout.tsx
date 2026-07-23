import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, Loader2, AlertCircle, RefreshCw, ChevronRight,
} from 'lucide-react';
import { AdminSidebar, type AdminSection } from './AdminSidebar';

// v1.8.0 Step 6: Shared detail-page layout.
//
// Used by /admin/suppliers/[id], /admin/clients/[id], /admin/bookings/[id],
// /admin/leads/[id]. Provides:
//   * Sticky left AdminSidebar (consistent with the list views)
//   * Breadcrumb (back to list)
//   * Page header with status pill
//   * Tabs (Profile / Activity / Notes) — fully styled, no DOM coupling
//   * Loading + error + 404 states
//   * Trilingual via `t(key, lang)`
//   * URL state for active tab (`?tab=notes`)
//
// Data fetching is delegated via `useDetail<T>(url)` so each page just
// passes its endpoint and gets a { data, loading, error, refetch } tuple.

export type Language = 'EN' | 'ES' | 'PT';

export interface AdminDetailLayoutProps<T> {
  // ── Navigation ──
  section: AdminSection;       // which sidebar item to highlight
  backHref: string;            // e.g. '/admin' (will restore tab from URL state)
  backLabel: { EN: string; ES: string; PT: string };
  pageTitle?: string;          // e.g. "Searca Test" — the record's primary name
  pageEyebrow: { EN: string; ES: string; PT: string };
  statusPill?: React.ReactNode; // StatusPill component for header
  // Optional: custom title renderer. Use this when the title needs to include
  // a status pill or other dynamic content.
  renderHeader?: (data: T) => React.ReactNode;

  // ── Data ──
  endpoint: string;            // e.g. '/api/suppliers/S123'
  children: (data: T) => React.ReactNode; // render with fetched data
  // Optional: extra endpoints to prefetch (for tabs)
  prefetch?: string[];

  // ── Tabs ──
  tabs?: Array<{
    key: string;
    label: { EN: string; ES: string; PT: string };
    render: (data: T) => React.ReactNode;
  }>;
  defaultTab?: string;

  // ── Admin context ──
  lang: Language;
  signedInEmail?: string | null;
  onSignOut?: () => void;
  counts?: Partial<Record<AdminSection, number>>;
  pendingSuppliersCount?: number;
  newLeadsCount?: number;

  // ── Actions ──
  headerActions?: (data: T) => React.ReactNode; // right-aligned in the page header (function so it can access data)
}

function tx(value: { EN: string; ES: string; PT: string } | string | undefined, lang: Language): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.EN || '';
}

async function authedFetchJSON<T>(url: string): Promise<T> {
  const mod = await import('../../services/supabase');
  const session = await mod.getSupplierSession();
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

export function useDetail<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    authedFetchJSON<T>(endpoint)
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message || 'load failed'); setData(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [endpoint, reloadKey]);

  return { data, loading, error, refetch, setData };
}

// Re-export for convenience
import { useCallback } from 'react';

export function AdminDetailLayout<T extends Record<string, any>>({
  section,
  backHref,
  backLabel,
  pageTitle,
  pageEyebrow,
  statusPill,
  endpoint,
  children,
  tabs,
  defaultTab,
  lang,
  signedInEmail,
  onSignOut,
  counts,
  pendingSuppliersCount,
  newLeadsCount,
  headerActions,
}: AdminDetailLayoutProps<T>) {
  const { data, loading, error, refetch, setData } = useDetail<T>(endpoint);
  const [activeTab, setActiveTab] = useState<string>(defaultTab || tabs?.[0]?.key || '');

  // URL-sync the active tab
  useEffect(() => {
    if (typeof window === 'undefined' || !tabs || tabs.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t && tabs.find(x => x.key === t)) setActiveTab(t);
  }, [tabs]);

  const setTab = (key: string) => {
    setActiveTab(key);
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (key === defaultTab) params.delete('tab');
    else params.set('tab', key);
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  };

  const renderBody = (d: T) => {
    if (tabs && tabs.length > 0 && activeTab) {
      const tab = tabs.find(t => t.key === activeTab);
      if (tab) return tab.render(d);
    }
    return children(d);
  };

  return (
    <div className="min-h-screen bg-[#0a1518] text-white flex">
      <AdminSidebar
        activeSection={section}
        onSelect={(s) => { window.location.href = s === section ? backHref : `/admin#${s.toLowerCase()}`; }}
        lang={lang}
        signedInEmail={signedInEmail ?? null}
        onSignOut={onSignOut}
        counts={counts}
        pendingSuppliersCount={pendingSuppliersCount}
        newLeadsCount={newLeadsCount}
      />

      <main className="flex-1 min-w-0 px-6 md:px-10 py-10 space-y-8 max-w-[1400px]">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/40">
          <a href={backHref} className="hover:text-white transition-colors flex items-center gap-1.5">
            <ArrowLeft size={12} />
            {tx(backLabel, lang)}
          </a>
          <ChevronRight size={10} className="text-white/20" />
          <span className="text-white/60">{data ? (pageTitle || (data as any).name || (data as any).business_name || (data as any).guest_name || (data as any).id?.slice(0, 8) || '...') : (pageTitle || '...')}</span>
        </nav>

        {/* Page header */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-2">
          <div>
            <p className="text-[10px] text-[#B8963E] uppercase tracking-[0.4em] font-bold mb-2">{tx(pageEyebrow, lang)}</p>
            {data && renderHeader ? (
              <h1 className="text-3xl md:text-4xl font-serif italic text-white flex items-center gap-3 flex-wrap">
                {renderHeader(data)}
              </h1>
            ) : (
              <h1 className="text-3xl md:text-4xl font-serif italic text-white flex items-center gap-3 flex-wrap">
                {pageTitle}
                {statusPill}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              disabled={loading}
              className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
              title={lang === 'ES' ? 'Actualizar' : lang === 'PT' ? 'Atualizar' : 'Refresh'}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            {data && headerActions && headerActions(data)}
          </div>
        </div>

        {/* Tabs */}
        {tabs && tabs.length > 0 && (
          <div className="flex items-center gap-1 border-b border-white/10 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-3 text-[10px] font-bold uppercase tracking-[0.3em] transition-all whitespace-nowrap border-b-2 -mb-px ${
                  activeTab === t.key
                    ? 'text-[#B8963E] border-[#B8963E]'
                    : 'text-white/40 border-transparent hover:text-white/80'
                }`}
              >
                {tx(t.label, lang)}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        {loading && !data ? (
          <div className="flex items-center justify-center h-64 gap-3">
            <Loader2 className="animate-spin text-[#B8963E]" size={28} />
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">
              {lang === 'ES' ? 'Cargando…' : lang === 'PT' ? 'Carregando…' : 'Loading…'}
            </span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-300 font-medium mb-1">
                {lang === 'ES' ? 'Error al cargar' : lang === 'PT' ? 'Erro ao carregar' : 'Failed to load'}
              </p>
              <p className="text-xs text-red-300/70">{error}</p>
            </div>
            <button
              onClick={refetch}
              className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/80 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-white/10"
            >
              {lang === 'ES' ? 'Reintentar' : lang === 'PT' ? 'Tentar novamente' : 'Retry'}
            </button>
          </div>
        ) : !data ? (
          <div className="rounded-2xl border border-white/10 p-8 text-center text-white/40">
            <AlertCircle size={32} className="mx-auto mb-3 text-white/20" />
            <p className="text-sm">
              {lang === 'ES' ? 'Registro no encontrado' : lang === 'PT' ? 'Registro não encontrado' : 'Record not found'}
            </p>
          </div>
        ) : (
          <motion.div
            key={activeTab || 'body'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            {renderBody(data)}
          </motion.div>
        )}
      </main>
    </div>
  );
}

// ── Reusable building blocks for detail pages ─────────────────────────
export const DetailField: React.FC<{
  label: { EN: string; ES: string; PT: string } | string;
  value: React.ReactNode;
  mono?: boolean;
  accent?: boolean;
  lang: Language;
}> = ({ label, value, mono, accent, lang }) => {
  const lbl = typeof label === 'string' ? label : (label[lang] || label.EN);
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40 mb-1.5">{lbl}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''} ${accent ? 'text-[#B8963E] font-semibold' : 'text-white/90'}`}>
        {value || <span className="text-white/30">—</span>}
      </p>
    </div>
  );
};

export const DetailCard: React.FC<{
  title: { EN: string; ES: string; PT: string } | string;
  children: React.ReactNode;
  lang: Language;
  actions?: React.ReactNode;
}> = ({ title, children, lang, actions }) => {
  const t = typeof title === 'string' ? title : (title[lang] || title.EN);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#B8963E]">{t}</h3>
        {actions}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
};

export const DetailGrid: React.FC<{ children: React.ReactNode; cols?: number }> = ({ children, cols = 2 }) => (
  <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-x-8 gap-y-4`}>{children}</div>
);
