/**
 * gcal-types.ts — Google Calendar sync types (Roadmap Phase 5, part one).
 *
 * Declarations only: the minimal event shape this sync needs from the
 * Google Calendar API v3, the client interface a later phase implements
 * against a real fetch (and that tests satisfy with a mock), and the subset
 * of the Block model (block-types.ts) the reconciliation engine cares about.
 * No network code, no Google sign-in, no implementation here.
 */

/**
 * Minimal shape of a Google Calendar API v3 event, trimmed to only what the
 * sync engine reads/writes. `start`/`end` mirror the real API's split
 * between timed events (`dateTime`) and all-day events (`date`).
 */
export interface GCalEvent {
  id: string;
  summary: string;
  description: string | undefined;
  start: { dateTime: string } | { date: string };
  end: { dateTime: string } | { date: string };
  /** ISO timestamp — this event's last-modified time on the Google side. */
  updated: string;
  extendedProperties: {
    /** Where the local block id is stamped so a later fetch can match it back. */
    private: Record<string, string>;
  };
}

/**
 * A real network-backed implementation and a test mock both satisfy this
 * shape identically. Declared only — not implemented in this file.
 */
export interface GoogleCalendarClient {
  listEvents(params: { updatedMin?: string }): Promise<GCalEvent[]>;
  createEvent(input: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    localBlockId: string;
  }): Promise<GCalEvent>;
  updateEvent(
    eventId: string,
    input: { summary?: string; description?: string; start?: string; end?: string }
  ): Promise<GCalEvent>;
  deleteEvent(eventId: string): Promise<void>;
}

/**
 * Minimal subset of Block (block-types.ts) the sync engine cares about.
 * `isDeleted` represents a block that was locally deleted but may still
 * need its remote event cleaned up — the actual deletion bookkeeping
 * mechanism (e.g. tombstoning already-deleted rows) is left to the caller
 * in a later phase; this type only needs to be able to represent the case.
 */
export interface SyncableBlock {
  id: string;
  title: string;
  notes: string | null;
  scheduledOn: string; // DEVICE-LOCAL day key (YYYY-MM-DD) from time-policy
  startTime: string | null;
  durationMinutes: number | null;
  googleCalendarEventId: string | null;
  updatedAt: string;
  isDeleted: boolean;
}
