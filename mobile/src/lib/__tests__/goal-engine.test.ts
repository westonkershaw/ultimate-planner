/**
 * goal-engine.test.ts — pure-logic coverage for the goals engine.
 *
 * Deterministic by construction: every "today" is a fixed `new Date(y, m, d, h)`
 * local-time literal (never wall-clock `new Date()`), and every fixture event's
 * `occurredOn` day-key is derived via `localDayKey(addLocalDays(...))` rather than
 * hand-written YYYY-MM-DD strings, so expectations hold under any host timezone —
 * including the "late evening west of UTC" trap where a naive UTC day-key would
 * silently roll to the wrong calendar day.
 */
import { describe, expect, it } from 'vitest';
import {
  currentStreak,
  deriveStatus,
  progressForCadence,
  sumInWindow,
  totalProgress,
} from '../goal-engine';
import { addLocalDays, localDayKey, startOfLocalWeek } from '../time-policy';
import type { Cadence, Goal, MetricType, ProgressEvent } from '../goals-types';

// ---- fixture helpers -------------------------------------------------

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    userId: 'user-1',
    title: 'Test goal',
    lifeArea: 'physical',
    metricType: 'count' as MetricType,
    targetValue: 10,
    unit: null,
    cadence: 'daily' as Cadence,
    targetDate: null,
    archivedAt: null,
    pinnedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

let eventSeq = 0;
function makeEvent(occurredOn: string, overrides: Partial<ProgressEvent> = {}): ProgressEvent {
  eventSeq += 1;
  return {
    id: `event-${eventSeq}`,
    goalId: 'goal-1',
    userId: 'user-1',
    amount: 1,
    occurredOn,
    occurredAt: `${occurredOn}T12:00:00.000Z`,
    note: null,
    createdAt: `${occurredOn}T12:00:00.000Z`,
    ...overrides,
  };
}

/** Day key `offset` local days from `today` (0 = today, -1 = yesterday, ...). */
function dayKeyOffset(today: Date, offset: number): string {
  return localDayKey(addLocalDays(today, offset));
}

// ---- currentStreak -----------------------------------------------------

describe('currentStreak', () => {
  it('counts consecutive local days ending today', () => {
    const today = new Date(2026, 6, 15, 10); // Wed Jul 15 2026, 10am local
    const events = [
      makeEvent(dayKeyOffset(today, 0)),
      makeEvent(dayKeyOffset(today, -1)),
      makeEvent(dayKeyOffset(today, -2)),
    ];
    expect(currentStreak(events, today)).toBe(3);
  });

  it('grants grace and counts back from yesterday when today has no event yet (default graceToday)', () => {
    const today = new Date(2026, 6, 15, 8); // morning, hasn't logged today
    const events = [makeEvent(dayKeyOffset(today, -1)), makeEvent(dayKeyOffset(today, -2))];
    expect(currentStreak(events, today)).toBe(2);
  });

  it('zeroes out an empty today when graceToday is false', () => {
    const today = new Date(2026, 6, 15, 8);
    const events = [makeEvent(dayKeyOffset(today, -1)), makeEvent(dayKeyOffset(today, -2))];
    expect(currentStreak(events, today, { graceToday: false })).toBe(0);
  });

  it('breaks the streak across a 2-day gap', () => {
    const today = new Date(2026, 6, 15, 10);
    const events = [
      makeEvent(dayKeyOffset(today, 0)),
      // gap at -1 and -2
      makeEvent(dayKeyOffset(today, -3)),
      makeEvent(dayKeyOffset(today, -4)),
    ];
    expect(currentStreak(events, today)).toBe(1);
  });

  it('counts a same-day duplicate event only once', () => {
    const today = new Date(2026, 6, 15, 10);
    const events = [
      makeEvent(dayKeyOffset(today, 0)),
      makeEvent(dayKeyOffset(today, 0)), // duplicate same local day
      makeEvent(dayKeyOffset(today, -1)),
    ];
    expect(currentStreak(events, today)).toBe(2);
  });

  it('carries a streak across a month boundary', () => {
    // Jan 31 2026 is a Saturday; today = Feb 2 2026 (Monday).
    const today = new Date(2026, 1, 2, 9);
    const events = [
      makeEvent(dayKeyOffset(today, 0)), // Feb 2
      makeEvent(dayKeyOffset(today, -1)), // Feb 1
      makeEvent(dayKeyOffset(today, -2)), // Jan 31
      makeEvent(dayKeyOffset(today, -3)), // Jan 30
    ];
    expect(currentStreak(events, today)).toBe(4);
  });

  it('carries a streak across the US spring-forward DST transition (Mar 8 2026)', () => {
    // Sun Mar 8 2026 is when America/* clocks spring forward at 2am local.
    // today = Mon Mar 9 2026; streak spans Fri Mar 6 -> Mon Mar 9.
    const today = new Date(2026, 2, 9, 9);
    const events = [
      makeEvent(dayKeyOffset(today, 0)), // Mon Mar 9
      makeEvent(dayKeyOffset(today, -1)), // Sun Mar 8 (DST day)
      makeEvent(dayKeyOffset(today, -2)), // Sat Mar 7
      makeEvent(dayKeyOffset(today, -3)), // Fri Mar 6
    ];
    expect(currentStreak(events, today)).toBe(4);
    // Sanity: the DST day's key really is Mar 8 regardless of host TZ DST rules.
    expect(dayKeyOffset(today, -1)).toBe('2026-03-08');
  });
});

