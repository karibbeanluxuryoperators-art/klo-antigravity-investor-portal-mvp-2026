import React, { useState, useEffect, useCallback } from 'react';
import { MapPin } from 'lucide-react';
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
import { HowKLOWorks } from './components/HowKLOWorks';
import { KLOStats } from './components/KLOStats';
import { KLOTestimonials } from './components/KLOTestimonials';
import { PlanYourTripButton } from './components/ui/PlanYourTripButton';
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
// v1.8.0 Step 6: extended route detector to handle admin detail pages
// (e.g. /admin/suppliers/S123). Returns an object so the App can render
// the right surface (list vs detail) with the right ID.
type AdminSubroute =
  | { kind: 'list' }
  | { kind: 'detail'; entity: 'suppliers' | 'clients' | 'bookings' | 'leads'; id: string }
  | null;

function useSupplierRoute(): 'portal' | 'login' | 'dashboard' | AdminSubroute {
  const compute = (): 'portal' | 'login' | 'dashboard' | AdminSubroute => {
    if (typeof window === 'undefined') return null;
    const p = window.location.pathname.replace(/\/$/, ''); // strip trailing slash
    if (p === '/supplier/login') return 'login';
    if (p === '/supplier/dashboard') return 'dashboard';
    if (p === '/supplier' || p.startsWith('/supplier')) return 'portal';
    // /admin (list) and /admin/{entity}/{id} (detail)
    if (p === '/admin') return { kind: 'list' };
    const m = p.match(/^\/admin\/(suppliers|clients|bookings|leads)\/([^/]+)$/);
    if (m) return { kind: 'detail', entity: m[1] as any, id: m[2] };
    return null;
  };
  const [subroute, setSubroute] = useState<'portal' | 'login' | 'dashboard' | AdminSubroute>(compute);
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

  // v1.8.0 Step 3.1: post-magic-link redirect handler.
  // When Supabase sends a magic link, the email contains a URL like
  //   https://karibbeanluxuryoperators.lat/#access_token=...
  // which lands the user on `/` (root). If the email is an admin, we want
  // them to land on `/admin` instead of staying on the public site (where
  // the public Navbar will greet them). We do this by detecting the
  // access_token in the URL hash and asking /api/admin/check whether the
  // session belongs to an admin. If yes → navigate to /admin.
  // If no → leave them on `/` (they probably want the supplier portal).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    if (!/access_token=/.test(hash)) return; // Not a magic-link landing
    // Give Supabase Auth a moment to persist the session (it processes
    // the hash on its own and stores tokens in localStorage).
    const t = setTimeout(async () => {
      try {
        const mod = await import('./services/supabase');
        const session = await mod.getSupplierSession();
        const token = session?.access_token;
        if (!token) return;
        const res = await fetch('/api/admin/check', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const info = await res.json();
        if (info?.isAdmin && (window.location.pathname === '/' || window.location.pathname === '')) {
          // Clear the hash so the auth code doesn't re-trigger on re-render
          history.replaceState(null, '', '/admin');
          window.location.reload();
        }
      } catch (e) {
        // Silent — user stays on `/` and can navigate manually
      }
    }, 500);
    return () => clearTimeout(t);
  }, []);

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

    if (typeof supplierSubroute === 'object' && supplierSubroute !== null) {
      // Admin routes (list + detail)
      return (
        <ErrorBoundary context="Admin portal" showDiagnostic>
          <div className="min-h-screen">
            <AdminGate
              lang={portalLang}
              onBack={goHome}
              onSignIn={goToLogin}
              subroute={supplierSubroute}
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

      <ErrorBoundary context="Public site" showDiagnostic>

      <main>
<Hero t={t} onInquiryOpen={() => setIsPlanTripOpen(true)} />

{/* How KLO Works — v1.8.0 Step 9.3 fix: pass lang.toUpperCase() so the
    component's EN/ES/PT lookup table keys match the public site lang state
    (lowercase 'es'). Without this, dI.eyebrow.es is undefined and the
    section always falls back to English. */}
<HowKLOWorks lang={lang.toUpperCase() as 'EN' | 'ES' | 'PT'} />

{/* Stats — same v1.8.0 Step 9.3 fix as HowKLOWorks. */}
<KLOStats lang={lang.toUpperCase() as 'EN' | 'ES' | 'PT'} />

{/* Testimonials + FAQ — same v1.8.0 Step 9.3 fix. */}
<KLOTestimonials lang={lang.toUpperCase() as 'EN' | 'ES' | 'PT'} />

{/* Destinations */}
        <Destinations t={t as any} />

        {/* v1.8.0: Premier Services section removed. The hero already
            mentions "Five Pillars · One Operator", and the contact CTA
            at the bottom covers the same intent. Removing the 6-card
            grid makes the page scannable — fewer redundant images,
            faster to /footer. */}

        {/* Concierge CTA — v1.8.0 Step 9.4: split-button lets users pick
            María / Destinations / WhatsApp / Email from a single CTA. */}
        <section id="contact" className="py-24 bg-slate-50 text-center">
          <div className="container mx-auto px-6 max-w-3xl">
            <p className="text-luxury-teal font-bold text-[10px] uppercase tracking-[0.5em] mb-6">{t('nav.contact') || 'Contact'}</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900 serif">
              {t('concierge.title')}
            </h2>
            <p className="text-slate-600 text-lg font-light leading-relaxed mb-10">
              {t('concierge.desc')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <PlanYourTripButton
                variant="teal"
                size="lg"
                label={t('hero.cta')}
                t={t}
              />
              <a
                href="#destinos"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('destinos')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-10 py-4 border border-slate-300 text-slate-700 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:border-luxury-teal hover:text-luxury-teal transition-all"
              >
                <MapPin size={16} aria-hidden="true" />
                {t('nav.destinations') || 'Destinations'}
              </a>
            </div>
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
                    <li><a href="#destinos" onClick={(e) => { e.preventDefault(); document.getElementById('destinos')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-white/60 hover:text-white transition-colors">{t('nav.destinations')}</a></li>
                    <li><a href="#how-klo-works" onClick={(e) => { e.preventDefault(); document.getElementById('how-klo-works')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-white/60 hover:text-white transition-colors">{t('nav.services')}</a></li>
                    <li><a href="#voices" onClick={(e) => { e.preventDefault(); document.getElementById('voices')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-white/60 hover:text-white transition-colors">{t('nav.investors')}</a></li>
                  </ul>
                  {/* v1.8.0 Step 9.5 — discreet access links to the partner and admin
                      portals. Kept in the menu column (sitemap convention) so they
                      don't pollute the Legal column. */}
                  <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
                    <a href="/supplier/login" className="block text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 hover:text-[#B8963E] transition-colors">
                      {t('footer.partner_login') || 'Partner Sign In'} →
                    </a>
                    <a href="/admin" className="block text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 hover:text-[#B8963E] transition-colors">
                      {t('footer.admin') || 'Admin'} →
                    </a>
                  </div>
                </div>
                <div className="space-y-8">
                  <h4 className="text-xs font-bold uppercase tracking-[0.4em] text-white/20">{t('footer.legal_title')}</h4>
                  <ul className="space-y-4">
                    {/* v1.8.0 Step 9.4 — Legal links routed to hola@karibbeanluxuryoperators.lat
                        with pre-filled subjects so the team can route the request. */}
                    <li><a href="mailto:hola@karibbeanluxuryoperators.lat?subject=Privacy%20Policy%20%7C%20KLO" className="text-white/60 hover:text-white transition-colors">{t('footer.privacy')}</a></li>
                    <li><a href="mailto:hola@karibbeanluxuryoperators.lat?subject=Terms%20of%20Service%20%7C%20KLO" className="text-white/60 hover:text-white transition-colors">{t('footer.terms')}</a></li>
                    <li><a href="mailto:hola@karibbeanluxuryoperators.lat?subject=Cookie%20Policy%20%7C%20KLO" className="text-white/60 hover:text-white transition-colors">{t('footer.cookies')}</a></li>
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
      </ErrorBoundary>

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
