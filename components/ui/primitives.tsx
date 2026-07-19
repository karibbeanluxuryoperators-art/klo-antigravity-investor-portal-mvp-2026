// ── KLO Design System Primitives ──────────────────────────────────────────────
// Reusable visual building blocks that match the public-site design language
// (https://karibbeanluxuryoperators.lat). Every surface — public site, supplier
// portal, supplier dashboard, admin portal — should compose these instead of
// inventing new ad-hoc styles.
//
// The public-site DNA (extracted from Hero.tsx, Destinations.tsx, the
// premier-services section, the Navbar, and the footer in App.tsx):
//
//   - Alternating backgrounds: white / slate-50 / navy-900 (`#0a1518`)
//   - Type: Cormorant Garamond italic serif for display, Inter for body,
//     uppercase 10-11px tracking-[0.4-0.5em] for section labels
//   - Accent: luxury-teal `#00a8b5` (NOT gold — gold is reserved for the
//     primary CTA + decorative marks)
//   - Gold `#B8963E` is the brand-mark color, used sparingly
//   - Section label pattern: "── 8px rule ── UPPERCASE LABEL ── 8px rule ──"
//   - Buttons: gold-on-dark-glass, white-outline-on-dark, slate-on-light
//   - Card pattern: white bg, slate-100 border, hover lift + border-gold
//   - Inputs: white bg, slate-200 border, focus:border-luxury-teal
//   - Motion: subtle (hover scale 1.02-1.05, fades 300-500ms)

import React from 'react';
import { motion } from 'motion/react';

// ── SectionLabel ──────────────────────────────────────────────────────────────
// The "── 8px rule ── UPPERCASE LABEL ── 8px rule ──" pattern that appears
// above every public-site section heading. The rules adapt to the section
// background: teal on light, gold on dark.

interface SectionLabelProps {
  children: React.ReactNode;
  tone?: 'teal' | 'gold' | 'light';  // teal on light bg, gold on dark bg, light (white) on very dark
  className?: string;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ children, tone = 'teal', className = '' }) => {
  const ruleClass =
    tone === 'teal' ? 'bg-luxury-teal' :
    tone === 'gold' ? 'bg-[#B8963E]' :
    'bg-white/40';
  const textClass =
    tone === 'teal' ? 'text-luxury-teal' :
    tone === 'gold' ? 'text-[#B8963E]' :
    'text-white/60';
  return (
    <div className={`flex items-center justify-center space-x-3 mb-6 ${className}`}>
      <div className={`h-px w-8 ${ruleClass}`}></div>
      <p className={`${textClass} font-bold text-[10px] uppercase tracking-[0.5em]`}>
        {children}
      </p>
      <div className={`h-px w-8 ${ruleClass}`}></div>
    </div>
  );
};

// ── DisplayHeading ────────────────────────────────────────────────────────────
// Cormorant italic serif display heading. Use for h1/h2 in any surface.

interface DisplayHeadingProps {
  children: React.ReactNode;
  tone?: 'dark' | 'light' | 'gold';  // dark on light bg, light on dark bg, gold accent
  size?: 'sm' | 'md' | 'lg' | 'xl';
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}

export const DisplayHeading: React.FC<DisplayHeadingProps> = ({
  children,
  tone = 'dark',
  size = 'lg',
  as: As = 'h2',
  className = '',
}) => {
  const sizeClass =
    size === 'xl' ? 'text-5xl md:text-7xl' :
    size === 'lg' ? 'text-4xl md:text-6xl' :
    size === 'md' ? 'text-3xl md:text-4xl' :
    'text-2xl md:text-3xl';
  const toneClass =
    tone === 'dark' ? 'text-slate-900' :
    tone === 'light' ? 'text-white' :
    'text-[#B8963E]';
  return (
    <As className={`${sizeClass} font-bold mb-8 ${toneClass} serif leading-tight ${className}`}>
      {children}
    </As>
  );
};

// ── BodyText ──────────────────────────────────────────────────────────────────
// Inter for body copy. Light weight, generous leading.

