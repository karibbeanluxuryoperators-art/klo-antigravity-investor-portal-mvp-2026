/**
 * AIAssistant — KLO Concierge (María 3.0)
 * Migrated from /api/chat (broken) → /api/maria/chat.
 * Adds a live qualification panel that tracks what María has learned
 * (name, email, phone, services, dates, party size, budget) and shows
 * the tier (Standard / Gold / Platinum) as the lead qualifies.
 *
 * The endpoint persists every conversation as a `leads` row in Supabase,
 * so the admin CRM sees Maria's conversations in real time.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Language } from '../types';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface QualificationState {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  servicesNeeded: string[];
  travelDates: string | null;
  origin: string | null;
  destination: string | null;
  passengers: number | null;
  budget: number | null;
  documentationReady: boolean | null;
  qualified: boolean;
  preferredLanguage: 'EN' | 'ES' | 'PT' | null;
}

interface AIAssistantProps {
  t: (key: string) => any;
  lang: Language;
}

const STORAGE_KEY_EMAIL = 'klo_email';
const STORAGE_KEY_HISTORY = 'klo_chat_history';
const STORAGE_KEY_LEAD_ID = 'klo_maria_lead_id';
const STORAGE_KEY_QUAL = 'klo_maria_qualification';

const tierFor = (budget: number | null, qualified: boolean): { key: 'standard' | 'gold' | 'platinum' | 'pending'; label: string; threshold: string } => {
  if (budget && budget >= 50000) return { key: 'platinum', label: 'Platinum', threshold: '$50K+' };
  if (budget && budget >= 10000) return { key: 'gold', label: 'Gold', threshold: '$10K+' };
  if (qualified) return { key: 'gold', label: 'Gold', threshold: 'UHNW' };
  return { key: 'standard', label: 'Standard', threshold: '<$10K' };
};

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
  const [notifiedLang, setNotifiedLang] = useState<'es' | 'en' | 'pt'>('es');
  const [leadId, setLeadId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY_LEAD_ID); } catch { return null; }
  });
  const [qualification, setQualification] = useState<QualificationState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_QUAL);
      return saved ? JSON.parse(saved) : {
        fullName: null, email: null, phone: null, servicesNeeded: [],
        travelDates: null, origin: null, destination: null,
        passengers: null, budget: null, documentationReady: null,
        qualified: false, preferredLanguage: null,
      };
    } catch {
      return {
        fullName: null, email: null, phone: null, servicesNeeded: [],
        travelDates: null, origin: null, destination: null,
        passengers: null, budget: null, documentationReady: null,
        qualified: false, preferredLanguage: null,
      };
    }
  });
  const [showPanel, setShowPanel] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist chat history (sessionStorage so it survives reloads but not forever)
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  // Persist qualification + leadId (localStorage so we keep context across sessions)
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_QUAL, JSON.stringify(qualification)); } catch {}
  }, [qualification]);
  useEffect(() => {
    if (leadId) { try { localStorage.setItem(STORAGE_KEY_LEAD_ID, leadId); } catch {} }
  }, [leadId]);

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
      const response = await fetch('/api/maria/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: history.slice(0, -1),
          lang: lang === 'en' ? 'EN' : lang === 'pt' ? 'PT' : 'ES',
          leadId: leadId,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      // Contract: { success, result: { reply, fullName, email, ... }, lead: { id, ... }, meta: { language, turns_used, source } }
      const result = data?.result || {};
      const meta = data?.meta || {};
      const persistedLead = data?.lead || null;

      // Update qualification from result (merge — keep what we already had if new is null)
      setQualification((prev) => {
        const next: QualificationState = {
          fullName: result.fullName || prev.fullName,
          email: result.email || prev.email,
          phone: result.phone || prev.phone,
          servicesNeeded: Array.isArray(result.servicesNeeded) && result.servicesNeeded.length > 0
            ? Array.from(new Set([...prev.servicesNeeded, ...result.servicesNeeded]))
            : prev.servicesNeeded,
          travelDates: result.travelDates || prev.travelDates,
          origin: result.origin || prev.origin,
          destination: result.destination || prev.destination,
          passengers: result.passengers ?? prev.passengers,
          budget: result.budget ?? prev.budget,
          documentationReady: result.documentationReady !== null && result.documentationReady !== undefined
            ? result.documentationReady
            : prev.documentationReady,
          qualified: !!(result.qualified || prev.qualified || (result.budget && result.budget >= 10000)),
          preferredLanguage: result.preferredLanguage || prev.preferredLanguage,
        };
        return next;
      });

      // Capture lead id from server response
      if (persistedLead?.id && !leadId) setLeadId(persistedLead.id);
      if (result.email) { try { localStorage.setItem(STORAGE_KEY_EMAIL, result.email); } catch {} }

      // Push the assistant reply
      const replyText = result.reply || (lang === 'en'
        ? 'I am here to help. Could you tell me more about what you are looking for?'
        : lang === 'pt' ? 'Estou aqui para ajudar. Pode me contar mais sobre o que procura?'
        : 'Estoy aquí para ayudar. ¿Podría contarme más sobre lo que busca?');
      setMessages((prev) => [...prev, { role: 'assistant', text: replyText }]);
      setTurnsUsed(meta.turns_used ?? newMessages.length);

      // Trigger notification if lead qualified
      const nowQualified = !!(result.qualified || (result.budget && result.budget >= 10000));
      if (nowQualified) {
        const msgLang = (meta.language === 'EN' ? 'en' : meta.language === 'PT' ? 'pt' : 'es') as 'en' | 'es' | 'pt';
        setNotified(true);
        setNotifiedLang(msgLang);
        setTimeout(() => setNotified(false), 6000);
      }
    } catch (err) {
      console.error('Maria chat error:', err);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: lang === 'en' ? 'I am having trouble connecting. Please try again, or write to hola@karibbeanluxuryoperators.lat.'
          : lang === 'pt' ? 'Estou com problemas de conexão. Por favor tente novamente, ou escreva para hola@karibbeanluxuryoperators.lat.'
          : 'Tengo un problema de conexión. Por favor intente de nuevo, o escriba a hola@karibbeanluxuryoperators.lat.',
      }]);
    } finally { setIsLoading(false); }
  }, [input, isLoading, messages, lang, leadId]);

  const suggestionList = t('assistant.suggestions') || [];
  const greeting = lang === 'en' ? 'Welcome. I am María, your concierge at KLO. How may I help you today?'
    : lang === 'pt' ? 'Bem-vindo. Sou María, sua consultora na KLO. Como posso ajudá-lo hoje?'
    : 'Bienvenido. Soy María, su asesora en KLO. ¿En qué puedo asistirle hoy?';

  const tier = tierFor(qualification.budget, qualification.qualified);
  const capturedCount = [
    qualification.fullName,
    qualification.email || qualification.phone,
    qualification.servicesNeeded.length > 0,
    qualification.travelDates,
    qualification.passengers,
    qualification.budget,
  ].filter(Boolean).length;

  // Labels by language for the qualification panel
  const panelLabels = {
    en: {
      title: 'Live Qualification',
      subtitle: 'María qualifies each conversation. Reach $10K+ for our Gold tier.',
      fields: {
        name: 'Guest Name',
        contact: 'Email / Phone',
        services: 'Services',
        dates: 'Travel Dates / Party',
        budget: 'Budget (USD)',
        tier: 'Tier',
      },
      awaiting: 'Awaiting details…',
      captured: 'Captured',
      pending: 'Pending',
      standard: 'Standard',
      gold: 'Gold',
      platinum: 'Platinum',
      ready: 'Lead Qualified — Concierge Team Notified',
      scoring: 'Continue conversation to qualify',
      lang: 'Detected',
      hide: 'Hide',
      show: 'Qualification',
    },
    es: {
      title: 'Calificación en Vivo',
      subtitle: 'María califica cada conversación. A partir de $10K USD se activa el nivel Gold.',
      fields: {
        name: 'Nombre',
        contact: 'Email / Teléfono',
        services: 'Servicios',
        dates: 'Fechas / Huéspedes',
        budget: 'Presupuesto (USD)',
        tier: 'Nivel',
      },
      awaiting: 'Esperando datos…',
      captured: 'Capturado',
      pending: 'Pendiente',
      standard: 'Standard',
      gold: 'Gold',
      platinum: 'Platinum',
      ready: 'Lead Calificado — Equipo Concierge Notificado',
      scoring: 'Continúe la conversación para calificar',
      lang: 'Idioma',
      hide: 'Ocultar',
      show: 'Calificación',
    },
    pt: {
      title: 'Qualificação ao Vivo',
      subtitle: 'María qualifica cada conversa. A partir de $10K USD ativamos o nível Gold.',
      fields: {
        name: 'Nome',
        contact: 'E-mail / Telefone',
        services: 'Serviços',
        dates: 'Datas / Hóspedes',
        budget: 'Orçamento (USD)',
        tier: 'Nível',
      },
      awaiting: 'Aguardando dados…',
      captured: 'Capturado',
      pending: 'Pendente',
      standard: 'Standard',
      gold: 'Gold',
      platinum: 'Platinum',
      ready: 'Lead Qualificado — Equipe Concierge Notificada',
      scoring: 'Continue a conversa para qualificar',
      lang: 'Idioma',
      hide: 'Ocultar',
      show: 'Qualificação',
    },
  }[lang === 'en' ? 'en' : lang === 'pt' ? 'pt' : 'es'];

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 400); }}
          aria-label="Open Maria — KLO AI Concierge"
          className="group relative flex items-center justify-center cursor-pointer"
          style={{ width: '64px', height: '64px', background: '#B8963E', border: 'none', borderRadius: '0px', boxShadow: '0 8px 32px rgba(184,150,62,0.40)', transition: 'box-shadow 0.4s ease, transform 0.3s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(184,150,62,0.60)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(184,150,62,0.40)'; }}
        >
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a1518] z-10" style={{ background: '#00a8b5' }} />
          <div className="absolute inset-0 animate-ping opacity-30" style={{ background: 'rgba(184,150,62,0.15)', animationDuration: '2s' }} />
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform duration-500">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
      {isOpen && (
        <div
          className="fixed sm:absolute bottom-0 right-0 sm:bottom-0 sm:right-0 overflow-hidden flex flex-col"
          style={{
            width: showPanel ? 'min(56rem, 100vw)' : 'min(28rem, 100vw)',
            maxWidth: '100vw',
            height: 'min(720px, 100dvh)',
            borderRadius: '0px',
            border: '1px solid rgba(184,150,62,0.18)',
            background: '#0a1518',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.80), 0 0 60px rgba(0,168,181,0.04)',
            animation: 'klo-slide-up 0.38s cubic-bezier(0.16,1,0.3,1) forwards',
            transition: 'width 0.35s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(184,150,62,0.35) 50%, transparent 100%)' }} />

          {/* Top header bar — spans full width including the panel */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              background: 'rgba(26,46,53,0.60)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(0,168,181,0.10)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '44px', height: '44px', borderRadius: '0px', overflow: 'hidden',
                  border: '2px solid rgba(184,150,62,0.30)',
                  background: 'linear-gradient(135deg, #0a1518 0%, #1a2e35 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '24px', fontWeight: 300, color: '#B8963E', lineHeight: 1 }}>M</span>
              </div>
              <div>
                <h4 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 300, fontSize: '17px', color: 'rgba(244,239,230,0.95)', letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: '2px' }}>
                  María
                </h4>
                <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '8px', fontWeight: 500, color: 'rgba(244,239,230,0.30)', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
                  {t('assistant.role') || 'Concierge'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setShowPanel((s) => !s)}
                aria-label={showPanel ? panelLabels.hide : panelLabels.show}
                style={{
                  background: 'rgba(0,168,181,0.10)', border: '1px solid rgba(0,168,181,0.30)',
                  borderRadius: '0px', padding: '6px 12px', cursor: 'pointer',
                  fontFamily: '"Inter", sans-serif', fontSize: '9px', fontWeight: 600,
                  letterSpacing: '0.20em', textTransform: 'uppercase', color: '#00a8b5',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span>{showPanel ? panelLabels.hide : panelLabels.show}</span>
                <span style={{ background: 'rgba(0,168,181,0.20)', padding: '1px 6px', color: '#00a8b5' }}>{capturedCount}/6</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(244,239,230,0.50)" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body: chat column + (optional) qualification panel */}
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* Chat column */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <div ref={scrollRef} style={{ flex: 1, minHeight: '320px', overflowY: 'auto', padding: '1.5rem', background: '#0a1518', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="custom-scrollbar">
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
                        {[0, -0.15, -0.30].map((delay, idx) => (
                          <div key={idx} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00a8b5', animation: `pulse 1s ease infinite ${delay}s` }} />
                        ))}
                      </div>
                      <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '10px', fontWeight: 500, color: 'rgba(244,239,230,0.50)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                        {lang === 'en' ? 'Attending' : lang === 'pt' ? 'Atendendo' : 'Atendiendo'}
                      </span>
                    </div>
                  </div>
                )}
                {notified && (
                  <div style={{ padding: '0.625rem 1rem', background: 'rgba(184,150,62,0.10)', border: '1px solid rgba(184,150,62,0.30)', textAlign: 'center' }}>
                    <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '10px', fontWeight: 500, color: 'rgba(184,150,62,0.85)', letterSpacing: '0.20em', textTransform: 'uppercase' }}>
                      {notifiedLang === 'en' ? 'Our concierge team has been notified' : notifiedLang === 'pt' ? 'Nossa equipe concierge foi notificada' : 'Nuestro equipo concierge ha sido notificado'}
                    </p>
                  </div>
                )}
              </div>
              {messages.length === 0 && suggestionList.length > 0 && (
                <div style={{ padding: '0.75rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', background: '#0a1518', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  {suggestionList.map((s: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleSendText(s)}
                      style={{ fontFamily: '"Inter", sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.20em', textTransform: 'uppercase', padding: '0.5rem 0.875rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(244,239,230,0.40)', cursor: 'pointer', transition: 'all 0.3s ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,168,181,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,168,181,0.30)'; e.currentTarget.style.color = '#00a8b5'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(244,239,230,0.40)'; }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {turnsUsed > 0 && turnsUsed < 25 && (
                <div style={{ padding: '0.375rem 1.5rem', textAlign: 'center', background: '#0a1518', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '8px', fontWeight: 500, color: 'rgba(244,239,230,0.25)', letterSpacing: '0.20em', textTransform: 'uppercase' }}>{turnsUsed}/25</span>
                </div>
              )}
              <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(10,21,24,0.80)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                  placeholder={t('assistant.placeholder') || 'Escriba su mensaje...'}
                  disabled={isLoading || turnsUsed >= 25}
                  style={{ flex: 1, padding: '0.875rem 1.25rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0px', color: 'rgba(244,239,230,0.90)', fontFamily: '"Inter", sans-serif', fontWeight: 300, fontSize: '13px', outline: 'none', transition: 'border-color 0.3s ease' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,168,181,0.40)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                />
                <button
                  onClick={() => handleSendText()}
                  disabled={isLoading || !input.trim() || turnsUsed >= 25}
                  style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '0px', background: '#00a8b5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isLoading || !input.trim() || turnsUsed >= 25 ? 0.4 : 1, transition: 'opacity 0.2s ease, transform 0.2s ease', boxShadow: '0 4px 16px rgba(0,168,181,0.25)' }}
                  onMouseEnter={(e) => { if (!isLoading && input.trim() && turnsUsed < 25) e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                </button>
              </div>
            </div>

            {/* Qualification panel (right column) */}
            {showPanel && (
              <div
                style={{
                  width: '20rem',
                  minWidth: '20rem',
                  borderLeft: '1px solid rgba(184,150,62,0.18)',
                  background: 'linear-gradient(180deg, rgba(26,46,53,0.30) 0%, rgba(10,21,24,0.40) 100%)',
                  padding: '1.5rem 1.25rem',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
                className="custom-scrollbar klo-qual-panel"
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '4px', height: '14px', background: '#B8963E' }} />
                    <h5 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '14px', fontWeight: 400, color: 'rgba(244,239,230,0.92)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{panelLabels.title}</h5>
                  </div>
                  <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '10px', color: 'rgba(244,239,230,0.45)', lineHeight: 1.6, letterSpacing: '0.01em' }}>{panelLabels.subtitle}</p>
                </div>

                {/* Tier badge */}
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    background: tier.key === 'platinum' ? 'linear-gradient(135deg, rgba(184,150,62,0.18) 0%, rgba(0,168,181,0.10) 100%)'
                      : tier.key === 'gold' ? 'linear-gradient(135deg, rgba(184,150,62,0.18) 0%, rgba(184,150,62,0.04) 100%)'
                      : 'rgba(255,255,255,0.03)',
                    border: tier.key === 'platinum' ? '1px solid rgba(0,168,181,0.30)' : tier.key === 'gold' ? '1px solid rgba(184,150,62,0.30)' : '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '8px', fontWeight: 500, color: 'rgba(244,239,230,0.40)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '4px' }}>{panelLabels.fields.tier}</p>
                    <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '18px', fontWeight: 500, color: tier.key === 'platinum' ? '#00a8b5' : tier.key === 'gold' ? '#B8963E' : 'rgba(244,239,230,0.60)', letterSpacing: '0.02em' }}>{tier.label}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '8px', color: 'rgba(244,239,230,0.30)', letterSpacing: '0.20em', textTransform: 'uppercase', marginBottom: '2px' }}>{tier.threshold}</p>
                    <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '9px', color: 'rgba(244,239,230,0.50)' }}>{capturedCount}/6 {panelLabels.captured.toLowerCase()}</p>
                  </div>
                </div>

                {/* Field rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <QualRow
                    label={panelLabels.fields.name}
                    value={qualification.fullName}
                    fallback={panelLabels.awaiting}
                    captured={!!qualification.fullName}
                    capturedLabel={panelLabels.captured}
                    pendingLabel={panelLabels.pending}
                  />
                  <QualRow
                    label={panelLabels.fields.contact}
                    value={qualification.email || qualification.phone}
                    fallback={panelLabels.awaiting}
                    captured={!!(qualification.email || qualification.phone)}
                    capturedLabel={panelLabels.captured}
                    pendingLabel={panelLabels.pending}
                  />
                  <QualRow
                    label={panelLabels.fields.services}
                    value={qualification.servicesNeeded.length > 0 ? qualification.servicesNeeded.join(', ') : null}
                    fallback={panelLabels.awaiting}
                    captured={qualification.servicesNeeded.length > 0}
                    capturedLabel={panelLabels.captured}
                    pendingLabel={panelLabels.pending}
                  />
                  <QualRow
                    label={panelLabels.fields.dates}
                    value={
                      qualification.travelDates
                        ? `${qualification.travelDates}${qualification.passengers ? ` (${qualification.passengers} pax)` : ''}`
                        : qualification.passengers
                          ? `${qualification.passengers} pax`
                          : null
                    }
                    fallback={panelLabels.awaiting}
                    captured={!!(qualification.travelDates || qualification.passengers)}
                    capturedLabel={panelLabels.captured}
                    pendingLabel={panelLabels.pending}
                  />
                  <QualRow
                    label={panelLabels.fields.budget}
                    value={qualification.budget ? `$${qualification.budget.toLocaleString()}` : null}
                    fallback={panelLabels.awaiting}
                    captured={!!qualification.budget}
                    capturedLabel={panelLabels.captured}
                    pendingLabel={panelLabels.pending}
                    highlight
                  />
                </div>

                {/* Language detected */}
                {qualification.preferredLanguage && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '8px', fontWeight: 500, color: 'rgba(244,239,230,0.35)', letterSpacing: '0.20em', textTransform: 'uppercase' }}>{panelLabels.lang}</span>
                    <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '10px', fontWeight: 600, color: '#00a8b5', letterSpacing: '0.10em' }}>{qualification.preferredLanguage}</span>
                  </div>
                )}

                {/* Bottom status banner */}
                {qualification.qualified ? (
                  <div style={{ padding: '0.75rem 1rem', background: 'linear-gradient(135deg, rgba(184,150,62,0.15) 0%, rgba(0,168,181,0.08) 100%)', border: '1px solid rgba(184,150,62,0.30)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '8px', height: '8px', background: '#B8963E', borderRadius: '50%', boxShadow: '0 0 8px rgba(184,150,62,0.6)' }} />
                    <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '9px', fontWeight: 600, color: '#B8963E', letterSpacing: '0.10em', textTransform: 'uppercase', lineHeight: 1.4 }}>{panelLabels.ready}</p>
                  </div>
                ) : (
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '8px', height: '8px', background: 'rgba(244,239,230,0.20)', borderRadius: '50%' }} />
                    <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '9px', fontWeight: 500, color: 'rgba(244,239,230,0.40)', letterSpacing: '0.10em', textTransform: 'uppercase', lineHeight: 1.4 }}>{panelLabels.scoring}</p>
                  </div>
                )}
              </div>
            )}
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
        @media (max-width: 768px) {
          .klo-qual-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
};

