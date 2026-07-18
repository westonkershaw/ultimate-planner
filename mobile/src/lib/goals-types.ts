/**
 * goals-types.ts — camelCase domain models for the goals engine, plus the
 * typed snake_case Row shapes returned by Supabase and the mappers between
 * them. Mirrors supabase/migrations/20260718170000_goals_engine.sql exactly.
 */

export const LIFE_AREAS = ['finance', 'spiritual', 'mental', 'social', 'physical'] as const;
export type LifeArea = (typeof LIFE_AREAS)[number];

export const LIFE_AREA_LABELS: Record<LifeArea, string> = {
  finance: 'Finance',
  spiritual: 'Spiritual',
  mental: 'Mental',
  social: 'Social',
  physical: 'Physical',
};

export type MetricType = 'currency' | 'count' | 'streak' | 'numeric';

export type Cadence = 'daily' | 'weekly' | 'monthly';

/** 'progressing' if there's a logged event in the current or previous cadence window, else 'needs_attention'. */
export type GoalStatus = 'progressing' | 'needs_attention';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  lifeArea: LifeArea;
  metricType: MetricType;
  targetValue: number;
  unit: string | null;
  cadence: Cadence;
  targetDate: string | null; // YYYY-MM-DD, nullable milestone deadline
  archivedAt: string | null; // ISO timestamp; null = active
  createdAt: string;
  updatedAt: string;
}

export interface ProgressEvent {
  id: string;
  goalId: string;
  userId: string;
  amount: number; // signed increment, never 0
  occurredOn: string; // DEVICE-LOCAL day key (YYYY-MM-DD) from time-policy
  occurredAt: string; // ISO timestamp, exact instant for ordering/audit
  note: string | null;
  createdAt: string;
}

/** Raw `goals` row shape as returned by Supabase (snake_case). */
export interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  life_area: LifeArea;
  metric_type: MetricType;
  target_value: number;
  unit: string | null;
  cadence: Cadence;
  target_date: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Raw `goal_progress_events` row shape as returned by Supabase (snake_case). */
export interface ProgressEventRow {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  occurred_on: string;
  occurred_at: string;
  note: string | null;
  created_at: string;
}

export function goalFromRow(row: GoalRow): Goal {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    lifeArea: row.life_area,
    metricType: row.metric_type,
    targetValue: row.target_value,
    unit: row.unit,
    cadence: row.cadence,
    targetDate: row.target_date,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function eventFromRow(row: ProgressEventRow): ProgressEvent {
  return {
    id: row.id,
    goalId: row.goal_id,
    userId: row.user_id,
    amount: row.amount,
    occurredOn: row.occurred_on,
    occurredAt: row.occurred_at,
    note: row.note,
    createdAt: row.created_at,
  };
}
