/**
 * dashboard-engine.ts — PURE logic for the Home dashboard (Phase 2). Imports
 * only goals-types/goal-engine/time-policy so it stays testable under a plain
 * Node test runner, same discipline as goal-engine.ts. All day-boundary math
 * goes through time-policy (DEVICE-LOCAL, never UTC) — never roll a new
 * date-key here.
 */

import { progressForCadence, sumInWindow } from './goal-engine';
import { localDaysBetween, startOfLocalWeek } from './time-policy';
import type { Goal, LifeArea, ProgressEvent } from './goals-types';

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export interface TodayChip {
  state: 'done' | 'due' | 'behind';
  label: string;
  dueToday: number;
  windowCurrent: number;
  windowTarget: number;
}

/**
 * 0 = Monday ... 6 = Sunday for `today`'s local week, derived by composing
 * time-policy helpers (never raw `getDay()`).
 */
function isoWeekdayIndex(today: Date): number {
  return localDaysBetween(startOfLocalWeek(today), today);
}

/**
 * The Today chip for a single goal, summarizing how much is left in the
 * current cadence window. Concise labels mirror the PMG-style "1/3" pattern.
 */
export function todayChipFor(
  goal: Goal,
  events: readonly ProgressEvent[],
  today: Date
): TodayChip {
  const { current, target, windowStart, windowEnd } = progressForCadence(goal, events, today);

  if (goal.metricType === 'streak') {
    // `current` from progressForCadence is the streak length for streak goals;
    // whether *today* itself has a logged event is what the chip needs.
    const goalEvents = events.filter((e) => e.goalId === goal.id);
    const loggedToday = sumInWindow(goalEvents, windowStart, windowEnd) > 0;
    return loggedToday
      ? { state: 'done', label: 'Today 1/1', dueToday: 0, windowCurrent: current, windowTarget: target }
      : { state: 'due', label: 'Today 0/1', dueToday: 1, windowCurrent: current, windowTarget: target };
  }

  if (goal.cadence === 'daily') {
    const dueToday = Math.max(0, target - current);
    return dueToday === 0
      ? { state: 'done', label: `Today ${current}/${target}`, dueToday: 0, windowCurrent: current, windowTarget: target }
      : { state: 'due', label: `Today ${current}/${target}`, dueToday, windowCurrent: current, windowTarget: target };
  }

  if (goal.cadence === 'weekly') {
    if (current >= target) {
      return { state: 'done', label: `Week ${current}/${target}`, dueToday: 0, windowCurrent: current, windowTarget: target };
    }
    const dayIndex = isoWeekdayIndex(today); // 0=Mon..6=Sun
    const expectedByEndOfToday = Math.ceil((target * (dayIndex + 1)) / 7);
    if (current >= expectedByEndOfToday) {
      // On pace: nothing due yet today even though the week total isn't met.
      return { state: 'due', label: 'On pace', dueToday: 0, windowCurrent: current, windowTarget: target };
    }
    const dueToday = expectedByEndOfToday - current;
    return {
      state: 'behind',
      label: `${dueToday} due today`,
      dueToday,
      windowCurrent: current,
      windowTarget: target,
    };
  }

  // monthly: dueToday is not a meaningful "today" quantity, so it's always 0.
  const monthShort = MONTH_SHORT[today.getMonth()];
  const label = `${monthShort} ${current}/${target}`;
  return current >= target
    ? { state: 'done', label, dueToday: 0, windowCurrent: current, windowTarget: target }
    : { state: 'due', label, dueToday: 0, windowCurrent: current, windowTarget: target };
}

function isActive(goal: Goal): boolean {
  return goal.archivedAt === null;
}

/** Absolute local-day distance from `today` to `targetDate`, upcoming (>=0) ranks before past. */
function targetDateRankKey(targetDate: string, today: Date): { upcoming: boolean; distance: number } {
  const [y, m, d] = targetDate.split('-').map(Number);
  const target = new Date(y!, m! - 1, d!);
  const distance = localDaysBetween(today, target); // >=0 when target is today or later
  return { upcoming: distance >= 0, distance: Math.abs(distance) };
}

