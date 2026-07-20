/**
 * gcal-sync-engine.test.ts — pure-logic coverage for the Google Calendar
 * sync reconciliation engine (Roadmap Phase 5, part one).
 *
 * Deterministic by construction: no network, no mocked expo/supabase (the
 * engine has no such dependencies), no wall-clock `new Date()` without an
 * explicit fixed value, no randomness. ISO expectations for
 * `blockToEventInput` are derived via `Date` construction (mirroring how the
 * source itself resolves local time via `startOfLocalDay`) rather than
 * hardcoded UTC-offset literals, so the suite is timezone-proof regardless
 * of the machine it runs on — consistent with the `time-policy` discipline
 * used elsewhere in this codebase.
 */
import { describe, expect, it } from 'vitest';
import { blockToEventInput, eventToBlockPatch, planSync } from '../gcal-sync-engine';
import type { GCalEvent, SyncableBlock } from '../gcal-types';
import { localDayKey, startOfLocalDay } from '../time-policy';

const LOCAL_BLOCK_ID_KEY = 'ultimatePlannerBlockId';

// ---- fixture helpers -------------------------------------------------

let blockSeq = 0;
function makeBlock(overrides: Partial<SyncableBlock> = {}): SyncableBlock {
  blockSeq += 1;
  return {
    id: `block-${blockSeq}`,
    title: `Block ${blockSeq}`,
    notes: null,
    scheduledOn: '2026-07-15',
    startTime: null,
    durationMinutes: null,
    googleCalendarEventId: null,
    updatedAt: '2026-07-01T00:00:00.000Z',
    isDeleted: false,
    ...overrides,
  };
}

let eventSeq = 0;
function makeEvent(overrides: Partial<GCalEvent> = {}): GCalEvent {
  eventSeq += 1;
  return {
    id: `event-${eventSeq}`,
    summary: `Event ${eventSeq}`,
    description: undefined,
    start: { dateTime: '2026-07-15T09:00:00.000Z' },
    end: { dateTime: '2026-07-15T09:30:00.000Z' },
    updated: '2026-07-01T00:00:00.000Z',
    extendedProperties: { private: {} },
    ...overrides,
  };
}

function stampedEvent(blockId: string, overrides: Partial<GCalEvent> = {}): GCalEvent {
  return makeEvent({
    ...overrides,
    extendedProperties: { private: { [LOCAL_BLOCK_ID_KEY]: blockId } },
  });
}

// ---- planSync: toCreateRemote -------------------------------------------------

describe('planSync — creating remote events', () => {
  it('places an unlinked local block with no matching remote event into toCreateRemote', () => {
    const block = makeBlock({ googleCalendarEventId: null });
    const remote = makeEvent(); // unrelated event, no matching stamp
    const plan = planSync([block], [remote]);

    expect(plan.toCreateRemote).toEqual([block]);
    expect(plan.toLinkLocal).toEqual([]);
    expect(plan.toUpdateRemote).toEqual([]);
    expect(plan.toDeleteRemote).toEqual([]);
  });

  it('places an unlinked local block into toCreateRemote when there are no remote events at all', () => {
    const block = makeBlock({ googleCalendarEventId: null });
    const plan = planSync([block], []);
    expect(plan.toCreateRemote).toEqual([block]);
  });
});

// ---- planSync: idempotent linking (critical guarantee) -------------------------------------------------

describe('planSync — idempotent linking instead of duplicate creation', () => {
  it('links a local block to a remote event already stamped with its id, instead of creating a duplicate', () => {
    const block = makeBlock({ googleCalendarEventId: null });
    const remote = stampedEvent(block.id);
    const plan = planSync([block], [remote]);

    expect(plan.toLinkLocal).toEqual([{ blockId: block.id, eventId: remote.id }]);
  });

  it('does NOT also place the linked block into toCreateRemote — no duplication', () => {
    const block = makeBlock({ googleCalendarEventId: null });
    const remote = stampedEvent(block.id);
    const plan = planSync([block], [remote]);

    // Explicit idempotency assertion: a block that gets linked must never
    // simultaneously appear as a create-candidate, or a retry after a
    // partial failure would create a second remote event for it.
    expect(plan.toCreateRemote).not.toContainEqual(block);
    expect(plan.toCreateRemote).toEqual([]);
  });
});

