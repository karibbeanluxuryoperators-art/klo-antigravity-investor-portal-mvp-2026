# KLO Platform

> **Karibbean Luxury Operators** — ultra-luxury Caribbean travel platform.
> Public site + client portal + supplier portal + admin portal, all served
> from a single Vercel deployment at `karibbeanluxuryoperators.lat`.

## Status

**v1 in progress.** Public site (the original investor pitch) is live. The
supplier portal flow is being added on top — see [AGENTS.md](./AGENTS.md)
for the architecture map and roadmap.

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

# Production smoke test (defaults to klo-fullstack.vercel.app — set BASE_URL
# to test against a different deployment)
$env:BASE_URL = "https://karibbeanluxuryoperators.lat"; npm run smoke
```

## Project structure

```
├── App.tsx                  The router (public site + /supplier route)
├── index.tsx                React entry
├── types.ts                 Shared types (public + portal)
├── constants.ts             i18n strings, premier services
├── components/              All React components
│   ├── Navbar, Hero, Destinations, Investors, ForwardLookingStatement  (public)
│   ├── AIAssistant          Maria concierge
│   ├── SupplierPortal       Multi-step onboarding wizard
│   ├── SupplierDashboard    Main supplier view
│   ├── SuppliersManagement  Admin view
│   ├── MiniCalendar         Availability picker
│   └── PartnerBundles       Bundle builder
├── services/
│   └── firebase.ts          Firebase web SDK + auth helpers
├── api/
│   └── index.ts             Vercel serverless entry (wraps server.ts)
├── server.ts                Express app — all backend routes
├── supabase_schema.sql             Base tables
├── supabase_migration_partner_flow.sql  Partner flow tables + columns
├── vercel.json              Vercel build + routes config
├── vite.config.ts           Vite SPA config
├── tailwind.config.js       KLO tokens (luxury-black, gold, etc.)
└── scripts/
    ├── smoke.ps1            Production smoke test (Windows)
    └── smoke.sh             Production smoke test (Bash)
```

## When you start a new session

1. **Read [AGENTS.md](./AGENTS.md)** — the map.
2. **Check `git log --oneline -10`** to see what's been done.
3. **Run `npm run smoke`** against the live site — verify nothing's regressed.

## Deploy

Push to `main` → Vercel auto-deploys. The first deploy will fail unless
all the env vars from `.env.example` are set in Vercel project settings.

For the first deploy, the operator needs to:
- Set the Supabase URL and service key
- Set the 6 Firebase web SDK values
- Set the Stripe keys (test mode for now)
- Set the Telegram bot token
- Apply the two SQL files in the Supabase SQL editor
