import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, Trash2, Loader2, Plus, Search, AlertCircle, Eye, EyeOff,
  Check, Image as ImageIcon, Tag as TagIcon, ArchiveRestore,
} from 'lucide-react';
import { TrilingualField } from './TrilingualField';
import { ImageField } from './ImageField';
import { ItineraryField } from './ItineraryField';
import { ExperienceWizard } from './ExperienceWizard';
import type { ExperienceItineraryDay } from '../../services/experiences';
import { authedFetch, getAccessToken } from '../../services/supabase';

// ── EntityEditor (v1.8.0 Step 11) ─────────────────────────────────────────────
// One generic CRUD component for any entity (Experiences, Services, Suppliers).
// Configured by an EntityConfig prop. Powered by the same DataTable primitive
// that the existing admin tabs use. Trilingual everywhere.
//
// Used in /admin: Experiences tab, Services tab, Suppliers tab.
// Each admin section renders <EntityEditor config={X_CONFIG} lang={lang} />

// ── Field definitions ─────────────────────────────────────────────────────────

export type FieldDef =
  | { kind: 'text'; key: string; label: Trilingual; required?: boolean; maxLength?: number; placeholder?: Trilingual; pattern?: string; help?: Trilingual; defaultValue?: any }
  | { kind: 'textarea'; key: string; label: Trilingual; required?: boolean; maxLength?: number; rows?: number; placeholder?: Trilingual; help?: Trilingual; defaultValue?: any }
  | { kind: 'number'; key: string; label: Trilingual; required?: boolean; min?: number; max?: number; step?: number; help?: Trilingual; defaultValue?: any }
  | { kind: 'select'; key: string; label: Trilingual; required?: boolean; options: Array<{ value: string; label: Trilingual }> | DynamicOptions; help?: Trilingual; defaultValue?: any }
  | { kind: 'multiselect'; key: string; label: Trilingual; required?: boolean; options: Array<{ value: string; label: Trilingual }> | DynamicOptions; help?: Trilingual; defaultValue?: any }
  | { kind: 'tags'; key: string; label: Trilingual; hint?: Trilingual; help?: Trilingual; defaultValue?: any }
  | { kind: 'image'; key: string; label: Trilingual; multiple?: boolean; max?: number; help?: Trilingual; defaultValue?: any }
  | { kind: 'trilingual'; key: string; label: Trilingual; required?: boolean; subKind: 'text' | 'textarea'; maxLength?: number; rows?: number; help?: Trilingual; defaultValue?: any }
  | { kind: 'boolean'; key: string; label: Trilingual; help?: Trilingual; defaultValue?: any }
  | { kind: 'itinerary'; key: string; label: Trilingual; help?: Trilingual; defaultValue?: any };

export type Trilingual = { EN: string; ES: string; PT: string };

// Dynamic options: a string like 'dynamic:/api/suppliers?fields=id,business_name&status=APPROVED'
// is resolved at runtime by fetching the URL. The endpoint must return
// [{ value, label_en, label_es, label_pt }, ...].
export type DynamicOptions = string;

export interface EntityConfig {
  name: Trilingual;
  nameSingular: Trilingual;
  apiBase: string;          // e.g. '/api/experiences'
  fields: FieldDef[];
  defaultSort?: { key: string; order: 'asc' | 'desc' };
  // Pre-defined filter buttons shown above the table
  filters?: Array<{ value: string; label: Trilingual }>;
  // Display the row's primary identifier (defaults to 'id')
  idKey?: string;
}

interface EntityEditorProps {
  config: EntityConfig;
  lang: 'EN' | 'ES' | 'PT';
  signedInEmail?: string | null;
}

interface DynamicOptionItem {
  value: string;
  label_en: string;
  label_es: string;
  label_pt: string;
}

