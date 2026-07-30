import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail, Phone, MessageSquare, ExternalLink,
  Check, X as XIcon, Sparkles, ChevronRight, Calendar, Loader2,
} from 'lucide-react';
import type { Lead } from './LeadsManagement';

type Language = 'EN' | 'ES' | 'PT';
type Status = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'WON' | 'LOST';

interface LeadsKanbanProps {
  leads: Lead[];
  lang: Language;
  onStatusChange: (lead: Lead, status: Status) => Promise<void>;
  statusUpdating: string | null;
  onOpenDetail: (lead: Lead) => void;
}

// v1.8.0 Step 22.22: Kanban view for the leads pipeline. 5 columns
// (NEW → CONTACTED → QUALIFIED → WON, with LOST as a sink). Each card
// shows the minimum a broker needs to triage: name, contact, source,
// time-since-received, services. Click to open the detail page.
//
// The columns and per-card content are deliberately small (no expandable
// rows) so a broker can scan 50+ leads in one screen and move them
// forward with one click.

const T: Record<string, { EN: string; ES: string; PT: string }> = {
  col_NEW:       { EN: 'New',         ES: 'Nuevos',        PT: 'Novos' },
  col_CONTACTED: { EN: 'Contacted',   ES: 'Contactado',    PT: 'Contatado' },
  col_QUALIFIED: { EN: 'Qualified',   ES: 'Calificado',    PT: 'Qualificado' },
  col_WON:       { EN: 'Won',         ES: 'Ganados',       PT: 'Ganhos' },
  col_LOST:      { EN: 'Lost',        ES: 'Perdidos',      PT: 'Perdidos' },
  empty_col:     { EN: 'No leads here',
                    ES: 'Sin leads',
                    PT: 'Sem leads' },
  move_next:     { EN: 'Move to',     ES: 'Mover a',       PT: 'Mover para' },
  open:          { EN: 'Open',        ES: 'Abrir',         PT: 'Abrir' },
  archive:       { EN: 'Archive',     ES: 'Archivar',      PT: 'Arquivar' },
  back:          { EN: 'Back',        ES: 'Atrás',         PT: 'Voltar' },
};

const t = (key: keyof typeof T, lang: Language): string => {
  const entry = T[key];
  return (entry && (entry[lang] || entry.EN)) || '';
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
  } catch { return iso; }
};

const COLUMNS: { key: Status; accent: string; dotClass: string }[] = [
  { key: 'NEW',       accent: 'text-[#B8963E]',     dotClass: 'bg-[#B8963E]' },
  { key: 'CONTACTED', accent: 'text-white/80',      dotClass: 'bg-white/60' },
  { key: 'QUALIFIED', accent: 'text-emerald-400',   dotClass: 'bg-emerald-400' },
  { key: 'WON',       accent: 'text-[#B8963E]',     dotClass: 'bg-[#B8963E]' },
  { key: 'LOST',      accent: 'text-red-300',       dotClass: 'bg-red-400' },
];

// Next status when the user clicks "advance" on a card. LOST is reachable
// from any non-terminal status via the menu, but not via the main button.
const NEXT_STATUS: Record<Status, Status | null> = {
  NEW:       'CONTACTED',
  CONTACTED: 'QUALIFIED',
  QUALIFIED: 'WON',
  WON:       null,
  LOST:      null,
};

const NEXT_STATUS_LABEL: Record<Status, string> = {
  NEW:       'status_CONTACTED',
  CONTACTED: 'status_QUALIFIED',
  QUALIFIED: 'status_WON',
  WON:       'status_WON',
  LOST:      'status_LOST',
};

