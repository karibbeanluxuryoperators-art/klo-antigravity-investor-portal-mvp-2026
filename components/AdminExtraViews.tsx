import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Layers, Package, BarChart3, Users, ClipboardList, UserCheck, Inbox,
  TrendingUp, DollarSign, Clock, Sparkles, Settings, Mail, Shield,
  Loader2, AlertCircle, RefreshCw, ExternalLink, Eye, AlertTriangle,
  CheckCircle2, Server, Database, Globe,
} from 'lucide-react';
import { DataTable, StatusPill, type Column } from './ui/DataTable';
import { getSupplierSession } from '../services/supabase';

// v1.8.0 Step 8: BUNDLES, STATS, SETTINGS admin sidebar views.
// These fill in the three sidebar sections that previously showed
// "coming soon" placeholders. Same dark theme, trilingual EN/ES/PT
// as the rest of /admin. None require new tables — they pull from
// the same Supabase data the existing tabs use.

type Language = 'EN' | 'ES' | 'PT';

const tx = (obj: { EN: string; ES: string; PT: string } | string | undefined, lang: Language) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.EN;
};

async function authedFetchJSON<T>(url: string): Promise<T> {
  const session = await getSupplierSession();
  const token = session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ════════════════════════════════════════════════════════════════════════
// BUNDLES — admin view of all bundles across all suppliers
// ════════════════════════════════════════════════════════════════════════
interface AdminBundle {
  id: string;
  name: string;
  description: string | null;
  status: string;
  price_total: number | null;
  created_at: string;
  supplier_id: string;
  suppliers: { business_name: string; contact_name: string } | null;
}

const T_BUNDLES: Record<string, { EN: string; ES: string; PT: string }> = {
  title:    { EN: 'Multi-supplier Packages', ES: 'Paquetes Multi-socio', PT: 'Pacotes Multi-parceiro' },
  empty:    { EN: 'No bundles yet', ES: 'Sin paquetes aún', PT: 'Sem pacotes ainda' },
  emptyHint:{ EN: 'When partners create bundles in their dashboard, they appear here.', ES: 'Cuando los socios crean paquetes en su panel, aparecen aquí.', PT: 'Quando os parceiros criam pacotes no painel, aparecem aqui.' },
  col_bundle:{ EN: 'Bundle', ES: 'Paquete', PT: 'Pacote' },
  col_supplier:{ EN: 'Partner', ES: 'Socio', PT: 'Parceiro' },
  col_price:{ EN: 'Price', ES: 'Precio', PT: 'Preço' },
  col_status:{ EN: 'Status', ES: 'Estado', PT: 'Estado' },
  col_created:{ EN: 'Created', ES: 'Creado', PT: 'Criado' },
};
const tb = (k: keyof typeof T_BUNDLES, l: Language) => T_BUNDLES[k][l] || T_BUNDLES[k].EN;

export const AdminBundlesView: React.FC<{ lang: Language }> = ({ lang }) => {
  const [bundles, setBundles] = useState<AdminBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true); setError(null);
    try {
      const data = await authedFetchJSON<AdminBundle[]>('/api/admin/bundles');
      setBundles(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'load failed');
      setBundles([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const columns: Column<AdminBundle>[] = [
    {
      key: 'name',
      label: { EN: 'Bundle', ES: 'Paquete', PT: 'Pacote' },
      sortValue: (b) => b.name,
      render: (b) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[#B8963E]/15 flex items-center justify-center text-[#B8963E] shrink-0">
            <Layers size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{b.name}</div>
            {b.description && <div className="text-[10px] text-white/40 truncate max-w-[300px]">{b.description}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'supplier',
      label: { EN: 'Partner', ES: 'Socio', PT: 'Parceiro' },
      sortValue: (b) => b.suppliers?.business_name || '',
      hideOnMobile: true,
      render: (b) => (
        <div>
          <div className="text-sm text-white">{b.suppliers?.business_name || '—'}</div>
          {b.suppliers?.contact_name && <div className="text-[10px] text-white/40">{b.suppliers.contact_name}</div>}
        </div>
      ),
    },
    {
      key: 'price_total',
      label: { EN: 'Price', ES: 'Precio', PT: 'Preço' },
      sortValue: (b) => b.price_total ?? -1,
      align: 'right',
      width: 'w-32',
      render: (b) => b.price_total != null ? (
        <span className="text-sm font-bold text-[#B8963E] font-serif italic">${b.price_total.toLocaleString()}</span>
      ) : <span className="text-white/30">—</span>,
    },
    {
      key: 'status',
      label: { EN: 'Status', ES: 'Estado', PT: 'Estado' },
      sortValue: (b) => b.status,
      width: 'w-32',
      render: (b) => <StatusPill status={b.status} lang={lang} />,
    },
    {
      key: 'created_at',
      label: { EN: 'Created', ES: 'Creado', PT: 'Criado' },
      sortValue: (b) => new Date(b.created_at),
      hideOnMobile: true,
      align: 'right',
      width: 'w-32',
      render: (b) => <span className="text-[10px] text-white/40">{new Date(b.created_at).toLocaleDateString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US')}</span>,
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 className="animate-spin text-[#B8963E]" size={28} />
      <span className="text-xs uppercase tracking-[0.3em] text-white/40">{lang === 'ES' ? 'Cargando…' : lang === 'PT' ? 'Carregando…' : 'Loading…'}</span>
    </div>;
  }
  if (error) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 flex items-start gap-3">
      <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
      <p className="text-sm text-red-300">{error}</p>
    </div>;
  }

  return (
    <DataTable<AdminBundle>
      rows={bundles}
      columns={columns}
      rowKey={(b) => b.id}
      searchFields={['name', 'description']}
      searchPlaceholder={{ EN: 'Search bundles by name, description...', ES: 'Buscar paquetes por nombre, descripción...', PT: 'Buscar pacotes por nome, descrição...' }}
      defaultSort={{ key: 'created_at', order: 'desc' }}
      pageSize={25}
      lang={lang}
      urlStateKey="admin_bundles"
      emptyTitle={{ EN: 'No bundles yet', ES: 'Sin paquetes aún', PT: 'Sem pacotes ainda' }}
      emptyHint={{ EN: 'When partners create bundles in their dashboard, they appear here.', ES: 'Cuando los socios crean paquetes en su panel, aparecen aquí.', PT: 'Quando os parceiros criam pacotes no painel, aparecem aqui.' }}
    />
  );
};

// ════════════════════════════════════════════════════════════════════════
// STATS — KPI dashboard (suppliers, bookings, clients, leads)
// ════════════════════════════════════════════════════════════════════════
interface StatsData {
  counts: {
    suppliers: { total: number; approved: number; pending: number };
    bookings:  { total: number; confirmed: number; pending: number };
    clients:   { total: number; uhnwi: number };
    leads:     { total: number; new: number; won: number };
    bundles:   number;
  };
  recentLeads: Array<{ id: string; name: string | null; source: string | null; status: string; timestamp: string }>;
}

const T_STATS: Record<string, { EN: string; ES: string; PT: string }> = {
  title:          { EN: 'KPIs & Activity', ES: 'KPIs y Actividad', PT: 'KPIs e Atividade' },
  refresh:        { EN: 'Refresh', ES: 'Actualizar', PT: 'Atualizar' },
  network:        { EN: 'Network', ES: 'Red', PT: 'Rede' },
  journey:        { EN: 'Journey', ES: 'Viajes', PT: 'Viagens' },
  guests:         { EN: 'Guests', ES: 'Huéspedes', PT: 'Hóspedes' },
  pipeline:       { EN: 'Pipeline', ES: 'Embudo', PT: 'Funil' },
  partners_total: { EN: 'Total partners', ES: 'Total socios', PT: 'Total parceiros' },
  partners_approved: { EN: 'Approved', ES: 'Aprobados', PT: 'Aprovados' },
  partners_pending:  { EN: 'Pending',  ES: 'Pendientes', PT: 'Pendentes' },
  bookings_total:    { EN: 'Total bookings', ES: 'Total reservas', PT: 'Total reservas' },
  bookings_confirmed:{ EN: 'Confirmed',       ES: 'Confirmadas',  PT: 'Confirmadas' },
  bookings_pending:  { EN: 'Pending',         ES: 'Pendientes',   PT: 'Pendentes' },
  clients_total:     { EN: 'Total guests',    ES: 'Total huéspedes', PT: 'Total hóspedes' },
  clients_uhnwi:     { EN: 'UHNWI',           ES: 'UHNWI',           PT: 'UHNWI' },
  leads_total:       { EN: 'Total leads',     ES: 'Total leads',     PT: 'Total leads' },
  leads_new:         { EN: 'New (untreated)', ES: 'Nuevos (sin tratar)', PT: 'Novos (sem tratar)' },
  leads_won:         { EN: 'Won',             ES: 'Ganados',         PT: 'Ganhos' },
  bundles:           { EN: 'Total bundles',   ES: 'Total paquetes',   PT: 'Total pacotes' },
  recent:            { EN: 'Recent activity', ES: 'Actividad reciente', PT: 'Atividade recente' },
  no_recent:         { EN: 'No recent activity.', ES: 'Sin actividad reciente.', PT: 'Sem atividade recente.' },
  conversion_hint:   { EN: 'Of all leads',   ES: 'De todos los leads', PT: 'De todos os leads' },
};
const ts = (k: keyof typeof T_STATS, l: Language) => T_STATS[k][l] || T_STATS[k].EN;

export const AdminStatsView: React.FC<{ lang: Language }> = ({ lang }) => {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true); setError(null);
    try {
      const d = await authedFetchJSON<StatsData>('/api/admin/stats');
      setData(d);
    } catch (e: any) {
      setError(e.message || 'load failed');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 className="animate-spin text-[#B8963E]" size={28} />
      <span className="text-xs uppercase tracking-[0.3em] text-white/40">{lang === 'ES' ? 'Cargando…' : lang === 'PT' ? 'Carregando…' : 'Loading…'}</span>
    </div>;
  }
  if (error) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 flex items-start gap-3">
      <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
      <p className="text-sm text-red-300">{error}</p>
    </div>;
  }
  if (!data) return null;

  const c = data.counts;
  const conversionPct = c.leads.total > 0 ? Math.round((c.leads.won / c.leads.total) * 100) : 0;
  const approvalPct = c.suppliers.total > 0 ? Math.round((c.suppliers.approved / c.suppliers.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button onClick={fetch} disabled={loading} className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/10 transition-all disabled:opacity-50" title={ts('refresh', lang)}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Network (Partners) */}
      <Section title={ts('network', lang)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard label={ts('partners_total', lang)} value={c.suppliers.total} icon={Users} accent="text-white" />
          <KpiCard label={ts('partners_approved', lang)} value={c.suppliers.approved} icon={CheckCircle2} accent="text-emerald-400" />
          <KpiCard label={ts('partners_pending', lang)} value={c.suppliers.pending} icon={Clock} accent="text-amber-400" />
        </div>
        {c.suppliers.total > 0 && (
          <ProgressBar label={lang === 'ES' ? 'Tasa de aprobación' : lang === 'PT' ? 'Taxa de aprovação' : 'Approval rate'} pct={approvalPct} accent="bg-emerald-500" />
        )}
      </Section>

      {/* Journey (Bookings) */}
      <Section title={ts('journey', lang)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard label={ts('bookings_total', lang)} value={c.bookings.total} icon={ClipboardList} accent="text-white" />
          <KpiCard label={ts('bookings_confirmed', lang)} value={c.bookings.confirmed} icon={CheckCircle2} accent="text-emerald-400" />
          <KpiCard label={ts('bookings_pending', lang)} value={c.bookings.pending} icon={Clock} accent="text-amber-400" />
        </div>
        <KpiCard label={ts('bundles', lang)} value={c.bundles} icon={Layers} accent="text-[#B8963E]" small />
      </Section>

      {/* Guests (Clients) */}
      <Section title={ts('guests', lang)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <KpiCard label={ts('clients_total', lang)} value={c.clients.total} icon={UserCheck} accent="text-white" />
          <KpiCard label={ts('clients_uhnwi', lang)} value={c.clients.uhnwi} icon={Sparkles} accent="text-[#B8963E]" />
        </div>
      </Section>

      {/* Pipeline (Leads) */}
      <Section title={ts('pipeline', lang)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard label={ts('leads_total', lang)} value={c.leads.total} icon={Inbox} accent="text-white" />
          <KpiCard label={ts('leads_new', lang)} value={c.leads.new} icon={Sparkles} accent="text-[#B8963E]" />
          <KpiCard label={ts('leads_won', lang)} value={c.leads.won} icon={TrendingUp} accent="text-emerald-400" />
        </div>
        {c.leads.total > 0 && (
          <ProgressBar label={lang === 'ES' ? 'Tasa de conversión' : lang === 'PT' ? 'Taxa de conversão' : 'Conversion rate'} pct={conversionPct} accent="bg-[#B8963E]" hint={ts('conversion_hint', lang)} />
        )}
      </Section>

      {/* Recent activity */}
      <Section title={ts('recent', lang)}>
        {data.recentLeads.length === 0 ? (
          <p className="text-sm text-white/40 italic">{ts('no_recent', lang)}</p>
        ) : (
          <div className="space-y-2">
            {data.recentLeads.map((l) => (
              <a
                key={l.id}
                href={`/admin/leads/${l.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#B8963E]/30 hover:bg-white/[0.05] transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-[#B8963E]/15 flex items-center justify-center text-[#B8963E] shrink-0">
                  <Inbox size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{l.name || (lang === 'ES' ? 'Sin nombre' : lang === 'PT' ? 'Sem nome' : 'Unnamed')}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] truncate">{l.source || '—'}</div>
                </div>
                <StatusPill status={l.status} lang={lang} />
                <span className="text-[10px] text-white/30 hidden md:inline">{new Date(l.timestamp).toLocaleString(lang === 'ES' ? 'es-CO' : lang === 'PT' ? 'pt-BR' : 'en-US')}</span>
              </a>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
    <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#B8963E]">{title}</h3>
    {children}
  </div>
);

const KpiCard: React.FC<{
  label: string; value: number | string; icon: React.ElementType; accent: string; small?: boolean;
}> = ({ label, value, icon: Icon, accent, small }) => (
  <div className={`rounded-2xl border border-white/10 bg-white/5 ${small ? 'p-4' : 'p-6'}`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold">{label}</span>
      <Icon size={16} className={accent} />
    </div>
    <span className={`font-serif italic ${small ? 'text-2xl' : 'text-4xl'} ${accent}`}>{value}</span>
  </div>
);

const ProgressBar: React.FC<{ label: string; pct: number; accent: string; hint?: string }> = ({ label, pct, accent, hint }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold">{label}</span>
      <span className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-bold">{pct}% {hint && <span className="text-white/30">· {hint}</span>}</span>
    </div>
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`h-full ${accent} rounded-full`}
      />
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════
// SETTINGS — admin allowlist + integrations
// ════════════════════════════════════════════════════════════════════════
interface AdminUser {
  email: string;
  role: 'admin' | 'partner' | 'viewer';
  granted_by: string | null;
  granted_at: string;
  notes: string | null;
}

const T_SETTINGS: Record<string, { EN: string; ES: string; PT: string }> = {
  title:         { EN: 'Roles & Integrations', ES: 'Roles e Integraciones', PT: 'Funções e Integrações' },
  intro:         { EN: 'Manage who has access to /admin and view integration status.',
                   ES: 'Gestiona quién tiene acceso a /admin y revisa el estado de las integraciones.',
                   PT: 'Gerencie quem tem acesso ao /admin e visualize o status das integrações.' },
  // Admin allowlist
  allowlist:     { EN: 'Admin Allowlist',       ES: 'Lista de Administradores', PT: 'Lista de Administradores' },
  allowlistHint: { EN: 'Grant or revoke admin/partner/viewer roles. You cannot revoke your own role.',
                   ES: 'Otorga o revoca roles admin/partner/viewer. No puedes revocar tu propio rol.',
                   PT: 'Conceda ou revogue funções admin/partner/viewer. Você não pode revogar sua própria função.' },
  add_role:      { EN: 'Grant role',             ES: 'Conceder rol',             PT: 'Conceder função' },
  email:         { EN: 'Email',                  ES: 'Email',                    PT: 'Email' },
  role:          { EN: 'Role',                   ES: 'Rol',                      PT: 'Função' },
  notes:         { EN: 'Notes (optional)',       ES: 'Notas (opcional)',         PT: 'Notas (opcional)' },
  revoke:        { EN: 'Revoke',                 ES: 'Revocar',                  PT: 'Revogar' },
  cannot_self:   { EN: 'You cannot revoke your own admin role.', ES: 'No puedes revocar tu propio rol.', PT: 'Você não pode revogar sua própria função.' },
  // Integrations
  integrations:  { EN: 'Integrations',          ES: 'Integraciones',            PT: 'Integrações' },
  supabase:      { EN: 'Supabase',               ES: 'Supabase',                 PT: 'Supabase' },
  supabaseDesc:  { EN: 'Postgres + Auth + RLS for clients, suppliers, bookings, leads, bundles, user_roles.',
                   ES: 'Postgres + Auth + RLS para clientes, socios, reservas, leads, paquetes, user_roles.',
                   PT: 'Postgres + Auth + RLS para clientes, parceiros, reservas, leads, pacotes, user_roles.' },
  ai_assistant:  { EN: 'AI Concierge (María)',   ES: 'Asistente IA (María)',     PT: 'Assistente IA (María)' },
  aiDesc:        { EN: 'Google GenAI-powered trilingual chatbot. Detects user language and responds in kind.',
                   ES: 'Chatbot trilingüe potenciado por Google GenAI. Detecta el idioma del usuario y responde en el mismo.',
                   PT: 'Chatbot trilíngue com Google GenAI. Detecta o idioma do usuário e responde no mesmo idioma.' },
  stripe:        { EN: 'Stripe Connect',         ES: 'Stripe Connect',           PT: 'Stripe Connect' },
  stripeDesc:    { EN: '80/20 split + 48h payout to partners. Not yet wired — post-funding scope.',
                   ES: 'Reparto 80/20 + pago a 48h a socios. Aún no conectado — post-financiación.',
                   PT: 'Repartição 80/20 + pagamento em 48h. Ainda não conectado — pós-financiamento.' },
  google_cal:    { EN: 'Google Calendar',        ES: 'Google Calendar',          PT: 'Google Calendar' },
  googleCalDesc: { EN: 'Per-asset calendar sync for supplier availability.',
                   ES: 'Sincronización de calendario por activo para disponibilidad de socios.',
                   PT: 'Sincronização de calendário por ativo para disponibilidade de parceiros.' },
  telegram:      { EN: 'Telegram',               ES: 'Telegram',                 PT: 'Telegram' },
  telegramDesc:  { EN: 'Per-partner chat ID for booking notifications.',
                   ES: 'Chat ID por socio para notificaciones de reservas.',
                   PT: 'Chat ID por parceiro para notificações de reservas.' },
  status_live:   { EN: 'Live',                   ES: 'Activo',                   PT: 'Ativo' },
  status_post:   { EN: 'Post-funding',           ES: 'Post-financiación',        PT: 'Pós-financiamento' },
};
const tst = (k: keyof typeof T_SETTINGS, l: Language) => T_SETTINGS[k][l] || T_SETTINGS[k].EN;

export const AdminSettingsView: React.FC<{ lang: Language; signedInEmail?: string | null }> = ({ lang, signedInEmail }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'partner' | 'viewer'>('viewer');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true); setError(null);
    try {
      const data = await authedFetchJSON<{ users: AdminUser[] }>('/api/admin/users');
      setUsers(data.users || []);
    } catch (e: any) {
      setError(e.message || 'load failed');
      setUsers([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await getSupplierSession())?.access_token || ''}` },
        body: JSON.stringify({ email, role, notes: notes || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setEmail(''); setNotes('');
      await fetchUsers();
    } catch (e: any) {
      alert(`Grant failed: ${e.message}`);
    } finally { setSubmitting(false); }
  };

  const revoke = async (target: AdminUser) => {
    if (target.email === signedInEmail) { alert(tst('cannot_self', lang)); return; }
    if (!confirm(`${lang === 'ES' ? '¿Revocar' : lang === 'PT' ? 'Revogar' : 'Revoke'} ${target.email}?`)) return;
    try {
      const res = await fetch(`/api/admin/users?email=${encodeURIComponent(target.email)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${(await getSupplierSession())?.access_token || ''}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await fetchUsers();
    } catch (e: any) {
      alert(`Revoke failed: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/60 leading-relaxed">{tst('intro', lang)}</p>

      {/* ── Admin allowlist ───────────────────────────────────────── */}
      <Section title={tst('allowlist', lang)}>
        <p className="text-xs text-white/40">{tst('allowlistHint', lang)}</p>

        {/* Grant form */}
        <form onSubmit={grant} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={tst('email', lang)}
            className="md:col-span-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8963E]"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#B8963E]"
          >
            <option value="admin">admin</option>
            <option value="partner">partner</option>
            <option value="viewer">viewer</option>
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-[#B8963E] text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#B8963E]/90 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
            {tst('add_role', lang)}
          </button>
        </form>

        {error && <p className="text-xs text-red-300">{error}</p>}

        {/* Users list */}
        {loading ? (
          <div className="flex items-center gap-2 text-white/40 text-xs py-4">
            <Loader2 className="animate-spin" size={14} /> {lang === 'ES' ? 'Cargando…' : lang === 'PT' ? 'Carregando…' : 'Loading…'}
          </div>
        ) : users.length === 0 ? (
          <p className="text-xs text-white/40 italic py-4">{lang === 'ES' ? 'Sin usuarios con rol todavía.' : lang === 'PT' ? 'Sem usuários com função ainda.' : 'No users with roles yet.'}</p>
        ) : (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-[9px] uppercase tracking-[0.3em] text-[#B8963E] font-bold">{tst('email', lang)}</th>
                  <th className="px-4 py-3 text-[9px] uppercase tracking-[0.3em] text-[#B8963E] font-bold">{tst('role', lang)}</th>
                  <th className="px-4 py-3 text-[9px] uppercase tracking-[0.3em] text-[#B8963E] font-bold hidden md:table-cell">{tst('notes', lang)}</th>
                  <th className="px-4 py-3 text-[9px] uppercase tracking-[0.3em] text-[#B8963E] font-bold text-right">—</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.email} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-sm text-white">{u.email}</td>
                    <td className="px-4 py-3"><StatusPill status={u.role.toUpperCase()} lang={lang} /></td>
                    <td className="px-4 py-3 text-xs text-white/40 hidden md:table-cell">{u.notes || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => revoke(u)}
                        disabled={u.email === signedInEmail}
                        className="text-[10px] uppercase tracking-widest text-red-300/70 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {tst('revoke', lang)}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Integrations ──────────────────────────────────────────── */}
      <Section title={tst('integrations', lang)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <IntegrationRow icon={Database} name={tst('supabase', lang)} description={tst('supabaseDesc', lang)} status="live" statusLabel={tst('status_live', lang)} lang={lang} />
          <IntegrationRow icon={Sparkles} name={tst('ai_assistant', lang)} description={tst('aiDesc', lang)} status="live" statusLabel={tst('status_live', lang)} lang={lang} />
          <IntegrationRow icon={DollarSign} name={tst('stripe', lang)} description={tst('stripeDesc', lang)} status="post" statusLabel={tst('status_post', lang)} lang={lang} />
          <IntegrationRow icon={Calendar} name={tst('google_cal', lang)} description={tst('googleCalDesc', lang)} status="live" statusLabel={tst('status_live', lang)} lang={lang} />
          <IntegrationRow icon={Mail} name={tst('telegram', lang)} description={tst('telegramDesc', lang)} status="live" statusLabel={tst('status_live', lang)} lang={lang} />
        </div>
      </Section>
    </div>
  );
};

const Calendar = ({ size, className }: { size: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const IntegrationRow: React.FC<{
  icon: React.ElementType; name: string; description: string;
  status: 'live' | 'post'; statusLabel: string; lang: Language;
}> = ({ icon: Icon, name, description, status, statusLabel, lang }) => (
  <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${status === 'live' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
      <Icon size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-white">{name}</span>
        <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-[0.2em] font-bold ${status === 'live' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/40 border-white/10'}`}>
          {statusLabel}
        </span>
      </div>
      <p className="text-xs text-white/50 mt-1 leading-relaxed">{description}</p>
    </div>
  </div>
);
