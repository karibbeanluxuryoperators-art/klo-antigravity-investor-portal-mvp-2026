import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { TrilingualField } from './TrilingualField';
import type { ExperienceItineraryDay } from '../../services/experiences';

// ── Itinerary field (v1.8.0 Step 11) ──────────────────────────────────────────
// Renders a list of {day, title{trilingual}, body{trilingual}} items.
// Used by the EntityEditor for the experiences.itinerary field.

interface ItineraryFieldProps {
  value: ExperienceItineraryDay[] | null | undefined;
  onChange: (next: ExperienceItineraryDay[]) => void;
  lang: 'EN' | 'ES' | 'PT';
}

const T = {
  addDay:    { EN: 'Add day', ES: 'Añadir día', PT: 'Adicionar dia' },
  removeDay: { EN: 'Remove day', ES: 'Eliminar día', PT: 'Remover dia' },
  day:       { EN: 'Day', ES: 'Día', PT: 'Dia' },
  dayTitle:  { EN: 'Day title', ES: 'Título del día', PT: 'Título do dia' },
  dayBody:   { EN: 'Day description', ES: 'Descripción del día', PT: 'Descrição do dia' },
  noDays:    {
    EN: 'No days yet. Add the first day to start the itinerary.',
    ES: 'Aún no hay días. Añade el primer día para empezar el itinerario.',
    PT: 'Ainda não há dias. Adicione o primeiro dia para começar o roteiro.',
  },
};

export const ItineraryField: React.FC<ItineraryFieldProps> = ({
  value,
  onChange,
  lang,
}) => {
  const days: ExperienceItineraryDay[] = Array.isArray(value) ? value : [];

  const addDay = () => {
    const next: ExperienceItineraryDay = {
      day: days.length + 1,
      title: { EN: '', ES: '', PT: '' },
      body: { EN: '', ES: '', PT: '' },
    };
    onChange([...days, next]);
  };

  const removeAt = (i: number) => {
    onChange(days.filter((_, idx) => idx !== i));
  };

  const moveAt = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= days.length) return;
    const next = [...days];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const updateAt = (i: number, patch: Partial<ExperienceItineraryDay>) => {
    onChange(days.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  };

  return (
    <div className="space-y-3">
      {days.length === 0 ? (
        <p className="text-[10px] text-white/40 italic">{T.noDays[lang]}</p>
      ) : (
        <div className="space-y-3">
          {days.map((d, i) => (
            <ItineraryDayItem
              key={i}
              day={d}
              index={i}
              total={days.length}
              lang={lang}
              onChange={(patch) => updateAt(i, patch)}
              onRemove={() => removeAt(i)}
              onMove={(dir) => moveAt(i, dir)}
            />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={addDay}
        className="w-full py-3 border border-dashed border-white/15 hover:border-[#B8963E]/50 hover:bg-white/5 rounded-xl text-[10px] font-bold uppercase tracking-[0.3em] text-white/60 hover:text-white transition-all flex items-center justify-center gap-2"
      >
        <Plus size={12} /> {T.addDay[lang]}
      </button>
    </div>
  );
};

interface ItineraryDayItemProps {
  day: ExperienceItineraryDay;
  index: number;
  total: number;
  lang: 'EN' | 'ES' | 'PT';
  onChange: (patch: Partial<ExperienceItineraryDay>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

const ItineraryDayItem: React.FC<ItineraryDayItemProps> = ({
  day,
  index,
  total,
  lang,
  onChange,
  onRemove,
  onMove,
}) => {
  const [activeLang, setActiveLang] = useState<'EN' | 'ES' | 'PT'>('EN');

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GripVertical className="text-white/20" size={14} />
          <span className="text-[10px] text-white/40 uppercase tracking-[0.3em]">
            {T.day[lang]} {day.day}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-30 rounded transition-colors"
            aria-label="Move up"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-30 rounded transition-colors"
            aria-label="Move down"
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="w-7 h-7 flex items-center justify-center text-red-400/60 hover:text-red-400 rounded transition-colors"
            aria-label={T.removeDay[lang]}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-semibold shrink-0">
          {T.day[lang]} #
        </label>
        <input
          type="number"
          min={1}
          max={30}
          value={day.day}
          onChange={(e) => onChange({ day: parseInt(e.target.value, 10) || 1 })}
          className="w-20 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 transition-all text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-semibold">
          {T.dayTitle[lang]}
        </label>
        <TrilingualField
          value={day.title}
          onChange={(title) => onChange({ title })}
          kind="text"
          maxLength={120}
          activeLang={activeLang}
          onActiveLangChange={setActiveLang}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-semibold">
          {T.dayBody[lang]}
        </label>
        <TrilingualField
          value={day.body}
          onChange={(body) => onChange({ body })}
          kind="textarea"
          rows={3}
          maxLength={500}
          activeLang={activeLang}
          onActiveLangChange={setActiveLang}
        />
      </div>
    </div>
  );
};
