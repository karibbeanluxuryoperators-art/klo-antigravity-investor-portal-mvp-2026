import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, UserPlus, Search,
  X, Check, Loader2, AlertCircle,
  Mail, Phone, MapPin,
  Star, Activity, Shield,
  Trash2, Edit3,
} from 'lucide-react';
import { getSupplierSession } from '../services/supabase';

// v1.8.0 Step 3.2: auth-aware fetch helper.
// Admin endpoints require `Authorization: Bearer <access_token>`. This helper
// grabs the current Supabase session and attaches the token. If no session,
// the request goes through unauthenticated (which will get a 403 from admin
// endpoints — that's the expected behavior).
async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const session = await getSupplierSession();
  const token = session?.access_token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(input, { ...init, headers });
}

// Local Language alias - see SupplierPortal.tsx for rationale
type Language = 'EN' | 'ES' | 'PT';

export interface ClientPreferences {
  dietary: string[];
  beverages: string[];
  temperature: string;
  interests: string[];
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  tier: 'UHNWI' | 'VVIP' | 'VIP';
  status: 'ACTIVE' | 'INACTIVE' | 'PROSPECT';
  preferences: ClientPreferences;
  past_experiences: number;
  total_spend: number;
  loyalty_points: number;
  notes: string | null;
  source: string | null;
  created_at: string;
  created_by: string | null;
}

interface ClientManagementProps {
  lang: Language;
}

