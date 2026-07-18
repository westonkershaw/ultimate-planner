# Ultimate Planner V60 Project Rules

## ⚠️ Rebuild in progress (2026-07-18): Expo app in `mobile/`

The product is being rebuilt as an **Expo/React Native app** in `mobile/` per
`ROADMAP.md` (architect + implementer/code-reviewer/test-writer subagent flow;
phase history in `PROGRESS.md`). The Vite web app below stays deployed and in
maintenance-mode until Phase 11 replaces it. Key conventions for `mobile/`:
- SDK 57 / RN 0.86 / Expo Router / New Architecture, TypeScript strict.
- Native dirs are **gitignored (CNG)** — regenerate with `npx expo prebuild`;
  `pod install` needs `LANG=en_US.UTF-8` in non-interactive shells.
- Pure logic lives in `mobile/lib/` — day-boundary math MUST import
  `mobile/lib/timePolicy.ts` (local timezone, never UTC).
- Carried-over spine: the Supabase project/schema/RLS and the pure TS engines
  (`timePolicy`, `goalEngine`, `profileEngine`, `planSuggest`, `streakEngine`).
- Bundle id placeholder `com.westonk.mobile` must become the old listing's id
  (App Store Connect) before any TestFlight build.

Everything below documents the existing **web app** (still true for `src/`).

## Stack
- Vite, React, TypeScript, Tailwind v4, Framer Motion, Zustand

## Architecture
- **Logic:** All math/business logic lives in `/src/utils`. UI components are consumers only.
- **State:** All Zustand stores in `/src/store`. Must persist to localStorage via `persist` middleware.
- **Components:** Keep under 150 lines. Split if larger.

