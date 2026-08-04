# KLO Handoff — Investor Demo Prep

**Last updated:** 2026-08-04 (Juan + Mavis session)
**For:** Anyone picking this up in a future session, including Mavis in a fresh context
**Mission:** Ship the KLO investor demo to **Scott** on **Monday Aug 17 2026 at 10:30am Colombia time** (COT, UTC-5; add 1h for ET).

---

## 0. TL;DR — what you need to know in 60 seconds

- **Product:** KLO = Karibbean Luxury Operators. Ultra-luxury concierge platform for the Colombian Caribbean (jets, transport, yachts, lodging, staff). Currently pre-seed, pre-revenue, raising capital.
- **Stack:** React 19 + Vite + TS, Tailwind, Motion, Supabase (Postgres+Auth+Storage), Vercel, Groq/Gemini for Maria AI concierge.
- **What's working:** Public site, Maria concierge, partner dashboard, admin console, multi-partner bundles, lead-to-quote funnel, trilingual EN/ES/PT.
- **What's not working:** Email rate-limited on Supabase free tier (~3/hour) — workaround for demo is `?dev_roles=1` switcher.
- **Currency:** All USD, no other currency. Don't change this.
- **Repo:** `C:\Users\juanc\Documents\KLO\klo-antigravity-investor-portal-mvp-2026-main` on GitHub `karibbeanluxuryoperators-art/klo-antigravity-investor-portal-mvp-2026`. Push uses PAT in `C:\Users\juanc\.netrc`.
- **Memory:** `C:\Users\juanc\.minimax\agents\mavis\memory\MEMORY.md` (read this on session start — has every pattern, every gotcha, every decision).
- **Demo live URL:** `https://www.karibbeanluxuryoperators.lat/?lang=en` (and the admin/partner variants with `?dev_roles=1`).

---

## 1. The investor (Scott)

