# KLO Platform — Architecture & Roadmap

> **Read this first when starting any KLO work session.** This is the map.
> When you feel lost, come back here. When in doubt, follow the patterns below.

---

## 0. TL;DR — What KLO Is

KLO (Karibbean Luxury Operators) is an ultra-luxury Caribbean travel platform headquartered in Cartagena, Colombia. It connects UHNW travelers with vetted suppliers across five pillars:

- **AIR** — private jets, helicopters
- **SEA** — yachts, maritime charters
- **STAY** — private estates, residences
- **LAND** — luxury & armored ground transport
- **STAFF** — private chefs, security, concierge

KLO charges a 20% management fee. Suppliers keep 80%. Payouts within 48h of guest check-in via Stripe.

The platform is currently **3 portals + 1 public site**, all backed by the same Supabase + Firebase + Stripe + Telegram stack, and all served from the same Vercel deployment.

---

## 1. The Map

### 1.1 Portal Surfaces

| Surface | Path prefix | Auth | What lives here |
|---|---|---|---|
| **Public site** (investor pitch + client teaser) | `/` | None | Hero, Destinations, Investors, Forward-Looking Statement, AI Concierge (chat), LeadCaptureForm |
| **Client portal** | `/`, `/marketplace`, `/legal/*` | Firebase (Google sign-in) | Marketplace, my bookings, AI Concierge, legal pages, footer |
| **Supplier portal** | `/supplier/*` | Firebase (supplier token) | Sign up, log in, dashboard (assets, bookings, bundles, telegram, payouts) |
| **Admin portal** | `/admin/*` | Firebase + role=ADMIN | Approve suppliers, manage clients, asset review, bookings, communications, finance |
| **API** | `/api/*` | Per-route (some require Firebase, some use supplier token) | All backend logic — Express on Vercel serverless |

### 1.2 High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Vercel Deployment (karibbeanluxuryoperators.lat)           │
│  ┌──────────────────────────┐  ┌────────────────────────┐   │
│  │  React 19 + Vite SPA     │  │  Express serverless    │   │
│  │  (single bundle, 4 views │  │  via api/index.ts      │   │
│  │   gated by route + role) │  │  (wraps server.ts)     │   │
│  └──────────┬───────────────┘  └──────────┬─────────────┘   │
└─────────────┼─────────────────────────────┼─────────────────┘
              │                             │
              │ Firebase Auth               │ Direct HTTP
              │ (Google + email/password)   │
              ▼                             ▼
   ┌──────────────────┐         ┌─────────────────────┐
   │  Firebase        │         │  Supabase (Postgres)│
   │  - Auth          │         │  - suppliers        │
   │  - user.uid/role │         │  - assets           │
   └──────────────────┘         │  - bookings         │
                                │  - bundles          │
                                │  - leads            │
                                │  - approval_audit   │
                                └────────┬────────────┘
                                         │
              ┌──────────────────────────┼────────────────────┐
              │                          │                    │
              ▼                          ▼                    ▼
        ┌──────────┐              ┌──────────┐         ┌──────────┐
        │ Stripe   │              │ Telegram │         │ Google   │
        │ Connect  │              │ Bot API  │         │ Calendar │
        │ (payouts)│              │ (alerts) │         │ (avail.) │
        └──────────┘              └──────────┘         └──────────┘
              ▲
              │ used by client checkout
              │
        (no external dep here — Gemini / Claude / OpenRouter)
        ┌──────────────────────────┐
        │ AI Concierge (server.ts) │
        │  "Maria" — multimodal    │
        │  routes by AI_PROVIDER   │
        └──────────────────────────┘
