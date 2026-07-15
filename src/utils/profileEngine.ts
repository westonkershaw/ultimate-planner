/**
 * profileEngine.ts
 *
 * The deterministic "learn" step. Pure, no I/O, fully unit-testable. Turns a
 * user's event history into a compact `LearnedProfile` using stats/heuristics
 * (no LLM). Called on each weekly/monthly review — not per event.
 *
 * Guarantees:
 *  - Small: aggregates + a capped, ranked insight list.
 *  - Honest: only claims what the data supports (min sample sizes below).
 *  - User-first: anything in `profile.overrides` is never overwritten.
 *  - Safe: `migrateProfile` coerces any older/partial row into a valid v1.
 */

import {
  PROFILE_SCHEMA_VERSION,
  type LearnedProfile,
  type LearningEvent,
  type LearnedInsight,
  type ProfileGoal,
  type ProfileBehavior,
  type ProfilePreferences,
  type CategoryCompletion,
  type TimeCompletion,
  type TimeOfDay,
  type ProfileCategory,
} from '@/types';

// ── Tunables ────────────────────────────────────────────────────────────────

/** Min observations before a category/time claim is trustworthy. */
const MIN_SAMPLE = 3;
const PREFER_RATE = 0.6;
const AVOID_RATE = 0.35;
const MAX_INSIGHTS = 12;
const PLANNING_EVENT_TYPES = new Set(['plan_accepted', 'plan_edited', 'week_reviewed', 'month_reviewed']);

// ── Small helpers ───────────────────────────────────────────────────────────

const uid = (): string => Math.random().toString(36).slice(2, 10);
const pct = (rate: number): number => Math.round(rate * 100);
const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

export function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

function emptyBehavior(): ProfileBehavior {
  return {
    completionByCategory: {},
    completionByTimeOfDay: {
      morning: { rate: 0, n: 0 },
      afternoon: { rate: 0, n: 0 },
      evening: { rate: 0, n: 0 },
    },
    followThroughByWeekday: {},
    avgReviewRating: null,
    planAdherence: null,
  };
}

function emptyPreferences(): ProfilePreferences {
  return {
    planningDays: [],
    planningHour: null,
    preferredCategories: [],
    avoidCategories: [],
    weeklyPlanningStyle: null,
  };
}

export function emptyProfile(userId: string): LearnedProfile {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    userId,
    updatedAt: new Date().toISOString(),
    identity: { values: [], goals: [] },
    preferences: emptyPreferences(),
    behavior: emptyBehavior(),
    insights: [],
    overrides: {},
  };
}

// ── Migration (safe, additive) ──────────────────────────────────────────────

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * Coerce ANY stored/partial value into a valid v1 profile. Never throws. Unknown
 * fields are dropped; missing fields get defaults. Future schema bumps add cases
 * here — always additive, never destructive.
 */
