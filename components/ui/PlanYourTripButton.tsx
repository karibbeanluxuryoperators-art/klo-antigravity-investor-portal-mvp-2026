import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, MapPin, Mail, ChevronDown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * PlanYourTripButton — v1.8.0 Step 9.4
 * Split-button pattern: the main button opens María (KLO AI concierge);
 * the chevron opens a popover with alternative paths (Destinations, WhatsApp, Email).
 *
 * This replaces the previous single-CTA pattern where the only thing "Plan Your Trip"
 * did was open the AIAssistant chat via a brittle DOM querySelector.
 *
 * Props:
 *   variant  — 'gold' (default) for hero/dark backgrounds, 'teal' for light backgrounds, 'gold-pill' for small inline CTAs
 *   size     — 'md' (default) or 'lg'
 *   label    — primary button label (defaults to "Plan Your Trip")
 *   t        — translation function from getTranslation (for "Open" / "View" / "Contact" / "Destinations" labels)
 */
export type PlanYourTripButtonVariant = 'gold' | 'teal' | 'gold-pill' | 'ghost';
export type PlanYourTripButtonSize = 'md' | 'lg';

interface PlanYourTripButtonProps {
  variant?: PlanYourTripButtonVariant;
  size?: PlanYourTripButtonSize;
  label?: string;
  /** Translation function (optional — falls back to EN copy) */
  t?: (key: string) => string;
  /** If true, render only the icon + chevron (no label) */
  iconOnly?: boolean;
  /** Optional className passthrough */
  className?: string;
}

const LABELS = {
  EN: { primary: 'Plan Your Trip', maria: 'Chat with María', destinations: 'Browse Destinations', whatsapp: 'WhatsApp Us', email: 'Email Us', open: 'Open' },
  ES: { primary: 'Planifica Tu Viaje', maria: 'Hablar con María', destinations: 'Ver Destinos', whatsapp: 'WhatsApp', email: 'Email', open: 'Abrir' },
  PT: { primary: 'Planeje Sua Viagem', maria: 'Falar com María', destinations: 'Ver Destinos', whatsapp: 'WhatsApp', email: 'E-mail', open: 'Abrir' },
};

const PALETTES: Record<PlanYourTripButtonVariant, {
  base: string;       // main button
  chevron: string;    // chevron (split)
  popover: string;    // popover bg
  popoverHover: string;
  text: string;       // text color
  border: string;
  shadow: string;
}> = {
  gold: {
    base: 'bg-[#B8963E] text-white hover:bg-white hover:text-slate-900',
    chevron: 'bg-[#B8963E] text-white border-l border-white/20 hover:bg-[#a37e2a]',
    popover: 'bg-[#0a1518] border-[#B8963E]/30',
    popoverHover: 'hover:bg-white/5',
    text: 'text-white',
    border: 'border-[#B8963E]/30',
    shadow: 'shadow-lg shadow-[#B8963E]/20',
  },
  'gold-pill': {
    base: 'bg-[#B8963E] text-white hover:bg-white hover:text-slate-900',
    chevron: 'bg-[#B8963E] text-white border-l border-white/20 hover:bg-[#a37e2a]',
    popover: 'bg-[#0a1518] border-[#B8963E]/30',
    popoverHover: 'hover:bg-white/5',
    text: 'text-white',
    border: 'border-[#B8963E]/30',
    shadow: 'shadow-lg shadow-[#B8963E]/20',
  },
  teal: {
    base: 'bg-luxury-teal text-white hover:brightness-110',
    chevron: 'bg-luxury-teal text-white border-l border-white/30 hover:brightness-90',
    popover: 'bg-white border-slate-200',
    popoverHover: 'hover:bg-slate-50',
    text: 'text-slate-900',
    border: 'border-slate-200',
    shadow: 'shadow-2xl shadow-luxury-teal/20',
  },
  ghost: {
    base: 'bg-white/10 backdrop-blur text-white hover:bg-white/20',
    chevron: 'bg-white/10 backdrop-blur text-white border-l border-white/20 hover:bg-white/15',
    popover: 'bg-[#0a1518] border-white/20',
    popoverHover: 'hover:bg-white/5',
    text: 'text-white',
    border: 'border-white/20',
    shadow: 'shadow-lg',
  },
};

const SIZE_PX: Record<PlanYourTripButtonSize, { btn: string; chevron: string; icon: number; text: string }> = {
  md: { btn: 'px-6 py-3', chevron: 'px-3 py-3', icon: 16, text: 'text-[10px]' },
  lg: { btn: 'px-10 py-4', chevron: 'px-4 py-4', icon: 18, text: 'text-[10px]' },
};

