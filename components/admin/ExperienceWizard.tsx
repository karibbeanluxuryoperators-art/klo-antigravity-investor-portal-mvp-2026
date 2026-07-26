// components/admin/ExperienceWizard.tsx
// v1.8.0 Step 19: Phase B of the bundling roadmap. Multi-step wizard for
// /admin → Experiencias. Replaces the flat form with a guided flow.
//
// Steps:
//   1. Basics     — slug, title, eyebrow, status, featured, display order
//   2. Pillars    — pick 1-5 pillars (multi-select chips)
//   3. Assets     — per pillar, multi-select assets from that pillar
//   4. Service    — KLO seamless service fee + markup + live price preview
//   5. Marketing  — summary, description, hero, gallery, itinerary
//   6. Review     — summary, save draft / publish
//
// The wizard collects everything in a single in-memory state and only hits
// the API once at the end (in the Review step). This avoids partial saves
// and lets the user navigate freely between steps.
//
// Trilingual EN/ES/PT throughout. Dark theme matching the rest of /admin.

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronLeft, ChevronRight, Loader2, Check, Sparkles,
  Plane, Ship, Building2, Users, Car, Image as ImageIcon, AlertCircle,
} from 'lucide-react';
import { TrilingualField } from './TrilingualField';
import { ImageField } from './ImageField';
import { ItineraryField } from './ItineraryField';

// ── Types ──────────────────────────────────────────────────────────────

export type Pillar = 'AVIATION' | 'YACHTS' | 'LODGING' | 'STAFF' | 'TRANSPORT';

const PILLARS: Pillar[] = ['AVIATION', 'YACHTS', 'LODGING', 'STAFF', 'TRANSPORT'];

const PILLAR_ICONS: Record<Pillar, React.ElementType> = {
  AVIATION: Plane,
  YACHTS: Ship,
  LODGING: Building2,
  STAFF: Users,
  TRANSPORT: Car,
};

interface AssetSummary {
  id: string;
  name: string;
  pillar: Pillar;
  cost_to_klo: number | null;
  cost_currency: string;
  supplier_id: string | null;
  supplier_name?: string;
  capacity: number | null;
  location: string | null;
  description_en?: string;
  photos?: string[];
}

interface ExperienceFormState {
  // Step 1: basics
  id: string;
  title: { EN: string; ES: string; PT: string };
  eyebrow: { EN: string; ES: string; PT: string };
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  featured: boolean;
  display_order: number;

  // Step 2: pillars
  pillars: Pillar[];

  // Step 3: assets (asset_ids that are in the experience)
  asset_ids: string[];

  // Step 4: KLO service fee + markup
  klo_service_fee: number;
  klo_markup_pct: number;
  bundle_price: number | null; // override; null = auto-calc

  // Step 5: marketing
  summary: { EN: string; ES: string; PT: string };
  description: { EN: string; ES: string; PT: string };
  hero_image: string | null;
  gallery: string[];
  itinerary: any[];

  // Step 6: misc
  curated_by_email: string;
  curated_by_role: 'admin' | 'supplier';
  is_supplier_published: boolean;
}

interface ExperienceWizardProps {
  initial: Partial<ExperienceFormState>;
  isCreating: boolean;
  lang: 'EN' | 'ES' | 'PT';
  bearer: string;
  signedInEmail?: string | null;
  onClose: () => void;
  onSaved: (saved: any) => void;
}

const STEPS = ['basics', 'pillars', 'assets', 'service', 'marketing', 'review'] as const;
type StepKey = typeof STEPS[number];

// ── i18n ────────────────────────────────────────────────────────────────

