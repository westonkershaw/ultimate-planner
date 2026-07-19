/**
 * category-flip.ts — PURE decision logic for the category segmented-control
 * flip (Phase 3c). Deciding whether a category change needs a confirmation
 * dialog is the only thing that lives here; the dialog copy and the actual
 * mutation calls live in use-category-flip.ts (UI layer).
 */

import type { Category, RelationshipStatus } from './people-types';

/** What the user chose in the "Keep dating history?" confirmation. */
export type FlipChoice = 'keep' | 'clear';

/**
 * True only when the flip is *leaving* 'dating' for something else while a
 * relationship status is still set on the person — that's the one case where
 * silently keeping (now-hidden) dating history vs. clearing it is a real,
 * irreversible-feeling choice worth asking about. Every other transition
 * (staying in 'dating', entering 'dating', or leaving it with no status set)
 * is safe to apply instantly.
 */
export function flipRequiresConfirm(
  currentCategory: Category,
  newCategory: Category,
  relationshipStatus: RelationshipStatus | null
): boolean {
  return currentCategory === 'dating' && newCategory !== 'dating' && relationshipStatus != null;
}