export function migrateProfile(raw: unknown, userId: string): LearnedProfile {
  const base = emptyProfile(userId);
  if (!isRecord(raw)) return base;

  const identity = isRecord(raw.identity) ? raw.identity : {};
  const prefs = isRecord(raw.preferences) ? raw.preferences : {};
  const behavior = isRecord(raw.behavior) ? raw.behavior : {};

  return {
    ...base,
    userId: typeof raw.userId === 'string' && raw.userId ? raw.userId : userId,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : base.updatedAt,
    identity: {
      values: strArr(identity.values),
      goals: Array.isArray(identity.goals)
        ? (identity.goals.filter(isRecord).map((g) => ({
            id: typeof g.id === 'string' ? g.id : uid(),
            title: typeof g.title === 'string' ? g.title : '',
            category: typeof g.category === 'string' ? g.category : 'general',
            why: typeof g.why === 'string' ? g.why : undefined,
          })) as ProfileGoal[])
        : [],
    },
    preferences: {
      planningDays: strArr(prefs.planningDays),
      planningHour: typeof prefs.planningHour === 'number' ? prefs.planningHour : null,
      preferredCategories: strArr(prefs.preferredCategories),
      avoidCategories: strArr(prefs.avoidCategories),
      weeklyPlanningStyle:
        prefs.weeklyPlanningStyle === 'light' ||
        prefs.weeklyPlanningStyle === 'balanced' ||
        prefs.weeklyPlanningStyle === 'detailed'
          ? prefs.weeklyPlanningStyle
          : null,
    },
    behavior: {
      ...emptyBehavior(),
      ...(isRecord(behavior.completionByCategory)
        ? { completionByCategory: behavior.completionByCategory as Record<ProfileCategory, CategoryCompletion> }
        : {}),
      ...(isRecord(behavior.completionByTimeOfDay)
        ? { completionByTimeOfDay: behavior.completionByTimeOfDay as Record<TimeOfDay, TimeCompletion> }
        : {}),
      ...(isRecord(behavior.followThroughByWeekday)
        ? { followThroughByWeekday: behavior.followThroughByWeekday as Record<string, number> }
        : {}),
      avgReviewRating: typeof behavior.avgReviewRating === 'number' ? behavior.avgReviewRating : null,
      planAdherence: typeof behavior.planAdherence === 'number' ? behavior.planAdherence : null,
    },
    insights: Array.isArray(raw.insights)
      ? (raw.insights.filter(isRecord).map((i) => ({
          id: typeof i.id === 'string' ? i.id : uid(),
          text: typeof i.text === 'string' ? i.text : '',
          kind: i.kind === 'works' || i.kind === 'avoid' || i.kind === 'pattern' ? i.kind : 'pattern',
          confidence: typeof i.confidence === 'number' ? clamp01(i.confidence) : 0.5,
          evidenceCount: typeof i.evidenceCount === 'number' ? i.evidenceCount : 1,
          updatedAt: typeof i.updatedAt === 'string' ? i.updatedAt : base.updatedAt,
        })) as LearnedInsight[])
      : [],
    overrides: isRecord(raw.overrides) ? raw.overrides : {},
  };
}

// ── The learn step ──────────────────────────────────────────────────────────

export interface DeriveProfileInput {
  current: LearnedProfile;
  /** Recent events (caller windows these, e.g. last ~90d / 300 events). */
  events: LearningEvent[];
  now?: Date;
  /** Current goal snapshot to sync into identity.goals (optional). */
  goals?: ProfileGoal[];
  /** User-authored values (optional; preserved from current if absent). */
  values?: string[];
}

/**
 * Recompute the profile from the current profile + a recent event window.
 * Deterministic: same inputs → same output (aside from `updatedAt`).
 */
