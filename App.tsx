import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Destinations from './components/Destinations';
import AIAssistant from './components/AIAssistant';
import Investors from './components/Investors';
import { PREMIER_SERVICES, TEAM, ROADMAP, TRANSLATIONS, PARTNERS } from './constants';
import { Language } from './types';

// Helper function to safely get nested translations
const getTranslation = (obj: any, key: string): any => {
  return key.split('.').reduce((o, i) => o?.[i], obj) ?? key;
};

// Modal Component for luxury experience
const InquiryModal = ({ isOpen, onClose, t }: { isOpen: boolean, onClose: () => void, t: (key: string) => any }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative animate-scale-in">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="p-12 text-center">
          <h3 className="text-4xl font-bold mb-6 serif text-slate-900">{t('assistant.name')}</h3>
          <p className="text-slate-500 mb-10 font-light">{t('assistant.greeting')}</p>
          <div className="space-y-4 max-w-sm mx-auto">
            <input type="text" placeholder="Tu Nombre" className="w-full px-6 py-4 rounded-full bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-luxury-teal outline-none transition-all" />
            <input type="email" placeholder="Email" className="w-full px-6 py-4 rounded-full bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-luxury-teal outline-none transition-all" />
            <button className="w-full bg-luxury-teal text-white py-4 rounded-full font-bold tracking-widest uppercase hover:brightness-110 transition-all">{t('hero.cta')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// High-resolution static image of a luxury yacht in the Caribbean
const HERO_STATIC_IMAGE = "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&q=80&w=1920";

function App() {
  const [lang, setLang] = useState<Language>('es');
  const [growthScenario, setGrowthScenario] = useState<'conservative' | 'aggressive'>('conservative');
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && ['es', 'en', 'pt'].includes(savedLang)) {
      setLang(savedLang);
    } else {
      localStorage.setItem('language', 'es');
      setLang('es');
    }
    setIsLoading(false);
  }, []);

  // Update document lang attribute when language changes
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Reveal effect on scroll
  useEffect(() => {
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Stable translation function using useMemo
  const t = useMemo(() => {
    return (key: string): any => {
      const translations = TRANSLATIONS[lang];
      if (!translations) return key;
      return getTranslation(translations, key);
    };
  }, [lang]);

  // Stable language change handler using useCallback
  const handleLanguageChange = useCallback((newLang: Language) => {
    if (newLang !== lang) {
      setLang(newLang);
      localStorage.setItem('language', newLang);
      // Force reload to ensure all components update (optional, remove if not needed)
      // window.location.reload();
    }
  }, [lang]);

  if (isLoading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen selection:bg-luxury-teal selection:text-white" key={lang}>
      <Navbar lang={lang} setLang={handleLanguageChange} t={t} onInquiryOpen={() => setIsInquiryOpen(true)} />

      <main>
        {/* Hero Section */}
        <section className="relative h-[85vh] md:h-screen w-full flex items-center justify-center overflow-hidden bg-slate-900">
          <div className="absolute inset-0 z-0 opacity-100">
            <img
              src={HERO_STATIC_IMAGE}
              alt="Luxury Caribbean Yacht"
              className="w-full h-full object-cover scale-105 animate-slow-zoom"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90"></div>
          </div>

          <div className="relative z-10 container mx-auto px-6 text-center text-white max-w-5xl">
            <h1 className="text-3xl md:text-5xl lg:text-6xl mb-6 leading-tight animate-fade-in-up font-bold serif tracking-tight drop-shadow-2xl">
              {t('hero.title')}
            </h1>
            <p className="text-sm md:text-lg mb-10 text-white/90 max-w-2xl mx-auto font-light leading-relaxed drop-shadow-md">
              {t('hero.subtitle')}
            </p>
            <button
              onClick={() => setIsInquiryOpen(true)}
              className="group relative bg-luxury-teal text-white px-12 py-5 rounded-full text-xs font-bold tracking-[0.2em] hover:brightness-110 transition-all hover:shadow-[0_20px_50px_rgba(0,168,181,0.3)] active:scale-95 uppercase overflow-hidden"
            >
              <span className="relative z-10">{t('hero.cta')}</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </div>

          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce hidden md:block opacity-40">
            <div className="w-px h-24 bg-gradient-to-b from-white to-transparent"></div>
          </div>
        </section>

        {/* Partners Bar */}
        <section className="py-16 bg-white border-b border-slate-100 overflow-hidden">
          <div className="container mx-auto px-6">
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.4em] text-slate-300 mb-10">
              {t('services.section_subtitle')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-12 md:gap-32 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
              {PARTNERS.map((partner, idx) => (
                <div key={idx} className="flex items-center space-x-4 group cursor-default">
                  <div className="h-12 md:h-16 flex items-center justify-center transition-colors p-2">
                    <img src={partner.logo} alt={partner.name} className="h-full w-auto object-contain transition-all" />
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase group-hover:text-slate-900 transition-colors">{partner.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Destinations Grid */}
        <div className="reveal">
          <Destinations t={t} />
        </div>

        {/* Premier Services */}
        <section id="servicios" className="py-32 bg-white reveal">
          <div className="container mx-auto px-6">
            <div className="text-center mb-24 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-bold mb-8 text-slate-900 leading-tight serif">
                {t('services.section_title')}
              </h2>
              <div className="w-24 h-1 bg-luxury-teal mx-auto mb-8"></div>
              <p className="text-slate-500 text-xl font-light leading-relaxed">
                {t('services.section_subtitle')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {PREMIER_SERVICES.map((service, idx) => (
                <div key={idx} className="group bg-white p-2 rounded-2xl transition-all duration-500 hover:-translate-y-2">
                  <div className="relative h-72 mb-8 overflow-hidden rounded-3xl shadow-lg border border-slate-50">
                    <img src={service.imageUrl} alt={t(service.titleKey)} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                    <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-black/5">{service.icon}</div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                  <div className="px-6">
                    <h3 className="text-2xl font-bold mb-4 text-slate-900 serif leading-snug">{t(service.titleKey)}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed font-light">{t(service.descriptionKey)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Founders Section */}
        <section id="equipo" className="py-32 bg-slate-50 reveal">
          <div className="container mx-auto px-6">
            <div className="text-center mb-24">
              <p className="text-luxury-teal font-bold text-xs uppercase tracking-[0.4em] mb-4">
                {t('team.section_subtitle')}
              </p>
              <h2 className="text-4xl md:text-6xl font-bold text-slate-900 serif">
                {t('team.section_title')}
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-20">
              {TEAM.map((member, idx) => (
                <div key={idx} className="bg-white p-12 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl transition-all duration-500 group flex flex-col">
                  <div className="w-20 h-20 bg-slate-100 rounded-2xl mb-10 flex items-center justify-center text-2xl font-bold text-luxury-teal group-hover:bg-luxury-teal group-hover:text-white group-hover:rotate-12 transition-all duration-500">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-2 serif">{member.name}</h3>
                  <p className="text-luxury-teal font-bold text-[10px] uppercase tracking-[0.3em] mb-8">{t(member.roleKey)}</p>
                  <p className="text-slate-600 text-base leading-relaxed mb-10 font-light italic">
                    "{t(member.bioKey)}"
                  </p>
                  <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-400 tracking-widest">{t(member.equityKey)}</span>
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-luxury-teal hover:text-white cursor-pointer transition-all">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Metrics Section */}
        <section id="metricas" className="py-32 bg-slate-900 text-white reveal overflow-hidden">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-24 gap-12">
              <div className="max-w-2xl">
                <h2 className="text-4xl md:text-6xl font-bold mb-8 serif italic">Dashboard de Crecimiento</h2>
                <p className="text-white/40 text-xl font-light">Proyecciones estratégicas basadas en el despliegue de nuestra infraestructura de IA y P&L proyectado.</p>
              </div>
              <div className="bg-white/5 p-2 rounded-2xl flex border border-white/10 backdrop-blur-md">
                <button
                  onClick={() => setGrowthScenario('conservative')}
                  className={`px-10 py-4 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${growthScenario === 'conservative' ? 'bg-luxury-teal text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                  Conservador
                </button>
                <button
                  onClick={() => setGrowthScenario('aggressive')}
                  className={`px-10 py-4 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${growthScenario === 'aggressive' ? 'bg-luxury-teal text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                  Agresivo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              <div className="lg:col-span-2 space-y-12">
                <div className="bg-white/5 p-12 rounded-3xl border border-white/10 relative group">
                  <div className="absolute -top-6 -left-6 w-12 h-12 bg-luxury-teal rounded-full blur-2xl opacity-20 group-hover:opacity-50 transition-all"></div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/30 mb-16">Revenue & Net Profit Projections (USD)</h4>
                  <div className="space-y-12">
                    {[
                      { year: 'Year 1', rev: 1.32, prof: 0.24, margin: 18.7 },
                      { year: 'Year 2', rev: 3.20, prof: 0.81, margin: 25.5 },
                      { year: 'Year 3', rev: 5.06, prof: 1.36, margin: 26.9 },
                      { year: 'Year 4', rev: 5.57, prof: 1.49, margin: 26.8 },
                      { year: 'Year 5', rev: 6.13, prof: 1.64, margin: 26.7 },
                    ].map((row, i) => (
                      <div key={i} className="space-y-4">
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                            <span className="text-xl font-bold serif">{row.year}</span>
                            <span className="text-[9px] uppercase tracking-widest text-white/20">Margin: {row.margin}%</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-luxury-teal font-mono text-xl">${row.rev.toFixed(2)}M Rev</span>
                            <span className="block text-emerald-400 font-mono text-sm">${row.prof.toFixed(2)}M Profit</span>
                          </div>
                        </div>
                        <div className="flex h-3 rounded-full overflow-hidden bg-white/5 p-0.5">
                          <div style={{ width: `${(row.rev / 6.13) * 100}%` }} className="bg-luxury-teal rounded-full transition-all duration-1000 ease-out"></div>
                          <div style={{ width: `${(row.prof / 6.13) * 100}%` }} className="bg-emerald-400/30 rounded-full -ml-full transition-all duration-1000 delay-100 ease-out"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-luxury-teal text-white p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <h4 className="text-lg font-bold mb-8 serif">Net Profit Target (Year 5)</h4>
                  <div className="space-y-6">
                    <div className="flex justify-between text-2xl font-bold tracking-widest serif">
                      <span>$1.64M+</span>
                    </div>
                    <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-[100%]"></div>
                    </div>
                    <p className="text-sm opacity-60 font-light">Crecimiento escalable del 364% en 5 años basado en optimización de costos operativos.</p>
                  </div>
                </div>
                <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/10 backdrop-blur-md">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Breakeven Confidence</h4>
                  <p className="text-4xl font-bold serif">Month 4</p>
                  <div className="mt-4 flex space-x-1">
                    {[1, 2, 3, 4, 5].map(s => <div key={s} className="h-1 w-full bg-luxury-teal rounded-full"></div>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Investors Section */}
        <Investors t={t} lang={lang} />

        {/* Footer */}
        <footer id="footer" className="bg-[#0a1518] py-32 text-white overflow-hidden relative border-t border-white/5">
          <div className="container mx-auto px-6 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start border-b border-white/5 pb-24 mb-24 gap-20">
              <div className="max-w-md">
                <h3 className="text-6xl font-bold serif mb-10 tracking-tighter text-luxury-teal">KLO</h3>
                <p className="text-white/40 leading-relaxed text-lg mb-8 font-light">
                  Karibbean Luxury Operators. Redefiniendo el ecosistema del turismo de ultra-lujo en Colombia a través de la tecnología y la pasión por lo extraordinario.
                </p>
                <div className="mb-10 group">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-white/20 mb-2">Connect with us</p>
                  <a href="mailto:hola@karibbeanluxuryoperators.lat" className="text-luxury-teal text-xl font-medium hover:text-white tracking-wide transition-all duration-300">
                    hola@karibbeanluxuryoperators.lat
                  </a>
                </div>
                <div className="flex space-x-10 items-center">
                  <a href="#" className="text-white/40 hover:text-luxury-teal transition-all transform hover:scale-125 duration-300" title="Instagram">
                    <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                  <a href="#" className="text-white/40 hover:text-luxury-teal transition-all transform hover:scale-125 duration-300" title="LinkedIn">
                    <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </a>
                  <a href="#" className="text-white/40 hover:text-luxury-teal transition-all transform hover:scale-125 duration-300" title="X">
                    <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-20">
                <div className="space-y-8">
                  <h4 className="text-xs font-bold uppercase tracking-[0.4em] text-white/20">Menu</h4>
                  <ul className="space-y-4">
                    {['destinations', 'services', 'investors'].map((item) => (
                      <li key={item}>
                        <a href={`#${item === 'destinations' ? 'destinos' : item === 'services' ? 'servicios' : 'inversionistas'}`} 
                           className="text-white/60 hover:text-white transition-colors">
                          {t(`nav.${item}`)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-8">
                  <h4 className="text-xs font-bold uppercase tracking-[0.4em] text-white/20">Legal</h4>
                  <ul className="space-y-4">
                    {['Privacidad', 'Términos', 'Cookies'].map(m => (
                      <li key={m}><a href="#" className="text-white/60 hover:text-white transition-colors">{m}</a></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="text-center pt-24">
              <p className="text-[10px] text-white/10 uppercase tracking-[0.5em] leading-relaxed">
                © {new Date().getFullYear()} KLO. Lujo Incomparable. Colombia.
              </p>
            </div>
          </div>
        </footer>
      </main>

      <AIAssistant t={t} lang={lang} />
      <InquiryModal isOpen={isInquiryOpen} onClose={() => setIsInquiryOpen(false)} t={t} />

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-in { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in-up { animation: fade-in-up 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slow-zoom { from { transform: scale(1); } to { transform: scale(1.15); } }
        .animate-slow-zoom { animation: slow-zoom 30s ease-in-out infinite alternate; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}

export default App;
