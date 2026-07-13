/**
 * AIAssistant — KLO Investor Portal
 * Restyled to match the KLO dark luxury design system.
 * Glassmorphism, teal accents, Cormorant Garamond, gold highlights.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { Language } from '../types';

interface GroundingSource {
  title?: string;
  url?: string;
  snippet?: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  isLive?: boolean;
  sources?: GroundingSource[];
}

interface AIAssistantProps {
  t: (key: string) => any;
  lang: Language;
}

// ── Audio helpers (unchanged) ──────────────────────────────────────
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

// ── Component ─────────────────────────────────────────────────────
const AIAssistant: React.FC<AIAssistantProps> = ({ t, lang }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading, isLiveActive]);

  const stopLiveSession = useCallback(() => {
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    if (inputAudioContextRef.current) { inputAudioContextRef.current.close(); inputAudioContextRef.current = null; }
    if (outputAudioContextRef.current) { outputAudioContextRef.current.close(); outputAudioContextRef.current = null; }
    audioSourcesRef.current.forEach(s => s.stop());
    audioSourcesRef.current.clear();
    setIsLiveActive(false);
    setIsLoading(false);
  }, []);

  const startLiveSession = async () => {
    if (isLiveActive) { stopLiveSession(); return; }
    setIsLoading(true);
    setIsLiveActive(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      nextStartTimeRef.current = 0;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsLoading(false);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(session => { session.sendRealtimeInput({ media: pcmBlob }); });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
              updateLastMessage('model', currentOutputTranscriptionRef.current);
            } else if (message.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
              updateLastMessage('user', currentInputTranscriptionRef.current);
            }
            if (message.serverContent?.turnComplete) {
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
            }
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }
            if (message.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(s => s.stop());
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => { console.error('Live session error:', e); stopLiveSession(); },
          onclose: () => { stopLiveSession(); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: `You are María Fernanda, the exclusive AI Concierge for Karibbean Luxury Operators (KLO).
          Respond with elegance, warmth, and precision. You are in a real-time voice conversation in ${lang}.
          Always stay in character. Keep responses concise for natural conversation.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start live session:", err);
      setIsLoading(false);
      setIsLiveActive(false);
    }
  };

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const updateLastMessage = (role: 'user' | 'model', text: string) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && last.isLive) return [...prev.slice(0, -1), { ...last, text }];
      return [...prev, { role, text, isLive: true }];
    });
  };

  const getUserLocation = (): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition((pos) => resolve(pos), () => resolve(null), { timeout: 5000 });
    });
  };

  const handleSendText = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || isLoading) return;
    const userMessage: Message = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const location = await getUserLocation();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [...messages, userMessage].map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
        config: {
          systemInstruction: `You are María Fernanda, the exclusive AI Concierge for KLO. Respond in ${lang}.
          You have access to Google Maps grounding to provide real-time recommendations for luxury travel, restaurants, and hidden gems in Colombia.
          When providing locations, always include why they are special for an ultra-luxury traveler.`,
          tools: [{ googleMaps: {} }],
          ...(location && { toolConfig: { retrievalConfig: { latLng: { latitude: location.coords.latitude, longitude: location.coords.longitude } } } })
        }
      });
      const groundingSources: GroundingSource[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) chunks.forEach((chunk: any) => {
        if (chunk.maps) groundingSources.push({ title: chunk.maps.title, url: chunk.maps.uri, snippet: chunk.maps.placeAnswerSources?.[0]?.reviewSnippets?.[0]?.text });
      });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "...", sources: groundingSources }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: "Lo siento, tuve un problema conectando con mis servicios de mapas. ¿Podrías intentar de nuevo?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestionList = t('assistant.suggestions') || [];

  return (
    <div className="fixed bottom-8 right-8 z-50">

      {/* ── Floating Trigger Button ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open Maria — KLO AI Concierge"
          className="group relative flex items-center justify-center cursor-pointer"
          style={{
            width: '64px', height: '64px',
            background: '#B8963E',
            border: 'none',
            borderRadius: '0px',
            boxShadow: '0 8px 32px rgba(184,150,62,0.40)',
            transition: 'box-shadow 0.4s ease, transform 0.3s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 16px 48px rgba(184,150,62,0.60)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(184,150,62,0.40)';
          }}
        >
          {/* Online dot */}
          <div
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a1518] z-10"
            style={{ background: '#00a8b5' }}
          />
          {/* Pulse ring */}
          <div
            className="absolute inset-0 animate-ping opacity-30"
            style={{ background: 'rgba(184,150,62,0.15)', animationDuration: '2s' }}
          />
          {/* Chat icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform duration-500">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      )}

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div
          className="w-80 md:w-[28rem] mb-6 overflow-hidden flex flex-col"
          style={{
            borderRadius: '0px',
            border: '1px solid rgba(184,150,62,0.18)',
            background: '#0a1518',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.80), 0 0 60px rgba(0,168,181,0.04)',
            animation: 'klo-slide-up 0.38s cubic-bezier(0.16,1,0.3,1) forwards',
          }}
        >
          {/* Top gold hairline */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(184,150,62,0.35) 50%, transparent 100%)' }} />

          {/* Teal glow */}
          <div style={{ position: 'absolute', top: 0, right: 0, width: '160px', height: '160px', background: 'radial-gradient(circle, rgba(0,168,181,0.08) 0%, transparent 70%)', filter: 'blur(8px)', pointerEvents: 'none' }} />

          {/* ── Header ── */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              background: 'rgba(26,46,53,0.60)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(0,168,181,0.10)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Avatar */}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: '44px', height: '44px',
                    borderRadius: '0px',
                    overflow: 'hidden',
                    border: isLiveActive ? '2px solid #00a8b5' : '2px solid rgba(184,150,62,0.30)',
                    transition: 'border-color 0.5s ease',
                  }}
                >
                  <img
                    src="https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150"
                    alt="María Fernanda"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                {/* Live / Online indicator */}
                {isLiveActive ? (
                  <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', display: 'flex', alignItems: 'center', gap: '3px', background: '#ef4444', padding: '2px 5px', borderRadius: '20px', border: '2px solid #0a1518' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'white', animation: 'pulse 1s infinite' }} />
                    <span style={{ fontSize: '7px', fontWeight: 900, color: 'white', letterSpacing: '0.05em' }}>LIVE</span>
                  </div>
                ) : (
                  <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '10px', height: '10px', borderRadius: '50%', background: '#00a8b5', border: '2px solid #0a1518' }} />
                )}
              </div>

              {/* Name + role */}
              <div>
                <h4 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 300, fontSize: '17px', color: 'rgba(244,239,230,0.95)', letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: '2px' }}>
                  María Fernanda
                </h4>
                <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '8px', fontWeight: 500, color: isLiveActive ? '#00a8b5' : 'rgba(244,239,230,0.30)', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
                  {isLiveActive ? 'En Tiempo Real' : t('assistant.role')}
                </p>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => { setIsOpen(false); if (isLiveActive) stopLiveSession(); }}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s ease' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(244,239,230,0.50)" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* ── Messages Area ── */}
          <div
            ref={scrollRef}
            style={{
              flex: 1, minHeight: '320px', maxHeight: '380px',
              overflowY: 'auto', padding: '1.5rem',
              background: '#0a1518',
              display: 'flex', flexDirection: 'column', gap: '1.5rem',
            }}
            className="custom-scrollbar"
          >
            {/* Initial greeting */}
            {messages.length === 0 && (
              <div style={{ padding: '1.25rem', background: 'rgba(26,46,53,0.50)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,168,181,0.10)', borderRadius: '0px', maxWidth: '85%', animation: 'klo-fade-in 0.6s ease forwards' }}>
                <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 300, fontSize: '13px', lineHeight: 1.7, color: 'rgba(244,239,230,0.75)' }}>
                  {t('assistant.greeting')}
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    padding: '0.875rem 1.125rem',
                    maxWidth: '88%',
                    borderRadius: '0px',
                    background: m.role === 'user'
                      ? 'rgba(0,168,181,0.12)'
                      : 'rgba(26,46,53,0.60)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: m.role === 'user'
                      ? '1px solid rgba(0,168,181,0.20)'
                      : '1px solid rgba(255,255,255,0.05)',
                    color: m.role === 'user' ? 'rgba(244,239,230,0.95)' : 'rgba(244,239,230,0.80)',
                  }}
                >
                  <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 300, fontSize: '13px', lineHeight: 1.7, letterSpacing: '0.01em', whiteSpace: 'pre-wrap' }}>
                    {m.text || "..."}
                  </p>

                  {/* Grounding sources */}
                  {m.sources && m.sources.length > 0 && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '8px', fontWeight: 700, color: 'rgba(184,150,62,0.60)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        Conexiones de Mapa
                      </p>
                      {m.sources.map((src, si) => (
                        <a
                          key={si}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'block', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,168,181,0.15)', marginBottom: '0.375rem', textDecoration: 'none', transition: 'border-color 0.2s ease' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(0,168,181,0.40)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(0,168,181,0.15)'; }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{ fontFamily: '"Inter", sans-serif', fontWeight: 600, fontSize: '11px', color: 'rgba(244,239,230,0.90)' }}>{src.title}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00a8b5" strokeWidth="2" strokeLinecap="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                            </svg>
                          </div>
                          {src.snippet && (
                            <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '10px', color: 'rgba(244,239,230,0.35)', fontStyle: 'italic', lineHeight: 1.4 }}>"{src.snippet}"</p>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Live listening indicator */}
            {isLiveActive && (!messages[messages.length - 1]?.text) && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,168,181,0.10)', padding: '0.5rem 1rem', border: '1px solid rgba(0,168,181,0.20)', borderRadius: '0px' }}>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    {[0.5, 0.7, 0.6].map((delay, idx) => (
                      <div key={idx} style={{ width: '4px', height: `${8 + idx * 3}px`, background: '#00a8b5', borderRadius: '2px', animation: `voice-wave 0.6s ease-in-out infinite ${delay}s` }} />
                    ))}
                  </div>
                  <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '9px', fontWeight: 700, color: '#00a8b5', letterSpacing: '0.20em', textTransform: 'uppercase' }}>Escuchando...</span>
                </div>
              </div>
            )}

            {/* Loading dots */}
            {isLoading && !isLiveActive && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center', background: 'rgba(26,46,53,0.60)', padding: '0.75rem 1rem', border: '1px solid rgba(0,168,181,0.15)' }}>
                  {[0, -0.15, -0.30].map((delay, idx) => (
                    <div key={idx} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00a8b5', animation: `pulse 1s ease infinite ${delay}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Suggestions ── */}
          {messages.length === 0 && !isLiveActive && suggestionList.length > 0 && (
            <div style={{ padding: '0.75rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', background: '#0a1518', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              {suggestionList.map((s: string, i: number) => (
                <button
                  key={i}
                  onClick={() => handleSendText(s)}
                  style={{
                    fontFamily: '"Inter", sans-serif', fontSize: '9px', fontWeight: 600,
                    letterSpacing: '0.20em', textTransform: 'uppercase',
                    padding: '0.5rem 0.875rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(244,239,230,0.40)',
                    cursor: 'pointer', transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,168,181,0.08)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,168,181,0.30)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#00a8b5';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(244,239,230,0.40)';
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* ── Input Area ── */}
          <div style={{
            padding: '1.25rem 1.5rem',
            background: 'rgba(10,21,24,0.80)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', gap: '0.75rem', alignItems: 'center',
          }}>
            {/* Mic button */}
            <button
              onClick={startLiveSession}
              style={{
                width: '44px', height: '44px', flexShrink: 0, borderRadius: '0px',
                background: isLiveActive ? '#ef4444' : 'rgba(255,255,255,0.05)',
                border: isLiveActive ? 'none' : '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.4s ease',
                boxShadow: isLiveActive ? '0 0 0 4px rgba(239,68,68,0.15)' : 'none',
              }}
            >
              {isLiveActive ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(244,239,230,0.40)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                </svg>
              )}
            </button>

            {/* Text input */}
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={input}
                disabled={isLiveActive}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendText()}
                placeholder={isLiveActive ? "Habla con María Fernanda..." : t('assistant.placeholder')}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.25rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '0px',
                  color: 'rgba(244,239,230,0.90)',
                  fontFamily: '"Inter", sans-serif',
                  fontWeight: 300,
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                }}
                onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(0,168,181,0.40)'; }}
                onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
              />
            </div>

            {/* Send button */}
            {!isLiveActive && (
              <button
                onClick={() => handleSendText()}
                disabled={isLoading || !input.trim()}
                style={{
                  width: '44px', height: '44px', flexShrink: 0, borderRadius: '0px',
                  background: '#00a8b5',
                  border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: (isLoading || !input.trim()) ? 0.4 : 1,
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                  boxShadow: '0 4px 16px rgba(0,168,181,0.25)',
                }}
                onMouseEnter={e => { if (!isLoading && input.trim()) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Styles ── */}
      <style>{`
        @keyframes klo-slide-up {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes klo-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes voice-wave {
          0%, 100% { transform: scaleY(0.6); opacity: 0.4; }
          50%       { transform: scaleY(1.4); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(0,168,181,0.4) transparent;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,168,181,0.4); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,168,181,0.7); }
      `}</style>
    </div>
  );
};

export default AIAssistant;