export function deriveProfile(input: DeriveProfileInput): LearnedProfile {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const { current, events } = input;

  const behavior = emptyBehavior();

  // --- Completion by category / time / weekday ---
  const cat = behavior.completionByCategory;
  const todAgg: Record<TimeOfDay, { done: number; total: number }> = {
    morning: { done: 0, total: 0 },
    afternoon: { done: 0, total: 0 },
    evening: { done: 0, total: 0 },
  };
  const wdAgg: Record<string, { done: number; total: number }> = {};

  // --- Planning cadence + style + adherence ---
  const planWeekdayCount: Record<string, number> = {};
  const planHourCount: Record<number, number> = {};
  let planItemsTotal = 0;
  let planEvents = 0;
  let suggestedTotal = 0;
  let keptTotal = 0;
  const ratings: number[] = [];

  for (const e of events) {
    const p = e.payload ?? {};
    if (e.type === 'task_completed' || e.type === 'task_skipped') {
      const done = e.type === 'task_completed';
      const c = p.category ?? 'general';
      const rec = cat[c] ?? { done: 0, skipped: 0, rate: 0 };
      if (done) rec.done += 1;
      else rec.skipped += 1;
      cat[c] = rec;
      if (typeof p.hour === 'number') {
        const t = todAgg[timeOfDay(p.hour)];
        t.total += 1;
        if (done) t.done += 1;
      }
      if (p.weekday) {
        const w = wdAgg[p.weekday] ?? { done: 0, total: 0 };
        w.total += 1;
        if (done) w.done += 1;
        wdAgg[p.weekday] = w;
      }
    }

    if (PLANNING_EVENT_TYPES.has(e.type)) {
      if (p.weekday) planWeekdayCount[p.weekday] = (planWeekdayCount[p.weekday] ?? 0) + 1;
      if (typeof p.hour === 'number') planHourCount[p.hour] = (planHourCount[p.hour] ?? 0) + 1;
    }
    if (e.type === 'plan_accepted' || e.type === 'plan_edited' || e.type === 'plan_rejected') {
      if (typeof p.itemCount === 'number') {
        planItemsTotal += p.itemCount;
        planEvents += 1;
        suggestedTotal += p.itemCount;
        if (e.type === 'plan_accepted') keptTotal += p.keptCount ?? p.itemCount;
        else if (e.type === 'plan_edited') keptTotal += p.keptCount ?? 0;
        // plan_rejected keeps 0
      }
    }
    if (e.type === 'week_reviewed' || e.type === 'month_reviewed') {
      if (typeof p.rating === 'number') ratings.push(p.rating);
    }
  }

  // Finalise rates
  for (const c of Object.keys(cat)) {
    const r = cat[c]!;
    const total = r.done + r.skipped;
    r.rate = total ? clamp01(r.done / total) : 0;
  }
  (['morning', 'afternoon', 'evening'] as const).forEach((t) => {
    const a = todAgg[t];
    behavior.completionByTimeOfDay[t] = { rate: a.total ? clamp01(a.done / a.total) : 0, n: a.total };
  });
  for (const w of Object.keys(wdAgg)) {
    const a = wdAgg[w]!;
    behavior.followThroughByWeekday[w] = a.total ? clamp01(a.done / a.total) : 0;
  }
  behavior.avgReviewRating = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null;
  behavior.planAdherence = suggestedTotal ? clamp01(keptTotal / suggestedTotal) : null;

  // --- Preferences ---
  const preferences = emptyPreferences();

  // Planning days: weekdays with ≥25% share, else the single mode.
  const totalPlanDays = Object.values(planWeekdayCount).reduce((a, b) => a + b, 0);
  if (totalPlanDays > 0) {
    const strong = Object.entries(planWeekdayCount)
      .filter(([, n]) => n / totalPlanDays >= 0.25)
      .sort((a, b) => b[1] - a[1])
      .map(([d]) => d);
    preferences.planningDays = strong.length
      ? strong
      : [Object.entries(planWeekdayCount).sort((a, b) => b[1] - a[1])[0]![0]];
  }

  // Planning hour: the modal hour (tie → earliest).
  const hourEntries = Object.entries(planHourCount).map(([h, n]) => [Number(h), n] as const);
  if (hourEntries.length) {
    hourEntries.sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]));
    preferences.planningHour = hourEntries[0]![0];
  }

  // Preferred / avoid categories (with min sample).
  const catStats = Object.entries(cat).map(([c, r]) => ({ c, r: r.rate, n: r.done + r.skipped }));
  preferences.preferredCategories = catStats
    .filter((s) => s.n >= MIN_SAMPLE && s.r >= PREFER_RATE)
    .sort((a, b) => b.r - a.r)
    .map((s) => s.c);
  preferences.avoidCategories = catStats
    .filter((s) => s.n >= MIN_SAMPLE && s.r <= AVOID_RATE)
    .sort((a, b) => a.r - b.r)
    .map((s) => s.c);

  // Planning style from avg items per plan.
  if (planEvents > 0) {
    const avgItems = planItemsTotal / planEvents;
    preferences.weeklyPlanningStyle = avgItems < 2 ? 'light' : avgItems <= 4 ? 'balanced' : 'detailed';
  }

  // --- Identity ---
  const identity = {
    values: input.values ?? current.identity.values,
    goals: syncGoals(current.identity.goals, input.goals, events),
  };

  // --- Insights ---
  const candidates = buildInsights(behavior, preferences);
  const insights = mergeInsights(current.insights, candidates, nowIso);

  const next: LearnedProfile = {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    userId: current.userId,
    updatedAt: nowIso,
    identity,
    preferences,
    behavior,
    insights,
    overrides: current.overrides,
  };

  return applyOverrides(next);
}

