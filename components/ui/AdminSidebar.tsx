import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, ClipboardList, UserCheck, Inbox,
  Menu, X, LogOut, Layers, BarChart3, Settings, ChevronRight, Sparkles, Package,
  ChevronDown, FlaskConical, RotateCcw,
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
  | 'BUNDLES'   | 'STATS'    | 'SETTINGS'
  | 'SERVICES'  | 'EXPERIENCES';  // v1.8.0 Step 11.5: added for EntityEditor tabs

// v1.8.0 Step 22.23: role-based section visibility.
//
// The server already enforces `role === 'admin'` on every write endpoint
// (see server.ts admin-only guards), so this is a UX gate, not a security
// one. The map below decides which sidebar items a non-admin role can SEE.
// Admins always see everything. Each role gets a sensible default; the
// optional `permissions.tabs` JSONB on `user_roles` can grant individual
// sections beyond the role's default.
export type AdminRole = 'admin' | 'ops' | 'sales' | 'partner' | 'viewer';

const ROLE_TABS: Record<AdminRole, AdminSection[]> = {
  admin:   ['SUPPLIERS', 'SERVICES', 'EXPERIENCES', 'BOOKINGS', 'CLIENTS', 'LEADS', 'BUNDLES', 'STATS', 'SETTINGS'],
  ops:     ['SUPPLIERS', 'SERVICES', 'EXPERIENCES', 'BOOKINGS', 'CLIENTS', 'LEADS', 'BUNDLES', 'STATS'],
  sales:   ['BOOKINGS', 'CLIENTS', 'LEADS', 'STATS'],
  // v1.8.0 Step 22.23a: partners can now see BUNDLES so they can assemble
  // multi-partner experiences (Phase 4 builder will use this). Partners
  // cannot see the lead pipeline or other partners' rosters.
  partner: ['SERVICES', 'EXPERIENCES', 'BOOKINGS', 'BUNDLES', 'STATS'],
  viewer:  ['STATS'],
};

const ROLE_LABEL: Record<AdminRole, { EN: string; ES: string; PT: string }> = {
  admin:   { EN: 'Admin',   ES: 'Admin',    PT: 'Admin' },
  ops:     { EN: 'Ops',     ES: 'Ops',      PT: 'Ops' },
  sales:   { EN: 'Sales',   ES: 'Ventas',   PT: 'Vendas' },
  partner: { EN: 'Partner', ES: 'Socio',    PT: 'Parceiro' },
  viewer:  { EN: 'Viewer',  ES: 'Lector',   PT: 'Leitor' },
};

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
  // v1.8.0 Step 22.23: optional role + permissions gate. If omitted, the
  // sidebar shows every section (back-compat with the rest of the app that
  // hasn't been threaded yet).
  role?: AdminRole | null;
  permissions?: { tabs?: AdminSection[] } | null;
  // v1.8.1 dev-only: role switcher. `devModeEnabled` gates whether the
  // switcher UI renders at all (URL ?dev_roles=1 OR non-prod build, set by
  // AdminGate). `onRoleChange` lets the parent track which fake role the
  // user picked; the sidebar uses it only to render sections, never for
  // any auth call. `null` in the callback = "back to my real role".
  devModeEnabled?: boolean;
  onRoleChange?: (newRole: AdminRole | null) => void;
}

