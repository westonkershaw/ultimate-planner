/**
 * goalEngine.ts
 *
 * Pure functions for the unified Goal model. Progress and pace are derived,
 * never stored. Also exports the legacy → unified migration and a
 * back-compat `getProgress` shim used by achievement checks during rollout.
 */

import type {
  Goal,
  HabitGoal,
  LegacyFinancialGoal,
  LegacyYearlyGoal,
  Milestone,
  NumericGoal,
  OutcomeGoal,
  Pace,
} from '@/types';

type LegacyGoal = LegacyYearlyGoal | LegacyFinancialGoal;

// ── Helpers ────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function pct(n: number): number {
  return clamp(n, 0, 100);
}

function isFiniteNumber(n: number): boolean {
  return Number.isFinite(n);
}

// ── progressFor ────────────────────────────────────────────────────────────

/**
 * Derive completion % (0–100) for a goal.
 *
 * - outcome: Σ(weight where done) / Σ(weight) × 100
 * - numeric: (current − start) / (target − start) × 100, clamped
 * - habit:   weeksMet / weeksTarget × 100, clamped
 */
export function progressFor(g: Goal): number {
  switch (g.kind) {
    case 'outcome':
      return progressOutcome(g);
    case 'numeric':
      return progressNumeric(g);
    case 'habit':
      return progressHabit(g);
  }
}

function progressOutcome(g: OutcomeGoal): number {
  const total = g.milestones.reduce((s, m) => s + (m.weight || 0), 0);
  if (total <= 0) return 0;
  const done = g.milestones.reduce((s, m) => s + (m.done ? m.weight || 0 : 0), 0);
  return pct((done / total) * 100);
}

function progressNumeric(g: NumericGoal): number {
  const { start, target } = g.numeric;
  const current = reconcileCurrent(g);
  const span = target - start;
  if (span === 0) return current === target ? 100 : 0;
  if (!isFiniteNumber(span)) return 0;
  return pct(((current - start) / span) * 100);
}

function progressHabit(g: HabitGoal): number {
  const { weeksTarget } = g.habit;
  if (weeksTarget <= 0) return 0;
  // Habit weeks-met is driven by external KI logs; without that data here we
  // approximate from the goal's own weeklyFocus history (action.done counts).
  // The Goals tab can pass a richer derivation later via `weeksMetOverride`.
  const weeksMet = g.weeklyFocus.filter((w) => w.done).length;
  return pct((weeksMet / weeksTarget) * 100);
}

/**
 * Resolve a numeric goal's current value, preferring stored `current` but
 * falling back to start + Σ(delta) if `current` is missing/corrupted.
 */
export function reconcileCurrent(g: NumericGoal): number {
  if (isFiniteNumber(g.numeric.current)) return g.numeric.current;
  const fromEntries = g.numeric.entries.reduce((s, e) => s + (e.delta || 0), 0);
  return g.numeric.start + fromEntries;
}

// ── paceFor ────────────────────────────────────────────────────────────────

/** Tolerance for "on-track" — within ±5% of expected progress. */
const PACE_TOLERANCE = 5;

/**
 * Compare actual progress vs expected progress given time elapsed against
 * the deadline. Returns `status: 'unknown'` if the goal has no deadline.
 *
 * @param now  Override "now" — useful for tests. Defaults to Date.now().
 */
export function paceFor(g: Goal, now: number = Date.now()): Pace {
  const actual = progressFor(g);
  if (!g.deadline) {
    return { expected: 0, actual, status: 'unknown' };
  }
  const createdMs = Date.parse(g.createdAt);
  const dueMs = Date.parse(g.deadline);
  if (!isFiniteNumber(createdMs) || !isFiniteNumber(dueMs) || dueMs <= createdMs) {
    return { expected: 100, actual, status: 'behind' };
  }
  const elapsed = clamp((now - createdMs) / (dueMs - createdMs), 0, 1);
  const expected = elapsed * 100;
  const diff = actual - expected;
  let status: Pace['status'];
  if (diff > PACE_TOLERANCE) status = 'ahead';
  else if (diff < -PACE_TOLERANCE) status = 'behind';
  else status = 'on-track';
  return { expected, actual, status };
}

// ── isComplete ─────────────────────────────────────────────────────────────

export function isComplete(g: Goal): boolean {
  return progressFor(g) >= 100;
}

// ── getProgress shim ───────────────────────────────────────────────────────

