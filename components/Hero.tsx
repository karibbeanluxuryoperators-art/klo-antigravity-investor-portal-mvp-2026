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
