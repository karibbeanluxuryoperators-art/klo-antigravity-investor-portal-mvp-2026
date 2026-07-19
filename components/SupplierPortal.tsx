import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../services/firebase';

// Local Language alias — KLO-FULLSTACK components use uppercase 'EN'/'ES'/'PT'.
// types.ts in this repo exports a lowercase 'Language' for the public site.
// We define a local portal-side Language that matches the KLO-FULLSTACK
// components. In the App router we'll convert between the two shapes.
type Language = 'EN' | 'ES' | 'PT';
import { 
  Home, Ship, Plane, Users, Car, ChevronLeft, ChevronRight, 
  Check, Calendar, Globe, Shield, DollarSign, Camera, 
  MapPin, Clock, Star, Info, MessageSquare, ExternalLink,
  Loader2, CheckCircle2, ArrowRight, AlertCircle
} from 'lucide-react';

// v1.6: Trilingual copy map. Every user-visible string in this component
// lives here. The existing ternary pattern (`lang === 'EN' ? ... : ...`)
// is being replaced with a single lookup so the JSX stays readable and
// adding a translation in the future is one edit, not a 3-way search.
//
// Convention: every key is lowercase_snake. The `tx` helper below picks
// the right translation at render time. Falls back to EN if a key is
// missing in another language (defensive — should never happen but
// prevents UI breakage during development).
type Trilingual = { EN: string; ES: string; PT: string };