// ---- planSync: toUpdateRemote -------------------------------------------------

describe('planSync — updating remote events', () => {
  it('places a linked block into toUpdateRemote when local updatedAt is strictly after remote updated', () => {
    const remote = makeEvent({ id: 'evt-1', updated: '2026-07-10T00:00:00.000Z' });
    const block = makeBlock({
      googleCalendarEventId: 'evt-1',
      updatedAt: '2026-07-10T00:00:01.000Z', // 1s strictly after
    });
    const plan = planSync([block], [remote]);

    expect(plan.toUpdateRemote).toEqual([{ block, eventId: 'evt-1' }]);
    expect(plan.toCreateRemote).toEqual([]);
    expect(plan.toLinkLocal).toEqual([]);
    expect(plan.toDeleteRemote).toEqual([]);
    // Tightened: local-strictly-newer must not ALSO surface as a pull-side
    // entry for the same block — this is the mirror of the existing
    // toCreateRemote-exclusion assertion above, now covering toUpdateLocal.
    expect(plan.toUpdateLocal).toEqual([]);
  });

  it('leaves a linked block out of every array when local updatedAt is exactly equal to remote updated', () => {
    const remote = makeEvent({ id: 'evt-2', updated: '2026-07-10T00:00:00.000Z' });
    const block = makeBlock({
      googleCalendarEventId: 'evt-2',
      updatedAt: '2026-07-10T00:00:00.000Z', // exactly equal
    });
    const plan = planSync([block], [remote]);

    expect(plan.toCreateRemote).toEqual([]);
    expect(plan.toUpdateRemote).toEqual([]);
    expect(plan.toDeleteRemote).toEqual([]);
    expect(plan.toLinkLocal).toEqual([]);
    // Tightened: the equal-timestamps case must produce neither push nor
    // pull entries — previously only the four other arrays were checked.
    expect(plan.toUpdateLocal).toEqual([]);
  });

  it('places a linked block into toUpdateLocal (not toUpdateRemote) when remote updated is strictly after local updatedAt', () => {
    const remote = makeEvent({ id: 'evt-3', updated: '2026-07-10T00:00:05.000Z' });
    const block = makeBlock({
      googleCalendarEventId: 'evt-3',
      updatedAt: '2026-07-10T00:00:00.000Z', // strictly before
    });
    const plan = planSync([block], [remote]);

    expect(plan.toCreateRemote).toEqual([]);
    expect(plan.toUpdateRemote).toEqual([]);
    expect(plan.toDeleteRemote).toEqual([]);
    expect(plan.toLinkLocal).toEqual([]);
    expect(plan.toUpdateLocal).toEqual([{ blockId: block.id, patch: eventToBlockPatch(remote) }]);
  });
});

// ---- planSync: toUpdateLocal (pull remote edits back into local blocks) -------------------------------------------------

