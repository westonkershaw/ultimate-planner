/**
 * relationship-status.test.ts — coverage for the engaged -> newlywed -> married
 * cascade and the Feb-29-safe first-anniversary key.
 *
 * Deterministic by construction: every "today" is a fixed local-time
 * `new Date(y, m - 1, d)` literal (never wall-clock `new Date()`), so
 * expectations hold under any host timezone.
 */
import { describe, expect, it } from 'vitest';
import { firstAnniversaryKey, resolveRelationshipStatus } from '../relationship-status';

/** Local-midnight Date from a YYYY-MM-DD string, matching the module's own convention. */
function localDate(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

describe('firstAnniversaryKey', () => {
  it('returns the same month/day one year later for a non-leap-day wedding', () => {
    expect(firstAnniversaryKey('2025-06-12')).toBe('2026-06-12');
  });

  it('lands on the next real calendar day (Mar 1) when the wedding was on Feb 29', () => {
    expect(firstAnniversaryKey('2024-02-29')).toBe('2025-03-01');
  });

  it('is unaffected by leap-day edge cases for an ordinary date near year end/start', () => {
    expect(firstAnniversaryKey('2025-03-15')).toBe('2026-03-15');
  });
});

describe('resolveRelationshipStatus — null/no-wedding-date passthrough', () => {
  it('returns null when stored status is null, regardless of wedding date', () => {
    expect(resolveRelationshipStatus(null, '2025-06-12', localDate('2025-06-12'))).toBeNull();
    expect(resolveRelationshipStatus(null, null, localDate('2025-06-12'))).toBeNull();
  });

  it('returns stored "engaged" unchanged when weddingDate is null (nothing to cascade on)', () => {
    expect(resolveRelationshipStatus('engaged', null, localDate('2025-06-12'))).toBe('engaged');
  });

  it('returns stored "newlywed" unchanged when weddingDate is null', () => {
    expect(resolveRelationshipStatus('newlywed', null, localDate('2025-06-12'))).toBe('newlywed');
  });
});

describe('resolveRelationshipStatus — engaged -> newlywed boundary', () => {
  const weddingDate = '2025-06-12';

  it('stays "engaged" the day before the wedding', () => {
    const today = localDate('2025-06-11');
    expect(resolveRelationshipStatus('engaged', weddingDate, today)).toBe('engaged');
  });

  it('becomes "newlywed" exactly on the wedding day', () => {
    const today = localDate('2025-06-12');
    expect(resolveRelationshipStatus('engaged', weddingDate, today)).toBe('newlywed');
  });

  it('is at least "newlywed" the day after the wedding', () => {
    const today = localDate('2025-06-13');
    const result = resolveRelationshipStatus('engaged', weddingDate, today);
    expect(result === 'newlywed' || result === 'married').toBe(true);
  });
});

describe('resolveRelationshipStatus — newlywed -> married boundary', () => {
  const weddingDate = '2025-06-12';
  const anniversary = firstAnniversaryKey(weddingDate); // '2026-06-12'

  it('stays "newlywed" the day before the first anniversary', () => {
    const dayBefore = localDate('2026-06-11');
    expect(anniversary).toBe('2026-06-12');
    expect(resolveRelationshipStatus('newlywed', weddingDate, dayBefore)).toBe('newlywed');
  });

  it('becomes "married" exactly on the first anniversary', () => {
    const today = localDate(anniversary);
    expect(resolveRelationshipStatus('newlywed', weddingDate, today)).toBe('married');
  });
});

describe('resolveRelationshipStatus — cascade in a single call', () => {
  it('resolves stored "engaged" straight through to "married" when the wedding was ~2 years ago', () => {
    // Wedding two years before "today" — both the newlywed and married
    // thresholds have long since passed, so a single call must cascade
    // through both steps rather than stopping at "newlywed".
    const weddingDate = '2024-01-10';
    const today = localDate('2026-01-10');
    expect(resolveRelationshipStatus('engaged', weddingDate, today)).toBe('married');
  });
});

describe('resolveRelationshipStatus — Feb 29 wedding date', () => {
  const weddingDate = '2024-02-29';

  it('anniversary key resolves to 2025-03-01 (2025 is not a leap year)', () => {
    expect(firstAnniversaryKey(weddingDate)).toBe('2025-03-01');
  });

  it('stays "newlywed" on 2025-02-28 (day before the rolled-forward anniversary)', () => {
    const today = localDate('2025-02-28');
    expect(resolveRelationshipStatus('newlywed', weddingDate, today)).toBe('newlywed');
  });

  it('becomes "married" on 2025-03-01 (the rolled-forward anniversary day)', () => {
    const today = localDate('2025-03-01');
    expect(resolveRelationshipStatus('newlywed', weddingDate, today)).toBe('married');
  });
});

describe('resolveRelationshipStatus — terminal/independent statuses pass through unchanged', () => {
  const weddingDate = '2025-06-12';
  const today = localDate('2027-01-01'); // long after any cascade threshold

  it.each(['past', 'interested', 'dating', 'married'] as const)(
    'returns "%s" unchanged regardless of weddingDate/today',
    (status) => {
      expect(resolveRelationshipStatus(status, weddingDate, today)).toBe(status);
      expect(resolveRelationshipStatus(status, null, today)).toBe(status);
    }
  );
});