```

### 1.3 Repo strategy (don't mix these up)

| Repo | URL | Role |
|---|---|---|
| `klo-antigravity-investor-portal-mvp-2026` (this one) | `karibbeanluxuryoperators.lat` | **The platform.** Public site + all 3 portals. **Vercel project: `klo-antigravity-investor-portal-mvp-2026`** under team `karibbeanluxuryoperators-8256`. |
| `KLO-FULLSTACK` | `klo-fullstack.vercel.app` | **The reference implementation.** Used to port supplier code into this repo. Stays as a working staging environment until v1 ships. |
| `KLO-Private-Charters` | separate | Unrelated commercial experiment. Ignore. |

**Vercel team:** `karibbeanluxuryoperators-8256`
**Vercel project ID:** `klo-antigravity-investor-portal-mvp-2026` (lowercase, with hyphens)

**Other projects in the same Vercel team (do NOT touch these):**
- `klo-bot` (paused)
- `klo-production` (paused, us-east-1)
- `KLO-Production` (active, ca-central-1, but NOT the canonical domain)
- `MVP-Flow` (paused, unrelated)
- `supabase-yellow-window` (paused)

When the user says "the site" or "deploy" or "production", they mean the `klo-antigravity-investor-portal-mvp-2026` Vercel project serving `karibbeanluxuryoperators.lat`.

**Rule:** do not copy code from `KLO-FULLSTACK` into this repo without committing the architectural intent to a feature branch in this repo first.

---

## 2. Roles & Access

KLO has **3 user roles**, stored on the Firebase user object as a custom claim, mirrored in the `suppliers` table when a supplier registers.

| Role | How they get it | What they see |
|---|---|---|
| `CLIENT` (default) | Google sign-in | Public site + Marketplace (post-login) + AI Concierge |
| `PARTNER` | Admin marks them as PARTNER after supplier approval | + Supplier dashboard at `/supplier` |
| `ADMIN` | Manually set in Firebase Auth | + Admin portal at `/admin` |

A user can be both `CLIENT` and `PARTNER` (e.g., an owner who also books their own villa). This is allowed; the role checks are non-exclusive.

---

## 3. Database (Supabase) — Single Source of Truth

> **The Supabase schema lives in `supabase_schema.sql` + `supabase_migration_partner_flow.sql`. Both must be applied to the project before the app works. Apply in order.**

### 3.1 Tables

```
auth (Firebase) ──┐
                  │  firebase_uid (FK by convention, not enforced)
                  ▼
            ┌──────────┐
            │ suppliers│  id, firebase_uid, business_name, contact_name,
            │          │  email, whatsapp, telegram_chat_id,
            │          │  google_calendar_id, status (PENDING|APPROVED|REJECTED),
            │          │  stripe_account_id, created_at, approved_at
            └────┬─────┘
                 │ 1:N
                 ▼
            ┌──────────┐
            │  assets  │  id, supplier_id, name, type (AIR|SEA|STAY|LAND|STAFF),
            │          │  location, description, price_per_unit, price_type,
            │          │  capacity, amenities[], images[], status,
            │          │  google_calendar_id, created_at
            └────┬─────┘
                 │
                 ├─► asset_availability (date, status BLOCKED|OPEN, source)
                 │
                 └─► bookings (id, asset_id, guest_*, dates, total_price, status, notes)

bundles ──► bundle_items (N:M between bundles and assets)
            - owner_supplier_id, name, status (PENDING|APPROVED|REJECTED)

