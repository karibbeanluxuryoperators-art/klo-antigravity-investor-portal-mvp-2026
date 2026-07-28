import express from "express";
import path from "path";
import dotenv from "dotenv";
import Stripe from "stripe";
import crypto from "crypto";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import fetch from "node-fetch";

// Vite is only needed for local dev (it provides the SPA HMR server). On Vercel
// the static dist/ folder is served directly, so we avoid importing Vite there
// to prevent it from running dev-time module-level code in the serverless runtime.
// Local dev still has Vite available via the `dev` npm script.
const isLocal = !process.env.VERCEL;
let createViteServer: typeof import("vite").createServer | undefined;
if (isLocal) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  createViteServer = require("vite").createServer;
}

dotenv.config();

// __dirname is a CommonJS global — available in both Vercel's serverless
// runtime (where the file is compiled to CJS) and local tsx execution.
// Replaces the previous fileURLToPath(import.meta.url) pattern that
// broke Vercel's serverless compilation of this module.
const dirname = (typeof __dirname !== 'undefined' ? __dirname : process.cwd());

// Express app — created at module level so Vercel can export it as the handler.
// Routes are registered inside startServer(); only app.listen() is skipped on Vercel.
const app = express();
app.use(express.json());

// Supabase Setup
let _supabase: any = null;

const getSupabase = () => {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    
    if (!url || !key || !url.startsWith('http')) {
      throw new Error("Supabase is not configured correctly. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in the Secrets panel.");
    }
    
    _supabase = createClient(url, key);
  }
  return _supabase;
};

const supabase = new Proxy({}, {
  get: (target, prop) => {
    try {
      const client = getSupabase();
      return client[prop];
    } catch (error: any) {
      // If we're just checking for a property, don't throw immediately
      // but throw if it's actually called or used as a function
      return (...args: any[]) => {
        throw new Error(error.message);
      };
    }
  }
}) as any;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.warn("SUPABASE_URL or SUPABASE_SERVICE_KEY is missing. Supabase features will be disabled.");
}

// ── Schema migrations (run once on startup) ─────────────────────────────────
// Tries to insert a dummy row to test columns exist; if they don't, silently logs.
// The schema already defines these columns — this just guards against edge cases.
async function runMigrations() {
  const cols = ['firebase_uid', 'telegram_chat_id'];
  for (const col of cols) {
    try {
      await supabase.from('suppliers').select(col).limit(1);
    } catch {
      console.warn(`Column ${col} may not exist — run the ALTER TABLE SQL in Supabase if you hit errors.`);
    }
  }
  console.log('Migrations checked.');
}

// Start migrations in background
runMigrations().catch(err => console.warn('Migration check:', err.message));

let stripe: Stripe | null = null;