/**
 * Back-compat shim for achievement checks that previously read `g.progress`
 * directly. Accepts a new Goal or either legacy shape so callers in App.jsx
 * can switch one-by-one during the rollout window.
 *
 * - new Goal:              progressFor()
 * - LegacyYearlyGoal:      clamped g.progress
 * - LegacyFinancialGoal:   100 × saved / targetAmount
 */
export function getProgress(g: Goal | LegacyGoal): number {
  if ('kind' in g) return progressFor(g);
  if ('targetAmount' in g) {
    if (g.targetAmount <= 0) return 0;
    return pct((g.saved / g.targetAmount) * 100);
  }
  return pct(g.progress ?? 0);
}

// ── migrateGoals ───────────────────────────────────────────────────────────

let _migrationCounter = 0;
function migrationId(prefix: string): string {
  _migrationCounter += 1;
  return `${prefix}_${_migrationCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Convert legacy `yearlyGoals[]` + `financialGoals[]` into the unified
 * `goals[]` shape. Idempotent on already-migrated data.
 *
 * Mapping:
 *   yearlyGoals with steps  → outcome, steps → milestones (weight 1)
 *   yearlyGoals without steps but progress>0 → outcome with two synthetic
 *     milestones ("Existing progress" weight = progress, "Remaining" weight
 *     = 100 − progress, first one marked done) so the bar looks unchanged
 *   yearlyGoals with weekSteps string → one weeklyFocus entry for current Monday
 *   financialGoals → numeric (unit '$'); deposits → entries (deltas)
 *
 * Existing `goalId` references in tasks are preserved by keeping the
 * original `id` on each migrated goal.
 */
export function migrateGoals(
  yearly: LegacyYearlyGoal[] = [],
  financial: LegacyFinancialGoal[] = [],
  now: number = Date.now(),
): Goal[] {
  return [
    ...yearly.map((y) => migrateYearly(y, now)),
    ...financial.map((f) => migrateFinancial(f, now)),
  ];
}

function migrateYearly(y: LegacyYearlyGoal, now: number): OutcomeGoal {
  const createdAt = y.createdAt ?? new Date(now).toISOString();
  const milestones: Milestone[] = (y.steps ?? []).map((s) => ({
    id: s.id,
    title: s.text,
    weight: 1,
    done: !!s.done,
    doneAt: s.done ? now : undefined,
  }));

  // Preserve old progress bar when there are no steps to derive from.
  if (milestones.length === 0 && y.progress > 0) {
    const existing = Math.min(100, Math.max(0, y.progress));
    milestones.push({
      id: migrationId('m_seed_done'),
      title: 'Existing progress (migrated)',
      weight: existing,
      done: true,
      doneAt: now,
    });
    if (existing < 100) {
      milestones.push({
        id: migrationId('m_seed_todo'),
        title: 'Remaining',
        weight: 100 - existing,
        done: false,
      });
    }
  }

  const weeklyFocus = y.weekSteps && y.weekSteps.length > 0
    ? [{ weekOf: mondayISO(now), action: y.weekSteps, done: false }]
    : [];

  return {
    kind: 'outcome',
    id: y.id,
    title: y.title,
    description: y.description,
    category: y.category,
    deadline: y.target,
    createdAt,
    milestones,
    weeklyFocus,
  };
}

function migrateFinancial(f: LegacyFinancialGoal, now: number): NumericGoal {
  const deposits = f.deposits ?? [];
  const depositSum = deposits.reduce((s, d) => s + d.amount, 0);
  // `saved` is ground truth; back-fill the baseline so deltas reconcile.
  const start = Math.max(0, f.saved - depositSum);
  return {
    kind: 'numeric',
    id: f.id,
    title: f.name,
    description: f.notes,
    category: 'financial',
    deadline: f.deadline,
    createdAt: new Date(now).toISOString(),
    milestones: [],
    weeklyFocus: [],
    numeric: {
      unit: '$',
      start,
      current: f.saved,
      target: f.targetAmount,
      entries: deposits.map((d) => ({
        id: d.id,
        date: d.date,
        delta: d.amount,
        note: d.note,
      })),
    },
  };
}

/** ISO date (yyyy-mm-dd) of the Monday of the week containing `now`. */
function mondayISO(now: number): string {
  const d = new Date(now);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Mon=0, Sun=6
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  const iso = d.toISOString().slice(0, 10);
  return iso;
}
