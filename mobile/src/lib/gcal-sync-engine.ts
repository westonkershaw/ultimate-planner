/**
 * gcal-sync-engine.ts — PURE reconciliation logic for Google Calendar sync
 * (Roadmap Phase 5, part one). Imports nothing but gcal-types and
 * time-policy, same discipline as block-engine.ts / goal-engine.ts — no
 * react, no supabase, no fetch, no expo-anything. Callers (a later phase)
 * take the SyncPlan this produces and drive an actual GoogleCalendarClient.
 */

import type { GCalEvent, SyncableBlock } from './gcal-types';
import { localDayKey, startOfLocalDay } from './time-policy';

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
  /**
   * Local blocks whose matched remote event is newer than the local edit —
   * apply `patch` to the local block. This is the pull-side counterpart to
   * toUpdateRemote; see planSync's doc comment for the three-way comparison
   * that keeps a block out of both arrays for the same run.
   */
  toUpdateLocal: Array<{ blockId: string; patch: BlockPatchFromEvent }>;
}

/**
 * The subset of UpdateBlockPatch (blocks-repo.ts) that a remote Google
 * Calendar event can populate. Field-for-field the same optionality/typing
 * as UpdateBlockPatch's title/notes/scheduledOn/startTime/durationMinutes —
 * kept as a separate named type here (rather than importing UpdateBlockPatch
 * itself) so this pure engine still imports nothing but gcal-types and
 * time-policy, per this file's module doc comment.
 */