describe('planSync — pulling remote edits into local blocks', () => {
  it('never places the same block into both toUpdateRemote and toUpdateLocal, across the full comparison range', () => {
    // Mutual exclusivity is asserted directly for a range of local/remote
    // timestamp pairings, not just the three named cases above.
    const pairs: Array<[string, string]> = [
      ['2026-07-10T00:00:00.000Z', '2026-07-10T00:00:00.000Z'], // equal
      ['2026-07-10T00:00:01.000Z', '2026-07-10T00:00:00.000Z'], // local newer
      ['2026-07-10T00:00:00.000Z', '2026-07-10T00:00:01.000Z'], // remote newer
      ['2020-01-01T00:00:00.000Z', '2026-07-10T00:00:00.000Z'], // remote much newer
      ['2026-07-10T00:00:00.000Z', '2020-01-01T00:00:00.000Z'], // local much newer
    ];

    for (const [localUpdatedAt, remoteUpdated] of pairs) {
      const remote = makeEvent({ id: 'evt-mutex', updated: remoteUpdated });
      const block = makeBlock({ googleCalendarEventId: 'evt-mutex', updatedAt: localUpdatedAt });
      const plan = planSync([block], [remote]);

      const inRemote = plan.toUpdateRemote.length > 0;
      const inLocal = plan.toUpdateLocal.length > 0;
      expect(inRemote && inLocal).toBe(false);
    }
  });

  it('places a linked block into toUpdateLocal with the correct blockId, and excludes it from toUpdateRemote, when remote.updated is strictly newer', () => {
    const remote = makeEvent({ id: 'evt-newer-remote', updated: '2026-07-15T12:00:00.000Z' });
    const block = makeBlock({
      id: 'block-newer-remote',
      googleCalendarEventId: 'evt-newer-remote',
      updatedAt: '2026-07-15T11:59:59.000Z', // 1s strictly before remote
    });
    const plan = planSync([block], [remote]);

    expect(plan.toUpdateLocal).toEqual([{ blockId: 'block-newer-remote', patch: eventToBlockPatch(remote) }]);
    expect(plan.toUpdateRemote).not.toContainEqual({ block, eventId: 'evt-newer-remote' });
    expect(plan.toUpdateRemote).toEqual([]);
  });

  it('produces exactly one toUpdateLocal entry, keyed by blockId, with a patch derived from the remote event', () => {
    const remote = makeEvent({
      id: 'evt-pull',
      updated: '2026-07-12T00:00:00.000Z',
      summary: 'Renamed in Calendar',
      description: 'Edited remotely',
    });
    const block = makeBlock({
      id: 'block-pull',
      googleCalendarEventId: 'evt-pull',
      updatedAt: '2026-07-01T00:00:00.000Z',
    });
    const plan = planSync([block], [remote]);

    expect(plan.toUpdateLocal).toHaveLength(1);
    expect(plan.toUpdateLocal[0]!.blockId).toBe('block-pull');
    expect(plan.toUpdateLocal[0]!.patch.title).toBe('Renamed in Calendar');
    expect(plan.toUpdateLocal[0]!.patch.notes).toBe('Edited remotely');
  });

  it('does not place a deleted, linked block into toUpdateLocal even when the remote event looks newer', () => {
    // Deletion takes unconditional priority — mirrors the existing
    // toDeleteRemote-over-toUpdateRemote priority test above.
    const remote = makeEvent({ id: 'evt-del-3', updated: '2026-07-19T00:00:00.000Z' });
    const block = makeBlock({
      isDeleted: true,
      googleCalendarEventId: 'evt-del-3',
      updatedAt: '2020-01-01T00:00:00.000Z', // far "older" than remote.updated
    });
    const plan = planSync([block], [remote]);

    expect(plan.toDeleteRemote).toEqual(['evt-del-3']);
    expect(plan.toUpdateLocal).toEqual([]);
    expect(plan.toUpdateRemote).toEqual([]);
    expect(plan.toCreateRemote).toEqual([]);
    expect(plan.toLinkLocal).toEqual([]);
  });
});

// ---- planSync: toDeleteRemote -------------------------------------------------

describe('planSync — deleting remote events', () => {
  it('places a deleted, linked block into toDeleteRemote with the correct eventId', () => {
    const block = makeBlock({ isDeleted: true, googleCalendarEventId: 'evt-del' });
    const plan = planSync([block], []);
    expect(plan.toDeleteRemote).toEqual(['evt-del']);
  });

  it('does not place a deleted, linked block into toUpdateRemote even when its updatedAt looks newer than the matching remote event', () => {
    const remote = makeEvent({ id: 'evt-del-2', updated: '2020-01-01T00:00:00.000Z' });
    const block = makeBlock({
      isDeleted: true,
      googleCalendarEventId: 'evt-del-2',
      updatedAt: '2026-07-19T00:00:00.000Z', // far "newer" than remote.updated
    });
    const plan = planSync([block], [remote]);

    expect(plan.toDeleteRemote).toEqual(['evt-del-2']);
    expect(plan.toUpdateRemote).toEqual([]);
    expect(plan.toCreateRemote).toEqual([]);
    expect(plan.toLinkLocal).toEqual([]);
  });

  it('places a deleted, linked block into toDeleteRemote even when no remote event with that id exists', () => {
    // Deletion is driven purely by local state (isDeleted + a recorded id);
    // planSync does not require the remote event to still be present to
    // queue the delete call.
    const block = makeBlock({ isDeleted: true, googleCalendarEventId: 'evt-gone' });
    const plan = planSync([block], []);
    expect(plan.toDeleteRemote).toEqual(['evt-gone']);
  });
});

// ---- planSync: orphaned link (deleted directly in Google Calendar) -------------------------------------------------

