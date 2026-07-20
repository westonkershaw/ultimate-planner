/**
 * gcal-sync-runner.ts — drives one foreground Google Calendar sync pass
 * (Roadmap Phase 5, part two): valid token -> local blocks + remote events ->
 * planSync (gcal-sync-engine.ts, part one) -> execute the plan against the
 * real GoogleCalendarClient (gcal-client.ts) -> persist discovered event ids
 * back onto local blocks via the existing updateBlock (blocks-repo.ts).
 *
 * FOREGROUND-ONLY BY DESIGN: this is a function the UI calls (e.g. a
 * "Sync now" button, or on-screen-focus), not a background job. See
 * gcal-auth.ts's file doc comment for why — Supabase does not auto-refresh
 * third-party provider tokens, so there is no valid token to run this
 * against until the user has the app open with a live session.
 *
 * PERSISTENCE: googleCalendarEventId lives on the `blocks` table
 * (google_calendar_event_id, added by supabase/migrations/20260721090000_blocks_gcal.sql)
 * and is written back through the existing updateBlock (blocks-repo.ts) — no
 * new write path. Both the create-path id and planSync's toLinkLocal
 * pairings are persisted below, so a re-run finds a block already linked
 * (via googleCalendarEventId) instead of re-creating or re-discovering it.
 *
 * BIDIRECTIONAL (Roadmap Phase 5, part three): planSync's toUpdateLocal is
 * executed the same best-effort way as every push-side array below — each
 * entry's `patch` (a BlockPatchFromEvent, gcal-sync-engine.ts) is applied
 * via the same existing updateBlock, no new write path. A block that fails
 * to patch just isn't counted in `pulled`; the remote event stays newer, so
 * planSync reproduces the same toUpdateLocal entry next run.
 */

import { getGoogleAccessToken } from '@/lib/gcal-auth';
import { createGoogleCalendarClient } from '@/lib/gcal-client';
import { blockToEventInput, planSync } from '@/lib/gcal-sync-engine';
import type { SyncableBlock } from '@/lib/gcal-types';
import { addLocalDays, localDayKey } from '@/lib/time-policy';

import type { Block } from './block-types';
import { listBlocksForRange, updateBlock } from './blocks-repo';

/** How far back/forward a sync pass looks — a reasonable rolling window, not "every block ever". */
const SYNC_WINDOW_DAYS_PAST = 14;
const SYNC_WINDOW_DAYS_FUTURE = 42;

export interface RunGoogleCalendarSyncResult {
  success: boolean;
  created: number;
  updated: number;
  deleted: number;
  /** Local blocks pulled/patched from a newer remote event (Roadmap Phase 5, part three). */
  pulled: number;
  error?: string;
}

/**
 * Adapts a repo Block into the pure engine's SyncableBlock. `isDeleted` is
 * always false here — listBlocksForRange only ever returns rows that still
 * exist (blocks-repo.ts's deleteBlock is a hard DELETE, see the module doc
 * comment below for why toDeleteRemote is consequently unreachable from this
 * path today).
 */
function toSyncableBlock(block: Block): SyncableBlock {
  return {
    id: block.id,
    title: block.title,
    notes: block.notes,
    scheduledOn: block.scheduledOn,
    startTime: block.startTime,
    durationMinutes: block.durationMinutes,
    googleCalendarEventId: block.googleCalendarEventId,
    updatedAt: block.updatedAt,
    isDeleted: false,
  };
}

/**
 * Runs one foreground Google Calendar sync pass for the signed-in user.
 * Never throws — every failure mode (not connected, expired token, a Google
 * or Supabase call failing mid-pass) returns a structured result instead.
 */
