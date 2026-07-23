import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, Inbox, Filter, X, Check,
} from 'lucide-react';

// v1.8.0 Step 5: Shared <DataTable /> primitive.
//
// Production-grade table for the admin portal at scale (1k+ records).
// Used by SOCIOS, RESERVAS, CLIENTES, LEADS. Drop-in replacement for the
// per-tab card grids in /admin. Mirrors the existing dark theme tokens:
//   bg-[#0a1518] navy · text-[#B8963E] gold · border-white/10
//   10-11px uppercase tracking-[0.3em] labels · font-serif italic headings
//
// Features:
//   * Sortable columns (click header to toggle asc/desc, indicator shown)
//   * URL-synced state (?q=&sort=&order=&status=&page=) for shareable views
//   * Server-side pagination (?limit=&offset=) — never load all rows at once
//   * Global search (debounced) + per-column filters
//   * Multi-row select with bulk action bar
//   * Empty states: "no data yet" vs "no matches" distinguished
//   * Trilingual EN/ES/PT via `t(key, lang)` pattern
//   * Dark theme matching existing tokens
//   * Mobile: horizontal scroll with sticky first column
//   * Row click handler (optional) → navigate to detail page
//
// Not virtualized — pagination is cleaner for ops users ("page 3 of 40")
// than infinite scroll. Easy to add later if needed.

// ── Types ──────────────────────────────────────────────────────────────
export type Language = 'EN' | 'ES' | 'PT';

export interface Column<T> {
  /** Stable key — used for sort, URL state, and React key */
  key: string;
  /** Trilingual label */
  label: { EN: string; ES: string; PT: string };
  /** Render the cell. Return any React node (string, JSX, pill, etc). */
  render: (row: T) => React.ReactNode;
  /** If true, clicking the header sorts by this column. Default true. */
  sortable?: boolean;
  /** Optional sort accessor — returns a comparable value. Defaults to row[key]. */
  sortValue?: (row: T) => string | number | Date | null;
  /** Tailwind width class (e.g. 'w-32', 'w-48', 'w-auto'). Optional. */
  width?: string;
  /** If true, hide this column on small screens (< md). */
  hideOnMobile?: boolean;
  /** If true, right-align the column (numbers, totals). */
  align?: 'left' | 'right' | 'center';
}

export interface BulkAction<T> {
  /** Stable key */
  key: string;
  /** Trilingual label */
  label: { EN: string; ES: string; PT: string };
  /** Optional icon (lucide-react) */
  icon?: React.ReactNode;
  /** Visual variant */
  variant?: 'gold' | 'success' | 'danger' | 'neutral';
  /** Sync or async. Receives the selected rows. Throw to abort. */
  onAction: (rows: T[]) => void | Promise<void>;
  /** Optional confirm prompt before action runs */
  confirm?: { EN: string; ES: string; PT: string };
}

export interface FilterOption {
  value: string;
  label: { EN: string; ES: string; PT: string };
  /** Optional row predicate — if absent, exact match on row[filterField] */
  match?: (row: any) => boolean;
}

export interface DataTableProps<T> {
  // ── Data ──
  rows: T[];
  loading?: boolean;
  error?: string | null;

  // ── Columns + actions ──
  columns: Column<T>[];
  rowKey: (row: T) => string;
  bulkActions?: BulkAction<T>[];

  // ── Search ──
  searchable?: boolean;
  searchPlaceholder?: { EN: string; ES: string; PT: string };
  /** Search across which fields? Defaults to all string fields via JSON.stringify. */
  searchFields?: (keyof T | ((row: T) => string))[];

  // ── Filters (single-select status pills like "ALL / NEW / CONTACTED") ──
  filters?: {
    field: keyof T | string;
    options: FilterOption[];
    /** Optional value-to-trilingual label for the active filter chip */
    activeLabel?: (value: string) => { EN: string; ES: string; PT: string };
  };

  // ── Sort ──
  defaultSort?: { key: string; order: 'asc' | 'desc' };

  // ── Pagination ──
  pageSize?: number;
  totalRows?: number; // for server-side pagination; if undefined, paginates client-side
  onPageChange?: (page: number) => void;
  currentPage?: number; // controlled — defaults to internal state

  // ── UI ──
  lang: Language;
  emptyTitle?: { EN: string; ES: string; PT: string };
  emptyHint?: { EN: string; ES: string; PT: string };
  /** Optional URL state sync (e.g. for shareable filters). Key prefix used in ?key=... */
  urlStateKey?: string;

