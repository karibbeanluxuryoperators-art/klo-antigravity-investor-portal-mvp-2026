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

  // ── Health check (must be first so we can diagnose serverless cold-start issues) ──
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
  app.get("/api/leads", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/leads", async (req, res) => {
    const { name, email, phone, whatsapp, experience_type, budget, travel_dates, special_requests, message, source } = req.body;
    const id = 'L' + Date.now();
    const timestamp = new Date().toISOString();
    const status = 'NEW';
    
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert([{ 
          id, name, email, phone, whatsapp, experience_type, 
          budget: budget || null, 
          travel_dates: travel_dates || null, 
          special_requests: special_requests || null, 
          message, status, timestamp, source 
        }])
        .select();
      
      if (error) throw error;
      res.json({ success: true, lead: data[0] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/leads/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    try {
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Bookings API
  app.get("/api/bookings", async (req, res) => {
    const { supplier_id } = req.query;
    try {
      let bookings;

      if (supplier_id) {
        // Get asset IDs for this supplier first
        const { data: assets } = await supabase
          .from('assets').select('id').eq('supplier_id', supplier_id);
        const assetIds = assets?.map(a => a.id) || [];

        if (assetIds.length === 0) {
          return res.json([]);
        }

        const { data, error } = await supabase
          .from('bookings')
          .select(`*, assets(name, type)`)
          .in('asset_id', assetIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        bookings = data;
      } else {
        const { data, error } = await supabase
          .from('bookings')
          .select(`*, assets(name, type)`)
          .order('created_at', { ascending: false });

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
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

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

  // Supplier lookup (by Firebase UID or email)
  app.get("/api/suppliers/lookup", async (req, res) => {
    const { uid, email } = req.query;
    try {
      // Try firebase_uid first
      if (uid) {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .eq('firebase_uid', uid)
          .maybeSingle();
        if (data) return res.json({ supplier: data });
      }
      // Fall back to email
      if (email) {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        if (data) return res.json({ supplier: data });
      }
      res.json({ supplier: null });
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
  // Returns ACTIVE assets from APPROVED suppliers, with parent business_name
  // (Mounted BEFORE /api/bundles/:id so it wins the static path match.)
  app.get("/api/bundles/available-assets", async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          id, name, type, location, description,
          price_per_unit, price_type, capacity, status,
          supplier_id,
          suppliers:supplier_id ( business_name, status )
        `)
        .eq('status', 'ACTIVE');

      if (error) throw error;

      // Filter to only APPROVED suppliers (Supabase JS doesn't filter
      // nested relationship .eq() — do it client-side).
      const rows = (data || [])
        .filter((row: any) => row.suppliers?.status === 'APPROVED')
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
          business_name: row.suppliers?.business_name ?? 'Unknown',
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
        .select(`id, name, type, price_per_unit, supplier_id, suppliers:supplier_id ( status )`)
        .in('id', assetIds);

      if (aErr) throw aErr;

      const found = new Map((assetRows || []).map((a: any) => [a.id, a]));
      for (const id of assetIds) {
        const a: any = found.get(id);
        if (!a) {
          return res.status(400).json({ error: `Asset ${id} not found` });
        }
        if (a.suppliers?.status !== 'APPROVED') {
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
      const { data: items, error: iErr } = await supabase
        .from('bundle_items')
        .select(`
          id, bundle_id, asset_id, qty,
          assets:asset_id ( name, type, location, supplier_id,
            suppliers:supplier_id ( business_name ) )
        `)
        .in('bundle_id', bundleIds);

      if (iErr) throw iErr;

      const itemsByBundle: Record<string, any[]> = {};
      for (const it of items || []) {
        const a: any = (it as any).assets;
        itemsByBundle[it.bundle_id] = itemsByBundle[it.bundle_id] || [];
        itemsByBundle[it.bundle_id].push({
          id: it.id,
          bundle_id: it.bundle_id,
          asset_id: it.asset_id,
          qty: it.qty,
          asset_name: a?.name,
          asset_type: a?.type,
          asset_location: a?.location,
          supplier_business_name: a?.suppliers?.business_name ?? null,
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
    const { type, status, location } = req.query;
    try {
      let query = supabase.from('assets').select('*');

      if (type) query = query.eq('type', type);
      if (status) query = query.eq('status', status);
      if (location) query = query.ilike('location', `%${location}%`);

      const { data, error } = await query;
      if (error) throw error;
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  // Simulated Admin Data
  app.get("/api/admin/stats", (req, res) => {
    res.json({
      totalRevenue: "$2.4M",
      activeBookings: 42,
      pendingApprovals: 7,
      partnerCount: 128,
      revenueData: [
        { name: 'Jan', value: 400000 },
        { name: 'Feb', value: 300000 },
        { name: 'Mar', value: 600000 },
        { name: 'Apr', value: 800000 },
        { name: 'May', value: 500000 },
        { name: 'Jun', value: 900000 },
      ]
    });
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
