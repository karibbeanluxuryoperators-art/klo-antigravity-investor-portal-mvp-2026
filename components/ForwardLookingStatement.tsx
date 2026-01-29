// components/ForwardLookingStatement.tsx
import React, { useState } from 'react';

interface ContentSection {
  title: string;
  paragraphs: string[];
  date: string;
}

interface FLSContent {
  es: ContentSection;
  en: ContentSection;
  fr: ContentSection;
}

const ForwardLookingStatement: React.FC = () => {
  const [activeLanguage, setActiveLanguage] = useState<'es' | 'en' | 'fr'>('es');

  const content: FLSContent = {
    es: {
      title: 'Declaración de Proyecciones y Compromisos Futuros',
      paragraphs: [
        'La información presentada en este sitio web respecto a <strong>Karibbéan Luxury Operators (KLO)</strong> contiene declaraciones prospectivas sobre planes, proyecciones, asociaciones y desarrollos futuros que están sujetas a diversos riesgos, incertidumbres y supuestos.',
        '<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4"><p class="text-yellow-800"><strong>IMPORTANTE:</strong> Todos los proyectos, asociaciones estratégicas, propiedades, desarrollos inmobiliarios y acuerdos comerciales mencionados en este sitio web representan oportunidades en fase de negociación, estructuración o acuerdos preliminares.</p></div>',
        'Al momento de esta publicación, KLO cuenta con:<br/><ul class="list-disc ml-6 mt-2"><li><strong>Memorandos de Entendimiento (MOU)</strong> con diversos socios estratégicos</li><li><strong>Acuerdos verbales y compromisos de palabra</strong> con propietarios, desarrolladores y operadores</li><li><strong>Negociaciones en curso</strong> para la formalización de contratos definitivos</li><li><strong>Proyecciones financieras y operativas</strong> basadas en planes de negocio y estudios de factibilidad</li></ul>',
        '<strong>Ninguno de los proyectos, propiedades o asociaciones mencionados debe considerarse como definitivo, garantizado o completamente ejecutado</strong> hasta que se formalicen los contratos correspondientes y se cumplan todas las condiciones precedentes.',
        'Los resultados reales, cronogramas de desarrollo, alianzas estratégicas y operaciones pueden diferir materialmente de las proyecciones presentadas debido a factores que incluyen, pero no se limitan a:<br/><ul class="list-disc ml-6 mt-2"><li>Cambios en condiciones de mercado y económicas</li><li>Modificaciones regulatorias y legales</li><li>Disponibilidad de financiamiento</li><li>Negociaciones contractuales</li><li>Factores operativos y logísticos</li><li>Eventos imprevistos o fuerza mayor</li></ul>',
        'Esta declaración no constituye una oferta de valores, inversión o garantía de rendimientos. Los inversionistas y partes interesadas deben realizar su propia diligencia debida y no deben basarse exclusivamente en la información prospectiva aquí presentada.'
      ],
      date: 'Última actualización: Enero 2026'
    },
    en: {
      title: 'Forward-Looking Statement and Future Commitments',
      paragraphs: [
        'The information presented on this website regarding <strong>Karibbéan Luxury Operators (KLO)</strong> contains forward-looking statements about plans, projections, partnerships, and future developments that are subject to various risks, uncertainties, and assumptions.',
        '<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4"><p class="text-yellow-800"><strong>IMPORTANT:</strong> All projects, strategic partnerships, properties, real estate developments, and commercial agreements mentioned on this website represent opportunities in negotiation phase, structuring, or preliminary agreements.</p></div>',
        'As of this publication date, KLO has:<br/><ul class="list-disc ml-6 mt-2"><li><strong>Memoranda of Understanding (MOUs)</strong> with various strategic partners</li><li><strong>Verbal agreements and handshake commitments</strong> with owners, developers, and operators</li><li><strong>Ongoing negotiations</strong> for the formalization of definitive contracts</li><li><strong>Financial and operational projections</strong> based on business plans and feasibility studies</li></ul>',
        '<strong>None of the projects, properties, or partnerships mentioned should be considered definitive, guaranteed, or fully executed</strong> until corresponding contracts are formalized and all precedent conditions are fulfilled.',
        'Actual results, development timelines, strategic alliances, and operations may differ materially from the projections presented due to factors including, but not limited to:<br/><ul class="list-disc ml-6 mt-2"><li>Changes in market and economic conditions</li><li>Regulatory and legal modifications</li><li>Financing availability</li><li>Contractual negotiations</li><li>Operational and logistical factors</li><li>Unforeseen events or force majeure</li></ul>',
        'This statement does not constitute an offer of securities, investment, or guarantee of returns. Investors and interested parties should conduct their own due diligence and should not rely exclusively on the forward-looking information presented herein.'
      ],
      date: 'Last updated: January 2026'
    },
    fr: {
      title: 'Déclaration Prospective et Engagements Futurs',
      paragraphs: [
        'Les informations présentées sur ce site web concernant <strong>Karibbéan Luxury Operators (KLO)</strong> contiennent des déclarations prospectives sur les plans, projections, partenariats et développements futurs qui sont soumis à divers risques, incertitudes et hypothèses.',
        '<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4"><p class="text-yellow-800"><strong>IMPORTANT :</strong> Tous les projets, partenariats stratégiques, propriétés, développements immobiliers et accords commerciaux mentionnés sur ce site web représentent des opportunités en phase de négociation, de structuration ou d\'accords préliminaires.</p></div>',
        'À la date de cette publication, KLO dispose de :<br/><ul class="list-disc ml-6 mt-2"><li><strong>Protocoles d\'Accord (MOU)</strong> avec divers partenaires stratégiques</li><li><strong>Accords verbaux et engagements de principe</strong> avec propriétaires, développeurs et opérateurs</li><li><strong>Négociations en cours</strong> pour la formalisation de contrats définitifs</li><li><strong>Projections financières et opérationnelles</strong> basées sur des plans d\'affaires et études de faisabilité</li></ul>',
        '<strong>Aucun des projets, propriétés ou partenariats mentionnés ne doit être considéré comme définitif, garanti ou entièrement exécuté</strong> jusqu\'à ce que les contrats correspondants soient formalisés et que toutes les conditions préalables soient remplies.',
        'Les résultats réels, les calendriers de développement, les alliances stratégiques et les opérations peuvent différer sensiblement des projections présentées en raison de facteurs incluant, sans s\'y limiter :<br/><ul class="list-disc ml-6 mt-2"><li>Changements dans les conditions du marché et économiques</li><li>Modifications réglementaires et légales</li><li>Disponibilité du financement</li><li>Négociations contractuelles</li><li>Facteurs opérationnels et logistiques</li><li>Événements imprévus ou force majeure</li></ul>',
        'Cette déclaration ne constitue pas une offre de titres, d\'investissement ou une garantie de rendements. Les investisseurs et parties intéressées doivent effectuer leur propre diligence raisonnable et ne doivent pas se fier exclusivement aux informations prospectives présentées ici.'
      ],
      date: 'Dernière mise à jour : Janvier 2026'
    }
  };

  const languages = [
    { code: 'es' as const, flag: '🇪🇸', name: 'Español' },
    { code: 'en' as const, flag: '🇬🇧', name: 'English' },
    { code: 'fr' as const, flag: '🇫🇷', name: 'Français' }
  ];

  return (
    <section className="py-16 px-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <span className="text-4xl mr-3">⚠️</span>
              <h2 className="text-2xl md:text-3xl font-bold">
                Declaración Prospectiva / Forward-Looking Statement / Déclaration Prospective
              </h2>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex justify-center gap-4 p-6 bg-slate-50 border-b">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setActiveLanguage(lang.code)}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ${
                  activeLanguage === lang.code
                    ? 'bg-slate-800 text-white shadow-lg'
                    : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-500'
                }`}
              >
                <span className="mr-2">{lang.flag}</span>
                {lang.name}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-8 md:p-12">
            <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">
              {content[activeLanguage].title}
            </h3>
            
            <div className="space-y-4 text-slate-700 leading-relaxed">
              {content[activeLanguage].paragraphs.map((paragraph, index) => (
                <div
                  key={index}
                  className="text-base md:text-lg"
                  dangerouslySetInnerHTML={{ __html: paragraph }}
                />
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 text-right">
              <p className="text-sm text-slate-500 italic">
                {content[activeLanguage].date}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForwardLookingStatement;