const T: Record<string, Trilingual> = {
  // Step labels (top of wizard)
  step_welcome:    { EN: 'Welcome',     ES: 'Bienvenida',  PT: 'Boas-vindas' },
  step_profile:    { EN: 'Profile',     ES: 'Perfil',      PT: 'Perfil' },
  step_availability: { EN: 'Availability', ES: 'Disponibilidad', PT: 'Disponibilidade' },
  step_review:     { EN: 'Review',      ES: 'Revisión',    PT: 'Revisão' },
  step_success:    { EN: 'Success',     ES: 'Éxito',       PT: 'Sucesso' },

  // Step 1 — Type selection
  s1_title:        { EN: 'Become a KLO Verified Partner', ES: 'Conviértete en Socio Verificado de KLO', PT: 'Torne-se um Parceiro Verificado da KLO' },
  s1_subtitle:     { EN: "List your villa, yacht, aircraft, vehicle fleet, or staff with the Caribbean's premier ultra-luxury platform.", ES: 'Lista tu villa, yate, aeronave, flota de vehículos o personal con la plataforma de ultra-lujo premier del Caribe.', PT: 'Cadastre sua villa, iate, aeronave, frota de veículos ou equipe na plataforma de ultra-luxo premier do Caribe.' },
  s1_pillar_villa: { EN: 'Villa Owner',           ES: 'Propietario de Villa', PT: 'Proprietário de Villa' },
  s1_pillar_yacht: { EN: 'Yacht / Boat Operator', ES: 'Operador de Yates / Embarcaciones', PT: 'Operador de Iates / Embarcações' },
  s1_pillar_aviation: { EN: 'Private Aviation',   ES: 'Aviación Privada',     PT: 'Aviação Privada' },
  s1_pillar_staff: { EN: 'Staffing & Services',   ES: 'Personal y Servicios', PT: 'Equipe e Serviços' },
  s1_pillar_ground:{ EN: 'Ground Transport',      ES: 'Transporte Terrestre', PT: 'Transporte Terrestre' },
  s1_returning:    { EN: 'Already a partner?',    ES: '¿Ya eres socio?',      PT: 'Já é parceiro?' },
  s1_signin:       { EN: 'Sign in to your dashboard', ES: 'Inicia sesión en tu panel', PT: 'Entre no seu painel' },
  s1_save_hint:    { EN: 'Your progress is saved automatically — come back any time to finish.', ES: 'Tu progreso se guarda automáticamente — vuelve cuando quieras para terminar.', PT: 'Seu progresso é salvo automaticamente — volte a qualquer momento para concluir.' },

  // Step 2 — Business Profile
  s2_title:        { EN: 'Business Profile',      ES: 'Perfil de Negocio',   PT: 'Perfil do Negócio' },
  s2_partner_badge:{ EN: 'Partner',               ES: 'Socio',               PT: 'Parceiro' },
  s2_business_name:{ EN: 'Business / Asset Name', ES: 'Nombre del Negocio / Activo', PT: 'Nome do Negócio / Ativo' },
  s2_business_ph:  { EN: 'e.g. Villa Serenity',   ES: 'ej. Villa Serenity',  PT: 'ex. Villa Serenity' },
  s2_contact_name: { EN: 'Contact Name',          ES: 'Nombre de Contacto',  PT: 'Nome de Contato' },
  s2_contact_ph:   { EN: 'Full Name',             ES: 'Nombre Completo',     PT: 'Nome Completo' },
  s2_email:        { EN: 'Email Address',         ES: 'Correo Electrónico',  PT: 'E-mail' },
  s2_email_ph:     { EN: 'email@example.com',     ES: 'correo@ejemplo.com',  PT: 'email@exemplo.com' },
  s2_whatsapp:     { EN: 'WhatsApp Number',       ES: 'Número de WhatsApp',  PT: 'Número de WhatsApp' },
  s2_whatsapp_ph:  { EN: '+57 300...',            ES: '+57 300...',          PT: '+57 300...' },
  s2_location:     { EN: 'Location',              ES: 'Ubicación',           PT: 'Localização' },
  s2_experience:   { EN: 'Years of Experience',   ES: 'Años de Experiencia', PT: 'Anos de Experiência' },
  s2_experience_ph:{ EN: '5',                     ES: '5',                   PT: '5' },
  s2_description:  { EN: 'Description (Max 500 chars)', ES: 'Descripción (Máx. 500 caracteres)', PT: 'Descrição (Máx. 500 caracteres)' },
  s2_description_ph: { EN: 'Describe your luxury offering...', ES: 'Describe tu oferta de lujo...', PT: 'Descreva sua oferta de luxo...' },
  s2_photo_url:    { EN: 'Primary Photo URL',     ES: 'URL de Foto Principal', PT: 'URL da Foto Principal' },
  s2_photo_url_ph: { EN: 'https://...',           ES: 'https://...',         PT: 'https://...' },
  s2_photo_hint:   { EN: 'Full photo upload coming soon', ES: 'Carga de fotos próximamente', PT: 'Upload de fotos em breve' },

  // Type-specific (VILLA)
  v_bedrooms:      { EN: 'Bedrooms',              ES: 'Habitaciones',        PT: 'Quartos' },
  v_max_guests:    { EN: 'Max Guests',            ES: 'Máx. Huéspedes',      PT: 'Máx. Hóspedes' },
  v_price:         { EN: 'Price per Night (USD)', ES: 'Precio por Noche (USD)', PT: 'Preço por Noite (USD)' },
  v_amenities:     { EN: 'Amenities',             ES: 'Comodidades',         PT: 'Comodidades' },

  // Type-specific (YACHT)
  ya_length:       { EN: 'Vessel Length (ft)',   ES: 'Eslora (ft)',         PT: 'Comprimento (ft)' },
  ya_max_guests:   { EN: 'Max Guests',            ES: 'Máx. Huéspedes',      PT: 'Máx. Hóspedes' },
  ya_price:        { EN: 'Price per Day (USD)',   ES: 'Precio por Día (USD)', PT: 'Preço por Dia (USD)' },
  ya_home_port:    { EN: 'Home Port',             ES: 'Puerto Base',         PT: 'Porto Base' },
  ya_crew:         { EN: 'Crew Included?',        ES: '¿Tripulación Incluida?', PT: 'Tripulação Incluída?' },
  ya_features:     { EN: 'Features',              ES: 'Características',     PT: 'Características' },

  // Type-specific (AVIATION)
  av_type:         { EN: 'Aircraft Type',         ES: 'Tipo de Aeronave',    PT: 'Tipo de Aeronave' },
  av_tail:         { EN: 'Tail Number',           ES: 'Número de Cola',      PT: 'Número de Cauda' },
  av_max_pax:      { EN: 'Max Passengers',        ES: 'Máx. Pasajeros',      PT: 'Máx. Passageiros' },
  av_price:        { EN: 'Price per Hour (USD)',  ES: 'Precio por Hora (USD)', PT: 'Preço por Hora (USD)' },
  av_home_base:    { EN: 'Home Base (IATA)',      ES: 'Base (IATA)',         PT: 'Base (IATA)' },
  av_home_base_ph: { EN: 'CTG',                   ES: 'CTG',                 PT: 'CTG' },
  av_range:        { EN: 'Range (nm)',            ES: 'Alcance (nm)',        PT: 'Alcance (nm)' },

  // Type-specific (STAFF)
  st_role:         { EN: 'Role',                  ES: 'Rol',                 PT: 'Função' },
  st_daily_rate:   { EN: 'Daily Rate (USD)',      ES: 'Tarifa Diaria (USD)', PT: 'Diária (USD)' },
  st_languages:    { EN: 'Languages Spoken',      ES: 'Idiomas',             PT: 'Idiomas Falados' },
  st_certs:        { EN: 'Certifications',        ES: 'Certificaciones',     PT: 'Certificações' },
  st_certs_ph:     { EN: 'e.g. Michelin Star, PADI Instructor...', ES: 'ej. Estrella Michelin, Instructor PADI...', PT: 'ex. Estrela Michelin, Instrutor PADI...' },

  // Type-specific (GROUND)
  gr_vehicle:      { EN: 'Vehicle Type',          ES: 'Tipo de Vehículo',    PT: 'Tipo de Veículo' },
  gr_passengers:   { EN: 'Number of Passengers',  ES: 'Número de Pasajeros', PT: 'Número de Passageiros' },
  gr_price:        { EN: 'Price per Day (USD)',   ES: 'Precio por Día (USD)', PT: 'Preço por Dia (USD)' },
  gr_plate:        { EN: 'License Plate',         ES: 'Placa',               PT: 'Placa' },
  gr_plate_ph:     { EN: 'e.g. ABC-1234',         ES: 'ej. ABC-1234',        PT: 'ex. ABC-1234' },
  gr_driver_inc:   { EN: 'Driver Included?',      ES: '¿Conductor Incluido?', PT: 'Motorista Incluído?' },
  gr_armored_label:{ EN: 'Is this vehicle armored?', ES: '¿Este vehículo es blindado?', PT: 'Este veículo é blindado?' },
  gr_armored_help: { EN: 'Does the vehicle have ballistic protection?', ES: '¿El vehículo tiene protección balística?', PT: 'O veículo tem proteção balística?' },
  gr_driver_lang:  { EN: 'Driver Languages Spoken', ES: 'Idiomas del Conductor', PT: 'Idiomas do Motorista' },

  // Yes/No
  yes:             { EN: 'yes',                   ES: 'sí',                  PT: 'sim' },
  no:              { EN: 'no',                    ES: 'no',                  PT: 'não' },

  // Step 3 — Availability
  s3_title:        { EN: 'Connect Your Availability', ES: 'Conecta tu Disponibilidad', PT: 'Conecte sua Disponibilidade' },
  s3_subtitle:     { EN: 'Choose how you want to manage your bookings.', ES: 'Elige cómo quieres gestionar tus reservas.', PT: 'Escolha como gerenciar suas reservas.' },
  s3_google_title: { EN: 'Connect Google Calendar', ES: 'Conectar Google Calendar', PT: 'Conectar Google Calendar' },
  s3_google_body:  { EN: 'Your bookings and blocked dates will sync automatically every 24 hours.', ES: 'Tus reservas y fechas bloqueadas se sincronizarán automáticamente cada 24 horas.', PT: 'Suas reservas e datas bloqueadas serão sincronizadas automaticamente a cada 24 horas.' },
  s3_google_cta:   { EN: 'Connect Google',        ES: 'Conectar Google',     PT: 'Conectar Google' },
  s3_google_locked:{ EN: 'You can connect Google Calendar after your application is approved', ES: 'Puedes conectar Google Calendar después de que tu solicitud sea aprobada', PT: 'Você pode conectar o Google Calendar depois que sua candidatura for aprovada' },
  s3_manual_title: { EN: 'Set Manually',          ES: 'Configurar Manualmente', PT: 'Configurar Manualmente' },
  s3_available:    { EN: 'Available',             ES: 'Disponible',          PT: 'Disponível' },
  s3_blocked:      { EN: 'Blocked',               ES: 'Bloqueado',           PT: 'Bloqueado' },
  s3_seasonal:     { EN: 'Seasonal Pricing',      ES: 'Precios por Temporada', PT: 'Preços por Temporada' },
  s3_seasonal_help:{ EN: 'Do you have different pricing by season?', ES: '¿Tienes precios diferentes por temporada?', PT: 'Você tem preços diferentes por temporada?' },
  s3_high_season:  { EN: 'High Season (Dec-Apr)', ES: 'Alta Temporada (Dic-Abr)', PT: 'Alta Temporada (Dez-Abr)' },
  s3_low_season:   { EN: 'Low Season (May-Nov)',  ES: 'Baja Temporada (May-Nov)', PT: 'Baixa Temporada (Mai-Nov)' },

  // Step 4 — Review
  s4_title:        { EN: 'Review & Submit',       ES: 'Revisar y Enviar',    PT: 'Revisar e Enviar' },
  s4_subtitle:     { EN: 'Please verify all information before submitting for verification.', ES: 'Por favor verifica toda la información antes de enviar para verificación.', PT: 'Verifique todas as informações antes de enviar para verificação.' },
  s4_business:     { EN: 'Business Details',      ES: 'Detalles del Negocio', PT: 'Detalhes do Negócio' },
  s4_asset:        { EN: 'Asset Details',         ES: 'Detalles del Activo', PT: 'Detalhes do Ativo' },
  s4_label_business:{EN: 'Business',              ES: 'Negocio',             PT: 'Negócio' },
  s4_label_contact:{ EN: 'Contact',               ES: 'Contacto',            PT: 'Contato' },
  s4_label_email:  { EN: 'Email',                 ES: 'Correo',              PT: 'E-mail' },
  s4_label_whatsapp:{EN: 'WhatsApp',              ES: 'WhatsApp',            PT: 'WhatsApp' },
  s4_label_location:{EN: 'Location',              ES: 'Ubicación',           PT: 'Localização' },
  s4_label_type:   { EN: 'Type',                  ES: 'Tipo',                PT: 'Tipo' },
  s4_label_bedrooms:{EN: 'Bedrooms',              ES: 'Habitaciones',        PT: 'Quartos' },
  s4_label_guests: { EN: 'Guests',                ES: 'Huéspedes',           PT: 'Hóspedes' },
  s4_label_price:  { EN: 'Price',                 ES: 'Precio',              PT: 'Preço' },
  s4_label_length: { EN: 'Length',                ES: 'Eslora',              PT: 'Comprimento' },
  s4_label_tail:   { EN: 'Tail #',                ES: 'Cola #',              PT: 'Cauda #' },
  s4_label_rate:   { EN: 'Rate',                  ES: 'Tarifa',              PT: 'Tarifa' },
  s4_label_vehicle:{EN: 'Vehicle',                ES: 'Vehículo',            PT: 'Veículo' },
  s4_label_passengers:{EN: 'Passengers',          ES: 'Pasajeros',           PT: 'Passageiros' },
  s4_label_plate:  { EN: 'Plate',                 ES: 'Placa',               PT: 'Placa' },
  s4_label_driver: { EN: 'Driver',                ES: 'Conductor',           PT: 'Motorista' },
  s4_label_armored:{EN: 'Armored',                ES: 'Blindado',            PT: 'Blindado' },
  s4_label_languages:{EN: 'Languages',            ES: 'Idiomas',             PT: 'Idiomas' },
  s4_per_night:    { EN: '/night',                ES: '/noche',              PT: '/noite' },
  s4_per_day:      { EN: '/day',                  ES: '/día',                PT: '/dia' },
  s4_per_hour:     { EN: '/hour',                 ES: '/hora',               PT: '/hora' },
  s4_terms_title:  { EN: 'KLO Partnership Terms', ES: 'Términos de Asociación KLO', PT: 'Termos de Parceria KLO' },
  s4_terms_body_en:{ EN: "As a KLO Verified Partner, you retain 80% of every booking. KLO's 20% management fee covers client acquisition, platform access, payment processing, and dedicated concierge support. Payouts are processed within 48 hours of guest check-in via Stripe. You will have access to a partner dashboard to track bookings and revenue in real time.", ES: "Como Socio Verificado de KLO, usted retiene el 80% de cada reserva. La tarifa de gestión del 20% de KLO cubre la adquisición de clientes, acceso a la plataforma, procesamiento de pagos y soporte de conserjería dedicado. Los pagos se procesan dentro de las 48 horas posteriores al check-in del huésped a través de Stripe. Tendrá acceso a un panel de socio para rastrear reservas e ingresos en tiempo real.", PT: "Como Parceiro Verificado KLO, você retém 80% de cada reserva. A taxa de gestão de 20% da KLO cobre aquisição de clientes, acesso à plataforma, processamento de pagamentos e suporte de concierge dedicado. Os pagamentos são processados em até 48 horas após o check-in do hóspede via Stripe. Você terá acesso a um painel de parceiro para acompanhar reservas e receitas em tempo real." },
  s4_agree:        { EN: 'I agree to KLO Partnership Terms', ES: 'Acepto los Términos de Asociación KLO', PT: 'Aceito os Termos de Parceria KLO' },
  s4_submit:       { EN: 'Submit for Verification', ES: 'Enviar para Verificación', PT: 'Enviar para Verificação' },
  s4_submitting:   { EN: 'Submitting…',           ES: 'Enviando…',           PT: 'Enviando…' },

  // Step 5 — Success
  s5_title:        { EN: 'Application Received',  ES: 'Solicitud Recibida',  PT: 'Solicitação Recebida' },
  s5_body:         { EN: 'Our team will verify your assets within 48 hours. You will receive a WhatsApp confirmation at', ES: 'Nuestro equipo verificará tus activos dentro de 48 horas. Recibirás una confirmación por WhatsApp al', PT: 'Nossa equipe verificará seus ativos em até 48 horas. Você receberá uma confirmação pelo WhatsApp no' },
  s5_dashboard:    { EN: 'Go to your dashboard',  ES: 'Ir a tu panel',       PT: 'Ir para o seu painel' },
  s5_whatsapp:     { EN: 'Contact via WhatsApp',  ES: 'Contactar por WhatsApp', PT: 'Contatar pelo WhatsApp' },
  s5_explore:      { EN: 'Explore KLO Marketplace', ES: 'Explorar KLO',      PT: 'Explorar KLO' },

  // Common buttons
  back:            { EN: 'Back',                  ES: 'Atrás',               PT: 'Voltar' },
  back_home:       { EN: 'Back to Home',          ES: 'Volver al Inicio',    PT: 'Voltar ao Início' },
  continue:        { EN: 'Continue',              ES: 'Continuar',           PT: 'Continuar' },

  // Errors
  err_generic:     { EN: 'An unexpected error occurred during submission.', ES: 'Ocurrió un error inesperado durante el envío.', PT: 'Ocorreu um erro inesperado durante o envio.' },
};