export async function runGoogleCalendarSync(): Promise<RunGoogleCalendarSyncResult> {
  try {
    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      return {
        success: false,
        created: 0,
        updated: 0,
        deleted: 0,
        pulled: 0,
        error: 'Google Calendar is not connected, or the connection has expired. Reconnect to sync.',
      };
    }

    const today = new Date();
    const fromDay = addLocalDays(today, -SYNC_WINDOW_DAYS_PAST);
    const toDay = addLocalDays(today, SYNC_WINDOW_DAYS_FUTURE);
    const fromDayKey = localDayKey(fromDay);
    const toDayKey = localDayKey(toDay);

    const { data: blocks, error: blocksError } = await listBlocksForRange(fromDayKey, toDayKey);
    if (blocksError || !blocks) {
      return {
        success: false,
        created: 0,
        updated: 0,
        deleted: 0,
        pulled: 0,
        error: blocksError ?? 'Could not load local blocks to sync.',
      };
    }

    const client = createGoogleCalendarClient(accessToken);

    let remoteEvents;
    try {
      // Bounded to the same fromDayKey/toDayKey window as the local blocks
      // query above, so remote and local fetches cover identical ranges —
      // otherwise events.list defaults to no time bound at all and would
      // fetch the caller's entire calendar history every pass.
      remoteEvents = await client.listEvents({
        timeMin: fromDay.toISOString(),
        timeMax: toDay.toISOString(),
      });
    } catch (err) {
      return {
        success: false,
        created: 0,
        updated: 0,
        deleted: 0,
        pulled: 0,
        error: err instanceof Error ? err.message : 'Could not fetch Google Calendar events.',
      };
    }

    const syncableBlocks = blocks.map(toSyncableBlock);
    const plan = planSync(syncableBlocks, remoteEvents);

    let created = 0;
    let updated = 0;
    let deleted = 0;
    let pulled = 0;

    for (const block of plan.toCreateRemote) {
      try {
        const input = blockToEventInput(block);
        const createdEvent = await client.createEvent({ ...input, localBlockId: block.id });
        created += 1;
        // Persist the newly created event's id through the existing
        // updateBlock so a future pass finds this block already linked
        // instead of creating a duplicate. Best-effort: if this write
        // fails, the event still exists in Google and planSync's
        // toLinkLocal matching (by the stamped extendedProperties key)
        // recovers the link on the next run.
        await updateBlock(block.id, { googleCalendarEventId: createdEvent.id });
      } catch {
        // One block failing to create shouldn't abort the whole pass —
        // it's simply not counted as created and will be retried next run.
      }
    }

    for (const { block, eventId } of plan.toUpdateRemote) {
      try {
        const input = blockToEventInput(block);
        await client.updateEvent(eventId, input);
        updated += 1;
      } catch {
        // Same reasoning as create: skip and let the next pass retry.
      }
    }

    for (const eventId of plan.toDeleteRemote) {
      // Reachability note: toDeleteRemote only fires for a block with
      // isDeleted true AND a recorded googleCalendarEventId. blocks-repo.ts's
      // deleteBlock() is a hard DELETE with no isDeleted/tombstone concept at
      // all (see its doc comment), and toSyncableBlock above always passes
      // isDeleted: false (a deleted row is simply gone from listBlocksForRange's
      // result, not present-and-flagged). So this branch is intentionally
      // unreachable from THIS code path today — it's kept here because
      // planSync can still produce it in principle, and because the actual
      // "clean up the remote event when a block is deleted" behavior is
      // explicitly scoped to the next task, done inline at the point of
      // local deletion (in deleteBlock's call site), not here.
      try {
        await client.deleteEvent(eventId);
        deleted += 1;
      } catch {
        // Skip and let a future pass retry.
      }
    }

    for (const { blockId, eventId } of plan.toLinkLocal) {
      try {
        await updateBlock(blockId, { googleCalendarEventId: eventId });
      } catch {
        // Best-effort: if this write fails, planSync will simply
        // re-discover the same pairing (not re-create — toLinkLocal already
        // dedupes by the extendedProperties stamp) on the next run.
      }
    }

    for (const { blockId, patch } of plan.toUpdateLocal) {
      try {
        await updateBlock(blockId, patch);
        pulled += 1;
      } catch {
        // Same reasoning as the push-side loops above: skip and let the
        // next pass retry — the remote event is still newer, so planSync
        // will produce the same toUpdateLocal entry again next run.
      }
    }

    return { success: true, created, updated, deleted, pulled };
  } catch (err) {
    return {
      success: false,
      created: 0,
      updated: 0,
      deleted: 0,
      pulled: 0,
      error: err instanceof Error ? err.message : 'Google Calendar sync failed unexpectedly.',
    };
  }
}
