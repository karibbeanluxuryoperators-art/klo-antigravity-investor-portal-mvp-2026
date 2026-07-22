import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Quote, Star } from 'lucide-react';

// Local Language alias
type Language = 'EN' | 'ES' | 'PT';

interface KLOTestimonialsProps {
  lang: Language;
}

const T_TESTIMONIALS: Record<string, { EN: string; ES: string; PT: string }> = {
  eyebrow:  { EN: 'Voices from the Journey', ES: 'Voces del Viaje', PT: 'Vozes da Jornada' },
  title:    { EN: 'Why Our Guests Return', ES: 'Por Qué Nuestros Huéspedes Regresan', PT: 'Por Que Nossos Convidados Voltam' },
  subtitle: { EN: 'Three commitments behind every KLO experience.',
               ES: 'Tres compromisos detrás de cada experiencia KLO.',
               PT: 'Três compromissos por trás de cada experiência KLO.' },
  testimonial1_quote: {
    EN: 'KLO handled our family of eight for a Cartagena week — a yacht day, a private chef, a helicopter to the Rosario Islands. One signature, one payment, zero friction. We have not travelled this way before.',
    ES: 'KLO manejó a nuestra familia de ocho durante una semana en Cartagena — un día de yate, un chef privado, un helicóptero a las Islas del Rosario. Una firma, un pago, cero fricción. No habíamos viajado así antes.',
    PT: 'A KLO cuidou da nossa família de oito durante uma semana em Cartagena — um dia de iate, um chef particular, um helicóptero até as Ilhas do Rosário. Uma assinatura, um pagamento, zero atrito. Nunca tínhamos viajado assim.',
  },
  testimonial1_name: { EN: 'Family of 8', ES: 'Familia de 8', PT: 'Família de 8' },
  testimonial1_role: { EN: 'Returning guests · Miami → Cartagena', ES: 'Huéspedes recurrentes · Miami → Cartagena', PT: 'Convidados recorrentes · Miami → Cartagena' },
  testimonial2_quote: {
    EN: 'Three proposals in twelve hours. Transparent pricing. Verified partners. I did not have to call a single airline. That is the concierge I have been trying to hire for ten years.',
    ES: 'Tres propuestas en doce horas. Precios transparentes. Aliados verificados. No tuve que llamar a ninguna aerolínea. Ese es el conserje que llevo diez años intentando contratar.',
    PT: 'Três propostas em doze horas. Preços transparentes. Parceiros verificados. Não precisei ligar para nenhuma companhia aérea. Esse é o concierge que tento contratar há dez anos.',
  },
  testimonial2_name: { EN: 'Repeat client', ES: 'Cliente recurrente', PT: 'Cliente recorrente' },
  testimonial2_role: { EN: 'Tech founder · São Paulo → Medellín', ES: 'Fundador tech · São Paulo → Medellín', PT: 'Fundador de tech · São Paulo → Medellín' },
  testimonial3_quote: {
    EN: 'We wanted a quiet New Year\'s Eve on a private island, with the family and nobody else. KLO delivered a 38m catamaran, two chefs, a sommelier, and a security team. The only thing we had to think about was the wine.',
    ES: 'Queríamos una Nochevieja tranquila en una isla privada, con la familia y nadie más. KLO entregó un catamarán de 38m, dos chefs, un sommelier y un equipo de seguridad. Lo único en lo que tuvimos que pensar fue en el vino.',
    PT: 'Queríamos uma Réveillon tranquila em uma ilha particular, com a família e mais ninguém. A KLO entregou um catamarã de 38m, dois chefs, um sommelier e uma equipe de segurança. A única coisa em que tivemos que pensar foi no vinho.',
  },
  testimonial3_name: { EN: 'Family principal', ES: 'Familia principal', PT: 'Família principal' },
  testimonial3_role: { EN: 'Annual client · New York → San Andrés', ES: 'Cliente anual · New York → San Andrés', PT: 'Cliente anual · New York → San Andrés' },
  // FAQ
  faq_title: { EN: 'Frequently Asked', ES: 'Preguntas Frecuentes', PT: 'Perguntas Frequentes' },
  faq1_q:    { EN: 'How fast does KLO respond?',
               ES: '¿Qué tan rápido responde KLO?',
               PT: 'Quão rápido a KLO responde?' },
  faq1_a:    { EN: 'Within 24 hours of any qualified inquiry. Most proposals arrive in 12 hours or less.',
               ES: 'Dentro de 24 horas de cualquier consulta calificada. La mayoría de las propuestas llegan en 12 horas o menos.',
               PT: 'Em até 24 horas após qualquer consulta qualificada. A maioria das propostas chega em 12 horas ou menos.' },
  faq2_q:    { EN: 'Do I work with one concierge or a team?',
               ES: '¿Trabajo con un solo conserje o un equipo?',
               PT: 'Trabalho com um único concierge ou com uma equipe?' },
  faq2_a:    { EN: 'One. From your first WhatsApp to your last transfer, the same person owns your trip.',
               ES: 'Con uno. Desde tu primer WhatsApp hasta tu último transfer, la misma persona es dueña de tu viaje.',
               PT: 'Com um. Do seu primeiro WhatsApp ao seu último transfer, a mesma pessoa é a responsável pela sua viagem.' },
  faq3_q:    { EN: 'Are the partners verified?',
               ES: '¿Los aliados están verificados?',
               PT: 'Os parceiros são verificados?' },
  faq3_a:    { EN: 'Yes. Every aircraft, yacht, vehicle, and property is vetted by our team. We carry the liability, not you.',
               ES: 'Sí. Cada aeronave, yate, vehículo y propiedad es verificado por nuestro equipo. Nosotros cargamos con la responsabilidad, no tú.',
               PT: 'Sim. Cada aeronave, iate, veículo e propriedade é verificada pela nossa equipe. A responsabilidade é nossa, não sua.' },
  faq4_q:    { EN: 'What if I do not speak Spanish?',
               ES: '¿Qué pasa si no hablo español?',
               PT: 'E se eu não falar espanhol?' },
  faq4_a:    { EN: 'No problem — we work in English, Spanish, and Portuguese. The proposal, the contracts, and the on-the-ground coordination all happen in your language.',
               ES: 'Sin problema — trabajamos en inglés, español y portugués. La propuesta, los contratos y la coordinación en destino, todo en tu idioma.',
               PT: 'Sem problema — trabalhamos em inglês, espanhol e português. A proposta, os contratos e a coordenação no destino, tudo no seu idioma.' },
  faq5_q:    { EN: 'How do you charge?',
               ES: '¿Cómo cobran?',
               PT: 'Como vocês cobram?' },
  faq5_a:    { EN: 'Per trip, with a single all-inclusive quote before any commitment. No hourly fees, no surprise markups, no hidden service charges.',
               ES: 'Por viaje, con una sola cotización todo-incluido antes de cualquier compromiso. Sin tarifas por hora, sin recargos sorpresa, sin costos ocultos.',
               PT: 'Por viagem, com uma única cotação tudo-incluso antes de qualquer compromisso. Sem taxas por hora, sem acréscimos surpresa, sem custos ocultos.' },
};