// ---- progressForCadence -------------------------------------------------

describe('progressForCadence', () => {
  it('daily window is today only; an event from yesterday is excluded', () => {
    const today = new Date(2026, 6, 15, 14);
    const goal = makeGoal({ cadence: 'daily', metricType: 'count', targetValue: 5 });
    const events = [
      makeEvent(dayKeyOffset(today, 0), { amount: 3 }),
      makeEvent(dayKeyOffset(today, -1), { amount: 100 }),
    ];
    const result = progressForCadence(goal, events, today);
    expect(result.current).toBe(3);
    expect(result.windowStart).toBe(dayKeyOffset(today, 0));
    expect(result.windowEnd).toBe(dayKeyOffset(today, 0));
  });

  it('weekly window runs Monday-Sunday local; a Sunday event belongs to the week of its Monday', () => {
    // today = the Sunday of some week.
    const monday = new Date(2026, 6, 13, 9); // Mon Jul 13 2026
    const sunday = addLocalDays(monday, 6);
    const goal = makeGoal({ cadence: 'weekly', metricType: 'count', targetValue: 5 });
    const events = [makeEvent(localDayKey(sunday), { amount: 7 })];
    const result = progressForCadence(goal, events, sunday);
    expect(result.windowStart).toBe(localDayKey(monday));
    expect(result.windowEnd).toBe(localDayKey(sunday));
    expect(result.current).toBe(7);
  });

  it('weekly window excludes a Monday event from the previous week', () => {
    const thisMonday = new Date(2026, 6, 13, 9);
    const prevMonday = addLocalDays(thisMonday, -7);
    const goal = makeGoal({ cadence: 'weekly', metricType: 'count', targetValue: 5 });
    const events = [makeEvent(localDayKey(prevMonday), { amount: 9 })];
    const result = progressForCadence(goal, events, thisMonday);
    expect(result.current).toBe(0);
    expect(result.windowStart).toBe(localDayKey(thisMonday));
  });

  it('monthly window is the calendar month, inclusive of the last day and excluding the first day of the next month', () => {
    const today = new Date(2026, 1, 15, 9); // Feb 15 2026 (Feb has 28 days in 2026)
    const goal = makeGoal({ cadence: 'monthly', metricType: 'count', targetValue: 20 });
    const lastDayOfFeb = '2026-02-28';
    const firstDayOfMar = '2026-03-01';
    const events = [
      makeEvent(lastDayOfFeb, { amount: 4 }),
      makeEvent(firstDayOfMar, { amount: 999 }), // must be excluded
    ];
    const result = progressForCadence(goal, events, today);
    expect(result.windowStart).toBe('2026-02-01');
    expect(result.windowEnd).toBe(lastDayOfFeb);
    expect(result.current).toBe(4);
  });

  it('monthly window excludes the last day of the previous month', () => {
    const today = new Date(2026, 1, 15, 9); // Feb 15 2026
    const goal = makeGoal({ cadence: 'monthly', metricType: 'count', targetValue: 20 });
    const events = [makeEvent('2026-01-31', { amount: 42 })];
    const result = progressForCadence(goal, events, today);
    expect(result.current).toBe(0);
  });

  it('reports current streak (not a window sum) for a streak-metric goal, while window fields still describe the cadence window', () => {
    const today = new Date(2026, 6, 15, 10);
    const goal = makeGoal({ cadence: 'daily', metricType: 'streak', targetValue: 30 });
    const events = [
      makeEvent(dayKeyOffset(today, 0)),
      makeEvent(dayKeyOffset(today, -1)),
      makeEvent(dayKeyOffset(today, -2)),
    ];
    const result = progressForCadence(goal, events, today);
    expect(result.current).toBe(3); // streak length, not a sum of amounts
    expect(result.windowStart).toBe(dayKeyOffset(today, 0));
    expect(result.windowEnd).toBe(dayKeyOffset(today, 0));
  });
});

// ---- sumInWindow -------------------------------------------------