// ── Identity goal sync ──────────────────────────────────────────────────────

function syncGoals(
  currentGoals: ProfileGoal[],
  snapshot: ProfileGoal[] | undefined,
  events: LearningEvent[],
): ProfileGoal[] {
  if (snapshot) {
    // Preserve `why` from prior profile where the goal id matches.
    const whyById = new Map(currentGoals.map((g) => [g.id, g.why]));
    return snapshot.map((g) => ({ ...g, why: g.why ?? whyById.get(g.id) }));
  }
  // Fall back to reconstructing from goal_set / goal_edited events (latest wins).
  const byId = new Map(currentGoals.map((g) => [g.id, g]));
  for (const e of events) {
    if ((e.type === 'goal_set' || e.type === 'goal_edited') && e.payload.goalId) {
      byId.set(e.payload.goalId, {
        id: e.payload.goalId,
        title: e.payload.goalTitle ?? byId.get(e.payload.goalId)?.title ?? '',
        category: e.payload.category ?? byId.get(e.payload.goalId)?.category ?? 'general',
        why: byId.get(e.payload.goalId)?.why,
      });
    }
    if (e.type === 'goal_completed' && e.payload.goalId) byId.delete(e.payload.goalId);
  }
  return Array.from(byId.values());
}

// ── Insight generation + merge ──────────────────────────────────────────────

/** Stable id per (kind,key) so re-derivation updates rather than duplicates. */
function insightId(kind: string, key: string): string {
  return `${kind}:${key}`;
}

export function buildInsights(
  behavior: ProfileBehavior,
  preferences: ProfilePreferences,
): LearnedInsight[] {
  const out: LearnedInsight[] = [];
  const now = ''; // filled by mergeInsights

  // Categories that work
  for (const c of preferences.preferredCategories.slice(0, 2)) {
    const r = behavior.completionByCategory[c];
    if (!r) continue;
    out.push({
      id: insightId('works', c),
      text: `You follow through on ${c} — ${pct(r.rate)}% completion.`,
      kind: 'works',
      confidence: r.rate,
      evidenceCount: r.done + r.skipped,
      updatedAt: now,
    });
  }

  // Categories that slip
  const avoid = preferences.avoidCategories[0];
  if (avoid) {
    const r = behavior.completionByCategory[avoid];
    if (r) {
      out.push({
        id: insightId('avoid', avoid),
        text: `${cap(avoid)} tasks tend to slip (${pct(r.rate)}% done). Plan fewer, or pair them with a quick win.`,
        kind: 'avoid',
        confidence: clamp01(1 - r.rate),
        evidenceCount: r.done + r.skipped,
        updatedAt: now,
      });
    }
  }

  // Best time of day
  const tods = (['morning', 'afternoon', 'evening'] as const)
    .map((t) => ({ t, ...behavior.completionByTimeOfDay[t] }))
    .filter((x) => x.n >= MIN_SAMPLE)
    .sort((a, b) => b.rate - a.rate);
  if (tods.length && tods[0]!.rate > 0) {
    const best = tods[0]!;
    out.push({
      id: insightId('pattern', 'timeofday'),
      text: `You get the most done in the ${best.t} — ${pct(best.rate)}% completion then.`,
      kind: 'pattern',
      confidence: best.rate,
      evidenceCount: best.n,
      updatedAt: now,
    });
  }

  // Planning cadence
  if (preferences.planningDays.length) {
    out.push({
      id: insightId('pattern', 'planday'),
      text: `You plan best on ${humanList(preferences.planningDays)}.`,
      kind: 'pattern',
      confidence: 0.6,
      evidenceCount: preferences.planningDays.length,
      updatedAt: now,
    });
  }

  // Review sentiment
  if (behavior.avgReviewRating != null) {
    if (behavior.avgReviewRating >= 4) {
      out.push({
        id: insightId('works', 'reviews'),
        text: `Your weeks are landing — you rate them ${behavior.avgReviewRating}/5 on average.`,
        kind: 'works',
        confidence: clamp01(behavior.avgReviewRating / 5),
        evidenceCount: 3,
        updatedAt: now,
      });
    } else if (behavior.avgReviewRating <= 2.5) {
      out.push({
        id: insightId('pattern', 'reviews'),
        text: `Recent weeks have felt heavy (avg ${behavior.avgReviewRating}/5). Lightening next week's load is fair.`,
        kind: 'pattern',
        confidence: clamp01(1 - behavior.avgReviewRating / 5),
        evidenceCount: 3,
        updatedAt: now,
      });
    }
  }

  return out;
}

