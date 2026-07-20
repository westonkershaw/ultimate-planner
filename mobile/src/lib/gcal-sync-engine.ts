/**
 * gcal-sync-engine.ts — PURE reconciliation logic for Google Calendar sync
 * (Roadmap Phase 5, part one). Imports nothing but gcal-types and
 * time-policy, same discipline as block-engine.ts / goal-engine.ts — no
 * react, no supabase, no fetch, no expo-anything. Callers (a later phase)
 * take the SyncPlan this produces and drive an actual GoogleCalendarClient.
 */

import type { GCalEvent, SyncableBlock } from './gcal-types';
import { startOfLocalDay } from './time-policy';

/** Key used in GCalEvent.extendedProperties.private to stamp the local block id. */
const LOCAL_BLOCK_ID_KEY = 'ultimatePlannerBlockId';

export interface SyncPlan {
  /** Local blocks with no remote event yet — create one. */
  toCreateRemote: SyncableBlock[];
  /** Local blocks whose local edit is newer than the matched remote event. */
  toUpdateRemote: Array<{ block: SyncableBlock; eventId: string }>;
  /** Remote event ids to delete — the local block was deleted but still linked. */
  toDeleteRemote: string[];
  /**
   * Remote events that already carry a matching local block id (stamped via
   * extendedProperties.private) but whose local block has no
   * googleCalendarEventId recorded yet — link, don't re-create.
   */
  toLinkLocal: Array<{ blockId: string; eventId: string }>;
}

/** The remote event, if any, whose stamped local block id equals `blockId`. */
function findRemoteByLocalBlockId(remoteEvents: readonly GCalEvent[], blockId: string): GCalEvent | undefined {
  return remoteEvents.find((e) => e.extendedProperties.private[LOCAL_BLOCK_ID_KEY] === blockId);
}

/**
 * Pure reconciliation between local blocks and remote Google Calendar events.
 *
 * Idempotency / matching logic, per local block:
 * 1. Deleted + still linked (has googleCalendarEventId) -> toDeleteRemote.
 * 2. Not deleted, no googleCalendarEventId:
 *    - If a remote event is already stamped with this block's id (a prior
 *      create succeeded remotely but the local write of the returned id
 *      failed or hasn't happened yet), pair it into toLinkLocal instead of
 *      creating again. This is the key guarantee that a retry after a
 *      partial failure never creates a duplicate remote event.
 *    - Otherwise -> toCreateRemote.
 * 3. Not deleted, has a googleCalendarEventId: look up the remote event by
 *    that id.
 *    - No match (deleted directly in Google Calendar) -> left out of every
 *      array entirely; a later phase decides what that means. This function
 *      does not guess.
 *    - Match found: compare local `updatedAt` against remote `updated` as
 *      real timestamps (Date.parse), not string comparison of differently
 *      formatted date strings. Strictly newer locally -> toUpdateRemote.
 *      Otherwise (remote current or newer) -> leave it alone, nothing to do.
 */
export function planSync(localBlocks: SyncableBlock[], remoteEvents: GCalEvent[]): SyncPlan {
  const remoteById = new Map(remoteEvents.map((e) => [e.id, e] as const));

  const plan: SyncPlan = {
    toCreateRemote: [],
    toUpdateRemote: [],
    toDeleteRemote: [],
    toLinkLocal: [],
  };

  for (const block of localBlocks) {
    if (block.isDeleted) {
      if (block.googleCalendarEventId !== null) {
        plan.toDeleteRemote.push(block.googleCalendarEventId);
      }
      continue;
    }

    if (block.googleCalendarEventId === null) {
      const alreadyLinked = findRemoteByLocalBlockId(remoteEvents, block.id);
      if (alreadyLinked !== undefined) {
        plan.toLinkLocal.push({ blockId: block.id, eventId: alreadyLinked.id });
      } else {
        plan.toCreateRemote.push(block);
      }
      continue;
    }

    const remote = remoteById.get(block.googleCalendarEventId);
    if (remote === undefined) {
      // Deleted directly in Google Calendar — a later phase decides how to
      // handle this. Intentionally left out of every array.
      continue;
    }

    const localTime = Date.parse(block.updatedAt);
    const remoteTime = Date.parse(remote.updated);
    if (localTime > remoteTime) {
      plan.toUpdateRemote.push({ block, eventId: remote.id });
    }
    // Remote is current or newer: nothing to do for this block this round.
  }

  return plan;
}

/** Default time-of-day used when a block has no explicit startTime. */
const DEFAULT_START_TIME = '09:00:00'; // mid-morning: a neutral, non-jarring default slot
/** Default event length, in minutes, used when a block has no durationMinutes. */
const DEFAULT_DURATION_MINUTES = 30; // short enough to avoid clobbering the rest of the day

/**
 * Turns a SyncableBlock into the { summary, description, start, end }
 * shape GoogleCalendarClient.createEvent/updateEvent expect.
 *
 * scheduledOn is a DEVICE-LOCAL day key (time-policy convention). We anchor
 * on that day via `startOfLocalDay` (local midnight, never UTC) and then
 * apply the time-of-day as a local wall-clock offset on top, so the result
 * always lands on the intended local calendar day regardless of the
 * device's UTC offset — consistent with the rest of the app's day-boundary
 * rules. The final `.toISOString()` is just serialization; the day itself
 * is always resolved in local time first.
 *
 * calendarTimeZone is accepted for a later phase (Google Calendar events
 * can carry an explicit IANA time zone alongside dateTime) but is unused by
 * this pure helper today, since we hand back a fully-qualified ISO instant
 * computed from the device's own local clock.
 */
export function blockToEventInput(
  block: SyncableBlock,
  calendarTimeZone?: string
): { summary: string; description?: string; start: string; end: string } {
  void calendarTimeZone; // reserved for a later phase — see doc comment above

  const timeOfDay = block.startTime ?? DEFAULT_START_TIME;
  const durationMinutes = block.durationMinutes ?? DEFAULT_DURATION_MINUTES;

  const [year, month, day] = block.scheduledOn.split('-').map(Number);
  const localMidnight = startOfLocalDay(new Date(year!, month! - 1, day!));

  const [hours, minutes, seconds] = timeOfDay.split(':').map(Number);
  const start = new Date(localMidnight);
  start.setHours(hours ?? 0, minutes ?? 0, seconds ?? 0, 0);

  const end = new Date(start.getTime() + durationMinutes * 60_000);

  return {
    summary: block.title,
    description: block.notes ?? undefined,
    start: start.toISOString(),
    end: end.toISOString(),
  };
}
