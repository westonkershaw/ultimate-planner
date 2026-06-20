/**
 * goalMilestones.ts
 *
 * Pure functions for goal milestone detection and deposit streak calculation.
 */

import type { Deposit, FinanceGoal } from '@/types';
import { calcGoalProgress } from './financeEngine';

const MILESTONES = [25, 50, 75, 100];

/**
 * Return the list of milestone thresholds that a goal has crossed.
 */
export function calcMilestonesReached(goal: FinanceGoal): number[] {
  const pct = calcGoalProgress(goal);
  return MILESTONES.filter((m) => pct >= m);
}

/**
 * Detect if a new milestone was just crossed by comparing previous and current progress.
 * Returns the highest new milestone, or null if none.
 */
export function getNewMilestone(prevPct: number, currentPct: number): number | null {
  const newMilestones = MILESTONES.filter((m) => prevPct < m && currentPct >= m);
  return newMilestones.length > 0 ? newMilestones[newMilestones.length - 1]! : null;
}

/**
 * Calculate consecutive months with at least one deposit.
 * Counts backwards from the current month.
 */
export function calcDepositStreak(deposits: Deposit[]): number {
  if (deposits.length === 0) return 0;

  const now = new Date();
  let streak = 0;
  let checkMonth = now.getMonth();
  let checkYear = now.getFullYear();

  for (let i = 0; i < 60; i++) {
    const hasDeposit = deposits.some((d) => {
      const date = new Date(d.date);
      return date.getMonth() === checkMonth && date.getFullYear() === checkYear;
    });

    if (!hasDeposit) break;
    streak++;

    // Move to previous month
    checkMonth--;
    if (checkMonth < 0) {
      checkMonth = 11;
      checkYear--;
    }
  }

  return streak;
}
