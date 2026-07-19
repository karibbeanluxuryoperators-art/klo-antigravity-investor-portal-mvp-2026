// ── KLO Supplier Dashboard Auth Gate ─────────────────────────────────────────
// Wraps <SupplierDashboard> in a Supabase auth check. The flow:
//
//   1. On mount, subscribe to onAuthStateChange. Supabase's
//      `detectSessionInUrl: true` (set in services/supabase.ts) will pick up
//      the access_token / refresh_token in the URL hash that the magic-link
//      redirect dropped there, exchange them for a session, and fire
//      INITIAL_SESSION.
//
//   2. Once we have a session, take the user's email and call
//      /api/suppliers/lookup?email=... The existing server endpoint already
//      supports email lookup as a fallback when no firebase_uid matches.
//
//   3. If we have a supplier row, build a KLOUser and render SupplierDashboard.
//      Otherwise show a "No partner profile" message with a mailto link.
//
//   4. If there's no session at all (no magic-link click ever happened, or
//      the link expired), show a "Please sign in" prompt with a CTA to
//      /supplier/login.
//
// Why a gate instead of putting auth inside SupplierDashboard?
//   SupplierDashboard takes a KLOUser via props and doesn't know anything
//   about Supabase. The gate keeps that contract clean — SupplierDashboard
//   stays portable and the auth concern lives in one well-isolated file.

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Home, Loader2, AlertCircle, LogIn, Mail, RefreshCw, LogOut } from 'lucide-react';
import {
  getSupplierSession,
  onSupplierAuthChange,
  signOutSupplier,
  supabaseUserToKLO,
} from '../services/supabase';
import type { KLOUser } from '../services/firebase';
import { SupplierDashboard } from './SupplierDashboard';

type Language = 'EN' | 'ES' | 'PT';

interface SupplierDashboardGateProps {
  onBack: () => void;        // home
  onSignIn: () => void;      // navigate to /supplier/login
  onNotPartner: () => void;  // navigate to /supplier (apply as new partner)
  lang?: Language;
}

