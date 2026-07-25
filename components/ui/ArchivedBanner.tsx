// components/ui/ArchivedBanner.tsx
// v1.8.0 Step 14: amber banner shown at the top of a detail page when the
// record is archived. Includes a Restore button so the user can recover
// without going back to the list. Trilingual EN/ES/PT.

import React from 'react';
import { ArchiveRestore, Archive } from 'lucide-react';
import type { Language } from './DataTable';

const T = {
  bannerTitle: {
    EN: 'This record is archived',
    ES: 'Este registro está archivado',
    PT: 'Este registro está arquivado',
  },
  bannerHint: {
    EN: 'It is hidden from default views. You can restore it to make it active again.',
    ES: 'Está oculto en las vistas predeterminadas. Puedes restaurarlo para volver a activarlo.',
    PT: 'Está oculto nas vistas padrão. Você pode restaurá-lo para torná-lo ativo novamente.',
  },
  archivedAt: {
    EN: 'Archived on',
    ES: 'Archivado el',
    PT: 'Arquivado em',
  },
  restore: { EN: 'Restore',  ES: 'Restaurar',  PT: 'Restaurar' },
  restoring: { EN: 'Restoring…', ES: 'Restaurando…', PT: 'Restaurando…' },
};

interface Props {
  archivedAt: string;  // ISO timestamp
  onRestore: () => void | Promise<void>;
  busy?: boolean;
  lang: Language;
}

export const ArchivedBanner: React.FC<Props> = ({ archivedAt, onRestore, busy, lang }) => {
  const ts = new Date(archivedAt);
  const dateLabel = isNaN(ts.getTime())
    ? archivedAt
    : ts.toLocaleDateString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-4 flex flex-wrap items-start gap-3">
      <Archive size={18} className="text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-200">
          {T.bannerTitle[lang]}
        </p>
        <p className="text-xs text-amber-200/70 mt-0.5">
          {T.bannerHint[lang]} <span className="text-amber-200/50">· {T.archivedAt[lang]} {dateLabel}</span>
        </p>
      </div>
      <button
        onClick={() => { if (!busy) onRestore(); }}
        disabled={busy}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
      >
        <ArchiveRestore size={14} />
        {busy ? T.restoring[lang] : T.restore[lang]}
      </button>
    </div>
  );
};
