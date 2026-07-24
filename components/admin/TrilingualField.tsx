import React from 'react';

// ── Trilingual field (v1.8.0 Step 11) ──────────────────────────────────────────
// Renders an EN/ES/PT tab switcher for any text or textarea value.
// Used by the EntityEditor for every string field that has a translation.

type Lang = 'EN' | 'ES' | 'PT';

interface TrilingualFieldProps {
  value: { EN?: string; ES?: string; PT?: string } | null | undefined;
  onChange: (next: { EN: string; ES: string; PT: string }) => void;
  kind?: 'text' | 'textarea';
  rows?: number;
  maxLength?: number;
  placeholder?: { EN?: string; ES?: string; PT?: string };
  required?: boolean;
  // Display language: which tab is active by default. Defaults to the prop
  // from the parent EntityEditor.
  activeLang?: Lang;
  onActiveLangChange?: (lang: Lang) => void;
}

const T = {
  EN: { tab: 'English', hint: 'EN' },
  ES: { tab: 'Español', hint: 'ES' },
  PT: { tab: 'Português', hint: 'PT' },
};

export const TrilingualField: React.FC<TrilingualFieldProps> = ({
  value,
  onChange,
  kind = 'text',
  rows = 3,
  maxLength,
  placeholder,
  required,
  activeLang = 'EN',
  onActiveLangChange,
}) => {
  // Normalize: every value is always a 3-key object (even if empty)
  const v = value || {};
  const safe: { EN: string; ES: string; PT: string } = {
    EN: v.EN || '',
    ES: v.ES || '',
    PT: v.PT || '',
  };

  const handleLangChange = (lang: Lang, next: string) => {
    const trimmed = maxLength ? next.slice(0, maxLength) : next;
    onChange({ ...safe, [lang]: trimmed });
  };

  return (
    <div className="space-y-2">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/10">
        {(['EN', 'ES', 'PT'] as Lang[]).map((lang) => {
          const isActive = activeLang === lang;
          const filled = (safe[lang] || '').trim().length > 0;
          return (
            <button
              key={lang}
              type="button"
              onClick={() => onActiveLangChange?.(lang)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
                isActive
                  ? 'border-[#B8963E] text-white'
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              <span>{T[lang].tab}</span>
              {filled && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Translated" />
              )}
              {!filled && required && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" title="Missing translation" />
              )}
            </button>
          );
        })}
      </div>

      {/* Field for the active language */}
      {kind === 'text' ? (
        <input
          type="text"
          value={safe[activeLang]}
          onChange={(e) => handleLangChange(activeLang, e.target.value)}
          placeholder={placeholder?.[activeLang] || `Enter ${T[activeLang].tab} text…`}
          className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 transition-all font-light"
        />
      ) : (
        <textarea
          value={safe[activeLang]}
          onChange={(e) => handleLangChange(activeLang, e.target.value)}
          placeholder={placeholder?.[activeLang] || `Enter ${T[activeLang].tab} text…`}
          rows={rows}
          className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 transition-all font-light resize-none"
        />
      )}

      {/* Counter + fallback notice */}
      <div className="flex items-center justify-between text-[10px] text-white/40 uppercase tracking-[0.2em]">
        <span>
          {safe[activeLang].length}
          {maxLength ? `/${maxLength}` : ''} chars · {T[activeLang].hint}
        </span>
        {(['EN', 'ES', 'PT'] as Lang[]).some((l) => l !== activeLang && !safe[l]) && (
          <span className="text-white/30">Other languages empty — will fall back to EN</span>
        )}
      </div>
    </div>
  );
};