// Small sub-component for one qualification row
const QualRow: React.FC<{
  label: string;
  value: string | null;
  fallback: string;
  captured: boolean;
  capturedLabel: string;
  pendingLabel: string;
  highlight?: boolean;
}> = ({ label, value, fallback, captured, capturedLabel, pendingLabel, highlight }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', paddingBottom: '0.625rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
    <div style={{ minWidth: 0, flex: 1 }}>
      <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '8px', fontWeight: 500, color: 'rgba(244,239,230,0.40)', letterSpacing: '0.20em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontFamily: highlight ? '"Inter", monospace' : '"Cormorant Garamond", Georgia, serif', fontSize: highlight ? '12px' : '13px', fontWeight: highlight ? 500 : 400, color: value ? (highlight ? '#B8963E' : 'rgba(244,239,230,0.92)') : 'rgba(244,239,230,0.30)', fontStyle: value ? 'normal' : 'italic', letterSpacing: '0.01em', wordBreak: 'break-word' }}>
        {value || fallback}
      </p>
    </div>
    {captured ? (
      <span style={{ flexShrink: 0, fontFamily: '"Inter", sans-serif', fontSize: '8px', fontWeight: 600, color: '#00a8b5', background: 'rgba(0,168,181,0.10)', border: '1px solid rgba(0,168,181,0.30)', padding: '2px 6px', letterSpacing: '0.20em', textTransform: 'uppercase' }}>{capturedLabel}</span>
    ) : (
      <span style={{ flexShrink: 0, fontFamily: '"Inter", sans-serif', fontSize: '8px', fontWeight: 500, color: 'rgba(244,239,230,0.30)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '2px 6px', letterSpacing: '0.20em', textTransform: 'uppercase' }}>{pendingLabel}</span>
    )}
  </div>
);

export default AIAssistant;
