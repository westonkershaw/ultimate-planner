/**
 * people-grouping.ts — pure grouping/sorting helpers for the People tab's
 * Friends & Family (recency-bucketed) and Dating (status-ordered) views.
 *
 * No react/supabase imports: math over Person[] + day-key strings, testable
 * in isolation like relationship-status.ts. All "today" semantics come from
 * time-policy's local day helpers (DEVICE-LOCAL timezone, never UTC) —
 * callers pass a `today: Date` and this module never reads the wall clock.
 */

import type { Person, RelationshipStatus } from './people-types';
import { resolveRelationshipStatus } from './relationship-status';
import { localDayKey, localDaysBetween, startOfLocalDay } from './time-policy';

/**
 * Local-midnight Date from a 'YYYY-MM-DD' day-key string. Deliberately NOT
 * `new Date(dayKey)` — that parses as UTC midnight per spec, which silently
 * shifts to the previous local day for any timezone west of UTC (e.g.
 * '2026-07-19' reads back as local day 2026-07-18 in Honolulu). Matches the
 * same Y-M-D-parts convention as time-policy.ts's localYearsAfter.
 */
function localDateFromDayKey(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export const RECENCY_THRESHOLDS = {
  inTouchMaxDays: 14,
  warmingUpMaxDays: 42,
} as const;

export type RecencyBucket = 'in-touch' | 'warming-up' | 'out-of-touch';

/**
 * Buckets a person by how recently they were last contacted, in whole local
 * calendar days. `lastContactAt` is an ISO timestamp (not a day-only key), so
 * it's normalized to a local day key before diffing — this avoids any
 * UTC-vs-local shift from parsing the timestamp directly.
 */
export function contactRecencyBucket(
  lastContactAt: string | null,
  today: Date,
  cfg: { inTouchMaxDays: number; warmingUpMaxDays: number } = RECENCY_THRESHOLDS
): RecencyBucket {
  if (lastContactAt === null) return 'out-of-touch';

  const lastContactDayKey = localDayKey(new Date(lastContactAt));
  const days = localDaysBetween(localDateFromDayKey(lastContactDayKey), startOfLocalDay(today));

  if (days <= cfg.inTouchMaxDays) return 'in-touch';
  if (days <= cfg.warmingUpMaxDays) return 'warming-up';
  return 'out-of-touch';
}

export interface RecencyGroup {
  bucket: RecencyBucket;
  label: string;
  people: Person[];
}

const RECENCY_BUCKET_LABELS: Record<RecencyBucket, string> = {
  'in-touch': 'In Touch',
  'warming-up': 'Warming Up',
  'out-of-touch': 'Out of Touch',
};

const RECENCY_BUCKET_ORDER: RecencyBucket[] = ['in-touch', 'warming-up', 'out-of-touch'];

function byNameAsc(a: Person, b: Person): number {
  return a.name.localeCompare(b.name);
}

/**
 * Groups friend/family people (category !== 'dating') into the three recency
 * buckets, always returning all three groups in a fixed order (even empty
 * ones) so the UI can render stable section headers.
 */
export function groupFriendsFamilyByRecency(people: Person[], today: Date): RecencyGroup[] {
  const buckets: Record<RecencyBucket, Person[]> = {
    'in-touch': [],
    'warming-up': [],
    'out-of-touch': [],
  };

  for (const person of people) {
    if (person.category === 'dating') continue;
    const bucket = contactRecencyBucket(person.lastContactAt, today);
    buckets[bucket].push(person);
  }

  return RECENCY_BUCKET_ORDER.map((bucket) => ({
    bucket,
    label: RECENCY_BUCKET_LABELS[bucket],
    people: [...buckets[bucket]].sort(byNameAsc),
  }));
}

export const DATING_STATUS_ORDER: RelationshipStatus[] = [
  'married',
  'newlywed',
  'engaged',
  'dating',
  'interested',
  'past',
];

/** Index of `resolved` in DATING_STATUS_ORDER; null sorts last. */
export function datingSortRank(resolved: RelationshipStatus | null): number {
  if (resolved === null) return DATING_STATUS_ORDER.length;
  const index = DATING_STATUS_ORDER.indexOf(resolved);
  return index === -1 ? DATING_STATUS_ORDER.length : index;
}

/**
 * The `category === 'dating'` people, sorted by resolved relationship status
 * (married first, per DATING_STATUS_ORDER) then name asc within a status.
 */
export function sortDatingGroup(people: Person[], today: Date): Person[] {
  return people
    .filter((p) => p.category === 'dating')
    .sort((a, b) => {
      const rankA = datingSortRank(resolveRelationshipStatus(a.relationshipStatus, a.weddingDate, today));
      const rankB = datingSortRank(resolveRelationshipStatus(b.relationshipStatus, b.weddingDate, today));
      if (rankA !== rankB) return rankA - rankB;
      return byNameAsc(a, b);
    });
}

/**
 * Whole local calendar days from `today` to `weddingDate` (may be negative
 * if the wedding is in the past). Null when there's no wedding date to count
 * down to.
 */
export function weddingCountdownDays(weddingDate: string | null, today: Date): number | null {
  if (weddingDate === null) return null;
  return localDaysBetween(startOfLocalDay(today), localDateFromDayKey(weddingDate));
}
