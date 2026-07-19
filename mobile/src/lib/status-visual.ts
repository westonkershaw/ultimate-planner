/**
 * status-visual.ts — pure mapping from a resolved RelationshipStatus to its
 * display treatment (shape/color/fill/label) for the Dating list and detail
 * screens. No react-native imports: just a lookup over color tokens (from
 * constants/palette.ts, which itself has no react-native/global.css import),
 * testable in isolation like people-grouping.ts.
 */

import { StatusColors } from '@/constants/palette';

import type { RelationshipStatus } from './people-types';

export type StatusShape = 'dot' | 'star';

export interface StatusVisual {
  shape: StatusShape;
  color: string;
  filled: boolean;
  celebratory?: boolean;
  label: string;
}

/**
 * `resolved` should already be the cascade-resolved status (via
 * resolveRelationshipStatus), not the raw stored value — 'newlywed' gets its
 * own celebratory treatment distinct from steady-state 'married'.
 */
export function statusVisual(resolved: RelationshipStatus | null): StatusVisual {
  switch (resolved) {
    case 'past':
      return { shape: 'dot', color: StatusColors.past, filled: true, label: 'Past' };
    case 'interested':
      return { shape: 'dot', color: StatusColors.interested, filled: true, label: 'Interested' };
    case 'dating':
      return { shape: 'dot', color: StatusColors.dating, filled: true, label: 'Dating' };
    case 'engaged':
      return { shape: 'star', color: StatusColors.lightBlue, filled: false, label: 'Engaged' };
    case 'newlywed':
      return {
        shape: 'dot',
        color: StatusColors.lightBlue,
        filled: true,
        celebratory: true,
        label: 'Newlywed',
      };
    case 'married':
      return { shape: 'dot', color: StatusColors.darkBlue, filled: true, label: 'Married' };
    case null:
      return { shape: 'dot', color: StatusColors.muted, filled: false, label: '' };
  }
}
