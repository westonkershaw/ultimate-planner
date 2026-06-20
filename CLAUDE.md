# Ultimate Planner V60 Project Rules

## Stack
- Vite, React, TypeScript, Tailwind v4, Framer Motion, Zustand

## Architecture
- **Logic:** All math/business logic lives in `/src/utils`. UI components are consumers only.
- **State:** All Zustand stores in `/src/store`. Must persist to localStorage via `persist` middleware.
- **Components:** Keep under 150 lines. Split if larger.

## Styling
- Strict 4px/8px spacing grid
- Color palette: Primary `#6366f1`, Surface `#08090d`, Border `slate-900`
- Background: `#08090d`, Cards: `backdrop-blur-xl`
- Linear-style "Deep Dark" aesthetic

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

The monolith `src/App.jsx` is being replaced by the typed shell `src/App.tsx`. Both ship: `src/main.jsx` picks the shell at boot — legacy is default; `?next=1` opts into the new shell (sticky in localStorage, `?next=0` reverts).

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

**Security note (2026-06-19).** The GitHub remote URL in `.git/config` contains an exposed personal access token (`ghp_*`). Rotate at https://github.com/settings/tokens and switch the remote to SSH or a fresh PAT before pushing anything you'd be unhappy about leaking.
