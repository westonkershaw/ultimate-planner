/**
 * block-types.ts — camelCase domain model for scheduled time blocks, plus the
 * typed snake_case Row shape returned by Supabase and the mapper between
 * them. Mirrors supabase/migrations/20260720120000_blocks.sql exactly.
 */

export interface Block {
  id: string;
  userId: string;
  title: string;
  scheduledOn: string; // DEVICE-LOCAL day key (YYYY-MM-DD) from time-policy
  startTime: string | null; // optional time-of-day, e.g. "09:30:00"
  durationMinutes: number | null;
  goalId: string | null;
  personId: string | null;
  notes: string | null;
  completedAt: string | null; // ISO timestamp; null = not completed
  createdAt: string;
  updatedAt: string;
}

/** Raw `blocks` row shape as returned by Supabase (snake_case). */
export interface BlockRow {
  id: string;
  user_id: string;
  title: string;
  scheduled_on: string;
  start_time: string | null;
  duration_minutes: number | null;
  goal_id: string | null;
  person_id: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function blockFromRow(row: BlockRow): Block {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    scheduledOn: row.scheduled_on,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes,
    goalId: row.goal_id,
    personId: row.person_id,
    notes: row.notes,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
