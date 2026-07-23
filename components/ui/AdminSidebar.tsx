import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, ClipboardList, UserCheck, Inbox,
  Menu, X, LogOut, Layers, BarChart3, Settings, ChevronRight, Sparkles,
} from 'lucide-react';

// v1.8.0 Step 5: Admin sidebar nav.
//
// Replaces the 4-giant-serif-headings tab bar that previously occupied the
// top of the /admin page. Vertical left rail = proper ops tool look (think
// Linear, Stripe Dashboard, Linear Admin). Gold accent for active state.
// Collapses to a slide-out drawer below the md breakpoint.
//
// Same dark tokens as everywhere else in /admin:
//   bg-[#0a1518] base · bg-white/5 surface · border-white/10
//   text-[#B8963E] active · 10-11px uppercase tracking-[0.3em] labels

export type AdminSection =
  | 'SUPPLIERS' | 'BOOKINGS' | 'CLIENTS' | 'LEADS'
  | 'BUNDLES'   | 'STATS'    | 'SETTINGS';

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSelect: (section: AdminSection) => void;
  lang: 'EN' | 'ES' | 'PT';
  signedInEmail?: string | null;
  onSignOut?: () => void;
  // Counts shown next to section names (for at-a-glance: "12 pending")
  counts?: Partial<Record<AdminSection, number>>;
  // Total new leads (gold badge) — used as a separate indicator
  newLeadsCount?: number;
  // Total pending suppliers (gold badge)
  pendingSuppliersCount?: number;
}

const T: Record<string, { EN: string; ES: string; PT: string }> = {
  // Brand / context
  brand:        { EN: 'KLO Operations', ES: 'KLO Operaciones', PT: 'KLO Operações' },
  brand_sub:    { EN: 'Concierge OS',   ES: 'Sistema Conserjería', PT: 'Sistema Concierge' },
  // Section labels
  suppliers:    { EN: 'Suppliers',  ES: 'Socios',     PT: 'Parceiros' },
  bookings:     { EN: 'Bookings',   ES: 'Reservas',   PT: 'Reservas' },
  clients:      { EN: 'Clients',    ES: 'Clientes',   PT: 'Clientes' },
  leads:        { EN: 'Leads',      ES: 'Leads',      PT: 'Leads' },
  bundles:      { EN: 'Bundles',    ES: 'Paquetes',   PT: 'Pacotes' },
  stats:        { EN: 'Dashboard',  ES: 'Panel',      PT: 'Painel' },
  settings:     { EN: 'Settings',   ES: 'Ajustes',    PT: 'Configurações' },
  // Section subtitles (small, below label)
  suppliers_sub: { EN: 'Network Management',     ES: 'Gestión de Red',          PT: 'Gestão de Rede' },
  bookings_sub:  { EN: 'Journey Orchestration',  ES: 'Orquestación de Viajes',  PT: 'Orquestração de Viagens' },
  clients_sub:   { EN: 'UHNWI Guest Relations',  ES: 'Relaciones Huéspedes UHNWI', PT: 'Relações Hóspedes UHNWI' },
  leads_sub:     { EN: 'Inbound Inquiries',      ES: 'Consultas Entrantes',     PT: 'Consultas Entrantes' },
  bundles_sub:   { EN: 'Multi-supplier Packages', ES: 'Paquetes Multi-socio',   PT: 'Pacotes Multi-parceiro' },
  stats_sub:     { EN: 'KPIs & Activity',        ES: 'KPIs y Actividad',        PT: 'KPIs e Atividade' },
  settings_sub:  { EN: 'Roles, Integrations',    ES: 'Roles, Integraciones',    PT: 'Funções, Integrações' },
  // UI
  back:         { EN: 'Back to site', ES: 'Volver al sitio', PT: 'Voltar ao site' },
  signed_in_as: { EN: 'Signed in as', ES: 'Conectado como',  PT: 'Conectado como' },
  sign_out:     { EN: 'Sign out',     ES: 'Cerrar sesión',   PT: 'Sair' },
  pending_badge:{ EN: 'pending',      ES: 'pendientes',      PT: 'pendentes' },
  new_badge:    { EN: 'new',          ES: 'nuevos',          PT: 'novos' },
};

const t = (key: keyof typeof T, lang: 'EN' | 'ES' | 'PT') => T[key][lang] || T[key].EN;

interface SectionDef {
  key: AdminSection;
  icon: React.ElementType;
  labelKey: keyof typeof T;
  subtitleKey: keyof typeof T;
  badge?: 'pending' | 'new';
}