const T = {
  // Step labels (in the stepper)
  step_basics:    { EN: 'Basics',     ES: 'Básicos',     PT: 'Básicos' },
  step_pillars:   { EN: 'Pillars',    ES: 'Pilares',     PT: 'Pilares' },
  step_assets:    { EN: 'Assets',     ES: 'Servicios',   PT: 'Serviços' },
  step_service:   { EN: 'Service',    ES: 'Servicio',    PT: 'Serviço' },
  step_marketing: { EN: 'Marketing',  ES: 'Marketing',   PT: 'Marketing' },
  step_review:    { EN: 'Review',     ES: 'Revisar',     PT: 'Revisar' },
  // Buttons
  back:      { EN: 'Back',      ES: 'Atrás',     PT: 'Voltar' },
  next:      { EN: 'Next',      ES: 'Siguiente', PT: 'Próximo' },
  save:      { EN: 'Save Draft', ES: 'Guardar Borrador', PT: 'Salvar Rascunho' },
  publish:   { EN: 'Publish',   ES: 'Publicar',  PT: 'Publicar' },
  cancel:    { EN: 'Cancel',    ES: 'Cancelar',  PT: 'Cancelar' },
  saving:    { EN: 'Saving…',   ES: 'Guardando…',PT: 'Salvando…' },
  // Step 1: basics
  slug:        { EN: 'Slug (URL)',     ES: 'Slug (URL)',     PT: 'Slug (URL)' },
  slugHint:    { EN: 'Lowercase, no spaces. e.g. cartagena-week', ES: 'Minúsculas, sin espacios. ej. semana-cartagena', PT: 'Minúsculas, sem espaços. ex. semana-cartagena' },
  title:       { EN: 'Title',          ES: 'Título',         PT: 'Título' },
  eyebrow:     { EN: 'Eyebrow (e.g. "7 Days · 3 Pillars")', ES: 'Etiqueta (ej. "7 Días · 3 Pilares")', PT: 'Etiqueta (ex. "7 Dias · 3 Pilares")' },
  status:      { EN: 'Status',         ES: 'Estado',         PT: 'Estado' },
  featured:    { EN: 'Featured on home', ES: 'Destacado en home', PT: 'Destaque na home' },
  displayOrder:{ EN: 'Display order (lower = first)', ES: 'Orden (menor = primero)', PT: 'Ordem (menor = primeiro)' },
  // Step 2: pillars
  pickPillars: { EN: 'Pick 1-5 pillars', ES: 'Elige 1-5 pilares', PT: 'Escolha 1-5 pilares' },
  pillarsHint: { EN: 'Each pillar adds a step in Step 3 to pick specific assets.', ES: 'Cada pilar agrega un paso en el Step 3 para elegir servicios específicos.', PT: 'Cada pilar adiciona um passo no Step 3 para escolher serviços específicos.' },
  // Step 3: assets
  pickAssets:  { EN: 'Pick assets per pillar', ES: 'Elige servicios por pilar', PT: 'Escolha serviços por pilar' },
  noAssets:    { EN: 'No assets found for this pillar. Add assets in /admin → Servicios first.', ES: 'No hay servicios para este pilar. Agrega servicios en /admin → Servicios primero.', PT: 'Não há serviços para este pilar. Adicione serviços em /admin → Serviços primeiro.' },
  selectedAssets: { EN: 'Selected', ES: 'Seleccionados', PT: 'Selecionados' },
  cost:        { EN: 'Cost',           ES: 'Costo',          PT: 'Custo' },
  capacity:    { EN: 'Capacity',       ES: 'Capacidad',      PT: 'Capacidade' },
  // Step 4: KLO service
  kloServiceFee:    { EN: 'KLO Service Fee (USD)', ES: 'Tarifa Servicio KLO (USD)', PT: 'Taxa Serviço KLO (USD)' },
  kloServiceFeeHint:{ EN: 'Champagne, red carpet, butler, seamless transitions between providers. This is KLO\'s only revenue source.',
                       ES: 'Champagne, tapete rojo, mayordomo, transiciones entre proveedores. Esta es la única fuente de ingresos KLO.',
                       PT: 'Champagne, tapete vermelho, mordomo, transições entre fornecedores. Esta é a única fonte de receita KLO.' },
  kloMarkupPct:     { EN: 'KLO Markup % (on service fee)', ES: 'Markup KLO % (sobre tarifa)', PT: 'Markup KLO % (sobre taxa)' },
  kloMarkupHint:    { EN: 'Default 10%. Suppliers don\'t see this. 100% goes to KLO.',
                       ES: 'Default 10%. Los proveedores no lo ven. 100% va a KLO.',
                       PT: 'Default 10%. Os fornecedores não veem. 100% vai para KLO.' },
  overrideTotal:    { EN: 'Override Total (USD, optional)', ES: 'Override Total (USD, opcional)', PT: 'Override Total (USD, opcional)' },
  overrideTotalHint:{ EN: 'Leave empty to auto-calc: sum(assets.cost) + klo_service_fee × (1 + klo_markup/100). Set to override for premium bundles.',
                       ES: 'Deja vacío para auto-calcular. Setea para override (ej. bundles premium).',
                       PT: 'Deixe vazio para auto-calcular. Sete para override (ex. bundles premium).' },
  // Price breakdown labels
  priceBreakdown:   { EN: 'Price Breakdown', ES: 'Desglose de Precio', PT: 'Detalhamento do Preço' },
  suppliersCost:    { EN: 'Suppliers (cost pass-through)', ES: 'Proveedores (costo directo)', PT: 'Fornecedores (custo direto)' },
  kloServiceLabel:  { EN: 'KLO seamless service', ES: 'Servicio seamless KLO', PT: 'Serviço seamless KLO' },
  kloMarkupLabel:    { EN: 'KLO markup', ES: 'Markup KLO', PT: 'Markup KLO' },
  total:            { EN: 'TOTAL (client pays)', ES: 'TOTAL (cliente paga)', PT: 'TOTAL (cliente paga)' },
  kloRevenue:       { EN: 'KLO earns', ES: 'KLO gana', PT: 'KLO ganha' },
  // Step 5: marketing
  summary:     { EN: 'Summary (50 words, shown on card)', ES: 'Resumen (50 palabras, mostrado en la card)', PT: 'Resumo (50 palavras, mostrado no card)' },
  description: { EN: 'Full description (shown on detail page)', ES: 'Descripción completa (mostrada en detail)', PT: 'Descrição completa (mostrada em detail)' },
  hero:        { EN: 'Hero image (1200x800 recommended)', ES: 'Imagen principal (1200x800 recomendado)', PT: 'Imagem principal (1200x800 recomendado)' },
  gallery:     { EN: 'Gallery (up to 5 images)', ES: 'Galería (hasta 5 imágenes)', PT: 'Galeria (até 5 imagens)' },
  itinerary:   { EN: 'Itinerary (day-by-day)', ES: 'Itinerario (día a día)', PT: 'Roteiro (dia a dia)' },
  // Step 6: review
  reviewTitle: { EN: 'Review & publish', ES: 'Revisar y publicar', PT: 'Revisar e publicar' },
  reviewHint:  { EN: 'Everything looks good? Publish to make it visible on the public site.', ES: '¿Todo se ve bien? Publica para que sea visible en el sitio público.', PT: 'Tudo certo? Publique para que fique visível no site público.' },
  willPublish: { EN: 'Will be published immediately', ES: 'Se publicará inmediatamente', PT: 'Será publicado imediatamente' },
  saveAsDraft: { EN: 'Will be saved as draft (not visible on public site)', ES: 'Se guardará como borrador (no visible en el sitio público)', PT: 'Será salvo como rascunho (não visível no site público)' },
  // Misc
  required:    { EN: 'Required', ES: 'Requerido', PT: 'Obrigatório' },
  pickAtLeast: { EN: 'Pick at least one', ES: 'Elige al menos uno', PT: 'Escolha pelo menos um' },
  step:        { EN: 'Step', ES: 'Paso', PT: 'Passo' },
  of:          { EN: 'of', ES: 'de', PT: 'de' },
  error_required: { EN: 'This field is required', ES: 'Este campo es requerido', PT: 'Este campo é obrigatório' },
  error_pick_pillar: { EN: 'Pick at least 1 pillar', ES: 'Elige al menos 1 pilar', PT: 'Escolha pelo menos 1 pilar' },
  error_pick_asset:  { EN: 'Pick at least 1 asset in each selected pillar', ES: 'Elige al menos 1 servicio en cada pilar seleccionado', PT: 'Escolha pelo menos 1 serviço em cada pilar selecionado' },
};