// v1.8.0 Step 2: trilingual copy for the Clients tab.
const T_CLIENTS: Record<string, { EN: string; ES: string; PT: string }> = {
  search:           { EN: 'Search clients by name, email, or tier...',
                      ES: 'Buscar clientes por nombre, email o nivel...',
                      PT: 'Pesquisar clientes por nome, email ou nível...' },
  add_client:       { EN: 'Add New Client', ES: 'Añadir Nuevo Cliente', PT: 'Adicionar Novo Cliente' },
  empty:            { EN: 'No clients yet. Click "Add New Client" to register your first UHNWI guest.',
                      ES: 'Aún no hay clientes. Haz clic en "Añadir Nuevo Cliente" para registrar tu primer huésped UHNWI.',
                      PT: 'Ainda não há clientes. Clique em "Adicionar Novo Cliente" para registrar seu primeiro hóspede UHNWI.' },
  empty_filter:     { EN: 'No clients match your search.',
                      ES: 'Ningún cliente coincide con tu búsqueda.',
                      PT: 'Nenhum cliente corresponde à sua pesquisa.' },
  total_spend:      { EN: 'Total Lifetime Spend', ES: 'Gasto Total de por Vida', PT: 'Gasto Total Vitalício' },
  loyalty:          { EN: 'Loyalty Points', ES: 'Puntos de Lealtad', PT: 'Pontos de Fidelidade' },
  experiences:      { EN: 'Experiences', ES: 'Experiencias', PT: 'Experiências' },
  preferences:      { EN: 'Preferences', ES: 'Preferencias', PT: 'Preferências' },
  dietary:          { EN: 'Dietary Requirements', ES: 'Requisitos Dietéticos', PT: 'Requisitos Dietéticos' },
  beverages:        { EN: 'Preferred Beverages', ES: 'Bebidas Preferidas', PT: 'Bebidas Preferidas' },
  interests:        { EN: 'Interests', ES: 'Intereses', PT: 'Interesses' },
  temperature:      { EN: 'Cabin Temp', ES: 'Temp Cabina', PT: 'Temp Cabine' },
  intelligence:     { EN: 'Intelligence', ES: 'Inteligencia', PT: 'Inteligência' },
  contact:          { EN: 'Contact', ES: 'Contacto', PT: 'Contato' },
  notes:            { EN: 'Internal Notes', ES: 'Notas Internas', PT: 'Notas Internas' },
  notes_ph:         { EN: 'Anything your concierge team should know about this guest...',
                      ES: 'Lo que tu equipo de conserjería debe saber sobre este huésped...',
                      PT: 'O que sua equipe de concierge deve saber sobre este hóspede...' },
  // Modal
  new_guest:        { EN: 'New Guest Registration', ES: 'Registro de Nuevo Huésped', PT: 'Registro de Novo Hóspede' },
  edit_guest:       { EN: 'Edit Client Profile', ES: 'Editar Perfil de Cliente', PT: 'Editar Perfil de Cliente' },
  name:             { EN: 'Full Name', ES: 'Nombre Completo', PT: 'Nome Completo' },
  email:            { EN: 'Email', ES: 'Email', PT: 'Email' },
  phone:            { EN: 'Phone', ES: 'Teléfono', PT: 'Telefone' },
  whatsapp:         { EN: 'WhatsApp', ES: 'WhatsApp', PT: 'WhatsApp' },
  tier:             { EN: 'Client Tier', ES: 'Nivel de Cliente', PT: 'Nível do Cliente' },
  status:           { EN: 'Status', ES: 'Estado', PT: 'Status' },
  past_exp:         { EN: 'Past Experiences', ES: 'Experiencias Pasadas', PT: 'Experiências Passadas' },
  total_spend_lbl:  { EN: 'Total Spend (USD)', ES: 'Gasto Total (USD)', PT: 'Gasto Total (USD)' },
  loyalty_lbl:      { EN: 'Loyalty Points', ES: 'Puntos de Lealtad', PT: 'Pontos de Fidelidade' },
  source:           { EN: 'Source', ES: 'Origen', PT: 'Origem' },
  source_ph:        { EN: 'manual | lead | referral | backfill', ES: 'manual | lead | referido | backfill', PT: 'manual | lead | indicação | backfill' },
  // Preferences helpers
  press_enter:      { EN: 'Press Enter to add...', ES: 'Presiona Enter para añadir...', PT: 'Pressione Enter para adicionar...' },
  save:             { EN: 'Save Client', ES: 'Guardar Cliente', PT: 'Salvar Cliente' },
  cancel:           { EN: 'Cancel', ES: 'Cancelar', PT: 'Cancelar' },
  edit:             { EN: 'Edit', ES: 'Editar', PT: 'Editar' },
  delete:           { EN: 'Delete', ES: 'Eliminar', PT: 'Excluir' },
  confirm_delete:   { EN: 'Delete this client? Bookings will keep their records but the client_id link will be cleared.',
                      ES: '¿Eliminar este cliente? Las reservas mantendrán sus registros pero el link client_id se borrará.',
                      PT: 'Excluir este cliente? As reservas manterão seus registros mas o link client_id será removido.' },
  loading:          { EN: 'Loading clients...', ES: 'Cargando clientes...', PT: 'Carregando clientes...' },
  err_load:         { EN: 'Failed to load clients. The clients table may not exist yet — run db/migrations/2026-07-20_clients.sql in Supabase Studio.',
                      ES: 'Error cargando clientes. La tabla clients puede no existir aún — ejecuta db/migrations/2026-07-20_clients.sql en Supabase Studio.',
                      PT: 'Erro ao carregar clientes. A tabela clients pode não existir — execute db/migrations/2026-07-20_clients.sql no Supabase Studio.' },
  err_save:         { EN: 'Save failed', ES: 'Error al guardar', PT: 'Erro ao salvar' },
  err_delete:       { EN: 'Delete failed', ES: 'Error al eliminar', PT: 'Erro ao excluir' },
};

const t = (key: keyof typeof T_CLIENTS, lang: Language): string => {
  const entry = T_CLIENTS[key];
  return (entry && (entry[lang] || entry.EN)) || '';
};