/**
 * Merge freshly-derived candidates with the prior insight list: same id →
 * update in place (keeping the original `updatedAt` when the text is unchanged),
 * drop user-dismissed ones, rank by confidence × evidence, cap the list.
 */
export function mergeInsights(
  prior: LearnedInsight[],
  candidates: LearnedInsight[],
  nowIso: string,
): LearnedInsight[] {
  const priorById = new Map(prior.map((i) => [i.id, i]));
  const merged = candidates.map((c) => {
    const old = priorById.get(c.id);
    const unchanged = old && old.text === c.text;
    return { ...c, updatedAt: unchanged ? old!.updatedAt : nowIso };
  });
  return merged
    .sort((a, b) => b.confidence * Math.log(b.evidenceCount + 1) - a.confidence * Math.log(a.evidenceCount + 1))
    .slice(0, MAX_INSIGHTS);
}

// ── Overrides ───────────────────────────────────────────────────────────────

/** Reapply anything the user pinned so the learn step never overwrites intent. */
export function applyOverrides(profile: LearnedProfile): LearnedProfile {
  const o = profile.overrides;
  const next = structuredCloneSafe(profile);

  if (Array.isArray(o['identity.values'])) next.identity.values = strArr(o['identity.values']);
  if (Array.isArray(o['identity.goals'])) {
    next.identity.goals = (o['identity.goals'] as unknown[]).filter(isRecord).map((g) => ({
      id: typeof g.id === 'string' ? g.id : uid(),
      title: typeof g.title === 'string' ? g.title : '',
      category: typeof g.category === 'string' ? g.category : 'general',
      why: typeof g.why === 'string' ? g.why : undefined,
    }));
  }
  if (typeof o['preferences.planningHour'] === 'number') next.preferences.planningHour = o['preferences.planningHour'];
  if (Array.isArray(o['preferences.planningDays'])) next.preferences.planningDays = strArr(o['preferences.planningDays']);
  if (Array.isArray(o['preferences.preferredCategories']))
    next.preferences.preferredCategories = strArr(o['preferences.preferredCategories']);
  if (Array.isArray(o['preferences.avoidCategories']))
    next.preferences.avoidCategories = strArr(o['preferences.avoidCategories']);
  const style = o['preferences.weeklyPlanningStyle'];
  if (style === 'light' || style === 'balanced' || style === 'detailed') next.preferences.weeklyPlanningStyle = style;

  // Dismissed insights (array of ids the user hid).
  const dismissed = o['dismissedInsights'];
  if (Array.isArray(dismissed)) {
    const hide = new Set(strArr(dismissed));
    next.insights = next.insights.filter((i) => !hide.has(i.id));
  }

  return next;
}

// ── Misc ────────────────────────────────────────────────────────────────────

function cap(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

function humanList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Deep clone without depending on structuredClone availability in old runtimes. */
function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
