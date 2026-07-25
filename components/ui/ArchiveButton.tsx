// components/ui/ArchiveButton.tsx
// v1.8.0 Step 14: small inline action that toggles between Archive / Restore
// for a single row. Use inside DataTable rowActions or detail page header.
// Trilingual EN/ES/PT. No confirm dialog — the row is recoverable, so
// "are you sure?" is friction. The user can always hit Restore.

import React from 'react';
import { Archive, ArchiveRestore } from 'lucide-react';
import type { Language } from './DataTable';

const T = {
  archive:  { EN: 'Archive',   ES: 'Archivar',     PT: 'Arquivar' },
  restore:  { EN: 'Restore',   ES: 'Restaurar',    PT: 'Restaurar' },
  archived: { EN: 'Archived',  ES: 'Archivado',    PT: 'Arquivado' },
};

interface Props {
  row: { id: string; archived_at?: string | null };
  isArchived: boolean;
  /** Called with the row id when user clicks. Should return a promise. */
  onArchive: (id: string) => Promise<any>;
  /** Called with the row id when user clicks Restore. */
  onRestore: (id: string) => Promise<any>;
  /** Id currently being processed (for spinner). */
  busyId: string | null;
  lang: Language;
}

export const ArchiveButton: React.FC<Props> = ({ row, isArchived, onArchive, onRestore, busyId, lang }) => {
  const busy = busyId === row.id;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (busy) return;
        const action = isArchived ? onRestore : onArchive;
        action(row.id).catch((err) => {
          // eslint-disable-next-line no-alert
          alert((isArchived ? T.restore : T.archive)[lang] + ' failed: ' + (err?.message || 'unknown'));
        });
      }}
      disabled={busy}
      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
        isArchived
          ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
          : 'text-white/40 hover:text-[#B8963E] hover:bg-[#B8963E]/10'
      }`}
      title={isArchived ? T.restore[lang] : T.archive[lang]}
    >
      {isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
    </button>
  );
};
