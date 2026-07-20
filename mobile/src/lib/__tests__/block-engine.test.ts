/**
 * block-engine.test.ts — pure-logic coverage for scheduled time blocks
 * (Roadmap Phase 4a).
 *
 * Deterministic by construction: no wall-clock `new Date()`, no randomness.
 * Day keys are either hand-written zero-padded YYYY-MM-DD literals (the
 * engine only ever does string comparison/equality on them, per its own
 * doc comment) or derived via time-policy helpers when a fixture needs to
 * represent "today" in a timezone-proof way.
 */
import { describe, expect, it } from 'vitest';
import {
  blocksForDay,
  blocksForRange,
  completionSummary,
  groupBlocksByDay,
} from '../block-engine';
import type { Block } from '../block-types';

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

// ---- blocksForDay -------------------------------------------------

describe('blocksForDay', () => {
  it('filters to only the requested day key', () => {
    const target = makeBlock({ scheduledOn: '2026-07-15', title: 'Target' });
    const other1 = makeBlock({ scheduledOn: '2026-07-14', title: 'Yesterday' });
    const other2 = makeBlock({ scheduledOn: '2026-07-16', title: 'Tomorrow' });
    const result = blocksForDay([target, other1, other2], '2026-07-15');
    expect(result).toEqual([target]);
  });

  it('sorts timed blocks chronologically before untimed blocks', () => {
    const untimed = makeBlock({ scheduledOn: '2026-07-15', title: 'Zzz no time', startTime: null });
    const late = makeBlock({ scheduledOn: '2026-07-15', title: 'Afternoon', startTime: '14:00:00' });
    const early = makeBlock({ scheduledOn: '2026-07-15', title: 'Morning', startTime: '09:00:00' });
    const result = blocksForDay([untimed, late, early], '2026-07-15');
    expect(result.map((b) => b.title)).toEqual(['Morning', 'Afternoon', 'Zzz no time']);
  });

  it('sorts untimed blocks alphabetically by title among themselves', () => {
    const c = makeBlock({ scheduledOn: '2026-07-15', title: 'Charlie', startTime: null });
    const a = makeBlock({ scheduledOn: '2026-07-15', title: 'Alpha', startTime: null });
    const b = makeBlock({ scheduledOn: '2026-07-15', title: 'Bravo', startTime: null });
    const result = blocksForDay([c, a, b], '2026-07-15');
    expect(result.map((b2) => b2.title)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('returns an empty array for empty input', () => {
    expect(blocksForDay([], '2026-07-15')).toEqual([]);
  });
});

// ---- blocksForRange -------------------------------------------------

describe('blocksForRange', () => {
  it('is inclusive on both boundary day keys', () => {
    const lower = makeBlock({ scheduledOn: '2026-07-10' });
    const upper = makeBlock({ scheduledOn: '2026-07-17' });
    const inside = makeBlock({ scheduledOn: '2026-07-13' });
    const result = blocksForRange([lower, upper, inside], '2026-07-10', '2026-07-17');
    expect(result).toHaveLength(3);
    expect(result).toEqual(expect.arrayContaining([lower, upper, inside]));
  });

  it('excludes days outside the range on both sides', () => {
    const before = makeBlock({ scheduledOn: '2026-07-09' });
    const after = makeBlock({ scheduledOn: '2026-07-18' });
    const result = blocksForRange([before, after], '2026-07-10', '2026-07-17');
    expect(result).toEqual([]);
  });

  it('handles a range spanning a month boundary via zero-padded string comparison', () => {
    // Jul 31 -> Aug 02: plain string comparison works here specifically
    // because both months are zero-padded two-digit, so '2026-07-31' <
    // '2026-08-01' lexicographically matches chronological order.
    const jul31 = makeBlock({ scheduledOn: '2026-07-31', title: 'Last day of July' });
    const aug01 = makeBlock({ scheduledOn: '2026-08-01', title: 'First day of August' });
    const aug02 = makeBlock({ scheduledOn: '2026-08-02', title: 'Second day of August' });
    const outside = makeBlock({ scheduledOn: '2026-08-03', title: 'Out of range' });
    const result = blocksForRange([jul31, aug01, aug02, outside], '2026-07-31', '2026-08-02');
    expect(result).toHaveLength(3);
    expect(result).toEqual(expect.arrayContaining([jul31, aug01, aug02]));
  });
});

// ---- completionSummary -------------------------------------------------

describe('completionSummary', () => {
  it('counts done and total across a mixed set of completed and uncompleted blocks', () => {
    const blocks = [
      makeBlock({ completedAt: '2026-07-15T10:00:00.000Z' }),
      makeBlock({ completedAt: null }),
      makeBlock({ completedAt: '2026-07-15T11:00:00.000Z' }),
      makeBlock({ completedAt: null }),
      makeBlock({ completedAt: null }),
    ];
    expect(completionSummary(blocks)).toEqual({ done: 2, total: 5 });
  });

  it('returns zero and zero for empty input', () => {
    expect(completionSummary([])).toEqual({ done: 0, total: 0 });
  });
});

// ---- groupBlocksByDay -------------------------------------------------

describe('groupBlocksByDay', () => {
  it('groups blocks by their scheduledOn day key', () => {
    const day1a = makeBlock({ scheduledOn: '2026-07-15', title: 'Day1 A' });
    const day1b = makeBlock({ scheduledOn: '2026-07-15', title: 'Day1 B' });
    const day2 = makeBlock({ scheduledOn: '2026-07-16', title: 'Day2' });
    const grouped = groupBlocksByDay([day1a, day1b, day2]);
    expect(Object.keys(grouped).sort()).toEqual(['2026-07-15', '2026-07-16']);
    expect(grouped['2026-07-15']).toHaveLength(2);
    expect(grouped['2026-07-16']).toEqual([day2]);
  });

  it('applies the same ordering rules as blocksForDay within each group', () => {
    const untimed = makeBlock({ scheduledOn: '2026-07-15', title: 'Zebra', startTime: null });
    const timed = makeBlock({ scheduledOn: '2026-07-15', title: 'Any title', startTime: '08:00:00' });
    const untimedAlpha = makeBlock({ scheduledOn: '2026-07-15', title: 'Apple', startTime: null });
    const grouped = groupBlocksByDay([untimed, timed, untimedAlpha]);
    expect(grouped['2026-07-15']!.map((b) => b.title)).toEqual(['Any title', 'Apple', 'Zebra']);
  });

  it('does not produce a key for a day with no blocks', () => {
    const only = makeBlock({ scheduledOn: '2026-07-15' });
    const grouped = groupBlocksByDay([only]);
    expect(grouped['2026-07-16']).toBeUndefined();
    expect(Object.keys(grouped)).toEqual(['2026-07-15']);
  });

  it('returns an empty object for empty input', () => {
    expect(groupBlocksByDay([])).toEqual({});
  });
});
