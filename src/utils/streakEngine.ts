/**
 * streakEngine.ts
 *
 * A FORGIVING planning-consistency streak. Unlike habit streaks (which break on
 * the first miss), this one is designed never to punish a slip:
 *  - Grace: the current period is "at risk", not broken, until it closes.
 *  - Freezes: earned tokens auto-cover a missed period so the run survives.
 *  - Recovery: a broken run is always one plan away from restarting.
 *
 * Pure + deterministic. Works for weekly ('week') and monthly ('month') cadence.
 */

export type PeriodType = 'week' | 'month';

/** A fixed Monday used as the week epoch (2020-01-06 was a Monday, UTC). */
const WEEK_EPOCH = Date.UTC(2020, 0, 6);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Integer index of the period containing `date` (monotonic, gap = missed period). */
export function periodIndex(date: Date, type: PeriodType): number {
  if (type === 'month') return date.getFullYear() * 12 + date.getMonth();
  // Normalise to the local Monday, then count whole weeks since the epoch.
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - WEEK_EPOCH) / WEEK_MS);
}

export type StreakStatus = 'active' | 'at_risk' | 'broken' | 'new';

export interface StreakResult {
  /** Completed periods in the current run (includes current period if done). */
  current: number;
  /** Best run ever (plain consecutive, no freeze inflation — honest). */
  longest: number;
  freezesUsed: number;
  freezesRemaining: number;
  status: StreakStatus;
  /** True when planning now (or spending a freeze) would keep/extend the run. */
  recoverable: boolean;
  /** True when the current period is already secured. */
  currentPeriodDone: boolean;
}

export interface StreakInput {
  /** Period indices the user completed a plan in (any order). */
  completedPeriods: number[];
  /** The period "now" falls in. */
  currentPeriod: number;
  /** Freeze tokens available to auto-cover misses. */
  freezesAvailable: number;
}

/** Longest plain consecutive run in a set of period indices. */
function longestRun(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1]! + 1) run += 1;
    else if (sorted[i] !== sorted[i - 1]) run = 1;
    best = Math.max(best, run);
  }
  return best;
}

/**
 * Compute the forgiving streak. Freezes are consumed to bridge single missed
 * periods while walking backwards from the current period.
 */
export function computeStreak(input: StreakInput): StreakResult {
  const set = new Set(input.completedPeriods);
  const sorted = Array.from(set).sort((a, b) => a - b);
  const longest = longestRun(sorted);
  const hasHistory = sorted.length > 0;

  const currentPeriodDone = set.has(input.currentPeriod);
  let freezesRemaining = input.freezesAvailable;
  let freezesUsed = 0;
  let count = 0;

  // Start at the current period; if it isn't done yet it's "pending" (grace),
  // not a break — begin the backward walk from the previous period. The walk
  // can't extend below the earliest completed period, so no freezes are wasted
  // when there's no history.
  const floor = sorted[0] ?? input.currentPeriod;
  let p = currentPeriodDone ? input.currentPeriod : input.currentPeriod - 1;

  while (p >= floor) {
    if (set.has(p)) {
      count += 1;
      p -= 1;
    } else if (freezesRemaining > 0) {
      // Bridge a single missed period with a freeze and keep the run alive.
      freezesRemaining -= 1;
      freezesUsed += 1;
      p -= 1;
    } else {
      break;
    }
  }

  let status: StreakStatus;
  if (currentPeriodDone) status = 'active';
  else if (count > 0) status = 'at_risk';
  else status = hasHistory ? 'broken' : 'new';

  return {
    current: count,
    longest: Math.max(longest, count),
    freezesUsed,
    freezesRemaining,
    status,
    recoverable: !currentPeriodDone,
    currentPeriodDone,
  };
}

/** Freeze tokens earned from a total number of completed periods (1 per 4). */
export function earnedFreezes(totalCompleted: number): number {
  return Math.floor(totalCompleted / 4);
}

/** Warm, non-shaming status line for the UI. */
export function streakMessage(result: StreakResult, type: PeriodType): string {
  const unit = type === 'week' ? 'week' : 'month';
  switch (result.status) {
    case 'active':
      return result.current > 1
        ? `${result.current} ${unit}s planned in a row — nice momentum.`
        : `You're on the board — first ${unit} planned.`;
    case 'at_risk':
      return `Your ${result.current}-${unit} streak is safe — plan this ${unit} to keep it going.`;
    case 'broken':
      return `Fresh start — plan this ${unit} and you're rolling again.`;
    case 'new':
    default:
      return `Plan this ${unit} to start your streak.`;
  }
}
