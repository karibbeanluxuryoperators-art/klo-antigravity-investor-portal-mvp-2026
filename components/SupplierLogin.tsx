// ── KLO Supplier Login ───────────────────────────────────────────────────────
// Magic-link sign-in page. The supplier types their email, we call Supabase
// Auth's signInWithOtp, and Supabase sends them an email with a one-time
// link. The link redirects back to /supplier/dashboard with the session
// tokens in the URL hash; SupplierDashboardGate picks them up and renders
// the dashboard.
//
// Why no password? Magic-link is the lowest-friction way to get suppliers
// (often non-technical villa owners, captains, chefs) into the dashboard.
// Email is the canonical identifier we already have on every suppliers row,
// so the lookup is exact: matching email → render that supplier's data.

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Home, Mail, Loader2, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { sendSupplierMagicLink } from '../services/supabase';

type Language = 'EN' | 'ES' | 'PT';

interface SupplierLoginProps {
  onBack: () => void;
  onSignedIn: () => void;     // parent will navigate to /supplier/dashboard
  onNewSupplier: () => void;  // parent will navigate to /supplier
  lang?: Language;
}

// Trilingual copy. Localized in the same shape as SupplierPortal/SupplierDashboard.
const T = {
  EN: {
    title: 'Welcome Back',
    subtitle: 'Sign in to manage your partner profile, assets, and bookings.',
    emailLabel: 'Your partner email',
    emailPlaceholder: 'you@yourbusiness.com',
    sendButton: 'Send Magic Link',
    sending: 'Sending…',
    helpText: 'We will email you a one-time sign-in link. No password needed.',
    sentTitle: 'Check your inbox',
    sentBody: 'We sent a sign-in link to {email}. Click the link to access your partner dashboard. The link expires in 1 hour.',
    sentHelp: 'Did not arrive? Check spam, or try again in a few seconds.',
    tryAgain: 'Try a different email',
    newHere: 'New to KLO?',
    applyNow: 'Apply to become a partner',
    back: 'Back to Home',
    invalidEmail: 'Please enter a valid email address.',
  },
  ES: {
    title: 'Bienvenido de Vuelta',
    subtitle: 'Inicia sesión para gestionar tu perfil de socio, activos y reservas.',
    emailLabel: 'Tu correo de socio',
    emailPlaceholder: 'tu@tunegocio.com',
    sendButton: 'Enviar Enlace Mágico',
    sending: 'Enviando…',
    helpText: 'Te enviaremos un enlace de inicio de sesión de un solo uso. Sin contraseña.',
    sentTitle: 'Revisa tu bandeja de entrada',
    sentBody: 'Enviamos un enlace de inicio a {email}. Haz clic para acceder a tu panel de socio. El enlace expira en 1 hora.',
    sentHelp: '¿No llegó? Revisa el spam o inténtalo de nuevo en unos segundos.',
    tryAgain: 'Probar con otro correo',
    newHere: '¿Nuevo en KLO?',
    applyNow: 'Solicita ser socio',
    back: 'Volver al Inicio',
    invalidEmail: 'Por favor, ingresa un correo válido.',
  },
  PT: {
    title: 'Bem-vindo de Volta',
    subtitle: 'Entre para gerenciar seu perfil de parceiro, ativos e reservas.',
    emailLabel: 'Seu e-mail de parceiro',
    emailPlaceholder: 'voce@seunegocio.com',
    sendButton: 'Enviar Link Mágico',
    sending: 'Enviando…',
    helpText: 'Enviaremos um link de acesso de uso único. Sem senha.',
    sentTitle: 'Verifique sua caixa de entrada',
    sentBody: 'Enviamos um link de acesso para {email}. Clique para acessar seu painel. O link expira em 1 hora.',
    sentHelp: 'Não chegou? Verifique o spam ou tente novamente em alguns segundos.',
    tryAgain: 'Tentar outro e-mail',
    newHere: 'Novo na KLO?',
    applyNow: 'Candidate-se a ser parceiro',
    back: 'Voltar ao Início',
    invalidEmail: 'Por favor, insira um e-mail válido.',
  },
} as const;

