/**
 * profile.types.ts
 *
 * The recursive per-user learning profile — a compact, versioned snapshot of
 * who the user is and what actually works for them. It is the single source of
 * truth (stored server-side in Supabase, cached locally) that both the website
 * and the App Store wrapper read/write through the same API, so phone and web
 * never diverge.
 *
 * Design rules:
 *  - Stays SMALL: aggregates + a capped, ranked insight list — never a raw log.
 *  - Deterministic: derived by heuristics (see utils/profileEngine.ts), no LLM.
 *  - Overridable: anything the user pins in `overrides` is never overwritten by
 *    the learn step, so wrong assumptions are always easy to fix.
 *  - Versioned: `schemaVersion` + a safe, additive migration on read.
 */

import type { ID } from './common.types';

/** Bump when the profile shape changes; `migrateProfile` upgrades older rows. */
export const PROFILE_SCHEMA_VERSION = 1 as const;

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

/** Coarse category label — matches LifeCategory where possible, but kept as a
 *  plain string so task/finance categories can flow in without a hard coupling. */
export type ProfileCategory = string;

// ── Events (the raw signal, append-only) ────────────────────────────────────

export type LearningEventType =
  | 'goal_set'
  | 'goal_edited'
  | 'goal_completed'
  | 'task_completed'
  | 'task_skipped'
  | 'plan_accepted'
  | 'plan_edited'
  | 'plan_rejected'
  | 'week_reviewed'
  | 'month_reviewed';

/**
 * A single lightweight signal captured at a natural moment. Payloads stay tiny
 * (a category, an hour, a rating) — never full entities.
 */
export interface LearningEvent {
  id: ID;
  userId: string;
  /** ISO timestamp (client local converted to UTC). */
  ts: string;
  type: LearningEventType;
  payload: LearningEventPayload;
}

/** Union of the small fields any event may carry. All optional by design. */
export interface LearningEventPayload {
  category?: ProfileCategory;
  /** Local hour 0–23 the action happened / is scheduled for. */
  hour?: number;
  /** Local weekday short name, e.g. 'Mon'. */
  weekday?: string;
  /** 1–5 review rating. */
  rating?: number;
  /** For plan_* events: how many items were in the plan. */
  itemCount?: number;
  /** For plan_edited: how many suggested items were kept vs changed. */
  keptCount?: number;
  goalId?: ID;
  goalTitle?: string;
}

// ── Profile sub-shapes ──────────────────────────────────────────────────────

export interface ProfileGoal {
  id: ID;
  title: string;
  category: ProfileCategory;
  why?: string;
}

export interface ProfileIdentity {
  /** What the user says matters (e.g. ['health','family']). User-authored. */
  values: string[];
  goals: ProfileGoal[];
}

export interface ProfilePreferences {
  /** Weekday short names the user actually plans on (e.g. ['Sun']). */
  planningDays: string[];
  /** Learned local hour for the planning nudge, or null if unknown. */
  planningHour: number | null;
  /** Categories they follow through on — surfaced first in suggestions. */
  preferredCategories: ProfileCategory[];
  /** Categories they repeatedly skip — de-prioritised, never nagged. */
  avoidCategories: ProfileCategory[];
  /** How detailed their plans tend to be. */
  weeklyPlanningStyle: 'light' | 'balanced' | 'detailed' | null;
}

export interface CategoryCompletion {
  done: number;
  skipped: number;
  /** done / (done + skipped), 0–1. */
  rate: number;
}

export interface TimeCompletion {
  rate: number;
  /** Sample size behind `rate`. */
  n: number;
}

export interface ProfileBehavior {
  completionByCategory: Record<ProfileCategory, CategoryCompletion>;
  completionByTimeOfDay: Record<TimeOfDay, TimeCompletion>;
  /** Weekday short name → follow-through rate 0–1. */
  followThroughByWeekday: Record<string, number>;
  /** Mean of week/month review ratings, or null. */
  avgReviewRating: number | null;
  /** % of accepted plan items later completed, 0–1, or null. */
  planAdherence: number | null;
}

export type InsightKind = 'works' | 'avoid' | 'pattern';

export interface LearnedInsight {
  id: ID;
  text: string;
  kind: InsightKind;
  /** 0–1 — how strongly the data supports this. */
  confidence: number;
  /** How many events back this insight; used for ranking + decay. */
  evidenceCount: number;
  updatedAt: string;
}

// ── The profile ─────────────────────────────────────────────────────────────

export interface LearnedProfile {
  schemaVersion: typeof PROFILE_SCHEMA_VERSION;
  userId: string;
  updatedAt: string;
  identity: ProfileIdentity;
  preferences: ProfilePreferences;
  behavior: ProfileBehavior;
  /** Capped, ranked "what works / what to avoid / patterns". */
  insights: LearnedInsight[];
  /**
   * Dot-path keys the user manually pinned (e.g. 'preferences.planningHour').
   * The learn step will never overwrite these — user intent wins.
   */
  overrides: Record<string, unknown>;
}

// ── Plan suggestions (the closed loop) ──────────────────────────────────────

/** One suggested day inside a pre-filled week plan. */
export interface SuggestedDay {
  /** 0 = Monday … 6 = Sunday. */
  dayIndex: number;
  intention: string;
  category: ProfileCategory;
  /** 1–5 suggested focus/energy level. */
  energyLevel: number;
  /** Why this was suggested — shown as a one-line rationale in the empty state. */
  rationale: string;
}

export interface SuggestedWeekPlan {
  days: SuggestedDay[];
  /** A short, honest summary of what drove the suggestions. */
  basis: string;
}

/** One suggested focus for a month plan. */
export interface SuggestedFocus {
  category: ProfileCategory;
  focus: string;
  rationale: string;
}

export interface SuggestedMonthPlan {
  focuses: SuggestedFocus[];
  basis: string;
}
