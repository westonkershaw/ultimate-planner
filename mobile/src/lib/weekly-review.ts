/**
 * weekly-review.ts — PURE logic for the weekly review/planning wizard
 * (Roadmap Phase 4b). Imports nothing but block-types/block-engine,
 * goals-types/goal-engine, and time-policy — no react, no supabase — so it
 * stays testable under a plain Node/vitest runner, same discipline as
 * block-engine.ts / goal-engine.ts. Day-boundary math is never reimplemented
 * here; it's delegated to time-policy and the existing engines.
 */

import { blocksForRange, completionSummary, type CompletionSummary } from './block-engine';
import type { Block } from './block-types';
import { sumInWindow } from './goal-engine';
import type { Goal, ProgressEvent } from './goals-types';
import { addLocalDays, localDayKey, startOfLocalWeek } from './time-policy';

export interface WeekRange {
  fromDayKey: string;
  toDayKey: string;
}

/**
 * Local Monday-through-Sunday week immediately before the week containing
 * `today`. Built on `startOfLocalWeek` (time-policy) rather than reimplementing
 * Monday math.
 */
export function previousWeekRange(today: Date): WeekRange {
  const thisMonday = startOfLocalWeek(today);
  const previousMonday = addLocalDays(thisMonday, -7);
  const previousSunday = addLocalDays(thisMonday, -1);
  return {
    fromDayKey: localDayKey(previousMonday),
    toDayKey: localDayKey(previousSunday),
  };
}

/**
 * Block completion summary for whichever blocks fall inside `range`.
 * Delegates filtering to blocksForRange and counting to completionSummary —
 * no reimplementation of either.
 */
export function weeklyBlockSummary(blocks: readonly Block[], range: WeekRange): CompletionSummary {
  const inRange = blocksForRange(blocks, range.fromDayKey, range.toDayKey);
  return completionSummary(inRange);
}

export interface WeeklyGoalRecapEntry {
  goalId: string;
  title: string;
  lifeArea: Goal['lifeArea'];
  progress: number;
}

/**
 * One entry per active (non-archived) goal, each with the progress amount
 * logged specifically within `range` — computed via goal-engine's
 * `sumInWindow` rather than a new summation.
 */
export function weeklyGoalRecap(
  goals: readonly Goal[],
  events: readonly ProgressEvent[],
  range: WeekRange
): WeeklyGoalRecapEntry[] {
  const activeGoals = goals.filter((g) => g.archivedAt === null);
  return activeGoals.map((goal) => {
    const goalEvents = events.filter((e) => e.goalId === goal.id);
    return {
      goalId: goal.id,
      title: goal.title,
      lifeArea: goal.lifeArea,
      progress: sumInWindow(goalEvents, range.fromDayKey, range.toDayKey),
    };
  });
}
