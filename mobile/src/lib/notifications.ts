/**
 * notifications.ts — thin wrapper around expo-notifications (Roadmap Phase 4c).
 *
 * Every export here talks to the OS/native module and nothing else — no UI,
 * no explanation dialogs, no preference reads/writes (see ritual-prefs.ts for
 * the persisted on/off + time values this schedules against). Kept as small
 * top-level functions (not a class) so each one is trivially mockable by
 * jest/vitest's `vi.mock('expo-notifications', ...)` per function.
 *
 * Trigger shapes verified against the installed package
 * (node_modules/expo-notifications/build/Notifications.types.d.ts +
 * NotificationScheduler.types.d.ts, expo-notifications ~57.0.6):
 *   - Daily:  { type: SchedulableTriggerInputTypes.DAILY, hour, minute }
 *   - Weekly: { type: SchedulableTriggerInputTypes.WEEKLY, weekday, hour, minute }
 *     `repeats` is NOT a field on either — daily/weekly triggers repeat
 *     implicitly by construction (unlike CALENDAR/TIME_INTERVAL, which take
 *     an explicit `repeats: boolean`).
 *   - Weekday numbering: 1–7, where 1 = Sunday (see WeeklyTriggerInput doc
 *     comment: "Weekdays are specified with a number from `1` through `7`,
 *     with `1` indicating Sunday"). This is NOT JS Date#getDay() (0-based) —
 *     callers must add 1 when converting from a Date-derived weekday.
 *
 * Every function catches and swallows native-module errors (e.g. thrown
 * during the parallel native rebuild, or on a device that denied
 * permissions) so a scheduling failure can never crash the caller.
 */

import * as Notifications from 'expo-notifications';
import type { EventSubscription } from 'expo-notifications';

/**
 * Ensures the app has notification permission, prompting only when the OS
 * hasn't already recorded a decision. Safe to call on every app launch or
 * every time the user flips a reminder toggle on:
 *   - already granted -> returns true, no prompt
 *   - already permanently denied -> returns false, no prompt (re-prompting
 *     a denied permission is a no-op on both platforms anyway)
 *   - undetermined -> prompts once, returns the result
 *
 * Does NOT show any custom in-app explanation — the UI layer is expected to
 * have already shown the user why notifications are useful before calling
 * this, per the roadmap's permission-priming pattern.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

/**
 * Schedules a locally repeating daily notification at the given device-local
 * hour/minute, tagged with `id` so it can be found again by
 * cancelScheduledReminder. `data` is attached as-is to the notification
 * content so a tap listener can read it to decide where to navigate.
 *
 * Returns true if the OS accepted the schedule request, false if anything
 * (including a not-yet-ready native module) went wrong.
 */
export async function scheduleDailyReminder(
  id: string,
  hour: number,
  minute: number,
  title: string,
  body: string,
  data: object
): Promise<boolean> {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, data: data as Record<string, unknown> },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedules a locally repeating weekly notification on the given weekday at
 * the given device-local hour/minute, tagged with `id`.
 *
 * `weekday` uses expo-notifications' own convention: 1–7, where 1 = Sunday
 * (NOT JS `Date#getDay()`, which is 0-based with 0 = Sunday — convert with
 * `date.getDay() + 1` at the call site).
 */
export async function scheduleWeeklyReminder(
  id: string,
  weekday: number,
  hour: number,
  minute: number,
  title: string,
  body: string,
  data: object
): Promise<boolean> {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, data: data as Record<string, unknown> },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** Cancels whichever previously scheduled notification carries `id`, if any. */
export async function cancelScheduledReminder(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Nothing to cancel, or the native module isn't ready — either way
    // there's no state left for the caller to worry about.
  }
}

/**
 * Registers a listener fired when the user taps a delivered notification,
 * handing the callback the tapped notification's data payload (the same
 * object passed to `data` in scheduleDailyReminder/scheduleWeeklyReminder)
 * so the caller can decide where to deep link.
 *
 * Wraps `Notifications.addNotificationResponseReceivedListener`. Returns a
 * no-op unsubscribe function if registration itself throws, so callers can
 * always call the returned function unconditionally on cleanup.
 */
export function addNotificationTapListener(
  callback: (data: Record<string, unknown>) => void
): EventSubscription {
  try {
    return Notifications.addNotificationResponseReceivedListener((response) => {
      callback(response.notification.request.content.data ?? {});
    });
  } catch {
    return { remove: () => {} };
  }
}