## Styling — KINETIC UTILITY (light brutalist, adopted 2026-07-09)
- Strict 4px/8px spacing grid
- Color palette: ink `#000000` (primary fills/borders/text), paper `#f9f9f9` page / `#ffffff` cards, accent orange `#e94f0c` (progress, urgency, active states ONLY)
- Depth = thick black border (2-3px) + hard offset shadow (`.hard-shadow`, 4px 4px 0 #000) — never blur, glow, or soft shadows
- No rounded corners (global kill in `index.css`; `rounded-full` exempt for rings/dots)
- Typography: Anton for display/headers (uppercase), Archivo Narrow for body, Space Mono for status labels/code (`UPPERCASE_WITH_UNDERSCORES`)
- All tokens live in `src/index.css` `@theme` — single source of truth; never hardcode hex in components
- Full reference: `stitch-export/design-system.md` + the five screens in `stitch-export/`

## TypeScript Rules
- No `any` types allowed
- All stores must have explicit state/action interfaces
- All util functions must have typed inputs and outputs

## Component Rules
- Framer Motion for all transitions
- `useSpring` hook: `stiffness: 400, damping: 30`
- Lucide-React for all icons

## Agents Coordination
- UI/Styling agent: Only touches presentation layer, never /src/utils
- Widget agent: Builds interactive SVG components, integrates with stores
- Do not duplicate logic — check /src/utils before writing new calculations

## Quality Gate (Sentry Bot)
- Run `npm run sentry` before every commit — chains `tsc --noEmit` + `npm run lint`
- Run `npm run sentry:watch` during active development to auto-check on every file save
- Zero errors required before any `vercel --prod` deploy
- If build error occurs: freeze other work, read full stack trace, fix offending file immediately

## App.tsx Migration (in progress)

The monolith `src/App.jsx` is being replaced by the typed shell `src/App.tsx`. Both ship: `src/main.jsx` picks the shell at boot — the **new TS shell is now the default**; `?next=0` reverts to the legacy monolith (sticky in localStorage, `?next=1` re-opts into the new shell).

**Adapter-host pattern for legacy components.** Legacy tabs/modals still take `{ data, onChange }` from the old monolith state. To host them in the new shell:
1. Add a Suspense-wrapped host in `src/components/legacy/Legacy{Tab,Modal}Hosts.tsx`.
2. Pull `data`, `onChange`, `upd` from `useLegacyDataStore` (it reads/writes the legacy `up_data_v4_<userId>` localStorage blob).
3. For modals, pull dismiss-handlers from `useUIStore` (`closeModal`, `addToast`, `setActiveView`).
4. Wire the host into `App.tsx` (tabs) or `ModalLayer.tsx` (modals).

**Legacy → new view id map.** The monolith uses tab ids `plan`, `grow`, `health`, etc.; the new `ActiveView` is flat. The mapping lives in `LegacyModalHosts.tsx` (`LEGACY_TAB_TO_VIEW`) — extend it there when a modal calls `onNavigate(legacyId)` and lands on the wrong destination.

**localStorage conventions** (consume; don't rename — existing users have data under these keys):
- `up_data_v4_<userId>` — full user state blob (`_guest` for unauth)
- `up_auth_v4` — current auth user record (the **actual** key; earlier docs said `up_user` — wrong)
- `up_users` — local fallback user registry (`{email: {id, name, pass, ...}}`)
- `up_sessions` — active sessions list for the Security panel
- `up_notif_prefs` — notification preferences blob
- `up_onboarding_complete` — set to `'1'` after onboarding
- `up_morning_dashboard_seen` — YYYY-MM-DD of last morning dashboard view
- `up_get_started_dismissed` — set to `'1'` to suppress the checklist
- `up_shell` — set to `'next'` to opt into the TS shell
- `up_last_tab` / `up_last_plan_sub_tab` / `up_last_weekly_sub_tab` — last selected nav

**Auth in the new shell.** `useAuthStore` exposes `user`, `signIn/signUp/signOut/resetPassword`. `AuthGate` wraps `Shell` in `App.tsx` and: (a) calls `hydrate()` on mount to restore Supabase session; (b) re-keys `useLegacyDataStore` whenever `user.id` changes so each account loads its own `up_data_v4_<id>` blob; (c) renders `<AuthScreen/>` when there's no user. Supabase env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON` — when unset, the store falls back to the local `up_users` registry.

**Vite env types.** TS errors like `Property 'env' does not exist on type 'ImportMeta'` mean `src/vite-env.d.ts` is missing or your new env var isn't declared there. Add it to `ImportMetaEnv` rather than disabling the check.

**Modal auto-trigger priority** (`ModalLayer.tsx`): onboarding → monthlyReview → morningDashboard → getStarted. Add a new modal here, not by polling from individual views.

**Per-iteration playbook:**
1. Pick the smallest vertical slice that ships independently.
2. Implement it behind the `?next=1` gate (don't break legacy).
3. `npm run sentry` (tsc + lint).
4. `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/src/<changed-file>` to verify Vite transforms it.
5. Note any new conventions in this section so the next iteration moves faster.

**Reading legacy semantics fast.** `App.jsx` is bundler-output JSX (`(0, import_jsx_runtime.jsx)(...)` style) — unreadable per-line. To extract what a monolith panel does, **read the hand-written utility module first** (e.g. `utils/notifications.js` for notification prefs, `utils/backupEngine.ts` for backups). The utilities document the schema in ~50 lines instead of 200 lines of compiled JSX.

**Legacy-tab rewrite pattern** (slice #4 work). When promoting a tab from the `useLegacyDataStore` adapter to a first-class typed store:

1. Add a typed entry interface in `src/types/<tab>.types.ts` and re-export from `src/types/index.ts`.
2. Build `src/store/use<Tab>Store.ts` with `persist` middleware and its own localStorage key (e.g. `up_journal_v1`). Persist three fields: `<entities>`, `migrated`, `ownedBy`. **Don't delete the legacy blob** — other adapter-hosted tabs still need it.
3. Implement `migrateFromLegacy()` (reads from `up_data_v4_<currentUserId>` and merges into store) and `resetForUser(uid)` (clears state + re-migrates if `ownedBy !== uid`).
4. Use `onRehydrateStorage: () => (state) => { if (state && !state.migrated) state.migrateFromLegacy(); }` so first-load migrates automatically.
5. Wire `resetForUser` into `AuthGate.tsx`'s user-change effect — **required** for multi-account-on-same-browser isolation. Without it, signing in as a different user shows the previous user's data.
6. Build the view at `src/components/<tab>/<Tab>View.tsx` (under 150 lines; split helpers into siblings if needed).
7. In `App.tsx`, switch the route to the new view. Remove the host + its lazy import from `LegacyTabHosts.tsx`.

**Per-user store isolation.** All new persisted stores must include `ownedBy: string` and a `resetForUser(uid)` action wired into `AuthGate`. Single-localStorage-key + multi-user-on-one-browser was a real bug in the Journal store before fix — same trap will hit anything else that skips this step.

## AI Features & Prompts

All LLM prompts live in **`src/utils/aiPrompts.ts`** — the single source of truth.
Do not inline prompts or model ids at call sites again (they used to be scattered
across `App.jsx` and tabs with three different voices and a stale `claude-opus-4-5`
id that doesn't exist).

- **Adding a prompt:** write `build<Feature>Prompt(...) => PromptSpec`, then
  `fetch('/api/chat', { ..., body: JSON.stringify(toChatBody(spec)) })`.
- **Model ids:** use the `MODELS` constant (`MODELS.fast` = Haiku 4.5,
  `MODELS.smart` = Sonnet 4.6). Never type a raw model string elsewhere.
- **Provider proxy:** `/api/chat` (`api/chat.js`) tries Anthropic → Groq → Gemini
  → Ollama based on which env keys exist. It proxies the request body straight
  through, so the body must be Anthropic Messages shape (`{ model, max_tokens,
  system, messages }`) — which `toChatBody` produces.
- **Data-aware features:** don't read 10 stores in a component. Use
  `useCoachContext()` (`src/hooks/useCoachContext.ts`), which feeds the pure
  `buildCoachContext()` aggregator in `src/utils/coachContext.ts` — a typed,
  cross-domain snapshot (productivity, habits, goals, finance, wellbeing,
  growth). Add new signals to the aggregator (with a test) rather than recomputing
  in the UI. "Spend" there means real consumption — income and `savings`-category
  transfers are excluded, so don't reintroduce them.
- **Parsing model output:** when a prompt requests JSON, parse defensively (see
  `parseCoachInsight`) and always render a text fallback if parsing fails.
- The AI Coach card lives in `src/components/settings/AISection.tsx` +
  `CoachInsightCard.tsx`. It runs in the new shell with **server-side** API keys
  (the legacy `window.fetch` key-injector in `App.jsx` does not run in `App.tsx`).

## Recursive Learning Subsystem (added 2026-07-13)

Per-user learning that pre-personalizes weekly/monthly plans. **Heuristics only —
no LLM in the learn loop.** Full reference: `docs/LEARNING_AND_PRIVACY.md`.

- **Profile of record:** `LearnedProfile` (`src/types/profile.types.ts`), stored in
  Supabase `user_profile` (jsonb, RLS owner-only) with a local cache. Access layer:
  `src/utils/profileSync.ts` (cloud-first, local fallback when Supabase unset).
  Migration `supabase/migrations/20260713091500_learning.sql` also adds the missing
  `profiles` table + `learning_events`.
- **Pure logic (in `/src/utils`, all tested):** `profileEngine.ts`
  (`deriveProfile`/`migrateProfile` — deterministic learn step + safe versioned
  migration), `planSuggest.ts` (profile → pre-filled week/month), `streakEngine.ts`
  (forgiving streaks: grace + earned freezes, never shames).
- **Events:** call `logLearningEvent(type, payload)` (`src/utils/learningEvents.ts`)
  at natural moments — already wired into `useTaskStore` (complete/skip),
  `useGoalStore` (set/edit), the wizards (plan accept/edit/reject), and
  `WeekReflection` (week_reviewed). Fire-and-forget; never blocks UI.
- **Learn trigger:** `learnNow()` (`src/utils/learnNow.ts`) runs `deriveProfile` over
  the recent event window + goal snapshot and saves. Called on ritual finish, on
  reflection, and the manual "Update now" button — **on review, not per event.**
- **Stores:** `useProfileStore` (profile cache + `runLearn`/`setOverride`/`resetLearned`)
  and `usePlanningStore` (ritual completion records; streaks computed on the fly).
  Both follow the per-user isolation rule (`ownedBy` + `resetForUser` wired into
  `AuthGate`). `useProfileStore` is **not** persisted itself — the cache lives in
  `profileSync` so there is exactly one local copy.
- **UI (new shell only):** new `planning` view (`ActiveView`) → `PlanningView`, mounted
  in `App.tsx` + `Sidebar.tsx` under the "Plan" group. `WeekWizard` (enhanced with
  one-tap accept) is also used by legacy `App.jsx` — keep its props stable.
  Settings → `LearnedProfilePanel` is the view/edit/reset screen; overrides are pinned
  via dot-path keys the learn step never overwrites.
- **Graduation:** the TS shell is now the **default** (`src/main.jsx`:
  `localStorage.getItem('up_shell') !== 'legacy'`). `?next=0` is the reversible legacy
  escape hatch. So this subsystem is live-by-default, not gated.

## Known bugs / cleanups

- **~~`useLegacyDataStore` reads the wrong auth key.~~ FIXED (2026-06-29).**
  `src/store/useLegacyDataStore.ts` now reads `up_auth_v4` (was `up_user`), so
  `readUserId()` resolves the signed-in user and each account loads its own
  `up_data_v4_<id>` blob. `AuthGate` already calls `reloadLegacyData()` on
  `user.id` change, so sign-in/out re-keys correctly.

**Security note (2026-06-19).** The GitHub remote URL in `.git/config` contains an exposed personal access token (`ghp_*`). Rotate at https://github.com/settings/tokens and switch the remote to SSH or a fresh PAT before pushing anything you'd be unhappy about leaking.