- **Name:** Scott
- **Meet:** Monday Aug 17 2026, 10:30am Colombia time (COT = UTC-5)
- **Timezone:** American (presumed ET = UTC-4 in August, or PDT/EDT — confirm before scheduling; 10:30am COT is 11:30am ET or 8:30am PT)
- **Language:** English only (doesn't speak Spanish)
- **Source:** Direct outreach by Juan. Pre-seed round. American, expects professional pitch.
- **What he'll see:** Screen share of the live product. 15 min total.
- **What NOT to promise:** No committed revenue figures, "Maria never hallucinates", payments, mobile app. See section 5 below for the full "what NOT to promise" list.

**Send him this email 24-48h before the meet** (template in `docs/INVESTOR_DEMO_EN.md`):
> Subject: KLO — live product walkthrough (5 min)
> Body: thanks for the quick chat, here's the working product, 5 min Google Meet, all in English, link: https://www.karibbeanluxuryoperators.lat/?lang=en

---

## 2. The 5-minute demo flow

(Adapted from `docs/INVESTOR_DEMO_EN.md` section "Demo run-of-show". Re-read that doc for the full talking points.)

### Step 1: Public site (3 min)
- Open `https://www.karibbeanluxuryoperators.lat/?lang=en`
- Show: hero, language switcher, 6 destination cards, Maria concierge (click gold "Start Planning")
- Type in Maria: "private island, 4 nights, Cartagena" → she extracts intent and offers options
- **Talking point:** "This is the lead funnel. The lead shows up in admin in real time."

### Step 2: Partner portal (5 min)
- Open `https://www.karibbeanluxuryoperators.lat/supplier/dashboard?lang=en&dev_roles=1`
- Use the dev role switcher (top right dropdown) to pick **Partner** → instant login as Juan Chef
- Show: Resumen (KPIs, "Welcome back, Juan"), Activos (Gulfstream G650, Sunseeker 90), Paquetes (the "Juan Chef" bundle), Settings (edit toggle)
- **Talking points:** "Each partner has their own dashboard. They see only their own data. Approval workflow goes from partner → admin queue."

### Step 3: Admin console (5 min)
- Open `https://www.karibbeanluxuryoperators.lat/admin?lang=en&dev_roles=1`
- Use the dev role switcher to pick **Admin**
- Show: Leads (kanban), Partners (list with status badges), Bundles (3 demo bundles: VIP Caribbean Weekend $12,380, Mediterranean Yacht Escape $19,200, Cartagena Aviator Getaway $14,100 — click one to see commission breakdown)
- **Talking points:** "Role-based access. Junior sales can't accidentally archive a partner. Bundle commission logic: 10% KLO on partner-sourced lines, 5% cross-sell on lines from other partners."

### Step 4: Close (2 min)
- 9 partners in approval pipeline
- Pre-seed covers 12 months. Series A target $2.5M for Caribbean expansion
- **"What questions do you have?"**

---

## 3. Pre-demo checklist (Juan does this 10 min before the meet)

Open **3 incognito tabs** in Chrome/Edge:

1. **Landing:** `https://www.karibbeanluxuryoperators.lat/?lang=en`
2. **Admin:** `https://www.karibbeanluxuryoperators.lat/admin?lang=en&dev_roles=1`
3. **Partner dashboard:** `https://www.karibbeanluxuryoperators.lat/supplier/dashboard?lang=en&dev_roles=1`

If all 3 load in English without any obvious breakage, **you're ready**.

**Don't open DevTools during the meet.** If something looks off, say "let me show you on the admin side" and switch tabs.

---

## 4. Recovery playbook (if something breaks mid-demo)

| Symptom | Fix |
|---|---|
| Maria is slow or errors | Switch to admin Leads tab, click any lead, show past conversation thread |
| Page in Spanish when should be EN | Open language dropdown top right, click EN. If broken, hard refresh (Ctrl+Shift+R) |
| Demo bundles not showing in /admin/bundles | Open Status filter, change to "DRAFT" — they show |
| "Sign in required" + no magic link ready | Use `?dev_roles=1` on URL, pick Admin from dropdown |
| Investor asks a question you don't know | "Great question, I'll get you a precise answer by end of day" — never bullshit, then ask Mavis |

---

## 5. What NOT to promise to Scott

- ❌ Committed revenue / ARR figures (we have none)
- ❌ "Maria never hallucinates" (she's an LLM, she does occasionally)
- ❌ "The platform handles payments" (it doesn't yet — post-seed)
- ❌ "We have a mobile app" (we have responsive web only)
- ❌ "We have X users signed up" (we don't track this number)

- ✅ "9 partners in the approval pipeline" (true and impressive)
- ✅ "The lead-to-quote funnel is end-to-end" (true: Maria → lead → admin → quote)
- ✅ "We are actively onboarding in Colombia" (true)
- ✅ "Pre-seed raise covers 12 months" (true)
- ✅ "Series A target is $2.5M for Caribbean expansion" (true, in roadmap)

---

## 6. Tech talking points (only if Scott asks "what's under the hood?")

- **Frontend:** React 19 + Vite + TypeScript, Tailwind, Motion, Lucide icons
- **Backend:** Node.js (Express on Vercel serverless), single `server.ts` file
- **Database:** Supabase (Postgres + Auth + Storage + Row-Level Security)
- **AI:** Maria = Groq Llama for fast intent extraction, Gemini Pro for richer responses
- **Hosting:** Vercel (auto-deploy on git push)
- **i18n:** `?lang=en|pt|es` URL param, persisted in localStorage, full trilingual coverage
- **Payments:** Not yet integrated (post-seed)
- **Mobile:** Responsive web, no native app

**If Scott asks "what's the tech risk?":**
> "Two things. One: the email rate limit on Supabase free tier — we're going to Pro or to custom SMTP via Resend. Two: the LLM latency for Maria — we mitigate with Groq for fast intent extraction and a 12s timeout for Gemini, with graceful fallback to rule-based responses."

---

## 7. Pending tasks (low priority, post-meet)

These are nice-to-haves, not blockers. Do them after Aug 17.

1. **Delete empty "Juan Chef" bundle from DB** (SQL direct, 30s). User `juanwriter2023@gmail.com` created it as a test. It's visible to Scott in /supplier/dashboard/paquetes.

2. **Fix "Your Bundles" title contrast in Paquetes tab** (1-line CSS). Currently too low-contrast white-on-dark for the main "Your Bundles" heading. Looks like `text-text-main/40` — bump to `text-text-main/90`.

3. **PartnerBundles.tsx V1+V2 type cleanup.** Cosmetic. Functionally fine with `as any` casts. Don't touch before Aug 17.

4. **Decide Supabase Pro vs Resend for email rate limit.** Only blocks partner testing, not the Scott demo (use `?dev_roles=1`). Two options:
   - **Supabase Pro $25/mo** → up to ~30 emails/hour
   - **Custom SMTP via Resend (free tier 100/day)** → ~30 min code work
   - **Recommendation:** Resend, $0 vs $25/mo.

5. **Font/contrast audit.** 55% of text is 10-12px. Deferred to post-funding.

6. **Translate MOU and Financials to English.** ~5 pages, ~1 hour. Only if Scott asks for them in writing. Don't translate preemptively.

---

## 8. Known tech debt (in priority order)

1. **19 pre-existing tsc errors** in EntityEditor, ExperienceWizard, ImageField, TrilingualField, AdminDetails, ClientManagement, KLOStats, vitest.config. **All unrelated to the demo path. Ignore.**

2. **2 dead `app.post/get("/api/bundles")` v1 routes** in `server.ts` around line 2164. Dead code (Express uses the first match). Don't delete before Aug 17 — separate cleanup commit.

3. **PartnerBundles.tsx types.ts** has V1 + V2 interfaces mixed with `as any` casts. Cosmetic, works fine.

---

## 9. Patterns to follow (from memory)

These are the lessons that took real debugging time. Don't break them.

1. **tMap multi-lang keys must have ALL 3 langs with same shape.** `t[lang].key` double-bracket is a silent crash. Use `const t = tMap[lang] || tMap.EN` then `t.key`. See commits `8186847` and `fee93d4`.

2. **Raw `fetch('/api/...')` in partner context MUST use `authedFetchJSON` helper** that reads `getSupplierSession()` and injects `Authorization: Bearer <token>`. AdminBundlesView already had this. PartnerBundles missed it during v2 migration; fixed in `2674c59`. The same bug bit again — see `77c9e6d` for the route-order followup.

3. **Express routes with static segment MUST be registered BEFORE dynamic `/:id` route** or the `:id` handler catches the request. See `77c9e6d` — `/api/bundles/available-assets` was matching `/api/bundles/:id` with `id="available-assets"`, returning 401 to all partner calls. For any new static path under a parent with `:id`, register it first.

4. **End-to-end test with curl before declaring done.** Ship a frontend that calls PATCH `/api/suppliers/:id`? curl the endpoint with a partner JWT first. Shipped a27c623 without checking the server still rejected partners with 403. Caught only because Juan asked "what should I check for?" followup. Always curl the server.

5. **Distinguish "no data" from "failed to load" in fetch error handling.** Don't set the list to `[]` in catch — that shows the misleading "no assets" empty state. Use a separate `*Error` state and render a red banner with the actual error message. See `77c9e6d` for the `availableAssetsError` pattern.

6. **`.netrc` "deny Everyone" blocks YOU too.** NTFS explicit deny overrides allow, even for the file owner. Fix: `icacls C:\Users\juanc\.netrc /remove Everyone`. The previous note that this was "safe" was wrong — it breaks `git push` silently.

7. **Hard refresh required for any UI change** in dev (Ctrl+Shift+R). Vite bundle name is stable per deploy.

---

## 10. Step-by-step recovery: how to resume this work in a future session

1. **Read** `C:\Users\juanc\.minimax\agents\mavis\memory\MEMORY.md` (180KB, 1724 lines). It has every pattern, every commit, every decision. Use the section "KLO end of day — 2026-08-04" as your state-of-truth.

2. **Skim** `docs/INVESTOR_DEMO_EN.md` for the demo run-of-show and email template.

3. **Check** that the live site at `https://www.karibbeanluxuryoperators.lat/?lang=en` still loads correctly. If Vercel had an outage, the dev_role switcher still works locally.

4. **Verify** bundle hash hasn't changed since `Dqh3zLi9` (Aug 4). If it has, re-test the 18 critical EN strings against the new bundle.

5. **Don't push** any code without running `& '.\node_modules\.bin\tsc.cmd' --noEmit` first. Expected: 19 pre-existing errors, 0 new from your changes.

6. **Push** with the inline-token pattern (see memory "KLO .netrc gotcha"):
   ```powershell
   $token = (Get-Content C:\Users\juanc\.netrc -Raw) -split "`n" |
     Where-Object { $_ -like "password *" } |
     ForEach-Object { $_.Substring(9).Trim() }
   git -c credential.helper= -c credential.useHttpPath=true `
     -c "credential.username=x-access-token" -c "credential.password=$token" `
     push origin main
   ```

---

## 11. Contact / accountability

- **Juan Carlos Molina Dussan** — CEO/Co-founder, Operations Director
- **Mavis** (this assistant) — CTO Co-founder (per Juan's request 2026-08-04)
- **Jose Fernando Angel Trucco** — Sales & Marketing Director
- **Deiby Villalobos** — CTO & Administrative Director
- **WhatsApp:** +57 324 313 2500
- **Email:** hola@karibbeanluxuryoperators.lat
- **GitHub:** karibbeanluxuryoperators-art (personal: wprotalents-ctrl)

---

## 12. The CTO co-founder contract (as of 2026-08-04)

Juan explicitly asked me to act as his CTO co-founder. Implications:
- Make technical decisions. Don't ask permission for routine work.
- Prioritize product over perfect-code. Working > pretty.
- Push back when direction is wrong — once, directly, respectfully. Then do what Juan says unless it violates safety/permissions.
- Direct, terse, professional voice. No fluff, no "great question!", no customer-service tone.
- Default to shipping. Every commit is a finished product feature or a fix, not a TODO.
- When something's broken, fix it. When something's polish-able, ask before polishing.
- Memory writes are not optional. The handoff doc is not optional. The investor demo prep is not optional.

---

**Last commit on main before this handoff:** `37238d5 docs: investor demo run-of-show + email template (EN)`
**Live site status:** Operational
**Next action:** Juan sends the email to Scott, smoke-tests 3 URLs 10 min before the meet, runs the 5-min walkthrough.

Good luck. 🤝