describe('planSync — remote event deleted directly in Google Calendar', () => {
  it('leaves a linked block out of every array when its googleCalendarEventId no longer matches any remote event', () => {
    const block = makeBlock({
      googleCalendarEventId: 'evt-vanished',
      updatedAt: '2026-07-19T00:00:00.000Z',
    });
    // remoteEvents present, but none with id 'evt-vanished'
    const unrelated = makeEvent({ id: 'evt-other' });
    const plan = planSync([block], [unrelated]);

    expect(plan.toCreateRemote).toEqual([]);
    expect(plan.toUpdateRemote).toEqual([]);
    expect(plan.toDeleteRemote).toEqual([]);
    expect(plan.toLinkLocal).toEqual([]);
  });
});

// ---- planSync: empty inputs -------------------------------------------------

describe('planSync — empty inputs', () => {
  it('produces a SyncPlan with all five arrays empty for empty local blocks and empty remote events', () => {
    const plan = planSync([], []);
    expect(plan).toEqual({
      toCreateRemote: [],
      toUpdateRemote: [],
      toDeleteRemote: [],
      toLinkLocal: [],
      toUpdateLocal: [],
    });
  });
});

// ---- blockToEventInput -------------------------------------------------

describe('blockToEventInput', () => {
  it('produces correct start/end ISO strings for a block with an explicit startTime and durationMinutes', () => {
    const block = makeBlock({
      scheduledOn: '2026-07-15',
      startTime: '14:30:00',
      durationMinutes: 45,
      title: 'Deep work',
      notes: 'Bring headphones',
    });

    const expectedStart = new Date(2026, 6, 15, 14, 30, 0, 0);
    const expectedEnd = new Date(expectedStart.getTime() + 45 * 60_000);

    const result = blockToEventInput(block);

    expect(result.start).toBe(expectedStart.toISOString());
    expect(result.end).toBe(expectedEnd.toISOString());
    expect(result.summary).toBe('Deep work');
    expect(result.description).toBe('Bring headphones');
  });

  it('produces the documented default start time and duration for a block with neither set', () => {
    const block = makeBlock({
      scheduledOn: '2026-07-15',
      startTime: null,
      durationMinutes: null,
    });

    // Documented defaults per the source's own doc comments:
    // DEFAULT_START_TIME = '09:00:00', DEFAULT_DURATION_MINUTES = 30.
    const expectedStart = new Date(2026, 6, 15, 9, 0, 0, 0);
    const expectedEnd = new Date(expectedStart.getTime() + 30 * 60_000);

    const result = blockToEventInput(block);

    expect(result.start).toBe(expectedStart.toISOString());
    expect(result.end).toBe(expectedEnd.toISOString());
  });

  it('omits description when block.notes is null', () => {
    const block = makeBlock({ notes: null });
    const result = blockToEventInput(block);
    expect(result.description).toBeUndefined();
  });

  it('anchors the local day via startOfLocalDay regardless of time-of-day, matching the day-boundary convention', () => {
    const block = makeBlock({ scheduledOn: '2026-07-15', startTime: '00:00:01', durationMinutes: 1 });
    const result = blockToEventInput(block);
    const localMidnight = startOfLocalDay(new Date(2026, 6, 15));
    // 1 second after local midnight on the scheduled day.
    expect(result.start).toBe(new Date(localMidnight.getTime() + 1_000).toISOString());
  });

  it('produces an end time strictly after the start time across explicit, default, and edge-case inputs', () => {
    const cases: SyncableBlock[] = [
      makeBlock({ scheduledOn: '2026-07-15', startTime: '14:30:00', durationMinutes: 45 }),
      makeBlock({ scheduledOn: '2026-07-15', startTime: null, durationMinutes: null }),
      makeBlock({ scheduledOn: '2026-07-15', startTime: '23:45:00', durationMinutes: 30 }), // crosses midnight
      makeBlock({ scheduledOn: '2024-02-28', startTime: '12:00:00', durationMinutes: 1440 }), // spans Feb 29 (2024 is a leap year)
      makeBlock({ scheduledOn: '2026-07-15', startTime: '09:00:00', durationMinutes: 1 }), // minimal duration
    ];

    for (const block of cases) {
      const result = blockToEventInput(block);
      expect(Date.parse(result.end)).toBeGreaterThan(Date.parse(result.start));
    }
  });
});

