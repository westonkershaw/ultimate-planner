# Recursive Learning — Architecture, Schema & Privacy

This documents the per-user learning subsystem added in the new typed shell, and
the **product flags** you need to handle before shipping it to the App Store /
website (privacy labels, privacy policy, schema versioning).

## What it is

A compact, versioned per-user **learned profile** derived by deterministic
heuristics (no LLM) from lightweight behavioural **events**. Both clients (web +
the App Store Expo wrapper — the same web bundle) read/write it through Supabase,
so phone and web share one source of truth. Everything degrades to a local cache
when Supabase is unconfigured, so nothing breaks pre-provisioning.

- Profile type: `src/types/profile.types.ts` (`LearnedProfile`, `LearningEvent`).
- Learn step (pure): `src/utils/profileEngine.ts` — `deriveProfile`, `migrateProfile`.
- Closed loop (pure): `src/utils/planSuggest.ts` — pre-fills the week/month rituals.
- Forgiving streaks (pure): `src/utils/streakEngine.ts`.
- Backend access + local fallback: `src/utils/profileSync.ts`.
- Event capture: `src/utils/learningEvents.ts` (`logLearningEvent`).
- Stores: `src/store/useProfileStore.ts`, `src/store/usePlanningStore.ts`.
- Learn trigger: `src/utils/learnNow.ts` (runs on ritual finish, reflection, or the
  manual "Update now" button in Settings).
- UI: `src/components/planner/*` (PlanningView, WeekWizard, MonthWizard, PlanProgress,
  WeekReflection) and `src/components/settings/LearnedProfilePanel.tsx`.

## Data model (Supabase)

Migration: `supabase/migrations/20260713091500_learning.sql`. Every table is
protected by RLS — a user can only ever touch their own rows (`auth.uid() = user_id`).

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | Auth profile (added `IF NOT EXISTS`; had no prior migration) | `id`, `first_name`, `last_name`, `is_pro` |
| `user_profile` | One `LearnedProfile` per user | `user_id` (PK), `schema_version`, `profile` (jsonb), `updated_at` |
| `learning_events` | Append-only behavioural signals | `id`, `user_id`, `ts`, `type`, `payload` (jsonb) |

Both clients go through the API/SDK, not direct table writes from one platform —
`profileSync.ts` is the single access point. There is **no separate REST layer**;
the Supabase JS client (`getSupabase()`, PKCE auth) is the API. If you later add a
scheduled server-side recompute, `api/learn.js` (Vercel Cron) is the intended home.

### Provisioning checklist (you)
1. Create/confirm the Supabase project; set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON`
   in Vercel (and locally in `.env.local`).
2. Apply `supabase/migrations/20260713091500_learning.sql`.
3. Note the existing sync inconsistency: legacy `src/utils/cloudSync.js` reads
   `VITE_SUPABASE_KEY` / table `user_data` (dead path). The new subsystem uses
   `VITE_SUPABASE_ANON` consistently. Standardise on `VITE_SUPABASE_ANON`.

## Profile schema (v1)

`LearnedProfile` — see `src/types/profile.types.ts` for the full typed shape:

- `identity`: user-authored `values[]` + `goals[]`.
- `preferences`: observed `planningDays`, `planningHour`, `preferredCategories`,
  `avoidCategories`, `weeklyPlanningStyle` — each overridable.
- `behavior`: `completionByCategory/TimeOfDay`, `followThroughByWeekday`,
  `avgReviewRating`, `planAdherence`.
- `insights[]`: capped (~12), ranked "what works / avoid / pattern".
- `overrides`: dot-path keys the user pinned — **the learn step never overwrites these**.

### Versioning + safe migration
- `PROFILE_SCHEMA_VERSION` (currently `1`) is stamped on every row.
- `migrateProfile(raw, userId)` coerces **any** older/partial/garbage value into a
  valid v1 (additive: unknown fields dropped, missing fields defaulted, never throws).
  It runs on every read (`profileSync.fetchProfile` + the local cache path).
- **Existing users**: first load with no row seeds an in-memory empty profile that
  fills in as they use the app; `identity.goals` sync from their existing goals on
  the first learn run. Nobody is blocked or wiped.
- To bump the schema: add fields to the interface, bump the constant, and extend
  `migrateProfile` with the upgrade — keep it additive.

## App Store privacy labels (what to declare)

The profile is **behavioural and linked to the user's identity** (Supabase user
id), so it must be declared even though learning is heuristic (no LLM, no training):

- **Usage Data → Product Interaction**: planning actions, task complete/skip,
  plan accept/edit/reject, review ratings. Used for **App Functionality** and
  **Personalization**. Linked to identity. **Not** used for tracking/ads.
- **User Content**: goals, intentions, review notes, values. App Functionality /
  Personalization. Linked to identity.
- **Identifiers**: the account user id (already collected for auth).
- **Data NOT used for tracking** across apps/websites; no third-party advertising.
  Do **not** check "Used to Track You."

## Privacy policy additions

- We store a **behavioural profile** and an **event log** server-side (Supabase) to
  personalize your weekly/monthly plans.
- What we collect: planning/completion actions, plan accept/edit signals, review
  ratings, and the goals/values/notes you enter.
- Purpose: personalization and app functionality only. **No LLM training** on your
  data; the learning step is deterministic.
- Control: you can **view, edit, and reset** everything in Settings → "What the
  planner has learned" (pin corrections, dismiss insights, "Reset what's been
  learned"). Account deletion cascades `user_profile` + `learning_events`
  (`ON DELETE CASCADE`).
- Retention: the profile is a small rolling aggregate; the event log is capped
  (~500 recent locally; server rows removed on reset/account deletion).

## Anti-dark-pattern guardrails (by design)

Streaks are **forgiving** (grace + earned freezes, `streakEngine`), copy never
shames a miss (`streakMessage`, `WeekReflection`), milestones are real (first month
planned, goal completed) — no arbitrary points, fake urgency, loss framing, or
infinite feeds. Nudges are opt-out and fire at the user's learned planning time.
