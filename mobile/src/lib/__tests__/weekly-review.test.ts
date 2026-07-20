/**
 * weekly-review.test.ts — pure-logic coverage for the weekly review/planning
 * wizard (Roadmap Phase 4b).
 *
 * Deterministic by construction: every "today" is a fixed `new Date(y, m, d, h)`
 * local-time literal (never wall-clock `new Date()`), and every fixture's day
 * key is derived via time-policy helpers (`addLocalDays`/`localDayKey`/
 * `startOfLocalWeek`) rather than hand-written arithmetic, so expectations hold
 * under any host timezone — including the "late evening west of UTC" trap
 * where a naive UTC day-key would silently roll to the wrong calendar day.
 */
import { describe, expect, it } from 'vitest';
import { previousWeekRange, weeklyBlockSummary, weeklyGoalRecap } from '../weekly-review';
import type { Block } from '../block-types';
import type { Goal, ProgressEvent } from '../goals-types';
import { addLocalDays, localDayKey, startOfLocalWeek } from '../time-policy';

// ---- fixture helpers -------------------------------------------------

let blockSeq = 0;
function makeBlock(overrides: Partial<Block> = {}): Block {
  blockSeq += 1;
  return {
    id: `block-${blockSeq}`,
    userId: 'user-1',
    title: `Block ${blockSeq}`,
    scheduledOn: '2026-07-15',
    startTime: null,
    durationMinutes: null,
    goalId: null,
    personId: null,
    notes: null,
    completedAt: null,
    googleCalendarEventId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    userId: 'user-1',
    title: 'Test goal',
    lifeArea: 'physical',
    metricType: 'count',
    targetValue: 10,
    unit: null,
    cadence: 'weekly',
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

// ---- previousWeekRange -------------------------------------------------

describe('previousWeekRange', () => {
  it('for a Wednesday today, returns the Monday-Sunday range of the prior calendar week, not the current one', () => {
    const wednesday = new Date(2026, 6, 15, 10); // Wed Jul 15 2026
    const thisMonday = startOfLocalWeek(wednesday);
    const priorMonday = addLocalDays(thisMonday, -7);
    const priorSunday = addLocalDays(thisMonday, -1);

    const range = previousWeekRange(wednesday);

    expect(range.fromDayKey).toBe(localDayKey(priorMonday));
    expect(range.toDayKey).toBe(localDayKey(priorSunday));
    // Sanity: the range must not touch the current week at all.
    expect(range.toDayKey < localDayKey(thisMonday)).toBe(true);
  });

  it('for a Monday today, still returns the prior full week rather than the week that just started', () => {
    const monday = new Date(2026, 6, 13, 9); // Mon Jul 13 2026
    const priorMonday = addLocalDays(monday, -7);
    const priorSunday = addLocalDays(monday, -1);

    const range = previousWeekRange(monday);

    expect(range.fromDayKey).toBe(localDayKey(priorMonday));
    expect(range.toDayKey).toBe(localDayKey(priorSunday));
    // The range must end the day before today's Monday, not include it.
    expect(range.toDayKey).toBe(localDayKey(addLocalDays(monday, -1)));
  });

  it('spans a month boundary correctly when the prior week crosses one', () => {
    // Aug 3 2026 is a Monday; the prior week is Jul 27 (Mon) - Aug 2 (Sun).
    const today = new Date(2026, 7, 3, 10); // Mon Aug 3 2026
    const range = previousWeekRange(today);

    expect(range.fromDayKey).toBe('2026-07-27');
    expect(range.toDayKey).toBe('2026-08-02');
  });

  it('always returns a 7-day inclusive Monday-through-Sunday span', () => {
    const today = new Date(2026, 6, 19, 23, 45); // late Sunday evening, local
    const range = previousWeekRange(today);
    const from = new Date(`${range.fromDayKey}T00:00:00`);
    const to = new Date(`${range.toDayKey}T00:00:00`);
    expect(from.getDay()).toBe(1); // Monday
    expect(to.getDay()).toBe(0); // Sunday
    expect(localDayKey(addLocalDays(from, 6))).toBe(range.toDayKey);
  });
});

// ---- weeklyBlockSummary -------------------------------------------------

describe('weeklyBlockSummary', () => {
  it('counts done/total only for blocks inside the range, excluding blocks scheduled outside it', () => {
    const range = { fromDayKey: '2026-07-06', toDayKey: '2026-07-12' };
    const insideDone = makeBlock({ scheduledOn: '2026-07-06', completedAt: '2026-07-06T10:00:00.000Z' });
    const insideNotDone = makeBlock({ scheduledOn: '2026-07-09', completedAt: null });
    const insideDone2 = makeBlock({ scheduledOn: '2026-07-12', completedAt: '2026-07-12T10:00:00.000Z' });
    const beforeRange = makeBlock({ scheduledOn: '2026-07-05', completedAt: '2026-07-05T10:00:00.000Z' });
    const afterRange = makeBlock({ scheduledOn: '2026-07-13', completedAt: null });

    const summary = weeklyBlockSummary(
      [insideDone, insideNotDone, insideDone2, beforeRange, afterRange],
      range
    );

    expect(summary).toEqual({ done: 2, total: 3 });
  });

  it('returns zero/zero when no blocks fall in the range', () => {
    const range = { fromDayKey: '2026-07-06', toDayKey: '2026-07-12' };
    const outside = makeBlock({ scheduledOn: '2026-08-01' });
    expect(weeklyBlockSummary([outside], range)).toEqual({ done: 0, total: 0 });
  });
});

// ---- weeklyGoalRecap -------------------------------------------------

describe('weeklyGoalRecap', () => {
  const range = { fromDayKey: '2026-07-06', toDayKey: '2026-07-12' };

  it('includes only active non-archived goals, excluding archived goals entirely', () => {
    const active = makeGoal({ id: 'goal-active', title: 'Active goal', archivedAt: null });
    const archived = makeGoal({ id: 'goal-archived', title: 'Archived goal', archivedAt: '2026-07-01T00:00:00.000Z' });

    const recap = weeklyGoalRecap([active, archived], [], range);

    expect(recap).toHaveLength(1);
    expect(recap[0]!.goalId).toBe('goal-active');
    expect(recap.some((entry) => entry.goalId === 'goal-archived')).toBe(false);
  });

  it("reflects only events whose day falls inside the range, excluding events from outside it", () => {
    const goal = makeGoal({ id: 'goal-1' });
    const events = [
      makeEvent('2026-07-06', { goalId: 'goal-1', amount: 3 }), // lower bound, included
      makeEvent('2026-07-09', { goalId: 'goal-1', amount: 4 }),
      makeEvent('2026-07-12', { goalId: 'goal-1', amount: 5 }), // upper bound, included
      makeEvent('2026-07-05', { goalId: 'goal-1', amount: 100 }), // before range, excluded
      makeEvent('2026-07-13', { goalId: 'goal-1', amount: 200 }), // after range, excluded
    ];

    const recap = weeklyGoalRecap([goal], events, range);

    expect(recap).toEqual([
      { goalId: 'goal-1', title: goal.title, lifeArea: goal.lifeArea, progress: 12 },
    ]);
  });

  it('still lists a goal with zero events in the range, with a zero amount, rather than omitting it', () => {
    const goal = makeGoal({ id: 'goal-1' });
    const events = [makeEvent('2026-05-01', { goalId: 'goal-1', amount: 50 })]; // outside range entirely

    const recap = weeklyGoalRecap([goal], events, range);

    expect(recap).toHaveLength(1);
    expect(recap[0]).toEqual({ goalId: 'goal-1', title: goal.title, lifeArea: goal.lifeArea, progress: 0 });
  });

  it('scopes events to their own goal, not mixing amounts across goals', () => {
    const goalA = makeGoal({ id: 'goal-a', title: 'Goal A' });
    const goalB = makeGoal({ id: 'goal-b', title: 'Goal B' });
    const events = [
      makeEvent('2026-07-07', { goalId: 'goal-a', amount: 10 }),
      makeEvent('2026-07-08', { goalId: 'goal-b', amount: 20 }),
    ];

    const recap = weeklyGoalRecap([goalA, goalB], events, range);

    const byId = Object.fromEntries(recap.map((e) => [e.goalId, e.progress]));
    expect(byId).toEqual({ 'goal-a': 10, 'goal-b': 20 });
  });
});
