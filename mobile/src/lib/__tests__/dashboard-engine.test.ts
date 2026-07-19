/**
 * dashboard-engine.test.ts — pure-logic coverage for the Home dashboard engine.
 * Same determinism discipline as goal-engine.test.ts: fixed local-time `today`
 * literals, day keys derived via time-policy helpers rather than hand-written
 * strings where the test cares about "today" being dynamic.
 */
import { describe, expect, it } from 'vitest';
import {
  featuredGoal,
  lastLoggedDaysAgo,
  primaryGoalForArea,
  progressingGoalsSort,
  todayChipFor,
} from '../dashboard-engine';
import { addLocalDays, localDayKey, startOfLocalWeek } from '../time-policy';
import type { Cadence, Goal, LifeArea, MetricType, ProgressEvent } from '../goals-types';

// ---- fixture helpers -------------------------------------------------

let goalSeq = 0;
function makeGoal(overrides: Partial<Goal> = {}): Goal {
  goalSeq += 1;
  return {
    id: `goal-${goalSeq}`,
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
function makeEvent(
  goalId: string,
  occurredOn: string,
  overrides: Partial<ProgressEvent> = {}
): ProgressEvent {
  eventSeq += 1;
  return {
    id: `event-${eventSeq}`,
    goalId,
    userId: 'user-1',
    amount: 1,
    occurredOn,
    occurredAt: `${occurredOn}T12:00:00.000Z`,
    note: null,
    createdAt: `${occurredOn}T12:00:00.000Z`,
    ...overrides,
  };
}

function dayKeyOffset(today: Date, offset: number): string {
  return localDayKey(addLocalDays(today, offset));
}

// ---- todayChipFor: daily -------------------------------------------------

describe('todayChipFor: daily cadence', () => {
  it('is done with dueToday 0 once the daily target is met', () => {
    const today = new Date(2026, 6, 15, 10);
    const goal = makeGoal({ cadence: 'daily', metricType: 'count', targetValue: 3 });
    const events = [makeEvent(goal.id, dayKeyOffset(today, 0), { amount: 3 })];
    const chip = todayChipFor(goal, events, today);
    expect(chip.state).toBe('done');
    expect(chip.dueToday).toBe(0);
    expect(chip.label).toBe('Today 3/3');
  });

  it('is due with the remaining amount when short of the daily target', () => {
    const today = new Date(2026, 6, 15, 10);
    const goal = makeGoal({ cadence: 'daily', metricType: 'count', targetValue: 3 });
    const events = [makeEvent(goal.id, dayKeyOffset(today, 0), { amount: 1 })];
    const chip = todayChipFor(goal, events, today);
    expect(chip.state).toBe('due');
    expect(chip.dueToday).toBe(2);
    expect(chip.label).toBe('Today 1/3');
  });

  it('never reports negative dueToday when overshooting the target', () => {
    const today = new Date(2026, 6, 15, 10);
    const goal = makeGoal({ cadence: 'daily', metricType: 'count', targetValue: 3 });
    const events = [makeEvent(goal.id, dayKeyOffset(today, 0), { amount: 9 })];
    const chip = todayChipFor(goal, events, today);
    expect(chip.state).toBe('done');
    expect(chip.dueToday).toBe(0);
  });

  it('excludes an event logged yesterday from the daily window (due = full target)', () => {
    const today = new Date(2026, 6, 15, 10);
    const goal = makeGoal({ cadence: 'daily', metricType: 'count', targetValue: 3 });
    const events = [makeEvent(goal.id, dayKeyOffset(today, -1), { amount: 3 })];
    const chip = todayChipFor(goal, events, today);
    expect(chip.state).toBe('due');
    expect(chip.dueToday).toBe(3);
    expect(chip.label).toBe('Today 0/3');
  });

  it('with zero events, due equals the full target', () => {
    const today = new Date(2026, 6, 15, 10);
    const goal = makeGoal({ cadence: 'daily', metricType: 'count', targetValue: 4 });
    const chip = todayChipFor(goal, [], today);
    expect(chip.state).toBe('due');
    expect(chip.dueToday).toBe(4);
    expect(chip.label).toBe('Today 0/4');
  });
});

// ---- todayChipFor: weekly -------------------------------------------------

describe('todayChipFor: weekly cadence', () => {
  it('is done once the weekly target is already met', () => {
    const monday = new Date(2026, 6, 13, 9); // Mon Jul 13 2026
    const goal = makeGoal({ cadence: 'weekly', metricType: 'count', targetValue: 5 });
    const events = [makeEvent(goal.id, localDayKey(monday), { amount: 5 })];
    const chip = todayChipFor(goal, events, monday);
    expect(chip.state).toBe('done');
    expect(chip.dueToday).toBe(0);
  });

  it('is on pace (state due, dueToday 0) when current meets the linear expectation for today', () => {
    // Monday = day index 0 -> expected = ceil(target * 1 / 7).
    const monday = new Date(2026, 6, 13, 9);
    const goal = makeGoal({ cadence: 'weekly', metricType: 'count', targetValue: 7 });
    // expected = ceil(7*1/7) = 1
    const events = [makeEvent(goal.id, localDayKey(monday), { amount: 1 })];
    const chip = todayChipFor(goal, events, monday);
    expect(chip.state).toBe('due');
    expect(chip.dueToday).toBe(0);
    expect(chip.label).toBe('On pace');
  });

  it('is behind with the pace shortfall when under the linear expectation for today', () => {
    // Wednesday = day index 2 -> expected = ceil(target * 3 / 7).
    const monday = new Date(2026, 6, 13, 9);
    const wednesday = addLocalDays(monday, 2);
    const goal = makeGoal({ cadence: 'weekly', metricType: 'count', targetValue: 7 });
    // expected = ceil(7*3/7) = 3; current = 0 -> dueToday = 3
    const chip = todayChipFor(goal, [], wednesday);
    expect(chip.state).toBe('behind');
    expect(chip.dueToday).toBe(3);
    expect(chip.label).toBe('3 due today');
  });

  it('treats Sunday as the last day of the local week (index 6, not raw getDay 0)', () => {
    const monday = new Date(2026, 6, 13, 9);
    const sunday = addLocalDays(monday, 6);
    const goal = makeGoal({ cadence: 'weekly', metricType: 'count', targetValue: 7 });
    // expected by end of Sunday = ceil(7*7/7) = 7 = full target.
    const events = [makeEvent(goal.id, localDayKey(sunday), { amount: 6 })];
    const chip = todayChipFor(goal, events, sunday);
    expect(chip.state).toBe('behind');
    expect(chip.dueToday).toBe(1);
  });

  it('on Monday (day index 0) with zero events, dueToday is ceil(target/7)', () => {
    const monday = new Date(2026, 6, 13, 9); // Mon Jul 13 2026
    const goal = makeGoal({ cadence: 'weekly', metricType: 'count', targetValue: 10 });
    // expected = ceil(10*1/7) = 2
    const chip = todayChipFor(goal, [], monday);
    expect(chip.state).toBe('behind');
    expect(chip.dueToday).toBe(2);
    expect(chip.label).toBe('2 due today');
  });

  it('reads as done once the weekly target is completed early in the week, ahead of pace', () => {
    // Tuesday (day index 1) with the full target already logged.
    const monday = new Date(2026, 6, 13, 9);
    const tuesday = addLocalDays(monday, 1);
    const goal = makeGoal({ cadence: 'weekly', metricType: 'count', targetValue: 5 });
    const events = [makeEvent(goal.id, localDayKey(tuesday), { amount: 5 })];
    const chip = todayChipFor(goal, events, tuesday);
    expect(chip.state).toBe('done');
    expect(chip.dueToday).toBe(0);
    expect(chip.label).toBe('Week 5/5');
  });

  it('a Sunday-logged event counts toward that Sunday\'s own week, not the following Monday\'s window', () => {
    const monday = new Date(2026, 6, 13, 9);
    const sunday = addLocalDays(monday, 6);
    const nextMonday = addLocalDays(monday, 7);
    const goal = makeGoal({ cadence: 'weekly', metricType: 'count', targetValue: 7 });
    const events = [makeEvent(goal.id, localDayKey(sunday), { amount: 7 })];
    // Viewed from the Sunday itself: the event completes that week.
    const sundayChip = todayChipFor(goal, events, sunday);
    expect(sundayChip.state).toBe('done');
    // Viewed from the following Monday: a fresh window, event doesn't carry over.
    const nextMondayChip = todayChipFor(goal, events, nextMonday);
    expect(nextMondayChip.state).not.toBe('done');
    expect(nextMondayChip.windowCurrent).toBe(0);
  });
});

// ---- todayChipFor: monthly -------------------------------------------------

describe('todayChipFor: monthly cadence', () => {
  it('is due with dueToday 0 and a "Mon current/target" label when short of the monthly target', () => {
    const today = new Date(2026, 6, 15, 10); // Jul 15 2026
    const goal = makeGoal({ cadence: 'monthly', metricType: 'count', targetValue: 10 });
    const events = [makeEvent(goal.id, localDayKey(today), { amount: 4 })];
    const chip = todayChipFor(goal, events, today);
    expect(chip.state).toBe('due');
    expect(chip.dueToday).toBe(0);
    expect(chip.label).toBe('Jul 4/10');
  });

  it('is done once the monthly target is met', () => {
    const today = new Date(2026, 6, 15, 10);
    const goal = makeGoal({ cadence: 'monthly', metricType: 'count', targetValue: 10 });
    const events = [makeEvent(goal.id, localDayKey(today), { amount: 10 })];
    const chip = todayChipFor(goal, events, today);
    expect(chip.state).toBe('done');
    expect(chip.dueToday).toBe(0);
  });

  it('an event on the first day of the month counts toward that month, not the previous one', () => {
    const firstOfMonth = new Date(2026, 6, 1, 9); // Jul 1 2026
    const goal = makeGoal({ cadence: 'monthly', metricType: 'count', targetValue: 5 });
    const events = [
      makeEvent(goal.id, localDayKey(firstOfMonth), { amount: 5 }),
      makeEvent(goal.id, '2026-06-30', { amount: 999 }), // last day of prior month, excluded
    ];
    const chip = todayChipFor(goal, events, firstOfMonth);
    expect(chip.state).toBe('done');
    expect(chip.label).toBe('Jul 5/5');
  });

  it('an event on the last day of the month still counts toward that month, not the next one', () => {
    // Feb 2026 is not a leap year: last day is Feb 28.
    const lastOfMonth = new Date(2026, 1, 28, 9);
    const goal = makeGoal({ cadence: 'monthly', metricType: 'count', targetValue: 3 });
    const events = [
      makeEvent(goal.id, localDayKey(lastOfMonth), { amount: 3 }),
      makeEvent(goal.id, '2026-03-01', { amount: 999 }), // first day of next month, excluded
    ];
    const chip = todayChipFor(goal, events, lastOfMonth);
    expect(chip.state).toBe('done');
    expect(chip.label).toBe('Feb 3/3');
  });

  it('handles the Feb 29 leap-day boundary: an event on Feb 29 counts toward February', () => {
    // 2028 is a leap year.
    const feb29 = new Date(2028, 1, 29, 9);
    const goal = makeGoal({ cadence: 'monthly', metricType: 'count', targetValue: 2 });
    const events = [
      makeEvent(goal.id, localDayKey(feb29), { amount: 2 }),
      makeEvent(goal.id, '2028-03-01', { amount: 999 }), // excluded
    ];
    const chip = todayChipFor(goal, events, feb29);
    expect(chip.state).toBe('done');
    expect(chip.label).toBe('Feb 2/2');
  });
});

// ---- todayChipFor: streak -------------------------------------------------

describe('todayChipFor: streak metric', () => {
  it('is done ("Today 1/1") when there is an event logged today, regardless of cadence', () => {
    const today = new Date(2026, 6, 15, 10);
    const goal = makeGoal({ cadence: 'weekly', metricType: 'streak', targetValue: 30 });
    const events = [makeEvent(goal.id, localDayKey(today), { amount: 1 })];
    const chip = todayChipFor(goal, events, today);
    expect(chip.state).toBe('done');
    expect(chip.dueToday).toBe(0);
    expect(chip.label).toBe('Today 1/1');
  });

  it('is due ("Today 0/1") when there is no event logged today', () => {
    const today = new Date(2026, 6, 15, 10);
    const goal = makeGoal({ cadence: 'daily', metricType: 'streak', targetValue: 30 });
    const events = [makeEvent(goal.id, dayKeyOffset(today, -1), { amount: 1 })];
    const chip = todayChipFor(goal, events, today);
    expect(chip.state).toBe('due');
    expect(chip.dueToday).toBe(1);
    expect(chip.label).toBe('Today 0/1');
  });

  it('stays due 0/1 today even with a long unbroken streak through yesterday (metric is today-only, not streak length)', () => {
    const today = new Date(2026, 6, 15, 10);
    const goal = makeGoal({ cadence: 'daily', metricType: 'streak', targetValue: 30 });
    const events = [
      makeEvent(goal.id, dayKeyOffset(today, -1)),
      makeEvent(goal.id, dayKeyOffset(today, -2)),
      makeEvent(goal.id, dayKeyOffset(today, -3)),
      makeEvent(goal.id, dayKeyOffset(today, -4)),
      makeEvent(goal.id, dayKeyOffset(today, -5)),
    ];
    const chip = todayChipFor(goal, events, today);
    expect(chip.state).toBe('due');
    expect(chip.dueToday).toBe(1);
    expect(chip.label).toBe('Today 0/1');
    // windowCurrent still reports the streak length (grace-today counts back from yesterday).
    expect(chip.windowCurrent).toBe(5);
  });

  it('reports done 1/1 today when an event is logged today, independent of window/streak size', () => {
    const today = new Date(2026, 6, 15, 10);
    const goal = makeGoal({ cadence: 'daily', metricType: 'streak', targetValue: 30 });
    const events = [
      makeEvent(goal.id, dayKeyOffset(today, 0)),
      makeEvent(goal.id, dayKeyOffset(today, -1)),
    ];
    const chip = todayChipFor(goal, events, today);
    expect(chip.state).toBe('done');
    expect(chip.dueToday).toBe(0);
    expect(chip.label).toBe('Today 1/1');
    expect(chip.windowCurrent).toBe(2);
  });
});

// ---- featuredGoal -------------------------------------------------

describe('featuredGoal', () => {
  it('returns null when there are no active goals', () => {
    expect(featuredGoal([])).toBeNull();
    expect(featuredGoal([makeGoal({ archivedAt: '2026-01-01T00:00:00.000Z' })])).toBeNull();
  });

  it('prefers the pinned goal over everything else', () => {
    const today = new Date(2026, 6, 15, 10);
    const notPinnedButSoonest = makeGoal({ targetDate: localDayKey(today) });
    const pinned = makeGoal({ pinnedAt: '2026-07-01T00:00:00.000Z', targetDate: null });
    expect(featuredGoal([notPinnedButSoonest, pinned], today)).toBe(pinned);
  });

  it('when several are pinned, picks the one pinned most recently', () => {
    const earlierPin = makeGoal({ pinnedAt: '2026-07-01T00:00:00.000Z' });
    const laterPin = makeGoal({ pinnedAt: '2026-07-10T00:00:00.000Z' });
    expect(featuredGoal([earlierPin, laterPin])).toBe(laterPin);
  });

  it('falls back to the nearest upcoming target date (today counts as upcoming)', () => {
    const today = new Date(2026, 6, 15, 10);
    const dueToday = makeGoal({ targetDate: localDayKey(today) });
    const dueLater = makeGoal({ targetDate: localDayKey(addLocalDays(today, 10)) });
    expect(featuredGoal([dueLater, dueToday], today)).toBe(dueToday);
  });

  it('ranks upcoming target dates before past ones even if the past one is closer', () => {
    const today = new Date(2026, 6, 15, 10);
    const pastByOne = makeGoal({ targetDate: localDayKey(addLocalDays(today, -1)) });
    const upcomingByFive = makeGoal({ targetDate: localDayKey(addLocalDays(today, 5)) });
    expect(featuredGoal([pastByOne, upcomingByFive], today)).toBe(upcomingByFive);
  });

  it('when every dated goal is past-due, picks the nearest past target date', () => {
    const today = new Date(2026, 6, 15, 10);
    const pastByOne = makeGoal({ targetDate: localDayKey(addLocalDays(today, -1)) });
    const pastByTen = makeGoal({ targetDate: localDayKey(addLocalDays(today, -10)) });
    expect(featuredGoal([pastByTen, pastByOne], today)).toBe(pastByOne);
  });

  it('falls back to the most recently created goal when no goal is pinned or dated', () => {
    const older = makeGoal({ createdAt: '2026-01-01T00:00:00.000Z' });
    const newer = makeGoal({ createdAt: '2026-06-01T00:00:00.000Z' });
    expect(featuredGoal([older, newer])).toBe(newer);
  });

  it('excludes an archived goal even when it would otherwise win on every tiebreak (pin, date, recency)', () => {
    const today = new Date(2026, 6, 15, 10);
    const archivedButPinnedMostRecently = makeGoal({
      pinnedAt: '2026-07-14T00:00:00.000Z',
      targetDate: localDayKey(today),
      createdAt: '2026-07-01T00:00:00.000Z',
      archivedAt: '2026-07-14T00:00:01.000Z',
    });
    const activeFallback = makeGoal({
      pinnedAt: null,
      targetDate: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(featuredGoal([archivedButPinnedMostRecently, activeFallback], today)).toBe(activeFallback);
  });
});

// ---- primaryGoalForArea -------------------------------------------------

describe('primaryGoalForArea', () => {
  it('only considers goals in the requested area', () => {
    const finance = makeGoal({ lifeArea: 'finance' as LifeArea, createdAt: '2026-06-01T00:00:00.000Z' });
    const physical = makeGoal({ lifeArea: 'physical' as LifeArea, createdAt: '2026-07-01T00:00:00.000Z' });
    expect(primaryGoalForArea([finance, physical], 'finance')).toBe(finance);
  });

  it("a pinned goal in a different area does not leak into this area's pick", () => {
    const pinnedElsewhere = makeGoal({
      lifeArea: 'finance' as LifeArea,
      pinnedAt: '2026-07-01T00:00:00.000Z',
    });
    const physical = makeGoal({ lifeArea: 'physical' as LifeArea, createdAt: '2026-06-01T00:00:00.000Z' });
    expect(primaryGoalForArea([pinnedElsewhere, physical], 'physical')).toBe(physical);
  });

  it('a pinned goal within the area still wins over target-date/created fallback', () => {
    const today = new Date(2026, 6, 15, 10);
    const dueSoon = makeGoal({ lifeArea: 'mental' as LifeArea, targetDate: localDayKey(today) });
    const pinned = makeGoal({ lifeArea: 'mental' as LifeArea, pinnedAt: '2026-07-01T00:00:00.000Z' });
    expect(primaryGoalForArea([dueSoon, pinned], 'mental', today)).toBe(pinned);
  });

  it('returns null when the area has no active goals', () => {
    const goal = makeGoal({ lifeArea: 'physical' as LifeArea });
    expect(primaryGoalForArea([goal], 'finance')).toBeNull();
  });

  it('excludes an archived goal in the area even when it would otherwise win on every tiebreak', () => {
    const today = new Date(2026, 6, 15, 10);
    const archivedButPinned = makeGoal({
      lifeArea: 'social' as LifeArea,
      pinnedAt: '2026-07-14T00:00:00.000Z',
      targetDate: localDayKey(today),
      archivedAt: '2026-07-14T00:00:01.000Z',
    });
    const activeFallback = makeGoal({
      lifeArea: 'social' as LifeArea,
      pinnedAt: null,
      targetDate: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(primaryGoalForArea([archivedButPinned, activeFallback], 'social', today)).toBe(
      activeFallback
    );
  });
});

// ---- lastLoggedDaysAgo -------------------------------------------------

describe('lastLoggedDaysAgo', () => {
  it('returns null for a goal with no logged day', () => {
    expect(lastLoggedDaysAgo(null, new Date(2026, 6, 15))).toBeNull();
  });

  it('returns 0 for a day key equal to today', () => {
    const today = new Date(2026, 6, 15, 10);
    expect(lastLoggedDaysAgo(localDayKey(today), today)).toBe(0);
  });

  it('returns the whole-day distance for a past day key', () => {
    const today = new Date(2026, 6, 15, 10);
    expect(lastLoggedDaysAgo(dayKeyOffset(today, -5), today)).toBe(5);
  });

  it('returns 1 for yesterday even at a late local evening "today" (west-of-UTC trap)', () => {
    // 11:45pm local: a naive UTC-based day-key would already have rolled to
    // the next calendar day, which would corrupt this distance.
    const lateEvening = new Date(2026, 6, 15, 23, 45);
    expect(lastLoggedDaysAgo(dayKeyOffset(lateEvening, -1), lateEvening)).toBe(1);
  });

  it('crosses a calendar-year boundary correctly', () => {
    const newYearsDay = new Date(2026, 0, 1, 9); // Jan 1 2026
    expect(lastLoggedDaysAgo('2025-12-30', newYearsDay)).toBe(2);
  });

  it('spans the US spring-forward DST transition without an off-by-one', () => {
    // Sun Mar 8 2026 is the DST-forward day; today = Wed Mar 11 2026.
    const today = new Date(2026, 2, 11, 9);
    expect(lastLoggedDaysAgo('2026-03-06', today)).toBe(5);
  });
});

// ---- progressingGoalsSort -------------------------------------------------

describe('progressingGoalsSort', () => {
  it('puts goals with a target date before goals without one', () => {
    const today = new Date(2026, 6, 15, 10);
    const dated = makeGoal({ targetDate: localDayKey(addLocalDays(today, 20)) });
    const undated = makeGoal({ targetDate: null, createdAt: '2026-07-01T00:00:00.000Z' });
    const result = progressingGoalsSort([undated, dated], new Map(), today);
    expect(result[0]).toBe(dated);
    expect(result[1]).toBe(undated);
  });

  it('orders dated goals by nearest upcoming target date first', () => {
    const today = new Date(2026, 6, 15, 10);
    const far = makeGoal({ targetDate: localDayKey(addLocalDays(today, 30)) });
    const near = makeGoal({ targetDate: localDayKey(addLocalDays(today, 3)) });
    const result = progressingGoalsSort([far, near], new Map(), today);
    expect(result).toEqual([near, far]);
  });

  it('orders undated goals by most-recent lastLogged day first', () => {
    const today = new Date(2026, 6, 15, 10);
    const loggedLongAgo = makeGoal({ createdAt: '2026-01-01T00:00:00.000Z' });
    const loggedRecently = makeGoal({ createdAt: '2026-01-01T00:00:00.000Z' });
    const lastLogged = new Map([
      [loggedLongAgo.id, dayKeyOffset(today, -10)],
      [loggedRecently.id, dayKeyOffset(today, -1)],
    ]);
    const result = progressingGoalsSort([loggedLongAgo, loggedRecently], lastLogged, today);
    expect(result).toEqual([loggedRecently, loggedLongAgo]);
  });

  it('sorts never-logged undated goals last, tie-broken by most-recently-created', () => {
    const today = new Date(2026, 6, 15, 10);
    const logged = makeGoal({ createdAt: '2026-01-01T00:00:00.000Z' });
    const neverLoggedOlder = makeGoal({ createdAt: '2026-02-01T00:00:00.000Z' });
    const neverLoggedNewer = makeGoal({ createdAt: '2026-03-01T00:00:00.000Z' });
    const lastLogged = new Map([[logged.id, dayKeyOffset(today, -1)]]);
    const result = progressingGoalsSort(
      [neverLoggedOlder, logged, neverLoggedNewer],
      lastLogged,
      today
    );
    expect(result).toEqual([logged, neverLoggedNewer, neverLoggedOlder]);
  });

  it('excludes archived goals', () => {
    const today = new Date(2026, 6, 15, 10);
    const archived = makeGoal({ archivedAt: '2026-01-01T00:00:00.000Z' });
    const active = makeGoal({ createdAt: '2026-01-01T00:00:00.000Z' });
    const result = progressingGoalsSort([archived, active], new Map(), today);
    expect(result).toEqual([active]);
  });

  it('places a past-target-date goal ahead of undated goals (dated group always precedes undated)', () => {
    const today = new Date(2026, 6, 15, 10);
    const pastDated = makeGoal({ targetDate: localDayKey(addLocalDays(today, -5)) });
    const undated = makeGoal({ targetDate: null, createdAt: '2026-07-10T00:00:00.000Z' });
    const result = progressingGoalsSort([undated, pastDated], new Map(), today);
    expect(result).toEqual([pastDated, undated]);
  });

  it('is stable (input order preserved) for two dated goals with the exact same target date', () => {
    const today = new Date(2026, 6, 15, 10);
    const sameDate = localDayKey(addLocalDays(today, 5));
    const first = makeGoal({ targetDate: sameDate, createdAt: '2026-01-01T00:00:00.000Z' });
    const second = makeGoal({ targetDate: sameDate, createdAt: '2026-01-01T00:00:00.000Z' });
    const result = progressingGoalsSort([first, second], new Map(), today);
    expect(result).toEqual([first, second]);
  });

  it('is stable for two never-logged undated goals with the exact same createdAt', () => {
    const today = new Date(2026, 6, 15, 10);
    const first = makeGoal({ targetDate: null, createdAt: '2026-03-01T00:00:00.000Z' });
    const second = makeGoal({ targetDate: null, createdAt: '2026-03-01T00:00:00.000Z' });
    const result = progressingGoalsSort([first, second], new Map(), today);
    expect(result).toEqual([first, second]);
  });
});
