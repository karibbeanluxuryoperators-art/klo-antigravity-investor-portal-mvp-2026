import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Destinations from './components/Destinations';
import { TRANSLATIONS, getTranslation, PREMIER_SERVICES } from './constants';
import { Language } from './types';
import AIAssistant from './components/AIAssistant';
import { SupplierPortal } from './components/SupplierPortal';
import { SupplierLogin } from './components/SupplierLogin';
import { SupplierDashboardGate } from './components/SupplierDashboardGate';
import { AdminGate } from './components/AdminGate';
import { PlanTripModal } from './components/PlanTripModal';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// ── Supplier portal route guard ────────────────────────────────────────────
// Detects the supplier route family in the URL and returns the subroute so
// the App can render the right surface.
//
//   /supplier           → 'portal'    (multi-step onboarding wizard)
//   /supplier/login     → 'login'     (magic-link sign-in page)
//   /supplier/dashboard → 'dashboard' (auth-gated dashboard, uses Supabase session)
//   anything else       → null        (render the public site)
//
// We use `popstate` for back/forward, but the Login ↔ Dashboard ↔ Portal
// transitions are full-page navigations (window.location.href = ...) so
// Supabase's `detectSessionInUrl` can process the access_token hash on each
// fresh page load. A SPA route change would not trigger that handler.
function useSupplierRoute(): 'portal' | 'login' | 'dashboard' | 'admin' | null {
  const compute = (): 'portal' | 'login' | 'dashboard' | 'admin' | null => {
    if (typeof window === 'undefined') return null;
    const p = window.location.pathname;
    if (p === '/supplier/login' || p === '/supplier/login/') return 'login';
    if (p === '/supplier/dashboard' || p === '/supplier/dashboard/') return 'dashboard';
    if (p === '/admin' || p === '/admin/') return 'admin';
    if (p === '/supplier' || p === '/supplier/' || p.startsWith('/supplier/')) return 'portal';
    return null;
  };
  const [subroute, setSubroute] = useState<'portal' | 'login' | 'dashboard' | 'admin' | null>(compute);
  useEffect(() => {
    const handler = () => setSubroute(compute());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  return subroute;
}

function App() {
  const [lang, setLang] = useState<Language>('es');
  const [isReady, setIsReady] = useState(false);
  const [isPlanTripOpen, setIsPlanTripOpen] = useState(false); // v1.8.0 Step 3: "Plan Your Trip" modal

  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY — before any early return.
  // React error #310 ("Rendered more hooks than during the previous render")
  // is triggered when a hook is called after a conditional return. The
  // supplier-route hook below used to be after `if (!isReady) return ...`
  // which made it skip on the first render and run on the second.
  const supplierSubroute = useSupplierRoute();

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

  // Supplier routes — render the right surface for the subroute. All three
  // live in this single guard so we keep the public-site render below untouched.
  if (supplierSubroute) {
    // Map public-site lang (lowercase) to portal lang (uppercase) — every
    // ported component expects the KLO-FULLSTACK uppercase shape.
    const portalLang: 'EN' | 'ES' | 'PT' = lang.toUpperCase() as 'EN' | 'ES' | 'PT';
    const goHome = () => { window.location.href = '/'; };
    const goToPortal = () => { window.location.href = '/supplier'; };
    const goToLogin = () => { window.location.href = '/supplier/login'; };
    const goToDashboard = () => { window.location.href = '/supplier/dashboard'; };

    if (supplierSubroute === 'login') {
      return (
        <ErrorBoundary context="Sign in" showDiagnostic>
          <div className="min-h-screen selection:bg-gold/30">
            <SupplierLogin
              lang={portalLang}
              onBack={goHome}
              onSignedIn={goToDashboard}
              onNewSupplier={goToPortal}
            />
          </div>
        </ErrorBoundary>
      );
    }

    if (supplierSubroute === 'dashboard') {
      return (
        <ErrorBoundary context="Supplier dashboard" showDiagnostic>
          <div className="min-h-screen selection:bg-gold/30">
            <SupplierDashboardGate
              lang={portalLang}
              onBack={goHome}
              onSignIn={goToLogin}
              onNotPartner={goToPortal}
            />
          </div>
        </ErrorBoundary>
      );
    }

    if (supplierSubroute === 'admin') {
      return (
        <ErrorBoundary context="Admin portal" showDiagnostic>
          <div className="min-h-screen">
            <AdminGate
              lang={portalLang}
              onBack={goHome}
              onSignIn={goToLogin}
            />
          </div>
        </ErrorBoundary>
      );
    }

    // Default: the onboarding portal.
    return (
      <ErrorBoundary context="Partner application" showDiagnostic>
        <div className="min-h-screen selection:bg-gold/30">
          <SupplierPortal
            lang={portalLang}
            onBack={goHome}
            onGoToLogin={goToLogin}
            onGoToDashboard={goToDashboard}
          />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen selection:bg-luxury-teal selection:text-white" key={lang}>
      <Navbar 
        lang={lang}
        setLang={handleLanguageChange}
        t={t}
        onInquiryOpen={() => setIsPlanTripOpen(true)}
      />

      <main>
<Hero t={t} onInquiryOpen={() => setIsPlanTripOpen(true)} />
        
{/* Destinations */}
        <Destinations t={t as any} />

        {/* Premier Services */}
        <section id="servicios" className="py-32 bg-[#0a1518] text-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-luxury-teal rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#B8963E] rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-24 max-w-4xl mx-auto">
              <div className="flex items-center justify-center space-x-3 mb-6">
                <div className="h-px w-8 bg-[#B8963E]"></div>
                <p className="text-[#B8963E] font-bold text-[10px] uppercase tracking-[0.5em]">Five Pillars · One Operator</p>
                <div className="h-px w-8 bg-[#B8963E]"></div>
              </div>
              <h2 className="text-4xl md:text-6xl font-bold mb-8 text-white serif leading-tight">
                {t('services.section_title')}
              </h2>
              <p className="text-white/50 text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto">
                {t('services.section_subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {PREMIER_SERVICES.map((svc) => (
                <div key={svc.id} className="group relative bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#B8963E]/50 transition-all duration-500 overflow-hidden">
                  <div className="relative h-56 overflow-hidden bg-slate-800">
                    <img
                      src={svc.imageUrl}
                      alt={t(svc.titleKey)}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a1518] via-transparent to-transparent"></div>
                  </div>
                  <div className="p-8">
                    <h3 className="text-2xl font-bold mb-4 text-white serif">
                      {t(svc.titleKey)}
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed font-light">
                      {t(svc.descriptionKey)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA después de servicios */}
            <div className="mt-20 text-center">
              <p className="text-white/40 text-xs uppercase tracking-[0.4em] mb-6">
                {t('services_cta.subtitle')}
              </p>
              <a
                href="mailto:hola@karibbeanluxuryoperators.lat"
                className="inline-block px-12 py-5 bg-[#B8963E]/10 border border-[#B8963E]/40 hover:bg-[#B8963E]/20 hover:border-[#B8963E]/70 transition-all duration-500 text-[#B8963E] text-xs uppercase tracking-[0.4em] font-medium"
              >
                {t('services_cta.button')}
              </a>
            </div>
          </div>
        </section>

        {/* Concierge CTA */}
        <section className="py-24 bg-slate-50 text-center">
          <div className="container mx-auto px-6 max-w-3xl">
            <p className="text-luxury-teal font-bold text-[10px] uppercase tracking-[0.5em] mb-6">{t('nav.contact') || 'Contact'}</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900 serif">
              {t('concierge.title')}
            </h2>
            <p className="text-slate-600 text-lg font-light leading-relaxed mb-10">
              {t('concierge.desc')}
            </p>
            <p className="text-slate-400 text-sm">
              {t('concierge.or_email')}{' '}
              <a href="mailto:hola@karibbeanluxuryoperators.lat" className="text-luxury-teal hover:underline font-medium">
                hola@karibbeanluxuryoperators.lat
              </a>
            </p>
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

      {/* ── MARIA AI CONCIERGE ───────────────────────────────────────── */}
      <AIAssistant t={t} lang={lang} />

      {/* ── Plan Your Trip modal (v1.8.0 Step 3) ────────────────────── */}
      <PlanTripModal
        open={isPlanTripOpen}
        onClose={() => setIsPlanTripOpen(false)}
        lang={lang}
      />

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