// ---- eventToBlockPatch -------------------------------------------------

describe('eventToBlockPatch', () => {
  it('maps title from summary, notes from description, and derives scheduledOn/startTime/durationMinutes for a timed event', () => {
    const start = new Date(2026, 6, 15, 14, 30, 0, 0);
    const end = new Date(start.getTime() + 45 * 60_000);
    const event = makeEvent({
      summary: 'Deep work',
      description: 'Bring headphones',
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    });

    const patch = eventToBlockPatch(event);

    expect(patch.title).toBe('Deep work');
    expect(patch.notes).toBe('Bring headphones');
    expect(patch.scheduledOn).toBe(localDayKey(start));
    expect(patch.startTime).toBe('14:30:00');
    expect(patch.durationMinutes).toBe(45);
  });

  it('leaves notes out of the patch entirely when description is undefined, rather than forcing it to null', () => {
    const event = makeEvent({ description: undefined });
    const patch = eventToBlockPatch(event);
    expect('notes' in patch).toBe(false);
  });

  it('produces a null startTime and passes the date through directly for an all-day event', () => {
    const event = makeEvent({
      start: { date: '2026-07-15' },
      end: { date: '2026-07-16' },
    });

    const patch = eventToBlockPatch(event);

    expect(patch.scheduledOn).toBe('2026-07-15');
    expect(patch.startTime).toBeNull();
    expect(patch.durationMinutes).toBe(24 * 60);
  });

  it('does not crash on a multi-day all-day event and derives a whole-day-multiple duration from the date span', () => {
    // "Sensible result without crashing" for all-day, per the task's ask:
    // documented choice is that an all-day event's duration is computed off
    // the parsed calendar dates (Date.parse on a bare YYYY-MM-DD is midnight
    // UTC for both endpoints), so a 3-day all-day event yields exactly
    // 3 * 24h in minutes — no exception, no fractional/negative minutes.
    const event = makeEvent({
      summary: 'Conference',
      description: undefined,
      start: { date: '2026-07-15' },
      end: { date: '2026-07-18' },
    });

    const patch = eventToBlockPatch(event);

    expect(patch.scheduledOn).toBe('2026-07-15');
    expect(patch.startTime).toBeNull();
    expect(patch.durationMinutes).toBe(3 * 24 * 60);
    expect(patch.title).toBe('Conference');
    expect('notes' in patch).toBe(false);
  });

  it('derives the local day key and time-of-day for a timed event from the instant, not from string-slicing an offset that may not match device-local', () => {
    // Sharp boundary case for the "late evening west of UTC" trap: an
    // instant that is 2026-07-16 in UTC but still 2026-07-15 local for any
    // device west of UTC (or vice versa for devices east of UTC). Rather
    // than hardcode one offset, assert against `localDayKey`/local getters
    // the same way the source itself resolves them, so this is correct on
    // any machine's timezone.
    const start = new Date(2026, 6, 15, 23, 45, 0, 0); // 11:45pm local
    const end = new Date(start.getTime() + 30 * 60_000); // crosses local midnight
    const event = makeEvent({
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    });

    const patch = eventToBlockPatch(event);

    expect(patch.scheduledOn).toBe(localDayKey(start));
    expect(patch.startTime).toBe('23:45:00');
    expect(patch.durationMinutes).toBe(30);
  });

  it('round-trips blockToEventInput output back through eventToBlockPatch for a block with explicit time/duration', () => {
    const block = makeBlock({
      scheduledOn: '2026-07-15',
      startTime: '14:30:00',
      durationMinutes: 45,
      title: 'Deep work',
      notes: 'Bring headphones',
    });
    const eventInput = blockToEventInput(block);
    const event = makeEvent({
      summary: eventInput.summary,
      description: eventInput.description,
      start: { dateTime: eventInput.start },
      end: { dateTime: eventInput.end },
    });

    const patch = eventToBlockPatch(event);

    expect(patch.title).toBe(block.title);
    expect(patch.notes).toBe(block.notes);
    expect(patch.scheduledOn).toBe(block.scheduledOn);
    expect(patch.startTime).toBe(block.startTime);
    expect(patch.durationMinutes).toBe(block.durationMinutes);
  });
});