const T = {
  search:     { EN: 'Search', ES: 'Buscar', PT: 'Pesquisar' },
  addNew:     { EN: 'Add', ES: 'Añadir', PT: 'Adicionar' },
  save:       { EN: 'Save', ES: 'Guardar', PT: 'Salvar' },
  saving:     { EN: 'Saving…', ES: 'Guardando…', PT: 'Salvando…' },
  cancel:     { EN: 'Cancel', ES: 'Cancelar', PT: 'Cancelar' },
  delete:     { EN: 'Delete', ES: 'Eliminar', PT: 'Remover' },
  confirmDel: { EN: 'Delete this record? This cannot be undone.', ES: '¿Eliminar este registro? Esta acción no se puede deshacer.', PT: 'Remover este registro? Esta ação não pode ser desfeita.' },
  edit:       { EN: 'Edit', ES: 'Editar', PT: 'Editar' },
  publish:    { EN: 'Publish', ES: 'Publicar', PT: 'Publicar' },
  unpublish:  { EN: 'Unpublish', ES: 'Despublicar', PT: 'Despublicar' },
  archived:   { EN: 'Archived', ES: 'Archivado', PT: 'Arquivado' },
  noResults:  { EN: 'No records', ES: 'Sin registros', PT: 'Sem registros' },
  noMatch:    { EN: 'No matches', ES: 'Sin coincidencias', PT: 'Sem resultados' },
  addPrompt:  { EN: 'Add the first one', ES: 'Añade el primero', PT: 'Adicione o primeiro' },
  error:      { EN: 'Something went wrong', ES: 'Algo salió mal', PT: 'Algo deu errado' },
  required:   { EN: 'Required', ES: 'Requerido', PT: 'Obrigatório' },
  activeLang: { EN: 'Active language', ES: 'Idioma activo', PT: 'Idioma ativo' },
  close:      { EN: 'Close', ES: 'Cerrar', PT: 'Fechar' },
};

// ── Main component ────────────────────────────────────────────────────────────

