import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import { TRANSLATIONS, PARTNERS, getTranslation } from './constants';
import { Language } from './types';

const HERO_STATIC_IMAGE = "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&q=80&w=1920";

function App() {
  const [lang, setLang] = useState<Language>('es');
  const [isReady, setIsReady] = useState(false);

  // Initialize language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && ['es', 'en', 'pt'].includes(savedLang)) {
      setLang(savedLang);
    } else {
      localStorage.setItem('language', 'es');
      setLang('es');
    }
    setIsReady(true);
  }, []);

  // Update HTML lang attribute
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Translation function
  const t = useCallback((key: string): any => {
    return getTranslation(key, lang);
  }, [lang]);

  // Language change handler
  const handleLanguageChange = useCallback((newLang: Language) => {
    if (newLang !== lang) {
      setLang(newLang);
      localStorage.setItem('language', newLang);
    }
  }, [lang]);

  if (!isReady) {
    return <div className="min-h-screen bg-slate-900" />;
  }

  return (
    <div className="min-h-screen selection:bg-luxury-teal selection:text-white" key={lang}>
      <Navbar 
        lang={lang} 
        setLang={handleLanguageChange} 
        t={t} 
        onInquiryOpen={() => {}} 
      />

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

        {/* Pre-Launch Message Section */}
        <section className="py-32 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-72 h-72 bg-luxury-teal rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
          </div>
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="w-20 h-20 bg-luxury-teal rounded-full flex items-center justify-center mx-auto mb-8">
                <span className="text-3xl font-bold text-white">K</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 serif leading-tight">
                Coming Soon
              </h1>
              <p className="text-xl text-white/70 mb-6 font-light leading-relaxed max-w-2xl mx-auto">
                Karibbean Luxury Operators is currently finalizing its legal structure (LLC/SAS) 
                and building the most exclusive ultra-luxury travel platform in the Caribbean.
              </p>
              <div className="inline-block px-6 py-2 bg-luxury-teal/20 border border-luxury-teal/50 rounded-full mb-12">
                <span className="text-luxury-teal text-sm uppercase tracking-wider">Private Aviation · Superyachts · Exclusive Villas · Elite Staffing</span>
              </div>
              
              {/* Email Contact - Wider Box */}
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 max-w-xl mx-auto">
                <h3 className="text-xl font-bold mb-4 serif text-luxury-teal">Contact Us</h3>
                <a 
                  href="mailto:hola@karibbeanluxuryoperators.lat"
                  className="text-white text-xl md:text-2xl font-light hover:text-luxury-teal transition-colors break-all"
                >
                  hola@karibbeanluxuryoperators.lat
                </a>
                <p className="text-white/40 text-sm mt-6">
                  Reach out for investment inquiries, partnerships, or early access.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer id="footer" className="bg-[#0a1518] py-32 text-white overflow-hidden relative border-t border-white/5">
          <div className="container mx-auto px-6 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start border-b border-white/5 pb-24 mb-24 gap-20">
              <div className="max-w-md">
                <h3 className="text-6xl font-bold serif mb-10 tracking-tighter text-luxury-teal">KLO</h3>
                <p className="text-white/40 leading-relaxed text-lg mb-8 font-light">
                  {t('footer.description')}
                </p>
                <div className="mb-10 group">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-white/20 mb-2">{t('footer.connect')}</p>
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
                  <a 
                    href="https://www.linkedin.com/in/juancarlosmolinad" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/40 hover:text-luxury-teal transition-all transform hover:scale-125 duration-300" 
                    title="LinkedIn"
                  >
                    <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-20">
                <div className="space-y-8">
                  <h4 className="text-xs font-bold uppercase tracking-[0.4em] text-white/20">{t('footer.menu_title')}</h4>
                  <ul className="space-y-4">
                    <li><a href="#" className="text-white/60 hover:text-white transition-colors">{t('nav.destinations')}</a></li>
                    <li><a href="#" className="text-white/60 hover:text-white transition-colors">{t('nav.services')}</a></li>
                    <li><a href="#" className="text-white/60 hover:text-white transition-colors">{t('nav.investors')}</a></li>
                  </ul>
                </div>
                <div className="space-y-8">
                  <h4 className="text-xs font-bold uppercase tracking-[0.4em] text-white/20">{t('footer.legal_title')}</h4>
                  <ul className="space-y-4">
                    <li><a href="#" className="text-white/60 hover:text-white transition-colors">{t('footer.privacy')}</a></li>
                    <li><a href="#" className="text-white/60 hover:text-white transition-colors">{t('footer.terms')}</a></li>
                    <li><a href="#" className="text-white/60 hover:text-white transition-colors">{t('footer.cookies')}</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="text-center pt-24">
              <p className="text-[10px] text-white/10 uppercase tracking-[0.5em] leading-relaxed">
                © {new Date().getFullYear()} KLO. {t('footer.tagline')}
              </p>
            </div>
          </div>
        </footer>
      </main>

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