export const LeadsKanban: React.FC<LeadsKanbanProps> = ({
  leads, lang, onStatusChange, statusUpdating, onOpenDetail,
}) => {
  const byStatus: Record<Status, Lead[]> = {
    NEW: [], CONTACTED: [], QUALIFIED: [], WON: [], LOST: [],
  };
  for (const l of leads) {
    if (byStatus[l.status]) byStatus[l.status].push(l);
  }
  // Sort each column by timestamp desc (newest first)
  for (const k of Object.keys(byStatus) as Status[]) {
    byStatus[k].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  return (
    <div className="overflow-x-auto pb-4 -mx-2 px-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 min-w-[900px]">
        {COLUMNS.map((col) => (
          <div key={col.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 flex flex-col min-h-[400px]">
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.dotClass}`} />
                <h3 className={`text-[10px] font-bold uppercase tracking-[0.25em] ${col.accent}`}>
                  {t(`col_${col.key}` as any, lang)}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-white/40">
                {byStatus[col.key].length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)', minHeight: 200 }}>
              <AnimatePresence initial={false}>
                {byStatus[col.key].length === 0 ? (
                  <div className="text-[10px] text-white/30 italic text-center py-8">
                    {t('empty_col', lang)}
                  </div>
                ) : (
                  byStatus[col.key].map((lead) => (
                    <KanbanCard
                      key={lead.id}
                      lead={lead}
                      lang={lang}
                      onStatusChange={onStatusChange}
                      statusUpdating={statusUpdating === lead.id}
                      onOpenDetail={onOpenDetail}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface KanbanCardProps {
  lead: Lead;
  lang: Language;
  onStatusChange: (lead: Lead, status: Status) => Promise<void>;
  statusUpdating: boolean;
  onOpenDetail: (lead: Lead) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  lead, lang, onStatusChange, statusUpdating, onOpenDetail,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const next = NEXT_STATUS[lead.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-white/10 bg-[#0a1518] p-3 hover:border-white/20 transition-colors group"
    >
      {/* Top row: name + time */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white truncate">
            {lead.name || (lang === 'ES' ? 'Sin nombre' : lang === 'PT' ? 'Sem nome' : 'Unnamed')}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/40 mt-0.5">
            <Calendar size={9} />
            <span>{formatRelative(lead.timestamp, lang)}</span>
          </div>
        </div>
        <button
          onClick={() => setShowMenu((s) => !s)}
          className="p-1 text-white/30 hover:text-white hover:bg-white/5 rounded transition-colors"
          aria-label="More"
        >
          <span className="block text-xs leading-none">···</span>
        </button>
      </div>

      {/* Contact row */}
      {(lead.email || lead.phone) && (
        <div className="flex flex-col gap-1 mb-2">
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-[10px] text-white/60 hover:text-[#B8963E] truncate"
            >
              <Mail size={10} className="shrink-0" />
              <span className="truncate">{lead.email}</span>
            </a>
          )}
          {lead.phone && (
            <a
              href={`https://wa.me/${(lead.whatsapp || lead.phone).replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-[10px] text-white/60 hover:text-emerald-400 truncate"
            >
              <MessageSquare size={10} className="shrink-0" />
              <span className="truncate">{lead.phone}</span>
            </a>
          )}
        </div>
      )}

      {/* Service + source */}
      {(lead.experience_type || lead.source) && (
        <div className="flex items-center gap-1.5 mb-3 text-[10px] text-white/40">
          {lead.experience_type && (
            <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/70 truncate max-w-[140px]">
              {lead.experience_type}
            </span>
          )}
          {lead.source && (
            <span className="text-white/30 truncate">{lead.source}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onOpenDetail(lead)}
          className="flex-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          {t('open', lang)}
        </button>
        {next && (
          <button
            onClick={() => onStatusChange(lead, next)}
            disabled={statusUpdating}
            className="flex-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded bg-[#B8963E]/20 text-[#B8963E] hover:bg-[#B8963E] hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {statusUpdating ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <>
                {t('move_next', lang)} <ChevronRight size={10} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Dropdown menu for non-default transitions */}
      {showMenu && (
        <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap gap-1">
          {COLUMNS.filter((c) => c.key !== lead.status).map((c) => (
            <button
              key={c.key}
              onClick={() => { onStatusChange(lead, c.key); setShowMenu(false); }}
              className={`text-[9px] px-2 py-1 rounded border ${STATUS_COLORS_BG[c.key]} hover:opacity-80 transition-opacity`}
            >
              {t(`col_${c.key}` as any, lang)}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const STATUS_COLORS_BG: Record<Status, string> = {
  NEW:       'bg-[#B8963E]/15 text-[#B8963E] border-[#B8963E]/30',
  CONTACTED: 'bg-white/10 text-white/80 border-white/20',
  QUALIFIED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  WON:       'bg-[#B8963E] text-white border-[#B8963E]',
  LOST:      'bg-red-500/10 text-red-300 border-red-500/30',
};
