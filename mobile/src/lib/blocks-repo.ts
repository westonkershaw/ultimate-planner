/**
 * blocks-repo.ts — typed Supabase access for scheduled time blocks. Every
 * function returns { data, error: string | null } so callers never have to
 * branch on thrown exceptions. Row <-> model mapping goes through
 * blockFromRow (block-types.ts) — never read snake_case fields outside this
 * file.
 */

import { supabase } from '@/lib/supabase';

import type { Block, BlockRow } from './block-types';
import { blockFromRow } from './block-types';
import { logProgress } from './goals-repo';

export interface Result<T> {
  data: T | null;
  error: string | null;
}

export interface CreateBlockInput {
  title: string;
  scheduledOn: string;
  startTime?: string | null;
  durationMinutes?: number | null;
  goalId?: string | null;
  personId?: string | null;
  notes?: string | null;
}

export interface UpdateBlockPatch {
  title?: string;
  scheduledOn?: string;
  startTime?: string | null;
  durationMinutes?: number | null;
  goalId?: string | null;
  personId?: string | null;
  notes?: string | null;
}

/** Blocks with scheduled_on in [fromDayKey, toDayKey] inclusive, ascending. RLS-scoped. */
export async function listBlocksForRange(
  fromDayKey: string,
  toDayKey: string
): Promise<Result<Block[]>> {
  const { data, error } = await supabase
    .from('blocks')
    .select('*')
    .gte('scheduled_on', fromDayKey)
    .lte('scheduled_on', toDayKey)
    .order('scheduled_on', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: (data as BlockRow[]).map(blockFromRow), error: null };
}

export async function createBlock(input: CreateBlockInput): Promise<Result<Block>> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { data: null, error: userError?.message ?? 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('blocks')
    .insert({
      user_id: userData.user.id,
      title: input.title,
      scheduled_on: input.scheduledOn,
      start_time: input.startTime ?? null,
      duration_minutes: input.durationMinutes ?? null,
      goal_id: input.goalId ?? null,
      person_id: input.personId ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: blockFromRow(data as BlockRow), error: null };
}

export async function updateBlock(id: string, patch: UpdateBlockPatch): Promise<Result<Block>> {
  const row: Partial<BlockRow> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.scheduledOn !== undefined) row.scheduled_on = patch.scheduledOn;
  if (patch.startTime !== undefined) row.start_time = patch.startTime;
  if (patch.durationMinutes !== undefined) row.duration_minutes = patch.durationMinutes;
  if (patch.goalId !== undefined) row.goal_id = patch.goalId;
  if (patch.personId !== undefined) row.person_id = patch.personId;
  if (patch.notes !== undefined) row.notes = patch.notes;

  const { data, error } = await supabase
    .from('blocks')
    .update(row)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: blockFromRow(data as BlockRow), error: null };
}

/** Hard delete. */
export async function deleteBlock(id: string): Promise<Result<null>> {
  const { error } = await supabase.from('blocks').delete().eq('id', id);
  if (error) {
    return { data: null, error: error.message };
  }
  return { data: null, error: null };
}

/**
 * Marks a block complete, then — ONLY when it's goal-linked — logs a goal
 * progress event by reusing the EXISTING logProgress (goals-repo.ts) rather
 * than duplicating that insert, so "block completed" produces exactly the
 * same event shape (amount 1, occurred_on = device-local today) as any other
 * manually logged progress.
 *
 * Partial-failure behavior (intentional, not an oversight):
 *  - If the block update fails, return that error immediately; no
 *    goal-progress step is attempted.
 *  - If the block update succeeds but the follow-up logProgress call fails,
 *    still return the completed block as `data` (it really is marked done)
 *    but populate `error` with a distinct warning string so the caller can
 *    tell the user the block completed while its goal progress did not log.
 */
export async function completeBlock(id: string, goalId: string | null): Promise<Result<Block>> {
  const { data, error } = await supabase
    .from('blocks')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  const block = blockFromRow(data as BlockRow);

  if (goalId !== null) {
    const { error: progressError } = await logProgress(goalId, 1, 'Block completed');
    if (progressError) {
      return {
        data: block,
        error: `Block completed, but goal progress could not be logged: ${progressError}`,
      };
    }
  }

  return { data: block, error: null };
}

/**
 * Clears completed_at back to null. Deliberately does NOT attempt to find
 * and retract any goal-progress event written by a prior completeBlock call
 * — reliably matching "the" event to delete (vs. other progress logged the
 * same day) is ambiguous and error-prone, so uncompleting a block leaves
 * goal-progress history untouched. This is a scope decision, not a bug.
 */
export async function uncompleteBlock(id: string): Promise<Result<Block>> {
  const { data, error } = await supabase
    .from('blocks')
    .update({ completed_at: null })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: blockFromRow(data as BlockRow), error: null };
}
