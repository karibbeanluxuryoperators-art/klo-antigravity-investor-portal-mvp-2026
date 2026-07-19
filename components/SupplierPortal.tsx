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

const STEPS = [
  "Welcome",
  "Profile",
  "Availability",
  "Review",
  "Success"
];

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

  const nextStep = () => {
    setDirection(1);
    setStep(s => Math.min(s + 1, 5));
  };

  const prevStep = () => {
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
      setSubmitError(error.message || 'An unexpected error occurred during submission.');
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
        <h1 className="text-5xl font-serif italic tracking-wide text-text-main">Become a KLO Verified Partner</h1>
        <p className="text-text-main/60 font-sans font-light text-xl max-w-2xl mx-auto leading-relaxed">
          List your villa, yacht, aircraft, vehicle fleet, or staff with the Caribbean's premier ultra-luxury platform.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {[
          { id: 'VILLA', label: 'Villa Owner', icon: Home, color: 'bg-gold/10 text-gold' },
          { id: 'YACHT', label: 'Yacht / Boat Operator', icon: Ship, color: 'bg-text-main/5 text-text-main/60' },
          { id: 'AVIATION', label: 'Private Aviation', icon: Plane, color: 'bg-text-main/5 text-text-main/70' },
          { id: 'STAFF', label: 'Staffing & Services', icon: Users, color: 'bg-text-main/5 text-text-main/50' },
          { id: 'GROUND', label: 'Ground Transport', icon: Car, color: 'bg-text-main/5 text-text-main/40' },
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
            <h3 className="text-xl font-sans font-medium text-text-main">{item.label}</h3>
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
            {lang === 'EN' ? 'Already a partner?' : lang === 'ES' ? '¿Ya eres socio?' : 'Já é parceiro?'}{' '}
            <button
              type="button"
              onClick={onGoToLogin}
              className="text-gold hover:text-white font-semibold transition-colors underline underline-offset-2"
            >
              {lang === 'EN' ? 'Sign in to your dashboard' : lang === 'ES' ? 'Inicia sesión en tu panel' : 'Entre no seu painel'}
            </button>
          </p>
        )}
        <p className="text-text-main/30 text-[11px] italic">
          {lang === 'EN'
            ? 'Your progress is saved automatically — come back any time to finish.'
            : lang === 'ES'
            ? 'Tu progreso se guarda automáticamente — vuelve cuando quieras para terminar.'
            : 'Seu progresso é salvo automaticamente — volte a qualquer momento para concluir.'}
        </p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif italic tracking-wide text-text-main">Business Profile</h2>
        <div className="px-4 py-1 bg-gold/10 text-gold rounded text-[11px] font-sans font-semibold uppercase tracking-tight">
          {type} Partner
        </div>
      </div>

      <div className="bg-luxury-slate border border-border-main rounded-2xl p-10 space-y-10">
        {/* Common Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Business / Asset Name</label>
            <input name="business_name" value={formData.business_name} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder="e.g. Villa Serenity" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Contact Name</label>
            <input name="contact_name" value={formData.contact_name} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder="Full Name" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Email Address</label>
            <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder="email@example.com" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">WhatsApp Number</label>
            <input name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder="+57 300..." />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Location</label>
            <select name="location" value={formData.location} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light appearance-none text-text-main">
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Years of Experience</label>
            <input name="experience" type="number" value={formData.experience} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder="5" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Description (Max 500 chars)</label>
          <textarea name="description" maxLength={500} value={formData.description} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light h-32 resize-none text-text-main" placeholder="Describe your luxury offering..." />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Primary Photo URL</label>
          <div className="relative">
            <input name="photo_url" value={formData.photo_url} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 pl-14 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder="https://..." />
            <Camera className="absolute left-6 top-1/2 -translate-y-1/2 text-text-main/20" size={20} />
          </div>
          <p className="text-[11px] text-text-main/30 italic font-sans">Full photo upload coming soon</p>
        </div>

        <div className="h-[1px] bg-border-main w-full" />

        {/* Type Specific Fields */}
        {type === 'VILLA' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Bedrooms</label>
                <input name="bedrooms" type="number" value={formData.bedrooms} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Max Guests</label>
                <input name="max_guests" type="number" value={formData.max_guests} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Price per Night (USD)</label>
                <input name="price_per_night" type="number" value={formData.price_per_night} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Amenities</label>
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
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Vessel Length (ft)</label>
                <input name="vessel_length" type="number" value={formData.vessel_length} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Max Guests</label>
                <input name="max_guests" type="number" value={formData.max_guests} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Price per Day (USD)</label>
                <input name="price_per_day" type="number" value={formData.price_per_day} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Home Port</label>
                <input name="home_port" value={formData.home_port} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Crew Included?</label>
                <div className="flex gap-4">
                  {['yes', 'no'].map(o => (
                    <button key={o} onClick={() => setFormData((prev: any) => ({ ...prev, crew_included: o }))} className={`flex-1 py-4 rounded-xl border text-[11px] font-sans uppercase tracking-tight transition-all ${formData.crew_included === o ? 'bg-gold border-gold text-luxury-black font-semibold' : 'border-border-main text-text-main/60'}`}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Features</label>
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
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Aircraft Type</label>
                <select name="aircraft_type" value={formData.aircraft_type} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light appearance-none text-text-main">
                  {AIRCRAFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Tail Number</label>
                <input name="tail_number" value={formData.tail_number} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Max Passengers</label>
                <input name="max_passengers" type="number" value={formData.max_passengers} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Price per Hour (USD)</label>
                <input name="price_per_hour" type="number" value={formData.price_per_hour} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Home Base (IATA)</label>
                <input name="home_base" value={formData.home_base} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder="CTG" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Range (nm)</label>
                <input name="range" type="number" value={formData.range} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
            </div>
          </div>
        )}

        {type === 'STAFF' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Role</label>
                <select name="role" value={formData.role} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light appearance-none text-text-main">
                  {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Daily Rate (USD)</label>
                <input name="daily_rate" type="number" value={formData.daily_rate} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Languages Spoken</label>
              <div className="flex flex-wrap gap-4">
                {LANGUAGES.map(l => (
                  <button key={l} onClick={() => handleCheckboxChange('languages', l)} className={`w-16 h-16 rounded-xl border text-[11px] font-sans font-semibold transition-all ${formData.languages.includes(l) ? 'bg-gold border-gold text-luxury-black' : 'border-border-main hover:border-gold/30 text-text-main/60'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Certifications</label>
              <input name="certifications" value={formData.certifications} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder="e.g. Michelin Star, PADI Instructor..." />
            </div>
          </div>
        )}

        {type === 'GROUND' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Vehicle Type</label>
                <select name="vehicle_type" value={formData.vehicle_type} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light appearance-none text-text-main">
                  {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Number of Passengers</label>
                <input name="max_passengers_ground" type="number" value={formData.max_passengers_ground} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Price per Day (USD)</label>
                <input name="price_per_day_ground" type="number" value={formData.price_per_day_ground} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">License Plate</label>
                <input name="license_plate" value={formData.license_plate} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder="e.g. ABC-1234" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Driver Included?</label>
                <div className="flex gap-4">
                  {['yes', 'no'].map(o => (
                    <button key={o} onClick={() => setFormData((prev: any) => ({ ...prev, driver_included: o }))} className={`flex-1 py-4 rounded-xl border text-[11px] font-sans uppercase tracking-tight transition-all ${formData.driver_included === o ? 'bg-gold border-gold text-luxury-black font-semibold' : 'border-border-main text-text-main/60'}`}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Is this vehicle armored?</label>
                  </div>
                  <p className="text-xs text-text-main/40 font-light">Does the vehicle have ballistic protection?</p>
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
                <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Driver Languages Spoken</label>
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
            <ChevronLeft size={16} /> Back
          </button>
          <button onClick={nextStep} className="px-12 py-4 bg-gold text-luxury-black rounded font-medium text-xs tracking-wide flex items-center gap-3 hover:bg-white transition-all">
            Continue <ChevronRight size={16} />
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
          <h2 className="text-4xl font-serif text-text-main">Connect Your Availability</h2>
          <p className="text-text-main/40 font-light">Choose how you want to manage your bookings.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-luxury-slate border border-border-main rounded-2xl p-10 space-y-8 flex flex-col items-center text-center opacity-60">
            <div className="w-20 h-20 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500">
              <Globe size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-serif text-text-main">Connect Google Calendar</h3>
              <p className="text-xs text-text-main/40 font-light leading-relaxed">
                Your bookings and blocked dates will sync automatically every 24 hours.
              </p>
            </div>
            <button 
              disabled
              className="w-full py-4 border border-border-main rounded-xl text-[11px] font-sans font-semibold uppercase tracking-tight transition-all flex items-center justify-center gap-3 text-text-main/20 cursor-not-allowed"
            >
              <ExternalLink size={16} />
              Connect Google
            </button>
            <p className="text-[11px] text-gold font-sans font-semibold uppercase tracking-tight">
              You can connect Google Calendar after your application is approved
            </p>
          </div>

          <div className="bg-luxury-slate border border-border-main rounded-2xl p-10 space-y-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                <Calendar size={24} />
              </div>
              <h3 className="text-xl font-serif text-text-main">Set Manually</h3>
            </div>
            <div className="grid grid-cols-1 gap-8">
              {renderCalendarGrid(currentMonth, currentYear)}
            </div>
            <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-text-main">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full" /> Available</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full" /> Blocked</div>
            </div>
          </div>
        </div>

        <div className="bg-luxury-slate border border-border-main rounded-2xl p-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-sans font-medium text-text-main">Seasonal Pricing</h3>
              <p className="text-xs text-text-main/40 font-light">Do you have different pricing by season?</p>
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
                  <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">High Season (Dec-Apr)</label>
                  <div className="relative">
                    <input name="high_season_price" type="number" value={formData.high_season_price} onChange={handleInputChange} className="w-full bg-luxury-slate/50 border border-border-main rounded-lg py-4 px-6 pl-12 focus:outline-none focus:border-gold/50 transition-all font-light text-text-main" placeholder="0" />
                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-text-main/20" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Low Season (May-Nov)</label>
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
            <ChevronLeft size={16} /> Back
          </button>
          <button onClick={nextStep} className="px-12 py-4 bg-gold text-luxury-black rounded font-medium text-xs tracking-wide flex items-center gap-3 hover:bg-white transition-all">
            Continue <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-serif text-text-main">Review & Submit</h2>
        <p className="text-text-main/40 font-light">Please verify all information before submitting for verification.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-luxury-slate border border-border-main rounded-2xl p-10 space-y-8">
          <h3 className="text-xl font-serif border-b border-border-main pb-4 text-text-main">Business Details</h3>
          <div className="space-y-4 text-text-main">
            {[
              { label: 'Business', value: formData.business_name },
              { label: 'Contact', value: formData.contact_name },
              { label: 'Email', value: formData.email },
              { label: 'WhatsApp', value: formData.whatsapp },
              { label: 'Location', value: formData.location },
              { label: 'Type', value: type },
            ].map(i => (
              <div key={i.label} className="flex justify-between items-center">
                <span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">{i.label}</span>
                <span className="text-sm font-medium">{i.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-luxury-slate border border-border-main rounded-2xl p-10 space-y-8">
          <h3 className="text-xl font-sans font-medium border-b border-border-main pb-4 text-text-main">Asset Details</h3>
          <div className="space-y-4">
            {type === 'VILLA' && (
              <>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Bedrooms</span><span className="text-sm font-medium text-text-main">{formData.bedrooms}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Guests</span><span className="text-sm font-medium text-text-main">{formData.max_guests}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Price</span><span className="text-sm font-medium text-text-main">${formData.price_per_night}/night</span></div>
              </>
            )}
            {type === 'YACHT' && (
              <>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Length</span><span className="text-sm font-medium text-text-main">{formData.vessel_length}ft</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Guests</span><span className="text-sm font-medium text-text-main">{formData.max_guests}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Price</span><span className="text-sm font-medium text-text-main">${formData.price_per_day}/day</span></div>
              </>
            )}
            {type === 'AVIATION' && (
              <>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Type</span><span className="text-sm font-medium text-text-main">{formData.aircraft_type}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Tail #</span><span className="text-sm font-medium text-text-main">{formData.tail_number}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Price</span><span className="text-sm font-medium text-text-main">${formData.price_per_hour}/hour</span></div>
              </>
            )}
            {type === 'STAFF' && (
              <>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Role</span><span className="text-sm font-medium text-text-main">{formData.role}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Rate</span><span className="text-sm font-medium text-text-main">${formData.daily_rate}/day</span></div>
              </>
            )}
            {type === 'GROUND' && (
              <>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Vehicle</span><span className="text-sm font-medium text-text-main">{formData.vehicle_type}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Passengers</span><span className="text-sm font-medium text-text-main">{formData.max_passengers_ground}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Plate</span><span className="text-sm font-medium text-text-main">{formData.license_plate}</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Price</span><span className="text-sm font-medium text-text-main">${formData.price_per_day_ground}/day</span></div>
                <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Driver</span><span className="text-sm font-medium font-sans text-text-main">{formData.driver_included}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Armored</span>
                  <span className="text-sm font-medium flex items-center gap-2 text-text-main">
                    {formData.is_armored ? 'YES' : 'NO'}

                  </span>
                </div>
                {formData.driver_included === 'yes' && (
                  <div className="flex justify-between items-center"><span className="text-[11px] font-sans uppercase tracking-tight text-text-main/40 font-semibold">Languages</span><span className="text-sm font-medium text-text-main">{formData.driver_languages.join(', ')}</span></div>
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
          <h3 className="text-xl font-sans font-medium text-text-main">KLO Partnership Terms</h3>
        </div>
        <p className="text-sm text-text-main/60 font-light leading-relaxed">
          {lang === 'EN' 
            ? "As a KLO Verified Partner, you retain 80% of every booking. KLO's 20% management fee covers client acquisition, platform access, payment processing, and dedicated concierge support. Payouts are processed within 48 hours of guest check-in via Stripe. You will have access to a partner dashboard to track bookings and revenue in real time."
            : lang === 'ES'
            ? "Como Socio Verificado de KLO, usted retiene el 80% de cada reserva. La tarifa de gestión del 20% de KLO cubre la adquisición de clientes, acceso a la plataforma, procesamiento de pagos y soporte de conserjería dedicado. Los pagos se procesan dentro de las 48 horas posteriores al check-in del huésped a través de Stripe."
            : "Como Parceiro Verificado KLO, você retém 80% de cada reserva. A taxa de gestão de 20% da KLO cobre aquisição de clientes, acesso à plataforma, processamento de pagamentos e suporte de concierge dedicado. Os pagamentos são processados em até 48 horas após o check-in do hóspede via Stripe."}
        </p>
        <label className="flex items-center gap-4 cursor-pointer group">
          <div 
            onClick={() => setAgreedToTerms(!agreedToTerms)}
            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${agreedToTerms ? 'bg-gold border-gold' : 'border-border-main group-hover:border-gold/50'}`}
          >
            {agreedToTerms && <Check size={16} className="text-luxury-black" />}
          </div>
          <span className="text-[11px] font-sans uppercase tracking-tight font-semibold text-text-main">I agree to KLO Partnership Terms</span>
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
          <ChevronLeft size={16} /> Back
        </button>
        <button 
          onClick={handleSubmit}
          disabled={!agreedToTerms || isSubmitting}
          className="px-16 py-6 bg-gold text-luxury-black rounded font-medium text-xs tracking-wide flex items-center gap-3 hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-gold/20"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Star size={18} />}
          Submit for Verification
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
        <h1 className="text-5xl font-serif text-white">Application Received</h1>
        <p className="text-white/60 font-sans font-light text-xl leading-relaxed">
          Our team will verify your assets within 48 hours. You will receive a WhatsApp confirmation at <span className="text-gold font-semibold">{formData.whatsapp}</span>.
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
            {lang === 'EN' ? 'Go to your dashboard' : lang === 'ES' ? 'Ir a tu panel' : 'Ir para o seu painel'}
            <ArrowRight size={18} />
          </button>
        )}
        <a
          href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-6 bg-emerald-500 text-white rounded font-medium text-xs tracking-wide flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20"
        >
          <MessageSquare size={18} /> Contact via WhatsApp
        </a>
        <button
          onClick={() => onBack ? onBack() : window.location.href = '/'}
          className="w-full py-6 bg-white/5 border border-white/10 text-white rounded font-medium text-xs tracking-wide flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
        >
          Explore KLO Marketplace <ArrowRight size={18} />
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
          <Home size={14} /> Back to Home
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
                  <React.Fragment key={label}>
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
                        {label}
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
