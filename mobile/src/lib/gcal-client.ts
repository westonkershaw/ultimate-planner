/**
 * gcal-client.ts — real GoogleCalendarClient implementation (Roadmap Phase 5,
 * part two), talking to the Google Calendar API v3 directly via fetch. The
 * interface itself is declared in gcal-types.ts (part one) and satisfied
 * identically by a test mock — this file is the only place that knows about
 * network calls, HTTP status codes, or the Google REST endpoint shapes.
 *
 * Every method takes the caller's bearer access token as an argument rather
 * than reaching into gcal-auth.ts itself, so this file stays a pure "given a
 * token, talk to Google" client — gcal-sync-runner.ts is the one place that
 * decides where the token comes from (and what to do when there isn't one).
 *
 * LOCAL_BLOCK_ID_KEY below MUST stay in lockstep with the same-named
 * constant in gcal-sync-engine.ts (part one) — that engine matches remote
 * events back to local blocks by reading exactly this key out of
 * extendedProperties.private. Verified by reading gcal-sync-engine.ts before
 * writing this file.
 */

import type { GCalEvent, GoogleCalendarClient } from './gcal-types';

/** Must match LOCAL_BLOCK_ID_KEY in gcal-sync-engine.ts exactly. */
const LOCAL_BLOCK_ID_KEY = 'ultimatePlannerBlockId';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/** Google's error envelope: `{ error: { code, message, ... } }`. Read defensively — never trust the shape. */
async function extractGoogleErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === 'object' &&
      'error' in body &&
      body.error &&
      typeof body.error === 'object' &&
      'message' in body.error &&
      typeof body.error.message === 'string'
    ) {
      return body.error.message;
    }
  } catch {
    // Body wasn't JSON (or was empty) — fall through to the status-based message.
  }
  return `Google Calendar API request failed (${response.status})`;
}

/** Raw fetch response shape for a Google Calendar `events.list` call. */
interface GCalEventsListResponse {
  items?: unknown[];
}

/**
 * Narrows an unknown JSON value from Google into a GCalEvent, defaulting the
 * fields our own type requires but Google's response might omit (e.g. a
 * newly-created event with no description). Returns null for anything that
 * doesn't look like a usable event rather than throwing, so one malformed
 * item in a list response can't take down the whole sync.
 */
function toGCalEvent(raw: unknown): GCalEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.id !== 'string' || typeof obj.updated !== 'string') return null;

  const start = obj.start as Record<string, unknown> | undefined;
  const end = obj.end as Record<string, unknown> | undefined;
  if (!start || !end) return null;

  const startShape =
    typeof start.dateTime === 'string'
      ? { dateTime: start.dateTime }
      : typeof start.date === 'string'
        ? { date: start.date }
        : null;
  const endShape =
    typeof end.dateTime === 'string'
      ? { dateTime: end.dateTime }
      : typeof end.date === 'string'
        ? { date: end.date }
        : null;
  if (!startShape || !endShape) return null;

  const extendedProperties = obj.extendedProperties as Record<string, unknown> | undefined;
  const privateProps = extendedProperties?.private;
  const privateRecord: Record<string, string> =
    privateProps && typeof privateProps === 'object'
      ? Object.fromEntries(
          Object.entries(privateProps as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string'
          )
        )
      : {};

  return {
    id: obj.id,
    summary: typeof obj.summary === 'string' ? obj.summary : '',
    description: typeof obj.description === 'string' ? obj.description : undefined,
    start: startShape,
    end: endShape,
    updated: obj.updated,
    extendedProperties: { private: privateRecord },
  };
}

/**
 * Real, network-backed GoogleCalendarClient. `accessToken` must be a
 * currently-valid Google OAuth token (see gcal-auth.ts's
 * getGoogleAccessToken) — this client does not know how to obtain or refresh
 * one; an expired/invalid token simply surfaces as a thrown error from each
 * method (callers in gcal-sync-runner.ts are expected to check for a valid
 * token before ever constructing/calling this client).
 */
export function createGoogleCalendarClient(accessToken: string): GoogleCalendarClient {
  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  return {
    async listEvents({ updatedMin, timeMin, timeMax }) {
      const url = new URL(CALENDAR_API_BASE);
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('maxResults', '2500');
      if (updatedMin) {
        url.searchParams.set('updatedMin', updatedMin);
      }
      if (timeMin) {
        url.searchParams.set('timeMin', timeMin);
      }
      if (timeMax) {
        url.searchParams.set('timeMax', timeMax);
      }

      const response = await fetch(url.toString(), { headers: authHeaders });
      if (!response.ok) {
        throw new Error(await extractGoogleErrorMessage(response));
      }

      const body = (await response.json()) as GCalEventsListResponse;
      const items = Array.isArray(body.items) ? body.items : [];
      const events: GCalEvent[] = [];
      for (const item of items) {
        const event = toGCalEvent(item);
        if (event) events.push(event);
      }
      return events;
    },

    async createEvent(input) {
      const response = await fetch(CALENDAR_API_BASE, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          summary: input.summary,
          description: input.description,
          start: { dateTime: input.start },
          end: { dateTime: input.end },
          extendedProperties: {
            private: { [LOCAL_BLOCK_ID_KEY]: input.localBlockId },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(await extractGoogleErrorMessage(response));
      }

      const created = toGCalEvent(await response.json());
      if (!created) {
        throw new Error('Google Calendar returned an unrecognized event shape after create.');
      }
      return created;
    },

    async updateEvent(eventId, input) {
      // PATCH (not PUT) so we only ever touch the fields the caller passed,
      // and — critically — never clobber extendedProperties.private on an
      // update. Google preserves extendedProperties.private on PATCH as long
      // as we don't explicitly send a replacement for it, which is exactly
      // the "preserve the stamped key" behavior the sync engine relies on.
      const patch: Record<string, unknown> = {};
      if (input.summary !== undefined) patch.summary = input.summary;
      if (input.description !== undefined) patch.description = input.description;
      if (input.start !== undefined) patch.start = { dateTime: input.start };
      if (input.end !== undefined) patch.end = { dateTime: input.end };

      const response = await fetch(`${CALENDAR_API_BASE}/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        throw new Error(await extractGoogleErrorMessage(response));
      }

      const updated = toGCalEvent(await response.json());
      if (!updated) {
        throw new Error('Google Calendar returned an unrecognized event shape after update.');
      }
      return updated;
    },

    async deleteEvent(eventId) {
      const response = await fetch(`${CALENDAR_API_BASE}/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      // Google returns 410 Gone for an event that's already deleted — treat
      // that as success too, since the end state (no such remote event) is
      // exactly what the caller wanted.
      if (!response.ok && response.status !== 410) {
        throw new Error(await extractGoogleErrorMessage(response));
      }
    },
  };
}