interface BodyTextProps {
  children: React.ReactNode;
  tone?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BodyText: React.FC<BodyTextProps> = ({ children, tone = 'dark', size = 'md', className = '' }) => {
  const sizeClass = size === 'lg' ? 'text-lg md:text-xl' : size === 'sm' ? 'text-sm' : 'text-base';
  const toneClass = tone === 'dark' ? 'text-slate-500' : 'text-white/60';
  return (
    <p className={`${sizeClass} ${toneClass} font-light leading-relaxed ${className}`}>
      {children}
    </p>
  );
};

// ── PrimaryButton (gold-on-dark glass) ────────────────────────────────────────
// The "KLO gold" button. Translucent gold bg, gold border, gold text. The
// border thickens on hover. Used for primary CTAs on dark backgrounds.

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  onClick,
  type = 'button',
  disabled = false,
  icon,
  className = '',
  size = 'md',
  fullWidth = false,
}) => {
  const sizeClass =
    size === 'sm' ? 'px-6 py-3 text-[10px]' :
    size === 'lg' ? 'px-16 py-6 text-xs' :
    'px-12 py-4 text-[11px]';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${fullWidth ? 'w-full' : ''} ${sizeClass} bg-[#B8963E]/10 border border-[#B8963E]/40 text-[#B8963E] font-medium tracking-[0.3em] uppercase backdrop-blur-md transition-all duration-500 flex items-center justify-center gap-3 hover:bg-[#B8963E]/20 hover:border-[#B8963E]/70 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
      {icon}
    </button>
  );
};

// ── GhostButton (outline, secondary) ──────────────────────────────────────────
// Border-only button for secondary actions. Adapts to the section bg.

interface GhostButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  tone?: 'dark' | 'light';
  icon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const GhostButton: React.FC<GhostButtonProps> = ({
  children,
  onClick,
  type = 'button',
  tone = 'light',
  icon,
  className = '',
  size = 'md',
  fullWidth = false,
}) => {
  const sizeClass =
    size === 'sm' ? 'px-6 py-3 text-[10px]' :
    size === 'lg' ? 'px-12 py-5 text-xs' :
    'px-8 py-4 text-[11px]';
  const toneClass =
    tone === 'light'
      ? 'border-white/10 text-white hover:bg-white hover:text-slate-900'
      : 'border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900';
  return (
    <button
      type={type}
      onClick={onClick}
      className={`${fullWidth ? 'w-full' : ''} ${sizeClass} border rounded-full font-bold uppercase tracking-[0.3em] transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${toneClass} ${className}`}
    >
      {children}
      {icon}
    </button>
  );
};

// ── Card ──────────────────────────────────────────────────────────────────────
// Surface card. White on light bg, dark-glass on dark bg. Hover lifts slightly.

interface CardProps {
  children: React.ReactNode;
  tone?: 'light' | 'dark';
  hover?: boolean;
  onClick?: () => void;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  tone = 'light',
  hover = true,
  onClick,
  className = '',
  padding = 'lg',
}) => {
  const padClass = padding === 'sm' ? 'p-6' : padding === 'md' ? 'p-8' : 'p-10';
  const baseClass =
    tone === 'light'
      ? 'bg-white border border-slate-100'
      : 'bg-white/5 backdrop-blur-sm border border-white/10';
  const hoverClass = hover
    ? 'transition-all duration-500 hover:border-[#B8963E]/40 hover:shadow-2xl hover:shadow-[#B8963E]/5 hover:-translate-y-1'
    : '';
  return (
    <div onClick={onClick} className={`${baseClass} ${hoverClass} rounded-2xl ${padClass} ${className}`}>
      {children}
    </div>
  );
};

// ── StatCard (gold accent on dark navy) ───────────────────────────────────────
// The "4 stat cards" pattern from the dashboard overview. Light text on a
// dark glass card with a gold icon and a big number.

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: 'dark' | 'light';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, tone = 'dark', className = '' }) => {
  const toneClass =
    tone === 'dark'
      ? 'bg-white/5 backdrop-blur-sm border border-white/10'
      : 'bg-white border border-slate-100 shadow-sm';
  const labelClass = tone === 'dark' ? 'text-white/40' : 'text-slate-500';
  const valueClass = tone === 'dark' ? 'text-white' : 'text-slate-900';
  return (
    <div className={`${toneClass} rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] uppercase tracking-[0.3em] font-semibold ${labelClass}`}>
          {label}
        </span>
        <span className="text-[#B8963E]">{icon}</span>
      </div>
      <span className={`text-3xl font-serif italic ${valueClass}`}>
        {value}
      </span>
    </div>
  );
};

