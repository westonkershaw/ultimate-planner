/**
 * relationship-status.ts — pure relationship-status cascade logic for the
 * People tab. No react/supabase imports: this is math over day-key strings,
 * testable in isolation like goal-engine.ts.
 *
 * All "today" semantics come from time-policy's localDayKey (DEVICE-LOCAL
 * timezone, never UTC) — callers pass a `today: Date` and this module never
 * reads the wall clock itself.
 */

import type { RelationshipStatus } from './people-types';
import { localDayKey } from './time-policy';

/**
 * The day-key exactly one year after `weddingDate` ('YYYY-MM-DD'), used to
 * cascade 'newlywed' -> 'married'.
 *
 * Pure integer arithmetic on the Y-M-D parts — deliberately does NOT build a
 * Date from the string (avoids any UTC/local parsing ambiguity for date-only
 * strings). Comparisons elsewhere are lexicographic on the zero-padded
 * YYYY-MM-DD result, which is valid because the month/day are unchanged.
 *
 * Feb-29 rule: if weddingDate falls on Feb 29 (a leap day) and year+1 is NOT
 * a leap year, there is no Feb 29 to land on the following year — we return
 * `(year+1)-03-01`, the next real calendar day, rather than silently
 * rolling to Feb 28 (which would under-count by a day) or throwing.
 */
export function firstAnniversaryKey(weddingDate: string): string {
  const [yearStr, monthStr, dayStr] = weddingDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const nextYear = year + 1;

  if (month === 2 && day === 29 && !isLeapYear(nextYear)) {
    return `${pad4(nextYear)}-03-01`;
  }

  return `${pad4(nextYear)}-${pad2(month)}-${pad2(day)}`;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function pad4(n: number): string {
  return String(n).padStart(4, '0');
}

/**
 * Resolves the display-worthy relationship status given the stored value and
 * the person's wedding date, cascading engaged -> newlywed -> married as
 * time passes. Contract:
 *   - stored === null            -> null (no status to resolve)
 *   - weddingDate === null       -> stored, unchanged (nothing to cascade on)
 *   - otherwise, cascade in order: engaged -> newlywed (once today >= wedding
 *     day), then newlywed -> married (once today >= first anniversary). A
 *     wedding date more than a year in the past resolves straight through
 *     both steps to 'married' in one call.
 *   - 'past' | 'interested' | 'dating' | 'married' pass through unchanged.
 */
export function resolveRelationshipStatus(
  stored: RelationshipStatus | null,
  weddingDate: string | null,
  today: Date
): RelationshipStatus | null {
  if (stored === null) return null;
  if (weddingDate === null) return stored;

  const todayKey = localDayKey(today);
  let status = stored;

  if (status === 'engaged' && todayKey >= weddingDate) {
    status = 'newlywed';
  }
  if (status === 'newlywed' && todayKey >= firstAnniversaryKey(weddingDate)) {
    status = 'married';
  }

  return status;
}
