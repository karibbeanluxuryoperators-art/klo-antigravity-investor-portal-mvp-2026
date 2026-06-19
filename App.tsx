import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import { TRANSLATIONS, PARTNERS, getTranslation } from './constants';
import { Language } from './types';

const HERO_STATIC_IMAGE = "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&q=80&w=1920";

function App() {
  const [lang, setLang] = useState<Language>('es');
  const [isReady, setIsReady] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

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
        {/* Hero Section - BULLETPROOF FIX */}
        <section 
          className="relative overflow-hidden bg-slate-900"
          style={{ 
            width: '100%',
            height: '100vh',
            maxHeight: '100vh',
            margin: 0,
            padding: 0
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: '100vw',
              height: '100vh',
              overflow: 'hidden',
            }}
          >
            <img
              src={HERO_STATIC_IMAGE}
              alt="Luxury Caribbean Yacht"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                display: 'block',
              }}
            />
          </div>

          <div 
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent, rgba(0,0,0,0.9))',
              zIndex: 1,
            }}
          ></div>

          <div 
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
            }}
          >
            <div style={{ maxWidth: '42rem', textAlign: 'center', color: 'white' }}>
              <h1 style={{ fontSize: '3.75rem', fontWeight: 'bold', marginBottom: '1.5rem', lineHeight: 1.2, textShadow: '0 20px 25px rgba(0,0,0,0.5)' }} className="serif">
                {t('hero.title')}
              </h1>
              <p style={{ fontSize: '1.125rem', marginBottom: '2.5rem', opacity: 0.9, lineHeight: 1.6, textShadow: '0 10px 15px rgba(0,0,0,0.3)' }}>
                {t('hero.subtitle')}
              </p>
            </div>
          </div>

          <div 
            style={{
              position: 'absolute',
              bottom: '3rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              opacity: 0.4,
              display: 'none',
              '@media (min-width: 768px)': { display: 'block' }
            }}
            className="hidden md:block"
          >
            <div style={{ width: '1px', height: '6rem', background: 'linear-gradient(to bottom, white, transparent)' }}></div>
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

                {/* Private Charters CTA */}
                <div className="mt-8 pt-8 border-t border-white/10">
                  <p className="text-white/50 text-xs uppercase tracking-[0.3em] mb-4">Private Aviation Inquiries</p>
                  <button
                    onClick={() => setChatOpen(true)}
                    className="w-full py-4 px-6 bg-[#B8963E]/10 border border-[#B8963E]/40 hover:bg-[#B8963E]/20 hover:border-[#B8963E]/70 transition-all duration-500 text-[#B8963E] text-xs uppercase tracking-[0.4em] font-medium"
                  >
                    ✈ Speak with Maria — Private Charters Concierge
                  </button>
                </div>
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

      {/* ── MARIA CHAT WIDGET ─────────────────────────────────────────── */}

      {/* Floating button — always visible */}
      <button
        onClick={() => setChatOpen(prev => !prev)}
        aria-label="Open Private Charters Concierge"
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          zIndex: 9999,
          width: '60px',
          height: '60px',
          borderRadius: '0px',
          background: '#B8963E',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(184,150,62,0.35)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 48px rgba(184,150,62,0.55)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(184,150,62,0.35)';
        }}
      >
        {chatOpen ? (
          // X icon when open
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          // Plane icon when closed
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#0A0A0A">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        )}
      </button>

      {/* Chat panel — slides up from bottom-right */}
      {chatOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '104px',
            right: '28px',
            zIndex: 9998,
            width: 'min(420px, calc(100vw - 40px))',
            height: 'min(640px, calc(100vh - 140px))',
            boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
            border: '1px solid rgba(184,150,62,0.18)',
            background: '#0A0A0A',
            animation: 'klo-slide-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
          }}
        >
          <iframe
            src="https://klo-private-charters.vercel.app/"
            title="KLO Private Charters — Maria Concierge"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
            allow="clipboard-write"
          />
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-in { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in-up { animation: fade-in-up 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slow-zoom { from { transform: scale(1); } to { transform: scale(1.15); } }
        .animate-slow-zoom { animation: slow-zoom 30s ease-in-out infinite alternate; }
        @keyframes klo-slide-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}

export default App;