function compareByTargetDateThenCreated(a: Goal, b: Goal, today: Date): number {
  if (a.targetDate && b.targetDate) {
    const ra = targetDateRankKey(a.targetDate, today);
    const rb = targetDateRankKey(b.targetDate, today);
    if (ra.upcoming !== rb.upcoming) return ra.upcoming ? -1 : 1;
    if (ra.distance !== rb.distance) return ra.distance - rb.distance;
    return 0;
  }
  if (a.targetDate && !b.targetDate) return -1;
  if (!a.targetDate && b.targetDate) return 1;
  // neither has a target date: most recent createdAt first.
  return b.createdAt.localeCompare(a.createdAt);
}

/**
 * The single goal to feature on Home:
 *  1. The pinned goal (if several somehow are, the one pinned most recently).
 *  2. Else the nearest UPCOMING target date (today counts as upcoming);
 *     goals with a past target date rank after all upcoming ones, by distance.
 *  3. Else the most recently created goal.
 * Archived goals are never featured.
 */
export function featuredGoal(goals: readonly Goal[], today: Date = new Date()): Goal | null {
  const active = goals.filter(isActive);
  if (active.length === 0) return null;

  const pinned = active.filter((g) => g.pinnedAt !== null);
  if (pinned.length > 0) {
    return pinned.reduce((latest, g) => (g.pinnedAt! > latest.pinnedAt! ? g : latest));
  }

  const sorted = [...active].sort((a, b) => compareByTargetDateThenCreated(a, b, today));
  return sorted[0] ?? null;
}

/**
 * The goal to surface for a given life area in the area grid: same fallback
 * chain as featuredGoal, restricted to that area, EXCEPT a pinned goal only
 * wins if it belongs to this area (pinning elsewhere doesn't leak in).
 */
export function primaryGoalForArea(
  goals: readonly Goal[],
  area: LifeArea,
  today: Date = new Date()
): Goal | null {
  const active = goals.filter((g) => isActive(g) && g.lifeArea === area);
  if (active.length === 0) return null;

  const pinned = active.filter((g) => g.pinnedAt !== null);
  if (pinned.length > 0) {
    return pinned.reduce((latest, g) => (g.pinnedAt! > latest.pinnedAt! ? g : latest));
  }

  const sorted = [...active].sort((a, b) => compareByTargetDateThenCreated(a, b, today));
  return sorted[0] ?? null;
}

/** Whole local days since `dayKey`, or null when there is no last-logged day. */
export function lastLoggedDaysAgo(dayKey: string | null, today: Date): number | null {
  if (dayKey === null) return null;
  const [y, m, d] = dayKey.split('-').map(Number);
  const loggedDate = new Date(y!, m! - 1, d!);
  return localDaysBetween(loggedDate, today);
}

/**
 * Active goals ordered for the "progressing" list:
 *  1. Goals WITH a target date first, nearest upcoming before farther upcoming,
 *     then past target dates by distance (same rule as featuredGoal).
 *  2. Then goals WITHOUT a target date, by most-recent lastLogged day first;
 *     never-logged goals sort last within that group, tie-broken by
 *     most-recently-created first.
 */
export function progressingGoalsSort(
  goals: readonly Goal[],
  lastLoggedDayKeyByGoalId: ReadonlyMap<string, string | null>,
  today: Date = new Date()
): Goal[] {
  const active = goals.filter(isActive);
  const withDate = active.filter((g) => g.targetDate !== null);
  const withoutDate = active.filter((g) => g.targetDate === null);

  withDate.sort((a, b) => compareByTargetDateThenCreated(a, b, today));

  withoutDate.sort((a, b) => {
    const aKey = lastLoggedDayKeyByGoalId.get(a.id) ?? null;
    const bKey = lastLoggedDayKeyByGoalId.get(b.id) ?? null;
    if (aKey !== null && bKey !== null) {
      if (aKey !== bKey) return bKey.localeCompare(aKey); // most-recent day first
      return b.createdAt.localeCompare(a.createdAt);
    }
    if (aKey !== null && bKey === null) return -1; // logged beats never-logged
    if (aKey === null && bKey !== null) return 1;
    return b.createdAt.localeCompare(a.createdAt); // both never-logged
  });

  return [...withDate, ...withoutDate];
}
