import React, { useState } from 'react';

interface ContentSection {
  title: string;
  text: string;
}

interface FLSContent {
  es: ContentSection;
  en: ContentSection;
  pt: ContentSection;
}

const ForwardLookingStatement: React.FC = () => {
  const [activeLanguage, setActiveLanguage] = useState<'es' | 'en' | 'pt'>('es');

  const content: FLSContent = {
    es: {
      title: 'Declaración Prospectiva',
      text: 'La información presentada contiene declaraciones prospectivas sobre planes y proyecciones futuras. KLO cuenta con Memorandos de Entendimiento (MOUs) y acuerdos verbales con socios estratégicos. Ninguno de los proyectos debe considerarse definitivo hasta la formalización de contratos. Los resultados pueden diferir debido a condiciones de mercado, regulatorias, financiamiento y otros factores. Esta declaración no constituye oferta de valores o garantía de rendimientos.'
    },
    en: {
      title: 'Forward-Looking Statement',
      text: 'The information presented contains forward-looking statements about plans and future projections. KLO has Memoranda of Understanding (MOUs) and verbal agreements with strategic partners. None of the projects should be considered definitive until contracts are formalized. Results may differ due to market conditions, regulatory factors, financing, and other variables. This statement does not constitute an offer of securities or guarantee of returns.'
    },
    pt: {
      title: 'Declaração Prospectiva',
      text: 'As informações apresentadas contêm declarações prospectivas sobre planos e projeções futuras. A KLO possui Memorandos de Entendimento (MOUs) e acordos verbais com parceiros estratégicos. Nenhum dos projetos deve ser considerado definitivo até a formalização de contratos. Os resultados podem diferir devido a condições de mercado, fatores regulatórios, financiamento e outras variáveis. Esta declaração não constitui oferta de valores mobiliários ou garantia de retornos.'
    }
  };

  const languages = [
    { code: 'es' as const, flag: '🇪🇸', name: 'ES' },
    { code: 'en' as const, flag: '🇬🇧', name: 'EN' },
    { code: 'pt' as const, flag: '🇧🇷', name: 'PT' }
  ];

  return (
    <section className="py-8 bg-slate-50 border-t border-slate-100">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex gap-2 shrink-0">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setActiveLanguage(lang.code)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeLanguage === lang.code
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-200'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {content[activeLanguage].title}
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              {content[activeLanguage].text}
            </p>
            <p className="text-[10px] text-slate-400 mt-2 italic">
              Última actualización: Enero 2026
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForwardLookingStatement;
