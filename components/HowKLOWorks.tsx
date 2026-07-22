import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Search, FileCheck, Plane } from 'lucide-react';

// Local Language alias - see SupplierPortal.tsx for rationale
type Language = 'EN' | 'ES' | 'PT';

interface HowKLOWorksProps {
  lang: Language;
}

const T_FLOW: Record<string, { EN: string; ES: string; PT: string }> = {
  eyebrow:   { EN: 'The KLO Way', ES: 'El Estilo KLO', PT: 'O Jeito KLO' },
  title:     { EN: 'Four Steps to Your Caribbean Moment', ES: 'Cuatro Pasos a Tu Momento Caribeño', PT: 'Quatro Passos ao Seu Momento Caribenho' },
  subtitle:  { EN: 'A single concierge. A curated proposal. In under 24 hours.',
               ES: 'Un solo concierge. Una propuesta curada. En menos de 24 horas.',
               PT: 'Um só concierge. Uma proposta curada. Em menos de 24 horas.' },
  step1_eyebrow: { EN: 'Step 01', ES: 'Paso 01', PT: 'Passo 01' },
  step1_title:   { EN: 'Tell us your moment', ES: 'Cuéntanos tu momento', PT: 'Conte-nos o seu momento' },
  step1_body:    { EN: 'Share the occasion, dates, and preferences — flight, yacht, villa, staff, or all five pillars. One conversation, one operator.',
                    ES: 'Comparte la ocasión, fechas y preferencias — vuelo, yate, villa, staff, o los cinco pilares. Una sola conversación, un solo operador.',
                    PT: 'Compartilhe a ocasião, datas e preferências — voo, iate, villa, staff, ou os cinco pilares. Uma conversa, um operador.' },
  step2_eyebrow: { EN: 'Step 02', ES: 'Paso 02', PT: 'Passo 02' },
  step2_title:   { EN: 'We curate three options', ES: 'Curamos tres opciones', PT: 'Curamos três opções' },
  step2_body:    { EN: 'Our concierge team presents three vetted proposals within 24 hours, with transparent pricing, verified partners, and zero hidden fees.',
                    ES: 'Nuestro equipo de conserjería presenta tres propuestas verificadas en 24 horas, con precios transparentes, aliados verificados y cero costos ocultos.',
                    PT: 'Nossa equipe de concierge apresenta três propostas verificadas em 24 horas, com preços transparentes, parceiros verificados e zero taxas ocultas.' },
  step3_eyebrow: { EN: 'Step 03', ES: 'Paso 03', PT: 'Passo 03' },
  step3_title:   { EN: 'You confirm, we book', ES: 'Tú confirmas, nosotros reservamos', PT: 'Você confirma, nós reservamos' },
  step3_body:    { EN: 'Pick the option that fits. We handle every booking, every payment, every confirmation. One signature, one payment, one coordinator.',
                    ES: 'Elige la opción que mejor encaje. Nosotros manejamos cada reserva, cada pago, cada confirmación. Una firma, un pago, un coordinador.',
                    PT: 'Escolha a opção que combina. Cuidamos de cada reserva, cada pagamento, cada confirmação. Uma assinatura, um pagamento, um coordenador.' },
  step4_eyebrow: { EN: 'Step 04', ES: 'Paso 04', PT: 'Passo 04' },
  step4_title:   { EN: 'You arrive. We are already there.', ES: 'Llegas. Ya estamos ahí.', PT: 'Você chega. Nós já estamos lá.' },
  step4_body:    { EN: 'A private transfer meets you at the gate. The yacht is fueled. The villa is stocked. We stay on call for every adjustment, 24/7, for the entire trip.',
                    ES: 'Un transfer privado te espera en la puerta. El yate está listo. La villa está aprovisionada. Estamos disponibles 24/7 para cada ajuste, durante todo el viaje.',
                    PT: 'Um transfer privativo espera no portão. O iate está pronto. A villa está abastecida. Ficamos à disposição 24/7 para cada ajuste, durante toda a viagem.' },
  cta:        { EN: 'Plan Your Trip', ES: 'Planifica Tu Viaje', PT: 'Planeje Sua Viagem' },
};

const t = (key: keyof typeof T_FLOW, lang: Language): string => {
  const entry = T_FLOW[key];
  return (entry && (entry[lang] || entry.EN)) || '';
};

const STEPS = [
  { id: '1', Icon: MessageSquare, eyebrow: 'step1_eyebrow', title: 'step1_title', body: 'step1_body' },
  { id: '2', Icon: Search,        eyebrow: 'step2_eyebrow', title: 'step2_title', body: 'step2_body' },
  { id: '3', Icon: FileCheck,     eyebrow: 'step3_eyebrow', title: 'step3_title', body: 'step3_body' },
  { id: '4', Icon: Plane,         eyebrow: 'step4_eyebrow', title: 'step4_title', body: 'step4_body' },
] as const;

export const HowKLOWorks: React.FC<HowKLOWorksProps> = ({ lang }) => {
  return (
    <section id="how-klo-works" className="py-32 bg-[#0a1518] text-white relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#B8963E]/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-20 max-w-4xl mx-auto">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="h-px w-8 bg-[#B8963E]"></div>
            <p className="text-[#B8963E] font-bold text-[10px] uppercase tracking-[0.5em]">
              {t('eyebrow', lang)}
            </p>
            <div className="h-px w-8 bg-[#B8963E]"></div>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-8 text-white serif leading-tight">
            {t('title', lang)}
          </h2>
          <p className="text-white/60 text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto">
            {t('subtitle', lang)}
          </p>
        </div>

        {/* Desktop: 4 cards in a row; Mobile: stacked. Connected by a horizontal line */}
        <div className="relative">
          {/* Connecting line (desktop only) */}
          <div
            className="hidden md:block absolute top-12 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-[#B8963E]/40 to-transparent"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-6 lg:gap-10 relative">
            {STEPS.map(({ id, Icon, eyebrow, title, body }, i) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: 'easeOut' }}
                className="relative text-center md:text-left"
              >
                {/* Number badge with icon */}
                <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-[#B8963E] to-[#8a6f2e] shadow-lg shadow-[#B8963E]/20">
                  <Icon size={32} className="text-white" strokeWidth={1.5} aria-hidden="true" />
                  <span className="absolute -top-2 -right-2 w-8 h-8 bg-[#0a1518] text-white rounded-full text-xs font-bold flex items-center justify-center border-2 border-[#B8963E]">
                    {id}
                  </span>
                </div>

                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#B8963E] mb-2">
                  {t(eyebrow as any, lang)}
                </p>
                <h3 className="text-xl md:text-2xl font-serif italic text-white mb-3 leading-tight">
                  {t(title as any, lang)}
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  {t(body as any, lang)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <button
            onClick={() => {
              // Fire the same handler the Navbar "Contact" button uses.
              const navBtn = document.querySelector('button[aria-label*="Contact" i], button[aria-label*="Contacto" i]') as HTMLButtonElement | null;
              if (navBtn) navBtn.click();
              else document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-3 px-10 py-4 bg-[#B8963E] text-white rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white hover:text-slate-900 transition-all duration-500 shadow-lg shadow-[#B8963E]/20"
          >
            {t('cta', lang)}
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowKLOWorks;
