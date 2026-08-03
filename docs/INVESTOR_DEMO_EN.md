# KLO Investor Demo — Run-of-Show (English)

**Live site:** https://www.karibbeanluxuryoperators.lat
**Date prepared:** 2026-08-03
**Language:** All URLs pre-set to `?lang=en` so the investor lands in English.

---

## Email template to send the investor (copy-paste ready)

**Subject line:** `KLO — live product walkthrough (5 min)`

> Hi [name],
>
> Thanks for the quick chat. KLO is live and I'd love to walk you through the working product on a Google Meet (or Zoom) screen share. Five minutes, no slides — just the platform.
>
> **What I'll show you, in order:**
>
> 1. The public site — landing, Maria concierge, the "plan a trip" flow
> 2. The partner portal — how a luxury villa owner in Cartagena would onboard and list inventory
> 3. The admin console — how our ops team reviews leads, approves partners, and assembles multi-partner packages
>
> The product is fully trilingual (EN/ES/PT) — I can demo it in any of those, but English is the default for our U.S. investor conversations.
>
> **Pre-read (2 min, optional):** https://www.karibbeanluxuryoperators.lat/?lang=en
>
> Available windows for a 15-min call: [insert 3 time slots in your timezone + theirs].
>
> Best,
> Juan

---

## Demo run-of-show (15 min total)

### Open with the public site (3 min)

**URL:** https://www.karibbeanluxuryoperators.lat/?lang=en

**Talking points while scrolling:**
- "Five pillars, one operator" — aviation, transport, yachts, lodging, staff
- Trilingual switcher top right (drop the menu open, click EN, click ES to show same)
- Hover over a destination card to show the smooth transitions
- Click the gold **"Start Planning"** button → opens Maria (the AI concierge) in the bottom right
  - **Type:** "Private island, 4 nights, Cartagena, two couples" → Maria extracts intent, offers dates/options, captures contact info
  - **This is the lead funnel.** Mention that the lead shows up in the admin Leads tab in real time.

**If the investor asks "does Maria speak Spanish/Portuguese too?":**
- Switch to ES, scroll, ask Maria something — replies in Spanish
- This is a real differentiator vs competitors that only do EN.

### Switch to partner portal (5 min)

**URL:** https://www.karibbeanluxuryoperators.lat/supplier/dashboard?lang=en

**If you have a magic link ready for `juanwriter2023@gmail.com`:**
- Use the "Sign in with magic link" button on the screen

**If you don't have a magic link (Supabase rate limit):**
- Use the dev role switcher: append `?dev_roles=1` to the URL → see the role dropdown
- Pick **Partner** → instantly land in the partner dashboard as if signed in

**Tour:**
- **Resumen (Overview):** KPIs, "Welcome back, Juan", hero with WhatsApp CTA
- **Activos (Assets):** Show the big cards (Gulfstream G650, Sunseeker 90, etc.) — these are bookable inventory the partner owns
- **Paquetes (Bundles):** Show the "Juan Chef" bundle (or a seeded demo bundle) — multi-partner package assembled by the partner
- **Settings:** Edit Account Name, Save / Cancel, "Changes saved" confirmation

**Talking points:**
- "Each partner has their own dashboard. They see only their own assets and bundles — no cross-tenant leakage."
- "Approval workflow: when a partner submits a bundle, it goes to the admin queue, gets reviewed, and either approved or sent back with notes."
- "Telegram bot integration (bottom of Settings) — they can opt-in for booking notifications."

### Switch to admin console (5 min)

**URL:** https://www.karibbeanluxuryoperators.lat/admin?lang=en&dev_roles=1

**Use the dev role switcher to pick "Admin".**

**Tour:**
- **Leads:** Show the kanban — leads in different stages (New / Contacted / Quoted / Won). Click a lead card → see full conversation history with Maria.
- **Partners:** List of all suppliers with status badges (PENDING / APPROVED / REJECTED). Click one → see the approval workflow, archived_at, business name, etc.
- **Bundles:** Three demo bundles visible — VIP Caribbean Weekend $12,380, Mediterranean Yacht Escape $19,200, Cartagena Aviator Getaway $14,100. Click one → see the commission breakdown (KLO commission, supplier payout, total to client).
- **Bookings:** If there's a booking, show the snapshot of payouts frozen at the time of booking.
- **Experiences:** The editorial content (curated trip packages) — admin can publish/draft/archive.

**Talking points:**
- "The admin console is what we use to curate the marketplace. We have role-based access (admin / ops / sales / partner / viewer) so a junior sales hire can't accidentally archive a partner."
- "Bundle commission logic: 10% KLO commission on partner-sourced lines, 5% cross-sell commission on lines that aren't from the assembler partner. Total to client = sum of all line items."
- "Everything is backed by Supabase Postgres with row-level security — partner A literally cannot see partner B's data even if they hack the frontend."

### Close (2 min)

**Talking points:**
- "Three committed partners in flight — two luxury aviation operators and one transport network covering 6 cities"
- "Pre-seed raise covers the next 12 months. Series A target is $2.5M for Caribbean expansion (St. Barts, Turks & Caicos)"
- "What questions do you have? I can dive into any specific area."

---

## Tech notes (only if the investor asks "what's under the hood?")

- **Frontend:** React 19 + Vite + TypeScript, Tailwind, Motion, Lucide icons
- **Backend:** Node.js (Express on Vercel serverless), single `server.ts` file
- **Database:** Supabase (Postgres + Auth + Storage + RLS)
- **AI:** Maria = Groq Llama for fast intent extraction, with Gemini Pro for richer responses
- **Hosting:** Vercel (auto-deploy on git push), domain `karibbeanluxuryoperators.lat`
- **i18n:** `?lang=en|pt|es` URL param, persisted in localStorage, full trilingual coverage in UI
- **Payments:** Not yet integrated (post-seed)
- **Mobile:** Responsive but not a native app — web-first is the right shape for UHNWI travelers who book on desktop + WhatsApp

---

## What NOT to promise

- Don't say "we have $X in committed revenue" — we don't
- Don't say "Maria never hallucinates" — she's an LLM, she does occasionally
- Don't say "the platform handles payments" — it doesn't yet
- Don't say "we have a mobile app" — we don't, and the responsive web is good enough for now
- DO say "we have 9 partners in the approval pipeline" — true and impressive
- DO say "the lead-to-quote funnel is end-to-end" — true, Maria → lead → admin → quote
- DO say "we are actively onboarding in Colombia" — true

---

## What to do if something breaks during the demo

1. **Maria is slow or errors out:** Say "let me show you a past conversation" and switch to the admin Leads tab, open any lead — full thread is visible.
2. **A page is in Spanish when it should be English:** Open the language dropdown top right, click EN. If that doesn't work, hard refresh (Ctrl+Shift+R).
3. **The 3 demo bundles aren't showing in `/admin/bundles`:** They're seeded as drafts. Open the bundles page, click the "Status" filter dropdown, change to "DRAFT" — they show.
4. **Login screen says "Sign in required" and you don't have a magic link:** Open `?dev_roles=1` on the URL, pick Admin from the dropdown.
5. **Investor asks a question you don't know the answer to:** Say "great question, I'll get you a precise answer by end of day" — never bullshit. Then come back to me and I'll find the answer.