const t = (key: keyof typeof T_TESTIMONIALS, lang: Language): string => {
  const entry = T_TESTIMONIALS[key];
  return (entry && (entry[lang] || entry.EN)) || '';
};

const TESTIMONIALS = [
  { quoteKey: 'testimonial1_quote', nameKey: 'testimonial1_name', roleKey: 'testimonial1_role' },
  { quoteKey: 'testimonial2_quote', nameKey: 'testimonial2_name', roleKey: 'testimonial2_role' },
  { quoteKey: 'testimonial3_quote', nameKey: 'testimonial3_name', roleKey: 'testimonial3_role' },
] as const;

const FAQS = [
  { qKey: 'faq1_q', aKey: 'faq1_a' },
  { qKey: 'faq2_q', aKey: 'faq2_a' },
  { qKey: 'faq3_q', aKey: 'faq3_a' },
  { qKey: 'faq4_q', aKey: 'faq4_a' },
  { qKey: 'faq5_q', aKey: 'faq5_a' },
] as const;

export const KLOTestimonials: React.FC<KLOTestimonialsProps> = ({ lang }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <>
      {/* Testimonials */}
      <section id="voices" className="py-32 bg-slate-50 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20 max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="h-px w-8 bg-[#B8963E]"></div>
              <p className="text-[#B8963E] font-bold text-[10px] uppercase tracking-[0.5em]">
                {t('eyebrow', lang)}
              </p>
              <div className="h-px w-8 bg-[#B8963E]"></div>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-8 text-slate-900 serif leading-tight">
              {t('title', lang)}
            </h2>
            <p className="text-slate-500 text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto">
              {t('subtitle', lang)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {TESTIMONIALS.map((t_item, i) => (
              <motion.figure
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' }}
                className="bg-white p-8 border border-slate-200 hover:border-[#B8963E]/30 transition-all duration-500 relative"
              >
                <Quote size={32} className="text-[#B8963E]/30 mb-4" aria-hidden="true" />
                <div className="flex gap-1 mb-4" aria-label="5 stars">
                  {[0, 1, 2, 3, 4].map(s => (
                    <Star key={s} size={14} className="fill-[#B8963E] text-[#B8963E]" />
                      ))}
                    </div>
                <blockquote className="text-slate-700 leading-relaxed mb-6 text-sm italic">
                  &ldquo;{t(t_item.quoteKey as any, lang)}&rdquo;
                </blockquote>
                <figcaption>
                  <div className="text-xs uppercase tracking-[0.2em] font-bold text-slate-900">
                    {t(t_item.nameKey as any, lang)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {t(t_item.roleKey as any, lang)}
                  </div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-32 bg-white">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="text-center mb-16">
            <p className="text-[#B8963E] font-bold text-[10px] uppercase tracking-[0.5em] mb-3">
              {t('faq_title', lang)}
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 serif">
              {t('faq_title', lang)}
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="border border-slate-200 bg-white">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 p-6 text-left hover:bg-slate-50 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="text-base md:text-lg font-medium text-slate-900">
                      {t(f.qKey as any, lang)}
                    </span>
                    <ChevronDown
                      size={20}
                      className={`text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#B8963E]' : ''}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 text-slate-600 leading-relaxed text-sm">
                          {t(f.aKey as any, lang)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};

export default KLOTestimonials;
