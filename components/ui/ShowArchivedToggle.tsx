// components/ui/ShowArchivedToggle.tsx
// v1.8.0 Step 14: small pill switcher for "Show archived" / "Active only".
// Use in toolbars next to search/filters. Trilingual EN/ES/PT.

import React from 'react';
import { Archive } from 'lucide-react';
import type { Language } from './DataTable';

const T = {
  activeOnly: { EN: 'Active only', ES: 'Solo activos', PT: 'Apenas ativos' },
  showAll:    { EN: 'Show archived', ES: 'Mostrar archivados', PT: 'Mostrar arquivados' },
};

interface Props {
  value: boolean;            // true = show archived, false = active only
  onChange: (v: boolean) => void;
  lang: Language;
}

export const ShowArchivedToggle: React.FC<Props> = ({ value, onChange, lang }) => (
  <button
    onClick={() => onChange(!value)}
    className={`flex items-center gap-2 px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap ${
      value
        ? 'bg-[#B8963E]/15 text-[#B8963E] border-[#B8963E]/40'
        : 'bg-white/5 text-white/60 hover:text-white border-white/10'
    }`}
    title={value ? T.activeOnly[lang] : T.showAll[lang]}
  >
    <Archive size={12} />
    {value ? T.showAll[lang] : T.activeOnly[lang]}
  </button>
);