export const SupplierLogin: React.FC<SupplierLoginProps> = ({
  onBack,
  onSignedIn,
  onNewSupplier,
  lang = 'EN',
}) => {
  const t = T[lang];
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSending(true);
    try {
      // After the user clicks the magic link in their email, Supabase redirects
      // them back to this exact URL with the session tokens in the hash.
      // SupplierDashboardGate on that page calls getSession() and finds the
      // freshly-set session automatically (detectSessionInUrl: true).
      const redirectTo = `${window.location.origin}/supplier/dashboard`;
      const result = await sendSupplierMagicLink(email, redirectTo);
      if (result.ok) {
        setSentTo(email.trim().toLowerCase());
      } else {
        // result is narrowed to { ok: false; error: string } here
        setError((result as { error: string }).error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send magic link.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-luxury-black text-text-main flex items-center justify-center px-6 py-20 relative overflow-hidden">
      {/* Background gradient — keeps the page from feeling flat */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-luxury-teal/10 rounded-full blur-3xl" />
      </div>

      {/* Home button — keeps portal navigation consistent with SupplierPortal */}
      <div className="absolute top-8 left-8 z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 bg-luxury-slate/50 border border-border-main rounded-full text-[11px] font-sans uppercase tracking-tight font-semibold hover:bg-luxury-slate transition-all text-text-main shadow-sm"
        >
          <Home size={14} /> {t.back}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <button
            onClick={onBack}
            className="w-20 h-20 bg-gold rounded-full flex items-center justify-center shadow-2xl shadow-gold/20 hover:scale-105 transition-transform"
            aria-label="KLO home"
          >
            <span className="text-luxury-black font-bold text-3xl">K</span>
          </button>
        </div>

        <div className="bg-luxury-slate border border-border-main rounded-2xl p-10 shadow-2xl">
          {sentTo ? (
            // ── SENT STATE ──
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={32} />
              </div>
              <h1 className="text-3xl font-serif italic text-text-main">{t.sentTitle}</h1>
              <p className="text-text-main/60 font-light leading-relaxed">
                {t.sentBody.replace('{email}', sentTo)}
              </p>
              <p className="text-[11px] text-text-main/30 italic">{t.sentHelp}</p>
              <button
                onClick={() => { setSentTo(null); setEmail(''); }}
                className="w-full mt-4 px-6 py-4 bg-white/5 border border-border-main text-text-main rounded-xl text-[11px] font-sans uppercase tracking-tight font-semibold hover:bg-white/10 transition-all"
              >
                {t.tryAgain}
              </button>
            </motion.div>
          ) : (
            // ── FORM STATE ──
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-serif italic text-text-main">{t.title}</h1>
                <p className="text-text-main/50 font-sans font-light leading-relaxed">
                  {t.subtitle}
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">
                  {t.emailLabel}
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-text-main/30 pointer-events-none"
                    size={18}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    autoComplete="email"
                    required
                    disabled={isSending}
                    className="w-full bg-luxury-black border border-border-main rounded-xl py-4 pl-14 pr-5 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main placeholder:text-text-main/20 disabled:opacity-50"
                  />
                </div>
                <p className="text-[11px] text-text-main/30 font-light">{t.helpText}</p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
                >
                  <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-300 leading-relaxed">{error}</p>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isSending || !email.trim()}
                className="w-full px-6 py-4 bg-gold text-luxury-black rounded-xl font-semibold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-gold/20"
              >
                {isSending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> {t.sending}
                  </>
                ) : (
                  <>
                    {t.sendButton} <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="pt-4 border-t border-border-main text-center">
                <p className="text-text-main/40 text-xs">
                  {t.newHere}{' '}
                  <button
                    type="button"
                    onClick={onNewSupplier}
                    className="text-gold hover:text-white font-semibold transition-colors underline underline-offset-2"
                  >
                    {t.applyNow}
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
