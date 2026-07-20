/**
 * block-engine.ts — PURE logic for scheduled time blocks (Roadmap Phase 4a).
 * Imports nothing but block-types so it stays testable under a plain Node
 * test runner, same discipline as goal-engine.ts / dashboard-engine.ts. Day
 * keys are always DEVICE-LOCAL (time-policy) — this module never computes
 * them, it only compares the strings it's handed.
 */

import type { Block } from './block-types';

/**
 * Blocks scheduled on `dayKey`, ordered for display: blocks WITH a
 * `startTime` first, chronological; then blocks WITHOUT a `startTime`,
 * alphabetical by title.
 */
export function blocksForDay(blocks: readonly Block[], dayKey: string): Block[] {
  const dayBlocks = blocks.filter((b) => b.scheduledOn === dayKey);

  const timed = dayBlocks.filter((b) => b.startTime !== null);
  const untimed = dayBlocks.filter((b) => b.startTime === null);

  timed.sort((a, b) => a.startTime!.localeCompare(b.startTime!));
  untimed.sort((a, b) => a.title.localeCompare(b.title));

  return [...timed, ...untimed];
}

/**
 * Blocks whose scheduledOn falls within [fromDayKey, toDayKey] inclusive.
 * Day keys are zero-padded YYYY-MM-DD, so plain string comparison is
 * lexicographically equivalent to chronological comparison.
 */
export function blocksForRange(
  blocks: readonly Block[],
  fromDayKey: string,
  toDayKey: string
): Block[] {
  return blocks.filter((b) => b.scheduledOn >= fromDayKey && b.scheduledOn <= toDayKey);
}

export interface CompletionSummary {
  done: number;
  total: number;
}

/**
 * Simple done/total aggregation over whatever blocks the caller passes in —
 * no day filtering here, callers combine this with blocksForDay/blocksForRange.
 */
export function completionSummary(blocks: readonly Block[]): CompletionSummary {
  const total = blocks.length;
  const done = blocks.filter((b) => b.completedAt !== null).length;
  return { done, total };
}

/**
 * Groups blocks by their scheduledOn day key, each day's array run through
 * blocksForDay for consistent ordering. Useful for the weekly wizard, which
 * needs every day of a week laid out at once.
 */
export function groupBlocksByDay(blocks: readonly Block[]): Record<string, Block[]> {
  const dayKeys = new Set(blocks.map((b) => b.scheduledOn));
  const grouped: Record<string, Block[]> = {};
  for (const dayKey of dayKeys) {
    grouped[dayKey] = blocksForDay(blocks, dayKey);
  }
  return grouped;
}
