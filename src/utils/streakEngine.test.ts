/**
 * streakEngine.test.ts — the forgiving planning streak.
 */

import { describe, it, expect } from 'vitest';
import { computeStreak, periodIndex, earnedFreezes, streakMessage } from './streakEngine';

describe('periodIndex', () => {
  it('gives the same week index for any day in the same week', () => {
    const mon = periodIndex(new Date('2026-07-13T09:00:00'), 'week'); // Monday
    const sun = periodIndex(new Date('2026-07-19T23:00:00'), 'week'); // Sunday same week
    const nextMon = periodIndex(new Date('2026-07-20T00:00:00'), 'week');
    expect(sun).toBe(mon);
    expect(nextMon).toBe(mon + 1);
  });

  it('indexes months monotonically', () => {
    expect(periodIndex(new Date('2026-08-01'), 'month')).toBe(periodIndex(new Date('2026-07-01'), 'month') + 1);
  });
});

describe('computeStreak', () => {
  it('is "new" with no history', () => {
    const r = computeStreak({ completedPeriods: [], currentPeriod: 100, freezesAvailable: 2 });
    expect(r.status).toBe('new');
    expect(r.current).toBe(0);
    expect(r.freezesUsed).toBe(0); // no freezes wasted
  });

  it('counts a consecutive run ending at the current period', () => {
    const r = computeStreak({ completedPeriods: [98, 99, 100], currentPeriod: 100, freezesAvailable: 0 });
    expect(r.status).toBe('active');
    expect(r.current).toBe(3);
    expect(r.currentPeriodDone).toBe(true);
  });

  it('is "at_risk" (not broken) when the current period is still open', () => {
    const r = computeStreak({ completedPeriods: [98, 99], currentPeriod: 100, freezesAvailable: 0 });
    expect(r.status).toBe('at_risk');
    expect(r.current).toBe(2);
    expect(r.recoverable).toBe(true);
  });

  it('bridges a single missed period with a freeze', () => {
    // planned 10 and 12, missed 11; a freeze keeps the run alive at period 12.
    const r = computeStreak({ completedPeriods: [10, 12], currentPeriod: 12, freezesAvailable: 1 });
    expect(r.status).toBe('active');
    expect(r.current).toBe(2);
    expect(r.freezesUsed).toBe(1);
    expect(r.freezesRemaining).toBe(0);
  });

  it('breaks only when out of freezes across a gap', () => {
    const r = computeStreak({ completedPeriods: [10, 12], currentPeriod: 12, freezesAvailable: 0 });
    expect(r.current).toBe(1); // only period 12 counts; 11 gap not bridged
  });

  it('reports "broken" but recoverable after a lapse', () => {
    const r = computeStreak({ completedPeriods: [90, 91], currentPeriod: 100, freezesAvailable: 0 });
    expect(r.status).toBe('broken');
    expect(r.recoverable).toBe(true);
  });
});

describe('earnedFreezes', () => {
  it('grants one freeze per four completed periods', () => {
    expect(earnedFreezes(3)).toBe(0);
    expect(earnedFreezes(4)).toBe(1);
    expect(earnedFreezes(9)).toBe(2);
  });
});

describe('streakMessage', () => {
  it('never shames a miss', () => {
    const broken = streakMessage(
      { current: 0, longest: 5, freezesUsed: 0, freezesRemaining: 0, status: 'broken', recoverable: true, currentPeriodDone: false },
      'week',
    );
    expect(broken).toMatch(/fresh start/i);
    expect(broken).not.toMatch(/fail|lost|missed|broke/i);
  });
});
