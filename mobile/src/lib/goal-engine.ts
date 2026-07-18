/**
 * goal-engine.ts — PURE goal math. No supabase/react/react-native imports so
 * this can run under a plain Node test runner. All day-boundary math goes
 * through time-policy (DEVICE-LOCAL, never UTC) — never roll a new date-key here.
 */

import {
  addLocalDays,
  localDayKey,
  localMonthKey,
  localWeekKey,
  startOfLocalWeek,
} from './time-policy';
import type { Cadence, Goal, GoalStatus, ProgressEvent } from './goals-types';

/** Inclusive sum of event amounts with `occurredOn` in [fromDayKey, toDayKey]. */
export function sumInWindow(
  events: readonly ProgressEvent[],
  fromDayKey: string,
  toDayKey: string
): number {
  let total = 0;
  for (const event of events) {
    if (event.occurredOn >= fromDayKey && event.occurredOn <= toDayKey) {
      total += event.amount;
    }
  }
  return total;
}

export interface CadenceWindow {
  current: number;
  target: number;
  windowStart: string;
  windowEnd: string;
}

/** The [startDayKey, endDayKey] window for `cadence` containing `today`, local time. */
function windowForCadence(cadence: Cadence, today: Date): { start: string; end: string } {
  if (cadence === 'daily') {
    const key = localDayKey(today);
    return { start: key, end: key };
  }
  if (cadence === 'weekly') {
    const monday = startOfLocalWeek(today);
    const sunday = addLocalDays(monday, 6);
    return { start: localDayKey(monday), end: localDayKey(sunday) };
  }
  // monthly: local calendar month containing `today`.
  const monthKey = localMonthKey(today); // YYYY-MM
  const [y, m] = monthKey.split('-').map(Number);
  const firstOfMonth = new Date(y!, m! - 1, 1);
  const firstOfNextMonth = new Date(y!, m!, 1);
  const lastOfMonth = addLocalDays(firstOfNextMonth, -1);
  return { start: localDayKey(firstOfMonth), end: localDayKey(lastOfMonth) };
}

/** The window immediately preceding `windowForCadence`'s result (same cadence length). */
function previousWindowForCadence(cadence: Cadence, today: Date): { start: string; end: string } {
  if (cadence === 'daily') {
    const yesterday = addLocalDays(today, -1);
    const key = localDayKey(yesterday);
    return { start: key, end: key };
  }
  if (cadence === 'weekly') {
    const thisMonday = startOfLocalWeek(today);
    const prevMonday = addLocalDays(thisMonday, -7);
    const prevSunday = addLocalDays(thisMonday, -1);
    return { start: localDayKey(prevMonday), end: localDayKey(prevSunday) };
  }
  // monthly: the previous calendar month.
  const monthKey = localMonthKey(today);
  const [y, m] = monthKey.split('-').map(Number);
  const firstOfMonth = new Date(y!, m! - 1, 1);
  const lastOfPrevMonth = addLocalDays(firstOfMonth, -1);
  const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1);
  return { start: localDayKey(firstOfPrevMonth), end: localDayKey(lastOfPrevMonth) };
}

/**
 * Progress within the goal's cadence window containing `today`.
 * For metric_type 'streak', `current` is the running streak (see currentStreak)
 * rather than a window sum — the window fields still describe the cadence
 * window for display purposes.
 */
export function progressForCadence(
  goal: Goal,
  events: readonly ProgressEvent[],
  today: Date
): CadenceWindow {
  const goalEvents = events.filter((e) => e.goalId === goal.id);
  const { start, end } = windowForCadence(goal.cadence, today);
  const current =
    goal.metricType === 'streak'
      ? currentStreak(goalEvents, today)
      : sumInWindow(goalEvents, start, end);
  return { current, target: goal.targetValue, windowStart: start, windowEnd: end };
}

/**
 * Consecutive local days with a logged event, ending at `today`.
 *
 * A day only "breaks" the streak once it's fully over: if `today` has no
 * event yet, we count back starting from yesterday instead of zeroing out
 * (opts.graceToday, default true) — the user still has until local midnight
 * to log today and keep the streak alive. Multiple events on the same local
 * day count once.
 */
export function currentStreak(
  events: readonly ProgressEvent[],
  today: Date,
  opts?: { graceToday?: boolean }
): number {
  const graceToday = opts?.graceToday ?? true;
  const daysWithEvents = new Set<string>();
  for (const event of events) {
    daysWithEvents.add(event.occurredOn);
  }

  let cursor = today;
  if (!daysWithEvents.has(localDayKey(today))) {
    if (!graceToday) {
      return 0;
    }
    cursor = addLocalDays(today, -1);
    if (!daysWithEvents.has(localDayKey(cursor))) {
      return 0;
    }
  }

  let streak = 0;
  while (daysWithEvents.has(localDayKey(cursor))) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }
  return streak;
}

/** Lifetime sum of all event amounts, regardless of window. */
export function totalProgress(events: readonly ProgressEvent[]): number {
  let total = 0;
  for (const event of events) {
    total += event.amount;
  }
  return total;
}

/**
 * A goal is 'progressing' if it has at least one logged event in the current
 * cadence window OR the immediately-previous one (e.g. a weekly goal logged
 * last week but not yet this week still reads as progressing) — this avoids
 * flipping a goal to "needs attention" the instant a new window opens.
 * Otherwise 'needs_attention'.
 */
export function deriveStatus(
  goal: Goal,
  events: readonly ProgressEvent[],
  today: Date
): GoalStatus {
  const goalEvents = events.filter((e) => e.goalId === goal.id);
  const current = windowForCadence(goal.cadence, today);
  const previous = previousWindowForCadence(goal.cadence, today);
  const hasCurrent = goalEvents.some(
    (e) => e.occurredOn >= current.start && e.occurredOn <= current.end
  );
  if (hasCurrent) {
    return 'progressing';
  }
  const hasPrevious = goalEvents.some(
    (e) => e.occurredOn >= previous.start && e.occurredOn <= previous.end
  );
  return hasPrevious ? 'progressing' : 'needs_attention';
}