export const PlanYourTripButton: React.FC<PlanYourTripButtonProps> = ({
  variant = 'gold',
  size = 'md',
  label,
  t,
  iconOnly = false,
  className = '',
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close popover on click outside
  useEffect(() => {
    if (!popoverOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopoverOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [popoverOpen]);

  // Decide language from t() if possible, else default to ES (KLO's primary)
  const labels = (() => {
    // Try to read the lang the parent passed. We don't get lang directly,
    // but we can sniff it from t('hero.cta') and compare against the ES/EN/PT strings.
    const candidate = t?.('hero.cta') ?? '';
    if (candidate === 'Start Planning' || candidate === 'Plan Your Trip') return LABELS.EN;
    if (candidate === 'Planeje Sua Viagem' || candidate === 'Começar Planejamento') return LABELS.PT;
    return LABELS.ES;
  })();

  const palette = PALETTES[variant];
  const sizing = SIZE_PX[size];

  // Actions
  const openMaria = () => {
    setPopoverOpen(false);
    const btn = document.querySelector('button[aria-label="Open Maria — KLO AI Concierge"]') as HTMLButtonElement | null;
    if (btn) {
      btn.click();
    } else {
      // Fallback: navigate to home (should never happen on a KLO page)
      window.location.href = '/#contact';
    }
  };

  const scrollToDestinations = () => {
    setPopoverOpen(false);
    const el = document.getElementById('destinos') || document.getElementById('destinations');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openWhatsApp = () => {
    setPopoverOpen(false);
    window.open('https://wa.me/573243132500?text=Hola%20KLO%2C%20me%20interesa%20planificar%20un%20viaje', '_blank', 'noopener,noreferrer');
  };

  const openEmail = () => {
    setPopoverOpen(false);
    window.location.href = 'mailto:hola@karibbeanluxuryoperators.lat?subject=Plan%20My%20Trip';
  };

  return (
    <div ref={wrapRef} className={`relative inline-flex items-stretch ${className}`}>
      {/* Main button — opens María */}
      <button
        type="button"
        onClick={openMaria}
        aria-label={`${labels.open} ${labels.maria}`}
        className={`
          inline-flex items-center gap-2 ${sizing.btn} ${palette.base}
          font-bold ${sizing.text} uppercase tracking-[0.3em] rounded-l-full
          transition-all duration-500 active:scale-95 ${palette.shadow}
        `}
      >
        <MessageCircle size={sizing.icon} strokeWidth={2} aria-hidden="true" />
        {!iconOnly && (label || labels.primary)}
      </button>

      {/* Chevron — opens popover */}
      <button
        type="button"
        onClick={() => setPopoverOpen((o) => !o)}
        aria-label="More planning options"
        aria-haspopup="menu"
        aria-expanded={popoverOpen}
        className={`
          ${sizing.chevron} ${palette.chevron} rounded-r-full
          transition-all duration-300 active:scale-95
        `}
      >
        <ChevronDown
          size={sizing.icon}
          strokeWidth={2}
          aria-hidden="true"
          className={`transition-transform duration-300 ${popoverOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Popover */}
      <AnimatePresence>
        {popoverOpen && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`
              absolute top-full right-0 mt-2 min-w-[260px] z-50
              ${palette.popover} rounded-2xl overflow-hidden
              border ${palette.border} ${palette.shadow}
              backdrop-blur-xl
            `}
          >
            <div className={`px-4 py-3 border-b ${palette.border}`}>
              <p className={`${sizing.text} uppercase tracking-[0.3em] font-bold ${variant === 'teal' ? 'text-slate-500' : 'text-white/40'}`}>
                {labels.open}
              </p>
            </div>
            <div className="py-2">
              <button
                type="button"
                role="menuitem"
                onClick={openMaria}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left
                  ${palette.popoverHover} ${palette.text} transition-colors
                `}
              >
                <Sparkles size={16} className="text-[#B8963E] shrink-0" aria-hidden="true" />
                <div>
                  <div className="text-sm font-semibold">{labels.maria}</div>
                  <div className={`${sizing.text} uppercase tracking-[0.2em] font-bold ${variant === 'teal' ? 'text-slate-400' : 'text-white/40'} mt-0.5`}>
                    AI · 24/7
                  </div>
                </div>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={scrollToDestinations}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left
                  ${palette.popoverHover} ${palette.text} transition-colors
                `}
              >
                <MapPin size={16} className="text-[#B8963E] shrink-0" aria-hidden="true" />
                <div>
                  <div className="text-sm font-semibold">{labels.destinations}</div>
                  <div className={`${sizing.text} uppercase tracking-[0.2em] font-bold ${variant === 'teal' ? 'text-slate-400' : 'text-white/40'} mt-0.5`}>
                    6 locations
                  </div>
                </div>
              </button>

              <div className={`my-1 border-t ${palette.border}`} />

              <button
                type="button"
                role="menuitem"
                onClick={openWhatsApp}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left
                  ${palette.popoverHover} ${palette.text} transition-colors
                `}
              >
                <MessageCircle size={16} className="text-emerald-500 shrink-0" aria-hidden="true" />
                <div className="text-sm font-semibold">{labels.whatsapp}</div>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={openEmail}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left
                  ${palette.popoverHover} ${palette.text} transition-colors
                `}
              >
                <Mail size={16} className="text-[#B8963E] shrink-0" aria-hidden="true" />
                <div className="text-sm font-semibold">{labels.email}</div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlanYourTripButton;