describe('sumInWindow', () => {
  it('sums only events with occurredOn inclusively between the two bounds', () => {
    const events = [
      makeEvent('2026-05-09', { amount: 1 }),
      makeEvent('2026-05-10', { amount: 2 }), // lower bound, included
      makeEvent('2026-05-12', { amount: 4 }),
      makeEvent('2026-05-15', { amount: 8 }), // upper bound, included
      makeEvent('2026-05-16', { amount: 16 }),
    ];
    expect(sumInWindow(events, '2026-05-10', '2026-05-15')).toBe(2 + 4 + 8);
  });

  it('excludes events outside the window on both sides', () => {
    const events = [makeEvent('2026-05-01', { amount: 100 }), makeEvent('2026-06-01', { amount: 200 })];
    expect(sumInWindow(events, '2026-05-10', '2026-05-15')).toBe(0);
  });

  it('sums signed amounts, allowing negative adjustments to net against positives', () => {
    const events = [
      makeEvent('2026-05-10', { amount: 50 }),
      makeEvent('2026-05-11', { amount: -20 }),
    ];
    expect(sumInWindow(events, '2026-05-10', '2026-05-15')).toBe(30);
  });
});

// ---- deriveStatus -------------------------------------------------

describe('deriveStatus', () => {
  it('is progressing when there is an event in the current daily window', () => {
    const today = new Date(2026, 6, 15, 10);
    const goal = makeGoal({ cadence: 'daily' });
    const events = [makeEvent(dayKeyOffset(today, 0))];
    expect(deriveStatus(goal, events, today)).toBe('progressing');
  });

  it('is progressing when only the previous daily window has an event', () => {
    const today = new Date(2026, 6, 15, 10);
    const goal = makeGoal({ cadence: 'daily' });
    const events = [makeEvent(dayKeyOffset(today, -1))];
    expect(deriveStatus(goal, events, today)).toBe('progressing');
  });

  it('needs_attention when the only event is two daily windows ago', () => {
    const today = new Date(2026, 6, 15, 10);
    const goal = makeGoal({ cadence: 'daily' });
    const events = [makeEvent(dayKeyOffset(today, -2))];
    expect(deriveStatus(goal, events, today)).toBe('needs_attention');
  });

  it('needs_attention when there are no events at all', () => {
    const today = new Date(2026, 6, 15, 10);
    const goal = makeGoal({ cadence: 'weekly' });
    expect(deriveStatus(goal, [], today)).toBe('needs_attention');
  });

  it('monthly: is progressing when only the previous calendar month has an event', () => {
    const today = new Date(2026, 2, 5, 10); // Mar 5 2026
    const goal = makeGoal({ cadence: 'monthly' });
    const events = [makeEvent('2026-02-20')]; // February, the previous month
    expect(deriveStatus(goal, events, today)).toBe('progressing');
  });

  it('monthly: needs_attention when the only event is two calendar months ago, regardless of day-count differences', () => {
    // today = Mar 2026 (31-day month); "two months ago" = Jan 2026 (31 days),
    // skipping Feb (28 days) in between — exercises that the boundary is
    // calendar-month based, not a fixed day-count window.
    const today = new Date(2026, 2, 5, 10); // Mar 5 2026
    const goal = makeGoal({ cadence: 'monthly' });
    const events = [makeEvent('2026-01-15')]; // January, two months back
    expect(deriveStatus(goal, events, today)).toBe('needs_attention');
  });
});

// ---- totalProgress -------------------------------------------------

describe('totalProgress', () => {
  it('sums signed amounts across all events regardless of window', () => {
    const events = [
      makeEvent('2020-01-01', { amount: 100 }),
      makeEvent('2026-07-15', { amount: -30 }),
      makeEvent('2026-07-16', { amount: 5 }),
    ];
    expect(totalProgress(events)).toBe(75);
  });

  it('returns 0 for no events', () => {
    expect(totalProgress([])).toBe(0);
  });
});

// ---- time-policy sanity used implicitly above -------------------------------------------------

describe('time-policy helpers used by the engine', () => {
  it('startOfLocalWeek always returns a Monday', () => {
    const someSunday = new Date(2026, 6, 19, 23, 45); // late evening, still local Sunday
    const monday = startOfLocalWeek(someSunday);
    expect(monday.getDay()).toBe(1);
  });

  it('localDayKey does not roll to the next UTC day for a late local evening (west-of-UTC trap)', () => {
    // 11:45pm local — a naive `toISOString().slice(0,10)` would roll this to
    // the next calendar day for any timezone west of UTC. localDayKey must not.
    const lateEvening = new Date(2026, 6, 15, 23, 45);
    expect(localDayKey(lateEvening)).toBe('2026-07-15');
  });
});
