// ── KLO Supplier Dashboard Auth Gate (v1.7 redesign) ──────────────────────────
// Wraps <SupplierDashboard> in a Supabase auth check. v1.7: redesigned
// to match the public-site design language (slate-50 bg, teal section
// labels, Cormorant display headings). The dashboard itself still uses
// the dark theme because it shows dense data; the gate screens use the
// light theme for consistency with the rest of the public site.

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, AlertCircle, LogIn, Mail, RefreshCw, LogOut, Home } from 'lucide-react';
import {
  getSupplierSession,
  onSupplierAuthChange,
  signOutSupplier,
  supabaseUserToKLO,
  isSupabaseConfigured,
} from '../services/supabase';
import type { KLOUser } from '../services/firebase';
import { SupplierDashboard } from './SupplierDashboard';
import {
  Section,
  SectionLabel,
  DisplayHeading,
  BodyText,
  PrimaryButton,
  GhostButton,
  Card,
  TopNav,
} from './ui/primitives';

type Language = 'EN' | 'ES' | 'PT';

interface SupplierDashboardGateProps {
  onBack: () => void;
  onSignIn: () => void;
  onNotPartner: () => void;
  lang?: Language;
}

const T = {
  EN: {
    back: 'Back to Home',
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
    adminLink: 'Are you an admin? Go to /admin →',
    configTitle: 'Configuration required',
    configBody: 'Supabase is not configured. The /api/config endpoint returned no URL or anon key. Check the server environment.',
    eyebrow: 'Partner Portal',
  },
  ES: {
    back: 'Volver al Inicio',
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
    adminLink: '¿Eres admin? Ir a /admin →',
    configTitle: 'Configuración requerida',
    configBody: 'Supabase no está configurado. El endpoint /api/config no devolvió URL ni clave anónima. Verifica el entorno del servidor.',
    eyebrow: 'Portal de Socios',
  },
  PT: {
    back: 'Voltar ao Início',
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
    adminLink: 'Você é admin? Ir para /admin →',
    configTitle: 'Configuração necessária',
    configBody: 'Supabase não está configurado. O endpoint /api/config não retornou URL nem chave anônima. Verifique o ambiente do servidor.',
    eyebrow: 'Portal de Parceiros',
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
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      // v1.7.1: replaced the VITE_SUPABASE_* env check with a client build
      // probe. The client is built lazily from /api/config (which the
      // server answers from SUPABASE_URL / SUPABASE_ANON_KEY). If the
      // client build fails (config empty, network error), we show the
      // config-missing state; otherwise we look up the session.
      const configured = await isSupabaseConfigured();
      if (!cancelled && !configured) {
        setState({ kind: 'config-missing' });
        return;
      }
      const initial = await getSupplierSession();
      if (!cancelled && initial?.user) {
        await resolveAndSet(initial.user);
      } else if (!cancelled) {
        setState({ kind: 'needs-sign-in' });
      }
    };

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

  // Ready → render the actual dashboard (which keeps its own dark theme)
  if (state.kind === 'ready') {
    return (
      <SupplierDashboard
        user={state.user}
        lang={lang}
        onBack={onBack}
      />
    );
  }

  // All other states render in the dark-theme gate shell.
  return (
    <div className="min-h-screen bg-[#0a1518]">
      <TopNav onBack={onBack} backLabel={t.back} tone="dark" />

      <Section tone="dark" size="md" className="!py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-xl mx-auto"
        >
          <div className="text-center mb-12">
            <SectionLabel tone="gold">{t.eyebrow}</SectionLabel>
          </div>

          {state.kind === 'loading' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-10">
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="animate-spin text-[#B8963E]" size={40} />
                <p className="text-xs uppercase tracking-[0.3em] text-white/60 font-semibold">{t.loading}</p>
              </div>
            </div>
          )}

          {state.kind === 'config-missing' && (
            <div className="bg-white/5 border border-red-500/30 rounded-2xl p-10">
              <div className="text-center space-y-4 py-6">
                <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center mx-auto text-red-400">
                  <AlertCircle size={32} />
                </div>
                <h2 className="text-3xl font-serif italic text-white">{t.configTitle}</h2>
                <p className="text-white/60 font-light leading-relaxed">{t.configBody}</p>
              </div>
            </div>
          )}

          {state.kind === 'needs-sign-in' && (
            <div className="bg-white/5 border border-[#B8963E]/30 rounded-2xl p-10">
              <div className="text-center space-y-6 py-6">
                <div className="w-16 h-16 bg-[#B8963E]/15 rounded-full flex items-center justify-center mx-auto text-[#B8963E]">
                  <LogIn size={32} />
                </div>
                <h2 className="text-3xl font-serif italic text-white">{t.signInTitle}</h2>
                <p className="text-white/60 font-light leading-relaxed">{t.signInBody}</p>
                <PrimaryButton
                  onClick={onSignIn}
                  size="lg"
                  fullWidth
                  className="!bg-[#B8963E] !border-[#B8963E] !text-white hover:!bg-white hover:!text-slate-900"
                  icon={<Mail size={14} />}
                >
                  {t.signInCta}
                </PrimaryButton>
              </div>
            </div>
          )}

          {state.kind === 'no-profile' && (
            <div className="bg-white/5 border border-[#B8963E]/30 rounded-2xl p-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-6 py-6"
              >
                <div className="w-16 h-16 bg-[#B8963E]/15 rounded-full flex items-center justify-center mx-auto text-[#B8963E]">
                  <AlertCircle size={32} />
                </div>
                <h2 className="text-3xl font-serif italic text-white">{t.notFoundTitle}</h2>
                <p className="text-white/60 font-light leading-relaxed">
                  {t.notFoundBody.replace('{email}', state.email)}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 items-stretch">
                  <button
                    onClick={() => setReloadKey(k => k + 1)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#B8963E] border border-[#B8963E] text-white rounded-full text-[10px] font-sans uppercase tracking-[0.3em] font-semibold hover:bg-white hover:text-slate-900 transition-all"
                  >
                    <RefreshCw size={12} /> {t.refresh}
                  </button>
                  <a
                    href="mailto:hola@karibbeanluxuryoperators.lat"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/20 text-white/80 rounded-full text-[10px] font-sans uppercase tracking-[0.3em] font-semibold hover:bg-white/10 hover:text-white hover:border-white/40 transition-all"
                  >
                    <Mail size={12} /> {t.contactCta}
                  </a>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <button
                    onClick={onNotPartner}
                    className="text-xs text-white/60 hover:text-[#B8963E] uppercase tracking-[0.3em] font-semibold transition-colors"
                  >
                    {t.applyCta}
                  </button>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleSignOut}
                    className="text-[10px] text-white/40 hover:text-white uppercase tracking-[0.3em] font-semibold transition-colors flex items-center gap-1 mx-auto"
                  >
                    <LogOut size={10} /> {t.signOut}
                  </button>
                </div>
                <div className="pt-3">
                  <a
                    href="/admin"
                    className="inline-block text-[10px] text-[#B8963E] hover:text-white uppercase tracking-[0.3em] font-semibold transition-colors"
                  >
                    {t.adminLink}
                  </a>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </Section>
    </div>
  );
};
