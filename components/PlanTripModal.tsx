import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Loader2, Check, AlertCircle, Calendar, MapPin, User, Phone, Mail, MessageSquare, DollarSign } from 'lucide-react';

// Local Language alias - see SupplierPortal.tsx for rationale
type Language = 'EN' | 'ES' | 'PT';

interface PlanTripModalProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
}

// v1.8.0 Step 3: trilingual "Plan Your Trip" form.
// Posts to /api/leads (already wired in server.ts).
// Required fields: name, email. Everything else is optional but boosts match quality.
const T_TRIP: Record<string, { EN: string; ES: string; PT: string }> = {
  eyebrow:          { EN: 'Begin Your Journey', ES: 'Inicia Tu Viaje', PT: 'Comece Sua Jornada' },
  title:            { EN: 'Plan Your Trip', ES: 'Planifica Tu Viaje', PT: 'Planeje Sua Viagem' },
  subtitle:         { EN: 'A KLO concierge will reply within 24 hours with a curated proposal.',
                      ES: 'Un conserje de KLO te responderá en 24 horas con una propuesta curada.',
                      PT: 'Um concierge da KLO responderá em 24 horas com uma proposta curada.' },
  name:             { EN: 'Full Name', ES: 'Nombre Completo', PT: 'Nome Completo' },
  email:            { EN: 'Email', ES: 'Email', PT: 'Email' },
  phone:            { EN: 'Phone / WhatsApp', ES: 'Teléfono / WhatsApp', PT: 'Telefone / WhatsApp' },
  experience_type:  { EN: 'Experience Type', ES: 'Tipo de Experiencia', PT: 'Tipo de Experiência' },
  experience_ph:    { EN: 'e.g. Private jet, yacht week, wellness retreat...',
                      ES: 'ej. Jet privado, semana en yate, retiro de bienestar...',
                      PT: 'ex. Jato particular, semana de iate, retiro de bem-estar...' },
  travel_dates:     { EN: 'Travel Dates', ES: 'Fechas de Viaje', PT: 'Datas da Viagem' },
  travel_dates_ph:  { EN: 'e.g. Dec 20-27, 2026', ES: 'ej. 20-27 dic, 2026', PT: 'ex. 20-27 dez, 2026' },
  location:         { EN: 'Destination / Region', ES: 'Destino / Región', PT: 'Destino / Região' },
  location_ph:      { EN: 'e.g. Cartagena, San Andrés, Medellín...',
                      ES: 'ej. Cartagena, San Andrés, Medellín...',
                      PT: 'ex. Cartagena, San Andrés, Medellín...' },
  budget:           { EN: 'Budget (USD)', ES: 'Presupuesto (USD)', PT: 'Orçamento (USD)' },
  message:          { EN: 'Tell us more', ES: 'Cuéntanos más', PT: 'Conte-nos mais' },
  message_ph:       { EN: 'Any preferences, dietary needs, occasion, special requests...',
                      ES: 'Cualquier preferencia, necesidades dietéticas, ocasión, solicitudes especiales...',
                      PT: 'Quaisquer preferências, necessidades dietéticas, ocasião, pedidos especiais...' },
  submit:           { EN: 'Send Inquiry', ES: 'Enviar Consulta', PT: 'Enviar Consulta' },
  sending:          { EN: 'Sending...', ES: 'Enviando...', PT: 'Enviando...' },
  cancel:           { EN: 'Cancel', ES: 'Cancelar', PT: 'Cancelar' },
  success_title:    { EN: 'Inquiry Received', ES: 'Consulta Recibida', PT: 'Consulta Recebida' },
  success_body:     { EN: 'A KLO concierge will reach out within 24 hours. We have logged your request and will contact you via the email or WhatsApp you provided.',
                      ES: 'Un conserje de KLO te contactará en 24 horas. Hemos registrado tu solicitud y te contactaremos por el email o WhatsApp proporcionado.',
                      PT: 'Um concierge da KLO entrará em contato em 24 horas. Registramos seu pedido e entraremos em contato pelo email ou WhatsApp fornecido.' },
  success_close:    { EN: 'Close', ES: 'Cerrar', PT: 'Fechar' },
  err_required:     { EN: 'Name and email are required.', ES: 'Nombre y email son obligatorios.', PT: 'Nome e email são obrigatórios.' },
  err_failed:       { EN: 'Failed to send. Please try again or email hola@karibbeanluxuryoperators.lat directly.',
                      ES: 'Error al enviar. Inténtalo de nuevo o escribe a hola@karibbeanluxuryoperators.lat directamente.',
                      PT: 'Falha ao enviar. Tente novamente ou escreva para hola@karibbeanluxuryoperators.lat diretamente.' },
  required:         { EN: 'Required', ES: 'Obligatorio', PT: 'Obrigatório' },
  optional:         { EN: 'Optional', ES: 'Opcional', PT: 'Opcional' },
};

