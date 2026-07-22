# KLO Platform

> **Karibbean Luxury Operators** — ultra-luxury Caribbean travel platform.
> Public site + client portal + supplier portal + admin portal, all served
> from a single Vercel deployment at `karibbeanluxuryoperators.lat`.

## Status

**v1.8.0 — Concierge OS phase 1 shipped.** Public site is live with the full
5-pillar pitch, the "How KLO Works" 4-step flow, stats, testimonials, and FAQ.
Supplier portal is operational. Admin gate (Concierge OS) is operational with
the Clients tab, magic-link auth, and role-based access via `user_roles`.

> **Note**: Vercel auto-promote requires the operator to set the
> Production Branch to `v1/supplier-portal` in Vercel → Settings → Git.
> Without this, every push shows up as a Preview deployment and the operator
> has to manually click "Promote to Production" in the dashboard.

## Quick start

```bash
# Install deps
npm install

# Copy env template and fill in your secrets
cp .env.example .env.local
# Edit .env.local with your Supabase, Firebase, Stripe, Telegram, etc.

# Local dev (Express on :3000, Vite HMR for the SPA)
npm run dev

# Production build (Vite SPA → dist/)
npm run build

# TypeScript check
npm run lint

# Unit + integration tests (Vitest, 15+ tests)
npm test
npm run test:watch     # dev mode
npm run test:ui       # browser UI

# Production smoke test (defaults to klo-fullstack.vercel.app)
$env:BASE_URL = "https://karibbeanluxuryoperators.lat"; npm run smoke
# Or in bash:
bash scripts/smoke.sh "https://karibbeanluxuryoperators.lat"
```

## Project structure

```
├── App.tsx                     The router (public site + /supplier + /admin)
├── index.html                  SEO meta + OG + JSON-LD structured data
├── index.tsx                   React entry
├── types.ts                    Shared types (public + portal)
├── constants.ts                i18n strings, premier services
├── components/                 All React components
│   ├── Navbar                  Public site top nav (lang switcher, Contact)
│   ├── Hero                    Landing hero with brand video/image
│   ├── Destinations            Curated destination cards
│   ├── HowKLOWorks             4-step concierge flow (trilingual)
│   ├── KLOStats                Stats with count-up animation
│   ├── KLOTestimonials         Testimonials + FAQ (animated accordion)
│   ├── Investors                Pitch deck section
│   ├── PartnerBundles          Bundle builder UI
│   ├── AIAssistant              María concierge (HTTP chat)
│   ├── PlanTripModal           Trilingual "Plan Your Trip" form → /api/leads
│   ├── SupplierPortal          Multi-step supplier onboarding
│   ├── SupplierDashboard       Main supplier view
│   ├── SuppliersManagement     Admin Concierge OS — Suppliers/Bookings/Clients tabs
│   ├── ClientManagement        Admin — UHNWI guest profiles
│   ├── AdminGate               Admin sign-in + role gating
│   ├── MiniCalendar            Availability picker
│   └── ui/                     Primitives (Card, Section, ErrorBoundary, etc.)
├── services/
│   ├── supabase.ts             Supabase web SDK + auth helpers
│   └── firebase.ts             Legacy Firebase helpers (deprecated, kept for ref)
├── api/
│   ├── index.ts                Vercel serverless entry (wraps server.ts, inlines /api/config + /api/og-image)
│   └── _configHandler.ts       (legacy)
├── server.ts                   Express app — all 40+ backend routes
├── db/
│   └── migrations/             SQL migrations (run in order in Supabase Studio)
│       ├── 2026-07-20_user_roles.sql
│       └── 2026-07-20_clients.sql
├── public/
│   ├── manifest.json           PWA manifest
│   ├── robots.txt              SEO crawler directives
│   └── sitemap.xml             SEO sitemap
├── tests/                       Vitest unit + integration tests
│   ├── setup.ts
│   ├── api/admin-endpoints.test.ts
│   └── unit/schema-validators.test.ts
├── .github/
│   ├── workflows/ci.yml        Lint + build + smoke on every push/PR
│   ├── workflows/deploy.yml    Post-deploy smoke on production deploys
│   └── labeler.yml             Auto-label PRs by touched paths
├── vitest.config.ts
├── vercel.json                 Vercel build + routes config
├── vite.config.ts              Vite SPA config
├── tailwind.config.js          KLO tokens (luxury-black, gold, etc.)
└── scripts/
    ├── smoke.ps1               Production smoke test (Windows)
    └── smoke.sh                Production smoke test (Bash / CI)
```

## Routes

| Path                            | Description                                  | Auth   |
| ------------------------------- | -------------------------------------------- | ------ |
| `/`                             | Public site (Hero, How KLO Works, Stats…)    | public |
| `/supplier`                     | Partner onboarding (multi-step)              | public |
| `/supplier/login`               | Magic-link sign-in for partners              | public |
| `/supplier/dashboard`           | Partner portal: profile / assets / bookings  | partner |
| `/admin`                        | Concierge OS: Suppliers / Bookings / Clients  | admin  |
| `/api/health`                   | Liveness check                               | public |
| `/api/config`                   | Public Supabase URL + anon key               | public |
| `/api/og-image`                 | Server-rendered SVG social card              | public |
| `/api/leads`                    | POST — Plan Your Trip form                   | public |
| `/api/admin/check`              | GET — current user's role                    | public* |
| `/api/admin/users`              | List / grant / revoke user_roles             | admin  |
| `/api/clients`                  | CRUD UHNWI guest profiles                    | admin  |
| (40+ more — see server.ts)       |                                              |        |

## When you start a new session

1. **Read [AGENTS.md](./AGENTS.md)** if it exists — the map.
2. **Check `git log --oneline -10`** to see what's been done.
3. **Run `npm test`** to verify the API endpoints still work.
4. **Run `npm run smoke`** against the live site — verify nothing's regressed.

## Deploy

Push to `v1/supplier-portal` (the active dev branch). Vercel will build
automatically. **If you set the Production Branch to `v1/supplier-portal`
in Vercel settings, the deploy auto-promotes to production.** Otherwise
you'll need to click "Promote to Production" in the Vercel dashboard.

Required env vars (Vercel project settings):
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (for the SPA)
- `STRIPE_SECRET_KEY` (for payments)
- `VITE_APP_URL` (for magic-link redirects — must be the custom domain)

Migrations to run in Supabase Studio (SQL Editor):
- `db/migrations/2026-07-20_user_roles.sql` — admin role table (run first)
- `db/migrations/2026-07-20_clients.sql` — UHNWI client profiles (run second)
