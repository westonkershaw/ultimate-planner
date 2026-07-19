/**
 * people-grouping.test.ts — coverage for the Friends & Family recency
 * bucketing, the Dating status ordering, the wedding countdown, and the
 * status -> visual mapping (status-visual.ts).
 *
 * Deterministic by construction: every "today" and `lastContactAt` is built
 * from a fixed local-time `new Date(y, m - 1, d)` literal (never wall-clock
 * `new Date()`), and `lastContactAt` ISO strings are derived via
 * `localDayKey`/`Date` construction rather than hand-written UTC strings, so
 * expectations hold under any host timezone.
 */
import { describe, expect, it } from 'vitest';

import {
  contactRecencyBucket,
  DATING_STATUS_ORDER,
  datingSortRank,
  groupFriendsFamilyByRecency,
  sortDatingGroup,
  weddingCountdownDays,
} from '../people-grouping';
import type { Person, RelationshipStatus } from '../people-types';

// NOTE: statusVisual cases live in ./status-visual.test.ts, not here — see the
// BUG note at the top of that file. status-visual.ts imports StatusColors from
// '@/constants/theme', which imports 'react-native' (Flow syntax) and
// '@/global.css'; neither parses under vitest's node environment, so any test
// file that imports status-visual.ts (even indirectly, as this file would if
// it imported statusVisual alongside these otherwise-independent grouping
// tests) fails to load as a *file*, taking every test in that file down with
// it — not just the status-visual assertions. Keeping it in its own file
// contains the blast radius to the tests that are actually about it.

/** Local-midnight Date from a YYYY-MM-DD string, matching the module's own convention. */
function localDate(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

/**
 * Builds an ISO timestamp that lands on `dayKey` when read back with
 * `localDayKey` in the host timezone. Uses local noon (not midnight) so the
 * instant is safely inside the local calendar day regardless of the host's
 * UTC offset — avoids re-deriving the "late evening west of UTC" trap by
 * hand while still round-tripping through the exact same Date construction
 * convention the source module uses.
 */
function lastContactOn(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0).toISOString();
}

