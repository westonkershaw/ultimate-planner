Ultimate Life Planner — Master Roadmap

Send this whole file to Claude Code. Work it in order, one phase at a time.

How to work (ARCHITECT instructions)

The main session is the ARCHITECT — run on the Fable model. The architect does not write feature code. Its loop, every phase:

1. Read this file top to bottom; find the current phase (first phase with unchecked items)
2. `git checkout main && git pull && git checkout -b <phase branch>`
3. Break each unchecked item into scoped tasks (exact files, expected behavior) and delegate to the `implementer` subagent (Sonnet). Independent tasks can run in parallel — use `git worktree` if two subagents must touch the repo at once, since they share a working directory.
4. Every diff goes through the `code-reviewer` subagent (Sonnet) — loop implementer <-> reviewer until approved
5. Where a phase lists tests, run the `test-writer` subagent (Sonnet) before committing
6. `npx tsc --noEmit` clean + tests green -> check off the items in this file, commit, merge to main, delete branch
7. STOP. Follow the END OF PHASE PROTOCOL below — do not start the next phase until Weston explicitly says go.

The architect reserves its own effort for: schema/RLS design, dependency decisions, cross-cutting refactors, and disagreements between implementer and reviewer. Subagent definitions live in `.claude/agents/` (implementer, code-reviewer, test-writer — all pinned to Sonnet). Reference screenshots live in `design-reference/` — they come from OTHER apps (Preach My Gospel and another planner app), shared as layout/style targets only. LOOK AT THEM when a phase says "match the reference," but never copy their actual assets, icons, artwork, or text — all copyrighted. Recreate the structure and feel with original assets in this app's own theme.

App context: "Ultimate Life Planner" — a Preach My Gospel-style planner for returned missionaries, members, and anyone working on themselves. Five Life Areas: Finance, Spiritual, Mental, Social, Physical. Mobile-first (iOS primary), web secondary. Weston has an Apple Developer account, TestFlight, and a Mac — shipping is Phase 11.

END OF PHASE PROTOCOL (mandatory, every phase)

When the last item of a phase is checked, the architect MUST stop and post a summary in exactly this shape, then wait for Weston's go-ahead:

1. Built — plain-English list of what this phase added or changed
2. Try it — 3-6 concrete taps Weston can do on his phone to see it ("open Home, long-press the Finance card, tap the + on the Today chip")
3. Decisions I made — anything the roadmap left open that the architect chose, with one-line reasoning
4. Needs Weston — anything blocked on him (console setup, a design call, content wording)
5. Next up — one sentence on the next phase

Also append the same summary, dated, to `PROGRESS.md` in the repo root (create it if missing) so every future session inherits the history. Never continue into the next phase in the same run, even if the phase finished quickly.

Definition of done (applies to every phase)

* `npx tsc --noEmit` clean; all tests green
* App boots on the iOS simulator with no red screens or new console errors; the phase's feature works there, not just in theory
* No regressions to whichever screens already exist (spot-check each)
* Roadmap checkboxes updated, PROGRESS.md appended, branch merged

Guardrails

* Live data: if the Phase 0 audit finds any real user data (Weston's own use, or the old app's users), every schema change ships with a migration that preserves it; destructive migrations are forbidden without an export path first. When in doubt, additive columns only.
* Scope: touch only files the current phase needs. Refactors outside phase scope get proposed in the phase summary, not done.
* Secrets: never commit .env, API keys, or Supabase service keys; confirm .gitignore covers them in Phase 0.
* Dependencies: only the architect adds packages, and each new package gets one line of justification in the phase summary.
* Privacy lines that never move: dating statuses and journal entries are never shared through Comps, never included in analytics visible to a companion, and never sent to any model or API — the AI assistant (Phase 8) is on-device only.
* Commits: small, conventional messages (`feat:`, `fix:`, `test:`), one logical change each — makes Weston's phone reviews readable.

