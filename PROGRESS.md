# PROGRESS

Phase-by-phase history for the Ultimate Life Planner rebuild. Appended by the
architect at the end of every phase (see ROADMAP.md → END OF PHASE PROTOCOL).

---

## 2026-07-18 — Phase 0: Codebase audit & reconcile

### 1. Built
- `ROADMAP.md` — the master roadmap now lives in the repo (the architect's canonical checklist).
- `src/utils/timePolicy.ts` + `timePolicy.test.ts` — the app-wide local-timezone day policy (day/week/month keys, DST-safe day math, anniversary math for the newlywed-year rule). Written; tsc/test run pending a transient tool outage.
- This file (`PROGRESS.md`).
- Full audit + reconciled-state report (below).

### 2. Reconciled state — what the app actually is today
- **Framework:** Vite + React 19 + TypeScript **web app / PWA** (react-dom). NOT Expo/React Native. The "iOS app" is a WebView wrapper (the wrapper project is not in this repo; `main.jsx` special-cases `window.ReactNativeWebView`). Deployed at ultimate-planner-alpha.vercel.app with Vercel serverless `/api`.
- **Two frontends ship together:** a 16.7k-line compiled legacy monolith (`src/App.jsx`) + the typed shell (`src/App.tsx`, the default) with ~24 typed views; some tabs still route through legacy adapter hosts.
- **Data layer:** Supabase (project `xvjzouuqcgcfepayauny`) — auth + `profiles`/`user_profile`/`learning_events` with owner-only RLS. BUT core user data (tasks, goals, habits, everything else) is **localStorage-per-device**; only the learning profile syncs across devices.
- **Auth vs target (Google + Apple + email/password):** email/password LIVE (PKCE, confirmations on, built-in sender). Google/Apple **code fully wired but providers not enabled** — needs Weston's Google Cloud + Apple Developer credentials in the Supabase dashboard (`docs/SUPABASE_SETUP.md` §5–6). → **Phase 0.5 required.**
- **Live data exists** (prod deployed; Weston's own use; RLS rows) → additive migrations only, per guardrail. `.gitignore` covers env files (only `.env.example` is tracked). Standing security item: the git remote URL embeds a PAT — rotation still pending.

### Roadmap feature matrix (exists / partial / absent)
| Roadmap phase | State today |
|---|---|
| P1 Goals engine | **Partial** — typed Goal union (outcome/numeric/habit) + milestones + timestamped numeric entries + weekly focus (`useGoalStore`, tested `goalEngine`). Categories are intellectual/financial/physical/spiritual/social (≈ the Five Life Areas; intellectual→mental rename needed). Missing: metricType currency/streak, cadence, progress-events everywhere, derived status (paceFor is a start). Bonus not in roadmap: recursive learning subsystem (profileEngine/planSuggest) can pre-personalize plans |
| P2 Home dashboard | **Partial** — a dashboard exists but not the PMG layout; rebuild to reference needed (reference screenshots missing from repo) |
| P3 People/dating/map/contacts | **Absent** — no People model at all ("Share" = stat-card image generator; "Community" = local achievements/leaderboard; Explore maps = travel tools) |
| P4 Planning rituals | **Partial** — guided Week/Month wizards, one-tap accept, reflection, forgiving streaks (built July 2026). Missing: block linkage, nightly ritual + local notifications |
| P5 GCal sync | **Partial/legacy** — old `googleCalendar.js` one-way helper; no two-way block sync |
| P6 People depth/journal/seasons | Journal **exists** (typed store); people + seasons absent |
| P7 Review & analytics | **Partial** — weekly review + monthly review modal (legacy), Insights tab (legacy), recharts available |
| P8 On-device AI | **Absent + platform-blocked** — Apple Foundation Models require a real RN app; impossible from a WebView. Current AI is a server-side Anthropic proxy (conflicts with the "on-device only" privacy line — must be resolved with the platform decision) |
| P9 Comps | **Absent** (community tab is simulated-local, no real pairing/backend) |
| P10/11 Polish/Ship | PWA + RevenueCat/paywall code + Sentry SDK (DSN unset) exist; widget/contacts-import/light-theme absent (light design preserved on `wip/light-working-tree`) |

### 3. Decisions I made
- Stored the pasted roadmap as `ROADMAP.md` (the old `Roadmap.md` was a different doc; it lives on the preserved `wip/light-working-tree` branch).
- Wrote `timePolicy.ts` myself rather than delegating: housekeeping-scale, and the implementer agent can't be created mid-session (agent files load at session start).
- Week starts Monday in `timePolicy` (matches every existing wizard/store in the app).
- Did NOT mass-migrate existing UTC date-key offenders (planner store, WeekWizard) — out of Phase 0 scope; flagged in ROADMAP.md for the phase that touches them.

### 4. Needs Weston
1. **THE PLATFORM FORK (blocks Phase 1):** the roadmap assumes an Expo/React Native app (iOS simulator DoD, react-native-svg, expo-contacts, on-device Apple AI, home widget). The codebase is a mature web app in a WebView wrapper. Options: **(A)** full Expo RN rebuild (what the roadmap + the Phase 11 "rebuild fully replaces the old HTML app" decision imply — Supabase schema + the pure TS engines/utils carry over; UI rebuilt) or **(B)** stay web-in-wrapper and adapt (P8 on-device AI, contacts import, and the widget become impossible). Recommend A per the roadmap's own Phase 11 decision — confirm and I'll set up the Expo workspace as Phase 0.9.
2. **Phase 0.5 auth:** Google OAuth client ID/secret (Google Cloud Console) + Apple Services ID/key, pasted into Supabase → Auth → Providers. I do the rest.
3. **`design-reference/` screenshots are missing** — P2/P3/P9 say "match the reference"; add the folder.
4. Companion specs (`dating-and-contacts-spec.md`, `home-dashboard-spec.md`) not in repo — send if they exist.
5. Rotate the exposed PAT in the git remote (still outstanding).

### 5. Next up
Phase 0.5 (finish Google + Apple auth) as soon as provider credentials arrive — but the platform decision (#1) should come first since it determines where that auth UI lives.

### Outage note
A transient Claude-tooling outage blocked command execution and `.claude/` writes during this phase: the three subagent files (implementer / code-reviewer / test-writer, drafted, Sonnet-pinned), the `timePolicy` test run, the dead-`cloudSync.js` deletion, and committing the pre-roadmap fixes (lint gate / gitignore / snappier nav — edits done and read-verified) are all queued to land on the next run. None affect the audit's conclusions.

---

## 2026-07-18 — Platform decision: Option A (full Expo rebuild)

Weston chose **Option A — full Expo/React Native rebuild**. Plan of record:
- New Expo app lives at **`mobile/`** in this repo (created with `create-expo-app`, TypeScript, Expo Router, New Architecture — the RN arch Phase 8's Apple Foundation Models require).
- **Carries over:** the Supabase project/schema/RLS as-is, and the pure TS engines — `timePolicy`, `goalEngine`, `profileEngine`, `planSuggest`, `streakEngine` (dependency-free; ported into `mobile/lib/` as phases need them).
- **The Vite web app stays deployed and untouched** during the rebuild (it has live users/data); it is replaced at Phase 11 per the "update the existing listing" ship decision.
- Bundle identifier for the new app MUST match the old listing's (App Store Connect → App Information) — placeholder until Weston reads it out (Phase 11 requirement, set early to avoid rework).

Scaffold execution (Phase 0.9) was **blocked this run by the ongoing tooling outage** (all mutating commands gated; project-file writes only). Queued for the next run, in order: create `.claude/agents/` (implementer / code-reviewer / test-writer, Sonnet-pinned, content drafted) → verify `timePolicy` (tsc + vitest) → delete dead `cloudSync.js` → commit pre-roadmap fixes + Phase 0 artifacts → deploy web → `npx create-expo-app mobile` → port `timePolicy` into `mobile/lib/` → verify the app type-checks/bundles (+ simulator boot if Xcode present) → commit + Phase 0.9 summary.