let nextId = 0;
function makePerson(overrides: Partial<Person> = {}): Person {
  nextId += 1;
  return {
    id: `person-${nextId}`,
    userId: 'user-1',
    name: `Person ${nextId}`,
    photoUrl: null,
    category: 'friend',
    relationshipStatus: null,
    weddingDate: null,
    address: null,
    phone: null,
    email: null,
    socialLinks: [],
    latitude: null,
    longitude: null,
    lastContactAt: null,
    birthday: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const TODAY = localDate('2026-07-19');

describe('contactRecencyBucket', () => {
  it('buckets null lastContactAt as out-of-touch', () => {
    expect(contactRecencyBucket(null, TODAY)).toBe('out-of-touch');
  });

  it('buckets contact today (0 days) as in-touch', () => {
    expect(contactRecencyBucket(lastContactOn('2026-07-19'), TODAY)).toBe('in-touch');
  });

  it('buckets exactly 14 days ago as in-touch (inclusive boundary)', () => {
    expect(contactRecencyBucket(lastContactOn('2026-07-05'), TODAY)).toBe('in-touch');
  });

  it('buckets 15 days ago as warming-up (one past the in-touch boundary)', () => {
    expect(contactRecencyBucket(lastContactOn('2026-07-04'), TODAY)).toBe('warming-up');
  });

  it('buckets exactly 42 days ago as warming-up (inclusive boundary)', () => {
    expect(contactRecencyBucket(lastContactOn('2026-06-07'), TODAY)).toBe('warming-up');
  });

  it('buckets 43 days ago as out-of-touch (one past the warming-up boundary)', () => {
    expect(contactRecencyBucket(lastContactOn('2026-06-06'), TODAY)).toBe('out-of-touch');
  });
});

describe('groupFriendsFamilyByRecency', () => {
  it('excludes category "dating" entirely', () => {
    const dater = makePerson({ name: 'Dana', category: 'dating', lastContactAt: lastContactOn('2026-07-19') });
    const friend = makePerson({ name: 'Fred', category: 'friend', lastContactAt: lastContactOn('2026-07-19') });

    const groups = groupFriendsFamilyByRecency([dater, friend], TODAY);
    const allPeople = groups.flatMap((g) => g.people);

    expect(allPeople.map((p) => p.name)).toEqual(['Fred']);
  });

  it('returns all three buckets in fixed order even when every bucket is empty', () => {
    const groups = groupFriendsFamilyByRecency([], TODAY);
    expect(groups.map((g) => g.bucket)).toEqual(['in-touch', 'warming-up', 'out-of-touch']);
    expect(groups.every((g) => g.people.length === 0)).toBe(true);
  });

  it('places each person in the correct bucket', () => {
    const inTouch = makePerson({ name: 'Ivy', category: 'friend', lastContactAt: lastContactOn('2026-07-19') });
    const warmingUp = makePerson({
      name: 'Wade',
      category: 'family',
      lastContactAt: lastContactOn('2026-07-04'),
    });
    const outOfTouch = makePerson({ name: 'Otto', category: 'friend', lastContactAt: null });

    const groups = groupFriendsFamilyByRecency([warmingUp, outOfTouch, inTouch], TODAY);
    const byBucket = Object.fromEntries(groups.map((g) => [g.bucket, g.people.map((p) => p.name)]));

    expect(byBucket['in-touch']).toEqual(['Ivy']);
    expect(byBucket['warming-up']).toEqual(['Wade']);
    expect(byBucket['out-of-touch']).toEqual(['Otto']);
  });

  it('sorts people within a group by name ascending', () => {
    const zara = makePerson({ name: 'Zara', category: 'friend', lastContactAt: null });
    const alex = makePerson({ name: 'Alex', category: 'friend', lastContactAt: null });
    const mona = makePerson({ name: 'Mona', category: 'family', lastContactAt: null });

    const groups = groupFriendsFamilyByRecency([zara, alex, mona], TODAY);
    const outOfTouch = groups.find((g) => g.bucket === 'out-of-touch')!;

    expect(outOfTouch.people.map((p) => p.name)).toEqual(['Alex', 'Mona', 'Zara']);
  });
});

describe('datingSortRank', () => {
  it('orders married < newlywed < engaged < dating < interested < past < null', () => {
    const statuses: (RelationshipStatus | null)[] = [
      'married',
      'newlywed',
      'engaged',
      'dating',
      'interested',
      'past',
      null,
    ];
    const ranks = statuses.map(datingSortRank);

    for (let i = 1; i < ranks.length; i += 1) {
      expect(ranks[i]).toBeGreaterThan(ranks[i - 1]!);
    }
  });

  it('matches the exported DATING_STATUS_ORDER exactly', () => {
    DATING_STATUS_ORDER.forEach((status, index) => {
      expect(datingSortRank(status)).toBe(index);
    });
    expect(datingSortRank(null)).toBe(DATING_STATUS_ORDER.length);
  });
});

describe('sortDatingGroup', () => {
  it('only includes category "dating" people', () => {
    const dater = makePerson({ name: 'Dana', category: 'dating', relationshipStatus: 'dating' });
    const friend = makePerson({ name: 'Fred', category: 'friend', relationshipStatus: 'dating' });

    const sorted = sortDatingGroup([friend, dater], TODAY);
    expect(sorted.map((p) => p.name)).toEqual(['Dana']);
  });

  it('orders by resolved status rank: married, newlywed, engaged, dating, interested, past, null', () => {
    const married = makePerson({ name: 'Married Mo', category: 'dating', relationshipStatus: 'married' });
    const newlywed = makePerson({ name: 'Newly Nia', category: 'dating', relationshipStatus: 'newlywed' });
    const engaged = makePerson({
      name: 'Engaged Ed',
      category: 'dating',
      relationshipStatus: 'engaged',
      weddingDate: '2027-01-01', // far future — stays engaged
    });
    const dating = makePerson({ name: 'Dating Dee', category: 'dating', relationshipStatus: 'dating' });
    const interested = makePerson({ name: 'Interested Ian', category: 'dating', relationshipStatus: 'interested' });
    const past = makePerson({ name: 'Past Pat', category: 'dating', relationshipStatus: 'past' });
    const unset = makePerson({ name: 'Unset Uma', category: 'dating', relationshipStatus: null });

    const sorted = sortDatingGroup([unset, past, interested, dating, engaged, newlywed, married], TODAY);

    expect(sorted.map((p) => p.name)).toEqual([
      'Married Mo',
      'Newly Nia',
      'Engaged Ed',
      'Dating Dee',
      'Interested Ian',
      'Past Pat',
      'Unset Uma',
    ]);
  });

  it('resolves stored status through the wedding-date cascade before ranking (engaged whose wedding already passed sorts as newlywed/married)', () => {
    // Wedding was over a year ago -> cascades all the way to 'married' by TODAY.
    const stillMarriedByCascade = makePerson({
      name: 'Cascaded Cara',
      category: 'dating',
      relationshipStatus: 'engaged',
      weddingDate: '2024-01-01',
    });
    // Wedding was recent (within the last year) -> cascades to 'newlywed'.
    const newlywedByCascade = makePerson({
      name: 'Cascaded Noa',
      category: 'dating',
      relationshipStatus: 'engaged',
      weddingDate: '2026-06-01',
    });
    // Wedding hasn't happened yet -> stays 'engaged'.
    const stillEngaged = makePerson({
      name: 'Cascaded Ezra',
      category: 'dating',
      relationshipStatus: 'engaged',
      weddingDate: '2027-01-01',
    });

    const sorted = sortDatingGroup([stillEngaged, newlywedByCascade, stillMarriedByCascade], TODAY);

    // Married-by-cascade ranks first, newlywed-by-cascade second, still-engaged last —
    // proving the sort uses resolveRelationshipStatus, not the raw stored 'engaged'.
    expect(sorted.map((p) => p.name)).toEqual(['Cascaded Cara', 'Cascaded Noa', 'Cascaded Ezra']);
  });

  it('breaks ties within the same resolved status by name ascending', () => {
    const zoe = makePerson({ name: 'Zoe', category: 'dating', relationshipStatus: 'dating' });
    const amy = makePerson({ name: 'Amy', category: 'dating', relationshipStatus: 'dating' });

    const sorted = sortDatingGroup([zoe, amy], TODAY);
    expect(sorted.map((p) => p.name)).toEqual(['Amy', 'Zoe']);
  });
});

describe('weddingCountdownDays', () => {
  it('returns a positive whole-day count for a future wedding', () => {
    expect(weddingCountdownDays('2026-08-18', TODAY)).toBe(30);
  });

  it('returns 0 when the wedding is today', () => {
    expect(weddingCountdownDays('2026-07-19', TODAY)).toBe(0);
  });

  it('returns a negative count for a wedding already in the past', () => {
    expect(weddingCountdownDays('2026-07-05', TODAY)).toBe(-14);
  });

  it('returns null when there is no wedding date', () => {
    expect(weddingCountdownDays(null, TODAY)).toBeNull();
  });
});