// ── Helpers ─────────────────────────────────────────────────────────────

function emptyState(): ExperienceFormState {
  return {
    id: '',
    title: { EN: '', ES: '', PT: '' },
    eyebrow: { EN: '', ES: '', PT: '' },
    status: 'DRAFT',
    featured: false,
    display_order: 99,
    pillars: [],
    asset_ids: [],
    klo_service_fee: 0,
    klo_markup_pct: 10,
    bundle_price: null,
    summary: { EN: '', ES: '', PT: '' },
    description: { EN: '', ES: '', PT: '' },
    hero_image: null,
    gallery: [],
    itinerary: [],
    curated_by_email: '',
    curated_by_role: 'admin',
    is_supplier_published: false,
  };
}

function stateFromInitial(initial: Partial<ExperienceFormState>, signedInEmail?: string | null): ExperienceFormState {
  // The DB returns trilingual fields as flat columns: title_en/title_es/title_pt,
  // eyebrow_en/eyebrow_es/eyebrow_pt, etc. The wizard wants nested objects:
  // { EN, ES, PT }. We normalise here so the wizard never sees `undefined`.
  const pick = (en?: string | null, es?: string | null, pt?: string | null) => ({
    EN: en || '',
    ES: es || '',
    PT: pt || '',
  });
  const i: any = initial || {};
  return {
    ...emptyState(),
    ...i,
    title: i.title_en != null || i.title_es != null || i.title_pt != null
      ? pick(i.title_en, i.title_es, i.title_pt)
      : (i.title || { EN: '', ES: '', PT: '' }),
    eyebrow: pick(i.eyebrow_en, i.eyebrow_es, i.eyebrow_pt),
    summary: pick(i.summary_en, i.summary_es, i.summary_pt),
    description: pick(i.description_en, i.description_es, i.description_pt),
    pillars: (i.pillars as Pillar[]) || [],
    asset_ids: i.asset_ids || [],
    curated_by_email: i.curated_by_email || signedInEmail || '',
  };
}

