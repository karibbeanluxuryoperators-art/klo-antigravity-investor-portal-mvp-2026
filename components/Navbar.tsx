import React, { useState, useEffect, useRef } from 'react';
import { NAV_ITEMS, LANGUAGES } from '../constants';
import { Language } from '../types';

interface NavbarProps {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
  onInquiryOpen?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ lang, setLang, t, onInquiryOpen }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${isScrolled ? 'glass-nav shadow-2xl py-3 border-b border-black/5' : 'bg-transparent py-8'}`}>
      <div className="container mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center space-x-12">
          <a href="/" className={`text-4xl font-bold serif tracking-tighter transition-all duration-500 ${isScrolled ? 'text-luxury-teal scale-90' : 'text-white'}`}>
            KLO
          </a>
          <div className="hidden lg:flex items-center space-x-8">
            {NAV_ITEMS.map((item) => (
              <a 
                key={item.labelKey} 
                href={item.href}
                target={item.href === 'https://karibbean-luxury-operators-experien.vercel.app/' ? '_blank' : '_self'}
                rel={item.href === 'https://karibbean-luxury-operators-experien.vercel.app/' ? 'noopener noreferrer' : ''}
                className={`text-[10px] uppercase tracking-[0.3em] font-bold transition-all duration-300 hover:tracking-[0.5em] group ${isScrolled ? 'text-slate-900/60 hover:text-luxury-teal' : 'text-white/60 hover:text-white'} ${item.href === 'https://karibbean-luxury-operators-experien.vercel.app/' ? 'flex items-center gap-1' : ''}`}
              >
                {t(item.labelKey)}
                {item.href === 'https://karibbean-luxury-operators-experien.vercel.app/' && (
                  <svg className="w-4 h-4 opacity-60 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-8">
          {/* Language Selector */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsLangOpen(!isLangOpen)}
              className={`flex items-center space-x-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${isScrolled ? 'text-slate-900' : 'text-white'}`}
            >
              <span className="opacity-80">{currentLang.flag}</span>
              <span className="hidden md:inline">{currentLang.label}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-500 ${isLangOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isLangOpen && (
              <div className="absolute right-0 mt-4 w-56 bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden border border-slate-100 py-3 animate-scale-in">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLang(l.code);
                      setIsLangOpen(false);
                    }}
                    className={`w-full text-left px-6 py-3 text-[11px] font-bold uppercase tracking-widest hover:bg-slate-50 flex items-center space-x-4 transition-all ${lang === l.code ? 'text-luxury-teal bg-luxury-teal/5' : 'text-slate-600'}`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={onInquiryOpen}
            className={`px-8 py-3 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-500 active:scale-95 shadow-xl ${isScrolled ? 'bg-luxury-teal text-white hover:shadow-luxury-teal/20' : 'bg-white text-slate-900 hover:bg-luxury-teal hover:text-white'}`}
          >
            {t('nav.contact')}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