export const EntityEditor: React.FC<EntityEditorProps> = ({ config, lang, signedInEmail }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('ALL');
  const [editing, setEditing] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const idKey = config.idKey || 'id';
  // Bearer token via the shared authedFetch helper in services/supabase.ts.
  // Reading localStorage directly is fragile (the storage key shape varies
  // across Supabase versions). authedFetch grabs the token from the live
  // auth client so this can't drift.
  const [bearer, setBearer] = useState<string>('');
  useEffect(() => {
    let mounted = true;
    getAccessToken().then(t => { if (mounted) setBearer(t || ''); });
    return () => { mounted = false; };
  }, [signedInEmail]);

  const headers = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearer) h['Authorization'] = `Bearer ${bearer}`;
    return h;
  }, [bearer]);

  // Fetch rows
  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // v1.8.0 Step 17: include both ?status=ALL (for experiences) and
      // ?include_archived=true (for soft-delete). Servers that don't support
      // a param ignore it. The archive button lets the user re-restore rows.
      const url = `${config.apiBase}?status=ALL&include_archived=true`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('fetchRows failed', e);
      setError(e?.message || T.error[lang]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [config.apiBase, bearer, lang]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // Filter
  const filteredRows = useMemo(() => {
    let out = rows;
    if (filter !== 'ALL' && config.filters) {
      out = out.filter((r) => r.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((r) => {
        // Match against any string field
        return Object.values(r).some((v) => {
          if (typeof v === 'string') return v.toLowerCase().includes(q);
          return false;
        });
      });
    }
    // Sort
    const sort = config.defaultSort;
    if (sort) {
      out = [...out].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return sort.order === 'asc' ? -1 : 1;
        if (av > bv) return sort.order === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return out;
  }, [rows, search, filter, config.filters, config.defaultSort]);

  // Create / update
  const handleSave = async (record: any) => {
    const isUpdate = isCreating === false && rows.some((r) => r[idKey] === record[idKey]);
    const url = isUpdate ? `${config.apiBase}/${record[idKey]}` : config.apiBase;
    const method = isUpdate ? 'PATCH' : 'POST';
    try {
      const res = await fetch(url, { method, headers, body: JSON.stringify(record) });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      await fetchRows();
      setEditing(null);
      setIsCreating(false);
    } catch (e: any) {
      alert(`${T.error[lang]}: ${e?.message || e}`);
    }
  };

  // v1.8.0 Step 17: Archive (soft delete) for any entity. Reversible.
  // Uses the new POST /api/{table}/:id/archive endpoint which sets archived_at.
  const handleArchive = async (record: any) => {
    if (!window.confirm(T.confirmDel[lang])) return;
    try {
      const res = await fetch(`${config.apiBase}/${record[idKey]}/archive`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      await fetchRows();
      setEditing(null);
    } catch (e: any) {
      alert(`${T.error[lang]}: ${e?.message || e}`);
    }
  };

  // v1.8.0 Step 17: Restore (un-archive) for any entity.
  const handleRestore = async (record: any) => {
    try {
      const res = await fetch(`${config.apiBase}/${record[idKey]}/restore`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      await fetchRows();
    } catch (e: any) {
      alert(`${T.error[lang]}: ${e?.message || e}`);
    }
  };

  // Publish toggle (only meaningful for experiences / suppliers)
  const handleTogglePublish = async (record: any) => {
    const next = record.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      // Use the dedicated /publish endpoint if it's the experiences API
      if (config.apiBase === '/api/experiences') {
        const res = await fetch(`${config.apiBase}/${record[idKey]}/publish`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      } else {
        const res = await fetch(`${config.apiBase}/${record[idKey]}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      }
      await fetchRows();
    } catch (e: any) {
      alert(`${T.error[lang]}: ${e?.message || e}`);
    }
  };

  // Build a new empty record from the config (defaults)
  const buildNew = (): any => {
    const out: any = {};
    for (const f of config.fields) {
      // v1.8.0 Step 20: honor field-level defaultValue when defined
      // (e.g. tier='UHNWI', status='ACTIVE', commission_pct=5.00).
      const dv = (f as any).defaultValue;
      if (dv !== undefined) { out[f.key] = dv; continue; }
      if (f.kind === 'text' || f.kind === 'textarea') out[f.key] = '';
      else if (f.kind === 'number') out[f.key] = 0;
      else if (f.kind === 'select') out[f.key] = '';
      else if (f.kind === 'multiselect') out[f.key] = [];
      else if (f.kind === 'tags') out[f.key] = [];
      else if (f.kind === 'image') out[f.key] = f.multiple ? [] : null;
      else if (f.kind === 'trilingual') out[f.key] = { EN: '', ES: '', PT: '' };
      else if (f.kind === 'boolean') out[f.key] = false;
      else if (f.kind === 'itinerary') out[f.key] = [];
    }
    if (config.apiBase === '/api/experiences') {
      out.status = 'DRAFT';
      out.featured = false;
      out.display_order = rows.length + 1;
    }
    return out;
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif italic text-white">
            {config.name[lang]}
          </h2>
          <p className="text-[10px] text-[#B8963E] uppercase tracking-[0.4em] font-bold mt-1">
            {rows.length} {config.name[lang === 'EN' ? 'ES' : lang === 'ES' ? 'PT' : 'EN']}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={T.search[lang]}
              className="bg-white/5 border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8963E] transition-all w-48"
            />
          </div>
          {/* Filters */}
          {config.filters?.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${
                filter === f.value
                  ? 'bg-[#B8963E] text-white'
                  : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
              }`}
            >
              {f.label[lang]}
            </button>
          ))}
          {/* Add */}
          <button
            onClick={() => { setEditing(buildNew()); setIsCreating(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#B8963E] hover:bg-white hover:text-slate-900 text-white rounded-full text-[10px] font-bold uppercase tracking-[0.3em] transition-all"
          >
            <Plus size={12} /> {T.addNew[lang]} {config.nameSingular[lang]}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-[#B8963E]" size={24} />
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <p className="text-white/60">
            {search ? T.noMatch[lang] : T.noResults[lang]}
          </p>
          {!search && (
            <button
              onClick={() => { setEditing(buildNew()); setIsCreating(true); }}
              className="mt-4 text-[#B8963E] hover:underline text-sm font-medium"
            >
              {T.addPrompt[lang]}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-[9px] text-white/40 uppercase tracking-[0.2em]">
                {config.fields.slice(0, 5).map((f) => (
                  <th key={f.key} className="text-left px-4 py-3 font-bold">
                    {f.label[lang]}
                  </th>
                ))}
                <th className="text-right px-4 py-3 font-bold w-24">—</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={row[idKey]}
                  onClick={() => { setEditing(row); setIsCreating(false); }}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                >
                  {config.fields.slice(0, 5).map((f) => (
                    <td key={f.key} className="px-4 py-3 text-sm text-white">
                      {renderCellSummary(f, row, lang)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    {row.status && (
                      <StatusPill status={row.status} lang={lang} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      <AnimatePresence>
        {/* v1.8.0 Step 19: Experiences use the multi-step wizard (Phase B of the
            bundling roadmap). Other entities still use the flat EntityEditModal. */}
        {editing && config.apiBase === '/api/experiences' && (
          <ExperienceWizard
            initial={editing}
            isCreating={isCreating}
            lang={lang}
            bearer={bearer}
            signedInEmail={signedInEmail ?? null}
            onClose={() => { setEditing(null); setIsCreating(false); }}
            onSaved={() => { setEditing(null); setIsCreating(false); fetchRows(); }}
          />
        )}
        {editing && config.apiBase !== '/api/experiences' && (
          <EntityEditModal
            config={config}
            initial={editing}
            isCreating={isCreating}
            lang={lang}
            onClose={() => { setEditing(null); setIsCreating(false); }}
            onSave={handleSave}
            onDelete={handleArchive}
            onRestore={handleRestore}
            onTogglePublish={handleTogglePublish}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Cell summary (used in the table list) ────────────────────────────────────

function renderCellSummary(field: FieldDef, row: any, lang: 'EN' | 'ES' | 'PT'): React.ReactNode {
  const v = row[field.key];
  if (v == null || v === '') return <span className="text-white/30">—</span>;
  if (field.kind === 'trilingual') {
    const tri = v as { EN?: string; ES?: string; PT?: string };
    const primary = tri[lang] || tri.EN || '';
    return <span className="truncate max-w-[280px] inline-block">{primary}</span>;
  }
  if (field.kind === 'image') {
    if (Array.isArray(v) && v.length > 0) {
      return (
        <img src={v[0]} alt="" className="w-10 h-10 rounded object-cover" />
      );
    }
    if (typeof v === 'string') {
      return <img src={v} alt="" className="w-10 h-10 rounded object-cover" />;
    }
    return <ImageIcon className="text-white/30" size={16} />;
  }
  if (field.kind === 'itinerary') {
    return <span className="text-white/60">{(v as any[]).length} days</span>;
  }
  if (field.kind === 'boolean') {
    return v ? <Check className="text-emerald-400" size={16} /> : <span className="text-white/30">—</span>;
  }
  if (field.kind === 'select') {
    if (Array.isArray(field.options)) {
      const opt = field.options.find((o) => o.value === v);
      if (opt) return opt.label[lang] || opt.label.EN;
    }
    return String(v);
  }
  if (field.kind === 'multiselect') {
    if (Array.isArray(v)) return <span>{v.length} items</span>;
    return String(v);
  }
  if (field.kind === 'tags') {
    if (Array.isArray(v)) return <span className="text-white/60">{v.length} tags</span>;
    return String(v);
  }
  if (typeof v === 'string') {
    return <span className="truncate max-w-[280px] inline-block">{v}</span>;
  }
  return <span>{JSON.stringify(v)}</span>;
}

// ── Status pill (used in the list) ────────────────────────────────────────────

function StatusPill({ status, lang }: { status: string; lang: 'EN' | 'ES' | 'PT' }) {
  const map: Record<string, { bg: string; label: { EN: string; ES: string; PT: string } }> = {
    DRAFT:     { bg: 'bg-white/10 text-white/60',     label: { EN: 'Draft',     ES: 'Borrador',   PT: 'Rascunho' } },
    PUBLISHED: { bg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30', label: { EN: 'Published', ES: 'Publicado',  PT: 'Publicado' } },
    ARCHIVED:  { bg: 'bg-white/5 text-white/40',     label: { EN: 'Archived',  ES: 'Archivado',  PT: 'Arquivado' } },
    PENDING:   { bg: 'bg-[#B8963E]/15 text-[#B8963E] border border-[#B8963E]/30', label: { EN: 'Pending', ES: 'Pendiente', PT: 'Pendente' } },
    APPROVED:  { bg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30', label: { EN: 'Approved', ES: 'Aprobado', PT: 'Aprovado' } },
    REJECTED:  { bg: 'bg-red-500/15 text-red-400 border border-red-500/30', label: { EN: 'Rejected', ES: 'Rechazado', PT: 'Rejeitado' } },
    AVAILABLE: { bg: 'bg-emerald-500/15 text-emerald-400', label: { EN: 'Available', ES: 'Disponible', PT: 'Disponível' } },
    BOOKED:    { bg: 'bg-white/10 text-white/60',     label: { EN: 'Booked',    ES: 'Reservado',  PT: 'Reservado' } },
    MAINTENANCE: { bg: 'bg-amber-500/15 text-amber-400', label: { EN: 'Maintenance', ES: 'Mantenimiento', PT: 'Manutenção' } },
    RETIRED:   { bg: 'bg-white/5 text-white/40',     label: { EN: 'Retired',   ES: 'Retirado',   PT: 'Retirado' } },
  };
  const entry = map[status] || { bg: 'bg-white/10 text-white/60', label: { EN: status, ES: status, PT: status } };
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] ${entry.bg}`}>
      {entry.label[lang] || entry.label.EN}
    </span>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────

interface EntityEditModalProps {
  config: EntityConfig;
  initial: any;
  isCreating: boolean;
  lang: 'EN' | 'ES' | 'PT';
  onClose: () => void;
  onSave: (record: any) => Promise<void>;
  onDelete: (record: any) => Promise<void>;
  onRestore: (record: any) => Promise<void>;
  onTogglePublish: (record: any) => Promise<void>;
}

const EntityEditModal: React.FC<EntityEditModalProps> = ({
  config,
  initial,
  isCreating,
  lang,
  onClose,
  onSave,
  onDelete,
  onRestore,
  onTogglePublish,
}) => {
  const [record, setRecord] = useState<any>(initial);
  const [activeLang, setActiveLang] = useState<'EN' | 'ES' | 'PT'>('EN');
  const [saving, setSaving] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, DynamicOptionItem[]>>({});

  // Load dynamic options for any select/multiselect fields
  useEffect(() => {
    const dynFields = config.fields.filter(
      (f) => (f.kind === 'select' || f.kind === 'multiselect') && typeof f.options === 'string'
    );
    if (dynFields.length === 0) return;
    const bearer = (() => {
      try {
        const raw = localStorage.getItem('sb-vygfumqzlnloytmoaxav-auth-token');
        return raw ? JSON.parse(raw)?.access_token || '' : '';
      } catch { return ''; }
    })();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearer) headers['Authorization'] = `Bearer ${bearer}`;

    (async () => {
      for (const f of dynFields) {
        const url = (f.options as string).replace('dynamic:', '');
        try {
          const res = await fetch(url, { headers });
          if (res.ok) {
            const data = await res.json();
            setDynamicOptions((prev) => ({ ...prev, [f.key]: data }));
          }
        } catch (e) {
          console.warn('dynamic options load failed', f.key, e);
        }
      }
    })();
  }, [config.fields]);

  const updateField = (key: string, value: any) => {
    setRecord((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(record);
    } finally {
      setSaving(false);
    }
  };

  // Resolve options (static or dynamic)
  const resolveOptions = (f: FieldDef): Array<{ value: string; label: Trilingual }> | null => {
    if (f.kind !== 'select' && f.kind !== 'multiselect') return null;
    if (Array.isArray(f.options)) return f.options;
    if (typeof f.options === 'string') {
      const dyn = dynamicOptions[f.options.replace('dynamic:', '')];
      if (dyn) {
        return dyn.map((d) => ({
          value: d.value,
          label: { EN: d.label_en, ES: d.label_es, PT: d.label_pt },
        }));
      }
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0a1518] border border-white/20 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0a1518] border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-[10px] text-[#B8963E] uppercase tracking-[0.4em] font-bold">
              {isCreating ? T.addNew[lang] : T.edit[lang]} · {config.nameSingular[lang]}
            </p>
            <h3 className="text-xl font-serif italic text-white mt-1">
              {record.id || record.title_en || record.name_en || record.business_name_en || T.addNew[lang] + ' ' + config.nameSingular[lang]}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!isCreating && record.status && ['DRAFT', 'PUBLISHED'].includes(record.status) && (
              <button
                onClick={() => onTogglePublish(record)}
                className="px-3 py-1.5 border border-white/20 text-white/80 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all flex items-center gap-1.5"
              >
                {record.status === 'PUBLISHED' ? <EyeOff size={12} /> : <Eye size={12} />}
                {record.status === 'PUBLISHED' ? T.unpublish[lang] : T.publish[lang]}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white rounded-lg transition-colors"
              aria-label={T.close[lang]}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {config.fields.map((f) => {
            const value = record[f.key];
            const labelEl = (
              <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 flex items-center gap-1">
                {f.label[lang]}
                {'required' in f && f.required && <span className="text-red-400">*</span>}
              </label>
            );

            if (f.kind === 'text') {
              return (
                <div key={f.key} className="space-y-2">
                  {labelEl}
                  <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => updateField(f.key, e.target.value)}
                    placeholder={f.placeholder?.[lang] || ''}
                    maxLength={f.maxLength}
                    pattern={f.pattern}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 transition-all font-light"
                  />
                </div>
              );
            }
            if (f.kind === 'textarea') {
              return (
                <div key={f.key} className="space-y-2">
                  {labelEl}
                  <textarea
                    value={value || ''}
                    onChange={(e) => updateField(f.key, e.target.value)}
                    placeholder={f.placeholder?.[lang] || ''}
                    maxLength={f.maxLength}
                    rows={f.rows || 3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 transition-all font-light resize-none"
                  />
                </div>
              );
            }
            if (f.kind === 'number') {
              return (
                <div key={f.key} className="space-y-2">
                  {labelEl}
                  <input
                    type="number"
                    value={value ?? 0}
                    onChange={(e) => updateField(f.key, parseFloat(e.target.value) || 0)}
                    min={f.min}
                    max={f.max}
                    step={f.step || 1}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 transition-all font-light"
                  />
                </div>
              );
            }
            if (f.kind === 'select') {
              const options = resolveOptions(f);
              return (
                <div key={f.key} className="space-y-2">
                  {labelEl}
                  <select
                    value={value || ''}
                    onChange={(e) => updateField(f.key, e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 transition-all font-light"
                  >
                    <option value="">—</option>
                    {options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label[lang] || o.label.EN}</option>
                    ))}
                  </select>
                </div>
              );
            }
            if (f.kind === 'multiselect') {
              const options = resolveOptions(f);
              const selected: string[] = Array.isArray(value) ? value : [];
              return (
                <div key={f.key} className="space-y-2">
                  {labelEl}
                  <div className="flex flex-wrap gap-2">
                    {options?.map((o) => {
                      const isOn = selected.includes(o.value);
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => {
                            const next = isOn
                              ? selected.filter((v) => v !== o.value)
                              : [...selected, o.value];
                            updateField(f.key, next);
                          }}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all border ${
                            isOn
                              ? 'bg-[#B8963E] border-[#B8963E] text-white'
                              : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                          }`}
                        >
                          {o.label[lang] || o.label.EN}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }
            if (f.kind === 'tags') {
              const tags: string[] = Array.isArray(value) ? value : [];
              const [draft, setDraft] = useState('');
              return (
                <div key={f.key} className="space-y-2">
                  {labelEl}
                  {f.hint && <p className="text-[10px] text-white/30 italic">{f.hint[lang]}</p>}
                  <div className="flex flex-wrap gap-2 items-center">
                    {tags.map((t, i) => (
                      <span key={i} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-white">
                        <TagIcon size={10} className="text-white/40" />
                        {t}
                        <button
                          type="button"
                          onClick={() => updateField(f.key, tags.filter((_, idx) => idx !== i))}
                          className="ml-1 text-white/40 hover:text-red-400"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && draft.trim()) {
                          e.preventDefault();
                          updateField(f.key, [...tags, draft.trim()]);
                          setDraft('');
                        }
                      }}
                      placeholder="+"
                      className="w-12 bg-white/5 border border-white/10 rounded-full py-1.5 px-3 text-white text-sm focus:outline-none focus:border-[#B8963E] transition-all"
                    />
                  </div>
                </div>
              );
            }
            if (f.kind === 'image') {
              return (
                <div key={f.key} className="space-y-2">
                  {labelEl}
                  <ImageField
                    value={value}
                    onChange={(next) => updateField(f.key, next)}
                    multiple={f.multiple}
                    max={f.max}
                    lang={lang}
                  />
                </div>
              );
            }
            if (f.kind === 'trilingual') {
              return (
                <div key={f.key} className="space-y-2">
                  {labelEl}
                  <TrilingualField
                    value={value}
                    onChange={(next) => updateField(f.key, next)}
                    kind={f.subKind}
                    rows={f.rows}
                    maxLength={f.maxLength}
                    activeLang={activeLang}
                    onActiveLangChange={setActiveLang}
                    required={'required' in f && f.required ? true : false}
                  />
                </div>
              );
            }
            if (f.kind === 'boolean') {
              return (
                <div key={f.key} className="space-y-2">
                  {labelEl}
                  <button
                    type="button"
                    onClick={() => updateField(f.key, !value)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      value ? 'bg-[#B8963E]' : 'bg-white/10'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              );
            }
            if (f.kind === 'itinerary') {
              return (
                <div key={f.key} className="space-y-2">
                  {labelEl}
                  <ItineraryField
                    value={value}
                    onChange={(next) => updateField(f.key, next)}
                    lang={lang}
                  />
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0a1518] border-t border-white/10 px-6 py-4 flex items-center justify-between gap-3">
          {!isCreating && record.archived_at && (
            <button
              onClick={() => onRestore(record)}
              className="flex items-center gap-2 px-4 py-2 text-emerald-400 hover:text-emerald-300 transition-colors text-[10px] font-bold uppercase tracking-[0.3em]"
            >
              <ArchiveRestore size={12} /> {T.restore[lang]}
            </button>
          )}
          {!isCreating && !record.archived_at && (
            <button
              onClick={() => onDelete(record)}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 transition-colors text-[10px] font-bold uppercase tracking-[0.3em]"
            >
              <Trash2 size={12} /> {T.delete[lang]}
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-white/10 text-white/80 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white/5 transition-all"
            >
              {T.cancel[lang]}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-[#B8963E] hover:bg-white hover:text-slate-900 text-white rounded-full text-[10px] font-bold uppercase tracking-[0.3em] transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
              {saving ? T.saving[lang] : T.save[lang]}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