const T: Record<string, { EN: string; ES: string; PT: string }> = {
  // Brand / context
  brand:        { EN: 'KLO Operations', ES: 'KLO Operaciones', PT: 'KLO Operações' },
  brand_sub:    { EN: 'Concierge OS',   ES: 'Sistema Conserjería', PT: 'Sistema Concierge' },
  // Section labels
  suppliers:    { EN: 'Partners',   ES: 'Socios',     PT: 'Parceiros' },
  services:     { EN: 'Services',   ES: 'Servicios',  PT: 'Serviços' },
  experiences:  { EN: 'Experiences',ES: 'Experiencias',PT: 'Experiências' },
  bookings:     { EN: 'Bookings',   ES: 'Reservas',   PT: 'Reservas' },
  clients:      { EN: 'Clients',    ES: 'Clientes',   PT: 'Clientes' },
  leads:        { EN: 'Leads',      ES: 'Leads',      PT: 'Leads' },
  bundles:      { EN: 'Bundles',    ES: 'Paquetes',   PT: 'Pacotes' },
  stats:        { EN: 'Dashboard',  ES: 'Panel',      PT: 'Painel' },
  settings:     { EN: 'Settings',   ES: 'Ajustes',    PT: 'Configurações' },
  // Section subtitles (small, below label)
  suppliers_sub: { EN: 'Network Management',     ES: 'Gestión de Red',          PT: 'Gestão de Rede' },
  services_sub:  { EN: 'Bookable Inventory',     ES: 'Inventario Reservable',  PT: 'Inventário Reservável' },
  experiences_sub: { EN: 'Curated Journeys',      ES: 'Viajes Curados',         PT: 'Viagens Curadas' },
  bookings_sub:  { EN: 'Journey Orchestration',  ES: 'Orquestación de Viajes',  PT: 'Orquestração de Viagens' },
  clients_sub:   { EN: 'UHNWI Guest Relations',  ES: 'Relaciones Huéspedes UHNWI', PT: 'Relações Hóspedes UHNWI' },
  leads_sub:     { EN: 'Inbound Inquiries',      ES: 'Consultas Entrantes',     PT: 'Consultas Entrantes' },
  bundles_sub:   { EN: 'Multi-partner Packages',  ES: 'Paquetes Multi-socio',   PT: 'Pacotes Multi-parceiro' },
  stats_sub:     { EN: 'KPIs & Activity',        ES: 'KPIs y Actividad',        PT: 'KPIs e Atividade' },
  settings_sub:  { EN: 'Roles, Integrations',    ES: 'Roles, Integraciones',    PT: 'Funções, Integrações' },
  // UI
  back:         { EN: 'Back to site', ES: 'Volver al sitio', PT: 'Voltar ao site' },
  signed_in_as: { EN: 'Signed in as', ES: 'Conectado como',  PT: 'Conectado como' },
  sign_out:     { EN: 'Sign out',     ES: 'Cerrar sesión',   PT: 'Sair' },
  pending_badge:{ EN: 'pending',      ES: 'pendientes',      PT: 'pendentes' },
  new_badge:    { EN: 'new',          ES: 'nuevos',          PT: 'novos' },
  // v1.8.0 Step 22.23
  no_access:    { EN: 'No access',   ES: 'Sin acceso',       PT: 'Sem acesso' },
  role_label:   { EN: 'Role',        ES: 'Rol',              PT: 'Função' },
  // v1.8.1 dev-only role switcher
  view_as:      { EN: 'View as',     ES: 'Ver como',         PT: 'Ver como' },
  dev_mode:     { EN: 'DEV MODE',    ES: 'MODO DEV',         PT: 'MODO DEV' },
  reset:        { EN: 'Reset to real', ES: 'Restaurar real', PT: 'Restaurar real' },
  hint:         { EN: 'UI only — server still sees your real role', ES: 'Solo UI — el servidor ve tu rol real', PT: 'Só UI — o servidor vê seu papel real' },
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
  { key: 'SUPPLIERS',   icon: Users,         labelKey: 'suppliers',    subtitleKey: 'suppliers_sub' },
  { key: 'SERVICES',    icon: Package,       labelKey: 'services',     subtitleKey: 'services_sub' },
  { key: 'EXPERIENCES', icon: Sparkles,      labelKey: 'experiences',  subtitleKey: 'experiences_sub', badge: 'new' },
  { key: 'BOOKINGS',    icon: ClipboardList, labelKey: 'bookings',     subtitleKey: 'bookings_sub' },
  { key: 'CLIENTS',     icon: UserCheck,     labelKey: 'clients',      subtitleKey: 'clients_sub' },
  { key: 'LEADS',       icon: Inbox,         labelKey: 'leads',        subtitleKey: 'leads_sub' },
  { key: 'BUNDLES',     icon: Layers,        labelKey: 'bundles',      subtitleKey: 'bundles_sub' },
  { key: 'STATS',       icon: BarChart3,     labelKey: 'stats',        subtitleKey: 'stats_sub' },
  { key: 'SETTINGS',    icon: Settings,      labelKey: 'settings',     subtitleKey: 'settings_sub' },
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
  role = null,
  permissions = null,
  devModeEnabled = false,
  onRoleChange,
}) => {
  const [open, setOpen] = useState(false);
  // v1.8.1 dev switcher state. `roleOverride` is the fake role the user
  // picked from the dropdown; `null` = use the real `role` prop. We track
  // it locally so the parent (SuppliersManagement) only sees the value
  // when the user actually changes it.
  const [roleOverride, setRoleOverride] = useState<AdminRole | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement | null>(null);

  // v1.8.1: close the role switcher on outside click. Mirrors the
  // backdrop pattern in PartnerBundles.tsx, but lighter (no animation,
  // just an immediate close).
  useEffect(() => {
    if (!switcherOpen) return;
    const handleDown = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [switcherOpen]);

  // v1.8.1: effective role = override if dev mode is on and user picked
  // something, otherwise the real role. This is what drives the section
  // filter and the visible role pill — NEVER any auth call.
  const effectiveRole: AdminRole | null = (devModeEnabled && roleOverride) ? roleOverride : role;
  const isOverridden = devModeEnabled && roleOverride != null && roleOverride !== role;

  const pickRole = (next: AdminRole) => {
    setRoleOverride(next);
    setSwitcherOpen(false);
    onRoleChange?.(next);
  };
  const resetRole = () => {
    setRoleOverride(null);
    setSwitcherOpen(false);
    onRoleChange?.(null);
  };

  // v1.8.0 Step 22.23: filter the visible sections by role. If `role` is
  // null (legacy callers haven't been threaded yet) we show everything,
  // preserving back-compat. Permissions can grant individual sections on
  // top of the role's default. v1.8.1: use `effectiveRole` so the dev
  // switcher can re-filter sections without touching the parent's `role`.
  const allowedTabs = useMemo<Set<AdminSection> | null>(() => {
    if (!effectiveRole) return null; // null sentinel = show everything
    const base = new Set(ROLE_TABS[effectiveRole] || []);
    for (const tab of permissions?.tabs || []) base.add(tab);
    return base;
  }, [effectiveRole, permissions]);

  const visibleSections = useMemo(
    () => (allowedTabs ? SECTIONS.filter(s => allowedTabs.has(s.key)) : SECTIONS),
    [allowedTabs],
  );

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
        // v1.8.0 Step 8.10: w-[calc(100%-1rem)] + mx-2 gives 8px inset
        // on each side. The 8px gap keeps the button's 1px gold
        // border visually separate from the aside's border-r
        // (which is also 1px white/20). Without the gap, the two
        // borders overlap and the right edge looks "chopped".
        className={`w-[calc(100%-1rem)] mx-2 flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group ${
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
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#B8963E] text-white font-bold tracking-wider shrink-0">
                {badgeText}
              </span>
            )}
            {count != null && !showBadge && count > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 font-bold shrink-0">
                {count}
              </span>
            )}
          </div>
          {/* v1.8.0 Step 8.8: with the wider w-72 sidebar, the subtitle
              now has enough room to render in full. Tracking reduced
              to 0.15em for a tighter, less-cluttered look. */}
          <p className="text-[9px] text-white/40 uppercase tracking-[0.15em] truncate leading-tight">
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
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-1">
        {visibleSections.map(s => renderSectionItem(s, false))}
      </nav>

      {/* Footer: role chip + signed-in + sign out */}
      {onSignOut && (
        <div className="py-3 px-2 border-t border-white/10 space-y-2 relative">
          {/* v1.8.1 dev role switcher. Hidden entirely unless devModeEnabled
              is true. Renders the EFFECTIVE role (override > real) in a gold
              pill, plus a "View as" toggle and a "DEV" badge whenever the
              user has actually overridden their role. */}
          {devModeEnabled ? (
            <div ref={switcherRef} className="relative px-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] uppercase tracking-[0.2em] text-white/40">
                  {t('role_label', lang)}:
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  effectiveRole === 'admin'
                    ? 'bg-[#B8963E]/20 text-[#B8963E] border-[#B8963E]/40'
                    : 'bg-white/5 text-white/70 border-white/10'
                }`}>
                  {effectiveRole ? (ROLE_LABEL[effectiveRole][lang] || ROLE_LABEL[effectiveRole].EN) : '—'}
                </span>
                {isOverridden && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 inline-flex items-center gap-1">
                    <FlaskConical size={9} /> {t('dev_mode', lang)}
                  </span>
                )}
                <button
                  onClick={() => setSwitcherOpen(v => !v)}
                  className="ml-auto text-[9px] uppercase tracking-[0.2em] text-white/40 hover:text-white inline-flex items-center gap-1 transition-colors"
                  aria-expanded={switcherOpen}
                  aria-label={t('view_as', lang)}
                >
                  {t('view_as', lang)} <ChevronDown size={11} className={`transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <AnimatePresence>
                {switcherOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-2 right-2 bottom-full mb-2 z-50 bg-[#0a1518] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                  >
                    <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
                      <FlaskConical size={11} className="text-[#B8963E]" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#B8963E]">
                        {t('view_as', lang)}
                      </span>
                    </div>
                    <div className="py-1">
                      {(Object.keys(ROLE_LABEL) as AdminRole[]).map((r) => {
                        const isCurrent = (roleOverride ?? role) === r;
                        return (
                          <button
                            key={r}
                            onClick={() => pickRole(r)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-[11px] transition-colors ${
                              isCurrent
                                ? 'bg-[#B8963E]/15 text-white'
                                : 'text-white/70 hover:bg-white/[0.04] hover:text-white'
                            }`}
                          >
                            <span className="uppercase tracking-wider">{ROLE_LABEL[r][lang] || ROLE_LABEL[r].EN}</span>
                            {isCurrent && <span className="text-[#B8963E] text-[10px]">●</span>}
                          </button>
                        );
                      })}
                    </div>
                    {isOverridden && (
                      <>
                        <div className="border-t border-white/10" />
                        <button
                          onClick={resetRole}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
                        >
                          <RotateCcw size={11} /> {t('reset', lang)}
                        </button>
                      </>
                    )}
                    <div className="px-3 py-2 border-t border-white/10 bg-black/20">
                      <p className="text-[9px] text-white/40 leading-relaxed">
                        {t('hint', lang)}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            effectiveRole && (
              <div className="px-2 flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-[0.2em] text-white/40">
                  {t('role_label', lang)}:
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  effectiveRole === 'admin'
                    ? 'bg-[#B8963E]/20 text-[#B8963E] border-[#B8963E]/40'
                    : 'bg-white/5 text-white/70 border-white/10'
                }`}>
                  {ROLE_LABEL[effectiveRole][lang] || ROLE_LABEL[effectiveRole].EN}
                </span>
              </div>
            )
          )}
          {signedInEmail && (
            <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] break-all leading-relaxed px-2">
              {t('signed_in_as', lang)} {signedInEmail}
            </p>
          )}
          <button
            onClick={onSignOut}
            className="w-[calc(100%-0.5rem)] mx-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-[#B8963E] hover:bg-white/[0.04] transition-all text-sm"
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
      <aside className="hidden md:flex w-80 shrink-0 bg-[#081013] border-r border-white/20 sticky top-0 h-screen overflow-hidden isolate z-10">
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
                className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-[#0a1518] border-r border-white/10 z-50 shadow-2xl"
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
