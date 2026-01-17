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

// Helper functions for Live API as per requirements
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ t, lang }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs for Live Audio logic
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Refs for real-time transcription
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isLiveActive]);

  const stopLiveSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    setIsLiveActive(false);
    setIsLoading(false);
  }, []);

  const startLiveSession = async () => {
    if (isLiveActive) {
      stopLiveSession();
      return;
    }

    setIsLoading(true);
    setIsLiveActive(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Initialize Audio Contexts
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
            console.debug('Live Session Opened');
            setIsLoading(false);
            
            // Stream audio from mic
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcriptions
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

            // Handle Audio Data
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

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(s => s.stop());
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Live session error:', e);
            stopLiveSession();
          },
          onclose: () => {
            console.debug('Live session closed');
            stopLiveSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
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

  const updateLastMessage = (role: 'user' | 'model', text: string) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && last.isLive) {
        return [...prev.slice(0, -1), { ...last, text }];
      }
      return [...prev, { role, text, isLive: true }];
    });
  };

  const getUserLocation = (): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { timeout: 5000 }
      );
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
        contents: [...messages, userMessage].map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: `You are María Fernanda, the exclusive AI Concierge for KLO. Respond in ${lang}. 
          You have access to Google Maps grounding to provide real-time recommendations for luxury travel, restaurants, and hidden gems in Colombia. 
          When providing locations, always include why they are special for an ultra-luxury traveler.`,
          tools: [{ googleMaps: {} }],
          ...(location && {
            toolConfig: {
              retrievalConfig: {
                latLng: {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude
                }
              }
            }
          })
        }
      });

      const groundingSources: GroundingSource[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.maps) {
            groundingSources.push({
              title: chunk.maps.title,
              url: chunk.maps.uri,
              snippet: chunk.maps.placeAnswerSources?.[0]?.reviewSnippets?.[0]?.text
            });
          }
        });
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: response.text || "...",
        sources: groundingSources
      }]);
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
      {isOpen && (
        <div className="bg-white rounded-3xl shadow-2xl w-80 md:w-[28rem] mb-6 border border-slate-100 overflow-hidden flex flex-col animate-scale-in">
          {/* Header */}
          <div className="bg-[#1a2e35] p-6 text-white flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-luxury-teal/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="flex items-center space-x-4 relative z-10">
              <div className="relative">
                <div className={`w-14 h-14 rounded-2xl bg-luxury-teal flex items-center justify-center font-bold text-lg shadow-inner overflow-hidden border-2 transition-all duration-500 ${isLiveActive ? 'border-luxury-teal scale-110' : 'border-white/20'}`}>
                   <img src="https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150" alt="MF" className="w-full h-full object-cover" />
                </div>
                {isLiveActive ? (
                   <div className="absolute -bottom-1 -right-1 flex space-x-0.5 items-center bg-red-500 px-1.5 py-0.5 rounded-full border-2 border-[#1a2e35] animate-pulse">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      <span className="text-[7px] font-black uppercase tracking-tighter">LIVE</span>
                   </div>
                ) : (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#1a2e35]"></div>
                )}
              </div>
              <div>
                <h4 className="font-bold leading-tight text-lg serif">{t('assistant.name')}</h4>
                <p className="text-[9px] opacity-60 uppercase tracking-[0.2em] font-black">{isLiveActive ? 'Conversación en Tiempo Real' : t('assistant.role')}</p>
              </div>
            </div>
            <button onClick={() => { setIsOpen(false); if(isLiveActive) stopLiveSession(); }} className="text-white/40 hover:text-white transition-colors p-2 bg-white/5 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Chat area */}
          <div ref={scrollRef} className="p-8 h-[28rem] overflow-y-auto bg-slate-50 text-sm text-slate-700 space-y-8 scroll-smooth">
            {messages.length === 0 && (
              <div className="bg-white p-6 rounded-3xl rounded-tl-none shadow-sm border border-slate-100 max-w-[85%] animate-fade-in-up">
                <p className="font-light leading-relaxed">{t('assistant.greeting')}</p>
              </div>
            )}
            
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-5 rounded-3xl shadow-sm border border-slate-100 max-w-[90%] transition-all ${
                  m.role === 'user' ? 'bg-luxury-teal text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none'
                }`}>
                  <p className="font-light leading-relaxed whitespace-pre-wrap">{m.text || "..."}</p>
                  
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">Map Connections</p>
                      {m.sources.map((src, si) => (
                        <a 
                          key={si} 
                          href={src.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block bg-slate-50 p-3 rounded-xl border border-slate-200 hover:border-luxury-teal transition-all group/source"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-900 text-xs">{src.title}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-luxury-teal opacity-0 group-hover/source:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                          {src.snippet && <p className="text-[10px] text-slate-500 line-clamp-2 italic">"{src.snippet}"</p>}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLiveActive && !messages[messages.length-1]?.text && (
              <div className="flex justify-center py-4">
                <div className="flex items-center space-x-2 bg-luxury-teal/10 px-4 py-2 rounded-full border border-luxury-teal/20">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-3 bg-luxury-teal rounded-full animate-[voice-wave_0.5s_ease-in-out_infinite]"></div>
                    <div className="w-1.5 h-4 bg-luxury-teal rounded-full animate-[voice-wave_0.7s_ease-in-out_infinite_0.1s]"></div>
                    <div className="w-1.5 h-2 bg-luxury-teal rounded-full animate-[voice-wave_0.6s_ease-in-out_infinite_0.2s]"></div>
                  </div>
                  <span className="text-[10px] text-luxury-teal font-black uppercase tracking-widest">Escuchando...</span>
                </div>
              </div>
            )}

            {isLoading && !isLiveActive && (
              <div className="flex justify-start">
                <div className="bg-white p-5 rounded-3xl rounded-tl-none shadow-sm border border-slate-100 flex space-x-1.5">
                  <div className="w-2 h-2 bg-luxury-teal rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-luxury-teal rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-luxury-teal rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-slate-100 bg-white">
            {messages.length === 0 && !isLiveActive && (
              <div className="mb-6 flex flex-wrap gap-2">
                {suggestionList.map((s: string, i: number) => (
                  <button 
                    key={i} 
                    onClick={() => handleSendText(s)}
                    className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-full text-[10px] font-bold text-slate-500 hover:border-luxury-teal hover:text-luxury-teal transition-all uppercase tracking-widest"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="flex space-x-3 items-center">
              <button 
                onClick={startLiveSession}
                className={`p-4 rounded-2xl transition-all duration-500 shadow-lg active:scale-90 flex-shrink-0 ${isLiveActive ? 'bg-red-500 text-white shadow-red-200 ring-4 ring-red-50' : 'bg-slate-100 text-slate-400 hover:bg-luxury-teal hover:text-white hover:shadow-luxury-teal/20'}`}
                title={isLiveActive ? "Stop Live Session" : "Start Live Voice Chat"}
              >
                {isLiveActive ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
              
              <div className="flex-grow relative group">
                <input 
                  type="text" 
                  value={input}
                  disabled={isLiveActive}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                  placeholder={isLiveActive ? "Habla con María Fernanda..." : t('assistant.placeholder')} 
                  className="w-full bg-slate-100 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-luxury-teal outline-none transition-all placeholder:text-slate-400 disabled:opacity-50"
                />
              </div>

              {!isLiveActive && (
                <button 
                  onClick={() => handleSendText()}
                  disabled={isLoading || !input.trim()}
                  className="bg-luxury-teal text-white p-4 rounded-2xl hover:brightness-110 shadow-lg shadow-luxury-teal/20 active:scale-90 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="group bg-[#1a2e35] text-white w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-[0_20px_60px_-15px_rgba(26,46,53,0.5)] hover:scale-110 hover:-rotate-6 transition-all duration-500 active:scale-95 relative border-4 border-white/10"
      >
        <div className="absolute -top-1 -right-1 bg-luxury-teal w-6 h-6 rounded-full animate-pulse border-4 border-white"></div>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 group-hover:rotate-12 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      <style>{`
        @keyframes voice-wave {
          0%, 100% { transform: scaleY(1); opacity: 0.5; }
          50% { transform: scaleY(2); opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default AIAssistant;