const SECTIONS: SectionDef[] = [
  { key: 'SUPPLIERS', icon: Users,         labelKey: 'suppliers', subtitleKey: 'suppliers_sub' },
  { key: 'BOOKINGS',  icon: ClipboardList, labelKey: 'bookings',  subtitleKey: 'bookings_sub' },
  { key: 'CLIENTS',   icon: UserCheck,     labelKey: 'clients',   subtitleKey: 'clients_sub' },
  { key: 'LEADS',     icon: Inbox,         labelKey: 'leads',     subtitleKey: 'leads_sub', badge: 'new' },
  { key: 'BUNDLES',   icon: Layers,        labelKey: 'bundles',   subtitleKey: 'bundles_sub' },
  { key: 'STATS',     icon: BarChart3,     labelKey: 'stats',     subtitleKey: 'stats_sub' },
  { key: 'SETTINGS',  icon: Settings,      labelKey: 'settings',  subtitleKey: 'settings_sub' },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeSection,
  onSelect,
  lang,
  signedInEmail,
  onSignOut,
  counts,
  newLeadsCount,
  pendingSuppliersCount,
}) => {
  const [open, setOpen] = useState(false);

  const renderSectionItem = (s: SectionDef, isMobile: boolean) => {
    const isActive = activeSection === s.key;
    const Icon = s.icon;
    const count = counts?.[s.key];
    // Badge logic
    const showBadge =
      (s.key === 'SUPPLIERS' && pendingSuppliersCount && pendingSuppliersCount > 0) ||
      (s.key === 'LEADS' && newLeadsCount && newLeadsCount > 0);
    const badgeText = s.key === 'SUPPLIERS'
      ? String(pendingSuppliersCount || 0)
      : String(newLeadsCount || 0);

    return (
      <button
        key={s.key}
        onClick={() => { onSelect(s.key); setOpen(false); }}
        // v1.8.0 Step 8.2: full-width button, but the aside has
        // bg-[#081013] (darker than main) + border-r border-white/10
        // for clear visual separation, so the pill stays contained.
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group ${
          isActive
            ? 'bg-[#B8963E]/15 border border-[#B8963E]/40 text-white'
            : 'border border-transparent text-white/60 hover:bg-white/[0.04] hover:text-white'
        }`}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
          isActive ? 'bg-[#B8963E] text-white' : 'bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white'
        }`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : ''}`}>
              {t(s.labelKey, lang)}
            </span>
            {showBadge && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#B8963E] text-white font-bold tracking-wider">
                {badgeText}
              </span>
            )}
            {count != null && !showBadge && count > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 font-bold">
                {count}
              </span>
            )}
          </div>
          <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] truncate">
            {t(s.subtitleKey, lang)}
          </p>
        </div>
        {isActive && !isMobile && <ChevronRight size={14} className="text-[#B8963E] shrink-0" />}
      </button>
    );
  };

  const sidebarBody = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B8963E]/15 border border-[#B8963E]/30 flex items-center justify-center">
            <Sparkles size={18} className="text-[#B8963E]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-serif italic text-white truncate">{t('brand', lang)}</p>
            <p className="text-[10px] text-[#B8963E] uppercase tracking-[0.3em] truncate">{t('brand_sub', lang)}</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1">
        {SECTIONS.map(s => renderSectionItem(s, false))}
      </nav>

      {/* Footer: signed-in + sign out */}
      {onSignOut && (
        <div className="py-3 border-t border-white/10 space-y-2">
          {signedInEmail && (
            <p className="text-[9px] text-white/40 uppercase tracking-[0.3em] truncate px-5">
              {t('signed_in_as', lang)} {signedInEmail}
            </p>
          )}
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-[#B8963E] hover:bg-white/[0.04] transition-all text-sm"
          >
            <LogOut size={16} />
            {t('sign_out', lang)}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Desktop (md+) ─────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 shrink-0 bg-[#081013] border-r border-white/15 sticky top-0 h-screen">
        {sidebarBody}
      </aside>

      {/* ── Mobile (< md) ─────────────────────────────────────────── */}
      <div className="md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="fixed top-4 left-4 z-50 w-10 h-10 bg-[#0a1518] border border-white/10 rounded-xl flex items-center justify-center text-white/80 shadow-lg"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
              />
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: 'tween', duration: 0.2 }}
                className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-[#0a1518] border-r border-white/10 z-50 shadow-2xl"
              >
                <button
                  onClick={() => setOpen(false)}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white rounded-lg z-10"
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
                {sidebarBody}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
