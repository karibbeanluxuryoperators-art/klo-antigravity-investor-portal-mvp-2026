import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit3, Save, Loader2, X, Trash2, ArchiveRestore, AlertCircle } from 'lucide-react';
import { getAccessToken } from '../../services/supabase';
import { TrilingualField } from '../admin/TrilingualField';
import type { EntityConfig, FieldDef, Trilingual } from '../admin/EntityEditor';
import { ArchiveButton } from './ArchiveButton';
import { useArchive } from '../../hooks/useArchive';

// ── EditButton (v1.8.0 Step 20) ───────────────────────────────────────────────
// Mounts on a /admin/{entity}/{id} detail page. Renders an "Edit" pill in
// headerActions. On click, opens a modal with a form generated from the
// supplied EntityConfig. Saves via PATCH /api/{table}/{id}.
//
// Why not reuse EntityEditModal directly? EntityEditModal is currently
// scoped to EntityEditor (it owns its rows). Extracting it would require
// a larger refactor. For the detail-page "Edit" use case, the form is
// shorter (one record, not a list) and we want a tight visual match
// with the detail page. So a sibling component is cleaner.
//
// Resilient: works with archives (sets archived_at/restore) and the
// soft-delete UX. The Save button calls PATCH; if the endpoint returns
// an error, we surface the error inline.

interface EditButtonProps {
  config: EntityConfig;
  id: string;
  record: any;
  lang: 'EN' | 'ES' | 'PT';
  signedInEmail?: string | null;
  // Optional: callback after a successful save (e.g. refetch + re-render).
  onSaved?: (updatedRecord: any) => void;
}

const T = {
  edit:    { EN: 'Edit',   ES: 'Editar',   PT: 'Editar' },
  save:    { EN: 'Save',   ES: 'Guardar',  PT: 'Salvar' },
  saving:  { EN: 'Saving…', ES: 'Guardando…', PT: 'Salvando…' },
  cancel:  { EN: 'Cancel', ES: 'Cancelar', PT: 'Cancelar' },
  close:   { EN: 'Close',  ES: 'Cerrar',   PT: 'Fechar' },
  delete:  { EN: 'Delete', ES: 'Eliminar', PT: 'Remover' },
  error:   { EN: 'Something went wrong', ES: 'Algo salió mal', PT: 'Algo deu errado' },
  required:{ EN: 'Required', ES: 'Requerido', PT: 'Obrigatório' },
  // Status mapping (subset — the rest come from the StatusPill component)
  deleteConfirm: { EN: 'Delete this record? This cannot be undone.',
                   ES: '¿Eliminar este registro? Esta acción no se puede deshacer.',
                   PT: 'Remover este registro? Esta ação não pode ser desfeita.' },
};