const t = (key: keyof typeof T_TRIP, lang: Language): string => {
  const entry = T_TRIP[key];
  return (entry && (entry[lang] || entry.EN)) || '';
};

export const PlanTripModal: React.FC<PlanTripModalProps> = ({ open, onClose, lang }) => {
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    experience_type: '', travel_dates: '', location: '',
    budget: '', message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.email) {
      setError(t('err_required', lang));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          whatsapp: form.phone || null,
          experience_type: form.experience_type || null,
          travel_dates: form.travel_dates || null,
          budget: form.budget ? parseFloat(form.budget) : null,
          message: form.message || null,
          source: 'plan_your_trip_modal',
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      setSuccess(true);
    } catch (e: any) {
      console.error('Plan trip submit failed', e);
      setError(t('err_failed', lang));
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    if (submitting) return;
    setSuccess(false);
    setError(null);
    setForm({ name: '', email: '', phone: '', experience_type: '', travel_dates: '', location: '', budget: '', message: '' });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl max-h-[90vh] bg-[#0a1518] border border-[#B8963E]/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/10 flex justify-between items-center bg-gradient-to-br from-[#0a1518] to-black">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px w-6 bg-[#B8963E]"></div>
                  <p className="text-[#B8963E] text-[10px] font-bold uppercase tracking-[0.4em]">
                    {t('eyebrow', lang)}
                  </p>
                </div>
                <h2 className="text-3xl font-serif text-white">{t('title', lang)}</h2>
                <p className="text-white/50 text-sm mt-1">{t('subtitle', lang)}</p>
              </div>
              <button onClick={close} disabled={submitting} className="p-2 hover:bg-white/5 rounded-full transition-colors disabled:opacity-50 shrink-0">
                <X size={22} className="text-white/50" />
              </button>
            </div>

            {/* Body */}
            {success ? (
              <div className="p-12 text-center flex-1 overflow-y-auto">
                <div className="w-16 h-16 bg-[#B8963E]/15 text-[#B8963E] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check size={32} />
                </div>
                <h3 className="text-2xl font-serif text-white mb-4">{t('success_title', lang)}</h3>
                <p className="text-white/60 leading-relaxed max-w-md mx-auto mb-8">{t('success_body', lang)}</p>
                <button
                  onClick={close}
                  className="px-8 py-3 bg-[#B8963E] text-white rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white hover:text-slate-900 transition-all"
                >
                  {t('success_close', lang)}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1">
                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                      <User size={12} /> {t('name', lang)} <span className="text-[#B8963E]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#B8963E]/60 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                      <Mail size={12} /> {t('email', lang)} <span className="text-[#B8963E]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#B8963E]/60 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                    <Phone size={12} /> {t('phone', lang)}
                    <span className="text-white/30 normal-case font-normal text-[9px]">({t('optional', lang)})</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#B8963E]/60 transition-all"
                    placeholder="+57 ..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                    <MessageSquare size={12} /> {t('experience_type', lang)}
                    <span className="text-white/30 normal-case font-normal text-[9px]">({t('optional', lang)})</span>
                  </label>
                  <input
                    type="text"
                    value={form.experience_type}
                    onChange={e => setForm({ ...form, experience_type: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#B8963E]/60 transition-all"
                    placeholder={t('experience_ph', lang)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                      <Calendar size={12} /> {t('travel_dates', lang)}
                    </label>
                    <input
                      type="text"
                      value={form.travel_dates}
                      onChange={e => setForm({ ...form, travel_dates: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#B8963E]/60 transition-all"
                      placeholder={t('travel_dates_ph', lang)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                      <MapPin size={12} /> {t('location', lang)}
                    </label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={e => setForm({ ...form, location: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#B8963E]/60 transition-all"
                      placeholder={t('location_ph', lang)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                    <DollarSign size={12} /> {t('budget', lang)}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.budget}
                    onChange={e => setForm({ ...form, budget: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#B8963E]/60 transition-all"
                    placeholder="10000"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                    <MessageSquare size={12} /> {t('message', lang)}
                  </label>
                  <textarea
                    rows={3}
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#B8963E]/60 transition-all resize-none"
                    placeholder={t('message_ph', lang)}
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={close}
                    disabled={submitting}
                    className="px-6 py-3 border border-white/10 text-white/50 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white/5 transition-all disabled:opacity-50"
                  >
                    {t('cancel', lang)}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-[#B8963E] text-white rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white hover:text-slate-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    {submitting ? t('sending', lang) : t('submit', lang)}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PlanTripModal;
