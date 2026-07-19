/**
 * category-flip.test.ts — truth table for flipRequiresConfirm. Deterministic:
 * pure function of three enum-ish inputs, no dates/clocks involved.
 */
import { describe, expect, it } from 'vitest';

import { flipRequiresConfirm } from '../category-flip';
import { RELATIONSHIP_STATUSES } from '../people-types';

describe('flipRequiresConfirm', () => {
  it('requires confirm when leaving dating with a status set (dating -> friend)', () => {
    expect(flipRequiresConfirm('dating', 'friend', 'interested')).toBe(true);
  });

  it('does not require confirm when leaving dating with no status set (dating -> family)', () => {
    expect(flipRequiresConfirm('dating', 'family', null)).toBe(false);
  });

  it('does not require confirm for a same-category no-op (dating -> dating)', () => {
    expect(flipRequiresConfirm('dating', 'dating', 'married')).toBe(false);
  });

  it('does not require confirm when entering dating (friend -> dating)', () => {
    expect(flipRequiresConfirm('friend', 'dating', null)).toBe(false);
  });

  it('does not require confirm for a non-dating-involved flip (family -> friend)', () => {
    expect(flipRequiresConfirm('family', 'friend', null)).toBe(false);
  });

  it.each(RELATIONSHIP_STATUSES)(
    'requires confirm leaving dating -> friend with status "%s" set',
    (status) => {
      expect(flipRequiresConfirm('dating', 'friend', status)).toBe(true);
    }
  );
});