leads         — captured from LeadCaptureForm, source=INVESTOR|CLIENT|MARKETPLACE
approval_audit — every admin action (supplier/bundle approve/reject) with timestamp
```

### 3.2 Status enums (always UPPERCASE strings)

- `suppliers.status`: `PENDING | APPROVED | REJECTED`
- `assets.status`: `DRAFT | ACTIVE | BLOCKED | REJECTED`
- `bookings.status`: `PENDING | CONFIRMED | EXECUTING | COMPLETED | CANCELLED`
- `bundles.status`: `PENDING | APPROVED | REJECTED`

Never store computed values (totals, durations) — derive them.

### 3.3 Row-level security (RLS)

**This is a known gap.** RLS is currently off (using service role key). Before opening to real users, RLS policies must be added so:
- A supplier can only read/write their own `assets` and `bookings`
- An admin can read/write everything
- A client can only read ACTIVE assets and APPROVED bundles
- `suppliers` row: only the owning user or admin can read

Tracking: this is a v1.1 item, not a v1 blocker (we have no real users yet).

---

## 4. API Surface (Express serverless via `api/index.ts`)

> **All routes are registered inside `startServer()` in `server.ts`. The `api/index.ts` wrapper just lazy-loads and forwards — it does NOT re-register routes.**

### 4.1 Public routes (no auth)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness + integration status (supabase, telegram, stripe, AI, google calendar) |
| POST | `/api/leads` | Lead capture from any form |
| GET | `/api/assets?status=ACTIVE` | Public marketplace |
| GET | `/api/assets/:id/availability` | Public availability for booking widget |
| GET | `/api/bundles/available-assets` | Public list of bookable assets from APPROVED suppliers |
| POST | `/api/ai/chat` | Maria AI concierge |
| GET | `/api/telegram/webhook` | Telegram bot inbound (registered automatically if TELEGRAM_BOT_TOKEN set) |

### 4.2 Supplier routes (require supplier token from SupplierLogin)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/supplier-auth/register` | New supplier signup |
| POST | `/api/supplier-auth/login` | Email + password (mock) |
| GET | `/api/supplier/dashboard` | Aggregated stats + recent items |
| GET | `/api/supplier/assets` | My assets |
| GET | `/api/supplier/bookings` | Bookings against my assets |
| GET | `/api/supplier/packages` | My bundles |
| POST | `/api/supplier/packages` | Create bundle |
| PATCH | `/api/supplier/link-firebase` | Link Firebase UID to supplier row |
| GET | `/api/supplier/notifications` | Telegram + email delivery log |
| GET | `/api/suppliers/lookup?uid=X&email=Y` | Used by PartnersPage to check existing supplier |

### 4.3 Admin routes (require Firebase ID token with role=ADMIN)

| Method | Path | Purpose |
|---|---|---|
| PATCH | `/api/suppliers/:id/status` | APPROVE/REJECT supplier (also activates their assets) |
| PATCH | `/api/bundles/:id/status` | APPROVE/REJECT bundle |
| GET | `/api/admin/stats` | Dashboard KPIs |
| GET | `/api/leads` | All leads |
| PATCH | `/api/leads/:id` | Update lead status |
| GET | `/api/suppliers` | All suppliers |
| GET | `/api/suppliers/:id/assets` | One supplier's assets |

> **Note:** The admin auth middleware is NOT YET IMPLEMENTED. The `getPortal()` check in `App.tsx` gates the UI on the client, but the API routes currently trust the caller. This is acceptable for v1 (no real users, we control who gets the admin email). It must be added before any external users.

