/**
 * timePolicy.ts — THE time policy for the whole app (Roadmap Phase 0).
 *
 * Every "day" boundary — streaks, Today chips, nightly ritual, cadence windows,
 * newlywed-year math — is computed in the DEVICE'S LOCAL TIMEZONE, never UTC.
 * Later phases import these helpers instead of rolling their own date logic.
 *
 * Existing precedent: the habit/journal/mood stores already key logs with
 * `toLocaleDateString('en-CA')` (local YYYY-MM-DD). This module makes that the
 * single named convention. Do NOT use `toISOString().slice(0,10)` for day keys —
 * it silently shifts days for anyone west of UTC in the evening.
 */

/** Local-timezone day key, YYYY-MM-DD (en-CA locale formats exactly this). */
export function localDayKey(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA');
}

/** Midnight at the START of the given date's local day. */
export function startOfLocalDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** True when both dates fall on the same local calendar day. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return localDayKey(a) === localDayKey(b);
}

/** The date `n` local calendar days after `date` (n may be negative). DST-safe. */
export function addLocalDays(date: Date, n: number): Date {
  const d = startOfLocalDay(date);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Whole local calendar days from `a` to `b` (positive when b is later).
 * Compares local midnights so DST transitions can't produce off-by-one.
 */
export function localDaysBetween(a: Date, b: Date): number {
  const MS = 86_400_000;
  return Math.round((startOfLocalDay(b).getTime() - startOfLocalDay(a).getTime()) / MS);
}

/** Local Monday (start of week) for the given date, as a Date at local midnight. */
export function startOfLocalWeek(date: Date = new Date()): Date {
  const d = startOfLocalDay(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

/** Local-week key: the Monday's YYYY-MM-DD. */
export function localWeekKey(date: Date = new Date()): string {
  return localDayKey(startOfLocalWeek(date));
}

/** Local-month key, YYYY-MM. */
export function localMonthKey(date: Date = new Date()): string {
  return localDayKey(date).slice(0, 7);
}

/**
 * Anniversary date-key math for "one year after" rules (e.g. newlywed -> married).
 * Uses calendar-date arithmetic in local time; a Feb 29 start lands on Mar 1 in
 * non-leap years (JS Date rollover), which is the intended forgiving behavior.
 */
export function localYearsAfter(dayKey: string, years: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y!, (m! - 1), d!);
  date.setFullYear(date.getFullYear() + years);
  return localDayKey(date);
}
