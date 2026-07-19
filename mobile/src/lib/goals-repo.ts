/**
 * goals-repo.ts — typed Supabase access for goals + progress events.
 * Every function returns { data, error: string | null } so callers never
 * have to branch on thrown exceptions. Row <-> model mapping goes through
 * goalFromRow/eventFromRow (goals-types.ts) — never read snake_case fields
 * outside this file.
 */

import { supabase } from '@/lib/supabase';

import { localDayKey } from './time-policy';
import type {
  Cadence,
  Goal,
  GoalRow,
  LifeArea,
  MetricType,
  ProgressEvent,
  ProgressEventRow,
} from './goals-types';
import { eventFromRow, goalFromRow } from './goals-types';

export interface Result<T> {
  data: T | null;
  error: string | null;
}

export interface CreateGoalInput {
  title: string;
  lifeArea: LifeArea;
  metricType: MetricType;
  targetValue: number;
  unit?: string | null;
  cadence: Cadence;
  targetDate?: string | null;
}

export interface UpdateGoalPatch {
  title?: string;
  lifeArea?: LifeArea;
  metricType?: MetricType;
  targetValue?: number;
  unit?: string | null;
  cadence?: Cadence;
  targetDate?: string | null;
}

/** Active (non-archived) goals for the signed-in user, newest first. */
export async function listGoals(): Promise<Result<Goal[]>> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: (data as GoalRow[]).map(goalFromRow), error: null };
}

export async function createGoal(input: CreateGoalInput): Promise<Result<Goal>> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { data: null, error: userError?.message ?? 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: userData.user.id,
      title: input.title,
      life_area: input.lifeArea,
      metric_type: input.metricType,
      target_value: input.targetValue,
      unit: input.unit ?? null,
      cadence: input.cadence,
      target_date: input.targetDate ?? null,
    })
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: goalFromRow(data as GoalRow), error: null };
}

export async function updateGoal(id: string, patch: UpdateGoalPatch): Promise<Result<Goal>> {
  const row: Partial<GoalRow> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.lifeArea !== undefined) row.life_area = patch.lifeArea;
  if (patch.metricType !== undefined) row.metric_type = patch.metricType;
  if (patch.targetValue !== undefined) row.target_value = patch.targetValue;
  if (patch.unit !== undefined) row.unit = patch.unit;
  if (patch.cadence !== undefined) row.cadence = patch.cadence;
  if (patch.targetDate !== undefined) row.target_date = patch.targetDate;

  const { data, error } = await supabase
    .from('goals')
    .update(row)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: goalFromRow(data as GoalRow), error: null };
}

/** Soft-archive: sets archived_at, leaves history intact. */
export async function archiveGoal(id: string): Promise<Result<Goal>> {
  const { data, error } = await supabase
    .from('goals')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: goalFromRow(data as GoalRow), error: null };
}

/** Hard delete. Cascades to goal_progress_events via FK ON DELETE CASCADE. */
export async function deleteGoal(id: string): Promise<Result<null>> {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) {
    return { data: null, error: error.message };
  }
  return { data: null, error: null };
}

/** Events for a goal, most recent first. Optionally limited to occurred_on >= sinceDayKey. */
export async function listEvents(
  goalId: string,
  sinceDayKey?: string
): Promise<Result<ProgressEvent[]>> {
  let query = supabase
    .from('goal_progress_events')
    .select('*')
    .eq('goal_id', goalId)
    .order('occurred_on', { ascending: false });

  if (sinceDayKey) {
    query = query.gte('occurred_on', sinceDayKey);
  }

  const { data, error } = await query;
  if (error) {
    return { data: null, error: error.message };
  }
  return { data: (data as ProgressEventRow[]).map(eventFromRow), error: null };
}

/**
 * All the signed-in user's progress events with occurred_on >= sinceDayKey,
 * across every goal, in a single query (no per-goal N+1). Ascending by
 * occurred_on so callers can scan for each goal's last-logged day in order.
 * RLS scopes the result to the caller's own rows.
 */
export async function listRecentEventsSince(sinceDayKey: string): Promise<Result<ProgressEvent[]>> {
  const { data, error } = await supabase
    .from('goal_progress_events')
    .select('*')
    .gte('occurred_on', sinceDayKey)
    .order('occurred_on', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: (data as ProgressEventRow[]).map(eventFromRow), error: null };
}

/**
 * Pins `goalId` as the user's one Home-featured goal, unpinning any other
 * pinned goal first. Two updates (clear-then-set) so the partial unique index
 * on goals(user_id) WHERE pinned_at IS NOT NULL never trips. Pass null to
 * unpin without pinning a new goal.
 */
export async function setPinned(goalId: string | null): Promise<Result<Goal>> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { data: null, error: userError?.message ?? 'Not authenticated' };
  }

  const { error: clearError } = await supabase
    .from('goals')
    .update({ pinned_at: null })
    .eq('user_id', userData.user.id)
    .not('pinned_at', 'is', null);

  if (clearError) {
    return { data: null, error: clearError.message };
  }

  if (goalId === null) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from('goals')
    .update({ pinned_at: new Date().toISOString() })
    .eq('id', goalId)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: goalFromRow(data as GoalRow), error: null };
}

/**
 * Appends a progress event dated to the device-local "today" (never UTC).
 * user_id comes from the auth session, not the caller, so events can't be
 * grafted onto another account.
 */
export async function logProgress(
  goalId: string,
  amount: number,
  note?: string
): Promise<Result<ProgressEvent>> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { data: null, error: userError?.message ?? 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('goal_progress_events')
    .insert({
      goal_id: goalId,
      user_id: userData.user.id,
      amount,
      occurred_on: localDayKey(new Date()),
      note: note ?? null,
    })
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: eventFromRow(data as ProgressEventRow), error: null };
}