// ── Input ─────────────────────────────────────────────────────────────────────
// Form input. Light bg, slate border, teal focus.

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, className = '', ...rest }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-[10px] font-sans uppercase tracking-[0.3em] text-slate-500 font-semibold">
            {label}
          </label>
        )}
        <input
          ref={ref}
          {...rest}
          className={`w-full bg-white border border-slate-200 rounded-lg py-4 px-5 focus:outline-none focus:border-luxury-teal focus:ring-1 focus:ring-luxury-teal/30 transition-all font-light text-slate-900 placeholder:text-slate-300 ${className}`}
        />
        {hint && (
          <p className="text-[11px] text-slate-400 font-light italic">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ── TextArea ──────────────────────────────────────────────────────────────────

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, hint, className = '', ...rest }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-[10px] font-sans uppercase tracking-[0.3em] text-slate-500 font-semibold">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          {...rest}
          className={`w-full bg-white border border-slate-200 rounded-lg py-4 px-5 focus:outline-none focus:border-luxury-teal focus:ring-1 focus:ring-luxury-teal/30 transition-all font-light text-slate-900 placeholder:text-slate-300 resize-none ${className}`}
        />
        {hint && (
          <p className="text-[11px] text-slate-400 font-light italic">{hint}</p>
        )}
      </div>
    );
  }
);
TextArea.displayName = 'TextArea';

// ── Section ───────────────────────────────────────────────────────────────────
// A full-bleed section with consistent vertical rhythm. The base "page" the
// rest of the surfaces are built on.

interface SectionProps {
  children: React.ReactNode;
  tone?: 'light' | 'dark';   // 'light' = bg-slate-50, 'dark' = bg-[#0a1518]
  size?: 'sm' | 'md' | 'lg'; // vertical padding
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  children,
  tone = 'light',
  size = 'md',
  className = '',
}) => {
  const bgClass = tone === 'light' ? 'bg-slate-50' : 'bg-[#0a1518]';
  const pyClass = size === 'sm' ? 'py-16' : size === 'lg' ? 'py-32' : 'py-20';
  return (
    <section className={`${bgClass} ${pyClass} ${className}`}>
      <div className="container mx-auto px-6">
        {children}
      </div>
    </section>
  );
};

// ── TopNav (for portal pages) ──────────────────────────────────────────────────
// A small top bar used on SupplierPortal, SupplierLogin, etc. Keeps the
// KLO logo on the left and a "Back to home" / lang switcher on the right.

interface TopNavProps {
  onBack?: () => void;
  backLabel?: string;
  rightSlot?: React.ReactNode;
  tone?: 'dark' | 'light';
  className?: string;
}

export const TopNav: React.FC<TopNavProps> = ({ onBack, backLabel, rightSlot, tone = 'light', className = '' }) => {
  const toneClass = tone === 'light'
    ? 'bg-white/80 backdrop-blur-md border-slate-100'
    : 'bg-[#0a1518]/80 backdrop-blur-md border-white/5';
  const textClass = tone === 'light' ? 'text-slate-700' : 'text-white/70';
  return (
    <nav className={`sticky top-0 left-0 right-0 z-50 ${toneClass} border-b ${className}`}>
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center transition-opacity hover:opacity-80">
          <img
            src="/klo-logo.png"
            alt="KLO"
            className="h-10 w-auto"
            style={{ filter: tone === 'light' ? 'none' : 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}
          />
        </a>
        <div className="flex items-center gap-4">
          {rightSlot}
          {onBack && backLabel && (
            <button
              onClick={onBack}
              className={`px-5 py-2 border ${tone === 'light' ? 'border-slate-200 hover:border-slate-900' : 'border-white/10 hover:border-white/40'} rounded-full text-[10px] font-sans uppercase tracking-[0.3em] font-semibold transition-all ${textClass}`}
            >
              {backLabel}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
