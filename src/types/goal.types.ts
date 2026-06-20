/**
 * goal.types.ts
 *
 * Unified Goal model — one discriminated union to replace the legacy
 * yearlyGoals + financialGoals split. Progress is never stored; it is
 * derived from milestones / numeric entries / habit weeks via goalEngine.
 */

import type { ID, Timestamp } from './common.types';

// ── Life Categories ────────────────────────────────────────────────────────

/** The five life dimensions used app-wide (do not confuse with finance.types
 *  `GoalCategory`, which is a financial subcategory like 'savings'/'debt'). */
export type LifeCategory =
  | 'intellectual'
  | 'financial'
  | 'physical'
  | 'spiritual'
  | 'social';

// ── Sub-shapes ─────────────────────────────────────────────────────────────

export interface Milestone {
  id: ID;
  title: string;
  /** Relative weight — defaults to 1. Higher = counts for more of progress. */
  weight: number;
  done: boolean;
  doneAt?: Timestamp;
}

export interface NumericEntry {
  id: ID;
  date: string;
  /** Signed delta against the running total (positive = progress). */
  delta: number;
  note?: string;
}

export interface WeeklyFocus {
  /** ISO date of the Monday this focus is for. */
  weekOf: string;
  action: string;
  done: boolean;
}

// ── Kind-specific bodies ───────────────────────────────────────────────────

export interface NumericGoalBody {
  unit: string;
  /** Baseline value at goal creation. */
  start: number;
  /** Current value (start + Σ delta). Stored for resilience; reconciled by engine. */
  current: number;
  /** Target value. May be lower than `start` (e.g. weight loss). */
  target: number;
  entries: NumericEntry[];
}

export interface HabitGoalBody {
  /** References an entry in `d.kis` (key indicators). */
  kiId: ID;
  /** Per-week target (matches KI.weeklyGoal). */
  targetPerWeek: number;
  /** Number of qualifying weeks needed to "complete" the goal. */
  weeksTarget: number;
}

// ── Goal (discriminated by `kind`) ─────────────────────────────────────────

interface GoalBase {
  id: ID;
  title: string;
  description?: string;
  category: LifeCategory;
  /** Optional ISO target date — drives paceFor. */
  deadline?: string;
  archived?: boolean;
  createdAt: string;
  milestones: Milestone[];
  weeklyFocus: WeeklyFocus[];
}

export interface OutcomeGoal extends GoalBase {
  kind: 'outcome';
}

export interface NumericGoal extends GoalBase {
  kind: 'numeric';
  numeric: NumericGoalBody;
}

export interface HabitGoal extends GoalBase {
  kind: 'habit';
  habit: HabitGoalBody;
}

export type Goal = OutcomeGoal | NumericGoal | HabitGoal;

// ── Legacy shapes (read-only — for migration + shim only) ──────────────────

export interface LegacyYearlyGoalStep {
  id: ID;
  text: string;
  done: boolean;
}

export interface LegacyYearlyGoal {
  id: ID;
  title: string;
  category: LifeCategory;
  /** 0–100, manually set in the old UI. */
  progress: number;
  description?: string;
  /** Old name for deadline — usually an ISO date string. */
  target?: string;
  steps?: LegacyYearlyGoalStep[];
  weekSteps?: string;
  createdAt?: string;
  milestonesRequired?: boolean;
}

export interface LegacyFinancialDeposit {
  id: ID;
  amount: number;
  date: string;
  note?: string;
}

export interface LegacyFinancialGoal {
  id: ID;
  name: string;
  category?: string;
  targetAmount: number;
  saved: number;
  deadline?: string;
  notes?: string;
  deposits?: LegacyFinancialDeposit[];
}

// ── Pace status (returned by paceFor) ──────────────────────────────────────

export type PaceStatus = 'ahead' | 'on-track' | 'behind' | 'unknown';

export interface Pace {
  /** Expected progress 0–100 given time elapsed against the deadline. */
  expected: number;
  /** Actual progress 0–100 (cached from progressFor for convenience). */
  actual: number;
  status: PaceStatus;
}