const TIER_COLORS: Record<string, string> = {
  UHNWI: 'bg-[#B8963E]/20 text-[#B8963E] border-[#B8963E]/40',
  VVIP:  'bg-purple-500/15 text-purple-300 border-purple-500/30',
  VIP:   'bg-white/10 text-white/70 border-white/20',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  INACTIVE: 'bg-white/5 text-white/40 border-white/10',
  PROSPECT: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const emptyPrefs = (): ClientPreferences => ({
  dietary: [],
  beverages: [],
  temperature: '22°C',
  interests: [],
});

const formatSpend = (n: number, lang: Language): string => {
  const symbol = '$';
  const formatted = n.toLocaleString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US', { maximumFractionDigits: 0 });
  return `${symbol}${formatted}`;
};

export const ClientManagement: React.FC<ClientManagementProps> = ({ lang }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'UHNWI' | 'VVIP' | 'VIP'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Partial<Client> & { preferences: ClientPreferences }>({
    name: '', email: '', phone: '', whatsapp: '',
    tier: 'UHNWI', status: 'ACTIVE',
    preferences: emptyPrefs(),
    past_experiences: 0, total_spend: 0, loyalty_points: 0,
    notes: '', source: 'manual',
  });
  const [dietaryInput, setDietaryInput] = useState('');
  const [beverageInput, setBeverageInput] = useState('');
  const [interestInput, setInterestInput] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch('/api/clients');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Failed to load clients', e);
      setError(e?.message || 'load failed');
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = clients.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (
      c.name.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      c.tier.toLowerCase().includes(q)
    );
    const matchesTier = tierFilter === 'ALL' || c.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const openCreate = () => {
    setEditingClient(null);
    setForm({
      name: '', email: '', phone: '', whatsapp: '',
      tier: 'UHNWI', status: 'ACTIVE',
      preferences: emptyPrefs(),
      past_experiences: 0, total_spend: 0, loyalty_points: 0,
      notes: '', source: 'manual',
    });
    setDietaryInput('');
    setBeverageInput('');
    setInterestInput('');
    setIsModalOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditingClient(c);
    setForm({
      name: c.name, email: c.email || '', phone: c.phone || '', whatsapp: c.whatsapp || '',
      tier: c.tier, status: c.status,
      preferences: c.preferences || emptyPrefs(),
      past_experiences: c.past_experiences || 0,
      total_spend: c.total_spend || 0,
      loyalty_points: c.loyalty_points || 0,
      notes: c.notes || '',
      source: c.source || 'manual',
    });
    setDietaryInput('');
    setBeverageInput('');
    setInterestInput('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
  };

  const addPrefItem = (field: 'dietary' | 'beverages' | 'interests', value: string) => {
    const v = value.trim();
    if (!v) return;
    setForm(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [field]: [...prev.preferences[field], v],
      },
    }));
  };

  const removePrefItem = (field: 'dietary' | 'beverages' | 'interests', idx: number) => {
    setForm(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [field]: prev.preferences[field].filter((_, i) => i !== idx),
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setSubmitting(true);
    try {
      const body = {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        tier: form.tier,
        status: form.status,
        preferences: form.preferences,
        past_experiences: form.past_experiences || 0,
        total_spend: form.total_spend || 0,
        loyalty_points: form.loyalty_points || 0,
        notes: form.notes || null,
        source: form.source || 'manual',
      };
      const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
      const method = editingClient ? 'PATCH' : 'POST';
      const res = await authedFetch(url, {
        method,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      await fetchClients();
      setIsModalOpen(false);
    } catch (e: any) {
      console.error('Save failed', e);
      alert(`${t('err_save', lang)}: ${e.message || 'unknown'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c: Client) => {
    if (!confirm(t('confirm_delete', lang))) return;
    try {
      const res = await authedFetch(`/api/clients/${c.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      await fetchClients();
    } catch (e: any) {
      console.error('Delete failed', e);
      alert(`${t('err_delete', lang)}: ${e.message || 'unknown'}`);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#B8963E]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-serif italic text-white uppercase tracking-widest mb-2">
            {lang === 'EN' ? 'Clients' : lang === 'ES' ? 'Clientes' : 'Clientes'}
          </h2>
          <p className="text-[10px] text-[#B8963E] uppercase tracking-[0.4em] font-bold">
            {t('intelligence', lang)} · {t('preferences', lang)}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              placeholder={t('search', lang)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-6 focus:outline-none focus:border-[#B8963E] focus:ring-1 focus:ring-[#B8963E]/30 transition-all text-sm text-white placeholder:text-white/30"
            />
          </div>
          {/* Tier filter */}
          <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
            {(['ALL', 'UHNWI', 'VVIP', 'VIP'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTierFilter(tf)}
                className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                  tierFilter === tf ? 'bg-[#B8963E] text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <button
            onClick={openCreate}
            className="px-6 py-3 bg-[#B8963E] text-white rounded-full font-bold uppercase tracking-[0.3em] text-[10px] flex items-center gap-3 hover:bg-[#B8963E]/90 transition-all shrink-0"
          >
            <UserPlus size={16} /> {t('add_client', lang)}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{t('err_load', lang)}</p>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
          <div className="max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 bg-white/5 text-white/30 rounded-full flex items-center justify-center mx-auto">
              <Users size={32} />
            </div>
            <p className="text-sm text-white/50 leading-relaxed">
              {clients.length === 0 ? t('empty', lang) : t('empty_filter', lang)}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AnimatePresence mode="popLayout">
            {filtered.map((c, i) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: Math.min(i * 0.05, 0.4) }}
                className="rounded-2xl border border-white/10 bg-white/5 p-8 relative overflow-hidden group hover:border-[#B8963E]/40 hover:bg-white/[0.07] transition-all"
              >
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                  <Users size={100} />
                </div>

                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-[#B8963E] rounded-2xl flex items-center justify-center text-white text-2xl font-serif">
                      {(c.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-2xl font-serif italic text-white mb-2">{c.name}</h4>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] rounded-full border ${TIER_COLORS[c.tier] || TIER_COLORS.VIP}`}>
                          {c.tier}
                        </span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] rounded-full border ${STATUS_COLORS[c.status] || STATUS_COLORS.ACTIVE}`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] block mb-1">{t('total_spend', lang)}</span>
                    <span className="text-xl font-serif italic text-[#B8963E]">{formatSpend(c.total_spend || 0, lang)}</span>
                  </div>
                </div>

                {/* Contact strip */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6 text-[11px]">
                  {c.email && (
                    <div className="flex items-center gap-2 text-white/70">
                      <Mail size={12} className="text-white/40" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.whatsapp && (
                    <div className="flex items-center gap-2 text-white/70">
                      <Phone size={12} className="text-emerald-400" />
                      <span>{c.whatsapp}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Preferences */}
                  <div className="space-y-4">
                    <h5 className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#B8963E] flex items-center gap-2">
                      <Star size={10} /> {t('preferences', lang)}
                    </h5>
                    {c.preferences?.dietary && c.preferences.dietary.length > 0 && (
                      <div>
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] block mb-1">{t('dietary', lang)}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {c.preferences.dietary.map((d, j) => (
                            <span key={j} className="text-[10px] px-2 py-0.5 bg-white/5 text-white/80 rounded border border-white/10">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {c.preferences?.beverages && c.preferences.beverages.length > 0 && (
                      <div>
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] block mb-1">{t('beverages', lang)}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {c.preferences.beverages.map((b, j) => (
                            <span key={j} className="text-[10px] px-2 py-0.5 bg-white/5 text-white/80 rounded border border-white/10">
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {c.preferences?.temperature && (
                      <div>
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] block mb-1">{t('temperature', lang)}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-white/5 text-white/80 rounded border border-white/10">
                          {c.preferences.temperature}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Intelligence */}
                  <div className="space-y-4">
                    <h5 className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#B8963E] flex items-center gap-2">
                      <Activity size={10} /> {t('intelligence', lang)}
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] block">{t('experiences', lang)}</span>
                        <span className="text-lg font-serif italic text-white">{c.past_experiences ?? 0}</span>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] block">{t('loyalty', lang)}</span>
                        <span className="text-lg font-serif italic text-white">{(c.loyalty_points ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                    {c.preferences?.interests && c.preferences.interests.length > 0 && (
                      <div>
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] block mb-1">{t('interests', lang)}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {c.preferences.interests.map((interest, j) => (
                            <span key={j} className="text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 bg-[#B8963E]/15 text-[#B8963E] rounded-full border border-[#B8963E]/20">
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {c.notes && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] block mb-1">{t('notes', lang)}</span>
                    <p className="text-xs text-white/60 italic leading-relaxed">{c.notes}</p>
                  </div>
                )}

                {/* Action row */}
                <div className="mt-6 pt-6 border-t border-white/10 flex gap-3">
                  <button
                    onClick={() => { window.location.href = `/admin/clients/${c.id}`; }}
                    className="flex-1 py-3 bg-white/5 text-white/80 rounded-xl font-bold uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-2 hover:bg-[#B8963E] hover:text-white hover:border-[#B8963E] border border-white/10 transition-all"
                  >
                    <User size={14} /> {lang === 'ES' ? 'Ver Perfil' : lang === 'PT' ? 'Ver Perfil' : 'View Profile'}
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    className="flex-1 py-3 bg-white/5 text-white/80 rounded-xl font-bold uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-2 hover:bg-[#B8963E] hover:text-white hover:border-[#B8963E] border border-white/10 transition-all"
                  >
                    <Edit3 size={14} /> {t('edit', lang)}
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    className="flex-1 py-3 bg-white/5 text-white/70 rounded-xl font-bold uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-2 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 border border-white/10 transition-all"
                  >
                    <Trash2 size={14} /> {t('delete', lang)}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0a1518] border border-[#B8963E]/30 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#B8963E]/15 text-[#B8963E] rounded-xl">
                    <UserPlus size={22} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif italic text-white">
                      {editingClient ? t('edit_guest', lang) : t('add_client', lang)}
                    </h3>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">
                      {editingClient ? editingClient.id : t('new_guest', lang)}
                    </p>
                  </div>
                </div>
                <button onClick={closeModal} disabled={submitting} className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50">
                  <X size={22} className="text-white/60" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-4">{t('name', lang)} *</label>
                    <input
                      type="text"
                      required
                      value={form.name || ''}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-[#B8963E] transition-all text-sm text-white placeholder:text-white/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-4">{t('email', lang)} *</label>
                    <input
                      type="email"
                      required
                      value={form.email || ''}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-[#B8963E] transition-all text-sm text-white placeholder:text-white/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-4">{t('phone', lang)}</label>
                    <input
                      type="tel"
                      value={form.phone || ''}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-[#B8963E] transition-all text-sm text-white placeholder:text-white/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-4">{t('whatsapp', lang)}</label>
                    <input
                      type="tel"
                      value={form.whatsapp || ''}
                      onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-[#B8963E] transition-all text-sm text-white placeholder:text-white/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-4">{t('tier', lang)}</label>
                    <select
                      value={form.tier}
                      onChange={e => setForm({ ...form, tier: e.target.value as any })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-[#B8963E] transition-all text-sm text-white appearance-none"
                    >
                      <option className="bg-[#0a1518]" value="UHNWI">UHNWI</option>
                      <option className="bg-[#0a1518]" value="VVIP">VVIP</option>
                      <option className="bg-[#0a1518]" value="VIP">VIP</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-4">{t('status', lang)}</label>
                    <select
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value as any })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-[#B8963E] transition-all text-sm text-white appearance-none"
                    >
                      <option className="bg-[#0a1518]" value="ACTIVE">ACTIVE</option>
                      <option className="bg-[#0a1518]" value="PROSPECT">PROSPECT</option>
                      <option className="bg-[#0a1518]" value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                {/* Preferences: dietary, beverages, interests — each is Enter-to-add */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#B8963E] ml-4">{t('preferences', lang)}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Dietary */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-4">{t('dietary', lang)}</label>
                      <input
                        type="text"
                        placeholder={t('press_enter', lang)}
                        value={dietaryInput}
                        onChange={e => setDietaryInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addPrefItem('dietary', dietaryInput);
                            setDietaryInput('');
                          }
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-3 focus:outline-none focus:border-[#B8963E] transition-all text-sm text-white placeholder:text-white/30"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {form.preferences.dietary.map((d, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-[#B8963E]/15 text-[#B8963E] rounded border border-[#B8963E]/30 flex items-center gap-1">
                            {d}
                            <X size={10} className="cursor-pointer" onClick={() => removePrefItem('dietary', i)} />
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Beverages */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-4">{t('beverages', lang)}</label>
                      <input
                        type="text"
                        placeholder={t('press_enter', lang)}
                        value={beverageInput}
                        onChange={e => setBeverageInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addPrefItem('beverages', beverageInput);
                            setBeverageInput('');
                          }
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-3 focus:outline-none focus:border-[#B8963E] transition-all text-sm text-white placeholder:text-white/30"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {form.preferences.beverages.map((b, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-[#B8963E]/15 text-[#B8963E] rounded border border-[#B8963E]/30 flex items-center gap-1">
                            {b}
                            <X size={10} className="cursor-pointer" onClick={() => removePrefItem('beverages', i)} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Interests */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-4">{t('interests', lang)}</label>
                    <input
                      type="text"
                      placeholder={t('press_enter', lang)}
                      value={interestInput}
                      onChange={e => setInterestInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addPrefItem('interests', interestInput);
                          setInterestInput('');
                        }
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-3 focus:outline-none focus:border-[#B8963E] transition-all text-sm text-white placeholder:text-white/30"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {form.preferences.interests.map((it, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-[#B8963E]/15 text-[#B8963E] rounded border border-[#B8963E]/30 flex items-center gap-1">
                          {it}
                          <X size={10} className="cursor-pointer" onClick={() => removePrefItem('interests', i)} />
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Temperature */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-4">{t('temperature', lang)}</label>
                    <input
                      type="text"
                      value={form.preferences.temperature || ''}
                      onChange={e => setForm({ ...form, preferences: { ...form.preferences, temperature: e.target.value } })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-3 focus:outline-none focus:border-[#B8963E] transition-all text-sm text-white placeholder:text-white/30"
                    />
                  </div>
                </div>

                {/* Intelligence row */}
                <div className="grid grid-cols-3 gap-6 pt-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-4">{t('past_exp', lang)}</label>
                    <input
                      type="number"
                      min={0}
                      value={form.past_experiences || 0}
                      onChange={e => setForm({ ...form, past_experiences: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-3 focus:outline-none focus:border-[#B8963E] transition-all text-sm text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-4">{t('total_spend_lbl', lang)}</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.total_spend || 0}
                      onChange={e => setForm({ ...form, total_spend: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-3 focus:outline-none focus:border-[#B8963E] transition-all text-sm text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-4">{t('loyalty_lbl', lang)}</label>
                    <input
                      type="number"
                      min={0}
                      value={form.loyalty_points || 0}
                      onChange={e => setForm({ ...form, loyalty_points: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-3 focus:outline-none focus:border-[#B8963E] transition-all text-sm text-white"
                    />
                  </div>
                </div>

                {/* Source + notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-4">{t('source', lang)}</label>
                    <input
                      type="text"
                      placeholder={t('source_ph', lang)}
                      value={form.source || ''}
                      onChange={e => setForm({ ...form, source: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-3 focus:outline-none focus:border-[#B8963E] transition-all text-sm text-white placeholder:text-white/30"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-4">{t('notes', lang)}</label>
                  <textarea
                    rows={3}
                    placeholder={t('notes_ph', lang)}
                    value={form.notes || ''}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-3 focus:outline-none focus:border-[#B8963E] transition-all text-sm text-white placeholder:text-white/30 resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={submitting}
                    className="flex-1 py-4 border border-white/10 rounded-xl text-white/60 font-bold uppercase tracking-[0.3em] text-[10px] hover:bg-white/5 hover:text-white transition-all disabled:opacity-50"
                  >
                    {t('cancel', lang)}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-4 bg-[#B8963E] text-white rounded-xl font-bold uppercase tracking-[0.3em] text-[10px] hover:bg-[#B8963E]/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {t('save', lang)}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientManagement;