export const EditButton: React.FC<EditButtonProps> = ({ config, id, record, lang, signedInEmail, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>(record);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bearer, setBearer] = useState<string>('');
  const [activeLang, setActiveLang] = useState<'EN' | 'ES' | 'PT'>('EN');

  useEffect(() => {
    let mounted = true;
    getAccessToken().then(t => { if (mounted) setBearer(t || ''); });
    return () => { mounted = false; };
  }, [signedInEmail]);

  // Re-sync draft when the record changes (e.g. after parent refetch).
  useEffect(() => { setDraft(record); }, [record]);

  const headers = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearer) h['Authorization'] = `Bearer ${bearer}`;
    return h;
  }, [bearer]);

  const updateField = (key: string, value: any) => {
    setDraft((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${config.apiBase}/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setOpen(false);
      if (onSaved) onSaved(data);
    } catch (e: any) {
      setError(e?.message || T.error[lang]);
    } finally {
      setSaving(false);
    }
  };

  // Archive (soft delete)
  const { archive, restore, busyId } = useArchive({
    table: config.apiBase.replace(/^\/api\//, '').replace(/\/.*$/, '') as any,
    bearer,
    onAfterChange: () => {
      setOpen(false);
      if (onSaved) onSaved({ ...draft, archived_at: new Date().toISOString() });
    },
  });

  // Filter out read-only / image / wizard fields for the inline form
  const editableFields = config.fields.filter(f =>
    f.kind !== 'image' && f.kind !== 'itinerary' && f.kind !== 'boolean'
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-white/15 transition-all"
      >
        <Edit3 size={12} /> {T.edit[lang]}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0a1518] border border-white/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-[#0a1518] border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <p className="text-[10px] text-[#B8963E] uppercase tracking-[0.4em] font-bold">
                    {T.edit[lang]} · {config.nameSingular[lang]}
                  </p>
                  <h3 className="text-xl font-serif italic text-white mt-1">
                    {(record as any)?.name || (record as any)?.business_name || (record as any)?.id?.slice(0, 8) || '…'}
                  </h3>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white rounded-lg transition-colors"
                  aria-label={T.close[lang]}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {editableFields.map((f) => (
                  <FieldRow
                    key={f.key}
                    field={f}
                    value={draft[f.key]}
                    lang={lang}
                    activeLang={activeLang}
                    onChange={(v) => updateField(f.key, v)}
                  />
                ))}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={14} />
                    <p className="text-xs text-red-200">{error}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-[#0a1518] border-t border-white/10 px-6 py-4 flex items-center justify-between gap-2">
                <ArchiveButton
                  row={draft}
                  isArchived={!!draft.archived_at}
                  onArchive={archive}
                  onRestore={restore}
                  busyId={busyId}
                  lang={lang}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    disabled={saving}
                    className="px-4 py-2.5 text-white/60 hover:text-white rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    {T.cancel[lang]}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#B8963E] text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#B8963E]/90 disabled:opacity-50 transition-all"
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {saving ? T.saving[lang] : T.save[lang]}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ── Field row ────────────────────────────────────────────────────────────────

interface FieldRowProps {
  field: FieldDef;
  value: any;
  lang: 'EN' | 'ES' | 'PT';
  activeLang: 'EN' | 'ES' | 'PT';
  onChange: (v: any) => void;
}

const FieldRow: React.FC<FieldRowProps> = ({ field, value, lang, onChange }) => {
  const lbl = field.label[lang] || field.label.EN;
  const required = (field as any).required;
  const help = (field as any).help as Trilingual | undefined;

  if (field.kind === 'trilingual') {
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 flex items-center gap-1">
          {lbl}
          {required && <span className="text-red-400">*</span>}
        </label>
        <TrilingualField
          value={value || { EN: '', ES: '', PT: '' }}
          onChange={onChange}
          kind={field.subKind}
          maxLength={field.maxLength}
          rows={field.rows}
        />
        {help && <p className="text-[10px] text-white/30 italic">{help[lang] || help.EN}</p>}
      </div>
    );
  }

  if (field.kind === 'text') {
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 flex items-center gap-1">
          {lbl}
          {required && <span className="text-red-400">*</span>}
        </label>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.maxLength}
          placeholder={(field.placeholder?.[lang] || '')}
          className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 transition-all font-light"
        />
        {help && <p className="text-[10px] text-white/30 italic">{help[lang] || help.EN}</p>}
      </div>
    );
  }

  if (field.kind === 'textarea') {
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 flex items-center gap-1">
          {lbl}
          {required && <span className="text-red-400">*</span>}
        </label>
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.maxLength}
          rows={field.rows || 3}
          placeholder={(field.placeholder?.[lang] || '')}
          className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 transition-all font-light resize-none"
        />
        {help && <p className="text-[10px] text-white/30 italic">{help[lang] || help.EN}</p>}
      </div>
    );
  }

  if (field.kind === 'number') {
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 flex items-center gap-1">
          {lbl}
          {required && <span className="text-red-400">*</span>}
        </label>
        <input
          type="number"
          value={value ?? 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={field.min}
          max={field.max}
          step={field.step || 1}
          className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 transition-all font-light"
        />
        {help && <p className="text-[10px] text-white/30 italic">{help[lang] || help.EN}</p>}
      </div>
    );
  }

  if (field.kind === 'select') {
    const options = Array.isArray(field.options) ? field.options : [];
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 flex items-center gap-1">
          {lbl}
          {required && <span className="text-red-400">*</span>}
        </label>
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 transition-all font-light"
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label[lang] || o.label.EN}</option>
          ))}
        </select>
        {help && <p className="text-[10px] text-white/30 italic">{help[lang] || help.EN}</p>}
      </div>
    );
  }

  if (field.kind === 'multiselect') {
    const options = Array.isArray(field.options) ? field.options : [];
    const selected: string[] = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 flex items-center gap-1">
          {lbl}
          {required && <span className="text-red-400">*</span>}
        </label>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const isSelected = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  const next = isSelected
                    ? selected.filter(v => v !== o.value)
                    : [...selected, o.value];
                  onChange(next);
                }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                  isSelected
                    ? 'bg-[#B8963E] text-white'
                    : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                }`}
              >
                {o.label[lang] || o.label.EN}
              </button>
            );
          })}
        </div>
        {help && <p className="text-[10px] text-white/30 italic">{help[lang] || help.EN}</p>}
      </div>
    );
  }

  if (field.kind === 'tags') {
    const arr: string[] = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 flex items-center gap-1">
          {lbl}
        </label>
        <input
          type="text"
          value={arr.join(', ')}
          onChange={(e) => {
            const next = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
            onChange(next);
          }}
          placeholder={field.hint?.[lang] || field.hint?.EN || ''}
          className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 transition-all font-light"
        />
        {help && <p className="text-[10px] text-white/30 italic">{help[lang] || help.EN}</p>}
      </div>
    );
  }

  if (field.kind === 'boolean') {
    return (
      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#B8963E] focus:ring-[#B8963E]/30"
          />
          <span className="text-sm text-white/80">{lbl}</span>
        </label>
      </div>
    );
  }

  return null;
};