Phase 0 — Codebase audit & reconcile

Branch: none (read-only)

Assume NOTHING about current state. The reference screenshots are from other apps — they show where this app is going, not where it is. The actual codebase may be the old HTML app, a partial Expo rebuild, or both. So:

* [x] Read the whole codebase; for every item below that already exists, check it off with a note `(already built)`; report what the app actually is today (framework, screens, data layer) — DONE 2026-07-18; see PROGRESS.md Phase 0 entry. Headline: this is a React-DOM web app in a WebView wrapper, NOT an Expo/RN app
* [x] DECIDED (Weston, 2026-07-18): **Option A — full Expo/React Native rebuild.** New Expo app scaffolded as **Phase 0.9** in `mobile/` inside this repo; Supabase schema + the pure TS engines (timePolicy, goalEngine, profileEngine, planSuggest, streakEngine) carry over; the existing Vite web app stays deployed and untouched during the rebuild and is replaced at Phase 11 per the ship decision
* [x] Confirm the data layer in use (Supabase or other) and note where auth stands (target: Google + Apple + email/password). If auth is incomplete, finish it FIRST as "Phase 0.5" on `feature/auth-completion` before Phase 1 — everything downstream assumes real accounts — CONFIRMED: Supabase. **Phase 0.5 DONE for email/password (2026-07-18):** Expo app has full Supabase auth (session persistence, auth gate, sign-in/create-account with confirmation state), reviewer-approved, verified live on the iPhone 17 Pro simulator. **Google/Apple remain pending Weston's provider credentials** — slot in as a follow-up ticket when they arrive (native flows: expo-apple-authentication + Google via Supabase OAuth). Core user data is still localStorage-per-device on web; the mobile rebuild stores everything in Supabase from Phase 1 on
* [x] Establish the time policy in one shared util: all "day" boundaries (streaks, Today chips, nightly ritual, newlywed year) computed in the device's local timezone — never UTC. Every later phase imports this instead of rolling its own — DONE 2026-07-18: `src/utils/timePolicy.ts` (12/12 tests green, tsc clean), ported to `mobile/lib/timePolicy.ts`; known offenders to migrate later: usePlannerStore/WeekWizard use UTC `toISOString().slice(0,10)`
* [x] Verify `.claude/agents/` contains implementer / code-reviewer / test-writer pinned to Sonnet; create them if missing — CREATED 2026-07-18 (Sonnet-pinned; agent files load at session start, so they're live from the next run — i.e. Phase 1)
* [x] Report the reconciled state to Weston before Phase 1 — delivered 2026-07-18 (chat + PROGRESS.md)

Phase 1 — Goals engine

Branch: `feature/goals-engine`

The data spine everything else displays.

* [x] Goal model: `title`, `lifeAreaId`, `metricType` (`currency` | `count` | `streak` | `numeric`), `targetValue`, `currentProgress`, `cadence` (daily/weekly/monthly), `targetDate?` (milestone deadline, "Has Baptismal Date" equivalent), derived `status` (progressing / needs_attention from recent activity) — DONE 2026-07-18 (`mobile/src/lib/goals-types.ts` + `goal-engine.ts`; currentProgress derived from events, never stored)
* [x] Progress is stored as progress events (timestamped increments), not a raw counter — streak math, history, and analytics all depend on this — DONE (`goal_progress_events`, append-only, `occurred_on` = device-local day key)
* [x] Goal CRUD screens with metricType picker — DONE (Goals tab: grouped list, new-goal form with metric/cadence/area pickers, detail with log-progress/edit/archive/delete)
* [x] Goal templates at onboarding + add-goal flow: "RM adjusting to home," "new semester," "new year reset" — one tap adds a starter goal per Life Area — DONE in the add-goal flow ("Add all 5" per set); onboarding integration lands with Phase 10's onboarding
* [x] Flexible Spiritual presets: Come Follow Me / scripture study / temple attendance options for members; meditation/mindfulness for everyone else — DONE (both flavors spread across the three template sets)
* [x] Tests: streak math across timezones/missed days, progress-event aggregation per cadence — DONE (26 tests; reviewer re-ran green under America/Denver, Pacific/Auckland, Pacific/Honolulu)
* [ ] RUNTIME GATE (needs Weston): apply `supabase/migrations/20260718170000_goals_engine.sql` to the live project (dashboard SQL editor) — until then the Goals screens hit missing tables

Phase 2 — Home dashboard (PMG Weekly Key Indicators layout)

Branch: `feature/home-dashboard`
Match the PMG Home screenshot element-for-element, for goals:

* [x] Header "THIS WEEK'S GOALS" + VIEW ALL -> Goals screen — DONE 2026-07-18
* [x] Featured full-width card (PMG's "New People 3/7"): pinned goal (long-press to pin; fallback nearest targetDate, then most recent) with big fraction + right-side "Today" chip with one-tap + that logs a progress event (PMG's "Today's Goal 1/1 +") — DONE (pin persisted server-side via `pinned_at` + one-pinned-per-user partial unique index; one-tap + for count/streak, currency/numeric route to detail)
* [x] 2-column card grid, one card per remaining Life Area: area icon in area color, primary goal fraction, status dot; areas with no goal show "Set a goal +" (grid stays stable, nudges balance) — DONE
* [x] Full-width period card: monthly goals with a month-named chip ("July Goal 0/2"), swipeable if several (PMG's "June Goal") — DONE (paging ScrollView; hidden when no monthly goals)
* [x] Outlined full-width WEEKLY PLANNING button -> guided session (Phase 4) — DONE as placeholder (button present; taps explain the session arrives in Phase 4)
* [x] "PROGRESSING GOALS" list (PMG's Progressing People), rows field-for-field: status star/dot; goal title; "Target: Oct 3, 2026"; "Progress logged 2 days ago" — DONE; "Next block" line DEFERRED to Phase 4 (calendar blocks don't exist yet; code comment marks the spot)
* [x] Floating + FAB: log progress / add goal — DONE; "add block" action DEFERRED to Phase 4
* [x] "Today" chip cadence math: daily = today's count; weekly = pace (on pace -> checkmark, behind -> what's due today); monthly = month progress — DONE (`dashboard-engine.ts`, linear weekly pace, Monday=ceil(target/7) … Sunday=target)
* [x] Custom Life Area card icons: ORIGINAL two-tone outline SVG icons via react-native-svg — one per Life Area + extras (people, target/flag, streak flame) — DONE (original geometry, primary stroke + accent detail; no interim vector-icons needed) + `LifeAreaColors` palette in theme.ts
* [x] Tests: chip math per cadence, featured-card fallback order, Progressing Goals sort (nearest targetDate, then recency) — DONE (74 tests total green; incl. Sunday week-boundary + Feb-29 edges)
* [ ] RUNTIME GATE (needs Weston): apply BOTH migrations — `20260718170000_goals_engine.sql` + `20260718190000_goal_pinning.sql` — then sign in on the simulator to see the dashboard live
* [ ] FIDELITY PASS (optional, needs Weston): `design-reference/` screenshots never landed; built element-for-element from this file's textual spec — drop the PMG screenshots in and I'll do a visual-fidelity pass

Phase 3 — Dating section, category flip, map colors, contact records

Branches: `feature/people-categories`, `feature/dating-section`, `feature/category-flip`, `feature/map-status-colors`, `feature/contact-records` (in that order)

3a. Data model — `category: 'friend' | 'family' | 'dating'` (migrate existing people to `friend`); `relationshipStatus?: 'past'|'interested'|'dating'|'engaged'|'newlywed'|'married'`; `weddingDate?`; contact fields `address?`, `phone?`, `email?`, `socialLinks?: {platform, url}[]`.

* [x] Status transitions are DERIVED at render time by a pure function `resolveRelationshipStatus(stored, weddingDate, today)`: engaged -> newlywed when today >= weddingDate; newlywed -> married when today >= weddingDate + 1 year. No background jobs. — DONE 2026-07-19 (`mobile/src/lib/relationship-status.ts`; also `firstAnniversaryKey` handles Feb-29 weddings by rolling to Mar-1 the following non-leap year)
* [x] Flipping out of `dating` retains status + weddingDate hidden; flipping back restores. Clearing is a separate explicit action. — DONE (`setCategory` touches only `category`; `use-category-flip.ts`'s Keep-hidden vs Clear confirm, Keep is the safe default)
* [x] Tests: wedding-day boundary, 1-year boundary, Feb 29 weddings, cleared weddingDate, flip round-trip — DONE (relationship-status + category-flip test suites)

3b. Dating section UI — restructure the People tab to match the reference: collapsible groups In Touch / Warming Up / Out of Touch (derived from last-contact recency; thresholds configurable, e.g. <2wk / 2-6wk / 6wk+) plus the new Dating group:

* [x] grey dot = past relationship; yellow = interested; green = actively dating; hollow light-blue star = engaged, wedding date shown next to name + countdown chip; filled light-blue dot = "Married" with celebratory accent for exactly 1 year; dark-blue dot = married 1yr+ — DONE (`status-visual.ts`; recency thresholds 14d/42d in `people-grouping.ts`)
* [x] Sort: married -> newlywed -> engaged -> dating -> interested -> past. Engaged requires a weddingDate picker. — DONE (`sortDatingGroup`; new-person form requires weddingDate for engaged)

3c. Category flip — from detail screen (segmented control), list row long-press, and map pin callout:

* [x] Instant, except leaving `dating` with a status set -> one-line confirm "Keep dating history hidden, or clear it?" (Keep default) — DONE on the detail screen and list long-press via a single shared `use-category-flip.ts` handler. **Not wired into the map pin callout** (3d) — see the note below; the callout has no flip action yet.

3d. Map status colors —

* [x] Dating pins use the same dot/star palette as 3b; friends/family pins keep In Touch / Warming Up / Out of Touch colors — DONE (`map-pins.ts` delegates to `statusVisual`/`StatusColors` directly, so the map and list can never drift)
* [~] Pin callout: photo, name, status, last contact, call / text / log contact / Move to... — PARTIAL: photo, name, status, call, text, log contact, and tap-through to detail are DONE; **last-contact line and the "Move to..." flip action are not in the callout** (only call/text/log-contact made it in; a quick follow-up could add both by reusing `use-category-flip.ts`'s `requestMove` and a days-since-`last_contact_at` line, but it was not done this phase)
* [x] Layers button filters Dating / Friends / Family pin sets — DONE (`MapLayerPicker`, `pinsForLayer`)

3e. Contact records — on every person's detail screen (all optional, empty rows hidden):

* [x] Address geocodes on save -> drops/updates map pin — DONE (`geocode.ts` wraps `expo-location`, never throws, silently no-ops on a failed lookup; closes the loop with the 3d map)
* [x] Phone -> call + text quick actions (tel:/sms:), each offering to log a contact (updates last-contact tracking) — DONE (`quick-contact-actions.tsx`)
* [x] Email; social links as tappable platform icons — DONE (`contact-row.tsx`, `social-links-section.tsx` + `social-icon.ts` SF Symbol lookup with a text fallback)
* [ ] RUNTIME GATE (needs Weston): apply the `people.sql` migration (already listed under Phase 1's runtime gate, same batch) — until then the People tab and map hit missing tables

Phase 4 — Planning rituals

Branches (built as three sub-branches instead of one, mirroring Phase 3's structure): `feature/blocks-daily-view`, `feature/weekly-wizard`, `feature/nightly-ritual` (in that order)

* [x] Guided weekly planning session: step-by-step wizard (review last week -> set targets per Life Area -> schedule blocks), launched by the Home button + a recurring reminder at the user's chosen day/time — this is how PMG's weekly planning actually runs — DONE 2026-07-20 (`mobile/src/app/plan/weekly-wizard.tsx`; the Home `WEEKLY PLANNING` button — a placeholder since Phase 2 — now opens it for real; the reminder is genuinely scheduled via `expo-notifications`, requested in-context on the wizard's Done step)
* [x] Daily planning view: today's blocks + today's targets in one screen, quick "plan tomorrow" evening flow — DONE (`mobile/src/app/plan/today.tsx`; today's targets reuse the Phase 2 `todayChipFor` dashboard logic rather than reimplementing it)
* [x] Nightly planning ritual: short evening notification (check off today, glance at tomorrow) — the missionary 9pm habit engine. NOTE: this needs local notification permission NOW (Phase 4), not in Phase 10 — request it in-context the first time the user enables the ritual, with a one-line explanation, never at app launch — DONE (`mobile/src/app/plan/tonight.tsx` + a Settings toggle in `explore.tsx`, default off; permission requested from exactly two in-context moments — the toggle and the weekly wizard's Done step — never at launch, verified by grep + a live boot-check showing no permission prompt on cold start)
* [x] Optional reflection moment opening/closing the session (prayer for members, reflection for anyone) — off by default, Settings toggle — DONE (`reflection-card.tsx`; no existing member/audience preference was found in the codebase, so the copy is warm and non-denominational rather than presuming an audience, the same choice already made for the Spiritual goal templates in Phase 1)
* [x] Blocks link to a Goal (and optionally a person); completing a block writes a progress event — DONE (`blocks` table, `ON DELETE SET NULL` on both links so deleting a goal/person never destroys planning history; completing a goal-linked block reuses the exact same `logProgress` function a manual progress log uses, rather than a separate write path)
* [ ] RUNTIME GATE (needs Weston): apply `supabase/migrations/20260720120000_blocks.sql` (same batch as the still-outstanding Phase 1/2/3 migrations) — until then the Daily/Weekly/Tonight screens hit missing tables

Phase 5 — Google Calendar sync

Branch: `feature/gcal-sync`

* [ ] Two-way sync between weekly blocks and Google Calendar via the Google OAuth token from sign-in; store `googleCalendarEventId` per block; handle edits/deletes both directions

Phase 6 — People depth

Branch: `feature/people-depth`

* [ ] Progress records per person (PMG People tab): last contact ("last saw 12 days ago"), next planned contact, birthday, notes; logging a visit/call/text updates the record + linked Social goals
* [ ] Birthday surfacing: upcoming birthdays on Home + as suggested Social blocks in weekly planning
* [ ] Journal (Area Book): quick notes attached to a day, goal, or person; surfaced in weekly review
* [ ] Seasons ("transfers"): archive a semester/season of goals, start fresh, browse history

Phase 7 — Review & analytics

Branch: `feature/review-analytics`

* [ ] End-of-week review flow: mark goals hit/missed, one-tap roll of unfinished goals into next week
* [ ] Analytics screen: time per Life Area per week (from blocks), completion rate per area over time, streak calendars
* [ ] "Life balance" view: flag when one of the 5 areas is consistently starved
* [ ] Charting lib: architect decision (victory-native vs react-native-gifted-charts)

Phase 8 — On-device AI assistant (free, private)

Branch: `feature/ai-assistant`

* [ ] @react-native-ai/apple (Apple Foundation Models — free, no API key, on-device). Requires iOS 26+, Apple Intelligence hardware, RN New Architecture, dev build (not Expo Go)
* [ ] Availability gate at startup; hide AI features cleanly on unsupported devices/Android/web
* [ ] "Suggest my week" in weekly planning: prompt with goals, last week's completion, existing commitments; structured JSON output matching the block schema -> editable suggestions the user accepts before they land on the calendar
* [ ] End-of-week AI insights on the review screen (plain text)

Phase 9 — Comps (accountability)

Branch: `feature/comps`
Build the Comps tab from scratch, modeled on the reference screenshots (Moments / Comps / Me segmented tabs, a share-a-moment composer, feed below) — PMG's companionship for regular life:

* [ ] Comps tab shell: Moments / Comps / Me segments; composer ("Share a faith moment..." style prompt, wording configurable); feed of companions' moments — visible only to your comps
* [ ] Pair by invite link; shared visibility of weekly goal targets + completion (never journal entries, never dating data)
* [ ] Weekly check-in prompt after both reviews — like reporting KIs
* [ ] Shared blocks landing on both calendars ("companionship study": workout together, weekly call)
* [ ] Later, optional: small groups (family/roommates/quorum = the district) — only if pairs prove out

Phase 10 — Polish

Branch: `feature/polish`

* [ ] Push notifications for planned blocks
* [ ] New-user onboarding flow: sign in -> pick which Life Areas matter most -> goal template picker (Phase 1's templates) -> land on a Home that already has something on it. The app was built around Weston's data; strangers start from zero, and this is their first 60 seconds
* [ ] Contacts import: pull name, photo, phone, address from the phone's contacts (expo-contacts) with a multi-select picker — nobody will retype 50 people into the People tab by hand
* [ ] Accessibility pass: status is currently color-only (dots) — add VoiceOver labels ("Engaged, wedding June 12") and a text/shape cue option; support Dynamic Type on the dashboard cards
* [ ] Crash reporting (Sentry or expo-insights) wired in BEFORE TestFlight goes to outside testers, so bugs come with stack traces instead of "it crashed lol" texts
* [ ] Performance check on a real device: calendar scroll, People list with 100+ contacts, map with many pins — the old HTML app died on jank; don't repeat it
* [ ] Offline support: local cache + sync queue
* [ ] iOS home-screen widget: today's blocks + goal progress
* [ ] Light theme option alongside the existing dark
* [ ] Web parity pass (`expo start --web`): map + native auth degrade gracefully

Phase 11 — Ship

Branch: `release/1.0`
(Apple Developer account, TestFlight, and Mac are already set up.)

* [ ] Multi-tenant security audit: verify every table has RLS so one account can never read another's people, goals, journal, or dating data — mandatory before strangers can create accounts
* [x] DECIDED (Weston): ship as an UPDATE to the existing Ultimate Life Planner listing — the rebuild fully replaces the old HTML app. Requirements this creates: the new build MUST use the old app's exact bundle identifier (find it in App Store Connect -> the app -> App Information) and a higher version number, built from Weston's same Apple Developer account. Keeps the listing, name, and any existing users. First launch after update must handle old-app leftovers gracefully: treat it as a fresh start (old WebView-local data is not expected to migrate); if the old app kept any server-side accounts, present a sign-in path rather than crashing on unrecognized local state
* [ ] DECISION (Weston): pricing — free, paid, or free + subscription. Affects App Store setup (IAP config) so it must be decided before submission, not after
* [ ] External TestFlight beta: a handful of real testers (RM friends are the exact target user) for 1-2 weeks before public release
* [ ] EAS Build (or Xcode archive) config for iOS; TestFlight build to Weston's device; Android build if desired
* [ ] App Store requirements: privacy policy URL, in-app account deletion (required — the app has account creation), App Privacy questionnaire
* [ ] Data export (JSON/CSV of goals, blocks, people, history)
* [ ] App icon, splash, store screenshots + listing copy
* [ ] Submit for review

Detailed companion specs (same content, more depth) if present in the repo: `dating-and-contacts-spec.md`, `home-dashboard-spec.md`.
