/**
 * AIAssistant — KLO Concierge (María 2.0)
 * Reemplaza la versión Gemini Live (rota) con chat HTTP contra /api/chat.
 * Mantiene la estética KLO dark luxury original.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Language } from '../types';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface AIAssistantProps {
  t: (key: string) => any;
  lang: Language;
}

const STORAGE_KEY_EMAIL = 'klo_email';
const STORAGE_KEY_HISTORY = 'klo_chat_history';

const AIAssistant: React.FC<AIAssistantProps> = ({ t, lang }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [turnsUsed, setTurnsUsed] = useState(0);
  const [notified, setNotified] = useState(false);
  const [notifiedLang, setNotifiedLang] = useState<"es" | "en" | "pt">("es");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const handleSendText = useCallback(async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || isLoading) return;
    const userMessage: Message = { role: 'user', text: textToSend };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setNotified(false);
    const history = newMessages.map((m) => ({ role: m.role, content: m.text }));
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, history: history.slice(0, -1) }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.lead?.email) { try { localStorage.setItem(STORAGE_KEY_EMAIL, data.lead.email); } catch {} }
      await new Promise((r) => setTimeout(r, 2500));
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
      setTurnsUsed(data.meta?.turns_used ?? 0);
      const msgLang = (data.meta?.language as "es" | "en" | "pt") || lang;
      if (data.meta?.notified && (data.lead?.status === 'caliente' || data.lead?.status === 'tibio')) {
        setNotified(true);
        setNotifiedLang(msgLang);
        setTimeout(() => setNotified(false), 6000);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: lang === 'en' ? 'I am having trouble connecting. Please try again, or write to hola@karibbeanluxuryoperators.lat.'
          : lang === 'pt' ? 'Estou com problemas de conexão. Por favor tente novamente, ou escreva para hola@karibbeanluxuryoperators.lat.'
          : 'Tengo un problema de conexión. Por favor intente de nuevo, o escriba a hola@karibbeanluxuryoperators.lat.',
      }]);
    } finally { setIsLoading(false); }
  }, [input, isLoading, messages, lang]);

  const suggestionList = t('assistant.suggestions') || [];
  const greeting = lang === 'en' ? 'Welcome. I am María, your concierge at KLO. How may I help you today?'
    : lang === 'pt' ? 'Bem-vindo. Sou María, sua concierge na KLO. Como posso ajudá-lo hoje?'
    : 'Bienvenido. Soy María, su asesora en KLO. ¿En qué puedo asistirle hoy?';

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {!isOpen && (
        <button onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 400); }} aria-label="Open Maria — KLO AI Concierge" className="group relative flex items-center justify-center cursor-pointer" style={{ width: '64px', height: '64px', background: '#B8963E', border: 'none', borderRadius: '0px', boxShadow: '0 8px 32px rgba(184,150,62,0.40)', transition: 'box-shadow 0.4s ease, transform 0.3s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(184,150,62,0.60)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(184,150,62,0.40)'; }}>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a1518] z-10" style={{ background: '#00a8b5' }} />
          <div className="absolute inset-0 animate-ping opacity-30" style={{ background: 'rgba(184,150,62,0.15)', animationDuration: '2s' }} />
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform duration-500">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
      {isOpen && (
        <div className="w-full sm:w-[28rem] sm:mb-6 mb-0 fixed sm:relative inset-0 sm:inset-auto bottom-0 right-0 overflow-hidden flex flex-col" style={{ borderRadius: '0px', border: '1px solid rgba(184,150,62,0.18)', background: '#0a1518', boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.80), 0 0 60px rgba(0,168,181,0.04)', animation: 'klo-slide-up 0.38s cubic-bezier(0.16,1,0.3,1) forwards', maxHeight: '100dvh' }}>
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(184,150,62,0.35) 50%, transparent 100%)' }} />
          <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(26,46,53,0.60)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,168,181,0.10)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '0px', overflow: 'hidden', border: '2px solid rgba(184,150,62,0.30)', background: 'linear-gradient(135deg, #0a1518 0%, #1a2e35 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '24px', fontWeight: 300, color: '#B8963E', lineHeight: 1 }}>M</span>
              </div>
              <div>
                <h4 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 300, fontSize: '17px', color: 'rgba(244,239,230,0.95)', letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: '2px' }}>María</h4>
                <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '8px', fontWeight: 500, color: 'rgba(244,239,230,0.30)', letterSpacing: '0.25em', textTransform: 'uppercase' }}>{t('assistant.role') || 'Concierge'}</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} aria-label="Close chat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(244,239,230,0.50)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div ref={scrollRef} style={{ flex: 1, minHeight: '320px', maxHeight: '380px', overflowY: 'auto', padding: '1.5rem', background: '#0a1518', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="custom-scrollbar">
            {messages.length === 0 && (
              <div style={{ padding: '1.25rem', background: 'rgba(26,46,53,0.50)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,168,181,0.10)', borderRadius: '0px', maxWidth: '85%', animation: 'klo-fade-in 0.6s ease forwards' }}>
                <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 300, fontSize: '13px', lineHeight: 1.7, color: 'rgba(244,239,230,0.75)' }}>{greeting}</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ padding: '0.875rem 1.125rem', maxWidth: '88%', borderRadius: '0px', background: m.role === 'user' ? 'rgba(0,168,181,0.12)' : 'rgba(26,46,53,0.60)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: m.role === 'user' ? '1px solid rgba(0,168,181,0.20)' : '1px solid rgba(255,255,255,0.05)', color: m.role === 'user' ? 'rgba(244,239,230,0.95)' : 'rgba(244,239,230,0.80)' }}>
                  <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 300, fontSize: '13px', lineHeight: 1.7, letterSpacing: '0.01em', whiteSpace: 'pre-wrap' }}>{m.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: 'rgba(26,46,53,0.60)', padding: '0.625rem 1rem', border: '1px solid rgba(0,168,181,0.15)' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[0, -0.15, -0.30].map((delay, idx) => (<div key={idx} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00a8b5', animation: `pulse 1s ease infinite ${delay}s` }} />))}
                  </div>
                  <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '10px', fontWeight: 500, color: 'rgba(244,239,230,0.50)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{lang === 'en' ? 'Attending' : lang === 'pt' ? 'Atendendo' : 'Atendiendo'}</span>
                </div>
              </div>
            )}
            {notified && (
              <div style={{ padding: '0.625rem 1rem', background: 'rgba(184,150,62,0.10)', border: '1px solid rgba(184,150,62,0.30)', textAlign: 'center' }}>
                <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '10px', fontWeight: 500, color: 'rgba(184,150,62,0.85)', letterSpacing: '0.20em', textTransform: 'uppercase' }}>{notifiedLang === 'en' ? 'Our concierge team has been notified' : notifiedLang === 'pt' ? 'Nossa equipe concierge foi notificada' : 'Nuestro equipo concierge ha sido notificado'}</p>
              </div>
            )}
          </div>
          {messages.length === 0 && suggestionList.length > 0 && (
            <div style={{ padding: '0.75rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', background: '#0a1518', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              {suggestionList.map((s: string, i: number) => (
                <button key={i} onClick={() => handleSendText(s)} style={{ fontFamily: '"Inter", sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.20em', textTransform: 'uppercase', padding: '0.5rem 0.875rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(244,239,230,0.40)', cursor: 'pointer', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,168,181,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,168,181,0.30)'; e.currentTarget.style.color = '#00a8b5'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(244,239,230,0.40)'; }}>{s}</button>
              ))}
            </div>
          )}
          {turnsUsed > 0 && turnsUsed < 25 && (
            <div style={{ padding: '0.375rem 1.5rem', textAlign: 'center', background: '#0a1518', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '8px', fontWeight: 500, color: 'rgba(244,239,230,0.25)', letterSpacing: '0.20em', textTransform: 'uppercase' }}>{turnsUsed}/25</span>
            </div>
          )}
          <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(10,21,24,0.80)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendText()} placeholder={t('assistant.placeholder') || 'Escriba su mensaje...'} disabled={isLoading || turnsUsed >= 25} style={{ flex: 1, padding: '0.875rem 1.25rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0px', color: 'rgba(244,239,230,0.90)', fontFamily: '"Inter", sans-serif', fontWeight: 300, fontSize: '13px', outline: 'none', transition: 'border-color 0.3s ease' }} onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,168,181,0.40)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }} />
            <button onClick={() => handleSendText()} disabled={isLoading || !input.trim() || turnsUsed >= 25} style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '0px', background: '#00a8b5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isLoading || !input.trim() || turnsUsed >= 25 ? 0.4 : 1, transition: 'opacity 0.2s ease, transform 0.2s ease', boxShadow: '0 4px 16px rgba(0,168,181,0.25)' }} onMouseEnter={(e) => { if (!isLoading && input.trim() && turnsUsed < 25) e.currentTarget.style.transform = 'scale(1.05)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes klo-slide-up { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes klo-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes klo-bounce { 0%, 60%, 100% { opacity: 0.3; transform: scale(0.85); } 30% { opacity: 1; transform: scale(1.15); } }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(0,168,181,0.4) transparent; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,168,181,0.4); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,168,181,0.7); }
      `}</style>
    </div>
  );
};

export default AIAssistant;
