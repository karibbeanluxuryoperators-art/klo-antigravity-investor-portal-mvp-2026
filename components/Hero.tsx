import React from 'react';

interface HeroProps {
  t: (key: string) => any;
}

const HERO_STATIC_IMAGE = "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&q=80&w=1920";

const Hero: React.FC<HeroProps> = ({ t }) => {
  return (
    <section 
      className="relative overflow-hidden bg-slate-900"
      style={{ 
        width: '100%',
        height: '100vh',
        maxHeight: '100vh',
        margin: 0,
        padding: 0
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <img
          src={HERO_STATIC_IMAGE}
          alt="Luxury Caribbean Yacht"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
          }}
        />
      </div>

      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent, rgba(0,0,0,0.9))',
          zIndex: 1,
        }}
      ></div>

      <div 
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: '42rem', textAlign: 'center', color: 'white' }}>
          <h1 style={{ fontSize: '3.75rem', fontWeight: 'bold', marginBottom: '1.5rem', lineHeight: 1.2, textShadow: '0 20px 25px rgba(0,0,0,0.5)' }} className="serif">
            {t('hero.title')}
          </h1>
          <p style={{ fontSize: '1.125rem', marginBottom: '2.5rem', opacity: 0.9, lineHeight: 1.6, textShadow: '0 10px 15px rgba(0,0,0,0.3)' }}>
            {t('hero.subtitle')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => {
                const btn = document.querySelector('[aria-label="Open Maria — KLO AI Concierge"]') as HTMLButtonElement;
                if (btn) btn.click();
              }}
              className="cursor-pointer"
              style={{
                padding: '1rem 2.5rem',
                background: 'rgba(184, 150, 62, 0.15)',
                border: '1px solid rgba(184, 150, 62, 0.6)',
                color: '#f4efe6',
                fontFamily: '"Inter", sans-serif',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                transition: 'all 0.4s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(184, 150, 62, 0.30)';
                e.currentTarget.style.borderColor = 'rgba(184, 150, 62, 0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(184, 150, 62, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(184, 150, 62, 0.6)';
              }}
            >
              {t('hero.cta')}
            </button>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSf2fDPMkhJfCB12AWppQjxXldV0vC1CNmSy-Vl4WhKVkhRonQ/viewform?usp=header"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '0.5rem 1.5rem',
                color: 'rgba(244, 239, 230, 0.55)',
                fontFamily: '"Inter", sans-serif',
                fontSize: '10px',
                fontWeight: 400,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(244, 239, 230, 0.2)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'rgba(244, 239, 230, 0.85)';
                e.currentTarget.style.borderColor = 'rgba(244, 239, 230, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(244, 239, 230, 0.55)';
                e.currentTarget.style.borderColor = 'rgba(244, 239, 230, 0.2)';
              }}
            >
              {t('supplier.cta')}
            </a>
          </div>
        </div>
      </div>

      <div 
        style={{
          position: 'absolute',
          bottom: '3rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          opacity: 0.4,
        }}
        className="hidden md:block"
      >
        <div style={{ width: '1px', height: '6rem', background: 'linear-gradient(to bottom, white, transparent)' }}></div>
      </div>
    </section>
  );
};

export default Hero;