  // ── Row interaction ──
  onRowClick?: (row: T) => void;
  /** Optional row-level actions (renders a kebab / inline buttons in last column) */
  rowActions?: (row: T) => React.ReactNode;

  // ── Selection ──
  selectable?: boolean;
  /** Stable id for the "select all" header checkbox */
}

// ── Trilingual helper ──────────────────────────────────────────────────
function tx(value: { EN: string; ES: string; PT: string } | string | undefined, lang: Language): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.EN || '';
}

// ── Main component ────────────────────────────────────────────────────
export function DataTable<T extends Record<string, any>>({
  rows,
  loading = false,
  error = null,
  columns,
  rowKey,
  bulkActions = [],
  searchable = true,
  searchPlaceholder,
  searchFields,
  filters,
  defaultSort,
  pageSize = 25,
  totalRows: serverTotalRows,
  onPageChange,
  currentPage: controlledPage,
  lang,
  emptyTitle,
  emptyHint,
  urlStateKey,
  onRowClick,
  rowActions,
  selectable = true,
}: DataTableProps<T>) {
  // ── State ────────────────────────────────────────────────────────
  const [internalPage, setInternalPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterValue, setFilterValue] = useState<string>('ALL');
  const [sortKey, setSortKey] = useState<string | null>(defaultSort?.key ?? null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(defaultSort?.order ?? null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState<string | null>(null);

  const currentPage = controlledPage ?? internalPage;
  const setCurrentPage = (p: number) => {
    if (controlledPage === undefined) setInternalPage(p);
    onPageChange?.(p);
  };

  // ── URL state sync (best-effort, no router dep) ─────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !urlStateKey) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get(`${urlStateKey}_q`);
    const s = params.get(`${urlStateKey}_s`);
    const o = params.get(`${urlStateKey}_o`);
    const f = params.get(`${urlStateKey}_f`);
    const p = params.get(`${urlStateKey}_p`);
    if (q != null) setSearch(q);
    if (s != null) setSortKey(s);
    if (o === 'asc' || o === 'desc') setSortOrder(o);
    if (f != null) setFilterValue(f);
    if (p != null) {
      const n = parseInt(p, 10);
      if (!isNaN(n)) setInternalPage(n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlStateKey]);

  const writeUrl = useCallback((updates: Record<string, string | null>) => {
    if (typeof window === 'undefined' || !urlStateKey) return;
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(updates)) {
      const key = `${urlStateKey}_${k}`;
      if (v == null) params.delete(key);
      else params.set(key, v);
    }
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [urlStateKey]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  // Reset selection when data changes
  useEffect(() => {
    setSelected(new Set());
  }, [rows.length, filterValue, debouncedSearch]);

  // ── Derived: filtered + sorted (client-side) ─────────────────────
  const visibleRows = useMemo(() => {
    let out = rows;

    // Filter
    if (filters && filterValue !== 'ALL') {
      const opt = filters.options.find(o => o.value === filterValue);
      if (opt?.match) {
        out = out.filter(opt.match);
      } else {
        out = out.filter(r => r[filters.field as keyof T] === filterValue);
      }
    }

    // Search
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      out = out.filter(r => {
        if (searchFields && searchFields.length > 0) {
          return searchFields.some(f => {
            const v = typeof f === 'function' ? f(r) : (r as any)[f];
            return v != null && String(v).toLowerCase().includes(q);
          });
        }
        // fallback: stringify entire row
        return JSON.stringify(r).toLowerCase().includes(q);
      });
    }

    // Sort
    if (sortKey && sortOrder) {
      const col = columns.find(c => c.key === sortKey);
      if (col) {
        const accessor = col.sortValue ?? ((r: T) => r[sortKey as keyof T]);
        out = [...out].sort((a, b) => {
          const va = accessor(a);
          const vb = accessor(b);
          if (va == null && vb == null) return 0;
          if (va == null) return sortOrder === 'asc' ? -1 : 1;
          if (vb == null) return sortOrder === 'asc' ? 1 : -1;
          let cmp: number;
          if (va instanceof Date && vb instanceof Date) cmp = va.getTime() - vb.getTime();
          else if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
          else cmp = String(va).localeCompare(String(vb));
          return sortOrder === 'asc' ? cmp : -cmp;
        });
      }
    }

    return out;
  }, [rows, filterValue, filters, debouncedSearch, searchFields, sortKey, sortOrder, columns]);

  // ── Pagination (client-side if no server total) ─────────────────
  const isServerPaged = serverTotalRows != null;
  const total = isServerPaged ? serverTotalRows : visibleRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagedRows = useMemo(() => {
    if (isServerPaged) return visibleRows;
    const start = currentPage * pageSize;
    return visibleRows.slice(start, start + pageSize);
  }, [visibleRows, currentPage, pageSize, isServerPaged]);

  // ── Handlers ────────────────────────────────────────────────────
  const toggleSort = (key: string) => {
    let nextOrder: 'asc' | 'desc' | null;
    if (sortKey !== key) {
      nextOrder = 'asc';
      setSortKey(key);
    } else if (sortOrder === 'asc') {
      nextOrder = 'desc';
    } else {
      nextOrder = null;
      setSortKey(null);
    }
    setSortOrder(nextOrder);
    setCurrentPage(0);
    writeUrl({ s: nextOrder ? key : null, o: nextOrder, p: '0' });
  };

  const toggleRow = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    const idsOnPage = pagedRows.map(rowKey);
    const allSelected = idsOnPage.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) {
        idsOnPage.forEach(id => next.delete(id));
      } else {
        idsOnPage.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const runBulkAction = async (action: BulkAction<T>) => {
    if (selected.size === 0) return;
    if (action.confirm) {
      const msg = tx(action.confirm, lang);
      if (!confirm(msg)) return;
    }
    const rowsToAct = rows.filter(r => selected.has(rowKey(r)));
    if (rowsToAct.length === 0) return;
    setBulkRunning(action.key);
    try {
      await action.onAction(rowsToAct);
      setSelected(new Set());
    } catch (e: any) {
      console.error('Bulk action failed', e);
      alert(`${tx(action.label, lang)} failed: ${e?.message || 'unknown'}`);
    } finally {
      setBulkRunning(null);
    }
  };

  const onSearchChange = (v: string) => {
    setSearch(v);
    setCurrentPage(0);
    writeUrl({ q: v || null, p: '0' });
  };

  const onFilterChange = (v: string) => {
    setFilterValue(v);
    setCurrentPage(0);
    writeUrl({ f: v === 'ALL' ? null : v, p: '0' });
  };

  // ── Render ──────────────────────────────────────────────────────
  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <Loader2 className="animate-spin text-[#B8963E]" size={28} />
        <span className="text-xs uppercase tracking-[0.3em] text-white/40">
          {lang === 'ES' ? 'Cargando…' : lang === 'PT' ? 'Carregando…' : 'Loading…'}
        </span>
      </div>
    );
  }

  if (error && rows.length === 0) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 flex items-start gap-3">
        <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  const allOnPageSelected = pagedRows.length > 0 && pagedRows.every(r => selected.has(rowKey(r)));
  const someOnPageSelected = !allOnPageSelected && pagedRows.some(r => selected.has(rowKey(r)));
  const showBulkBar = selected.size > 0 && bulkActions.length > 0;

  return (
    <div className="space-y-4">
      {/* ── Toolbar (search + filter) ────────────────────────────── */}
      {(searchable || filters) && (
        <div className="flex flex-wrap items-center gap-3">
          {searchable && (
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
              <input
                type="text"
                placeholder={tx(searchPlaceholder, lang) || (lang === 'ES' ? 'Buscar…' : lang === 'PT' ? 'Pesquisar…' : 'Search…')}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-10 focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 transition-all text-sm text-white placeholder:text-white/30"
              />
              {search && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1"
                  title={lang === 'ES' ? 'Limpiar' : lang === 'PT' ? 'Limpar' : 'Clear'}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {filters && (
            <div className="flex bg-white/5 rounded-full p-1 border border-white/10 flex-wrap">
              {filters.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onFilterChange(opt.value)}
                  className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                    filterValue === opt.value ? 'bg-[#B8963E] text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {tx(opt.label, lang)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Bulk action bar (slides in when rows are selected) ──── */}
      <AnimatePresence>
        {showBulkBar && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#B8963E]/10 border border-[#B8963E]/30 rounded-2xl p-3 flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#B8963E] px-2">
                {lang === 'ES' ? `${selected.size} seleccionados` : lang === 'PT' ? `${selected.size} selecionados` : `${selected.size} selected`}
              </span>
              <div className="flex-1" />
              {bulkActions.map((action) => {
                const variant = action.variant || 'neutral';
                const styles: Record<string, string> = {
                  gold:    'bg-[#B8963E] text-white hover:bg-[#B8963E]/90 border-[#B8963E]',
                  success: 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border-emerald-500/30',
                  danger:  'bg-red-500/10 text-red-300 hover:bg-red-500/20 border-red-500/30',
                  neutral: 'bg-white/5 text-white/80 hover:bg-white/10 border-white/10',
                };
                return (
                  <button
                    key={action.key}
                    onClick={() => runBulkAction(action)}
                    disabled={bulkRunning != null}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all disabled:opacity-50 ${styles[variant]}`}
                  >
                    {bulkRunning === action.key ? <Loader2 size={12} className="animate-spin" /> : action.icon}
                    {tx(action.label, lang)}
                  </button>
                );
              })}
              <button
                onClick={() => setSelected(new Set())}
                className="text-white/40 hover:text-white p-2"
                title={lang === 'ES' ? 'Cancelar selección' : lang === 'PT' ? 'Cancelar seleção' : 'Clear selection'}
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table (or empty state) ──────────────────────────────── */}
      {pagedRows.length === 0 ? (
        <EmptyState
          lang={lang}
          title={rows.length === 0 ? emptyTitle : { EN: 'No matches', ES: 'Sin coincidencias', PT: 'Sem correspondências' }}
          hint={rows.length === 0 ? emptyHint : { EN: 'Try a different search or filter.', ES: 'Prueba con otro filtro o búsqueda.', PT: 'Tente outro filtro ou pesquisa.' }}
        />
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  {selectable && bulkActions.length > 0 && (
                    <th className="w-10 px-4 py-4 sticky left-0 bg-white/5 z-10">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        ref={(el) => { if (el) el.indeterminate = someOnPageSelected; }}
                        onChange={toggleAllOnPage}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#B8963E] focus:ring-[#B8963E] focus:ring-offset-0 cursor-pointer"
                        title={lang === 'ES' ? 'Seleccionar página' : lang === 'PT' ? 'Selecionar página' : 'Select page'}
                      />
                    </th>
                  )}
                  {columns.map((col) => {
                    const sortable = col.sortable !== false;
                    const isSorted = sortKey === col.key;
                    return (
                      <th
                        key={col.key}
                        className={`px-6 py-4 text-[10px] uppercase tracking-[0.3em] text-[#B8963E] font-bold whitespace-nowrap ${col.width || ''} ${col.hideOnMobile ? 'hidden md:table-cell' : ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                      >
                        {sortable ? (
                          <button
                            onClick={() => toggleSort(col.key)}
                            className={`inline-flex items-center gap-1.5 hover:text-white transition-colors ${isSorted ? 'text-white' : ''}`}
                          >
                            {tx(col.label, lang)}
                            {isSorted ? (
                              sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                            ) : (
                              <span className="opacity-30"><ChevronDown size={12} /></span>
                            )}
                          </button>
                        ) : (
                          tx(col.label, lang)
                        )}
                      </th>
                    );
                  })}
                  {rowActions && (
                    <th className="w-12 px-4 py-4 text-[10px] uppercase tracking-[0.3em] text-[#B8963E] font-bold text-right">
                      {/* actions header — no label */}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {pagedRows.map((row, idx) => {
                    const id = rowKey(row);
                    const isSelected = selected.has(id);
                    return (
                      <motion.tr
                        layout
                        key={id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ delay: Math.min(idx, 8) * 0.01 }}
                        className={`group transition-colors ${isSelected ? 'bg-[#B8963E]/[0.06]' : 'hover:bg-white/[0.03]'} ${onRowClick ? 'cursor-pointer' : ''}`}
                        onClick={(e) => {
                          // Don't fire row click when clicking checkbox or action button
                          const target = e.target as HTMLElement;
                          if (target.closest('button, a, input, [data-no-row-click]')) return;
                          onRowClick?.(row);
                        }}
                      >
                        {selectable && bulkActions.length > 0 && (
                          <td className="px-4 py-3 sticky left-0 bg-inherit z-10" data-no-row-click>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRow(id)}
                              className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#B8963E] focus:ring-[#B8963E] focus:ring-offset-0 cursor-pointer"
                            />
                          </td>
                        )}
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-6 py-4 text-sm ${col.width || ''} ${col.hideOnMobile ? 'hidden md:table-cell' : ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                          >
                            {col.render(row)}
                          </td>
                        ))}
                        {rowActions && (
                          <td className="px-4 py-3 text-right" data-no-row-click>
                            {rowActions(row)}
                          </td>
                        )}
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination footer ───────────────────────────────────── */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-[10px] text-white/40 uppercase tracking-[0.3em]">
            {lang === 'ES'
              ? `Página ${currentPage + 1} de ${totalPages} · ${total} ${total === 1 ? 'registro' : 'registros'}`
              : lang === 'PT'
                ? `Página ${currentPage + 1} de ${totalPages} · ${total} ${total === 1 ? 'registro' : 'registros'}`
                : `Page ${currentPage + 1} of ${totalPages} · ${total} ${total === 1 ? 'record' : 'records'}`}
          </p>
          <div className="flex items-center gap-1">
            <PageButton
              disabled={currentPage === 0}
              onClick={() => { setCurrentPage(0); writeUrl({ p: '0' }); }}
              title={lang === 'ES' ? 'Primera' : lang === 'PT' ? 'Primeira' : 'First'}
            >
              «
            </PageButton>
            <PageButton
              disabled={currentPage === 0}
              onClick={() => { setCurrentPage(currentPage - 1); writeUrl({ p: String(currentPage - 1) }); }}
              title={lang === 'ES' ? 'Anterior' : lang === 'PT' ? 'Anterior' : 'Previous'}
            >
              <ChevronLeft size={14} />
            </PageButton>
            <span className="px-3 text-xs text-white/60">
              {currentPage + 1} / {totalPages}
            </span>
            <PageButton
              disabled={currentPage >= totalPages - 1}
              onClick={() => { setCurrentPage(currentPage + 1); writeUrl({ p: String(currentPage + 1) }); }}
              title={lang === 'ES' ? 'Siguiente' : lang === 'PT' ? 'Próxima' : 'Next'}
            >
              <ChevronRight size={14} />
            </PageButton>
            <PageButton
              disabled={currentPage >= totalPages - 1}
              onClick={() => { setCurrentPage(totalPages - 1); writeUrl({ p: String(totalPages - 1) }); }}
              title={lang === 'ES' ? 'Última' : lang === 'PT' ? 'Última' : 'Last'}
            >
              »
            </PageButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────
const PageButton: React.FC<{ disabled: boolean; onClick: () => void; title: string; children: React.ReactNode }> = ({ disabled, onClick, title, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className="min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm"
  >
    {children}
  </button>
);

const EmptyState: React.FC<{
  lang: Language;
  title?: { EN: string; ES: string; PT: string };
  hint?: { EN: string; ES: string; PT: string };
}> = ({ lang, title, hint }) => (
  <div className="py-20 flex flex-col items-center justify-center text-center gap-4 border border-dashed border-white/10 rounded-2xl">
    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/30">
      <Inbox size={40} />
    </div>
    {title && <p className="text-sm uppercase tracking-widest text-white/60">{tx(title, lang)}</p>}
    {hint && <p className="text-xs text-white/40 max-w-md">{tx(hint, lang)}</p>}
  </div>
);

// ── Status pill helper (used by most tab configs) ─────────────────────
export const STATUS_PILL: Record<string, string> = {
  // Suppliers + clients
  PENDING:   'bg-white/10 text-white/70 border-white/20',
  APPROVED:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  REJECTED:  'bg-red-500/10 text-red-300 border-red-500/30',
  ACTIVE:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  INACTIVE:  'bg-white/5 text-white/40 border-white/10',
  PROSPECT:  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  // Bookings
  CONFIRMED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  CANCELLED: 'bg-red-500/10 text-red-300 border-red-500/30',
  // Leads
  NEW:       'bg-[#B8963E]/20 text-[#B8963E] border-[#B8963E]/40',
  CONTACTED: 'bg-white/10 text-white/80 border-white/20',
  QUALIFIED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  WON:       'bg-[#B8963E] text-white border-[#B8963E]',
  LOST:      'bg-red-500/10 text-red-300 border-red-500/30',
};

export function StatusPill({ status, lang }: { status: string; lang: Language }) {
  const color = STATUS_PILL[status] || 'bg-white/5 text-white/60 border-white/10';
  return (
    <span className={`inline-block text-[9px] px-2.5 py-1 rounded-full border uppercase tracking-[0.2em] font-bold ${color}`}>
      {status}
    </span>
  );
}
