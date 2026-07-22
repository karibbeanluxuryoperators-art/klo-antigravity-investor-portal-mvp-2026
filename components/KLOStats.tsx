import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

// Local Language alias
type Language = 'EN' | 'ES' | 'PT';

interface KLOStatsProps {
  lang: Language;
}

const T_STATS: Record<string, { EN: string; ES: string; PT: string }> = {
  eyebrow:    { EN: 'By the numbers', ES: 'En números', PT: 'Em números' },
  title:      { EN: 'Built to Scale, Designed to Feel Personal', ES: 'Construido para Escalar, Diseñado para Sentirse Personal', PT: 'Construído para Escalar, Projetado para Sentir Pessoal' },
  stat1_value: { EN: '5',  ES: '5',  PT: '5'  },
  stat1_label: { EN: 'Revenue Units', ES: 'Unidades de Negocio', PT: 'Unidades de Negócio' },
  stat1_sub:   { EN: 'Aviation · Transport · Yachts · Lodging · Staff',
                  ES: 'Aviación · Transporte · Yates · Alojamiento · Personal',
                  PT: 'Aviação · Transporte · Iates · Hospedagem · Equipe' },
  stat2_value: { EN: '24h', ES: '24h', PT: '24h' },
  stat2_label: { EN: 'Response Time', ES: 'Tiempo de Respuesta', PT: 'Tempo de Resposta' },
  stat2_sub:   { EN: 'From inquiry to curated proposal',
                  ES: 'De la consulta a la propuesta curada',
                  PT: 'Da consulta à proposta curada' },
  stat3_value: { EN: '400+', ES: '400+', PT: '400+' },
  stat3_label: { EN: 'Clients / Year', ES: 'Clientes / Año', PT: 'Clientes / Ano' },
  stat3_sub:   { EN: 'UHNWI pipeline target Y1',
                  ES: 'Meta de pipeline UHNWI Año 1',
                  PT: 'Meta de pipeline UHNWI Ano 1' },
  stat4_value: { EN: '4',  ES: '4',  PT: '4'  },
  stat4_label: { EN: 'Strategic Allies', ES: 'Aliados Estratégicos', PT: 'Aliados Estratégicos' },
  stat4_sub:   { EN: 'Searca · Vianco · Rebold · Legal',
                  ES: 'Searca · Vianco · Rebold · Legal',
                  PT: 'Searca · Vianco · Rebold · Legal' },
  stat5_value: { EN: '3',  ES: '3',  PT: '3'  },
  stat5_label: { EN: 'Languages', ES: 'Idiomas', PT: 'Idiomas' },
  stat5_sub:   { EN: 'EN · ES · PT — written, spoken, curated',
                  ES: 'EN · ES · PT — escrito, hablado, curado',
                  PT: 'EN · ES · PT — escrito, falado, curado' },
  stat6_value: { EN: '1',  ES: '1',  PT: '1'  },
  stat6_label: { EN: 'Operator', ES: 'Operador', PT: 'Operador' },
  stat6_sub:   { EN: 'One signature. One payment. One coordinator.',
                  ES: 'Una firma. Un pago. Un coordinador.',
                  PT: 'Uma assinatura. Um pagamento. Um coordenador.' },
};

const t = (key: keyof typeof T_STATS, lang: Language): string => {
  const entry = T_STATS[key];
  return (entry && (entry[lang] || entry.EN)) || '';
};

interface Stat { value: string; labelKey: keyof typeof T_STATS; subKey: keyof typeof T_STATS; }

const STATS: Stat[] = [
  { value: '5',    labelKey: 'stat1_label', subKey: 'stat1_sub' },
  { value: '24h',  labelKey: 'stat2_label', subKey: 'stat2_sub' },
  { value: '400+', labelKey: 'stat3_label', subKey: 'stat3_sub' },
  { value: '4',    labelKey: 'stat4_label', subKey: 'stat4_sub' },
  { value: '3',    labelKey: 'stat5_label', subKey: 'stat5_sub' },
  { value: '1',    labelKey: 'stat6_label', subKey: 'stat6_sub' },
];

// Count-up animation for the big numbers.
function useCountUp(target: string, durationMs = 1400): string {
  // Strip non-digits, count up to that, restore formatting.
  const numericMatch = target.match(/[\d,]+/);
  const targetNum = numericMatch ? parseInt(numericMatch[0].replace(/,/g, ''), 10) : 0;
  const suffix = target.replace(/[\d,]+/, ''); // e.g. "h", "+"
  const prefix = target.startsWith(target.match(/[^\d]*/)?.[0] || '') ? target.match(/[^\d]*/)?.[0] || '' : '';
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (targetNum === 0) { setDisplay(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = Math.round(targetNum * eased);
      // Re-attach original formatting (commas for 400+)
      const formatted = cur.toLocaleString('en-US');
      setDisplay(`${prefix}${formatted}${suffix}`);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, targetNum, prefix, suffix, durationMs]);

  return display;
}

function StatCard({ stat, lang, index }: { stat: Stat; lang: Language; index: number }) {
  const animated = useCountUp(stat.value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: 'easeOut' }}
      className="group text-center p-8 border border-white/10 bg-white/5 backdrop-blur-sm hover:border-[#B8963E]/50 transition-all duration-500"
    >
      <div className="text-5xl md:text-6xl font-serif italic text-[#B8963E] mb-3 leading-none group-hover:scale-105 transition-transform duration-500">
        {animated}
      </div>
      <div className="text-xs uppercase tracking-[0.3em] text-white font-bold mb-3">
        {t(stat.labelKey, lang)}
      </div>
      <div className="text-xs text-white/50 leading-relaxed max-w-[200px] mx-auto">
        {t(stat.subKey, lang)}
      </div>
    </motion.div>
  );
}

export const KLOStats: React.FC<KLOStatsProps> = ({ lang }) => {
  return (
    <section id="klo-stats" className="py-32 bg-[#0a1518] text-white relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-[#B8963E]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-luxury-teal/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-20 max-w-4xl mx-auto">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="h-px w-8 bg-[#B8963E]"></div>
            <p className="text-[#B8963E] font-bold text-[10px] uppercase tracking-[0.5em]">
              {t('eyebrow', lang)}
            </p>
            <div className="h-px w-8 bg-[#B8963E]"></div>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white serif leading-tight">
            {t('title', lang)}
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {STATS.map((stat, i) => (
            <StatCard key={i} stat={stat} lang={lang} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default KLOStats;