### 4.4 Booking + payment routes

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/bookings` | Create booking + fire Telegram notification |
| PATCH | `/api/bookings/:id` | Update status |
| POST | `/api/stripe/create-checkout-session` | Client checkout (mock if no STRIPE_SECRET_KEY) |
| POST | `/api/payments/create-intent` | Direct payment intent (used by `Confirm & Pay` button) |
| POST | `/api/stripe/connect` | Onboard supplier Stripe account (Express) |

### 4.5 The `applyKLOMarkup` rule

**Only the client-facing marketplace applies the 20% markup.** Suppliers see raw prices. Implementation: `applyKLOMarkup()` in `App.tsx` runs over `assets[]` before passing to `<Marketplace>`. Never bake markup into the database.

---

## 5. Frontend Architecture

### 5.1 The single-bundle, multi-portal pattern

KLO ships **one React bundle** that contains all 4 views (public, client, supplier, admin). Route + role gates which one renders. This is intentional — it lets a single deployment serve everyone, with shared components (Navbar, AIAssistant, LeadCaptureForm).

```
App.tsx (the router)
├── Public site    (no user)        — Hero, Destinations, Investors, FLS, AIAssistant
├── Client portal  (user.role=CLIENT)  — Marketplace, my bookings, legal
├── Supplier portal (supplierToken || user.role=PARTNER) — Dashboard, AssetManager, Bundles
└── Admin portal   (user.role=ADMIN) — OperationalCommandCenter, SuppliersManagement, etc.
```

**Rule:** do NOT split into multiple bundles or multiple Vercel projects. The shared Maria AI concierge and the shared LeadCaptureForm make a single bundle a feature, not a cost.

### 5.2 Component inventory (target for v1)

| Component | Purpose | Lives in |
|---|---|---|
| `Navbar` | Public-site nav with lang switcher (EN/ES/PT) | `components/Navbar.tsx` (existing) |
| `Hero` | Public pitch hero | `components/Hero.tsx` (existing) |
| `Destinations` | Public destination cards | `components/Destinations.tsx` (existing) |
| `Investors` | Public investor info | `components/Investors.tsx` (existing) |
| `ForwardLookingStatement` | Compliance disclaimer | `components/ForwardLookingStatement.tsx` (existing) |
| `AIAssistant` | Maria chat widget (calls `/api/ai/chat`) | `components/AIAssistant.tsx` (existing) |
| `LeadCaptureForm` | Modal form on scroll/exit | `components/LeadCaptureForm.tsx` (NEW — port from KLO-FULLSTACK) |
| `SupplierRegister` | Public supplier sign-up form | `components/SupplierRegister.tsx` (port) |
| `SupplierLogin` | Email+password login | `components/SupplierLogin.tsx` (port) |
| `SupplierPortal` | Landing page for `/supplier` (decides login vs dashboard) | `components/SupplierPortal.tsx` (port) |
| `SupplierDashboard` | The main supplier view: stats, assets, bookings, bundles, telegram, payouts | `components/SupplierDashboard.tsx` (port — 48KB) |
| `SupplierAssetManager` | CRUD for an asset | `components/SupplierAssetManager.tsx` (port) |
| `PartnersPage` | "List with KLO" landing for clients | `components/PartnersPage.tsx` (port — 21KB) |
| `SuppliersManagement` | Admin view of all suppliers | `components/SuppliersManagement.tsx` (port) |

### 5.3 State management

**No Redux, no Zustand, no Jotai.** Just React `useState` + a few `useEffect` for data fetching. The app is small enough that lifting state to `App.tsx` and passing via props is fine. If state explosion becomes a problem, introduce Zustand in one place — not globally.

### 5.4 i18n

3 languages: EN / ES / PT. Pattern: every component has a local `t = { EN: {...}, ES: {...}, PT: {...} }[lang]` object. The lang state lives in `App.tsx`. **No i18n library** — the components are small enough that inline lookup is fine and avoids bundle weight.

---

## 6. Roadmap — Where We Are, Where We're Going

### v1.0 — Supplier portal on karibbeanluxuryoperators.lat (NOW)

**Goal:** A partner can sign up, log in, list an asset, get approved by an admin, and receive a Telegram notification when a booking comes in. Investor pitch site continues to work. AI concierge + Telegram bot work as before.

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | Architecture doc (this file) | ✅ Done | |
| 2 | Repo bootstrap (git init, baseline commit, branch) | ✅ Done | |
| 3 | Port supplier components from KLO-FULLSTACK | ⏳ Next | `SupplierRegister`, `SupplierLogin`, `SupplierPortal`, `SupplierDashboard`, `SupplierAssetManager` |
| 4 | Port server.ts (Express + Supabase + Firebase + Stripe + Telegram) | ⏳ Pending | Big file, port piece by piece — auth routes first |
| 5 | Port api/index.ts (serverless handler) | ⏳ Pending | Already battle-tested in KLO-FULLSTACK |
| 6 | Add `supabase_migration_partner_flow.sql` to this repo | ⏳ Pending | Make sure Supabase schema is applied |
| 7 | Add `LeadCaptureForm` (port from KLO-FULLSTACK) | ⏳ Pending | Replaces existing `experiencias.html` dead-end |
| 8 | Add smoke test (port from KLO-FULLSTACK) | ⏳ Pending | `npm run smoke` |
| 9 | Vercel domain: point karibbeanluxuryoperators.lat at this project | ⏳ Pending | One-time DNS change |
| 10 | Seed test data (1 admin, 2 suppliers, 3 assets) | ⏳ Pending | Manual via Supabase SQL editor |
| 11 | End-to-end browser test: sign up → list asset → admin approves → Telegram fires | ⏳ Pending | |

### v1.1 — Admin portal + RLS

- Dedicated `/admin` route with role check
- Approve suppliers / bundles / assets
- View all clients, all bookings
- **Add Supabase RLS policies** before opening to external users
- Telegram approval notifications (already partially there)

### v1.2 — Client portal completion

- `/marketplace` — already half-built in KLO-FULLSTACK
- Stripe checkout flow
- Bundle booking
- My bookings page
- Legal pages (Privacy, Terms, GDPR) — already exist in KLO-FULLSTACK, port them

### v1.3 — Operational polish

- Google Calendar sync UI for suppliers
- Email digests (SendGrid)
- Multi-image upload for assets
- Admin: financial reports, payout reconciliation
- Rate limiting on `/api/ai/chat` and `/api/leads`

### v2.0 — Out of scope for now

- Mobile app
- Multi-currency (currently USD only)
- Multi-region (currently Colombia + Caribbean)
- White-label / franchise mode

---

## 7. Vercel + Serverless Gotchas (READ THESE)

> **Every one of these has bitten us. If you write a new serverless file, run smoke after deploy — every time.**

1. **Vercel compiles TypeScript via `@vercel/node` to CJS.** `import.meta` is ESM-only and will crash at runtime (the build succeeds, deploy succeeds, request fails). Use `__dirname` with a `typeof __dirname !== 'undefined' ? __dirname : process.cwd()` guard for local tsx compatibility.

2. **Vite imported at the top of `server.ts`** runs dev-time module code in the serverless runtime. Vite is only useful for local HMR — Vercel serves `dist/` directly. Lazy-load it: `if (!process.env.VERCEL) { createViteServer = require("vite").createServer }`.

3. **`package.json` has `"type": "module"`.** That makes the runtime ESM. `require()` is undefined in `.ts` files compiled by Vercel. Use dynamic `import('../server.js')` and cache the promise.

4. **Wildcard routes in the api/index.ts wrapper strip the prefix.** `handler.all('/api/(.*)')` will rewrite `req.url` to `/assets` before passing to the inner app, breaking every route except health. Use a plain `(IncomingMessage, ServerResponse) => Promise<void>` that forwards the original `req.url` unchanged.

5. **"Green deploy" ≠ "working runtime."** Always run `npm run smoke` (or `curl` the API) after a serverless change. Build logs lie.

6. **The smoke test pattern.** Every Vercel project should have `scripts/smoke.{ps1,sh}` and an `npm run smoke` hook. Hit `/api/health`, `/api/assets`, `/api/assets?status=ACTIVE`, `/api/suppliers/lookup?uid=X`, and `/`. Exit non-zero on any unexpected status.

7. **Vercel cold-starts race the first request.** The api/index.ts pattern of `let loadingPromise; function loadServer() { return loadingPromise ??= import('../server.js')...; }` exists specifically to handle this. Don't simplify it back to a top-level `await import(...)` — that hangs on cold start.

---

## 8. File Layout (target)

```
klo-antigravity-investor-portal-mvp-2026/   ← this repo
├── AGENTS.md                  ← you are here
├── README.md
├── vercel.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .env.example
│
├── index.html                 ← Vite entry
├── App.tsx                    ← the router (4 portals in one)
├── index.tsx
├── index.css
├── types.ts
├── constants.ts               ← translations, pillar defs, premier services
│
├── components/
│   ├── Navbar.tsx             (existing)
│   ├── Hero.tsx               (existing)
│   ├── Destinations.tsx       (existing)
│   ├── Investors.tsx          (existing)
│   ├── ForwardLookingStatement.tsx (existing)
│   ├── AIAssistant.tsx        (existing — Maria chat widget)
│   ├── LeadCaptureForm.tsx    (port)
│   ├── SupplierRegister.tsx   (port)
│   ├── SupplierLogin.tsx      (port)
│   ├── SupplierPortal.tsx     (port)
│   ├── SupplierDashboard.tsx  (port — main supplier view)
│   ├── SupplierAssetManager.tsx (port)
│   ├── PartnersPage.tsx       (port — "List with KLO" landing)
│   └── SuppliersManagement.tsx (port — admin view)
│
├── services/                  ← (new dir) — non-React modules
│   ├── firebase.ts            (port — Firebase config + auth helpers)
│   ├── kloBrain.ts            (port — Maria AI client)
│   └── telegram.ts            (port — Telegram bot helpers if any)
│
├── lib/                       ← (new dir) — utility modules
│   └── qrUtils.ts             (port if needed)
│
├── api/                       ← serverless functions
│   ├── index.ts               (port — serverless wrapper)
│   ├── chat.ts                (existing — keep for AI assistant)
│   └── ... more ported routes as needed
│
├── server.ts                  (port — Express app, the actual backend)
├── supabase_schema.sql        (port — base schema)
├── supabase_migration_partner_flow.sql (port — adds firebase_uid, bundles, etc.)
│
├── public/
│   └── images/                ← existing + new supplier images
│
└── scripts/
    ├── seed_assets.ts         (existing)
    ├── smoke.ps1              (port)
    └── smoke.sh               (port)