const getStripe = () => {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

// Mock Users (Keep for logic, but enforce password)
const MOCK_USERS = {
  'admin@klo.com': { id: 'admin_1', email: 'admin@klo.com', role: 'ADMIN', name: 'KLO Administrator' },
  'provider@klo.com': { id: 'prov_1', email: 'provider@klo.com', role: 'PROVIDER', name: 'Nauty 360 Partner' },
  'client@klo.com': { id: 'client_1', email: 'client@klo.com', role: 'CLIENT', name: 'UHNWI Client' },
};

// ── Telegram notification helper (module-level so it can be called from webhook) ──
async function sendTelegramNotification(supplierId: string, booking: any) {
  try {
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('telegram_chat_id, business_name')
      .eq('id', supplierId)
      .maybeSingle();

    if (!supplier?.telegram_chat_id) return;

    const { data: asset } = await supabase
      .from('assets')
      .select('name')
      .eq('id', booking.asset_id)
      .maybeSingle();

    const lines = [
      `🔔 <b>New Booking — KLO</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `👤 Guest: ${booking.guest_name || '—'}`,
      booking.guest_email ? `📧 ${booking.guest_email}` : '',
      `🏷️ Asset: ${asset?.name || '—'}`,
      `📅 ${booking.start_date} → ${booking.end_date}`,
      `💰 Price: ${booking.total_price || '—'}`,
      booking.notes ? `📝 ${booking.notes}` : '',
    ].filter(Boolean);

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: supplier.telegram_chat_id, text: lines.join('\n'), parse_mode: 'HTML' })
    });
  } catch (err) {
    console.error('Telegram notification failed:', err);
  }
}

// ── Approval notifications (Telegram + email, with audit row) ─────────────
// Wrapped in try/catch — never let it break the approval mutation.
async function notifyApproval(supplierId: string, kind: string, payload: Record<string, any> = {}) {
  const logId = `N${Date.now()}${Math.floor(Math.random() * 1000)}`;
  try {
    const { data: supplier, error: sError } = await supabase
      .from('suppliers')
      .select('telegram_chat_id, email, business_name')
      .eq('id', supplierId)
      .maybeSingle();

    if (sError) console.warn(`[notifyApproval] supplier lookup error: ${sError.message}`);

    const displayName = supplier?.business_name || 'Partner';
    const displayKind = kind === 'BUNDLE_APPROVED' ? 'bundle' : 'supplier application';
    const subjectName = (payload as any)?.name || (kind === 'BUNDLE_APPROVED' ? '' : displayName);

    let sentTelegram = false;
    let sentEmail = false;

    // ── Telegram ──
    if (supplier?.telegram_chat_id && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const telegramText = [
          `\u2705 <b>KLO Approval</b>`,
          `Your ${displayKind} was approved.`,
          subjectName ? `<b>${subjectName}</b>` : '',
        ].filter(Boolean).join('\n');

        const resp = await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: supplier.telegram_chat_id,
              text: telegramText,
              parse_mode: 'HTML',
            }),
          }
        );
        const tgResult = (await resp.json()) as { ok?: boolean };
        sentTelegram = tgResult.ok === true;
      } catch (tgErr: any) {
        console.warn(`[notifyApproval] telegram send failed: ${tgErr?.message || tgErr}`);
      }
    }

    // ── SendGrid email ──
    if (supplier?.email && process.env.SENDGRID_API_KEY) {
      try {
        const body = [
          `Hello ${displayName},`,
          ``,
          `Your ${displayKind} has been approved by the KLO team.`,
          subjectName ? `Reference: ${subjectName}` : '',
          ``,
          `Welcome aboard,`,
          `— KLO Operations`,
        ].filter(Boolean).join('\n');

        const emailResp = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: supplier.email }] }],
            from: { email: 'hola@karibbeanluxuryoperators.lat', name: 'KLO Operations' },
            subject: 'KLO \u2014 Approved',
            content: [{ type: 'text/plain', value: body }],
          }),
        });
        sentEmail = emailResp.status >= 200 && emailResp.status < 300;
      } catch (mailErr: any) {
        console.warn(`[notifyApproval] sendgrid send failed: ${mailErr?.message || mailErr}`);
      }
    } else if (supplier?.email) {
      // Stub log when no email provider configured
      const stubBody = `Your ${displayKind} has been approved.${subjectName ? ` Reference: ${subjectName}` : ''}`;
      console.log(`[email-stub] would send to ${supplier.email}: KLO \u2014 Approved ${stubBody}`);
    }

    // ── Audit row (best-effort, never throws) ──
    try {
      await supabase.from('approval_notifications').insert([{
        id: logId,
        recipient_supplier_id: supplierId,
        kind,
        payload: payload ?? {},
        sent_telegram: sentTelegram,
        sent_email: sentEmail,
      }]);
    } catch (auditErr: any) {
      console.warn(`[notifyApproval] audit insert failed: ${auditErr?.message || auditErr}`);
    }
  } catch (err: any) {
    // Top-level safety net — must never break the approval flow
    console.error(`[notifyApproval] unhandled error for ${supplierId}:`, err?.message || err);
  }
}

async function startServer() {
  const PORT = 3000;
  const APP_URL = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${PORT}`);

  app.use(express.json());

  // ── Soft-delete helper (v1.8.0 Step 13 — Phase 1 of CRM roadmap) ──────
  // Adds POST /api/{entity}/:id/archive and /restore for the 6 admin entities.
  // Both are admin-only, idempotent (archive of archived = no-op success),
  // and record updated_at if the table has it. The matching partial indexes
  // are in db/migrations/2026-07-24_archived_at.sql.
  const SOFT_DELETE_TABLES = ['leads', 'clients', 'suppliers', 'assets', 'experiences', 'bookings'] as const;
  const registerArchiveRoutes = (table: typeof SOFT_DELETE_TABLES[number]) => {
    const path = `/api/${table}/:id`;

    // POST .../archive — soft delete. Sets archived_at = now().
    // Idempotent: archiving an already-archived row is a 200 success.
    app.post(`${path}/archive`, async (req: express.Request<{ id: string }>, res) => {
      const { id } = req.params;
      try {
        const { role } = await resolveAuthFromRequest(req);
        if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
        const now = new Date().toISOString();
        // Only set archived_at if it's currently NULL — preserves the
        // original archive timestamp on repeat calls.
        const { data, error } = await supabase
          .from(table)
          .update({ archived_at: now })
          .eq('id', id)
          .is('archived_at', null)
          .select();
        if (error) throw error;
        if (!data || data.length === 0) {
          // Either the row doesn't exist, or it was already archived.
          // Disambiguate so the UI can show the right message.
          const { data: existing } = await supabase
            .from(table)
            .select('id, archived_at')
            .eq('id', id)
            .maybeSingle();
          if (!existing) return res.status(404).json({ error: `${table} not found` });
          return res.json({ success: true, already_archived: true, archived_at: existing.archived_at });
        }
        res.json({ success: true, archived_at: now });
      } catch (error: any) {
        console.error(`POST ${path}/archive failed`, error?.message || error);
        res.status(500).json({ error: error?.message || 'archive failed' });
      }
    });

    // POST .../restore — un-archive. Sets archived_at = NULL.
    // Idempotent: restoring an already-active row is a 200 success.
    app.post(`${path}/restore`, async (req: express.Request<{ id: string }>, res) => {
      const { id } = req.params;
      try {
        const { role } = await resolveAuthFromRequest(req);
        if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
        const { data, error } = await supabase
          .from(table)
          .update({ archived_at: null })
          .eq('id', id)
          .not('archived_at', 'is', null)
          .select();
        if (error) throw error;
        if (!data || data.length === 0) {
          const { data: existing } = await supabase
            .from(table)
            .select('id, archived_at')
            .eq('id', id)
            .maybeSingle();
          if (!existing) return res.status(404).json({ error: `${table} not found` });
          return res.json({ success: true, already_active: true });
        }
        res.json({ success: true });
      } catch (error: any) {
        console.error(`POST ${path}/restore failed`, error?.message || error);
        res.status(500).json({ error: error?.message || 'restore failed' });
      }
    });
  };

  // Health check (must be first so we can diagnose serverless cold-start issues)
  app.get('/api/health', (_req, res) => {
    const integrations = {
      supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
      ai: Boolean(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY),
      googleCalendar: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    };
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      runtime: process.env.VERCEL ? 'vercel-serverless' : 'node',
      integrations,
    });
  });

  // ── Telegram Webhook (uses raw body — registered after express.json is fine since Telegram sends JSON) ──
  app.post('/api/telegram/webhook', express.json(), async (req, res) => {
    res.sendStatus(200);
    try {
      const { message } = req.body as any;
      if (!message?.chat?.id) return;
      const chatId = message.chat.id;
      const text = message.text || '';
      if (text === '/start' || text === '/id') {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🆔 Your KLO Chat ID:\n\n${chatId}\n\nPaste this number in your Supplier Dashboard → Settings → Telegram Chat ID field.`,
          })
        });
      }
    } catch { /* non-fatal */ }
  });

  // Register webhook with Telegram on startup
  if (process.env.TELEGRAM_BOT_TOKEN) {
    fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${APP_URL}/api/telegram/webhook`)
      .then(r => r.json() as Promise<{ ok: boolean; description?: string }>)
      .then(d => { if (d.ok) console.log('✅ Telegram webhook set'); else console.warn('⚠️ Telegram:', d.description); })
      .catch(() => {});
  }

  // Auth API
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    // Enforce password "123456" for all users as requested
    if (password !== "123456") {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    
    const user = MOCK_USERS[email as keyof typeof MOCK_USERS];
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  // Leads API
  // GET is admin-gated (Step 4 — v1.8.0 admin Leads tab).
  // POST stays public so the public site PlanTripModal can submit without auth.
  app.get("/api/leads", async (req, res) => {
    try {
      const { role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      // v1.8.0 Step 14: ?include_archived=true returns archived leads too.
      // Default = active only (archived_at IS NULL).
      const includeArchived = String(req.query.include_archived || '').toLowerCase() === 'true';
      let q = supabase.from('leads').select('*');
      if (!includeArchived) q = q.is('archived_at', null);
      const { data, error } = await q.order('timestamp', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/leads", async (req, res) => {
    const body = req.body || {};
    const { name, email, phone, whatsapp, experience_type, budget, travel_dates, special_requests, message, source } = body;
    const id = 'L' + Date.now();
    const timestamp = new Date().toISOString();
    const status = 'NEW';

    try {
      // v1.8.0 Step 20: extended lead fields (research-based). Resilient
      // insert: try each block, fall back on 42703.
      const baseRow: any = {
        id, name, email, phone, whatsapp, experience_type,
        budget: budget || null,
        travel_dates: travel_dates || null,
        special_requests: special_requests || null,
        message, status, timestamp, source,
      };
      const extendedBlocks: Array<Record<string, any>> = [
        // Block A: meta
        { notes: body.notes || null, preferred_language: body.preferred_language || 'ES', nationality: body.nationality || null },
        // Block B: trip
        { origin: body.origin || null, destination: body.destination || null, travel_date: body.travel_date || null, travel_end_date: body.travel_end_date || null, travelers: body.travelers != null ? Number(body.travelers) : null },
        // Block C: budget
        { budget_min: body.budget_min != null ? Number(body.budget_min) : null, budget_max: body.budget_max != null ? Number(body.budget_max) : null },
        // Block D: trip meta
        { trip_type: body.trip_type || null, accommodation: body.accommodation || null, pillar_interest: body.pillar_interest || null, experience_interest: body.experience_interest || null },
        // Block E: lead profile + attribution
        { job_title: body.job_title || null, tax_id: body.tax_id || null, tags: Array.isArray(body.tags) ? body.tags : [], utm_source: body.utm_source || null, utm_campaign: body.utm_campaign || null },
      ];
      const row: any = { ...baseRow };
      for (const block of extendedBlocks) {
        const trial: any = { ...row, ...block };
        const trialRes = await supabase.from('leads').insert([trial]).select();
        if (!trialRes.error) {
          return res.json({ success: true, lead: trialRes.data![0] });
        }
        if (trialRes.error.code === 'PGRST204' || /does not exist/i.test(trialRes.error.message || '')) {
          console.warn('POST /api/leads: extended block missing, retrying without it:', trialRes.error.message);
          continue;
        }
        throw trialRes.error;
      }
      // No block succeeded → base alone.
      const finalRes = await supabase.from('leads').insert([baseRow]).select();
      if (finalRes.error) throw finalRes.error;
      res.json({ success: true, lead: finalRes.data![0] });
    } catch (error: any) {
      console.error('POST /api/leads failed', error?.message || error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/leads/:id — single lead (admin-only). Used by /admin/leads/[id].
  app.get("/api/leads/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'lead not found' });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/leads/:id", async (req, res) => {
    const { id } = req.params;
    const body = req.body || {};

    try {
      const { role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      // v1.8.0 Step 20: extended fields are updatable here too. Any unknown
      // column is silently dropped on 42703.
      const allowed = [
        // Core (existing)
        'name', 'email', 'phone', 'whatsapp', 'experience_type', 'budget',
        'travel_dates', 'special_requests', 'message', 'status', 'source',
        // Extended
        'notes', 'preferred_language', 'nationality',
        'origin', 'destination', 'travel_date', 'travel_end_date', 'travelers',
        'budget_min', 'budget_max',
        'trip_type', 'accommodation', 'pillar_interest', 'experience_interest',
        'job_title', 'tax_id', 'tags', 'utm_source', 'utm_campaign',
      ];
      const updates: any = {};
      for (const k of allowed) {
        if (k in body) updates[k] = body[k];
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'no updatable fields provided' });
      }
      // Try update; on 42703 drop the missing column and retry.
      let result = await supabase.from('leads').update(updates).eq('id', id).select().maybeSingle();
      let lastErr = result.error;
      while (lastErr && (lastErr.code === 'PGRST204' || /does not exist/i.test(lastErr.message || ''))) {
        const m = (lastErr.message || '').match(/column ['"]?([a-zA-Z0-9_]+)['"]? does not exist/i);
        if (!m) break;
        const col = m[1];
        console.warn(`PATCH /api/leads/:id: column ${col} missing, stripping it`);
        delete updates[col];
        if (Object.keys(updates).length === 0) {
          return res.status(400).json({ error: 'no updatable fields left after stripping missing columns' });
        }
        result = await supabase.from('leads').update(updates).eq('id', id).select().maybeSingle();
        lastErr = result.error;
      }
      if (lastErr) throw lastErr;
      if (!result.data) return res.status(404).json({ error: 'lead not found' });
      res.json(result.data);
    } catch (error: any) {
      console.error('PATCH /api/leads/:id failed', error?.message || error);
      res.status(500).json({ error: error.message });
    }
  });

  // ── Experiences (v1.8.0 Step 11) ───────────────────────────────────────────
  // GET /api/experiences — public for PUBLISHED, admin for ALL.
  // Query: ?status=PUBLISHED|DRAFT|ARCHIVED|ALL
  // Public site uses default (PUBLISHED). Admin EntityEditor passes ?status=ALL.
  app.get("/api/experiences", async (req, res) => {
    try {
      const { role } = await resolveAuthFromRequest(req);
      const isAdmin = role === 'admin';
      const statusParam = (req.query?.status as string) || 'PUBLISHED';
      // Non-admins can only read PUBLISHED. Treat anything else as PUBLISHED.
      const effectiveStatus = isAdmin ? statusParam : 'PUBLISHED';

      let query = supabase.from('experiences').select('*');
      if (effectiveStatus !== 'ALL') {
        query = query.eq('status', effectiveStatus);
      }
      // v1.8.0 Step 14: default = active only. ?include_archived=true to see all.
      // Only admins can pass include_archived; public always sees active rows.
      if (isAdmin && String(req.query?.include_archived || '').toLowerCase() !== 'true') {
        query = query.is('archived_at', null);
      }
      const { data, error } = await query
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      // v1.8.0 Step 11.10: if the table doesn't exist (migration not yet
      // run), return an empty list instead of 500 so the EntityEditor
      // shows "no records" instead of an error state. The migration file
      // is `db/migrations/2026-07-24_experiences.sql` — until it's run,
      // this endpoint stays healthy.
      const msg = error?.message || '';
      const code = (error as any)?.code || '';
      if (code === 'PGRST116' || /relation.*does not exist/i.test(msg) || /table.*experiences/i.test(msg)) {
        console.warn('[GET /api/experiences] table missing, returning [] — run db/migrations/2026-07-24_experiences.sql');
        return res.json([]);
      }
      console.error('GET /api/experiences failed', error?.message || error);
      res.status(500).json({ error: error?.message || 'list failed' });
    }
  });

  // GET /api/experiences/:id — single experience.
  // Public can read PUBLISHED only; admin can read any.
  app.get("/api/experiences/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { role } = await resolveAuthFromRequest(req);
      const isAdmin = role === 'admin';
      const { data, error } = await supabase
        .from('experiences')
        .select('*')
        .eq('id', id)
        .limit(1);
      if (error) throw error;
      if (!data || data.length === 0) return res.status(404).json({ error: 'not found' });
      if (!isAdmin && data[0].status !== 'PUBLISHED') {
        return res.status(404).json({ error: 'not found' });
      }
      res.json(data[0]);
    } catch (error: any) {
      console.error('GET /api/experiences/:id failed', error?.message || error);
      res.status(500).json({ error: error?.message || 'get failed' });
    }
  });

  // POST /api/experiences — admin-only create.
  // Accepts BOTH flat columns (title_en, hero_image) AND nested form-state
  // shape from the wizard (title: {EN,ES,PT}). Normalises to flat before insert.
  app.post("/api/experiences", async (req, res) => {
    try {
      const { email, role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const body = req.body || {};
      if (!body.id) {
        return res.status(400).json({ error: 'id is required' });
      }
      // Normalise trilingual nested objects → flat columns
      const trilingual = ['title', 'eyebrow', 'summary', 'description'];
      const row: any = { ...body };
      for (const key of trilingual) {
        if (row[key] && typeof row[key] === 'object') {
          const obj = row[key];
          for (const lang of ['EN', 'ES', 'PT']) {
            const lower = lang.toLowerCase();
            row[`${key}_${lower}`] = obj[lang] ?? obj[lang.toLowerCase()] ?? null;
          }
          // Keep the base column populated from ES (canonical per trilingual contract)
          if (key === 'title' && !row[key]) row[key] = obj.ES || obj.en || '';
        }
      }
      // hero_image is optional — default to null so the wizard can save drafts without a photo
      if (!row.hero_image) row.hero_image = null;
      // Audit fields
      row.created_by = email;
      row.updated_by = email;
      row.created_at = new Date().toISOString();
      row.updated_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('experiences')
        .insert([row])
        .select();
      if (error) throw error;
      res.json(data?.[0] || row);
    } catch (error: any) {
      console.error('POST /api/experiences failed', error?.message || error);
      res.status(500).json({ error: error?.message || 'create failed' });
    }
  });

  // PATCH /api/experiences/:id — admin-only update.
  app.patch("/api/experiences/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { email, role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const updates = {
        ...req.body,
        updated_by: email,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('experiences')
        .update(updates)
        .eq('id', id)
        .select();
      if (error) throw error;
      res.json(data?.[0] || { id, ...updates });
    } catch (error: any) {
      console.error('PATCH /api/experiences/:id failed', error?.message || error);
      res.status(500).json({ error: error?.message || 'update failed' });
    }
  });

  // DELETE /api/experiences/:id — admin-only soft delete (sets status=ARCHIVED).
  // Hard delete would orphan any vendors/assets that reference this experience.
  app.delete("/api/experiences/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const { data, error } = await supabase
        .from('experiences')
        .update({ status: 'ARCHIVED', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();
      if (error) throw error;
      res.json({ success: true, archived: data?.[0] });
    } catch (error: any) {
      console.error('DELETE /api/experiences/:id failed', error?.message || error);
      res.status(500).json({ error: error?.message || 'delete failed' });
    }
  });

  // POST /api/experiences/:id/publish — admin-only toggle DRAFT ↔ PUBLISHED.
  // Body: { status: 'DRAFT' | 'PUBLISHED' }
  app.post("/api/experiences/:id/publish", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};
    if (status !== 'DRAFT' && status !== 'PUBLISHED') {
      return res.status(400).json({ error: 'status must be DRAFT or PUBLISHED' });
    }
    try {
      const { email, role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const { data, error } = await supabase
        .from('experiences')
        .update({ status, updated_by: email, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();
      if (error) throw error;
      res.json(data?.[0] || { id, status });
    } catch (error: any) {
      console.error('POST /api/experiences/:id/publish failed', error?.message || error);
      res.status(500).json({ error: error?.message || 'publish failed' });
    }
  });

  // POST /api/experiences/:id/photo — admin-only photo upload.
  // v1: client compresses to 1200px max + base64-encodes; we just persist the
  //     data URL string into hero_image (or push into gallery[]).
  // v2 (post-funding): swap to Supabase Storage bucket; this endpoint
  //     becomes a thin wrapper that calls supabase.storage.from('klo-media').upload().
  // Body: { field: 'hero_image' | 'gallery', dataUrl: string, replaceIndex?: number }
  //   - field=hero_image: replaces the hero_image column
  //   - field=gallery: appends to gallery[] (or replaces at replaceIndex)
  app.post("/api/experiences/:id/photo", async (req, res) => {
    const { id } = req.params;
    const { field, dataUrl, replaceIndex } = req.body || {};
    if (!field || !dataUrl) {
      return res.status(400).json({ error: 'field and dataUrl are required' });
    }
    if (field !== 'hero_image' && field !== 'gallery') {
      return res.status(400).json({ error: 'field must be hero_image or gallery' });
    }
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'dataUrl must be a data:image/* URL' });
    }
    // Cap at 800KB after base64 (≈600KB binary) to keep the row under Supabase's
    // 1MB per-row soft limit even with the trilingual columns populated.
    if (dataUrl.length > 1_200_000) {
      return res.status(413).json({ error: 'image too large; compress to 1200px and try again' });
    }
    try {
      const { email, role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });

      // Read the current row
      const { data: current, error: readErr } = await supabase
        .from('experiences')
        .select('hero_image, gallery')
        .eq('id', id)
        .limit(1);
      if (readErr) throw readErr;
      if (!current || current.length === 0) return res.status(404).json({ error: 'experience not found' });
      const row = current[0];

      const updates: Record<string, any> = {
        updated_by: email,
        updated_at: new Date().toISOString(),
      };
      if (field === 'hero_image') {
        updates.hero_image = dataUrl;
      } else {
        const gallery = Array.isArray(row.gallery) ? [...row.gallery] : [];
        if (typeof replaceIndex === 'number' && replaceIndex >= 0 && replaceIndex < gallery.length) {
          gallery[replaceIndex] = dataUrl;
        } else {
          gallery.push(dataUrl);
        }
        if (gallery.length > 5) {
          return res.status(400).json({ error: 'gallery max 5 images' });
        }
        updates.gallery = gallery;
      }

      const { data, error } = await supabase
        .from('experiences')
        .update(updates)
        .eq('id', id)
        .select();
      if (error) throw error;
      res.json({ success: true, row: data?.[0] });
    } catch (error: any) {
      console.error('POST /api/experiences/:id/photo failed', error?.message || error);
      res.status(500).json({ error: error?.message || 'photo upload failed' });
    }
  });

  // DELETE /api/leads/:id — admin-only removal (used by Leads tab "trash" action).
  app.delete("/api/leads/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/leads/:id/convert — Phase 2: convert an inbound lead into a client.
  // Reads the lead, creates a new clients row (source='lead') with the lead's
  // contact info, then updates the lead with converted_to_client_id + status='CONVERTED'.
  // Both columns exist from db/migrations/2026-07-24_lead_client_link.sql.
  //
  // Idempotency: if the lead already has converted_to_client_id set, we return the
  // existing client (200) instead of duplicating. The UI hides the button in that case.
  //
  // tier defaults to UHNWI for all converted leads — admin can change it later
  // via PATCH /api/clients/:id. We don't try to auto-detect tier from budget
  // because that's a judgement call the human should make on first contact.
  app.post("/api/leads/:id/convert", async (req: express.Request<{ id: string }>, res) => {
    const { id } = req.params;
    try {
      const { role, email: creatorEmail } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });

      // 1) Load the lead. 404 if not found.
      const { data: lead, error: leadErr } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (leadErr) throw leadErr;
      if (!lead) return res.status(404).json({ error: 'lead not found' });

      // 2) Idempotency check: already converted → return the existing client.
      if (lead.converted_to_client_id) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('*')
          .eq('id', lead.converted_to_client_id)
          .maybeSingle();
        return res.json({ lead, client: existingClient, already_converted: true });
      }

      // 3) Need at least a name to create a client. Email is optional but if it
      //    exists on the lead we copy it. If a client with the same email already
      //    exists, we still link the lead to it (don't dup) and return that one.
      if (!lead.name) {
        return res.status(400).json({ error: 'lead has no name — cannot convert' });
      }
      const lowerEmail = lead.email ? String(lead.email).toLowerCase() : null;
      if (lowerEmail) {
        const { data: dup } = await supabase
          .from('clients')
          .select('*')
          .eq('email', lowerEmail)
          .maybeSingle();
        if (dup) {
          // Link the lead to the existing client and mark as converted.
          const { data: updatedLead, error: linkErr } = await supabase
            .from('leads')
            .update({
              converted_to_client_id: dup.id,
              status: 'CONVERTED',
              updated_at: new Date().toISOString(),
            })
            .eq('id', lead.id)
            .select()
            .maybeSingle();
          if (linkErr) throw linkErr;
          return res.json({ lead: updatedLead, client: dup, linked_to_existing: true });
        }
      }

      // 4) Create the new client. ID format: 'C' + epoch + 6 random chars, same as
      //    POST /api/clients above. source='lead' so we know where it came from.
      //
      // Resilient to missing optional columns: if the migration that adds
      // `lead_id` / `created_by` hasn't been run yet, we retry the insert
      // without those fields. The basic CRM flow still works; the user just
      // loses the back-link from client → lead until the migration lands.
      const newClientId = 'C' + Date.now() + '_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const newClient: any = {
        id: newClientId,
        name: lead.name,
        email: lowerEmail,
        phone: lead.phone || null,
        whatsapp: lead.whatsapp || null,
        tier: 'UHNWI',                     // default — admin can downgrade later
        status: 'ACTIVE',
        preferences: {
          dietary: [], beverages: [], temperature: '22°C', interests: [],
        },
        past_experiences: 0,
        total_spend: 0,
        loyalty_points: 0,
        notes: lead.message || lead.special_requests || null,
        source: 'lead',
      };
      // Try with the back-link + audit fields first (they live in
      // 2026-07-24_lead_client_link.sql and 2026-07-25_user_roles_rbac.sql).
      const clientInsert = async (row: any) => supabase
        .from('clients')
        .insert(row)
        .select()
        .maybeSingle();
      let createResult = await clientInsert({ ...newClient, lead_id: lead.id, created_by: creatorEmail });
      let createErr = createResult.error;
      let createdClient = createResult.data;
      // If the optional columns don't exist, drop them and retry once.
      if (createErr && (createErr.code === 'PGRST204' || /does not exist/i.test(createErr.message || ''))) {
        console.warn('clients insert: optional columns missing, retrying without them:', createErr.message);
        createResult = await clientInsert({ ...newClient, created_by: creatorEmail });
        createErr = createResult.error;
        createdClient = createResult.data;
        if (createErr && (createErr.code === 'PGRST204' || /does not exist/i.test(createErr.message || ''))) {
          // Even created_by missing? Drop it.
          createResult = await clientInsert(newClient);
          createErr = createResult.error;
          createdClient = createResult.data;
        }
      }
      if (createErr) throw createErr;
      if (!createdClient) throw new Error('client insert returned null');

      // 5) Mark the lead as converted. Same resilient pattern for the back-link.
      const leadUpdate = async (extra: any) => supabase
        .from('leads')
        .update({ status: 'CONVERTED', ...extra })
        .eq('id', lead.id)
        .select()
        .maybeSingle();
      let updateResult = await leadUpdate({
        converted_to_client_id: createdClient.id,
        updated_at: new Date().toISOString(),
      });
      let updateErr = updateResult.error;
      let updatedLead = updateResult.data;
      if (updateErr && (updateErr.code === 'PGRST204' || /does not exist/i.test(updateErr.message || ''))) {
        console.warn('leads update: converted_to_client_id column missing, retrying without it:', updateErr.message);
        updateResult = await leadUpdate({ updated_at: new Date().toISOString() });
        updateErr = updateResult.error;
        updatedLead = updateResult.data;
        if (updateErr && /updated_at/i.test(updateErr.message || '')) {
          // No updated_at either — just set status.
          updateResult = await leadUpdate({});
          updateErr = updateResult.error;
          updatedLead = updateResult.data;
        }
      }
      if (updateErr) throw updateErr;

      res.json({ lead: updatedLead, client: createdClient, already_converted: false });
    } catch (error: any) {
      console.error('POST /api/leads/:id/convert failed', error?.message || error);
      res.status(500).json({ error: error?.message || 'convert failed' });
    }
  });

  // Bookings API
  app.get("/api/bookings", async (req, res) => {
    const { supplier_id, include_archived } = req.query;
    try {
      let bookings;
      // v1.8.0 Step 14: default = active only. ?include_archived=true to see all.
      const showArchived = String(include_archived || '').toLowerCase() === 'true';

      if (supplier_id) {
        // Get asset IDs for this supplier first
        const { data: assets } = await supabase
          .from('assets').select('id').eq('supplier_id', supplier_id);
        const assetIds = assets?.map(a => a.id) || [];

        if (assetIds.length === 0) {
          return res.json([]);
        }

        let q = supabase
          .from('bookings')
          .select(`*, assets(name, type)`)
          .in('asset_id', assetIds);
        if (!showArchived) q = q.is('archived_at', null);
        const { data, error } = await q.order('created_at', { ascending: false });

        if (error) throw error;
        bookings = data;
      } else {
        let q = supabase
          .from('bookings')
          .select(`*, assets(name, type)`);
        if (!showArchived) q = q.is('archived_at', null);
        const { data, error } = await q.order('created_at', { ascending: false });

        if (error) throw error;
        bookings = data;
      }

      // Transform to match previous response format
      const transformed = (bookings || []).map((b: any) => ({
        ...b,
        asset_name: b.assets?.name,
        asset_type: b.assets?.type
      }));

      res.json(transformed);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    const { asset_id, guest_name, guest_email, start_date, end_date, total_price, notes } = req.body;
    const id = crypto.randomUUID();
    try {
      const { error } = await supabase
        .from('bookings')
        .insert([{ id, asset_id, guest_name, guest_email, start_date, end_date, total_price, notes }]);
      
      if (error) throw error;

      // Fire Telegram notification asynchronously (non-blocking)
      if (asset_id) {
        const { data: asset } = await supabase.from('assets').select('supplier_id').eq('id', asset_id).maybeSingle();
        if (asset?.supplier_id) {
          sendTelegramNotification(asset.supplier_id, { asset_id, guest_name, guest_email, start_date, end_date, total_price, notes });
        }
      }

      res.json({ success: true, booking_id: id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/bookings/:id", async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    try {
      const updates: any = {};
      if (status) updates.status = status;
      if (notes !== undefined) updates.notes = notes;

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/bookings/:id — single booking (admin-only). Used by /admin/bookings/[id].
  app.get("/api/bookings/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const { data, error } = await supabase
        .from('bookings')
        .select(`*, assets(name, type, supplier_id, suppliers(business_name, contact_name, email, whatsapp))`)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'booking not found' });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Supplier API
  app.post("/api/suppliers/register", async (req, res) => {
    const { id: providedId, firebase_uid, business_name, contact_name, email, whatsapp, location, asset_type, description, google_calendar_id } = req.body;
    const id = providedId || crypto.randomUUID();
    
    try {
      const { error } = await supabase
        .from('suppliers')
        .upsert({
          id, firebase_uid, business_name, contact_name, email, whatsapp, location, asset_type, description, 
          google_calendar_id: google_calendar_id || null
        });
      
      if (error) throw error;
      res.json({ success: true, supplier_id: id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/suppliers", async (req, res) => {
    try {
      const { include_archived } = req.query;
      let q = supabase.from('suppliers').select('*');
      // v1.8.0 Step 14: default = active only. ?include_archived=true to see all.
      if (String(include_archived || '').toLowerCase() !== 'true') {
        q = q.is('archived_at', null);
      }
      const { data, error } = await q.order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Supplier lookup (by Firebase UID or email)
  // v1.8.0 Step 11.12: MOVED HERE so it registers BEFORE /api/suppliers/:id.
  // Express matches in order — the `:id` wildcard was shadowing `/lookup`,
  // making the lookup route unreachable. The handler then ran `.single()` on
  // `id="lookup"`, which threw "Cannot coerce the result to a single JSON
  // object" because no supplier has that id, and returned 500 to the client.
  // Registering the literal path first fixes the shadowing.
  //
  // v1.8.0 Step 10.2: completely refactored to use exact select + a per-field
  // try/catch. The previous version still hit "Cannot coerce the result to a
  // single JSON object" because the Supabase JS client's error wrapping is
  // unreliable. New approach: build the query URL ourselves and use
  // PostgREST directly via the URL pattern.
  app.get("/api/suppliers/lookup", async (req, res) => {
    const { uid, email } = req.query;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.json({ supplier: null });
    }

    // v1.8.0 Step 11.8: use a raw PostgREST fetch bypassing the Supabase
    // JS client entirely. The client wraps PostgREST errors in a way
    // that throws on shape mismatches (e.g. when a requested column
    // doesn't exist on the table). Going direct to PostgREST gives us
    // the raw JSON response and full control over the error path.
    const headers: Record<string, string> = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    };

    async function fetchOne(url: string): Promise<any | null> {
      try {
        const r = await fetch(url, { headers });
        if (!r.ok) {
          // 406 = no rows when using Prefer: return=single, but we don't
          // use that. Any other error → treat as no match.
          if (r.status === 404) return null;
          const txt = await r.text();
          console.error('suppliers/lookup postgrest error', r.status, txt.slice(0, 300));
          return null;
        }
        const rows = (await r.json()) as any[];
        return rows && rows.length > 0 ? rows[0] : null;
      } catch (e) {
        console.error('suppliers/lookup fetch error', e);
        return null;
      }
    }

    try {
      if (typeof uid === 'string' && uid.length > 0) {
        const url = `${supabaseUrl}/rest/v1/suppliers?firebase_uid=eq.${encodeURIComponent(uid)}&limit=1`;
        const row = await fetchOne(url);
        if (row && row.firebase_uid === uid) return res.json({ supplier: row });
      }
      if (typeof email === 'string' && email.length > 0) {
        const url = `${supabaseUrl}/rest/v1/suppliers?email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`;
        const row = await fetchOne(url);
        if (row) return res.json({ supplier: row });
      }
      res.json({ supplier: null });
    } catch (error: any) {
      console.error('lookup failed', error?.message || error);
      res.json({ supplier: null });
    }
  });

  // Get a single supplier by ID
  // v1.8.0 Step 11.12: NOTE — this `:id` route SHADOWS any literal path that
  // starts with `/api/suppliers/<literal>`. If you add another literal route
  // like /api/suppliers/lookup, register it BEFORE this one.
  app.get("/api/suppliers/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { data: supplier, error: sError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();

      if (sError) throw sError;
      if (!supplier) return res.status(404).json({ error: "Supplier not found" });

      const { data: assets, error: aError } = await supabase
        .from('assets')
        .select('*')
        .eq('supplier_id', id);

      if (aError) throw aError;

      res.json({ ...supplier, assets });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/suppliers — create a new supplier (admin-only).
  // Used by /admin → Suppliers when the operator hits "+" and fills the
  // EntityEditModal. body shape mirrors the SUPPLIERS_CONFIG in EntityConfigs.tsx
  // (trilingual fields, contact info, asset_type, status, photo_url).
  app.post("/api/suppliers", async (req, res) => {
    try {
      const { role, email: creatorEmail } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const body = req.body || {};
      if (!body.business_name && !body.business_name_en) {
        return res.status(400).json({ error: 'business_name required' });
      }
      const id = body.id || ('S' + Date.now() + '_' + Math.random().toString(36).substring(2, 8).toUpperCase());
      // The base `business_name` / `description` columns stay as the canonical
      // Spanish value (per the trilingual migration contract). EN/ES/PT override.
      const business_name = body.business_name || body.business_name_es || body.business_name_en || 'Unnamed Supplier';
      const description = body.description || body.description_es || body.description_en || null;
      // v1.8.0 Step 20: extended supplier profile (SIA + Vendorful standard).
      // Resilient insert: try each block, fall back on missing columns.
      const baseRow: any = {
        id,
        business_name,
        description,
        business_name_en: body.business_name_en || null,
        business_name_es: body.business_name_es || business_name,
        business_name_pt: body.business_name_pt || null,
        description_en: body.description_en || null,
        description_es: body.description_es || description,
        description_pt: body.description_pt || null,
        contact_name: body.contact_name || null,
        email: body.email || null,
        whatsapp: body.whatsapp || null,
        location: body.location || null,
        asset_type: body.asset_type || 'LODGING',
        status: body.status || 'PENDING',
        // Audit fields added by 2026-07-27_supplier_audit.sql. Always
        // present after that migration, safe to include from day one.
        photo_url: body.photo_url || null,
        created_by: creatorEmail,
        updated_by: creatorEmail,
      };
      // Extended fields (v1.8.0 Step 20). Each block can be dropped on 42703.
      const extendedBlocks: Array<Record<string, any>> = [
        // Block A: contact enrichment (pillar + geo)
        { pillar: body.pillar || body.asset_type || null, country: body.country || null, city: body.city || null },
        // Block B: digital presence
        { tax_id: body.tax_id || null, website: body.website || null, instagram: body.instagram || null, linkedin_url: body.linkedin_url || null },
        // Block C: capacity + licensing
        { years_in_business: body.years_in_business != null ? Number(body.years_in_business) : null, fleet_size: body.fleet_size != null ? Number(body.fleet_size) : null, license_number: body.license_number || null },
        // Block D: insurance
        { insurance_provider: body.insurance_provider || null, insurance_expiry: body.insurance_expiry || null },
        // Block E: banking (only last 4 stored, never full numbers)
        { bank_name: body.bank_name || null, bank_account_last4: body.bank_account_last4 || null },
        // Block F: commercial terms
        { commission_pct: body.commission_pct != null ? Number(body.commission_pct) : 5.00, payment_terms: body.payment_terms || 'NET_48' },
        // Block G: rating + tags
        { rating_avg: body.rating_avg != null ? Number(body.rating_avg) : null, rating_count: body.rating_count != null ? Number(body.rating_count) : 0, tags: Array.isArray(body.tags) ? body.tags : [] },
      ];
      const row: any = { ...baseRow };
      for (const block of extendedBlocks) {
        const trial: any = { ...row, ...block };
        const trialRes = await supabase.from('suppliers').insert(trial).select().maybeSingle();
        if (!trialRes.error) return res.json(trialRes.data);
        if (trialRes.error.code === 'PGRST204' || /does not exist/i.test(trialRes.error.message || '')) {
          console.warn('POST /api/suppliers: extended block missing, retrying without it:', trialRes.error.message);
          continue;
        }
        if (/duplicate key/i.test(trialRes.error.message || '')) {
          return res.status(409).json({ error: 'supplier with this id already exists' });
        }
        throw trialRes.error;
      }
      // No block succeeded → fall back to baseRow alone.
      const finalRes = await supabase.from('suppliers').insert(baseRow).select().maybeSingle();
      if (finalRes.error) {
        if (/duplicate key/i.test(finalRes.error.message || '')) {
          return res.status(409).json({ error: 'supplier with this id already exists' });
        }
        throw finalRes.error;
      }
      res.json(finalRes.data);
    } catch (e: any) {
      console.error('POST /api/suppliers failed', e?.message || e);
      res.status(500).json({ error: e?.message || 'create supplier failed' });
    }
  });

  // PATCH /api/suppliers/:id — partial update (used by EntityEditModal "Save" on an existing row).
  // Only updates fields present in body. Skips unknown columns defensively.
  app.patch("/api/suppliers/:id", async (req: express.Request<{ id: string }>, res) => {
    const { id } = req.params;
    try {
      const { role, email: updaterEmail } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      // v1.8.0 Step 20: full supplier profile is now editable. Any unknown
      // column is silently dropped on 42703 (Postgres missing column).
      const allowed = [
        // Core + trilingual
        'business_name', 'business_name_en', 'business_name_es', 'business_name_pt',
        'description', 'description_en', 'description_es', 'description_pt',
        'contact_name', 'email', 'whatsapp', 'location',
        'asset_type', 'pillar', 'status',
        'photo_url', 'created_by', 'updated_by',
        // Extended
        'tax_id', 'website', 'instagram', 'linkedin_url',
        'country', 'city',
        'years_in_business', 'fleet_size', 'license_number',
        'insurance_provider', 'insurance_expiry',
        'bank_name', 'bank_account_last4',
        'commission_pct', 'payment_terms',
        'rating_avg', 'rating_count', 'tags',
      ];
      const updates: any = {};
      for (const k of allowed) {
        if (k in (req.body || {})) updates[k] = req.body[k];
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'no updatable fields provided' });
      }
      // Always set updated_by when we know the actor.
      if (updaterEmail) updates.updated_by = updaterEmail;
      // Try the update; if 42703 mentions a specific column, drop it and retry.
      let result = await supabase.from('suppliers').update(updates).eq('id', id).select().maybeSingle();
      let lastErr = result.error;
      while (lastErr && (lastErr.code === 'PGRST204' || /does not exist/i.test(lastErr.message || ''))) {
        const m = (lastErr.message || '').match(/column ['"]?([a-zA-Z0-9_]+)['"]? does not exist/i);
        if (!m) break;
        const col = m[1];
        console.warn(`PATCH /api/suppliers/:id: column ${col} missing, stripping it`);
        delete updates[col];
        if (Object.keys(updates).length === 0) {
          return res.status(400).json({ error: 'no updatable fields left after stripping missing columns' });
        }
        result = await supabase.from('suppliers').update(updates).eq('id', id).select().maybeSingle();
        lastErr = result.error;
      }
      if (lastErr) throw lastErr;
      if (!result.data) return res.status(404).json({ error: 'supplier not found' });
      res.json(result.data);
    } catch (e: any) {
      console.error(`PATCH /api/suppliers/:id failed`, e?.message || e);
      res.status(500).json({ error: e?.message || 'update failed' });
    }
  });

  app.patch("/api/suppliers/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status, approved_by } = req.body;
    try {
      const { error: sError } = await supabase
        .from('suppliers')
        .update({ status })
        .eq('id', id);

      if (sError) throw sError;

      if (status === 'APPROVED') {
        await supabase.from('assets').update({ status: 'ACTIVE' }).eq('supplier_id', id);
        console.log(`Supplier ${id} APPROVED. Assets activated.`);
        // Fire-and-forget: notify partner (Telegram + email) — never breaks the response
        notifyApproval(id, 'SUPPLIER_APPROVED', { supplier_id: id, approved_by: approved_by || null });
      } else if (status === 'REJECTED') {
        await supabase.from('assets').update({ status: 'REJECTED' }).eq('supplier_id', id);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get assets for a specific supplier
  app.get("/api/suppliers/:id/assets", async (req, res) => {
    const { id } = req.params;
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('supplier_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update supplier Telegram chat ID
  app.patch("/api/suppliers/:id/telegram", async (req, res) => {
    const { id } = req.params;
    const { telegram_chat_id } = req.body;
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ telegram_chat_id })
        .eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ═════════════════════════════════════════════════════════════════════
  // BUNDLES API — multi-supplier packages owned by a partner
  // ═════════════════════════════════════════════════════════════════════

  // GET /api/bundles/available-assets
  // Returns ACTIVE assets from APPROVED suppliers, with parent business_name.
  // (Mounted BEFORE /api/bundles/:id so it wins the static path match.)
  // v1.8.0 Step 20.1: avoid nested embed (assets -> suppliers) for the
  // same PostgREST schema-cache reason as the bundles list below. Two
  // flat queries instead, then a Map merge in JS.
  app.get("/api/bundles/available-assets", async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('id, name, type, location, description, price_per_unit, price_type, capacity, status, supplier_id')
        .eq('status', 'ACTIVE');

      if (error) throw error;
      const supplierIds = Array.from(new Set(
        (data || []).map((a: any) => a.supplier_id).filter((x: any): x is string => typeof x === 'string' && x.length > 0)
      ));
      let supplierMap: Record<string, { business_name: string; status: string }> = {};
      if (supplierIds.length > 0) {
        const { data: supplierRows, error: sErr } = await supabase
          .from('suppliers')
          .select('id, business_name, status')
          .in('id', supplierIds);
        if (sErr) throw sErr;
        supplierMap = Object.fromEntries(
          (supplierRows || []).map((s: any) => [s.id, { business_name: s.business_name, status: s.status }])
        );
      }

      // Filter to only APPROVED suppliers (Supabase JS doesn't filter
      // nested relationship .eq() — do it client-side).
      const rows = (data || [])
        .filter((row: any) => supplierMap[row.supplier_id]?.status === 'APPROVED')
        .map((row: any) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          location: row.location,
          description: row.description,
          price_per_unit: row.price_per_unit,
          price_type: row.price_type,
          capacity: row.capacity,
          status: row.status,
          supplier_id: row.supplier_id,
          business_name: supplierMap[row.supplier_id]?.business_name ?? 'Unknown',
        }));

      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/bundles — create a new bundle
  app.post("/api/bundles", async (req, res) => {
    const { owner_supplier_id, name, description, items } = req.body || {};

    if (!owner_supplier_id || !name || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'owner_supplier_id, name, and a non-empty items[] are required',
      });
    }

    try {
      // 1. Validate every asset_id exists AND its parent supplier is APPROVED
      const assetIds = items.map((i: any) => i?.asset_id).filter(Boolean);
      if (assetIds.length !== items.length) {
        return res.status(400).json({ error: 'Each item must include asset_id' });
      }

      const { data: assetRows, error: aErr } = await supabase
        .from('assets')
        .select('id, name, type, price_per_unit, supplier_id')
        .in('id', assetIds);

      if (aErr) throw aErr;

      const found = new Map((assetRows || []).map((a: any) => [a.id, a]));
      // v1.8.0 Step 20.1: second flat query for supplier statuses (no
      // nested embed — same PostgREST schema-cache reason).
      const supplierIds = Array.from(new Set(
        (assetRows || []).map((a: any) => a.supplier_id).filter((x: any): x is string => typeof x === 'string' && x.length > 0)
      ));
      let supplierStatusById: Record<string, string> = {};
      if (supplierIds.length > 0) {
        const { data: sRows, error: sErr } = await supabase
          .from('suppliers')
          .select('id, status')
          .in('id', supplierIds);
        if (sErr) throw sErr;
        supplierStatusById = Object.fromEntries((sRows || []).map((s: any) => [s.id, s.status]));
      }
      for (const id of assetIds) {
        const a: any = found.get(id);
        if (!a) {
          return res.status(400).json({ error: `Asset ${id} not found` });
        }
        if (a.supplier_id && supplierStatusById[a.supplier_id] !== 'APPROVED') {
          return res.status(400).json({
            error: `Asset ${a.name || id} belongs to a non-approved supplier`,
          });
        }
      }

      // 2. Compute total price from assets.price_per_unit * qty (ignore NaN)
      const total = items.reduce((sum: number, item: any) => {
        const a: any = found.get(item.asset_id);
        const raw = (a?.price_per_unit || '').toString();
        const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
        const qty = Math.max(1, parseInt(item.qty) || 1);
        if (isNaN(num)) return sum;
        return sum + num * qty;
      }, 0);

      // 3. Insert bundle (status forced to PENDING — client cannot set APPROVED)
      const bundleId = crypto.randomUUID();
      const { error: bErr } = await supabase.from('bundles').insert([{
        id: bundleId,
        owner_supplier_id,
        name,
        description: description ?? null,
        total_price: `$${total.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
        status: 'PENDING',
      }]);
      if (bErr) throw bErr;

      // 4. Insert bundle_items
      const itemRows = items.map((it: any) => ({
        id: crypto.randomUUID(),
        bundle_id: bundleId,
        asset_id: it.asset_id,
        qty: Math.max(1, parseInt(it.qty) || 1),
      }));
      const { error: biErr } = await supabase.from('bundle_items').insert(itemRows);
      if (biErr) throw biErr;

      res.json({ success: true, bundle_id: bundleId, total_price: total });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/bundles?supplier_id=X — list bundles owned by supplier
  app.get("/api/bundles", async (req, res) => {
    const { supplier_id } = req.query;
    if (!supplier_id) {
      return res.status(400).json({ error: 'supplier_id query param is required' });
    }
    try {
      const { data: bundles, error: bErr } = await supabase
        .from('bundles')
        .select('*')
        .eq('owner_supplier_id', supplier_id as string)
        .order('created_at', { ascending: false });

      if (bErr) throw bErr;
      if (!bundles || bundles.length === 0) return res.json([]);

      const bundleIds = bundles.map((b: any) => b.id);
      // v1.8.0 Step 20.1: avoid nested embed (assets -> suppliers) — PostgREST
      // schema cache sometimes can't resolve the second-level relationship
      // ("Could not find a relationship between 'bundles' and 'supplier_id'"
      // even though the FK exists). We split into 2 plain queries instead.
      const { data: items, error: iErr } = await supabase
        .from('bundle_items')
        .select('id, bundle_id, asset_id, qty, assets:asset_id ( name, type, location, supplier_id )')
        .in('bundle_id', bundleIds);

      if (iErr) throw iErr;

      // Second query: gather all distinct supplier_ids from the assets we
      // just loaded, then look up their business_name in one go.
      const supplierIds = Array.from(new Set(
        (items || [])
          .map((it: any) => it.assets?.supplier_id)
          .filter((x: any): x is string => typeof x === 'string' && x.length > 0)
      ));
      let supplierNamesById: Record<string, string> = {};
      if (supplierIds.length > 0) {
        const { data: supplierRows, error: sErr } = await supabase
          .from('suppliers')
          .select('id, business_name')
          .in('id', supplierIds);
        if (sErr) throw sErr;
        supplierNamesById = Object.fromEntries(
          (supplierRows || []).map((s: any) => [s.id, s.business_name])
        );
      }

      const itemsByBundle: Record<string, any[]> = {};
      for (const it of items || []) {
        const a: any = (it as any).assets;
        const supplierName = a?.supplier_id ? supplierNamesById[a.supplier_id] ?? null : null;
        itemsByBundle[it.bundle_id] = itemsByBundle[it.bundle_id] || [];
        itemsByBundle[it.bundle_id].push({
          id: it.id,
          bundle_id: it.bundle_id,
          asset_id: it.asset_id,
          qty: it.qty,
          asset_name: a?.name,
          asset_type: a?.type,
          asset_location: a?.location,
          supplier_business_name: supplierName,
        });
      }

      const result = bundles.map((b: any) => {
        const bundleItems = itemsByBundle[b.id] || [];
        return {
          ...b,
          items: bundleItems,
          items_count: bundleItems.length,
        };
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH /api/bundles/:id/status — admin sets APPROVED or REJECTED
  app.patch("/api/bundles/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status, approved_by } = req.body || {};
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'status must be APPROVED or REJECTED' });
    }
    try {
      const updates: Record<string, any> = { status };
      if (status === 'APPROVED') {
        updates.approved_at = new Date().toISOString();
        updates.approved_by = approved_by || null;
      }

      const { data: bundle, error: bErr } = await supabase
        .from('bundles')
        .update(updates)
        .eq('id', id)
        .select('id, name, owner_supplier_id')
        .maybeSingle();

      if (bErr) throw bErr;
      if (!bundle) return res.status(404).json({ error: 'Bundle not found' });

      if (status === 'APPROVED' && bundle.owner_supplier_id) {
        notifyApproval(bundle.owner_supplier_id, 'BUNDLE_APPROVED', {
          bundle_id: bundle.id,
          name: bundle.name,
          approved_by: approved_by || null,
        });
      }

      res.json({ success: true, status });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Assets API
  app.post("/api/assets", async (req, res) => {
    const asset = req.body;
    const id = crypto.randomUUID();
    try {
      const { error } = await supabase
        .from('assets')
        .insert([{
          id, 
          supplier_id: asset.supplier_id, 
          name: asset.name, 
          type: asset.type, 
          location: asset.location, 
          description: asset.description, 
          price_per_unit: asset.price_per_unit, 
          price_type: asset.price_type, 
          capacity: asset.capacity, 
          amenities: asset.amenities || [], 
          images: asset.images || [], 
          status: asset.status || 'ACTIVE', 
          google_calendar_id: asset.google_calendar_id
        }]);
      
      if (error) throw error;
      res.json({ success: true, asset_id: id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/assets/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    // Remove id from updates to avoid conflicts
    delete updates.id;
    delete updates.created_at;
    try {
      const { error } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/assets/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/assets", async (req, res) => {
    const { type, status, location, include_archived, pillar, supplier_id } = req.query;
    try {
      let query = supabase.from('assets').select('*');
      // v1.8.0 Step 14: default = active only. ?include_archived=true to see all.
      if (String(include_archived || '').toLowerCase() !== 'true') {
        query = query.is('archived_at', null);
      }

      if (type) query = query.eq('type', type);
      if (status) query = query.eq('status', status);
      if (location) query = query.ilike('location', `%${location}%`);
      // v1.8.0 Step 19: pillar + supplier_id filters (used by ExperienceWizard
      // to fetch assets per pillar when building a bundle).
      if (pillar) query = query.eq('pillar', String(pillar));
      if (supplier_id) query = query.eq('supplier_id', String(supplier_id));

      const { data, error } = await query;
      if (error) {
        // If the assets table doesn't exist (pre-migration state) or Supabase
        // is unreachable, return an empty array so the UI doesn't break.
        // A real error (not a "relation does not exist") still gets logged
        // but we degrade gracefully — the public marketplace just shows nothing.
        if (/relation.*does not exist/i.test(error.message || '')) {
          return res.json([]);
        }
        throw error;
      }

      res.json(data || []);
    } catch (error: any) {
      // Network / auth / unknown error — log but return empty so the UI keeps working.
      console.warn('GET /api/assets failed (returning empty):', error?.message || error);
      res.json([]);
    }
  });

  app.get("/api/assets/:id/availability", async (req, res) => {
    const { id } = req.params;
    const { month, year } = req.query;
    const prefix = `${year}-${month}`;
    
    try {
      const { data, error } = await supabase
        .from('asset_availability')
        .select('*')
        .eq('asset_id', id)
        .ilike('date', `${prefix}%`);
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/assets/:id/availability", async (req, res) => {
    const { id } = req.params;
    const { dates, status, price_override } = req.body;
    
    try {
      const upserts = dates.map((date: string) => ({
        id: crypto.randomUUID(),
        asset_id: id,
        date,
        status,
        price_override
      }));
      
      const { error } = await supabase
        .from('asset_availability')
        .upsert(upserts);
        
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Google Calendar Sync
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const GOOGLE_REDIRECT_URI = `${APP_URL}/api/calendar/callback`;

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  app.get("/api/calendar/auth-url", (req, res) => {
    const { supplier_id } = req.query;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.json({ url: null, mock: true });
    }

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar.readonly"],
      prompt: "consent",
      state: supplier_id as string
    });

    res.json({ url });
  });

  app.get("/api/calendar/callback", async (req, res) => {
    const { code, state: supplier_id } = req.query;
    if (!code) return res.status(400).send("No code provided");

    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      const expiry = tokens.expiry_date || (Date.now() + 3600000);
      
      // Ensure supplier exists
      await supabase.from('suppliers').upsert({ id: supplier_id, status: 'PENDING' });
      
      await supabase
        .from('suppliers')
        .update({
          google_access_token: tokens.access_token,
          google_refresh_token: tokens.refresh_token,
          google_token_expiry: expiry
        })
        .eq('id', supplier_id);

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_CALENDAR_AUTH_SUCCESS', supplier_id: '${supplier_id}' }, '*');
                window.close();
              } else {
                window.location.href = '/supplier?connected=true';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      res.status(500).send(`Auth failed: ${error.message}`);
    }
  });

  async function getValidAccessToken(supplier: any) {
    if (Date.now() < supplier.google_token_expiry - 60000) {
      return supplier.google_access_token;
    }

    if (!supplier.google_refresh_token) {
      throw new Error("No refresh token available");
    }

    const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
    client.setCredentials({ refresh_token: supplier.google_refresh_token });
    
    const { credentials } = await client.refreshAccessToken();
    const expiry = credentials.expiry_date || (Date.now() + 3600000);
    
    await supabase
      .from('suppliers')
      .update({
        google_access_token: credentials.access_token,
        google_token_expiry: expiry
      })
      .eq('id', supplier.id);

    return credentials.access_token;
  }

  async function syncSupplierCalendar(supplier_id: string) {
    const { data: supplier, error: sError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplier_id)
      .single();
      
    if (sError || !supplier) return 0;

    const { data: assets, error: aError } = await supabase
      .from('assets')
      .select('*')
      .eq('supplier_id', supplier_id);
      
    if (aError || !assets) return 0;

    let totalSynced = 0;
    for (const asset of assets) {
      totalSynced += await syncAssetCalendar(asset, supplier);
    }
    return totalSynced;
  }

  async function syncAssetCalendar(asset: any, supplier: any) {
    const calendarId = asset.google_calendar_id || supplier.google_calendar_id || 'primary';
    let events = [];

    if (!GOOGLE_CLIENT_ID || !supplier.google_access_token) {
      // Mock Sync
      const today = new Date();
      for (let i = 0; i < 5; i++) {
        const randomDay = Math.floor(Math.random() * 30);
        const date = new Date(today);
        date.setDate(today.getDate() + randomDay);
        events.push({
          start: { date: date.toISOString().split('T')[0] },
          end: { date: date.toISOString().split('T')[0] }
        });
      }
    } else {
      try {
        const accessToken = await getValidAccessToken(supplier);
        const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
        client.setCredentials({ access_token: accessToken });
        
        const calendar = google.calendar({ version: 'v3', auth: client });
        const timeMin = new Date().toISOString();
        const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        
        const res = await calendar.events.list({
          calendarId: calendarId,
          timeMin: timeMin,
          timeMax: timeMax,
          singleEvents: true,
          orderBy: 'startTime',
        });
        
        events = res.data.items || [];
      } catch (error: any) {
        console.error(`Failed to sync calendar for asset ${asset.id}:`, error.message);
        return 0;
      }
    }

    const availabilityUpserts = [];
    for (const event of events) {
      const startStr = event.start?.date || event.start?.dateTime?.split('T')[0];
      const endStr = event.end?.date || event.end?.dateTime?.split('T')[0];
      
      if (!startStr || !endStr) continue;

      let current = new Date(startStr);
      const endDate = new Date(endStr);

      while (current < endDate) {
        const dateStr = current.toISOString().split('T')[0];
        availabilityUpserts.push({
          id: crypto.randomUUID(),
          asset_id: asset.id,
          date: dateStr,
          status: 'BLOCKED',
          source: 'GOOGLE_CALENDAR'
        });
        current.setDate(current.getDate() + 1);
      }
      
      if (startStr === endStr) {
        availabilityUpserts.push({
          id: crypto.randomUUID(),
          asset_id: asset.id,
          date: startStr,
          status: 'BLOCKED',
          source: 'GOOGLE_CALENDAR'
        });
      }
    }

    if (availabilityUpserts.length > 0) {
      await supabase.from('asset_availability').upsert(availabilityUpserts);
    }

    return availabilityUpserts.length;
  }

  app.get("/api/calendar/sync/:asset_id", async (req, res) => {
    const { asset_id } = req.params;
    try {
      const { data: asset, error: aError } = await supabase.from('assets').select('*').eq('id', asset_id).single();
      if (aError || !asset) return res.status(404).json({ error: "Asset not found" });
      
      const { data: supplier, error: sError } = await supabase.from('suppliers').select('*').eq('id', asset.supplier_id).single();
      if (sError || !supplier) return res.status(404).json({ error: "Supplier not found" });
      
      const synced = await syncAssetCalendar(asset, supplier);
      res.json({ synced });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/calendar/sync-all", async (req, res) => {
    try {
      const { data: suppliers, error } = await supabase.from('suppliers').select('id').not('google_refresh_token', 'is', null);
      if (error) throw error;
      
      let total = 0;
      for (const s of suppliers) {
        total += await syncSupplierCalendar(s.id);
      }
      res.json({ success: true, total_synced: total });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // NOTE: /api/config is intentionally NOT registered here. The Vercel
  // auto-detect of api/index.ts strips the `/api` prefix from req.url
  // before the inner Express app sees it, so any Express route at
  // /api/* would not match. The wrapper at api/index.ts short-circuits
  // /api/config and /api/health directly (see api/_configHandler.ts).

  // ── v1.8.0: Admin role check + management ─────────────────────────────────
  // The browser sends the user's access token in the Authorization header.
  // We validate it with Supabase's getUser(token) and look up the role
  // in the public.user_roles table. Replaces the v1.7 hardcoded
  // ADMIN_EMAILS array in AdminGate.tsx.

  // Shared helper: validate a Bearer token, return the email + role.
  // Returns { email: string, role: 'admin' | 'partner' | 'viewer' | null }
  // null role means "no entry in user_roles" — treated as not authorized.
  const resolveAuthFromRequest = async (req: any): Promise<{ email: string | null; role: string | null; userId: string | null; job_title: string | null; permissions: any }> => {
    const auth = req.headers?.authorization || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return { email: null, role: null, userId: null, job_title: null, permissions: null };
    const token = m[1].trim();
    if (!token) return { email: null, role: null, userId: null, job_title: null, permissions: null };
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user?.email) return { email: null, role: null, userId: null, job_title: null, permissions: null };
      const email = data.user.email.toLowerCase();
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role, job_title, permissions')
        .eq('email', email)
        .maybeSingle();
      return {
        email,
        role: (roleRow?.role as string) ?? null,
        userId: data.user.id,
        job_title: (roleRow?.job_title as string) ?? null,
        permissions: roleRow?.permissions ?? null,
      };
    } catch {
      return { email: null, role: null, userId: null, job_title: null, permissions: null };
    }
  };

  // GET /api/admin/check — used by AdminGate on mount. Returns the role
  // for the currently signed-in user, or {role: null} if not signed in.
  app.get("/api/admin/check", async (req, res) => {
    try {
      const { email, role, userId } = await resolveAuthFromRequest(req);
      // v1.8.0 Step 17: include job_title + permissions from user_roles
      // so the client can render role-aware UI (sidebar sections, action buttons).
      let job_title: string | null = null;
      let permissions: any = null;
      if (email) {
        const { data: roleRow } = await supabase
          .from('user_roles')
          .select('job_title, permissions')
          .eq('email', email)
          .maybeSingle();
        job_title = roleRow?.job_title ?? null;
        permissions = roleRow?.permissions ?? null;
      }
      res.json({
        email, role, userId, isAdmin: role === 'admin',
        job_title, permissions,
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'check failed' });
    }
  });

  // GET /api/admin/users — list all users with their role. Admin-only.
  app.get("/api/admin/users", async (req, res) => {
    try {
      const { role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      // v1.8.0 Step 17: include job_title + permissions so the Settings table
      // can show the human label + the granular overrides per user.
      const { data, error } = await supabase
        .from('user_roles')
        .select('email, role, job_title, permissions, granted_by, granted_at, notes')
        .order('granted_at', { ascending: false });
      if (error) throw error;
      res.json({ users: data || [] });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'list failed' });
    }
  });

  // POST /api/admin/users — grant a role to an email. Admin-only.
  // v1.8.0 Step 17: now accepts job_title + permissions overrides.
  // body: { email, role: 'admin'|'sales'|'ops'|'partner'|'viewer', job_title?, notes?, permissions? }
  app.post("/api/admin/users", async (req, res) => {
    try {
      const { role, email: grantorEmail } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const { email, role: newRole, job_title, notes, permissions } = req.body || {};
      if (!email || !newRole) return res.status(400).json({ error: 'email and role required' });
      const ALLOWED = ['admin', 'sales', 'ops', 'partner', 'viewer'];
      if (!ALLOWED.includes(newRole)) {
        return res.status(400).json({ error: 'role must be admin|sales|ops|partner|viewer' });
      }
      const { data, error } = await supabase
        .from('user_roles')
        .upsert(
          {
            email: String(email).toLowerCase(),
            role: newRole,
            granted_by: grantorEmail,
            notes: notes || null,
            job_title: job_title || null,
            permissions: permissions || null,
          },
          { onConflict: 'email' }
        )
        .select()
        .single();
      if (error) throw error;
      res.json({ user: data });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'grant failed' });
    }
  });

  // DELETE /api/admin/users?email=... — revoke a role. Admin-only.
  // Cannot revoke yourself (prevents lockout).
  app.delete("/api/admin/users", async (req, res) => {
    try {
      const { role, email: callerEmail } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const target = String(req.query?.email || '').toLowerCase();
      if (!target) return res.status(400).json({ error: 'email required' });
      if (target === callerEmail) return res.status(400).json({ error: 'cannot revoke your own admin role' });
      const { error } = await supabase.from('user_roles').delete().eq('email', target);
      if (error) throw error;
      res.json({ revoked: target });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'revoke failed' });
    }
  });

  // ── Platform settings (v1.8.0 Step 18 — Phase A of bundling roadmap) ───
  // v0.5 model: stores global defaults (e.g. default_klo_markup_pct).
  // The values live in a key/value table with JSONB so we can extend
  // without migrations (e.g. add 'default_currency' later).
  // GET is admin-only because the values affect pricing across the platform.
  // PATCH is admin-only because non-admins shouldn't be able to change global markup.

  // GET /api/settings — return all platform settings as a flat object.
  // Pattern: { default_klo_markup_pct: 10.00, default_currency: 'USD', ... }
  app.get("/api/settings", async (req, res) => {
    try {
      const { role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value, updated_at, updated_by');
      if (error) throw error;
      // Flatten {key, value} into a single object. JSONB values come back
      // as parsed JSON (e.g. number 10.00, not string "10.00").
      const flat: Record<string, any> = {};
      for (const row of (data || [])) {
        flat[row.key] = row.value;
      }
      res.json(flat);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'load settings failed' });
    }
  });

  // PATCH /api/settings — update one or more keys. Body: { default_klo_markup_pct: 12.5, ... }
  // Only allows updating keys that already exist (prevents typos creating
  // zombie settings). To add a new key, run a migration.
  app.patch("/api/settings", async (req, res) => {
    try {
      const { email: callerEmail, role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const updates = req.body || {};
      if (typeof updates !== 'object' || Array.isArray(updates) || Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'body must be a non-empty object of key: value pairs' });
      }

      // v0.5 validation: numeric percentages must be 0-100. Extend per-key
      // as new settings are added.
      for (const [k, v] of Object.entries(updates)) {
        if (k.endsWith('_pct') || k.endsWith('_percent')) {
          const n = Number(v);
          if (isNaN(n) || n < 0 || n > 100) {
            return res.status(400).json({ error: `${k} must be a number 0-100` });
          }
        }
      }

      // Update each key. upsert with a WHERE-clause check on existing rows
      // to enforce "only existing keys can be updated".
      const results: any[] = [];
      for (const [k, v] of Object.entries(updates)) {
        const { data, error } = await supabase
          .from('platform_settings')
          .update({
            value: v as any,
            updated_at: new Date().toISOString(),
            updated_by: callerEmail,
          })
          .eq('key', k)
          .select();
        if (error) throw error;
        if (!data || data.length === 0) {
          return res.status(404).json({ error: `unknown setting: ${k}` });
        }
        results.push(data[0]);
      }
      res.json({ updated: results });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'update settings failed' });
    }
  });

  // ── Admin aggregate endpoints (v1.8.0 Step 8) ──────────────────────
  // Powers the STATS and BUNDLES sidebar sections in /admin.

  // GET /api/admin/stats — aggregate counts + recent activity. Admin-only.
  // Used by AdminStatsView. Designed to be cheap (4 parallel count queries).
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const { role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      // Helper: safe count (returns {count: 0} if the table doesn't exist).
      const safeCount = async (table: string, filter?: (q: any) => any) => {
        try {
          let q: any = supabase.from(table).select('id', { count: 'exact', head: true });
          if (filter) q = filter(q);
          const { count, error } = await q;
          if (error && (error.code === '42P01' || /does not exist/i.test(error.message || ''))) {
            return { count: 0 };
          }
          return { count: count || 0 };
        } catch {
          return { count: 0 };
        }
      };
      const [
        suppliersAll, suppliersApproved, suppliersPending,
        bookingsAll, bookingsConfirmed, bookingsPending,
        clientsAll, clientsUhnwi,
        leadsAll, leadsNew, leadsWon,
        bundlesAll,
      ] = await Promise.all([
        safeCount('suppliers'),
        safeCount('suppliers', (q) => q.eq('status', 'APPROVED')),
        safeCount('suppliers', (q) => q.eq('status', 'PENDING')),
        safeCount('bookings'),
        safeCount('bookings', (q) => q.eq('status', 'CONFIRMED')),
        safeCount('bookings', (q) => q.eq('status', 'PENDING')),
        safeCount('clients'),
        safeCount('clients', (q) => q.eq('tier', 'UHNWI')),
        safeCount('leads'),
        safeCount('leads', (q) => q.eq('status', 'NEW')),
        safeCount('leads', (q) => q.eq('status', 'WON')),
        safeCount('bundles'),
      ]);
      // Recent activity: 5 most-recent leads
      const { data: recentLeads } = await supabase
        .from('leads')
        .select('id, name, source, status, timestamp')
        .order('timestamp', { ascending: false })
        .limit(5);
      res.json({
        counts: {
          suppliers: {
            total: suppliersAll.count,
            approved: suppliersApproved.count,
            pending: suppliersPending.count,
          },
          bookings: {
            total: bookingsAll.count,
            confirmed: bookingsConfirmed.count,
            pending: bookingsPending.count,
          },
          clients: {
            total: clientsAll.count,
            uhnwi: clientsUhnwi.count,
          },
          leads: {
            total: leadsAll.count,
            new: leadsNew.count,
            won: leadsWon.count,
          },
          bundles: bundlesAll.count,
        },
        recentLeads: recentLeads || [],
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'stats failed' });
    }
  });

  // GET /api/admin/bundles — list all bundles across all suppliers (admin-only).
  // Used by AdminBundlesView. Each row links to /admin/bundles/[id] (future).
  // Graceful: if the bundles table doesn't exist (Postgres error 42P01),
  // return [] instead of 500 so the admin UI doesn't break.
  app.get("/api/admin/bundles", async (req, res) => {
    try {
      const { role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const { data, error } = await supabase
        .from('bundles')
        .select(`id, name, description, status, price_total, created_at, supplier_id, suppliers:supplier_id ( business_name, contact_name )`)
        .order('created_at', { ascending: false });
      if (error) {
        // 42P01 = undefined_table. Return empty so the admin view shows its empty state.
        if (error.code === '42P01' || /does not exist/i.test(error.message || '')) {
          return res.json([]);
        }
        throw error;
      }
      res.json(data || []);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'bundles list failed' });
    }
  });

  // ── Clients API (v1.8.0 Step 2) ────────────────────────────────────────────
  // UHNWI / VVIP / VIP client profiles. Backed by public.clients table
  // (created via db/migrations/2026-07-20_clients.sql).
  // All endpoints require admin role. Backward-compatible: if the table
  // doesn't exist yet, GET returns [] and writes return a clear 500.

  // GET /api/clients — list all clients (most recent first)
  app.get("/api/clients", async (req, res) => {
    try {
      const { role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const { tier, status, search, include_archived } = req.query;
      let query = supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      // v1.8.0 Step 14: default = active only. ?include_archived=true to see all.
      if (String(include_archived || '').toLowerCase() !== 'true') {
        query = query.is('archived_at', null);
      }
      if (tier) query = query.eq('tier', String(tier));
      if (status) query = query.eq('status', String(status));
      if (search) {
        const s = String(search).toLowerCase();
        query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%`);
      }
      const { data, error } = await query;
      if (error) {
        // Table missing — return empty array so the UI doesn't blow up.
        if (/relation.*does not exist/i.test(error.message || '')) {
          return res.json([]);
        }
        throw error;
      }
      res.json(data || []);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'fetch clients failed' });
    }
  });

  // GET /api/clients/:id — single client with their booking count + spend
  app.get("/api/clients/:id", async (req, res) => {
    try {
      const { role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const { id } = req.params;
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!client) return res.status(404).json({ error: 'client not found' });
      // Pull booking stats for this client
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, status, total_price, start_date, end_date, asset_name, asset_type')
        .eq('client_id', id)
        .order('start_date', { ascending: false });
      res.json({ ...client, bookings: bookings || [] });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'fetch client failed' });
    }
  });

  // POST /api/clients — create a new client
  // body: { name, email, phone?, whatsapp?, tier, status, preferences, notes, source }
  app.post("/api/clients", async (req, res) => {
    try {
      const { role, email: creatorEmail } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const body = req.body || {};
      if (!body.name) return res.status(400).json({ error: 'name required' });
      if (!body.email) return res.status(400).json({ error: 'email required' });
      if (!['UHNWI', 'VVIP', 'VIP'].includes(body.tier)) {
        return res.status(400).json({ error: 'tier must be UHNWI|VVIP|VIP' });
      }
      const id = 'C' + Date.now() + '_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      // v1.8.0 Step 20: extended CRM fields. The migration
      // 2026-07-28_crm_extended_fields.sql adds these. We use the resilient
      // insert pattern: try with all of them, fall back without optional
      // ones if 42703 is returned. This way the endpoint works whether or
      // not the migration has been run yet.
      const baseRow: any = {
        id,
        name: body.name,
        email: String(body.email).toLowerCase(),
        phone: body.phone || null,
        whatsapp: body.whatsapp || null,
        tier: body.tier,
        status: body.status || 'ACTIVE',
        preferences: body.preferences || {
          dietary: [], beverages: [], temperature: '22°C', interests: [],
        },
        past_experiences: body.past_experiences || 0,
        total_spend: body.total_spend || 0,
        loyalty_points: body.loyalty_points || 0,
        notes: body.notes || null,
        source: body.source || 'manual',
        created_by: creatorEmail,
      };
      // Extended fields, grouped so we can drop a whole group on failure.
      const extendedBlocks: Array<Record<string, any>> = [
        // Block A: contact enrichment
        { job_title: body.job_title || null, company: body.company || null, industry: body.industry || null },
        // Block B: residence / nationality
        { nationality: body.nationality || null, country_residence: body.country_residence || null, city_residence: body.city_residence || null, address_line: body.address_line || null },
        // Block C: KYC / wealth
        { source_of_wealth: body.source_of_wealth || null, net_worth_band: body.net_worth_band || null, tax_id: body.tax_id || null, date_of_birth: body.date_of_birth || null, preferred_language: body.preferred_language || 'ES' },
        // Block D: travel docs
        { passport_number: body.passport_number || null, passport_expiry: body.passport_expiry || null, emergency_contact: body.emergency_contact || null, linkedin_url: body.linkedin_url || null },
        // Block E: misc
        { tags: Array.isArray(body.tags) ? body.tags : [], alt_phones: Array.isArray(body.alt_phones) ? body.alt_phones : [], alt_emails: Array.isArray(body.alt_emails) ? body.alt_emails : [] },
      ];
      // Build the row by attempting each extended block. If the block's
      // columns are missing (PGRST204 / 42703), we drop it and continue.
      const row: any = { ...baseRow };
      for (const block of extendedBlocks) {
        const trial: any = { ...row, ...block };
        const trialRes = await supabase.from('clients').insert(trial).select().maybeSingle();
        if (!trialRes.error) {
          // Success — the row landed. Return it.
          return res.json(trialRes.data);
        }
        if (trialRes.error.code === 'PGRST204' || /does not exist/i.test(trialRes.error.message || '')) {
          console.warn('POST /api/clients: extended block missing columns, retrying without it:', trialRes.error.message);
          continue; // drop the block, try the next one
        }
        if (/duplicate key/i.test(trialRes.error.message || '')) {
          return res.status(409).json({ error: 'client with this email already exists' });
        }
        throw trialRes.error;
      }
      // No block succeeded → the base row alone might still work. Try it.
      const finalRes = await supabase.from('clients').insert(baseRow).select().maybeSingle();
      if (finalRes.error) {
        if (/duplicate key/i.test(finalRes.error.message || '')) {
          return res.status(409).json({ error: 'client with this email already exists' });
        }
        throw finalRes.error;
      }
      res.json(finalRes.data);
    } catch (e: any) {
      console.error('POST /api/clients failed', e?.message || e);
      res.status(500).json({ error: e?.message || 'create client failed' });
    }
  });

  // PATCH /api/clients/:id — partial update (tier, status, preferences, notes, etc.)
  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const { role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const { id } = req.params;
      // v1.8.0 Step 20: extended fields are updatable here too. Any unknown
      // column is silently dropped on 42703 (Postgres missing column).
      const allowed = [
        // Core
        'name', 'email', 'phone', 'whatsapp', 'tier', 'status',
        'preferences', 'past_experiences', 'total_spend',
        'loyalty_points', 'notes', 'source',
        // Extended
        'job_title', 'company', 'industry', 'nationality',
        'country_residence', 'city_residence', 'address_line',
        'source_of_wealth', 'net_worth_band', 'tax_id',
        'date_of_birth', 'preferred_language',
        'passport_number', 'passport_expiry', 'emergency_contact', 'linkedin_url',
        'tags', 'alt_phones', 'alt_emails',
      ];
      const updates: any = {};
      for (const k of allowed) {
        if (k in (req.body || {})) updates[k] = req.body[k];
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'no updatable fields provided' });
      }
      if (updates.tier && !['UHNWI', 'VVIP', 'VIP'].includes(updates.tier)) {
        return res.status(400).json({ error: 'tier must be UHNWI|VVIP|VIP' });
      }
      if (updates.status && !['ACTIVE', 'INACTIVE', 'PROSPECT'].includes(updates.status)) {
        return res.status(400).json({ error: 'status must be ACTIVE|INACTIVE|PROSPECT' });
      }
      if (updates.email) updates.email = String(updates.email).toLowerCase();
      // Try the update; if 42703 mentions a specific column, drop it and retry.
      let result = await supabase.from('clients').update(updates).eq('id', id).select().maybeSingle();
      let lastErr = result.error;
      while (lastErr && (lastErr.code === 'PGRST204' || /does not exist/i.test(lastErr.message || ''))) {
        const m = (lastErr.message || '').match(/column ['"]?([a-zA-Z0-9_]+)['"]? does not exist/i);
        if (!m) break;
        const col = m[1];
        console.warn(`PATCH /api/clients/:id: column ${col} missing, stripping it`);
        delete updates[col];
        if (Object.keys(updates).length === 0) {
          return res.status(400).json({ error: 'no updatable fields left after stripping missing columns' });
        }
        result = await supabase.from('clients').update(updates).eq('id', id).select().maybeSingle();
        lastErr = result.error;
      }
      if (lastErr) throw lastErr;
      if (!result.data) return res.status(404).json({ error: 'client not found' });
      res.json(result.data);
    } catch (e: any) {
      console.error('PATCH /api/clients/:id failed', e?.message || e);
      res.status(500).json({ error: e?.message || 'update client failed' });
    }
  });

  // DELETE /api/clients/:id — remove a client. Cascades to bookings.client_id (set null).
  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const { role } = await resolveAuthFromRequest(req);
      if (role !== 'admin') return res.status(403).json({ error: 'admin only' });
      const { id } = req.params;
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      res.json({ deleted: id });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'delete client failed' });
    }
  });

  // Simulated Stripe Payment Intent
  app.post("/api/payments/create-intent", async (req, res) => {
    const { amount, customerId } = req.body;
    const stripeClient = getStripe();
    
    if (stripeClient) {
      try {
        const paymentIntent = await stripeClient.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: 'usd',
          customer: customerId,
          automatic_payment_methods: { enabled: true },
        });
        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    } else {
      res.json({
        clientSecret: "pi_simulated_secret_" + Math.random().toString(36).substring(7),
        status: "requires_confirmation"
      });
    }
  });

  // Stripe Connect
  app.post("/api/stripe/connect", async (req, res) => {
    const stripeClient = getStripe();
    if (!stripeClient) {
      return res.json({ url: `${req.headers.origin}/provider/stripe-return`, accountId: "acct_simulated_" + Math.random().toString(36).substring(7) });
    }

    try {
      const account = await stripeClient.accounts.create({ type: 'express' });
      const accountLink = await stripeClient.accountLinks.create({
        account: account.id,
        refresh_url: `${req.headers.origin}/provider/stripe-refresh`,
        return_url: `${req.headers.origin}/provider/stripe-return`,
        type: 'account_onboarding',
      });
      res.json({ url: accountLink.url, accountId: account.id });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Stripe Checkout
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    const stripeClient = getStripe();
    if (!stripeClient) {
      return res.json({ id: "cs_simulated_" + Math.random().toString(36).substring(7), url: `${req.headers.origin}?booking=success` });
    }

    const { items, successUrl, cancelUrl, paymentMethod } = req.body;

    try {
      const sessionParams: any = {
        payment_method_types: paymentMethod === 'usdc' ? ['card', 'us_bank_account'] : ['card'],
        line_items: items.map((item: any) => ({
          price_data: {
            currency: 'usd',
            product_data: { name: item.name },
            unit_amount: Math.round(parseFloat(item.pricePerUnit.replace(/[^0-9.]/g, '')) * 100),
          },
          quantity: 1,
        })),
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
      };

      if (paymentMethod === 'usdc') {
        sessionParams.crypto = { enabled: true };
      }

      const session = await stripeClient.checkout.sessions.create(sessionParams);
      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/ai/chat', async (req, res) => {
    const { message, lang, mode } = req.body;
    
    async function callAI(systemPrompt: string, 
                          userMessage: string, 
                          maxTokens: number = 1500) {
      
      const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';

      if (AI_PROVIDER === 'claude') {
        // Claude via direct Anthropic API
        try {
          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) throw new Error("ANTHROPIC_API_KEY is missing");

          const response = await fetch(
            'https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-20240620',
              max_tokens: maxTokens,
              system: systemPrompt,
              messages: [{ role: 'user', content: userMessage }]
            })
          });
          const data: any = await response.json();
          if (data.error) throw new Error(data.error.message || 'Claude API error');
          return data.content?.[0]?.text || '';
        } catch (err) {
          console.error('Claude API failed:', err);
          return `Error calling Claude: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
      
      if (AI_PROVIDER === 'openrouter') {
        // OpenRouter
        try {
          const apiKey = process.env.OPENROUTER_API_KEY;
          if (!apiKey) throw new Error("OPENROUTER_API_KEY is missing");

          const response = await fetch(
            'https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://karibbeanluxuryoperators.lat',
              'X-Title': 'KLO Karibbean Luxury Operators'
            },
            body: JSON.stringify({
              model: 'meta-llama/llama-3.3-70b-instruct:free',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
              ],
              temperature: 0.7,
              max_tokens: maxTokens
            })
          });
          const data: any = await response.json();
          if (data.error) throw new Error(data.error.message || 'OpenRouter API error');
          return data.choices?.[0]?.message?.content || '';
        } catch (err) {
          console.error('OpenRouter API failed:', err);
          return `Error calling OpenRouter: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      // Default: Gemini via Google GenAI SDK
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          console.error("GEMINI_API_KEY is missing from environment");
          return "I apologize, but my intelligence core is currently disconnected. Please check the API configuration.";
        }

        const genai = new GoogleGenAI({ apiKey });
        const result = await genai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: userMessage,
          config: { systemInstruction: systemPrompt }
        });
        return result.text || '';
      } catch (err) {
        console.error('Gemini API failed:', err);
        // If it's an invalid API key, provide a more helpful message
        if (err instanceof Error && err.message.includes('API key not valid')) {
          return "I apologize, but there is an issue with my API key configuration. Please ensure a valid Gemini API key is set in the Secrets panel.";
        }
        return `Error calling Gemini: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    // Fetch active assets to give AI real inventory
    let assetContext = '';
    try {
      if (_supabase) {
        const { data: activeAssets, error: assetError } = await supabase
          .from('assets')
          .select('name, type, location, description, price_per_unit, price_type, capacity, amenities')
          .eq('status', 'ACTIVE')
          .order('type');
        
        if (assetError) throw assetError;
        
        if (activeAssets && activeAssets.length > 0) {
          assetContext = '\n\nCURRENT AVAILABLE INVENTORY IN CARTAGENA:\n';
          activeAssets.forEach((asset: any) => {
            const amenities = Array.isArray(asset.amenities) ? asset.amenities : JSON.parse(asset.amenities || '[]');
            assetContext += `
- ${asset.name} (${asset.type})
  Location: ${asset.location}
  Rate: ${asset.price_per_unit}
  Capacity: ${asset.capacity} guests
  Description: ${asset.description}
  Features: ${amenities.slice(0,4).join(', ')}
`;
          });
          assetContext += '\nOnly recommend assets from this list. If asked about something not in the list, say KLO is curating additional options and a concierge will follow up.\n';
        }
      } else {
        console.info('Supabase not configured, skipping asset context fetching.');
      }
    } catch (err) {
      console.error('Could not fetch assets for AI context', err);
    }

    const systemPrompt = `You are Maria, 
the personal AI concierge for KLO — Karibbean 
Luxury Operators. KLO is Cartagena's most exclusive 
ultra-luxury travel platform, currently in its 
founding phase and expanding across Colombia 
and the Caribbean.

YOUR ROLE:
You help ultra-high-net-worth clients plan bespoke 
journeys in and around Cartagena, Colombia. You 
orchestrate across five pillars:
- AIR: Private jets and helicopters
- SEA: Yachts and maritime experiences  
- STAY: Ultra-luxury villas and residences
- LAND: Armored and luxury ground transport 
  (Vianco Protocol)
- STAFF: Private chefs, security, concierge staff

YOUR PERSONALITY:
- Warm, discreet, and effortlessly knowledgeable
- Never use jargon, acronyms, or startup language
- Never mention internal terms like "UHNWI", 
  "B2B2C", "agential", or "middleware"
- Speak as a trusted personal advisor, not a 
  booking system
- If you don't know something, offer to have a 
  human concierge follow up

PRICING:
KLO charges a 20% management fee included in all 
quoted prices. Never mention this fee explicitly 
unless directly asked. Quote total all-in prices only.

LOCATION FOCUS:
You are the expert on Cartagena and coastal Colombia.
You know the best anchorages, the finest villas in 
Bocagrande and Manga, the private jet routes from 
Bogotá and Miami, and the security considerations 
for ground transport in Colombia.

WHEN PLANNING A JOURNEY:
If the client asks to plan a complete experience, 
respond ONLY with valid raw JSON — no markdown, 
no extra text:
{
  "title": "Journey name",
  "estimatedTotal": "$XX,XXX",
  "managementFee": "Included",
  "pillars": {
    "air": "Description or null",
    "sea": "Description or null", 
    "stay": "Description or null",
    "land": "Description or null",
    "staff": "Description or null"
  },
  "itinerary": [
    {
      "time": "09:00",
      "activity": "Activity name",
      "pillar": "AIR",
      "location": "Cartagena",
      "status": "Confirmed",
      "tte": "30m"
    }
  ],
  "securityBrief": {
    "level": "STANDARD",
    "riskAssessment": "Brief assessment",
    "protocols": ["Protocol 1", "Protocol 2"]
  },
  "legalRequirements": []
}

Always respond in ${lang} language.
${assetContext}`;

    try {
      const text = await callAI(systemPrompt, message, 1500);
      
      if (mode === 'plan') {
        try {
          const clean = text.replace(/```json|```/g,'').trim();
          const plan = JSON.parse(clean);
          res.json({ success: true, plan });
        } catch {
          res.json({ success: true, plan: null, text });
        }
      } else {
        res.json({ success: true, text });
      }
    } catch (error) {
      res.json({ success: true,
        text: 'A KLO concierge will contact you via WhatsApp within 2 hours.',
        plan: null });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/maria/chat  — María AI Concierge v3
  // Migrated from KLO-Concierge-OS (Firebase) → KLO Platform (Supabase).
  // - Structured extraction: fullName, email, phone, services, dates, pax, budget, language
  // - Trilingual: EN/ES/PT (auto-detect or via req.body.lang)
  // - Auto-persists to `leads` table using the 60+ extended fields (Step 20)
  // - Resilient insert: drops fields that don't exist yet (PGRST204/42703)
  // - Returns contract that AIAssistant.tsx expects: { success, reply, lead, meta }
  // ─────────────────────────────────────────────────────────────────────────
  app.post("/api/maria/chat", async (req, res) => {
    const { message, history, lang: reqLang, leadId: existingLeadId } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    // Auto-detect language from message if not provided
    const detectLang = (txt: string): 'EN' | 'ES' | 'PT' => {
      const t = txt.toLowerCase();
      // Common PT markers
      if (/\b(bom dia|boa tarde|boa noite|olá|obrigad[oa]|por favor|quero|gostaria|vocês?|está|estou|tenho)\b/.test(t)) return 'PT';
      // Common ES markers
      if (/\b(hola|buenos días|buenas tardes|buenas noches|gracias|por favor|quiero|quisiera|tengo|está|estoy)\b/.test(t)) return 'ES';
      return 'EN';
    };
    const lang: 'EN' | 'ES' | 'PT' = (reqLang === 'EN' || reqLang === 'ES' || reqLang === 'PT') ? reqLang : detectLang(message);

    // ── Schema for structured extraction (Gemini) ──
    const responseSchema = {
      type: "OBJECT",
      properties: {
        reply: {
          type: "STRING",
          description: "Warm, elegant, discreet concierge reply in the same language as the user. Progress qualification questions one at a time. Never be pushy."
        },
        fullName: { type: "STRING", description: "Guest's full name if mentioned, else null" },
        email: { type: "STRING", description: "Email address if mentioned, else null" },
        phone: { type: "STRING", description: "Phone/WhatsApp number if mentioned, else null" },
        servicesNeeded: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "One or more of: aviation, yacht, villa, transport, staff, events"
        },
        travelDates: { type: "STRING", description: "Travel dates/season if mentioned (free text, e.g. 'Dec 20-27, 2026'), else null" },
        origin: { type: "STRING", description: "Departure city or airport code (e.g. 'BOG', 'MIA'), else null" },
        destination: { type: "STRING", description: "Destination city or zone (e.g. 'CTG', 'Barú', 'Santa Marta'), else null" },
        passengers: { type: "INTEGER", description: "Number of guests/party size if mentioned, else null" },
        budget: { type: "INTEGER", description: "Total budget in USD if mentioned, else null" },
        documentationReady: { type: "BOOLEAN", description: "True if user confirms passports/visas ready, else null" },
        preferredLanguage: { type: "STRING", description: "'EN' | 'ES' | 'PT' based on user's language" },
        pillarInterest: { type: "STRING", description: "Primary pillar: 'aviation' | 'yacht' | 'villa' | 'transport' | 'staff' | 'mixed'" },
        qualified: { type: "BOOLEAN", description: "True if budget >= 10000 USD OR user is a clear UHNW (executive, family office, founder); else false" },
        // ── Experience DNA (Step 22) ──
        // Structured detail of what each lead needs so a broker can re-contact
        // with a pre-priced proposal. Maria extracts automatically — no extra questions.
        experienceDna: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              pillar: { type: "STRING", description: "aviation | yacht | villa | transport | staff | events" },
              type: {
                type: "STRING",
                description: "Specific sub-type. Aviation: 'light_jet' | 'midsize_jet' | 'heavy_jet' | 'helicopter'. Yacht: 'sailing' | 'motor' | 'mega' | 'catamaran'. Villa: 'beachfront' | 'old_town' | 'private_island' | 'penthouse'. Transport: 'armored_suv' | 'luxury_sedan' | 'sprinter' | 'limousine'. Staff: 'private_chef' | 'butler' | 'security' | 'concierge'. Events: 'wedding' | 'birthday' | 'corporate' | 'private_dining'."
              },
              details: {
                type: "OBJECT",
                description: "Any specifics: passengers, route, bedrooms, nights, dietary, flexibility, etc. Free-form key/value."
              }
            }
          },
          description: "Structured DNA of what the lead needs. Extract automatically from what the user mentioned, do not ask extra questions. Empty array if nothing mentioned yet."
        },
        priceEstimate: {
          type: "OBJECT",
          description: "USD price range Maria is comfortable quoting. CRITICAL: only set this when MINIMUM INFO is present for EVERY service requested. If ANY required detail is missing, return null. Per-service minimums — these are NOT negotiable: aviation (any route) = origin + destination + day + passengers. aviation (INTERNATIONAL, route outside Colombia e.g. MIA/JFK/SAO/PTY) = ALSO nationality + passport readiness. yacht = day + passengers. yacht (INTERNATIONAL) = ALSO nationality. villa = nights + guests. transport = days + passengers. staff = days + guests. events = type + guests + day. INTERNATIONAL DETECTION: if origin or destination is a non-CO airport code, mark isInternational=true and require the international minimums. Compute as: services-needed sum + 20% KLO management buffer. Confidence: 'low' = services only, 'medium' = + passengers, 'high' = + passengers + dates + duration. If ANY minimum is missing, return null for priceEstimate, fill missingForQuote[] with the missing keys (e.g. ['aviation:nationality','aviation:passports']) and explain in the reply WHY each is needed (flight plan, migration, antinarcotics coordination). NEVER quote a price without the minimums — a wrong quote is worse than no quote.",
          properties: {
            low: { type: "INTEGER", description: "Lower bound in USD" },
            high: { type: "INTEGER", description: "Upper bound in USD" },
            currency: { type: "STRING", description: "'USD' always" },
            confidence: { type: "STRING", description: "'low' | 'medium' | 'high'" },
            reasoning: { type: "STRING", description: "One-line explanation in the user's language. E.g. 'Heavy jet MIA-CTG + 5 nights beachfront villa in Barú + private chef'." }
          }
        },
        isInternational: {
          type: "BOOLEAN",
          description: "True if any requested aviation/yacht route crosses a Colombian border (e.g. MIA-CTG, CTG-SAO, BOG-PTY). Triggers the stricter international minimums."
        },
        operationalNotes: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Operational items the broker will have to coordinate. E.g. ['flight plan filing MIA-CTG (international)', 'customs manifest for 6 pax', 'antinarcotics coordination CTG', 'migration coordination 6 pax']. Empty if domestic only."
        },
        missingForQuote: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "List of missing required fields that prevent quoting. Empty array if everything is present. Examples: ['aviation:nationality', 'aviation:passports', 'villa:nights', 'yacht:passengers']. Maria should ask for these in the reply to enable pricing, and may briefly explain WHY each is operationally required."
        }
      },
      required: ["reply"]
    };

    const systemInstruction = `You are María, KLO's (Karibbean Luxury Operators) elite virtual concierge assistant.

ABOUT KLO:
KLO is Cartagena's most exclusive ultra-luxury travel platform, in its founding phase. We orchestrate 5 pillars:
- AIR: private jets and helicopters
- SEA: mega-yachts and maritime experiences
- STAY: ultra-luxury villas and residences
- LAND: armored VIP ground transport
- STAFF: private chefs, security, concierges

PRICING (for your own calibration — never quote to the user as a list):
- Light jet intra-Colombia (BOG-CTG, MDE-CTG): $4,500-$9,000 per leg
- Midsize jet regional (MIA-CTG, JFK-CTG): $18,000-$32,000 per leg
- Heavy jet / long-range: $45,000-$120,000 per leg
- Helicopter (CTG-Bok, CTG-Isla Barú, CTG-Isla Rosario): $1,800-$4,500 per flight
- Motor yacht day charter (40-60ft, 8-12 pax): $3,500-$7,500 / day
- Mega yacht day charter (80ft+, 12+ pax): $12,000-$25,000 / day
- Sailing yacht day: $2,500-$5,000 / day
- Private villa nightly (3-5BR, beachfront): $2,500-$6,000 / night
- Private villa nightly (5-8BR, ultra-luxe): $6,000-$18,000 / night
- Private chef daily: $1,200-$2,500 / day
- Butler daily: $900-$1,800 / day
- Armored SUV daily with driver: $1,200-$2,200 / day
- Wedding / private event: from $25,000 all-in

Your bespoke orchestrations start at $10,000 USD total. We never quote a fee — the price we give is all-inclusive. When the user asks for an estimate, give a range (low–high) rounded to the nearest $500, and always include 20% buffer for KLO's orchestration.

YOUR PERSONALITY:
- Warm, discreet, effortlessly knowledgeable (think Aman, Belmond, NetJets)
- Never use jargon, never mention "UHNWI" or internal terms
- Speak in the user's language (Spanish, English, or Portuguese)
- One question at a time — never interrogate
- If something is outside scope, offer a human concierge follow-up
- **MIN-INTERACTION PHILOSOPHY**: respect the user's time. Once you have an email/phone AND enough detail to estimate, propose a price range and offer to connect with a broker. Don't drag out the conversation.

YOUR GOAL — in this priority order:
1. Capture contact: full name + (email OR phone) — this is the priority.
2. As soon as contact is captured, PROPOSE A PRICE RANGE based on what they've mentioned. Don't wait for full qualification.
3. Offer to connect with a dedicated broker for the bespoke proposal.

QUALIFICATION RULE:
- Set "qualified": true if budget >= 10000 USD, OR if the user clearly identifies as UHNW (mentions being a CEO/founder/family office, names a 6-figure+ budget, asks for multi-asset orchestration).
- Otherwise "qualified": false.

EXPERIENCE DNA (auto-extract — do not ask extra questions for these):
- Build an "experienceDna" array of { pillar, type, details } for every service the user mentioned.
- Examples of type detection:
  - "private jet" with no size → type: "private_jet" (default heavy_jet if it's a long route, light_jet if intra-Colombia)
  - "yate" / "yacht" → type: "motor" by default
  - "villa en la playa" → pillar: "villa", type: "beachfront"
  - "casa en el centro histórico" → pillar: "villa", type: "old_town"
  - "chef privado" → pillar: "staff", type: "private_chef"
  - "helicóptero" → pillar: "aviation", type: "helicopter"
  - Always capture details: { passengers, route, bedrooms, nights, dietary, dates } if mentioned.

PRICE ESTIMATE — STRICT RULE: NO QUOTE WITHOUT MINIMUM INFO.
We cannot quote without the required minimums per service. Maria must respect this — her credibility AND the broker's operational planning depend on it.

Per-service minimums (these are operationally required, not negotiable):
- Aviation DOMESTIC (BOG-CTG, CTG-MDE, etc.): origin + destination + date + passengers
  - # passengers is critical for: slot request, ATC, FBO handling, manifest, weight & balance
- Aviation INTERNATIONAL (MIA-CTG, JFK-CTG, CTG-SAO, BOG-PTY, etc.): ALL of the above PLUS
  - passenger nationality (required for: flight plan filing, customs manifest, immigration, antinarcotics coordination)
  - passport readiness yes/no (required for: visa checks, customs clearance at destination)
  - **You CANNOT quote an international flight without this info. The broker physically cannot file the flight plan.**
- Yacht DOMESTIC: date + passengers (captain briefing, catering, fuel)
- Yacht INTERNATIONAL: + nationality for customs clearance
- Villa: nights + guests (and zone if not obvious)
- Transport terrestre: date + passengers + route type (airport_transfer / city_tour / inter_city)
  - airport_transfer: hotel-airport or airport-hotel (single trip)
  - city_tour: tours within CTG or surrounding area (Bocagrande, Getsemaní, Manga)
  - inter_city: long-distance (CTG-BOG, CTG-Medellín, CTG-Santa Marta, etc.)
  - Route type determines vehicle class and pricing
- Personal especializado: days + guests + schedule (half_day / eight_hour / full_day)
  - **schedule is critical for pricing** — half day is ~50% of full day, 8h standard, full day covers 3 meals + overnight standby
  - If user says "chef for tonight's dinner", assume half_day (one service, ~4h)
  - If user says "private chef during my stay", assume eight_hour per day
  - If user says "24/7 butler", assume full_day
- Events: type + guests + date (venue, vendors, permits, security)

INTERNATIONAL DETECTION:
- If the origin or destination is a non-CO airport code (MIA, JFK, NYC, LAX, MEX, SAO, GRU, EZE, MCO, ORD, YYZ, LHR, CDG, BCN, MAD, LIS, PTY, SJO, GUA, LIM, CLO, UPS, AQP), set isInternational=true and require international minimums.

Process:
1. Extract everything you can from the user's message.
2. Build "operationalNotes" listing what the broker will have to coordinate. E.g. for MIA-CTG with 6 pax: ['flight plan filing MIA-CTG (international)', 'customs manifest for 6 passengers', 'antinarcotics coordination CTG', 'migration coordination 6 pax'].
3. If EVERY required field is present for EVERY service → compute priceEstimate, apply 20% KLO buffer, set confidence, give reasoning.
4. If ANY required field is missing → set priceEstimate = null AND fill "missingForQuote" with the missing keys. In the reply, ask ONLY for the missing fields in ONE line, briefly explaining WHY each matters (e.g. "to file the flight plan" / "for immigration manifest" / "for antinarcotics coordination").

MIN-INTERACTION PHILOSOPHY (revised):
- Be fast, but be ACCURATE. A wrong or premature quote is worse than no quote — and on international flights, impossible to execute without the right info.
- Once you have contact AND the minimums for a price, propose it immediately and offer broker handoff.
- If minimums are missing, ask for them in ONE single line. Don't interrogate. Don't apologize. Just ask.
- Examples:
  - "Got it. To quote your international jet, may I have origin, destination, date, party size, and passenger nationality?" (one line, all 5)
  - "Perfect. For the villa, I need number of nights and party size to finalize pricing." (one line)
  - "To coordinate your international flight plan, I'll need the date and passenger nationality — the rest we have." (one line, focused)

LANGUAGE:
Respond in the user's language. Mirror their tone. Always reply in JSON matching the specified schema.`;

    // ── Fallback rule-based if no Gemini key ──
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[maria] No GEMINI_API_KEY — using rule-based fallback');
      const msgLower = message.toLowerCase();
      const result: any = {
        reply: lang === 'ES'
          ? 'Buenas tardes. Soy María, su asesora en KLO. ¿En qué puedo ayudarle? Ofrecemos jets privados, yates, villas exclusivas, transporte VIP y personal.'
          : lang === 'PT'
            ? 'Boa tarde. Sou María, sua consultora na KLO. Como posso ajudar? Oferecemos jatos privados, iates, villas exclusivas, transporte VIP e staff.'
            : 'Good afternoon. I am María, your KLO concierge. How may I help? We offer private jets, mega-yachts, exclusive villas, VIP ground transport, and staff.',
        fullName: null, email: null, phone: null,
        servicesNeeded: [],
        travelDates: null, origin: null, destination: null,
        passengers: null, budget: null,
        documentationReady: null, preferredLanguage: lang, pillarInterest: null, qualified: false,
        experienceDna: [],
        priceEstimate: null,
      };

      // ── Services detection + DNA extraction ──
      const dna: any[] = [];
      const servicesNeeded: string[] = [];

      // Aviation sub-type detection
      if (/helicopter|helicóptero|helicoptero/.test(msgLower)) {
        servicesNeeded.push('aviation');
        dna.push({ pillar: 'aviation', type: 'helicopter', details: {} });
      } else if (/jet|fly|aviation|vuelo|voo|plane|aircraft/.test(msgLower)) {
        servicesNeeded.push('aviation');
        // Heuristic: if long route (MIA, JFK, NYC, LAX, etc) → heavy, otherwise light
        const isLong = /\b(mia|jfk|nyc|lax|mex|sao|gru|eze|mco|ord|yyz|lhr)\b/i.test(msgLower);
        dna.push({ pillar: 'aviation', type: isLong ? 'heavy_jet' : 'light_jet', details: {} });
      }

      if (/yacht|yate|iate|boat|bote|barco/.test(msgLower)) {
        servicesNeeded.push('yacht');
        dna.push({ pillar: 'yacht', type: /sail|vela/.test(msgLower) ? 'sailing' : 'motor', details: {} });
      }
      if (/mega|super\s*yacht/.test(msgLower) && dna.some((d) => d.pillar === 'yacht')) {
        const y = dna.find((d) => d.pillar === 'yacht');
        if (y) y.type = 'mega';
      }

      if (/villa|casa|mansion|estate|resort/.test(msgLower)) {
        servicesNeeded.push('villa');
        const isOldTown = /centro|old town|histórico|historico|ciudad amurallada/.test(msgLower);
        const isBeach = /playa|beach|baru|baru|bocagrande/.test(msgLower);
        dna.push({ pillar: 'villa', type: isOldTown ? 'old_town' : isBeach ? 'beachfront' : 'private_villa', details: {} });
      }

      if (/transport|car|driver|suburban|sprinter|carro|camioneta/.test(msgLower)) {
        servicesNeeded.push('transport');
        const isArmored = /armor|blindado|blindada/.test(msgLower);
        dna.push({ pillar: 'transport', type: isArmored ? 'armored_suv' : 'luxury_sedan', details: {} });
      }

      if (/chef|security|staff|concierge|guard/.test(msgLower)) {
        servicesNeeded.push('staff');
        if (/chef/.test(msgLower)) dna.push({ pillar: 'staff', type: 'private_chef', details: {} });
        if (/security|guard|seguridad/.test(msgLower)) dna.push({ pillar: 'staff', type: 'security', details: {} });
        if (!dna.some((d) => d.pillar === 'staff')) dna.push({ pillar: 'staff', type: 'concierge', details: {} });
      }

      if (/event|wedding|birthday|evento|boda|casamiento/.test(msgLower)) {
        servicesNeeded.push('events');
        dna.push({ pillar: 'events', type: /wedding|boda|casamiento/.test(msgLower) ? 'wedding' : 'private_dining', details: {} });
      }

      result.servicesNeeded = servicesNeeded;
      result.experienceDna = dna;
      if (servicesNeeded.length > 0) result.pillarInterest = servicesNeeded[0];

      // ── Contact extraction ──
      const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) result.email = emailMatch[0];
      const phoneMatch = message.match(/(\+?\d[\d\s\-()]{7,}\d)/);
      if (phoneMatch) result.phone = phoneMatch[0].trim();

      // ── Passengers / dates / budget extraction ──
      const paxMatch = message.match(/(\d+)\s*(personas|guests|pax|huespedes|hóspedes|people)/i);
      if (paxMatch) result.passengers = parseInt(paxMatch[1], 10);

      const nightsMatch = message.match(/(\d+)\s*(noches|nights|noite)/i);
      if (nightsMatch) {
        const n = parseInt(nightsMatch[1], 10);
        const v = dna.find((d) => d.pillar === 'villa');
        if (v) v.details = { ...v.details, nights: n };
      }

      // Staff schedule detection: medio día / día completo / 8h jornada
      const scheduleHint = (msgLower: string): 'half_day' | 'full_day' | 'eight_hour' | null => {
        if (/\b(medio\s*d[ií]a|half\s*day|meia\s*tar(é|e)de)\b/.test(msgLower)) return 'half_day';
        if (/\b(d[ií]a\s*completo|full\s*day|dia\s*inteiro|24\s*h\b)/.test(msgLower)) return 'full_day';
        if (/\b(8\s*h|ocho\s*horas|oito\s*horas|jornada|8-hour|shift)\b/.test(msgLower)) return 'eight_hour';
        return null;
      };
      const staffSchedule = scheduleHint(msgLower);
      if (staffSchedule) {
        const s = dna.find((d) => d.pillar === 'staff');
        if (s) s.details = { ...s.details, schedule: staffSchedule };
      }

      const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        result.travelDates = dateMatch[1];
        const v = dna[0];
        if (v) v.details = { ...v.details, travel_date: dateMatch[1] };
      }

      const numMatches = message.match(/\b(\d{4,7})\b/g);
      if (numMatches) {
        for (const n of numMatches) {
          const v = parseInt(n.replace(/[\s,\.]/g, ''), 10);
          if (v >= 10000) { result.budget = v; result.qualified = true; break; }
        }
      }

      // ── Price estimate — STRICT MINIMUM VALIDATION ──
      // Per-service minimums required to quote. If ANY required field is missing,
      // do NOT compute a price — return null and ask only for what's missing.
      //
      // OPERATIONAL REASONING (so Maria can explain to the user why each field matters):
      //   - aviation international → need passengers + nationality for: flight plan filing,
      //     customs/immigration manifest, antinarcotics coordination, slot requests.
      //   - aviation domestic → need passengers + date for: slot request, ATC, FBO handling.
      //   - yacht international → need pax + nationality for: customs clearance, coast guard.
      //   - yacht domestic → need pax + date for: captain briefing, catering, fuel.
      //   - villa → nights + guests for: inventory check, staff scheduling, concierge planning.
      //   - transport → date + pax + route type (airport/city/intercity) for: driver + vehicle.
      //   - staff → days + guests + schedule (half_day/8h/full_day) for: chef menus, butler
      //     briefings, security shift planning. Schedule is critical because pricing
      //     varies significantly (4h lunch vs 8h standard vs 12h full day).
      //   - events → type + guests + date for: venue, vendors, permits, security plan.
      const missingForQuote: string[] = [];
      // (labelByKey is declared once below in the reply section, with the full
      // multilingual version. This validator just collects the raw missing keys.)

      // Detect if aviation is international (origin/destination are non-CO airports)
      const intlAirports = /\b(mia|jfk|nyc|lax|mex|sao|gru|eze|mco|ord|yyz|lhr|cdg|frankfurt|munich|bcn|mad|lis|panama|sjo|gua|lim|clo|ups|aqp)\b/i;
      const isInternational = dna.some((d) => d.pillar === 'aviation') && intlAirports.test(message);

      for (const item of dna) {
        if (item.pillar === 'aviation') {
          const codeMatches = (message.match(/\b([A-Z]{3})\b/g) || []);
          if (codeMatches.length < 2) missingForQuote.push('aviation:origin', 'aviation:destination');
          if (!item.details?.travel_date && !result.travelDates) missingForQuote.push('aviation:date');
          if (!result.passengers) missingForQuote.push('aviation:passengers');
          if (isInternational) {
            if (!item.details?.nationality && !item.details?.passenger_nationality) missingForQuote.push('aviation:nationality');
            if (result.documentationReady === null || result.documentationReady === undefined) missingForQuote.push('aviation:passports');
          }
        }
        if (item.pillar === 'yacht') {
          if (!item.details?.travel_date && !result.travelDates) missingForQuote.push('yacht:date');
          if (!result.passengers) missingForQuote.push('yacht:passengers');
          if (isInternational && !item.details?.nationality) missingForQuote.push('yacht:nationality');
        }
        if (item.pillar === 'villa') {
          if (!item.details?.nights) missingForQuote.push('villa:nights');
          if (!result.passengers) missingForQuote.push('villa:guests');
        }
        if (item.pillar === 'transport') {
          if (!item.details?.travel_date && !result.travelDates) missingForQuote.push('transport:date');
          if (!result.passengers) missingForQuote.push('transport:passengers');
          // Route type: airport transfer, city tour, inter-city. Detect heuristically.
          if (!item.details?.route_type) {
            if (/airport|aeropuerto|llegada|arrival|transfer/.test(msgLower)) item.details = { ...item.details, route_type: 'airport_transfer' };
            else if (/inter\s*-?\s*city|otra\s*ciudad|bogot|medell|santa\s*marta/.test(msgLower)) item.details = { ...item.details, route_type: 'inter_city' };
            else if (/city|tour|recorrido|recorr/.test(msgLower)) item.details = { ...item.details, route_type: 'city_tour' };
            else missingForQuote.push('transport:route');
          }
        }
        if (item.pillar === 'staff') {
          if (!item.details?.days && !item.details?.nights && !result.travelDates) missingForQuote.push('staff:days');
          if (!result.passengers) missingForQuote.push('staff:guests');
          // Schedule (medio día / 8h / día completo) is required — pricing varies 2-3x
          if (!item.details?.schedule) missingForQuote.push('staff:schedule');
        }
        if (item.pillar === 'events') {
          if (!item.details?.event_type && !item.type) missingForQuote.push('events:type');
          if (!result.passengers) missingForQuote.push('events:guests');
          if (!item.details?.travel_date && !result.travelDates) missingForQuote.push('events:date');
        }
      }

      result.missingForQuote = Array.from(new Set(missingForQuote));
      result.isInternational = isInternational;

      if (result.missingForQuote.length === 0 && dna.length > 0) {
        // All minimums present → compute price
        // Base table (per service) — single day / single occurrence.
        const priceTable: Record<string, [number, number]> = {
          'aviation:light_jet': [4500, 9000],
          'aviation:midsize_jet': [18000, 32000],
          'aviation:heavy_jet': [45000, 120000],
          'aviation:helicopter': [1800, 4500],
          'yacht:motor': [3500, 7500],
          'yacht:mega': [12000, 25000],
          'yacht:sailing': [2500, 5000],
          'villa:beachfront': [2500, 6000],
          'villa:old_town': [2000, 4500],
          'villa:private_villa': [6000, 18000],
          'villa:private_island': [15000, 40000],
          'villa:penthouse': [3000, 8000],
          'transport:armored_suv': [1200, 2200],
          'transport:luxury_sedan': [800, 1500],
          'transport:sprinter': [1500, 2800],
          // Staff pricing depends on schedule:
          //   half_day  ≈ 50% of full_day
          //   eight_hour = baseline
          //   full_day  ≈ 1.5x baseline (covers 3 meals + overnight standby)
          'staff:private_chef_eight_hour': [1200, 2500],
          'staff:private_chef_half_day': [600, 1300],
          'staff:private_chef_full_day': [1800, 3700],
          'staff:butler_eight_hour': [900, 1800],
          'staff:butler_half_day': [450, 900],
          'staff:butler_full_day': [1300, 2700],
          'staff:security_eight_hour': [1500, 3500],
          'staff:security_half_day': [800, 1800],
          'staff:security_full_day': [2200, 5000],
          'staff:concierge_eight_hour': [800, 1500],
          'staff:concierge_half_day': [400, 800],
          'staff:concierge_full_day': [1200, 2200],
          'events:wedding': [25000, 80000],
          'events:private_dining': [5000, 15000],
        };
        let low = 0, high = 0;
        for (const item of dna) {
          // Staff: include schedule in the lookup key
          const scheduleKey = item.pillar === 'staff' && item.details?.schedule
            ? `${item.pillar}:${item.type}_${item.details.schedule}`
            : `${item.pillar}:${item.type}`;
          const range = priceTable[scheduleKey] || priceTable[`${item.pillar}:${item.type}`];
          if (range) { low += range[0]; high += range[1]; }
        }
        // Apply nights multiplier for villa
        const v = dna.find((d) => d.pillar === 'villa');
        if (v?.details?.nights) {
          const n = v.details.nights;
          const key = `villa:${v.type}`;
          low = low - (priceTable[key]?.[0] || 0) + (priceTable[key]?.[0] || 0) * n;
          high = high - (priceTable[key]?.[1] || 0) + (priceTable[key]?.[1] || 0) * n;
        }
        // Apply days multiplier for transport + staff
        const transportItem = dna.find((d) => d.pillar === 'transport');
        if (transportItem?.details?.days) {
          const n = transportItem.details.days;
          const key = `transport:${transportItem.type}`;
          low = (low - (priceTable[key]?.[0] || 0)) + (priceTable[key]?.[0] || 0) * n;
          high = (high - (priceTable[key]?.[1] || 0)) + (priceTable[key]?.[1] || 0) * n;
        }
        const staffItem = dna.find((d) => d.pillar === 'staff');
        if (staffItem?.details?.days) {
          const n = staffItem.details.days;
          const skey = `${staffItem.pillar}:${staffItem.type}_${staffItem.details.schedule}`;
          low = (low - (priceTable[skey]?.[0] || 0)) + (priceTable[skey]?.[0] || 0) * n;
          high = (high - (priceTable[skey]?.[1] || 0)) + (priceTable[skey]?.[1] || 0) * n;
        }
        // 20% KLO orchestration buffer
        low = Math.round(low * 1.2 / 500) * 500;
        high = Math.round(high * 1.2 / 500) * 500;
        // Confidence
        const hasPax = !!result.passengers;
        const hasDates = !!result.travelDates || !!v?.details?.nights || !!staffItem?.details?.days;
        const confidence = hasPax && hasDates ? 'high' : hasPax ? 'medium' : 'low';
        const reasoning = dna.map((d) => {
          if (d.pillar === 'aviation') return d.type === 'helicopter' ? 'helicopter transfer' : `${d.type.replace('_', ' ')} charter`;
          if (d.pillar === 'yacht') return `${d.type} yacht day`;
          if (d.pillar === 'villa') return `${d.details?.nights || '?'} night ${d.type.replace('_', ' ')} villa`;
          if (d.pillar === 'transport') return `${d.type.replace('_', ' ')} ${d.details?.route_type ? d.details.route_type.replace('_', ' ') : 'transfer'}`;
          if (d.pillar === 'staff') {
            const sched = d.details?.schedule ? d.details.schedule.replace('_', ' ') : '';
            return `${d.type.replace('_', ' ')} (${sched})`;
          }
          if (d.pillar === 'events') return `${d.type.replace('_', ' ')}`;
          return d.pillar;
        }).join(' + ');
        result.priceEstimate = { low, high, currency: 'USD', confidence, reasoning };
      } else {
        result.priceEstimate = null;
      }

      // ── Reply logic — STRICT minimums: NO QUOTE without required fields ──
      const hasContact = !!(result.email || result.phone);
      const hasServices = servicesNeeded.length > 0;
      const hasPrice = result.priceEstimate && result.priceEstimate.high > 0;
      const hasMissing = (result.missingForQuote || []).length > 0;

      // Helper: format the list of missing fields in the user's language
      const labelByKey: Record<string, Record<string, string>> = {
        ES: {
          'aviation:origin': 'origen',
          'aviation:destination': 'destino',
          'aviation:date': 'fecha',
          'aviation:passengers': '# pasajeros (necesario para plan de vuelo y manifiesto)',
          'aviation:nationality': 'nacionalidad de los pasajeros',
          'aviation:passports': 'pasaportes listos (sí/no)',
          'yacht:date': 'fecha',
          'yacht:passengers': '# pasajeros',
          'yacht:nationality': 'nacionalidad (para clearance)',
          'villa:nights': '# noches',
          'villa:guests': '# huéspedes',
          'villa:zone': 'zona (Bocagrande / Old Town / Barú)',
          'transport:date': 'fecha del servicio',
          'transport:passengers': '# pasajeros',
          'transport:route': 'tipo de ruta (airport transfer / city tour / inter-city)',
          'staff:days': '# días',
          'staff:guests': '# huéspedes',
          'staff:schedule': 'jornada (medio día / 8h / día completo)',
          'events:type': 'tipo de evento',
          'events:guests': '# invitados',
          'events:date': 'fecha',
        },
        EN: {
          'aviation:origin': 'origin', 'aviation:destination': 'destination', 'aviation:date': 'date', 'aviation:passengers': '# passengers (required for flight plan + manifest)',
          'aviation:nationality': 'passenger nationality', 'aviation:passports': 'passports ready (yes/no)',
          'yacht:date': 'date', 'yacht:passengers': '# passengers', 'yacht:nationality': 'nationality (for clearance)',
          'villa:nights': '# nights', 'villa:guests': '# guests', 'villa:zone': 'zone (Bocagrande / Old Town / Barú)',
          'transport:date': 'service date', 'transport:passengers': '# passengers', 'transport:route': 'route type (airport transfer / city tour / inter-city)',
          'staff:days': '# days', 'staff:guests': '# guests', 'staff:schedule': 'shift (half day / 8h / full day)',
          'events:type': 'event type', 'events:guests': '# guests', 'events:date': 'date',
        },
        PT: {
          'aviation:origin': 'origem', 'aviation:destination': 'destino', 'aviation:date': 'data', 'aviation:passengers': '# passageiros (necessário para plano de voo e manifesto)',
          'aviation:nationality': 'nacionalidade dos passageiros', 'aviation:passports': 'passaportes prontos (sim/não)',
          'yacht:date': 'data', 'yacht:passengers': '# passageiros', 'yacht:nationality': 'nacionalidade (para desembaraço)',
          'villa:nights': '# noites', 'villa:guests': '# hóspedes', 'villa:zone': 'zona (Bocagrande / Old Town / Barú)',
          'transport:date': 'data do serviço', 'transport:passengers': '# passageiros', 'transport:route': 'tipo de rota (airport transfer / city tour / inter-city)',
          'staff:days': '# dias', 'staff:guests': '# hóspedes', 'staff:schedule': 'jornada (meio período / 8h / integral)',
          'events:type': 'tipo de evento', 'events:guests': '# convidados', 'events:date': 'data',
        },
      };
      const missingLabels = (result.missingForQuote || []).map((k: string) => labelByKey[lang]?.[k] || k);

      if (hasContact && hasServices && hasPrice) {
        // MIN-INTERACTION FLOW: we have everything — propose + offer broker
        const pe = result.priceEstimate;
        const priceStr = `$${pe.low.toLocaleString()}-$${pe.high.toLocaleString()} USD`;
        result.reply = lang === 'ES'
          ? `Perfecto. Para ${pe.reasoning}, nuestra orquestación estimada está en ${priceStr} (todo incluido, sin sorpresas). Un broker dedicado le contactará a ${result.email || result.phone} en las próximas 2 horas con una propuesta personalizada. ¿Prefiere WhatsApp, email o llamada?`
          : lang === 'PT'
            ? `Perfeito. Para ${pe.reasoning}, nossa orquestração estimada está em ${priceStr} (tudo incluso, sem surpresas). Um broker dedicado entrará em contato via ${result.email || result.phone} nas próximas 2 horas com uma proposta personalizada. Prefere WhatsApp, e-mail ou chamada?`
            : `Perfect. For ${pe.reasoning}, our estimated orchestration is ${priceStr} (all-inclusive, no surprises). A dedicated broker will reach out to ${result.email || result.phone} within 2 hours with a bespoke proposal. WhatsApp, email, or call?`;
      } else if (hasContact && hasServices && hasMissing) {
        // Have contact + services but missing fields — ask ONLY for missing
        const listStr = missingLabels.join(', ');
        result.reply = lang === 'ES'
          ? `Entendido. Para cotizar ${result.experienceDna?.[0]?.type || 'su solicitud'}, necesito: ${listStr}.`
          : lang === 'PT'
            ? `Entendido. Para cotizar ${result.experienceDna?.[0]?.type || 'sua solicitação'}, preciso de: ${listStr}.`
            : `Noted. To quote your ${result.experienceDna?.[0]?.type || 'request'}, I need: ${listStr}.`;
      } else if (result.qualified && !hasContact) {
        // UHNW with budget but no contact — ask for it
        result.reply = lang === 'ES'
          ? `Excelente. Con un presupuesto de $${result.budget?.toLocaleString()} USD podemos activar nuestro nivel elite. Para asignar un broker dedicado, ¿podría compartir su nombre completo y un correo o WhatsApp?`
          : lang === 'PT'
            ? `Excelente. Com orçamento de $${result.budget?.toLocaleString()} USD podemos ativar nosso nível elite. Para atribuir um broker dedicado, poderia compartilhar seu nome completo e um e-mail ou WhatsApp?`
            : `Excellent. A budget of $${result.budget?.toLocaleString()} USD unlocks our elite tier. To assign a dedicated broker, may I have your full name and an email or WhatsApp contact?`;
      } else if (hasContact && !hasServices) {
        // Have contact but no services — ask what they need
        result.reply = lang === 'ES'
          ? `Gracias. He registrado sus datos. ¿Qué tipo de experiencia le interesa? Jets privados, yates, villas, transporte o eventos?`
          : lang === 'PT'
            ? `Obrigado. Registrei seus dados. Que tipo de experiência lhe interessa? Jatos, iates, villas, transporte ou eventos?`
            : `Thank you. I have noted your contact. What type of experience interests you? Private jets, mega-yachts, exclusive villas, transport, or events?`;
      } else if (hasServices && !hasContact) {
        // Have services but no contact — ask for contact + minimums
        if (hasMissing) {
          const listStr = missingLabels.join(', ');
          result.reply = lang === 'ES'
            ? `Entendido. Para preparar su cotización de ${result.experienceDna?.[0]?.type || 'servicios'}, necesito: ${listStr}. Y, ¿cómo prefiere que le contactemos — correo o WhatsApp?`
            : lang === 'PT'
              ? `Entendido. Para preparar a cotação de ${result.experienceDna?.[0]?.type || 'serviços'}, preciso de: ${listStr}. E, como prefere que entremos em contato — e-mail ou WhatsApp?`
              : `Noted. To prepare your quote for ${result.experienceDna?.[0]?.type || 'services'}, I need: ${listStr}. And how would you prefer to be contacted — email or WhatsApp?`;
        } else {
          result.reply = lang === 'ES'
            ? `Entendido. Para enviarle la propuesta, ¿me comparte su correo o WhatsApp?`
            : lang === 'PT'
              ? `Entendido. Para enviar a proposta, poderia compartilhar seu e-mail ou WhatsApp?`
              : `Noted. To send you the proposal, may I have your email or WhatsApp?`;
        }
      } else if (hasContact) {
        // Just contact, nothing else — confirm
        result.reply = lang === 'ES'
          ? `Gracias, registrado. Un broker le contactará a ${result.email || result.phone} en breve. Mientras tanto, ¿hay algo específico que quisiera agregar a su solicitud?`
          : lang === 'PT'
            ? `Obrigado, registrado. Um broker entrará em contato via ${result.email || result.phone} em breve. Enquanto isso, há algo específico que gostaria de adicionar?`
            : `Thank you, noted. A broker will reach out to ${result.email || result.phone} shortly. In the meantime, is there anything specific you'd like to add?`;
      }

      // Persist to Supabase
      const lead = await persistMariaLead(result, existingLeadId);
      return res.json({ success: true, result, lead, meta: { language: lang, source: 'fallback' } });
    }

    // ── Live Gemini call ──
    try {
      const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const formattedHistory = (history || []).map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content || h.text || '' }]
      }));
      formattedHistory.push({ role: 'user', parts: [{ text: message }] });

      const response = await genai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: formattedHistory,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: responseSchema as any,
          temperature: 0.3,
        }
      });
      const responseText = response.text || '{}';
      let result: any;
      try { result = JSON.parse(responseText); }
      catch {
        // Gemini returned something non-JSON; wrap as plain reply
        result = { reply: responseText, qualified: false, preferredLanguage: lang };
      }
      // Always stamp the language we served
      result.preferredLanguage = result.preferredLanguage || lang;
      if (!result.pillarInterest && Array.isArray(result.servicesNeeded) && result.servicesNeeded.length > 0) {
        result.pillarInterest = result.servicesNeeded[0];
      }
      // Default experienceDna to empty array if Gemini didn't return it
      if (!Array.isArray(result.experienceDna)) result.experienceDna = [];

      // Persist to Supabase
      const lead = await persistMariaLead(result, existingLeadId);
      const turns = (history?.length || 0) + 1;
      return res.json({
        success: true,
        result,
        lead,
        meta: { language: lang, source: 'gemini', turns_used: turns }
      });
    } catch (err: any) {
      console.error('[maria] Gemini error:', err?.message || err);
      // Return graceful fallback so chat never breaks
      const fallbackResult = {
        reply: lang === 'ES'
          ? 'Disculpe, tuve una breve interferencia. ¿Podría repetir su última indicación?'
          : lang === 'PT'
            ? 'Desculpe, tive uma breve interferência. Poderia repetir sua última indicação?'
            : 'My apologies, a brief interference. Could you repeat your last detail?',
        qualified: false,
        preferredLanguage: lang,
      };
      return res.json({ success: true, result: fallbackResult, lead: null, meta: { language: lang, source: 'error-fallback' } });
    }
  });

  // Helper: persist Maria's extracted lead to Supabase.
  // Mirrors the resilient block-by-block pattern that POST /api/leads uses
  // (proven to work in production). Each block is a separate insert trial;
  // on 42703/PGRST204 the block is dropped and the next trial is attempted.
  async function persistMariaLead(result: any, existingLeadId?: string | null) {
    try {
      const sb = getSupabase();
      if (!sb) { console.warn('[maria] supabase not configured'); return null; }

      const id = existingLeadId || ('L' + Date.now());
      const timestamp = new Date().toISOString();
      const messageText = result.servicesNeeded?.length
        ? `María chat: interested in ${result.servicesNeeded.join(', ')}. ${result.travelDates ? 'Dates: ' + result.travelDates + '. ' : ''}${result.qualified ? '[AUTO-QUALIFIED]' : ''}`
        : 'Lead from María chat';

      // Core row (always works — these columns have existed since v0.1)
      const baseRow: any = {
        id,
        name: result.fullName || 'Anonymous (María Chat)',
        email: result.email || null,
        phone: result.phone || null,
        source: 'maria_chat',
        status: result.qualified ? 'QUALIFIED' : 'NEW',
        message: messageText,
        timestamp,
      };

      // Extended blocks (drop on 42703 just like POST /api/leads does)
      const extendedBlocks: Array<Record<string, any>> = [
        { preferred_language: result.preferredLanguage || 'ES' },
        { origin: result.origin || null, destination: result.destination || null, travelers: result.passengers != null ? Number(result.passengers) : null },
        { budget_min: result.budget ? Math.round(result.budget * 0.85) : null, budget_max: result.budget || null },
        { pillar_interest: result.pillarInterest || null, trip_type: 'LEISURE', accommodation: 'PRIVATE_VILLA' },
        { tags: result.qualified ? ['maria-chat', 'auto-qualified'] : ['maria-chat'] },
        // Step 22: Experience DNA + price estimate
        { experience_dna: Array.isArray(result.experienceDna) ? result.experienceDna : [] },
      ];
      // Price estimate — if Maria computed one, store it (single number = low end)
      if (result.priceEstimate && typeof result.priceEstimate === 'object' && result.priceEstimate.low) {
        extendedBlocks.push({
          price_estimate_usd: Number(result.priceEstimate.low) || null,
          estimate_confidence: result.priceEstimate.confidence || null,
        });
      }
      if (result.travelDates) {
        const m = String(result.travelDates).match(/(\d{4}-\d{2}-\d{2})/);
        if (m) extendedBlocks[1].travel_date = m[1];
      }

      // If updating an existing lead, do it block-by-block
      if (existingLeadId) {
        // Update core first
        const coreUpd = await sb.from('leads').update(baseRow).eq('id', existingLeadId).select();
        if (coreUpd.error) {
          console.warn('[maria] update core failed:', coreUpd.error.message);
          return null;
        }
        // Then try each extended block
        for (const block of extendedBlocks) {
          const trial = await sb.from('leads').update(block).eq('id', existingLeadId);
          if (!trial.error) continue;
          if (trial.error.code === 'PGRST204' || /does not exist/i.test(trial.error.message || '')) {
            console.info('[maria] extended column missing, skipping:', Object.keys(block).join(','));
            continue;
          }
          console.warn('[maria] extended update error:', trial.error.message);
        }
        // Return the final state
        const { data } = await sb.from('leads').select('*').eq('id', existingLeadId).maybeSingle();
        return data;
      }

      // Insert: try each combination until one succeeds
      const row: any = { ...baseRow };
      for (const block of extendedBlocks) {
        const trial: any = { ...row, ...block };
        const trialRes = await sb.from('leads').insert([trial]).select();
        if (!trialRes.error) {
          return trialRes.data![0];
        }
        if (trialRes.error.code === 'PGRST204' || /does not exist/i.test(trialRes.error.message || '')) {
          console.info('[maria] extended column missing, retrying without:', Object.keys(block).join(','));
          continue;
        }
        console.warn('[maria] insert trial failed:', trialRes.error.message);
        // Don't throw — try next block
      }
      // Last resort: just base row
      const finalRes = await sb.from('leads').insert([baseRow]).select();
      if (finalRes.error) {
        console.warn('[maria] final insert failed:', finalRes.error.message);
        return null;
      }
      return finalRes.data![0];
    } catch (e: any) {
      console.error('[maria] persistMariaLead exception:', e?.message || e);
      return null;
    }
  }

  app.post("/api/calendar/disconnect/:supplier_id", async (req, res) => {
    const { supplier_id } = req.params;
    try {
      await supabase
        .from('suppliers')
        .update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expiry: null,
          google_calendar_id: null
        })
        .eq('id', supplier_id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SPA static fallback — wrapped in try/catch so serverless (where dist/
  // may live in a different location) doesn't crash the import.
  // API routes registered above take precedence; this only matches what falls through.
  try {
    const distPath = path.join(dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } catch (e) {
    console.warn('Static dist fallback not available:', (e as Error)?.message);
  }

  // ── Long-running process only: periodic sync, dev middleware, listener.
  //    Vercel sets VERCEL=1 in serverless; we skip all of this on Vercel and
  //    instead export the app as a per-request handler.
  if (!process.env.VERCEL) {
    // Periodic Calendar Sync (long-running processes only)
    setInterval(async () => {
      console.log('Starting periodic calendar sync...');
      const { data: suppliers } = await supabase.from('suppliers').select('id').not('google_refresh_token', 'is', null);
      if (suppliers) {
        for (const supplier of suppliers) {
          try {
            await syncSupplierCalendar(supplier.id);
          } catch (error: any) {
            console.error(`Periodic sync failed for supplier ${supplier.id}:`, error.message);
          }
        }
      }
    }, 6 * 60 * 60 * 1000);

    // Vite dev middleware (development only)
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`KLO Ecosystem Server running on http://localhost:${PORT}`);
    });
  }

  // v1.8.0 Step 14: register archive/restore routes for all 6 admin entities.
  // See `registerArchiveRoutes` definition near the top of this function.
  for (const table of SOFT_DELETE_TABLES) {
    registerArchiveRoutes(table);
  }

  return app;
}

// Register all routes by calling startServer(). app.listen() is guarded by
// !process.env.VERCEL inside startServer(), so it only runs locally.
startServer();

export default app;

/*
# AI PROVIDER SELECTION
# Options: gemini (default), claude, openrouter
# Change this one variable to switch AI providers
AI_PROVIDER=gemini

# Required for Claude:
ANTHROPIC_API_KEY=
*/
