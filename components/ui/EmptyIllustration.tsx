import React from 'react';

// v1.8.0 Step 9.1: empty-state illustration for the admin views.
// A simple gold-accented SVG that conveys "nothing here yet" without
// relying on external image assets. Used in DataTable empty states,
// AdminBundlesView, AdminSettingsView, etc.

interface EmptyIllustrationProps {
  variant?: 'inbox' | 'users' | 'calendar' | 'search' | 'settings' | 'sparkles';
  size?: number;
}

export const EmptyIllustration: React.FC<EmptyIllustrationProps> = ({
  variant = 'inbox',
  size = 80,
}) => {
  const stroke = 'rgba(184, 150, 62, 0.4)'; // gold/40
  const fill = 'rgba(184, 150, 62, 0.06)';  // gold/6

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className="text-[#B8963E]/40"
    >
      {/* Subtle outer ring */}
      <circle cx="50" cy="50" r="46" stroke={stroke} strokeWidth="0.5" strokeDasharray="2 3" />

      {/* Variant icon */}
      {variant === 'inbox' && (
        <>
          <path d="M30 55 L30 70 Q30 75 35 75 L65 75 Q70 75 70 70 L70 55 L60 55 L57 60 L43 60 L40 55 Z"
            fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M30 55 L25 35 Q24 30 30 30 L70 30 Q76 30 75 35 L70 55"
            stroke={stroke} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
        </>
      )}

      {variant === 'users' && (
        <>
          <circle cx="50" cy="40" r="9" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <path d="M30 72 Q30 56 50 56 Q70 56 70 72" stroke={stroke} strokeWidth="1.5" fill={fill} />
        </>
      )}

      {variant === 'calendar' && (
        <>
          <rect x="28" y="32" width="44" height="42" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <line x1="28" y1="42" x2="72" y2="42" stroke={stroke} strokeWidth="1.5" />
          <line x1="40" y1="28" x2="40" y2="36" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <line x1="60" y1="28" x2="60" y2="36" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <circle cx="50" cy="55" r="2" fill={stroke} />
        </>
      )}

      {variant === 'search' && (
        <>
          <circle cx="44" cy="44" r="14" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <line x1="54" y1="54" x2="68" y2="68" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </>
      )}

      {variant === 'settings' && (
        <>
          <circle cx="50" cy="50" r="10" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <g stroke={stroke} strokeWidth="1.5" strokeLinecap="round">
            <line x1="50" y1="22" x2="50" y2="30" />
            <line x1="50" y1="70" x2="50" y2="78" />
            <line x1="22" y1="50" x2="30" y2="50" />
            <line x1="70" y1="50" x2="78" y2="50" />
            <line x1="30" y1="30" x2="36" y2="36" />
            <line x1="64" y1="64" x2="70" y2="70" />
            <line x1="70" y1="30" x2="64" y2="36" />
            <line x1="30" y1="70" x2="36" y2="64" />
          </g>
        </>
      )}

      {variant === 'sparkles' && (
        <>
          <path
            d="M50 25 L52 40 L67 42 L52 44 L50 59 L48 44 L33 42 L48 40 Z"
            fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round"
          />
          <circle cx="30" cy="65" r="2" fill={stroke} />
          <circle cx="70" cy="68" r="1.5" fill={stroke} />
        </>
      )}
    </svg>
  );
};