const STEPS: Trilingual[] = [
  T.step_welcome,
  T.step_profile,
  T.step_availability,
  T.step_review,
  T.step_success,
];

// `tx` is created inside the component to close over the current `lang`.
// Use as `tx(T.s2_email)` to get the right-language string with EN fallback.
type Tx = Record<Language, string>;

const LOCATIONS = ["Cartagena", "Santa Marta", "Bogotá", "Barranquilla", "San Andrés", "Other"];
const AIRCRAFT_TYPES = ["Turboprop", "Light Jet", "Midsize Jet", "Heavy Jet", "Ultra Long Range", "Helicopter"];
const STAFF_ROLES = ["Private Chef", "Security", "DJ", "Driver", "Butler", "Medical", "Photographer", "Other"];
const LANGUAGES = ["ES", "EN", "PT", "FR", "IT"];

const VEHICLE_TYPES = [
  'SUV', 'Sedan', 'Van', 'Minibus', 
  'Motorcycle', 'Speedboat', 'Other'
];

const DRIVER_LANGUAGES = ['ES', 'EN', 'PT', 'FR', 'IT'];

const VILLA_AMENITIES = ["Pool", "Beach Access", "Chef's Kitchen", "Gym", "Helipad", "Security Room", "Private Dock", "Cinema Room"];
const YACHT_FEATURES = ["Water toys", "Jet ski", "Dive equipment", "Fishing gear", "Tender"];

interface SupplierPortalProps {
  onBack?: () => void;
  lang?: Language;
  // v1.5: navigation hooks for the magic-link auth + dashboard. The App
  // router wires these to /supplier/login and /supplier/dashboard. Keeping
  // them as callbacks (instead of pushing the router into the component)
  // means this file stays router-agnostic and easy to test.
  onGoToLogin?: () => void;
  onGoToDashboard?: () => void;
}

