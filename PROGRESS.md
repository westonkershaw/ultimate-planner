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

Scaffold execution (Phase 0.9) was briefly blocked by a tooling outage, then completed the same day — see the Phase 0.9 entry below.

---

## 2026-07-18 — Phase 0.9: Expo workspace bootstrap (Option A execution)

### 1. Built
- **`mobile/`** — the new Expo app (create-expo-app default template: **SDK 57, RN 0.86, Expo Router, New Architecture**, TypeScript strict). `npx tsc --noEmit` clean. `timePolicy` ported to `mobile/lib/`. Native dirs (`ios/`, `android/`) are gitignored — **CNG**: regenerate anytime with `npx expo prebuild`.
- **`.claude/agents/`** — `implementer`, `code-reviewer`, `test-writer` created, Sonnet-pinned (live from the next session, i.e. Phase 1).
- **Phase 0 leftovers landed:** `timePolicy` verified (12/12 tests, tsc clean); lint gate actually restored — the 1,590 errors turned out to come from built `dist/` output inside `.claude/worktrees/` checkouts, not just `App.jsx`; ignores now cover `**/dist`, `.claude`, `src/App.jsx`, and `mobile` (which has its own toolchain). Dead `cloudSync.js` deleted. Snappier nav shipped. All committed in small conventional commits and pushed; web prod redeployed (HTTP 200).

### 2. Verification honest-status
- ✅ `mobile` type-checks clean; **Metro/Hermes iOS bundle builds end-to-end** (`expo export --platform ios` → 3.4MB `.hbc`).
- ⚠️ **Native simulator boot NOT yet verified:** `pod install` first hit a CocoaPods UTF-8 locale quirk (fix: `LANG=en_US.UTF-8`), then died with **"No space left on device" — the Mac has ~1GB free**; an iOS native build needs several GB. Blocked on Weston freeing ~10GB. Everything else about the scaffold is verified.

### 3. Decisions I made
- `mobile/` inside this repo (no monorepo tooling) — shared history/docs/Supabase; the web app is maintenance-mode, so a workspace package for code sharing is overkill; pure TS engines get ported file-by-file as phases need them.
- CNG (gitignored native dirs) — `app.json` stays the source of truth; EAS/prebuild regenerate `ios/` on demand; keeps the repo small and diffs readable.
- Bundle id is currently the auto-generated `com.westonk.mobile` — MUST be replaced with the old listing's exact bundle id (App Store Connect → App Information) before any TestFlight build (Phase 11 requirement, worth setting as soon as Weston reads it out).
- Kept the template's tabs/demo screens as-is — Phase 1/2 will replace them; deleting now buys nothing.

### 4. Needs Weston
1. **Free ~10GB disk on the Mac** — blocks the first native simulator build (`npx expo run:ios`).
2. Google + Apple OAuth credentials (Phase 0.5).
3. `design-reference/` screenshots + companion spec files.
4. Old app's bundle identifier from App Store Connect.
5. Rotate the exposed PAT in the git remote (still outstanding).

### 5. Next up
Phase 0.5 (auth in the Expo app: email/password against the existing Supabase now; Google/Apple once credentials arrive) — then Phase 1 (Goals engine) with the subagent flow.

---

## 2026-07-18 — Phase 0.5: Auth completion (email/password) — first full subagent-loop phase

### 1. Built
- **Email/password auth in the Expo app**, on branch `feature/auth-completion`, merged to main (`5cf5809`):
  `src/lib/supabase.ts` (singleton client, AsyncStorage session persistence, AppState-driven token refresh, hard fail on missing env), `src/lib/auth-context.tsx` (AuthProvider/useAuth: session, loading, signIn/signUp/signOut; signUp passes first/last name metadata for the `profiles` trigger), `src/components/auth/sign-in-screen.tsx` (two-mode screen + validation + "check your email" confirmation state), auth gate in `src/app/_layout.tsx`, temporary sign-out row on the second tab. Env plumbed via `mobile/.env` (gitignored) + `.env.example` against the SAME live Supabase project as the web app — shared accounts.
- **Process milestone:** first phase run fully through the roadmap loop — implementer (Sonnet) built it → code-reviewer (Sonnet) audited and **APPROVED** (traced auth-js source to rule out a session-init race; scope/conventions/privacy checks) → architect merged.
- **Phase 0.9 DoD closed:** freed disk → native build succeeded → app **boots on the iPhone 17 Pro simulator**; Metro serves 1,720 modules; screenshot-verified the live auth screen. Bonus finding: supabase-js runs on Hermes/RN 0.86 **without** react-native-url-polyfill.

