// ── KLO Supplier Login (v1.7 redesign) ───────────────────────────────────────
// Magic-link sign-in. v1.7: redesigned to match the public-site design
// language (slate-50 bg, teal section labels, Cormorant display headings,
// gold CTAs). See components/ui/primitives.tsx for the design system.

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Loader2, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { sendSupplierMagicLink } from '../services/supabase';
import {
  Section,
  SectionLabel,
  DisplayHeading,
  BodyText,
  PrimaryButton,
  GhostButton,
  Card,
  Input,
  TopNav,
} from './ui/primitives';

type Language = 'EN' | 'ES' | 'PT';

interface SupplierLoginProps {
  onBack: () => void;
  onSignedIn: () => void;
  onNewSupplier: () => void;
  lang?: Language;
}

const T = {
  EN: {
    eyebrow: 'Partner Sign In',
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
    eyebrow: 'Acceso de Socios',
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
    eyebrow: 'Acesso de Parceiros',
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
      // v1.7.7: use VITE_APP_URL (set at build time in Vercel) instead of
      // window.location.origin. The latter is wrong because if a user clicks
      // "Send Magic Link" while on localhost:3000, the email points to
      // http://localhost:3000/... instead of the production URL. With the
      // env var, the redirect always points to the real site regardless
      // of where the user is when they send the link.
      const redirectTo = `${import.meta.env.VITE_APP_URL || 'https://www.karibbeanluxuryoperators.lat'}/supplier/dashboard`;
      const result = await sendSupplierMagicLink(email, redirectTo);
      if (result.ok === true) {
        setSentTo(email.trim().toLowerCase());
      } else {
        setError((result as { error: string }).error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send magic link.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1518]">
      <TopNav onBack={onBack} backLabel={t.back} tone="dark" />

      <Section tone="dark" size="md" className="!py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-md mx-auto"
        >
          <div className="text-center mb-12">
            <SectionLabel tone="gold">{t.eyebrow}</SectionLabel>
            <DisplayHeading tone="light" size="lg" as="h1" className="!text-5xl !md:text-6xl">
              {t.title}
            </DisplayHeading>
            <BodyText tone="light" size="md" className="!text-white/60 max-w-md mx-auto">
              {t.subtitle}
            </BodyText>
          </div>

          {sentTo ? (
            <div className="bg-white/5 backdrop-blur-sm border border-[#B8963E]/30 rounded-2xl p-10">
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <div className="w-16 h-16 mx-auto bg-[#B8963E]/15 rounded-full flex items-center justify-center text-[#B8963E]">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-3xl font-serif italic text-white">{t.sentTitle}</h2>
                <p className="text-white/60 font-light leading-relaxed">
                  {t.sentBody.replace('{email}', sentTo)}
                </p>
                <p className="text-[11px] text-white/40 italic">{t.sentHelp}</p>
                <button
                  onClick={() => { setSentTo(null); setEmail(''); }}
                  className="w-full mt-4 px-6 py-4 border border-white/20 text-white/80 rounded-full text-[11px] font-sans uppercase tracking-[0.3em] font-semibold hover:bg-white/10 hover:text-white hover:border-white/40 transition-all"
                >
                  {t.tryAgain}
                </button>
              </motion.div>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  autoComplete="email"
                  required
                  disabled={isSending}
                  label={t.emailLabel}
                  tone="dark"
                />

                <p className="text-[11px] text-white/40 font-light -mt-4">{t.helpText}</p>

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

                <PrimaryButton
                  type="submit"
                  disabled={isSending || !email.trim()}
                  size="lg"
                  fullWidth
                  className="!bg-[#B8963E] !border-[#B8963E] !text-white hover:!bg-white hover:!text-slate-900"
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
                </PrimaryButton>

                <div className="pt-4 border-t border-white/10 text-center">
                  <p className="text-white/60 text-xs">
                    {t.newHere}{' '}
                    <button
                      type="button"
                      onClick={onNewSupplier}
                      className="text-[#B8963E] hover:text-white font-semibold transition-colors underline underline-offset-2"
                    >
                      {t.applyNow}
                    </button>
                  </p>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      </Section>
    </div>
  );
};