// v1.5: localStorage key for the onboarding draft. Persists between visits
// so suppliers can come back and finish. Cleared on successful submit.
const DRAFT_STORAGE_KEY = 'klo_supplier_onboarding_draft_v1';

export const SupplierPortal: React.FC<SupplierPortalProps> = ({
  onBack,
  lang = 'EN',
  onGoToLogin,
  onGoToDashboard,
}) => {
  // v1.6: trilingual resolver. Closes over `lang` so JSX call sites stay
  // readable: `tx(T.s2_email)` instead of `T.s2_email[lang] || T.s2_email.EN`.
  const tx = (entry: Tx | undefined): string =>
    (entry && (entry[lang] || entry.EN)) || '';
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [type, setType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_CALENDAR_AUTH_SUCCESS') {
        setIsGoogleConnected(true);
        setIsConnectingGoogle(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const [formData, setFormData] = useState<any>({
    // Common
    business_name: '',
    contact_name: '',
    email: '',
    whatsapp: '+57 ',
    location: 'Cartagena',
    experience: '',
    description: '',
    photo_url: '',
    // Villa
    bedrooms: '',
    max_guests: '',
    price_per_night: '',
    amenities: [],
    // Yacht
    vessel_length: '',
    crew_included: 'no',
    price_per_day: '',
    home_port: '',
    features: [],
    // Aviation
    aircraft_type: 'Light Jet',
    tail_number: '',
    max_passengers: '',
    price_per_hour: '',
    home_base: '',
    range: '',
    // Staff
    role: 'Private Chef',
    languages: [],
    daily_rate: '',
    certifications: '',
    // Ground Transport
    vehicle_type: 'SUV',
    is_armored: false,
    max_passengers_ground: '',
    driver_included: 'yes',
    price_per_day_ground: '',
    license_plate: '',
    driver_languages: [],
    // Calendar
    seasonal_pricing: false,
    high_season_price: '',
    low_season_price: '',
    manual_availability: []
  });

  // v1.5: load any previously saved onboarding draft on mount. We only
  // restore `type` and `formData` — `step`, `agreedToTerms`, etc. are
  // session-local. The "Save and continue later" hint in Step 1 nudges the
  // user that this is happening automatically.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.type === 'string') setType(parsed.type);
        if (parsed.formData && typeof parsed.formData === 'object') {
          setFormData((prev: any) => ({ ...prev, ...parsed.formData }));
        }
      }
    } catch (e) {
      // Bad JSON or storage disabled — silently ignore. The user can still
      // fill the form from scratch; we just lose the resume.
      console.warn('Could not load onboarding draft', e);
    }
  }, []);

  // v1.5: auto-save the draft on every meaningful change. We keep the writes
  // cheap (one localStorage call per render with new data) by guarding on
  // the value identity.
  useEffect(() => {
    try {
      // Skip the very first save until the user has actually typed something.
      // We detect "untouched" by checking that no required field has a value.
      const hasUserInput =
        formData.business_name || formData.contact_name || formData.email ||
        (formData.whatsapp && formData.whatsapp !== '+57 ');
      if (!hasUserInput && !type) return;
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ type, formData, savedAt: new Date().toISOString() })
      );
    } catch (e) {
      // localStorage might be unavailable (private mode, quota). We swallow
      // the error — auto-save is best-effort, the user can still submit.
    }
  }, [formData, type]);

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* ignore */ }
  };

  // v1.6: validation per step. Returns the error message key, or null
  // if the current step is valid. Used by nextStep to gate progression.
  const validateStep = (targetStep: number): string | null => {
    // Step 1 → 2: a pillar must be selected (the click already enforces this)
    if (targetStep === 2 && !type) {
      return lang === 'EN' ? 'Please select a partner type.' : lang === 'ES' ? 'Por favor selecciona un tipo de socio.' : 'Por favor, selecione um tipo de parceiro.';
    }
    // Step 2 → 3: required business-profile fields
    if (targetStep === 3) {
      if (!formData.business_name?.trim()) {
        return lang === 'EN' ? 'Business / asset name is required.' : lang === 'ES' ? 'El nombre del negocio es obligatorio.' : 'O nome do negócio é obrigatório.';
      }
      if (!formData.contact_name?.trim()) {
        return lang === 'EN' ? 'Contact name is required.' : lang === 'ES' ? 'El nombre de contacto es obligatorio.' : 'O nome de contato é obrigatório.';
      }
      if (!formData.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        return lang === 'EN' ? 'Please enter a valid email address.' : lang === 'ES' ? 'Por favor ingresa un correo válido.' : 'Por favor, insira um e-mail válido.';
      }
      if (!formData.whatsapp?.trim() || formData.whatsapp === '+57 ') {
        return lang === 'EN' ? 'WhatsApp number is required.' : lang === 'ES' ? 'El número de WhatsApp es obligatorio.' : 'O número de WhatsApp é obrigatório.';
      }
    }
    // Step 3 → 4: any of the type-specific required fields. We do basic
    // checks per pillar — only the price field, since it's the most
    // commonly missed.
    if (targetStep === 4) {
      const price = formData.price_per_night || formData.price_per_day ||
                    formData.price_per_hour || formData.price_per_day_ground ||
                    formData.daily_rate;
      if (!price) {
        return lang === 'EN' ? 'Price is required.' : lang === 'ES' ? 'El precio es obligatorio.' : 'O preço é obrigatório.';
      }
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep(step + 1);
    if (err) {
      setSubmitError(err);
      return;
    }
    setSubmitError(null);
    setDirection(1);
    setStep(s => Math.min(s + 1, 5));
  };

  const prevStep = () => {
    setSubmitError(null);
    setDirection(-1);
    setStep(s => Math.max(s - 1, 1));
  };

  const handleTypeSelect = (selectedType: string) => {
    setType(selectedType);
    nextStep();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, value: string) => {
    setFormData((prev: any) => {
      const current = prev[name] || [];
      if (current.includes(value)) {
        return { ...prev, [name]: current.filter((v: string) => v !== value) };
      } else {
        return { ...prev, [name]: [...current, value] };
      }
    });
  };

  const toggleDate = (dateStr: string) => {
    setFormData((prev: any) => {
      const current = prev.manual_availability || [];
      if (current.includes(dateStr)) {
        return { ...prev, manual_availability: current.filter((d: string) => d !== dateStr) };
      } else {
        return { ...prev, manual_availability: [...current, dateStr] };
      }
    });
  };

  const handleSubmit = async () => {
    if (!agreedToTerms) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Use existing supplierId if generated during Google Auth, otherwise let server generate
      const sid_to_use = supplierId;

      // STEP 1: POST to /api/suppliers/register
      // Capture Firebase UID if user is logged in
      let firebase_uid = null;
      try {
        const currentUser = auth?.currentUser;
        if (currentUser) firebase_uid = currentUser.uid;
      } catch { /* Firebase may not be initialized */ }

      const supplierRes = await fetch('/api/suppliers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sid_to_use,
          firebase_uid,
          business_name: formData.business_name,
          contact_name: formData.contact_name,
          email: formData.email,
          whatsapp: formData.whatsapp,
          location: formData.location,
          asset_type: type,
          description: formData.description
        })
      });
      
      const supplierData = await supplierRes.json();
      if (!supplierRes.ok || !supplierData.success) {
        throw new Error(supplierData.error || 'Failed to register supplier');
      }

      const sid = supplierData.supplier_id;
      setSupplierId(sid);

      // STEP 2: After getting supplier_id, POST to /api/assets
      const mappedType = type === 'VILLA' ? 'LODGING' : 
                         type === 'YACHT' ? 'VESSEL' :
                         type === 'AVIATION' ? 'AIRCRAFT' :
                         type === 'GROUND' ? 'VEHICLE' :
                         'STAFF';

      const assetPayload = {
        supplier_id: sid,
        name: formData.business_name,
        type: mappedType,
        location: formData.location,
        description: formData.description,
        price_per_unit: type === 'VILLA' ? formData.price_per_night : 
                        type === 'YACHT' ? formData.price_per_day :
                        type === 'AVIATION' ? formData.price_per_hour :
                        type === 'GROUND' ? formData.price_per_day_ground :
                        formData.daily_rate,
        price_type: type === 'VILLA' ? 'PER_NIGHT' : 
                    type === 'YACHT' ? 'PER_DAY' :
                    type === 'AVIATION' ? 'PER_HOUR' :
                    type === 'GROUND' ? 'PER_DAY' :
                    'PER_DAY',
        capacity: parseInt(
          formData.max_guests || 
          formData.max_passengers || 
          formData.max_passengers_ground || 
          (type === 'STAFF' ? '1' : '0')
        ),
        amenities: formData.amenities.length > 0 ? formData.amenities : (formData.features.length > 0 ? formData.features : []),
        images: [formData.photo_url].filter(Boolean)
      };

      const assetRes = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetPayload)
      });
      
      const assetData = await assetRes.json();
      if (!assetRes.ok || !assetData.success) {
        throw new Error(assetData.error || 'Failed to create asset');
      }

      const aid = assetData.asset_id;

      // STEP 3: Trigger Calendar Sync if connected
      if (isGoogleConnected) {
        try {
          await fetch(`/api/calendar/sync/${aid}`);
        } catch (e) {
          console.error('Initial sync failed', e);
        }
      }

      // STEP 4: On success, advance to Step 5 (success screen)
      // Also open WhatsApp notification
      window.open(`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}?text=` +
        encodeURIComponent(
          `New KLO supplier application:\n` +
          `Business: ${formData.business_name}\n` +
          `Type: ${type}\n` +
          `Location: ${formData.location}\n` +
          `WhatsApp: ${formData.whatsapp}`
        ), '_blank');

      // v1.5: successful submit — clear the draft so a future session starts clean.
      clearDraft();
      setStep(5);
    } catch (error: any) {
      // STEP 4: On any error, show the error message in the UI without crashing
      setSubmitError(error.message || tx(T.err_generic));
    } finally {
      setIsSubmitting(false);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  const renderStep1 = () => (
    <div className="space-y-12">
      <div className="text-center space-y-4">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.href = '/'}
          className="w-24 h-24 mx-auto mb-8 cursor-pointer drop-shadow-[0_8px_24px_rgba(212,175,55,0.35)]"
          aria-label="KLO home"
        >
          <img
            src="/klo-logo.png"
            alt="KLO"
            className="w-full h-full object-contain"
          />
        </motion.div>
        <h1 className="text-5xl font-serif italic tracking-wide text-text-main">{tx(T.s1_title)}</h1>
        <p className="text-text-main/60 font-sans font-light text-xl max-w-2xl mx-auto leading-relaxed">
          {tx(T.s1_subtitle)}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {[
          { id: 'VILLA', labelKey: 's1_pillar_villa', icon: Home, color: 'bg-gold/10 text-gold' },
          { id: 'YACHT', labelKey: 's1_pillar_yacht', icon: Ship, color: 'bg-text-main/5 text-text-main/60' },
          { id: 'AVIATION', labelKey: 's1_pillar_aviation', icon: Plane, color: 'bg-text-main/5 text-text-main/70' },
          { id: 'STAFF', labelKey: 's1_pillar_staff', icon: Users, color: 'bg-text-main/5 text-text-main/50' },
          { id: 'GROUND', labelKey: 's1_pillar_ground', icon: Car, color: 'bg-text-main/5 text-text-main/40' },
        ].map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ y: -10, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleTypeSelect(item.id)}
            className="bg-luxury-slate border border-border-main rounded-xl p-8 text-center space-y-6 group hover:border-gold/50 transition-all duration-500"
          >
            <div className={`w-20 h-20 ${item.color} rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform`}>
              <item.icon size={40} />
            </div>
            <h3 className="text-xl font-sans font-medium text-text-main">{tx(T[item.labelKey as keyof typeof T])}</h3>
            <div className="w-10 h-1 bg-gold/20 mx-auto group-hover:w-20 transition-all" />
          </motion.button>
        ))}
      </div>

      {/* v1.5: returning supplier + save-and-resume hints. Both pieces are
          small but unlock the v1.5 polish promise: a supplier who already
          applied can come back without losing their draft, and one who
          already has an account can sign in instead of re-applying. */}
      <div className="max-w-2xl mx-auto pt-4 space-y-3 text-center">
        {onGoToLogin && (
          <p className="text-text-main/50 text-sm">
            {tx(T.s1_returning)}{' '}
            <button
              type="button"
              onClick={onGoToLogin}
              className="text-gold hover:text-white font-semibold transition-colors underline underline-offset-2"
            >
              {tx(T.s1_signin)}
            </button>
          </p>
        )}
        <p className="text-text-main/30 text-[11px] italic">
          {tx(T.s1_save_hint)}
        </p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif italic tracking-wide text-text-main">{tx(T.s2_title)}</h2>
        <div className="px-4 py-1 bg-gold/10 text-gold rounded text-[11px] font-sans font-semibold uppercase tracking-tight">
          {type} {tx(T.s2_partner_badge)}
        </div>
      </div>

      <div className="bg-luxury-slate border border-border-main rounded-2xl p-10 space-y-10">
        {/* Common Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s2_business_name)}</label>
            <input name="business_name" value={formData.business_name} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder={tx(T.s2_business_ph)} />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s2_contact_name)}</label>
            <input name="contact_name" value={formData.contact_name} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder={tx(T.s2_contact_ph)} />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s2_email)}</label>
            <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder={tx(T.s2_email_ph)} />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s2_whatsapp)}</label>
            <input name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder={tx(T.s2_whatsapp_ph)} />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s2_location)}</label>
            <select name="location" value={formData.location} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light appearance-none text-text-main">
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s2_experience)}</label>
            <input name="experience" type="number" value={formData.experience} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder={tx(T.s2_experience_ph)} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s2_description)}</label>
          <textarea name="description" maxLength={500} value={formData.description} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light h-32 resize-none text-text-main" placeholder={tx(T.s2_description_ph)} />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s2_photo_url)}</label>
          <div className="relative">
            <input name="photo_url" value={formData.photo_url} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 pl-14 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder={tx(T.s2_photo_url_ph)} />
            <Camera className="absolute left-6 top-1/2 -translate-y-1/2 text-text-main/20" size={20} />
          </div>
          <p className="text-[11px] text-text-main/30 italic font-sans">{tx(T.s2_photo_hint)}</p>
        </div>

        <div className="h-[1px] bg-border-main w-full" />

        {/* Type Specific Fields */}
        {type === 'VILLA' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.v_bedrooms)}</label>
                <input name="bedrooms" type="number" value={formData.bedrooms} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.v_max_guests)}</label>
                <input name="max_guests" type="number" value={formData.max_guests} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.v_price)}</label>
                <input name="price_per_night" type="number" value={formData.price_per_night} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.v_amenities)}</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {VILLA_AMENITIES.map(a => (
                  <button key={a} onClick={() => handleCheckboxChange('amenities', a)} className={`p-4 rounded-xl border text-[11px] font-sans uppercase tracking-tight transition-all ${formData.amenities.includes(a) ? 'bg-gold border-gold text-luxury-black font-semibold' : 'border-border-main hover:border-gold/30 text-text-main/60'}`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {type === 'YACHT' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.ya_length)}</label>
                <input name="vessel_length" type="number" value={formData.vessel_length} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.ya_max_guests)}</label>
                <input name="max_guests" type="number" value={formData.max_guests} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.ya_price)}</label>
                <input name="price_per_day" type="number" value={formData.price_per_day} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.ya_home_port)}</label>
                <input name="home_port" value={formData.home_port} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.ya_crew)}</label>
                <div className="flex gap-4">
                  {[T.yes, T.no].map(o => (
                    <button key={o.EN} onClick={() => setFormData((prev: any) => ({ ...prev, crew_included: o.EN }))} className={`flex-1 py-4 rounded-xl border text-[11px] font-sans uppercase tracking-tight transition-all ${formData.crew_included === o.EN ? 'bg-gold border-gold text-luxury-black font-semibold' : 'border-border-main text-text-main/60'}`}>
                      {tx(o)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.ya_features)}</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {YACHT_FEATURES.map(f => (
                  <button key={f} onClick={() => handleCheckboxChange('features', f)} className={`p-4 rounded-xl border text-[11px] font-sans uppercase tracking-tight transition-all ${formData.features.includes(f) ? 'bg-gold border-gold text-luxury-black font-semibold' : 'border-border-main hover:border-gold/30 text-text-main/60'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {type === 'AVIATION' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.av_type)}</label>
                <select name="aircraft_type" value={formData.aircraft_type} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light appearance-none text-text-main">
                  {AIRCRAFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.av_tail)}</label>
                <input name="tail_number" value={formData.tail_number} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.av_max_pax)}</label>
                <input name="max_passengers" type="number" value={formData.max_passengers} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.av_price)}</label>
                <input name="price_per_hour" type="number" value={formData.price_per_hour} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.av_home_base)}</label>
                <input name="home_base" value={formData.home_base} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder={tx(T.av_home_base_ph)} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.av_range)}</label>
                <input name="range" type="number" value={formData.range} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
            </div>
          </div>
        )}

        {type === 'STAFF' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.st_role)}</label>
                <select name="role" value={formData.role} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light appearance-none text-text-main">
                  {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.st_daily_rate)}</label>
                <input name="daily_rate" type="number" value={formData.daily_rate} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.st_languages)}</label>
              <div className="flex flex-wrap gap-4">
                {LANGUAGES.map(l => (
                  <button key={l} onClick={() => handleCheckboxChange('languages', l)} className={`w-16 h-16 rounded-xl border text-[11px] font-sans font-semibold transition-all ${formData.languages.includes(l) ? 'bg-gold border-gold text-luxury-black' : 'border-border-main hover:border-gold/30 text-text-main/60'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.st_certs)}</label>
              <input name="certifications" value={formData.certifications} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder={tx(T.st_certs_ph)} />
            </div>
          </div>
        )}

        {type === 'GROUND' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.gr_vehicle)}</label>
                <select name="vehicle_type" value={formData.vehicle_type} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light appearance-none text-text-main">
                  {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.gr_passengers)}</label>
                <input name="max_passengers_ground" type="number" value={formData.max_passengers_ground} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.gr_price)}</label>
                <input name="price_per_day_ground" type="number" value={formData.price_per_day_ground} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.gr_plate)}</label>
                <input name="license_plate" value={formData.license_plate} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder={tx(T.gr_plate_ph)} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.gr_driver_inc)}</label>
                <div className="flex gap-4">
                  {[T.yes, T.no].map(o => (
                    <button key={o.EN} onClick={() => setFormData((prev: any) => ({ ...prev, driver_included: o.EN }))} className={`flex-1 py-4 rounded-xl border text-[11px] font-sans uppercase tracking-tight transition-all ${formData.driver_included === o.EN ? 'bg-gold border-gold text-luxury-black font-semibold' : 'border-border-main text-text-main/60'}`}>
                      {tx(o)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.gr_armored_label)}</label>
                  </div>
                  <p className="text-xs text-text-main/40 font-light">{tx(T.gr_armored_help)}</p>
                </div>
                <button
                  onClick={() => setFormData((prev: any) => ({ ...prev, is_armored: !prev.is_armored }))}
                  className={`w-16 h-8 rounded-full transition-all relative ${formData.is_armored ? 'bg-gold' : 'bg-text-main/10'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.is_armored ? 'left-9' : 'left-1'}`} />
                </button>
              </div>
            </div>

            {formData.driver_included === 'yes' && (
              <div className="space-y-4">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.gr_driver_lang)}</label>
                <div className="flex flex-wrap gap-4">
                  {DRIVER_LANGUAGES.map(l => (
                    <button key={l} onClick={() => handleCheckboxChange('driver_languages', l)} className={`w-16 h-16 rounded-xl border text-[11px] font-sans font-semibold transition-all ${formData.driver_languages.includes(l) ? 'bg-gold border-gold text-luxury-black' : 'border-border-main hover:border-gold/30 text-text-main/60'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

        <div className="flex justify-between pt-8">
          <button onClick={prevStep} className="flex items-center gap-2 text-[11px] font-sans uppercase tracking-tight font-semibold text-text-main/40 hover:text-text-main transition-colors">
            <ChevronLeft size={16} /> {tx(T.back)}
          </button>
          <button onClick={nextStep} className="px-12 py-4 bg-gold text-luxury-black rounded font-medium text-xs tracking-wide flex items-center gap-3 hover:bg-white transition-all">
            {tx(T.continue)} <ChevronRight size={16} />
          </button>
        </div>
    </div>
  );

  const renderStep3 = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const getDaysInMonth = (month: number, year: number) => {
      return new Date(year, month + 1, 0).getDate();
    };

    const renderCalendarGrid = (month: number, year: number) => {
      const days = getDaysInMonth(month, year);
      const firstDay = new Date(year, month, 1).getDay();
      const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
      
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-sans font-medium uppercase tracking-tight text-center text-text-main">{monthName} {year}</h4>
          <div className="grid grid-cols-7 gap-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-[10px] text-center text-text-main/20 font-medium">{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: days }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isBlocked = formData.manual_availability.includes(dateStr);
              return (
                <button
                  key={day}
                  onClick={() => toggleDate(dateStr)}
                  className={`aspect-square rounded-lg text-[10px] flex items-center justify-center transition-all ${isBlocked ? 'bg-red-500 text-white' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      );
    };

    const handleConnectGoogle = async () => {
      setIsConnectingGoogle(true);
      try {
        let sid = supplierId;
        if (!sid) {
          sid = crypto.randomUUID();
          setSupplierId(sid);
        }

        const res = await fetch(`/api/calendar/auth-url?supplier_id=${sid}`);
        const data = await res.json();
        
        if (data.url) {
          window.open(data.url, 'google_auth', 'width=600,height=700');
        } else if (data.mock) {
          // Mock success for development if no keys
          setTimeout(() => {
            setIsGoogleConnected(true);
            setIsConnectingGoogle(false);
          }, 1500);
        }
      } catch (error) {
        console.error('Failed to get auth URL', error);
        setIsConnectingGoogle(false);
      }
    };

    const handleDisconnectGoogle = async () => {
      if (!supplierId) return;
      try {
        const response = await fetch(`/api/calendar/disconnect/${supplierId}`, { method: 'POST' });
        if (response.ok) {
          setIsGoogleConnected(false);
        }
      } catch (error) {
        console.error('Failed to disconnect Google Calendar', error);
      }
    };

    return (
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-serif text-text-main">{tx(T.s3_title)}</h2>
          <p className="text-text-main/40 font-light">{tx(T.s3_subtitle)}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-luxury-slate border border-border-main rounded-2xl p-10 space-y-8 flex flex-col items-center text-center opacity-60">
            <div className="w-20 h-20 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500">
              <Globe size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-serif text-text-main">{tx(T.s3_google_title)}</h3>
              <p className="text-xs text-text-main/40 font-light leading-relaxed">
                {tx(T.s3_google_body)}
              </p>
            </div>
            <button
              disabled
              className="w-full py-4 border border-border-main rounded-xl text-[11px] font-sans font-semibold uppercase tracking-tight transition-all flex items-center justify-center gap-3 text-text-main/20 cursor-not-allowed"
            >
              <ExternalLink size={16} />
              {tx(T.s3_google_cta)}
            </button>
            <p className="text-[11px] text-gold font-sans font-semibold uppercase tracking-tight">
              {tx(T.s3_google_locked)}
            </p>
          </div>

          <div className="bg-luxury-slate border border-border-main rounded-2xl p-10 space-y-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                <Calendar size={24} />
              </div>
              <h3 className="text-xl font-serif text-text-main">{tx(T.s3_manual_title)}</h3>
            </div>
            <div className="grid grid-cols-1 gap-8">
              {renderCalendarGrid(currentMonth, currentYear)}
            </div>
            <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-text-main">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full" /> {tx(T.s3_available)}</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full" /> {tx(T.s3_blocked)}</div>
            </div>
          </div>
        </div>

        <div className="bg-luxury-slate border border-border-main rounded-2xl p-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-sans font-medium text-text-main">{tx(T.s3_seasonal)}</h3>
              <p className="text-xs text-text-main/40 font-light">{tx(T.s3_seasonal_help)}</p>
            </div>
            <button 
              onClick={() => setFormData((prev: any) => ({ ...prev, seasonal_pricing: !prev.seasonal_pricing }))}
              className={`w-16 h-8 rounded-full transition-all relative ${formData.seasonal_pricing ? 'bg-gold' : 'bg-text-main/10'}`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.seasonal_pricing ? 'left-9' : 'left-1'}`} />
            </button>
          </div>

          <AnimatePresence>
            {formData.seasonal_pricing && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-hidden">
                <div className="space-y-2">
                  <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s3_high_season)}</label>
                  <div className="relative">
                    <input name="high_season_price" type="number" value={formData.high_season_price} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 pl-12 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder="0" />
                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-text-main/20" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s3_low_season)}</label>
                  <div className="relative">
                    <input name="low_season_price" type="number" value={formData.low_season_price} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 pl-12 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder="0" />
                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-text-main/20" size={16} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between pt-8">
          <button onClick={prevStep} className="flex items-center gap-2 text-[11px] font-sans uppercase tracking-tight text-text-main/40 hover:text-text-main transition-colors">
            <ChevronLeft size={16} /> {tx(T.back)}
          </button>
          <button onClick={nextStep} className="px-12 py-4 bg-gold text-luxury-black rounded font-medium text-xs tracking-wide flex items-center gap-3 hover:bg-white transition-all">
            {tx(T.continue)} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-serif text-text-main">{tx(T.s4_title)}</h2>
        <p className="text-text-main/40 font-light">{tx(T.s4_subtitle)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-luxury-slate border border-border-main rounded-2xl p-10 space-y-8">
          <h3 className="text-xl font-serif border-b border-border-main pb-4 text-text-main">{tx(T.s4_business)}</h3>
          <div className="space-y-4 text-text-main">
            {[
              { label: tx(T.s4_label_business), value: formData.business_name },
              { label: tx(T.s4_label_contact), value: formData.contact_name },
              { label: tx(T.s4_label_email), value: formData.email },
              { label: tx(T.s4_label_whatsapp), value: formData.whatsapp },
              { label: tx(T.s4_label_location), value: formData.location },
              { label: tx(T.s4_label_type), value: type },
            ].map(i => (
              <div key={i.label} className="flex justify-between items-center">
                <span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{i.label}</span>
                <span className="text-sm font-medium">{i.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-luxury-slate border border-border-main rounded-2xl p-10 space-y-8">
          <h3 className="text-xl font-sans font-medium border-b border-border-main pb-4 text-text-main">{tx(T.s4_asset)}</h3>
          <div className="space-y-4">
            {type === 'VILLA' && (
              <>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_bedrooms)}</span><span className="text-sm font-medium text-text-main">{formData.bedrooms}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_guests)}</span><span className="text-sm font-medium text-text-main">{formData.max_guests}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_price)}</span><span className="text-sm font-medium text-text-main">${formData.price_per_night}{tx(T.s4_per_night)}</span></div>
              </>
            )}
            {type === 'YACHT' && (
              <>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_length)}</span><span className="text-sm font-medium text-text-main">{formData.vessel_length}ft</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_guests)}</span><span className="text-sm font-medium text-text-main">{formData.max_guests}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_price)}</span><span className="text-sm font-medium text-text-main">${formData.price_per_day}{tx(T.s4_per_day)}</span></div>
              </>
            )}
            {type === 'AVIATION' && (
              <>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_type)}</span><span className="text-sm font-medium text-text-main">{formData.aircraft_type}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_tail)}</span><span className="text-sm font-medium text-text-main">{formData.tail_number}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_price)}</span><span className="text-sm font-medium text-text-main">${formData.price_per_hour}{tx(T.s4_per_hour)}</span></div>
              </>
            )}
            {type === 'STAFF' && (
              <>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_type)}</span><span className="text-sm font-medium text-text-main">{formData.role}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_rate)}</span><span className="text-sm font-medium text-text-main">${formData.daily_rate}{tx(T.s4_per_day)}</span></div>
              </>
            )}
            {type === 'GROUND' && (
              <>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_vehicle)}</span><span className="text-sm font-medium text-text-main">{formData.vehicle_type}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_passengers)}</span><span className="text-sm font-medium text-text-main">{formData.max_passengers_ground}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_plate)}</span><span className="text-sm font-medium text-text-main">{formData.license_plate}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_price)}</span><span className="text-sm font-medium text-text-main">${formData.price_per_day_ground}{tx(T.s4_per_day)}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_driver)}</span><span className="text-sm font-medium font-sans text-text-main">{formData.driver_included === 'yes' ? tx(T.yes) : tx(T.no)}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_armored)}</span>
                  <span className="text-sm font-medium flex items-center gap-2 text-text-main">
                    {formData.is_armored ? tx(T.yes).toUpperCase() : tx(T.no).toUpperCase()}
                  </span>
                </div>
                {formData.driver_included === 'yes' && (
                  <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{tx(T.s4_label_languages)}</span><span className="text-sm font-medium text-text-main">{formData.driver_languages.join(', ')}</span></div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-luxury-slate border border-border-main rounded-2xl p-10 space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gold/10 text-gold rounded-xl flex items-center justify-center">
            <Shield size={24} />
          </div>
          <h3 className="text-xl font-sans font-medium text-text-main">{tx(T.s4_terms_title)}</h3>
        </div>
        <p className="text-sm text-text-main/60 font-light leading-relaxed">
          {tx(T.s4_terms_body_en)}
        </p>
        <label className="flex items-center gap-4 cursor-pointer group">
          <div
            onClick={() => setAgreedToTerms(!agreedToTerms)}
            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${agreedToTerms ? 'bg-gold border-gold' : 'border-border-main group-hover:border-gold/50'}`}
          >
            {agreedToTerms && <Check size={16} className="text-luxury-black" />}
          </div>
          <span className="text-[11px] font-sans uppercase tracking-tight font-semibold text-text-main">{tx(T.s4_agree)}</span>
        </label>
      </div>

      {submitError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl"
        >
          <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300 leading-relaxed">{submitError}</p>
        </motion.div>
      )}

      <div className="flex justify-between pt-8">
        <button onClick={prevStep} className="flex items-center gap-2 text-[11px] font-sans uppercase tracking-tight font-semibold text-text-main/40 hover:text-text-main transition-colors">
          <ChevronLeft size={16} /> {tx(T.back)}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!agreedToTerms || isSubmitting}
          className="px-16 py-6 bg-gold text-luxury-black rounded font-medium text-xs tracking-wide flex items-center gap-3 hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-gold/20"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Star size={18} />}
          {isSubmitting ? tx(T.s4_submitting) : tx(T.s4_submit)}
        </button>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="max-w-2xl mx-auto py-20 px-6 text-center space-y-12">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="w-24 h-24 bg-gold rounded-xl flex items-center justify-center mx-auto shadow-2xl shadow-gold/30">
        <CheckCircle2 size={64} className="text-luxury-black" />
      </motion.div>
      
      <div className="space-y-4">
        <h1 className="text-5xl font-serif text-white">{tx(T.s5_title)}</h1>
        <p className="text-white/60 font-sans font-light text-xl leading-relaxed">
          {tx(T.s5_body)} <span className="text-gold font-semibold">{formData.whatsapp}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 pt-12">
        {/* v1.5: primary CTA — go straight to the supplier dashboard. Most
            suppliers will want to see their application in the dashboard
            right away, so this is the prominent top action. */}
        {onGoToDashboard && (
          <button
            type="button"
            onClick={onGoToDashboard}
            className="w-full py-6 bg-gold text-luxury-black rounded font-medium text-xs tracking-wide flex items-center justify-center gap-3 hover:bg-white transition-all shadow-2xl shadow-gold/20"
          >
            {tx(T.s5_dashboard)}
            <ArrowRight size={18} />
          </button>
        )}
        <a
          href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-6 bg-emerald-500 text-white rounded font-medium text-xs tracking-wide flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20"
        >
          <MessageSquare size={18} /> {tx(T.s5_whatsapp)}
        </a>
        <button
          onClick={() => onBack ? onBack() : window.location.href = '/'}
          className="w-full py-6 bg-white/5 border border-white/10 text-white rounded font-medium text-xs tracking-wide flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
        >
          {tx(T.s5_explore)} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-luxury-black pb-40 relative text-text-main">
      {/* v1.5 Home Button — moved up and given a higher z-index so it sits
          above the sticky stepper. The stepper fills the top bar, the home
          button is a small floating chip at the top-left corner. */}
      <div className="absolute top-4 left-4 sm:top-4 sm:left-6 z-[70]">
        <button
          onClick={() => onBack ? onBack() : window.location.href = '/'}
          className="flex items-center gap-2 px-5 py-2.5 bg-luxury-slate/80 backdrop-blur-md border border-border-main rounded-full text-[11px] font-sans uppercase tracking-tight font-semibold hover:bg-luxury-slate transition-all text-text-main shadow-sm"
        >
          <Home size={14} /> {tx(T.back_home)}
        </button>
      </div>

      {/* v1.5 Stepper — proper step indicator with checkmarks for completed
          steps and a highlighted current step. Replaces the thin gold bar
          that shipped in v1.0. Sticky at the top, low z-index so it sits
          above page content but below the home button. Hidden on success. */}
      {step < 5 && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-luxury-black/80 backdrop-blur-md border-b border-border-main/50">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-2">
              {STEPS.slice(0, 4).map((label, i) => {
                const stepNum = i + 1;
                const isComplete = step > stepNum;
                const isCurrent = step === stepNum;
                const isLast = i === 3;
                return (
                  <React.Fragment key={label.EN}>
                    <div className="flex items-center gap-3 shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                          isComplete
                            ? 'bg-gold text-luxury-black'
                            : isCurrent
                            ? 'bg-gold/20 text-gold border-2 border-gold'
                            : 'bg-white/5 text-text-main/30 border border-border-main'
                        }`}
                      >
                        {isComplete ? <Check size={14} /> : stepNum}
                      </div>
                      <span
                        className={`text-[11px] font-sans uppercase tracking-widest font-semibold hidden sm:inline transition-colors ${
                          isCurrent ? 'text-gold' : isComplete ? 'text-text-main/60' : 'text-text-main/30'
                        }`}
                      >
                        {tx(label)}
                      </span>
                    </div>
                    {!isLast && (
                      <div className="flex-1 h-px bg-border-main relative overflow-hidden">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-gold"
                          initial={false}
                          animate={{ width: step > stepNum ? '100%' : '0%' }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="pt-40 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
          >
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