const T = {
  EN: {
    loading: 'Verifying your session…',
    signInTitle: 'Sign in required',
    signInBody: 'Sign in with your partner email to access your dashboard.',
    signInCta: 'Sign in with Magic Link',
    notFoundTitle: 'No Partner Profile Found',
    notFoundBody: 'We could not find a partner profile for {email}. If you just applied, please wait a moment and refresh. Otherwise, contact KLO operations and we will help you get set up.',
    contactCta: 'Contact hola@karibbeanluxuryoperators.lat',
    applyCta: 'Apply to become a partner',
    refresh: 'Refresh',
    signOut: 'Sign out',
    back: 'Back to Home',
    configTitle: 'Configuration required',
    configBody: 'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  },
  ES: {
    loading: 'Verificando tu sesión…',
    signInTitle: 'Inicio de sesión requerido',
    signInBody: 'Inicia sesión con tu correo de socio para acceder a tu panel.',
    signInCta: 'Iniciar sesión con Enlace Mágico',
    notFoundTitle: 'Perfil de socio no encontrado',
    notFoundBody: 'No encontramos un perfil de socio para {email}. Si acabas de solicitar, espera un momento y actualiza. De lo contrario, contacta a operaciones KLO.',
    contactCta: 'Contactar hola@karibbeanluxuryoperators.lat',
    applyCta: 'Solicitar ser socio',
    refresh: 'Actualizar',
    signOut: 'Cerrar sesión',
    back: 'Volver al Inicio',
    configTitle: 'Configuración requerida',
    configBody: 'Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
  },
  PT: {
    loading: 'Verificando sua sessão…',
    signInTitle: 'Login necessário',
    signInBody: 'Entre com seu e-mail de parceiro para acessar seu painel.',
    signInCta: 'Entrar com Link Mágico',
    notFoundTitle: 'Perfil de parceiro não encontrado',
    notFoundBody: 'Não encontramos um perfil de parceiro para {email}. Se você acabou de se candidatar, aguarde um momento e atualize. Caso contrário, contate a operação KLO.',
    contactCta: 'Contatar hola@karibbeanluxuryoperators.lat',
    applyCta: 'Candidate-se a ser parceiro',
    refresh: 'Atualizar',
    signOut: 'Sair',
    back: 'Voltar ao Início',
    configTitle: 'Configuração necessária',
    configBody: 'Supabase não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
  },
} as const;

type GateState =
  | { kind: 'loading' }
  | { kind: 'config-missing' }
  | { kind: 'needs-sign-in' }
  | { kind: 'no-profile'; email: string }
  | { kind: 'ready'; user: KLOUser; supplierId: string };

export const SupplierDashboardGate: React.FC<SupplierDashboardGateProps> = ({
  onBack,
  onSignIn,
  onNotPartner,
  lang = 'EN',
}) => {
  const t = T[lang];
  const [state, setState] = useState<GateState>({ kind: 'loading' });
  // Used to manually re-trigger the session+lookup cycle from the no-profile
  // screen (e.g. after the user just finished onboarding and their supplier
  // row may have just been written).
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // 1) On mount, read the existing session. `getSession()` reads from
    //    localStorage so it is fast. On the magic-link redirect page,
    //    `detectSessionInUrl` will fire INITIAL_SESSION via the subscription
    //    below — but we still want to start the lookup ASAP.
    const initialize = async () => {
      // Detect missing config early so we don't loop silently.
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        if (!cancelled) setState({ kind: 'config-missing' });
        return;
      }

      // Try a first session read. If detectSessionInUrl is still processing
      // the URL hash, this can return null — but the subscription below will
      // fire once the session is established.
      const initial = await getSupplierSession();
      if (!cancelled && initial?.user) {
        await resolveAndSet(initial.user);
      } else if (!cancelled) {
        setState({ kind: 'needs-sign-in' });
      }
    };

    // 2) Subscribe to auth state changes. The crucial event for the
    //    magic-link flow is INITIAL_SESSION, which Supabase fires once it has
    //    finished processing the access_token in the URL hash.
    const unsubscribe = onSupplierAuthChange(async (session) => {
      if (cancelled) return;
      if (session?.user) {
        await resolveAndSet(session.user);
      } else {
        setState({ kind: 'needs-sign-in' });
      }
    });

    initialize();
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  // Look up the supplier row by email. The existing endpoint at
  // /api/suppliers/lookup?email=... returns { supplier: { ... } | null }.
  const resolveAndSet = async (supabaseUser: { id: string; email?: string | null; user_metadata?: Record<string, any> }) => {
    const email = supabaseUser.email?.toLowerCase();
    if (!email) {
      setState({ kind: 'needs-sign-in' });
      return;
    }
    try {
      const res = await fetch(`/api/suppliers/lookup?uid=${encodeURIComponent(supabaseUser.id)}&email=${encodeURIComponent(email)}`);
      const data = await res.json().catch(() => ({}));
      const supplier = data?.supplier;
      if (supplier && supplier.id) {
        const klo = supabaseUserToKLO(supabaseUser as any);
        setState({ kind: 'ready', user: klo, supplierId: supplier.id });
      } else {
        setState({ kind: 'no-profile', email });
      }
    } catch (err: any) {
      // Network or 5xx — treat as "no profile found" but log so we can debug.
      console.error('supplier lookup failed', err);
      setState({ kind: 'no-profile', email });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutSupplier();
    } catch (e) {
      console.error('sign out failed', e);
    }
    window.location.href = '/supplier/login';
  };

  // ── RENDER ──

  if (state.kind === 'loading') {
    return (
      <CenteredShell onBack={onBack} backLabel={t.back}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-gold" size={40} />
          <p className="text-xs uppercase tracking-widest text-text-main/40">{t.loading}</p>
        </div>
      </CenteredShell>
    );
  }

  if (state.kind === 'config-missing') {
    return (
      <CenteredShell onBack={onBack} backLabel={t.back}>
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-400">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-serif italic text-text-main">{t.configTitle}</h2>
          <p className="text-text-main/50 font-light leading-relaxed">{t.configBody}</p>
        </div>
      </CenteredShell>
    );
  }

  if (state.kind === 'needs-sign-in') {
    return (
      <CenteredShell onBack={onBack} backLabel={t.back}>
        <div className="max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto text-gold">
            <LogIn size={32} />
          </div>
          <h2 className="text-3xl font-serif italic text-text-main">{t.signInTitle}</h2>
          <p className="text-text-main/50 font-light leading-relaxed">{t.signInBody}</p>
          <button
            onClick={onSignIn}
            className="w-full px-8 py-4 bg-gold text-luxury-black rounded-full font-semibold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
          >
            <Mail size={14} /> {t.signInCta}
          </button>
        </div>
      </CenteredShell>
    );
  }

  if (state.kind === 'no-profile') {
    return (
      <CenteredShell onBack={onBack} backLabel={t.back}>
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-lg text-center space-y-6"
        >
          <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto text-gold">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-3xl font-serif italic text-text-main">{t.notFoundTitle}</h2>
          <p className="text-text-main/50 font-light leading-relaxed">
            {t.notFoundBody.replace('{email}', state.email)}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => setReloadKey(k => k + 1)}
              className="px-6 py-3 bg-gold text-luxury-black rounded-full font-semibold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={12} /> {t.refresh}
            </button>
            <a
              href="mailto:hola@karibbeanluxuryoperators.lat"
              className="px-6 py-3 bg-white/5 border border-border-main text-text-main rounded-full font-semibold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Mail size={12} /> {t.contactCta}
            </a>
          </div>
          <div className="pt-4 border-t border-border-main">
            <button
              onClick={onNotPartner}
              className="text-xs text-text-main/50 hover:text-gold uppercase tracking-widest font-semibold transition-colors"
            >
              {t.applyCta}
            </button>
          </div>
          <div className="pt-2">
            <button
              onClick={handleSignOut}
              className="text-[10px] text-text-main/30 hover:text-text-main/60 uppercase tracking-widest font-semibold transition-colors flex items-center gap-1 mx-auto"
            >
              <LogOut size={10} /> {t.signOut}
            </button>
          </div>
        </motion.div>
      </CenteredShell>
    );
  }

  // state.kind === 'ready' → render the real dashboard
  return (
    <SupplierDashboard
      user={state.user}
      lang={lang}
      onBack={onBack}
    />
  );
};

// ── Centered loading/empty shell ─────────────────────────────────────────────
// Shared frame for the loading / config / sign-in / no-profile screens so
// the gate has a consistent visual identity independent of the dashboard.
const CenteredShell: React.FC<{ onBack: () => void; backLabel: string; children: React.ReactNode }> = ({
  onBack,
  backLabel,
  children,
}) => (
  <div className="min-h-screen bg-luxury-black text-text-main flex items-center justify-center px-6 py-20 relative">
    <div className="absolute top-8 left-8 z-10">
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-6 py-3 bg-luxury-slate/50 border border-border-main rounded-full text-[11px] font-sans uppercase tracking-tight font-semibold hover:bg-luxury-slate transition-all text-text-main shadow-sm"
      >
        <Home size={14} /> {backLabel}
      </button>
    </div>
    <div className="bg-luxury-slate border border-border-main rounded-2xl p-12 shadow-2xl w-full max-w-xl">
      {children}
    </div>
  </div>
);