```

---

## 9. Pre-commit / Pre-deploy Checklist

Run before every commit that touches `server.ts` or `api/**`:

- [ ] `npm run lint` passes (tsc --noEmit)
- [ ] `npm run smoke` against production passes 6/6 (or 5/6 if Supabase migration not yet applied)
- [ ] If you added a new component, it's in the inventory in section 5.2
- [ ] If you changed the database, there's a migration file in the repo
- [ ] The bundle still builds (`npm run build`)

---

## 10. Open Questions (TODO before v1 ships)

- [ ] Which Supabase project does v1 use? (Same as KLO-FULLSTACK staging, or new?)
- [ ] ~~Which Stripe account? Connect platform already set up?~~ → **Same accounts as KLO-FULLSTACK** ✅
- [ ] ~~Firebase project same as KLO-FULLSTACK?~~ → **klo-fullstack-66f70** ✅
- [ ] ~~Telegram bot token — same as KLO-FULLSTACK?~~ → **Same bot** ✅
- [ ] ~~Do we keep the Spanish-first investor copy in the public site, or switch to English-first with ES as fallback?~~ → **Trilingual EN/ES/PT everywhere, no "first" language** ✅
- [ ] Domain switch timing — DNS cutover vs gradual redirect? (My recommendation: preview at `*.vercel.app` for 1-2 days, then cut.)
- [ ] ~~Where does the admin email live? Who gets the approval notifications?~~ → **`hola@karibbeanluxuryoperators.lat`** ✅
- [ ] ~~Pricing — do suppliers see USD only, or COP too?~~ → **USD only for v1**, add COP/MXN in v1.3+ ✅

### Firebase project (locked in)

**Project ID:** `klo-fullstack-66f70`
**Project name:** KLO Fullstack
**Project number:** 97964985400
**Web app:** KLO Web (App ID `1:97964985400:web:e1326e408d2102d6462acd`)
**Support email:** `karibbeanluxuryoperators@gmail.com`
**Firebase Hosting site:** `klo-fullstack-66f70`

**Web SDK config** (used in `services/firebase.ts`):
```js
const firebaseConfig = {
  apiKey: "<from Vercel env: VITE_FIREBASE_API_KEY>",
  authDomain: "klo-fullstack-66f70.firebaseapp.com",
  projectId: "klo-fullstack-66f70",
  storageBucket: "klo-fullstack-66f70.firebasestorage.app",
  messagingSenderId: "97964985400",
  appId: "1:97964985400:web:e1326e408d2102d6462acd",
  measurementId: "G-N8BXY56CV2"
};
```

**Env vars to set in Vercel + local `.env.local`:**
```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=klo-fullstack-66f70.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=klo-fullstack-66f70
VITE_FIREBASE_STORAGE_BUCKET=klo-fullstack-66f70.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=97964985400
VITE_FIREBASE_APP_ID=1:97964985400:web:e1326e408d2102d6462acd
VITE_FIREBASE_MEASUREMENT_ID=G-N8BXY56CV2
```

**Security hardening TODO (do this before opening to external users):**
- [ ] Add HTTP referrer restrictions on the API key in Google Cloud Console — only `karibbeanluxuryoperators.lat`, `*.karibbeanluxuryoperators.lat`, `localhost:3000` for dev
- [ ] Enable Firebase App Check to block non-KLO clients from hitting your Firebase resources
- [ ] Add API key restrictions (only Firebase APIs)
- [ ] Enable Firebase Auth email enumeration protection (Authentication → Settings → User actions)

**Why only Firebase web config in the client?** Server-side uses a separate service-account credential. If you ever need server-side Firebase Admin SDK calls (for verifying ID tokens), it goes in `FIREBASE_SERVICE_ACCOUNT_JSON` as a single env var (the entire JSON blob) — never commit it.

### Admin email & notification routing (locked in)

**Sender / From address:** `hola@karibbeanluxuryoperators.lat`

Used for:
- `from` field on all SendGrid emails (approval notifications, booking confirmations, supplier onboarding emails)
- Display name: `KLO Operations` (or `KLO — Karibbean Luxury Operators` for formal emails)
- Reply-to: same address until we set up a dedicated `concierge@` later

**Default admin notification recipient:** `hola@karibbeanluxuryoperators.lat` (until you provision separate admin inboxes)

**Env var to add to Vercel:**
```
ADMIN_NOTIFICATION_EMAIL=hola@karibbeanluxuryoperators.lat
SENDGRID_FROM_EMAIL=hola@karibbeanluxuryoperators.lat
SENDGRID_FROM_NAME=KLO Operations
```

**Footer / public site contact:** the email appears in:
- Public site footer (translated: "Contact us" / "Contáctanos" / "Fale conosco")
- Legal pages contact section
- `mailto:` link on the AIAssistant widget for "Speak to a human"

**Trilingual copy for the contact line:**
```ts
{
  EN: { contactUs: 'Contact us', contactEmail: 'hola@karibbeanluxuryoperators.lat' },
  ES: { contactUs: 'Contáctanos', contactEmail: 'hola@karibbeanluxuryoperators.lat' },
  PT: { contactUs: 'Fale conosco', contactEmail: 'hola@karibbeanluxuryoperators.lat' },
}[lang]
```

### i18n rules (locked in)

- **Every user-visible string in every component is trilingual.** No exceptions. No English-only buttons, no Spanish-only error messages.
- Languages: `EN` (English), `ES` (Español — primary for Colombian market), `PT` (Português — for Brazilian/UHNW LATAM expansion).
- Pattern: each component declares a local `t = { EN: {...}, ES: {...}, PT: {...} }[lang]` and uses `t.someKey` everywhere. **No `i18next`, `react-intl`, or other library** — bundle weight and learning curve aren't worth it for 3 languages and ~50 components.
- Toggle pattern: `setLang(l => l === 'EN' ? 'ES' : l === 'ES' ? 'PT' : 'EN')` — the existing `Navbar` and `App.tsx` already do this.
- When porting a component from `KLO-FULLSTACK`, copy its `t` object **verbatim** — the translations are already done. Don't re-translate; don't add a new language key.
- AI concierge ("Maria") responds in whichever language the user is currently in. System prompt already handles this: `Always respond in ${lang} language.`
- Legal pages (Privacy, Terms, GDPR) get the same trilingual treatment. KLO-FULLSTACK has these — port them with the full `t` objects.
- **Default landing language for new visitors:** ES (Colombia is the primary market). The lang toggle still defaults to ES on first visit via `localStorage` or cookie.
- Date/currency formatting: use `Intl.DateTimeFormat` and `Intl.NumberFormat` with the appropriate locale, not hardcoded format strings.

### Pricing (locked in)

**v1: USD only.** All asset `price_per_unit` values stored as USD strings. All UI shows `$1,234.56` format.

**When to revisit (v1.3+):**
- Suppliers in Colombia start asking for COP settlement
- Suppliers in Mexico ask for MXN
- A LATAM expansion plan materializes
- Stripe Connect MXN/COP accounts are set up

**Why USD-only for v1:**
- Stripe Connect in non-USD countries is significantly more paperwork (local bank accounts, tax forms)
- KLO's first 5-10 suppliers will be USD-billing anyway (yachts, jets, US-card holders)
- Adding COP later is a presentation-layer change, not a schema change — `price_per_unit` is just a string

**Format rules (lock these in code review):**
- Always use `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` — never hardcode `$` or format manually
- Never store the currency code in the DB — it's USD by convention
- When we add COP later, we'll add a `currency` column and migrate gradually (no big-bang)

### Telegram bot (locked in)

**Same bot as KLO-FULLSTACK** (`TELEGRAM_BOT_TOKEN` env var, shared with klo-fullstack.vercel.app until domain cutover).

**Why one bot, not two:**
- The bot is stateless — we only use it for outbound notifications
- Supplier chat IDs live in the `suppliers` table, not in the bot
- Two bots = two support surfaces, two re-onboarding flows, two sets of group memberships (when we add supplier groups)
- Webhook URL is the only thing that changes; one bot handles it cleanly

**Webhook auto-registration:** `server.ts` calls `setWebhook` on startup with `APP_URL/api/telegram/webhook`. As long as `APP_URL` is set in Vercel (or `VERCEL_URL` is set automatically), the bot will receive updates at the right URL.

**Cutover checklist (when you point karibbeanluxuryoperators.lat at the new repo):**
1. Update `APP_URL` env var in the new Vercel project to `https://karibbeanluxuryoperators.lat`
2. Old project: server.ts will auto-call setWebhook on next deploy, redirecting telegram traffic to the new URL
3. Verify: send `/start` to the bot, check that `approval_notifications.sent_telegram` is true
4. If the old Vercel project is paused/deleted, the webhook is auto-cleaned by Telegram within 24h

**Supplier opt-in flow:** suppliers connect their personal Telegram chat by messaging the bot with `/start` → bot returns their chat ID → they paste it into Supplier Dashboard → Settings → Telegram Chat ID. Already implemented in `SupplierDashboard.tsx`.

---

## 11. If You Get Lost

1. Re-read the TL;DR (section 0).
2. Look at the map (section 1).
3. Find your portal in section 5.2 — that's where the component you need lives.
4. Find your data in section 3 — that's the table and the API route.
5. Hit the gotchas (section 7) — 9 times out of 10 the bug is one of those.
6. Run smoke (section 9). If it fails, that's your answer.
7. **Adding a string? It's trilingual. Always. (section 10 — i18n rules)**

If still lost: stop, don't add code. Write down what's confusing, what you expected to happen, what actually happened. That diagnosis is more valuable than a guess.