export interface BlockPatchFromEvent {
  title?: string;
  notes?: string | null;
  scheduledOn?: string;
  startTime?: string | null;
  durationMinutes?: number | null;
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
 *    - Match found: three-way comparison of local `updatedAt` against remote
 *      `updated`, as real timestamps (Date.parse), not string comparison of
 *      differently formatted date strings.
 *        - Strictly newer locally -> toUpdateRemote (push local -> remote).
 *        - Strictly newer remotely -> toUpdateLocal (pull remote -> local),
 *          via eventToBlockPatch.
 *        - Effectively equal -> neither; nothing to do.
 *      These three branches are an if/else-if/else over the same comparison,
 *      so exactly one (or none) fires per block by construction — a block
 *      can never land in both toUpdateRemote and toUpdateLocal for the same
 *      run.
 */
export function planSync(localBlocks: SyncableBlock[], remoteEvents: GCalEvent[]): SyncPlan {
  const remoteById = new Map(remoteEvents.map((e) => [e.id, e] as const));

  const plan: SyncPlan = {
    toCreateRemote: [],
    toUpdateRemote: [],
    toDeleteRemote: [],
    toLinkLocal: [],
    toUpdateLocal: [],
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
    // Mutually exclusive by construction: a single if/else-if/else over one
    // comparison, so exactly one branch (or none, on the equal case) can
    // ever push to a plan array for this block. Do not restructure this into
    // two independent ifs — that's what would let a block land in both
    // toUpdateRemote and toUpdateLocal.
    if (localTime > remoteTime) {
      plan.toUpdateRemote.push({ block, eventId: remote.id });
    } else if (remoteTime > localTime) {
      plan.toUpdateLocal.push({ blockId: block.id, patch: eventToBlockPatch(remote) });
    }
    // Effectively equal: nothing to do for this block this round.
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

/** Two local wall-clock digits, zero-padded — HH or MM or SS. */
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Splits one end of a GCalEvent (`start` or `end`) into a DEVICE-LOCAL day
 * key and an optional local time-of-day, per time-policy convention.
 *
 * - Timed (`dateTime`): a real instant. Construct a Date from it and read
 *   the day/time back out via `localDayKey` and the Date's local getters —
 *   never slice the dateTime string directly, since its own printed
 *   offset/timezone need not match the device's local timezone at all.
 * - All-day (`date`): already a plain YYYY-MM-DD calendar date with no
 *   attached instant/timezone, so it IS the local day key as-is — passed
 *   through directly rather than round-tripped through `new Date()`, which
 *   would parse it as UTC midnight and could shift it a day in either
 *   direction depending on the device's offset. No time-of-day for an
 *   all-day value.
 */
function splitEventEndpoint(endpoint: { dateTime: string } | { date: string }): {
  dayKey: string;
  timeOfDay: string | null;
} {
  if ('date' in endpoint) {
    return { dayKey: endpoint.date, timeOfDay: null };
  }
  const instant = new Date(endpoint.dateTime);
  const timeOfDay = `${pad2(instant.getHours())}:${pad2(instant.getMinutes())}:${pad2(instant.getSeconds())}`;
  return { dayKey: localDayKey(instant), timeOfDay };
}

/**
 * Turns a remote GCalEvent into a BlockPatchFromEvent to apply to the local
 * block it's linked to — the pull-side counterpart of blockToEventInput.
 * NOT a perfect inverse of that function; see the field-by-field notes and
 * the round-trip limitation below.
 *
 * Field mapping:
 * - title <- event.summary.
 * - notes <- event.description. `undefined` (Google sent no description)
 *   maps to leaving `notes` OUT of the patch entirely (the key is simply
 *   absent), not to forcing it to `null`/empty — UpdateBlockPatch-style
 *   patches treat "key absent" as "don't touch this field" and "key present
 *   with null" as "clear it" (see blocks-repo.ts's updateBlock), and an
 *   absent description is Google's "unchanged/never set" signal, not an
 *   explicit clear instruction, so we don't want a sync pass to go and wipe
 *   local notes just because whoever edited the event in Google Calendar's
 *   UI happened to leave the description box alone.
 * - scheduledOn/startTime <- event.start, via splitEventEndpoint (handles
 *   both the timed and all-day event shapes; see that helper's doc comment
 *   for why day/time extraction goes through Date + localDayKey rather than
 *   string slicing).
 * - durationMinutes <- (event.end instant) - (event.start instant), in
 *   whole minutes. For an all-day event this is computed off the parsed
 *   calendar dates (still whole minutes; typically a multiple of 1440).
 *
 * KNOWN ROUND-TRIP LIMITATION (documented, not fixed): blockToEventInput is
 * lossy in the create/update direction — a block with no explicit
 * startTime/durationMinutes gets DEFAULT_START_TIME/DEFAULT_DURATION_MINUTES
 * baked into the actual event sent to Google, because a Google Calendar
 * event has no way to represent "no time at all" short of going all-day.
 * Google has no record that those values were a default rather than a
 * deliberate choice. So if that same event later comes back through
 * eventToBlockPatch (e.g. because it was edited in Google Calendar and is
 * now the newer side), the previously-implicit block ends up with an
 * explicit startTime/durationMinutes matching whatever default was used —
 * indistinguishable, on the way back, from the user having deliberately set
 * that exact time. This is accepted as-is: the only clean fix would be
 * stamping a second extendedProperties marker noting "time is a default,
 * not real," which is more state to keep in sync than the problem is worth
 * for a first pull-sync pass. A future phase could revisit this if it turns
 * out to matter in practice.
 */
export function eventToBlockPatch(event: GCalEvent): BlockPatchFromEvent {
  const startSplit = splitEventEndpoint(event.start);

  // Only the *instant* of event.end is needed here (folded into
  // durationMinutes below) — BlockPatchFromEvent, like SyncableBlock,
  // represents a block's end as a duration off its start, not a second
  // absolute day/time pair, so event.end never goes through
  // splitEventEndpoint itself.
  const startInstant = 'dateTime' in event.start ? Date.parse(event.start.dateTime) : Date.parse(event.start.date);
  const endInstant = 'dateTime' in event.end ? Date.parse(event.end.dateTime) : Date.parse(event.end.date);
  const durationMinutes = Math.round((endInstant - startInstant) / 60_000);

  const patch: BlockPatchFromEvent = {
    title: event.summary,
    scheduledOn: startSplit.dayKey,
    startTime: startSplit.timeOfDay,
    durationMinutes,
  };
  if (event.description !== undefined) {
    patch.notes = event.description;
  }

  return patch;
}
