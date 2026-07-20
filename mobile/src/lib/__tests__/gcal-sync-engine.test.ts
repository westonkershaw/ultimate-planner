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
import { blockToEventInput, planSync } from '../gcal-sync-engine';
import type { GCalEvent, SyncableBlock } from '../gcal-types';
import { startOfLocalDay } from '../time-policy';

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
  });

  it('leaves a linked block out of every array when local updatedAt is before remote updated', () => {
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
  it('produces a SyncPlan with all four arrays empty for empty local blocks and empty remote events', () => {
    const plan = planSync([], []);
    expect(plan).toEqual({
      toCreateRemote: [],
      toUpdateRemote: [],
      toDeleteRemote: [],
      toLinkLocal: [],
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