### 2. Verification
tsc strict clean (implementer + reviewer independently) · web suite still green · native boot + auth screen screenshot-verified. NOT yet exercised live: an actual credentialed sign-in round-trip (first real tap does it; rendering + client init prove the module path).

### 3. Decisions I made
- No test-writer run: Phase 0.5 lists no tests in the roadmap; auth logic here is thin glue over supabase-js. Goals engine (Phase 1) is where the test-writer starts earning its keep.
- Kept the template's existing `#3c87f7` accent for buttons (already hardcoded in the template) rather than inventing a token system mid-phase — Phase 2 (dashboard rebuild) owns mobile theming.
- Google/Apple: deliberately no dead buttons in the UI; they get added when provider credentials exist.

### 4. Needs Weston
1. Google OAuth client ID/secret + Apple Services ID/key → Supabase Auth providers (completes the auth target).
2. `design-reference/` screenshots + companion specs (needed by Phase 2's "match the reference").
3. Old app's bundle identifier from App Store Connect.
4. Rotate the exposed PAT in the git remote (still outstanding).

### 5. Next up
Phase 1 — Goals engine (`feature/goals-engine`): the data spine (goal model, progress events, CRUD, templates) built Supabase-backed with RLS from day one, full implementer → reviewer → test-writer loop.

---

## 2026-07-18 — Phase 1: Goals engine

### 1. Built
- **Schema + RLS (architect):** `supabase/migrations/20260718170000_goals_engine.sql` — `goals` + append-only `goal_progress_events`; `occurred_on` is the DEVICE-LOCAL day key (time policy in the data layer); owner-only RLS with event inserts additionally verifying goal ownership; additive-only.
- **Pure engine** (`mobile/src/lib/`): typed models + row mappers, cadence windows (daily / local Mon–Sun weekly / calendar monthly), `currentStreak` (same-day dedup + graceToday: an unfinished today never breaks a streak), `totalProgress`, `deriveStatus` (progressing = activity in current or previous cadence window).
- **Templates:** 3 sets ("RM adjusting to home", "New semester", "New year reset") × one starter goal per Life Area, member + general Spiritual flavors spread across sets.
- **Screens:** Goals tab (grouped by Life Area), new-goal form (metricType/cadence/area pickers, YYYY-MM-DD target date validation, template sets with one-tap "Add all 5" + tap-to-prefill), goal detail (live current/target for the cadence window, streaks, one-tap +1 or amount logging, recent events, inline edit, Alert-confirmed archive/delete). React-query hooks with correct invalidation.
- **Tests:** 26 engine tests (streak grace/gaps/dedup/month-boundary/DST, per-cadence windows incl. Sunday→prior-week, status boundaries, inclusive sums).
- **Deps added (architect):** `@tanstack/react-query` (server-state for every Supabase screen from here on), `vitest` (mobile test runner the roadmap's test requirements need).

### 2. Process + verification
Full loop, first workflow-orchestrated phase: implementer (core) → reviewer **APPROVED** → parallel implementer (screens) + test-writer → reviewer **APPROVED, zero fix rounds**. The reviewer independently re-ran the suite under three timezones (Denver / Auckland / Honolulu) — 26/26 in all. Architect gates re-verified: tsc strict clean, tests green, app boots on the simulator with all Phase 1 code loaded (auth gate correctly in front; no red screen). Merged `feature/goals-engine` → main (`02139d5`), branch deleted.
- **NOT yet verified live:** the Goals screens against the real DB — blocked on the migration being applied (below) and a signed-in account on the simulator.

### 3. Decisions I made
- `currentProgress` is derived, never stored — the events table is the single source of truth (roadmap's own principle, enforced at the schema level by simply not having a counter column).
- Goal list rows show title/cadence/target only (no live fractions) — avoids N event queries on the list; the detail screen owns live numbers; Phase 2's dashboard adds the aggregate view properly.
- Template "one tap per Life Area" implemented as per-set "Add all 5"; onboarding placement waits for Phase 10's onboarding flow.
- Streak grace: an empty *today* counts back from yesterday (a day only breaks a streak once it's over) — matches the healthy-engagement principle.

### 4. Needs Weston
1. **Apply the migration** (60s): Supabase dashboard → SQL editor → paste `supabase/migrations/20260718170000_goals_engine.sql` → Run. (Or explicitly authorize me to connect with the DB password — the permission system declined my attempt, so it's your call.)
2. Then sign in on the simulator (create your account) and the Goals tab goes fully live.
3. Still open: Google/Apple credentials, `design-reference/` screenshots (Phase 2 needs them), old app's bundle id, PAT rotation.

### 5. Next up
Phase 2 — Home dashboard (PMG Weekly Key Indicators layout): featured pinned-goal card, Life Area grid, Today chips, Progressing Goals list — **requires the `design-reference/` screenshots to "match the reference element-for-element."**

---

## 2026-07-18 — Phase 2: Home dashboard

### 1. Built
- **Dashboard engine** (`mobile/src/lib/dashboard-engine.ts`, pure): Today-chip math per cadence (daily count, weekly linear pace — Monday `ceil(target/7)` through Sunday `= target`, on-pace vs behind with exact due-today; monthly month-fraction; streak = did-it-today), featured-goal fallback chain (pinned → nearest upcoming targetDate → past → most recent), per-area primary goal, Progressing-Goals sort, last-logged recency.
- **Pinning**: `pinned_at` on goals (new additive migration `20260718190000_goal_pinning.sql`), at most one non-archived pin per user enforced by a partial unique index; `setPinned` clear-then-set repo fn + hook.
- **Original icon set** (`react-native-svg`): five two-tone Life Area icons (banknote/coin, open book + light rays, head + spark, two figures, dumbbell motif) + target-flag, streak-flame, people extras — original geometry, no copied assets — plus a `LifeAreaColors` dark-theme palette.
- **Home screen rebuilt** (`src/app/index.tsx` + `src/components/home/*`): THIS WEEK'S GOALS header + VIEW ALL, featured card (big fraction, Today chip with one-tap +, long-press pin/unpin), 2-col area grid with status dots + "Set a goal +" empties, swipeable monthly period card, outlined WEEKLY PLANNING button (Phase 4 placeholder), PROGRESSING GOALS list (Next-block line deferred to Phase 4), + FAB. One recent-events query (no N+1), pull-to-refresh, loading/error states.
- **Tests**: 74 total green (48 new this phase) — chip math incl. Sunday/Feb-29 edges, fallback order incl. cross-area pin-leak guard, sort stability.

### 2. Process + verification
Workflow-orchestrated: parallel(engine, icons) → reviewer **APPROVED** → parallel(home screen, tests) → reviewer **APPROVED** — zero fix rounds across both waves (session-limit interruption mid-run; resumed from the workflow journal with the approved core cached). Reviewers ran tsc + vitest themselves; native app rebuilt with react-native-svg and relaunched on the simulator. Architect gates re-run at merge time.
- **NOT verified live**: dashboard with real data — still gated on the two un-applied migrations + a signed-in account.

### 3. Decisions I made
- Built from the roadmap's textual spec — `design-reference/` was still absent at phase start (checkbox added for an optional fidelity pass when screenshots land).
- Pinning lives server-side (cross-device) rather than AsyncStorage; integrity enforced by schema, not just client discipline.
- One-tap chip "+" only for count/streak metrics; currency/numeric route to the detail screen (an amount is required — silent +1 would corrupt data).
- Weekly pace is linear (`ceil(target × elapsed-days / 7)`) — matches PMG's on-pace/behind semantics without configurable pacing complexity.
- WEEKLY PLANNING button + FAB "add block" ship as explicit Phase 4 placeholders rather than hidden — layout matches the target design now.

### 4. Needs Weston
1. **Apply BOTH migrations** (Supabase → SQL editor): `20260718170000_goals_engine.sql`, then `20260718190000_goal_pinning.sql`.
2. Sign in on the simulator → the full dashboard lights up.
3. Optional: drop the PMG reference screenshots in `design-reference/` for a fidelity pass.
4. Still open: Google/Apple credentials, old app's bundle id, PAT rotation.

### 5. Next up
Phase 3 — Dating section, category flip, map colors, contact records (five sub-branches in order: people-categories → dating-section → category-flip → map-status-colors → contact-records). Requires the People data model — the first genuinely new domain since the rebuild began.
