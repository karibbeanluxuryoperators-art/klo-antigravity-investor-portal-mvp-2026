import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, MapPin, Loader2, Calendar } from 'lucide-react';
import {
  listExperiences, experienceTitle, experienceSummary, pillarLabel, formatPrice,
  type Experience,
} from '../services/experiences';

// ── Experiences section (v1.8.0 Step 11) ──────────────────────────────────────
// Public-site section that shows the curated KLO itineraries as cards.
// Renders 3 columns (desktop) / 1 column (mobile) with hero image, eyebrow,
// title, pillar pills, summary, price, and a "Plan this trip" CTA.
//
// The CTA pre-fills the PlanTripModal via the onExperienceSelect callback.
// The parent (App.tsx) wires that to the PlanTripModal with experienceId.
//
// Trilingual EN/ES/PT throughout. All copy lives in the experiences table.

interface ExperiencesProps {
  lang: 'EN' | 'ES' | 'PT';
  onExperienceSelect?: (experience: Experience) => void;
}

const T = {
  eyebrow:    { EN: 'Curated Experiences', ES: 'Experiencias Curadas', PT: 'Experiências Curadas' },
  title:      { EN: 'Six ways to fall in love with the Colombian Caribbean', ES: 'Seis maneras de enamorarte del Caribe Colombiano', PT: 'Seis maneiras de se apaixonar pelo Caribe Colombiano' },
  subtitle:   { EN: 'Pick yours.', ES: 'Elige la tuya.', PT: 'Escolha a sua.' },
  plan:       { EN: 'Plan this trip', ES: 'Planifica este viaje', PT: 'Planeje esta viagem' },
  from:       { EN: 'From', ES: 'Desde', PT: 'A partir de' },
  days:       { EN: 'days', ES: 'días', PT: 'dias' },
  loading:    { EN: 'Loading…', ES: 'Cargando…', PT: 'Carregando…' },
  empty:      { EN: 'No experiences published yet. Check back soon.', ES: 'Aún no hay experiencias publicadas. Vuelve pronto.', PT: 'Ainda não há experiências publicadas. Volte em breve.' },
  featured:   { EN: 'Featured', ES: 'Destacado', PT: 'Destaque' },
};

export const Experiences: React.FC<ExperiencesProps> = ({ lang, onExperienceSelect }) => {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listExperiences({ status: 'PUBLISHED' });
        if (!cancelled) setExperiences(data);
      } catch (e) {
        console.error('experiences fetch failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section id="experiences" className="py-24 bg-[#0a1518] text-center">
        <Loader2 className="inline-block animate-spin text-[#B8963E]" size={32} />
      </section>
    );
  }

  if (experiences.length === 0) {
    return (
      <section id="experiences" className="py-24 bg-[#0a1518]">
        <div className="container mx-auto px-6 text-center">
          <p className="text-[#B8963E] text-[10px] font-bold uppercase tracking-[0.5em] mb-4">
            {T.eyebrow[lang]}
          </p>
          <h2 className="text-4xl md:text-5xl font-serif italic text-white mb-6">
            {T.title[lang]}
          </h2>
          <p className="text-white/40 font-light italic">{T.empty[lang]}</p>
        </div>
      </section>
    );
  }

  return (
    <section id="experiences" className="py-24 bg-[#0a1518] relative overflow-hidden">
      {/* Background ornament */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 opacity-20">
        <Sparkles size={64} className="text-[#B8963E]" />
      </div>

      <div className="container mx-auto px-6 relative">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-[#B8963E] text-[10px] font-bold uppercase tracking-[0.5em] mb-4">
            ── {T.eyebrow[lang]} ──
          </p>
          <h2 className="text-4xl md:text-6xl font-serif italic text-white mb-6 leading-tight">
            {T.title[lang]}
          </h2>
          <p className="text-white/60 text-lg font-light italic">
            {T.subtitle[lang]}
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {experiences.map((exp, i) => (
            <ExperienceCard
              key={exp.id}
              experience={exp}
              lang={lang}
              index={i}
              onSelect={onExperienceSelect}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

// ── Card ──────────────────────────────────────────────────────────────────────

interface ExperienceCardProps {
  experience: Experience;
  lang: 'EN' | 'ES' | 'PT';
  index: number;
  onSelect?: (e: Experience) => void;
}

const ExperienceCard: React.FC<ExperienceCardProps> = ({ experience, lang, index, onSelect }) => {
  const title = experienceTitle(experience, lang);
  const summary = experienceSummary(experience, lang);
  const eyebrow = (lang === 'EN' ? experience.eyebrow_en : lang === 'ES' ? experience.eyebrow_es : experience.eyebrow_pt) || experience.eyebrow_en || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: 'easeOut' }}
      className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-[#B8963E]/30 transition-all duration-500"
    >
      {/* Hero image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-white/5">
        <img
          src={experience.hero_image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        {/* Featured badge */}
        {experience.featured && (
          <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-[#B8963E] text-white px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.3em]">
            <Sparkles size={10} />
            {T.featured[lang]}
          </div>
        )}
        {/* Days badge */}
        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.3em]">
          {experience.days} {T.days[lang]}
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1518] via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Eyebrow */}
        {eyebrow && (
          <p className="text-[10px] text-[#B8963E] uppercase tracking-[0.4em] font-bold">
            {eyebrow}
          </p>
        )}

        {/* Title */}
        <h3 className="text-2xl font-serif italic text-white leading-tight">
          {title}
        </h3>

        {/* Pillars */}
        {experience.pillars.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {experience.pillars.map((p) => (
              <span
                key={p}
                className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] text-white/60 uppercase tracking-[0.2em] font-semibold"
              >
                {pillarLabel(p, lang)}
              </span>
            ))}
          </div>
        )}

        {/* Summary */}
        {summary && (
          <p className="text-white/60 text-sm font-light leading-relaxed line-clamp-4">
            {summary}
          </p>
        )}

        {/* Footer: price + CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div>
            <p className="text-[9px] text-white/40 uppercase tracking-[0.3em] font-semibold">
              {T.from[lang]}
            </p>
            <p className="text-xl font-serif italic text-white">
              {formatPrice(experience.price_from, experience.currency)}
            </p>
          </div>
          <button
            onClick={() => onSelect?.(experience)}
            className="flex items-center gap-2 px-4 py-2 bg-[#B8963E]/10 border border-[#B8963E]/40 text-[#B8963E] rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-[#B8963E] hover:text-white transition-all group/btn"
          >
            {T.plan[lang]}
            <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
