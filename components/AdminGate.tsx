// ── KLO Admin Portal Auth Gate (v1.7) ─────────────────────────────────────────
// v1.7: wires the orphaned SuppliersManagement component into /admin.
//
// Auth model (intentionally simple for v1.7):
//   - Magic-link via Supabase Auth, same as the supplier portal
//   - On the dashboard mount, look up the signed-in user's email
//   - If the email is in ADMIN_EMAILS → render the admin
//   - Otherwise → "not authorized" screen
//
// This is the same trust model as the rest of v1.5/1.6: no real auth
// server, no JWT, no row-level security. The magic link + allowlist is
// "good enough" for the first ~10 admins. Hardening to real RBAC is a
// v1.8/v1.9 task (see AGENTS.md § 1.2 / § 10).

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, AlertCircle, LogIn, Mail, LogOut, Shield } from 'lucide-react';
import {
  getSupplierSession,
  onSupplierAuthChange,
  signOutSupplier,
} from '../services/supabase';
import { SuppliersManagement } from './SuppliersManagement';
import {
  Section,
  SectionLabel,
  DisplayHeading,
  BodyText,
  PrimaryButton,
  Card,
  TopNav,
} from './ui/primitives';

type Language = 'EN' | 'ES' | 'PT';

// v1.7: hardcoded admin allowlist. Will move to a `user_role` column in
// the suppliers table (or a new `admins` table) in a follow-up.
const ADMIN_EMAILS: string[] = [
  'admin@klo.com',
  'karibbeanluxuryoperators@gmail.com',
  'juan@karibbeanluxuryoperators.lat',
];

const T = {
  EN: {
    back: 'Back to Home',
    eyebrow: 'Operations',
    loading: 'Verifying your admin access…',
    signInTitle: 'Sign in required',
    signInBody: 'Admin sign-in uses the same magic-link as partners.',
    signInCta: 'Sign in with Magic Link',
    notAuthTitle: 'Not Authorized',
    notAuthBody: 'Your account ({email}) is not on the admin allowlist. If you should have access, contact the site owner.',
    notAuthCta: 'Sign out',
    configTitle: 'Configuration required',
    configBody: 'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  },
  ES: {
    back: 'Volver al Inicio',
    eyebrow: 'Operaciones',
    loading: 'Verificando tu acceso de administrador…',
    signInTitle: 'Inicio de sesión requerido',
    signInBody: 'El acceso de administrador usa el mismo enlace mágico que los socios.',
    signInCta: 'Iniciar sesión con Enlace Mágico',
    notAuthTitle: 'No autorizado',
    notAuthBody: 'Tu cuenta ({email}) no está en la lista de administradores. Si deberías tener acceso, contacta al propietario del sitio.',
    notAuthCta: 'Cerrar sesión',
    configTitle: 'Configuración requerida',
    configBody: 'Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
  },
  PT: {
    back: 'Voltar ao Início',
    eyebrow: 'Operações',
    loading: 'Verificando seu acesso de administrador…',
    signInTitle: 'Login necessário',
    signInBody: 'O acesso de administrador usa o mesmo link mágico dos parceiros.',
    signInCta: 'Entrar com Link Mágico',
    notAuthTitle: 'Não autorizado',
    notAuthBody: 'Sua conta ({email}) não está na lista de administradores. Se deveria ter acesso, contate o proprietário do site.',
    notAuthCta: 'Sair',
    configTitle: 'Configuração necessária',
    configBody: 'Supabase não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
  },
} as const;

interface AdminGateProps {
  onBack: () => void;
  onSignIn: () => void;
  lang?: Language;
}

type AdminState =
  | { kind: 'loading' }
  | { kind: 'config-missing' }
  | { kind: 'needs-sign-in' }
  | { kind: 'not-authorized'; email: string }
  | { kind: 'ready'; email: string };

export const AdminGate: React.FC<AdminGateProps> = ({ onBack, onSignIn, lang = 'EN' }) => {
  const t = T[lang];
  const [state, setState] = useState<AdminState>({ kind: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        if (!cancelled) setState({ kind: 'config-missing' });
        return;
      }
      const initial = await getSupplierSession();
      if (!cancelled && initial?.user?.email) {
        evaluate(initial.user.email);
      } else if (!cancelled) {
        setState({ kind: 'needs-sign-in' });
      }
    };

    const unsubscribe = onSupplierAuthChange(async (session) => {
      if (cancelled) return;
      if (session?.user?.email) {
        evaluate(session.user.email);
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

  const evaluate = (email: string) => {
    const lower = email.toLowerCase();
    if (ADMIN_EMAILS.some(e => e.toLowerCase() === lower)) {
      setState({ kind: 'ready', email });
    } else {
      setState({ kind: 'not-authorized', email });
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

  if (state.kind === 'ready') {
    return (
      <SuppliersManagement
        lang={lang}
        onViewAssets={() => { /* TODO: navigate to asset detail */ }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav onBack={onBack} backLabel={t.back} tone="light" />

      <Section tone="light" size="md" className="!py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-xl mx-auto"
        >
          <div className="text-center mb-12">
            <SectionLabel tone="teal">{t.eyebrow}</SectionLabel>
          </div>

          {state.kind === 'loading' && (
            <Card tone="light" hover={false} padding="lg">
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="animate-spin text-luxury-teal" size={40} />
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">{t.loading}</p>
              </div>
            </Card>
          )}

          {state.kind === 'config-missing' && (
            <Card tone="light" hover={false} padding="lg">
              <div className="text-center space-y-4 py-6">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                  <AlertCircle size={32} />
                </div>
                <DisplayHeading tone="dark" size="md" as="h2">{t.configTitle}</DisplayHeading>
                <BodyText tone="dark">{t.configBody}</BodyText>
              </div>
            </Card>
          )}

          {state.kind === 'needs-sign-in' && (
            <Card tone="light" hover={false} padding="lg">
              <div className="text-center space-y-6 py-6">
                <div className="w-16 h-16 bg-luxury-teal/10 rounded-full flex items-center justify-center mx-auto text-luxury-teal">
                  <LogIn size={32} />
                </div>
                <DisplayHeading tone="dark" size="md" as="h2">{t.signInTitle}</DisplayHeading>
                <BodyText tone="dark">{t.signInBody}</BodyText>
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
            </Card>
          )}

          {state.kind === 'not-authorized' && (
            <Card tone="light" hover={false} padding="lg">
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-6 py-6"
              >
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                  <Shield size={32} />
                </div>
                <DisplayHeading tone="dark" size="md" as="h2">{t.notAuthTitle}</DisplayHeading>
                <BodyText tone="dark">
                  {t.notAuthBody.replace('{email}', state.email)}
                </BodyText>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 rounded-full text-[10px] font-sans uppercase tracking-[0.3em] font-semibold hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
                >
                  <LogOut size={12} /> {t.notAuthCta}
                </button>
              </motion.div>
            </Card>
          )}
        </motion.div>
      </Section>
    </div>
  );
};
