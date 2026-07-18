/**
 * timePolicy.test.ts — the app-wide local-timezone day policy (Roadmap Phase 0).
 * All assertions are timezone-relative (they pass in any TZ) — the point of the
 * policy is that results follow the DEVICE's local calendar, not UTC.
 */

import { describe, it, expect } from 'vitest';
import {
  localDayKey,
  startOfLocalDay,
  isSameLocalDay,
  addLocalDays,
  localDaysBetween,
  startOfLocalWeek,
  localWeekKey,
  localMonthKey,
  localYearsAfter,
} from './timePolicy';

describe('localDayKey', () => {
  it('formats local YYYY-MM-DD', () => {
    const d = new Date(2026, 6, 16, 13, 30); // July 16 2026, local
    expect(localDayKey(d)).toBe('2026-07-16');
  });

  it('keeps late-evening local time on the same local day (the UTC trap)', () => {
    const lateEvening = new Date(2026, 6, 16, 23, 30); // 11:30pm local
    expect(localDayKey(lateEvening)).toBe('2026-07-16');
    // toISOString() would report the 17th for any TZ west of UTC — the bug this
    // policy exists to prevent. We only assert our key matches local fields:
    expect(localDayKey(lateEvening)).toBe(
      `2026-07-${String(lateEvening.getDate()).padStart(2, '0')}`,
    );
  });
});

describe('startOfLocalDay / isSameLocalDay', () => {
  it('zeroes the local clock', () => {
    const d = startOfLocalDay(new Date(2026, 6, 16, 18, 45, 12));
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0]);
    expect(localDayKey(d)).toBe('2026-07-16');
  });

  it('same local day regardless of time; different across midnight', () => {
    expect(isSameLocalDay(new Date(2026, 6, 16, 0, 1), new Date(2026, 6, 16, 23, 59))).toBe(true);
    expect(isSameLocalDay(new Date(2026, 6, 16, 23, 59), new Date(2026, 6, 17, 0, 1))).toBe(false);
  });
});

describe('addLocalDays / localDaysBetween', () => {
  it('adds calendar days across month boundaries', () => {
    expect(localDayKey(addLocalDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
    expect(localDayKey(addLocalDays(new Date(2026, 2, 1), -1))).toBe('2026-02-28');
  });

  it('counts whole days, ignoring time-of-day', () => {
    expect(localDaysBetween(new Date(2026, 6, 16, 23, 0), new Date(2026, 6, 17, 1, 0))).toBe(1);
    expect(localDaysBetween(new Date(2026, 6, 17), new Date(2026, 6, 16))).toBe(-1);
    expect(localDaysBetween(new Date(2026, 6, 16, 1), new Date(2026, 6, 16, 23))).toBe(0);
  });

  it('is stable across the spring DST transition (US: Mar 8 2026)', () => {
    // 23-hour day in DST zones; naive /86400000 math truncates to 0 without rounding.
    expect(localDaysBetween(new Date(2026, 2, 8), new Date(2026, 2, 9))).toBe(1);
    expect(localDaysBetween(new Date(2026, 2, 7), new Date(2026, 2, 10))).toBe(3);
  });
});

describe('week + month keys', () => {
  it('startOfLocalWeek is the Monday, with Sunday belonging to the prior week', () => {
    expect(localDayKey(startOfLocalWeek(new Date(2026, 6, 16)))).toBe('2026-07-13'); // Thu → Mon
    expect(localDayKey(startOfLocalWeek(new Date(2026, 6, 19)))).toBe('2026-07-13'); // Sun → prior Mon
    expect(localDayKey(startOfLocalWeek(new Date(2026, 6, 13)))).toBe('2026-07-13'); // Mon → itself
  });

  it('week/month keys derive from the same policy', () => {
    expect(localWeekKey(new Date(2026, 6, 16))).toBe('2026-07-13');
    expect(localMonthKey(new Date(2026, 6, 16))).toBe('2026-07');
  });
});

describe('localYearsAfter (newlywed-year rule)', () => {
  it('plain anniversary', () => {
    expect(localYearsAfter('2026-06-12', 1)).toBe('2027-06-12');
  });

  it('Feb 29 wedding rolls to Mar 1 in a non-leap year (forgiving)', () => {
    expect(localYearsAfter('2028-02-29', 1)).toBe('2029-03-01');
  });

  it('Feb 29 wedding stays Feb 29 after 4 years', () => {
    expect(localYearsAfter('2028-02-29', 4)).toBe('2032-02-29');
  });
});
