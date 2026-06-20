/**
 * Google Calendar Sync Utility
 *
 * Handles OAuth 2.0 token exchange and Calendar API operations.
 * Uses Google Identity Services (GIS) for auth and Calendar API v3 for sync.
 */

const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const LS_KEY = 'up_gcal_token';
const LS_SYNC_KEY = 'up_gcal_last_sync';

// ── Token management ─────────────────────────────────────────────────────────

export function getStoredToken() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const token = JSON.parse(raw);
    // Check if expired
    if (token.expiresAt && Date.now() > token.expiresAt) return null;
    return token;
  } catch { return null; }
}

export function storeToken(token) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      ...token,
      expiresAt: Date.now() + (token.expires_in || 3600) * 1000,
    }));
  } catch { /* ignore */ }
}

export function clearToken() {
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_SYNC_KEY);
}

export function isConnected() {
  return !!getStoredToken();
}

export function getLastSyncTime() {
  try {
    return localStorage.getItem(LS_SYNC_KEY) || null;
  } catch { return null; }
}

// ── OAuth flow ──────────────���────────────────────────────────────────────────

/**
 * Initiate Google Calendar OAuth consent.
 * Returns a promise that resolves with the access token.
 */
export function requestCalendarAccess(clientId) {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services not loaded'));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        storeToken(response);
        resolve(response);
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

// ── Calendar API helpers ─────────────────────────────────────────────────────

async function calendarFetch(endpoint, token, options = {}) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Calendar API error: ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch events from Google Calendar for a given date range.
 */
export async function fetchEvents(timeMin, timeMax) {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const params = new URLSearchParams({
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  return calendarFetch(`/calendars/primary/events?${params}`, token);
}

/**
 * Create a new event on Google Calendar.
 */
export async function createEvent(event) {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  return calendarFetch('/calendars/primary/events', token, {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

/**
 * Update an existing event on Google Calendar.
 */
export async function updateEvent(eventId, event) {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  return calendarFetch(`/calendars/primary/events/${eventId}`, token, {
    method: 'PUT',
    body: JSON.stringify(event),
  });
}

/**
 * Delete an event from Google Calendar.
 */
export async function deleteEvent(eventId) {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token.access_token}` },
    }
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete event: ${res.status}`);
  }
}

// ── Sync logic ───────────────────────────────────────────────────────────────

/**
 * Convert a local time block to a Google Calendar event resource.
 */
function timeBlockToGcalEvent(block, weekDates) {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayIdx = DAYS.indexOf(block.day);
  const date = weekDates?.[dayIdx];
  if (!date) return null;

  const startDate = new Date(date);
  startDate.setHours(block.startHour, block.startMin, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(block.endHour, block.endMin, 0, 0);

  return {
    summary: block.title,
    start: { dateTime: startDate.toISOString() },
    end: { dateTime: endDate.toISOString() },
    extendedProperties: {
      private: { ultimatePlannerBlockId: block.id },
    },
  };
}

/**
 * Convert a Google Calendar event to a local time block.
 */
function gcalEventToTimeBlock(event) {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const start = new Date(event.start.dateTime || event.start.date);
  const end = new Date(event.end.dateTime || event.end.date);

  return {
    id: `gcal_${event.id}`,
    gcalId: event.id,
    day: DAYS[start.getDay()] === 'Sunday' ? 'Sunday' : DAYS[start.getDay()],
    title: event.summary || 'Untitled',
    color: '#4285f4',
    startHour: start.getHours(),
    startMin: start.getMinutes(),
    endHour: end.getHours(),
    endMin: end.getMinutes(),
    synced: true,
  };
}

/**
 * Export weekly planner tasks as Google Calendar events.
 * Tasks without a time get exported as all-day events for their day.
 * Returns { exported: number }
 */
export async function exportTasksToGcal(weekDays, weekDates) {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated with Google Calendar');

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let exported = 0;

  for (let i = 0; i < 7; i++) {
    const day = DAYS[i];
    const date = weekDates[i];
    if (!date) continue;

    const tasks = weekDays?.[day]?.tasks || [];
    const events = weekDays?.[day]?.events || [];

    // Export tasks
    for (const task of tasks) {
      if (task.exportedToGcal) continue; // already exported

      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

      let gcalEvent;
      if (task.time) {
        // Task has a time — create timed event (1 hour default)
        const parsed = parseTimeString(task.time, date);
        if (parsed) {
          const end = new Date(parsed);
          end.setHours(end.getHours() + 1);
          gcalEvent = {
            summary: task.text,
            start: { dateTime: parsed.toISOString() },
            end: { dateTime: end.toISOString() },
            description: task.category ? `Category: ${task.category}` : undefined,
            extendedProperties: { private: { ultimatePlannerTaskId: task.id } },
          };
        }
      }

      if (!gcalEvent) {
        // No time — create all-day event
        gcalEvent = {
          summary: task.text,
          start: { date: dateStr },
          end: { date: dateStr },
          description: task.category ? `Category: ${task.category}` : undefined,
          extendedProperties: { private: { ultimatePlannerTaskId: task.id } },
        };
      }

      try {
        await createEvent(gcalEvent);
        exported++;
      } catch (err) {
        console.warn('Failed to export task:', task.text, err);
      }
    }

    // Export day events that have start/end times
    for (const event of events) {
      if (event.importedFromGcal || event.exportedToGcal) continue;

      const startParsed = parseTimeString(event.startTime, date);
      const endParsed = parseTimeString(event.endTime, date);

      if (startParsed && endParsed) {
        try {
          await createEvent({
            summary: event.title,
            start: { dateTime: startParsed.toISOString() },
            end: { dateTime: endParsed.toISOString() },
            colorId: undefined,
            description: event.notes || undefined,
            extendedProperties: { private: { ultimatePlannerEventId: event.id } },
          });
          exported++;
        } catch (err) {
          console.warn('Failed to export event:', event.title, err);
        }
      }
    }
  }

  localStorage.setItem(LS_SYNC_KEY, new Date().toISOString());
  return { exported };
}

/** Parse a time string like "7:00 AM" or "2:30 PM" into a Date */
function parseTimeString(timeStr, baseDate) {
  if (!timeStr || !baseDate) return null;
  try {
    const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?/);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2] || '0', 10);
    const period = (match[3] || '').toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    const d = new Date(baseDate);
    d.setHours(hours, mins, 0, 0);
    return d;
  } catch { return null; }
}

/**
 * Two-way sync: push local time blocks to Google Calendar,
 * pull Google Calendar events to local.
 * Returns { pushed: number, pulled: number }
 */
export async function syncCalendar(localBlocks, weekDates, onChange) {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated with Google Calendar');

  // Get this week's date range
  const timeMin = new Date(weekDates[0]);
  timeMin.setHours(0, 0, 0, 0);
  const timeMax = new Date(weekDates[6]);
  timeMax.setHours(23, 59, 59, 999);

  // Fetch remote events
  const remote = await fetchEvents(timeMin, timeMax);
  const remoteEvents = remote.items || [];

  // Find local blocks that haven't been synced yet
  const unsyncedLocal = localBlocks.filter(b => !b.synced && !b.gcalId);
  let pushed = 0;

  // Push unsynced local blocks to Google
  for (const block of unsyncedLocal) {
    const gcalEvent = timeBlockToGcalEvent(block, weekDates);
    if (!gcalEvent) continue;
    try {
      const created = await createEvent(gcalEvent);
      // Mark as synced in local state
      onChange(prev => ({
        ...prev,
        timeBlocks: (prev.timeBlocks || []).map(b =>
          b.id === block.id ? { ...b, gcalId: created.id, synced: true } : b
        ),
      }));
      pushed++;
    } catch (err) {
      console.warn('Failed to push block to Google Calendar:', err);
    }
  }

  // Pull remote events that don't exist locally
  const localGcalIds = new Set(localBlocks.filter(b => b.gcalId).map(b => b.gcalId));
  const newRemote = remoteEvents.filter(e =>
    !localGcalIds.has(e.id) &&
    e.start?.dateTime // Skip all-day events
  );

  if (newRemote.length > 0) {
    const newBlocks = newRemote.map(gcalEventToTimeBlock);
    onChange(prev => ({
      ...prev,
      timeBlocks: [...(prev.timeBlocks || []), ...newBlocks],
    }));
  }

  // Record sync time
  localStorage.setItem(LS_SYNC_KEY, new Date().toISOString());

  return { pushed, pulled: newRemote.length };
}