function fmtMoney(n: number, currency: string = 'USD'): string {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

// ── Component ──────────────────────────────────────────────────────────

export const ExperienceWizard: React.FC<ExperienceWizardProps> = (props) => {
  // Destructure with explicit defaults so a missing or undefined prop doesn't
  // crash the wizard. Same pattern as the EntityEditor's `isCreating` — Vite's
  // production build can tree-shake destructured props that look "unused" in
  // some code paths, so we always read them from `props` to be safe.
  const initial = props.initial;
  const lang = props.lang;
  const bearer = props.bearer;
  const signedInEmail = props.signedInEmail;
  const onClose = props.onClose;
  const onSaved = props.onSaved;
  const isCreating = props.isCreating ?? true;  // default to "creating" — safer than false
  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState<ExperienceFormState>(() => stateFromInitial(initial, signedInEmail));
  const [saving, setSaving] = useState(false);
  const [assetsByPillar, setAssetsByPillar] = useState<Record<Pillar, AssetSummary[]>>({
    AVIATION: [], YACHTS: [], LODGING: [], STAFF: [], TRANSPORT: [],
  });
  const [assetsLoading, setAssetsLoading] = useState(false);

  // Pre-fetch all available assets on mount, partitioned by pillar. We do this
  // once because the catalog is small (<200 assets expected). When the user
  // reaches Step 3 the data is already there.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAssetsLoading(true);
      try {
        const res = await fetch('/api/assets?include_archived=true', {
          headers: { Authorization: `Bearer ${bearer}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as any[];
        if (cancelled) return;
        const grouped: Record<Pillar, AssetSummary[]> = {
          AVIATION: [], YACHTS: [], LODGING: [], STAFF: [], TRANSPORT: [],
        };
        for (const a of (data || [])) {
          if (a.pillar && grouped[a.pillar as Pillar]) {
            grouped[a.pillar as Pillar].push({
              id: a.id,
              name: a.name,
              pillar: a.pillar,
              cost_to_klo: a.cost_to_klo,
              cost_currency: a.cost_currency || 'USD',
              supplier_id: a.supplier_id,
              capacity: a.capacity,
              location: a.location,
              description_en: a.description_en || a.description, // fallback
              photos: a.photos,
            });
          }
        }
        setAssetsByPillar(grouped);
      } catch (e) {
        console.error('Failed to fetch assets', e);
      } finally {
        if (!cancelled) setAssetsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bearer]);

  // Map of selected assets (for the price preview in Step 4)
  const selectedAssetObjects = useMemo(() => {
    const allAssets = Object.values(assetsByPillar).flat();
    return form.asset_ids
      .map(id => allAssets.find(a => a.id === id))
      .filter((a): a is AssetSummary => Boolean(a));
  }, [form.asset_ids, assetsByPillar]);

  // Price calculation (live preview)
  const pricing = useMemo(() => {
    const suppliersCost = selectedAssetObjects.reduce((sum, a) => sum + (a.cost_to_klo || 0), 0);
    const markupMultiplier = 1 + (form.klo_markup_pct || 0) / 100;
    const kloServiceWithMarkup = (form.klo_service_fee || 0) * markupMultiplier;
    const autoTotal = suppliersCost + kloServiceWithMarkup;
    const total = form.bundle_price != null ? form.bundle_price : autoTotal;
    return {
      suppliersCost,
      kloServiceBase: form.klo_service_fee || 0,
      kloServiceWithMarkup,
      kloMarkupValue: (form.klo_service_fee || 0) * ((form.klo_markup_pct || 0) / 100),
      kloRevenue: kloServiceWithMarkup, // KLO's only revenue source in v0.5
      autoTotal,
      total,
    };
  }, [selectedAssetObjects, form.klo_service_fee, form.klo_markup_pct, form.bundle_price]);

  // Step validation
  const stepErrors = useMemo(() => {
    const errs: Record<StepKey, string | null> = {
      basics: !form.id || !form.title.EN ? T.error_required[lang] : null,
      pillars: form.pillars.length === 0 ? T.error_pick_pillar[lang] : null,
      assets: form.pillars.length > 0 && form.asset_ids.length === 0 ? T.error_pick_asset[lang] : null,
      service: null,
      marketing: null,
      review: null,
    };
    return errs;
  }, [form, lang]);

  const canProceed = stepErrors[STEPS[stepIdx]] === null;
  const isLastStep = stepIdx === STEPS.length - 1;

  const goNext = () => {
    if (canProceed && stepIdx < STEPS.length - 1) setStepIdx(stepIdx + 1);
  };
  const goBack = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  };

  // Save (draft or publish)
  const save = async (publish: boolean) => {
    setSaving(true);
    try {
      // Flatten trilingual objects to _en/_es/_pt columns (DB schema).
      // Leave the nested form on `form` so the UI state stays consistent.
      const body = {
        ...form,
        title_en: form.title.EN, title_es: form.title.ES, title_pt: form.title.PT,
        eyebrow_en: form.eyebrow.EN, eyebrow_es: form.eyebrow.ES, eyebrow_pt: form.eyebrow.PT,
        summary_en: form.summary.EN, summary_es: form.summary.ES, summary_pt: form.summary.PT,
        description_en: form.description.EN, description_es: form.description.ES, description_pt: form.description.PT,
        status: publish ? 'PUBLISHED' : form.status,
        pillars: form.pillars,
        asset_ids: form.asset_ids,
        bundle_price: form.bundle_price, // null = auto
      };
      const url = isCreating
        ? '/api/experiences'
        : `/api/experiences/${form.id}`;
      const method = isCreating ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      onSaved(data);
    } catch (e: any) {
      alert(`${T.saving[lang]} failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#0a1518] border border-white/10 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header — stepper */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-base font-serif italic text-white">
              {isCreating ? (lang === 'ES' ? 'Nueva experiencia' : lang === 'PT' ? 'Nova experiência' : 'New experience') : (form.title.EN || form.id)}
            </h2>
            <span className="text-[10px] text-white/40 uppercase tracking-[0.3em]">
              {T.step[lang]} {stepIdx + 1} {T.of[lang]} {STEPS.length} — {T[`step_${STEPS[stepIdx]}` as keyof typeof T][lang]}
            </span>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Stepper pills */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-white/10 overflow-x-auto">
          {STEPS.map((s, i) => {
            const Icon = (PILLAR_ICONS as any)[s] || Sparkles;
            const isActive = i === stepIdx;
            const isDone = i < stepIdx;
            return (
              <button
                key={s}
                onClick={() => i < stepIdx && setStepIdx(i)}
                disabled={i > stepIdx}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#B8963E]/15 text-[#B8963E] border border-[#B8963E]/40'
                    : isDone
                    ? 'text-emerald-400 hover:bg-white/5'
                    : 'text-white/30'
                }`}
              >
                {isDone ? <Check size={12} /> : <span>{i + 1}</span>}
                {T[`step_${s}` as keyof typeof T][lang]}
              </button>
            );
          })}
        </div>

        {/* Body — current step */}
        <div className="flex-1 overflow-y-auto p-6">
          {stepErrors[STEPS[stepIdx]] && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-400 shrink-0" />
              <p className="text-xs text-amber-200">{stepErrors[STEPS[stepIdx]]}</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={STEPS[stepIdx]}
              initial={{ x: 16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -16, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {STEPS[stepIdx] === 'basics' && (
                <StepBasics form={form} setForm={setForm} lang={lang} isCreating={isCreating} />
              )}
              {STEPS[stepIdx] === 'pillars' && (
                <StepPillars form={form} setForm={setForm} lang={lang} />
              )}
              {STEPS[stepIdx] === 'assets' && (
                <StepAssets
                  form={form} setForm={setForm} lang={lang}
                  assetsByPillar={assetsByPillar}
                  loading={assetsLoading}
                />
              )}
              {STEPS[stepIdx] === 'service' && (
                <StepService form={form} setForm={setForm} lang={lang} pricing={pricing} />
              )}
              {STEPS[stepIdx] === 'marketing' && (
                <StepMarketing form={form} setForm={setForm} lang={lang} bearer={bearer} />
              )}
              {STEPS[stepIdx] === 'review' && (
                <StepReview form={form} setForm={setForm} lang={lang} pricing={pricing} selectedAssets={selectedAssetObjects} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer — Back / Next / Save */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white px-3 py-2 transition-colors"
          >
            {T.cancel[lang]}
          </button>
          <div className="flex items-center gap-2 ml-auto">
            {stepIdx > 0 && (
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-white/80 hover:bg-white/5 text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                <ChevronLeft size={12} /> {T.back[lang]}
              </button>
            )}
            {!isLastStep ? (
              <button
                onClick={goNext}
                disabled={!canProceed}
                className="flex items-center gap-2 px-5 py-2 bg-[#B8963E] hover:bg-white hover:text-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {T.next[lang]} <ChevronRight size={12} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => save(false)}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white/80 hover:bg-white/5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={12} /> : null}
                  {T.save[lang]}
                </button>
                <button
                  onClick={() => save(true)}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-[#B8963E] hover:bg-white hover:text-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                  {T.publish[lang]}
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Step components ────────────────────────────────────────────────────

function StepBasics({ form, setForm, lang, isCreating }: { form: ExperienceFormState; setForm: (f: ExperienceFormState) => void; lang: 'EN' | 'ES' | 'PT'; isCreating: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">
          {T.slug[lang]} <span className="text-amber-400">*</span>
        </label>
        <input
          type="text"
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
          placeholder="cartagena-week"
          disabled={!isCreating}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8963E] disabled:opacity-50"
        />
        <p className="text-[10px] text-white/40 mt-1">{T.slugHint[lang]}</p>
      </div>

      <TrilingualField
        value={form.title}
        onChange={(title) => setForm({ ...form, title })}
        label={T.title[lang]}
        subKind="text"
        required
        maxLength={80}
        lang={lang}
      />

      <TrilingualField
        value={form.eyebrow}
        onChange={(eyebrow) => setForm({ ...form, eyebrow })}
        label={T.eyebrow[lang]}
        subKind="text"
        maxLength={60}
        lang={lang}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">{T.status[lang]}</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as any })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#B8963E]"
          >
            <option value="DRAFT">DRAFT</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">{T.displayOrder[lang]}</label>
          <input
            type="number"
            min={0}
            value={form.display_order}
            onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#B8963E]"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">{T.featured[lang]}</label>
          <button
            onClick={() => setForm({ ...form, featured: !form.featured })}
            className={`w-full px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
              form.featured
                ? 'bg-[#B8963E] text-white'
                : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
            }`}
          >
            {form.featured ? '★ ' + T.featured[lang] : '☆ ' + T.featured[lang]}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepPillars({ form, setForm, lang }: { form: ExperienceFormState; setForm: (f: ExperienceFormState) => void; lang: 'EN' | 'ES' | 'PT' }) {
  const toggle = (p: Pillar) => {
    setForm({
      ...form,
      pillars: form.pillars.includes(p)
        ? form.pillars.filter(x => x !== p)
        : [...form.pillars, p],
    });
  };
  return (
    <div>
      <p className="text-sm text-white/70 mb-2">{T.pickPillars[lang]}</p>
      <p className="text-xs text-white/40 mb-6">{T.pillarsHint[lang]}</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {PILLARS.map((p) => {
          const Icon = PILLAR_ICONS[p];
          const isSelected = form.pillars.includes(p);
          return (
            <button
              key={p}
              onClick={() => toggle(p)}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all ${
                isSelected
                  ? 'bg-[#B8963E]/15 border-[#B8963E]/60 text-[#B8963E]'
                  : 'bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20'
              }`}
            >
              <Icon size={28} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{p}</span>
              {isSelected && <Check size={14} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepAssets({ form, setForm, lang, assetsByPillar, loading }: {
  form: ExperienceFormState;
  setForm: (f: ExperienceFormState) => void;
  lang: 'EN' | 'ES' | 'PT';
  assetsByPillar: Record<Pillar, AssetSummary[]>;
  loading: boolean;
}) {
  const toggleAsset = (id: string) => {
    setForm({
      ...form,
      asset_ids: form.asset_ids.includes(id)
        ? form.asset_ids.filter(x => x !== id)
        : [...form.asset_ids, id],
    });
  };

  return (
    <div>
      <p className="text-sm text-white/70 mb-6">{T.pickAssets[lang]}</p>
      {loading && <p className="text-xs text-white/40">Loading…</p>}
      <div className="space-y-6">
        {form.pillars.map((pillar) => {
          const Icon = PILLAR_ICONS[pillar];
          const list = assetsByPillar[pillar] || [];
          return (
            <div key={pillar}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={18} className="text-[#B8963E]" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/80">{pillar}</h3>
                <span className="text-[10px] text-white/40">({list.filter(a => form.asset_ids.includes(a.id)).length} {T.selectedAssets[lang]})</span>
              </div>
              {list.length === 0 ? (
                <p className="text-xs text-white/40 italic">{T.noAssets[lang]}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {list.map((a) => {
                    const isSelected = form.asset_ids.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleAsset(a.id)}
                        className={`text-left p-4 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-[#B8963E]/15 border-[#B8963E]/60'
                            : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white font-medium truncate">{a.name}</p>
                            <p className="text-[10px] text-white/40 mt-0.5">
                              {a.location || '—'} {a.capacity ? `· ${a.capacity} pax` : ''}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-mono text-[#B8963E]">{fmtMoney(a.cost_to_klo || 0, a.cost_currency)}</p>
                            <p className="text-[9px] text-white/30 uppercase">{T.cost[lang]}</p>
                          </div>
                          {isSelected && <Check size={16} className="text-[#B8963E] shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {form.pillars.length === 0 && (
          <p className="text-xs text-white/40 italic">← {T.pickPillars[lang]}</p>
        )}
      </div>
    </div>
  );
}

function StepService({ form, setForm, lang, pricing }: {
  form: ExperienceFormState;
  setForm: (f: ExperienceFormState) => void;
  lang: 'EN' | 'ES' | 'PT';
  pricing: { suppliersCost: number; kloServiceBase: number; kloServiceWithMarkup: number; kloMarkupValue: number; kloRevenue: number; autoTotal: number; total: number };
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">
          {T.kloServiceFee[lang]}
        </label>
        <input
          type="number"
          min={0}
          step={100}
          value={form.klo_service_fee}
          onChange={(e) => setForm({ ...form, klo_service_fee: parseFloat(e.target.value) || 0 })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#B8963E]"
        />
        <p className="text-[10px] text-white/40 mt-1">{T.kloServiceFeeHint[lang]}</p>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">
          {T.kloMarkupPct[lang]}
        </label>
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={form.klo_markup_pct}
          onChange={(e) => setForm({ ...form, klo_markup_pct: parseFloat(e.target.value) || 0 })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#B8963E]"
        />
        <p className="text-[10px] text-white/40 mt-1">{T.kloMarkupHint[lang]}</p>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">
          {T.overrideTotal[lang]}
        </label>
        <input
          type="number"
          min={0}
          step={100}
          value={form.bundle_price ?? ''}
          onChange={(e) => setForm({ ...form, bundle_price: e.target.value === '' ? null : parseFloat(e.target.value) || 0 })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#B8963E]"
        />
        <p className="text-[10px] text-white/40 mt-1">{T.overrideTotalHint[lang]}</p>
      </div>

      {/* Live price breakdown */}
      <div className="rounded-2xl border border-[#B8963E]/30 bg-[#B8963E]/[0.04] p-5 space-y-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#B8963E] mb-3">
          {T.priceBreakdown[lang]}
        </h3>
        <Row label={T.suppliersCost[lang]} value={fmtMoney(pricing.suppliersCost)} lang={lang} />
        <Row label={T.kloServiceLabel[lang]} value={fmtMoney(pricing.kloServiceBase)} lang={lang} />
        <Row label={T.kloMarkupLabel[lang]} value={fmtMoney(pricing.kloMarkupValue)} lang={lang} muted />
        <div className="border-t border-white/10 my-2"></div>
        <Row label={T.total[lang]} value={fmtMoney(pricing.total)} lang={lang} big />
        <p className="text-[10px] text-emerald-400 mt-2">
          ✓ {T.kloRevenue[lang]}: <span className="font-mono">{fmtMoney(pricing.kloRevenue)}</span>
        </p>
      </div>
    </div>
  );
}

function StepMarketing({ form, setForm, lang, bearer }: {
  form: ExperienceFormState;
  setForm: (f: ExperienceFormState) => void;
  lang: 'EN' | 'ES' | 'PT';
  bearer: string;
}) {
  return (
    <div className="space-y-6">
      <TrilingualField
        value={form.summary}
        onChange={(summary) => setForm({ ...form, summary })}
        label={T.summary[lang]}
        subKind="textarea"
        maxLength={500}
        lang={lang}
      />
      <TrilingualField
        value={form.description}
        onChange={(description) => setForm({ ...form, description })}
        label={T.description[lang]}
        subKind="textarea"
        maxLength={2000}
        rows={5}
        lang={lang}
      />
      <ImageField
        value={form.hero_image}
        onChange={(hero_image) => setForm({ ...form, hero_image })}
        label={T.hero[lang]}
        bearer={bearer}
        lang={lang}
      />
      <ImageField
        value={form.gallery}
        onChange={(gallery) => setForm({ ...form, gallery })}
        label={T.gallery[lang]}
        multiple
        max={5}
        bearer={bearer}
        lang={lang}
      />
      <ItineraryField
        value={form.itinerary}
        onChange={(itinerary) => setForm({ ...form, itinerary })}
        label={T.itinerary[lang]}
        lang={lang}
      />
    </div>
  );
}

function StepReview({ form, setForm, lang, pricing, selectedAssets }: {
  form: ExperienceFormState;
  setForm: (f: ExperienceFormState) => void;
  lang: 'EN' | 'ES' | 'PT';
  pricing: { suppliersCost: number; kloServiceBase: number; kloServiceWithMarkup: number; kloMarkupValue: number; kloRevenue: number; autoTotal: number; total: number };
  selectedAssets: AssetSummary[];
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-white/70">{T.reviewHint[lang]}</p>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
        <Row label="Slug" value={form.id} lang={lang} />
        <Row label="Title (EN)" value={form.title.EN} lang={lang} />
        <Row label="Status" value={form.status} lang={lang} />
        <Row label="Pillars" value={form.pillars.join(' · ') || '—'} lang={lang} />
        <Row label="Assets" value={`${selectedAssets.length} selected`} lang={lang} />
        <div className="border-t border-white/10"></div>
        <Row label={T.suppliersCost[lang]} value={fmtMoney(pricing.suppliersCost)} lang={lang} />
        <Row label={T.kloServiceLabel[lang]} value={fmtMoney(pricing.kloServiceBase)} lang={lang} />
        <Row label={T.kloMarkupLabel[lang]} value={`${form.klo_markup_pct}%`} lang={lang} />
        <div className="border-t border-white/10"></div>
        <Row label={T.total[lang]} value={fmtMoney(pricing.total)} lang={lang} big />
      </div>

      {form.status === 'PUBLISHED' ? (
        <p className="text-xs text-amber-300">⚠ {T.willPublish[lang]}</p>
      ) : (
        <p className="text-xs text-white/40">{T.saveAsDraft[lang]}</p>
      )}
    </div>
  );
}

function Row({ label, value, lang, big, muted }: { label: string; value: string; lang: 'EN' | 'ES' | 'PT'; big?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-[10px] font-bold uppercase tracking-widest ${muted ? 'text-white/40' : 'text-white/60'}`}>
        {label}
      </span>
      <span className={`${big ? 'text-2xl font-serif italic text-[#B8963E]' : 'text-sm font-mono text-white'} ${muted ? 'text-white/40' : ''} text-right truncate max-w-[60%]`}>
        {value}
      </span>
    </div>
  );
}
