/**
 * notifications.test.ts — coverage for the expo-notifications wrapper
 * (Roadmap Phase 4c).
 *
 * The entire `expo-notifications` package is replaced with a `vi.mock` so
 * these run in plain node with zero native dependency — none of the mocked
 * functions touch anything but an in-memory jest/vitest mock fn. No real
 * timers, no randomness.
 *
 * `SchedulableTriggerInputTypes` is a real enum re-exported from the mock
 * (not re-derived by hand) so a typo in notifications.ts's trigger-shape
 * construction would fail against the same values the source imports.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `vi.mock` factories are hoisted above imports/top-level consts, so anything
// the factory closes over must itself be created via `vi.hoisted` — a plain
// `const`/`enum` declared here would be undefined inside the factory at
// evaluation time (surfaced as "Cannot read properties of undefined (reading
// 'DAILY')" the first time this was written without `vi.hoisted`).
const {
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  addNotificationResponseReceivedListener,
  SchedulableTriggerInputTypes,
} = vi.hoisted(() => ({
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn(),
  addNotificationResponseReceivedListener: vi.fn(),
  // Real enum values from expo-notifications' Notifications.types.d.ts.
  SchedulableTriggerInputTypes: {
    CALENDAR: 'calendar',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
  } as const,
}));

vi.mock('expo-notifications', () => ({
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  addNotificationResponseReceivedListener,
  SchedulableTriggerInputTypes,
}));

import {
  addNotificationTapListener,
  cancelScheduledReminder,
  requestNotificationPermission,
  scheduleDailyReminder,
  scheduleWeeklyReminder,
} from '../notifications';

beforeEach(() => {
  getPermissionsAsync.mockReset();
  requestPermissionsAsync.mockReset();
  scheduleNotificationAsync.mockReset();
  cancelScheduledNotificationAsync.mockReset();
  addNotificationResponseReceivedListener.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requestNotificationPermission', () => {
  it('does not prompt and returns true when already granted', async () => {
    getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });

    const result = await requestNotificationPermission();

    expect(result).toBe(true);
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('does not prompt and returns false when previously denied permanently', async () => {
    getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });

    const result = await requestNotificationPermission();

    expect(result).toBe(false);
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('prompts when undetermined and returns the prompt result (granted)', async () => {
    getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });

    const result = await requestNotificationPermission();

    expect(requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it('prompts when undetermined and returns the prompt result (denied)', async () => {
    getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    requestPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });

    const result = await requestNotificationPermission();

    expect(requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(result).toBe(false);
  });

  it('resolves to false without throwing when the native check rejects', async () => {
    getPermissionsAsync.mockRejectedValue(new Error('native module not ready'));

    await expect(requestNotificationPermission()).resolves.toBe(false);
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('resolves to false without throwing when the native request rejects', async () => {
    getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    requestPermissionsAsync.mockRejectedValue(new Error('user dismissed'));

    await expect(requestNotificationPermission()).resolves.toBe(false);
  });
});

describe('scheduleDailyReminder', () => {
  it('schedules with a DAILY trigger and passes identifier/data through', async () => {
    scheduleNotificationAsync.mockResolvedValue('some-native-id');

    const result = await scheduleDailyReminder(
      'nightly-ritual',
      21,
      0,
      'Nightly ritual',
      'Time to reflect',
      { screen: 'ritual' }
    );

    expect(result).toBe(true);
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: 'nightly-ritual',
      content: {
        title: 'Nightly ritual',
        body: 'Time to reflect',
        data: { screen: 'ritual' },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
    });
  });

  it('resolves to false without throwing when scheduling rejects', async () => {
    scheduleNotificationAsync.mockRejectedValue(new Error('native module not ready'));

    await expect(
      scheduleDailyReminder('nightly-ritual', 21, 0, 'Title', 'Body', {})
    ).resolves.toBe(false);
  });
});

describe('scheduleWeeklyReminder', () => {
  it('schedules with a WEEKLY trigger and passes identifier/data through', async () => {
    scheduleNotificationAsync.mockResolvedValue('some-native-id');

    const result = await scheduleWeeklyReminder(
      'weekly-planning',
      2, // Monday, expo-notifications 1-7 with 1 = Sunday
      9,
      0,
      'Weekly planning',
      'Plan your week',
      { screen: 'weekly-wizard' }
    );

    expect(result).toBe(true);
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: 'weekly-planning',
      content: {
        title: 'Weekly planning',
        body: 'Plan your week',
        data: { screen: 'weekly-wizard' },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2,
        hour: 9,
        minute: 0,
      },
    });
  });

  it('resolves to false without throwing when scheduling rejects', async () => {
    scheduleNotificationAsync.mockRejectedValue(new Error('native module not ready'));

    await expect(
      scheduleWeeklyReminder('weekly-planning', 2, 9, 0, 'Title', 'Body', {})
    ).resolves.toBe(false);
  });
});

describe('cancelScheduledReminder', () => {
  it('calls cancelScheduledNotificationAsync with the given identifier', async () => {
    cancelScheduledNotificationAsync.mockResolvedValue(undefined);

    await cancelScheduledReminder('nightly-ritual');

    expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith('nightly-ritual');
  });

  it('resolves without throwing when cancellation rejects', async () => {
    cancelScheduledNotificationAsync.mockRejectedValue(new Error('nothing scheduled'));

    await expect(cancelScheduledReminder('nightly-ritual')).resolves.toBeUndefined();
  });
});

describe('addNotificationTapListener', () => {
  it('registers a listener and forwards the tapped notification data payload', () => {
    let registeredCallback: ((response: unknown) => void) | undefined;
    addNotificationResponseReceivedListener.mockImplementation((cb: (r: unknown) => void) => {
      registeredCallback = cb;
      return { remove: vi.fn() };
    });

    const received: Record<string, unknown>[] = [];
    addNotificationTapListener((data) => received.push(data));

    expect(registeredCallback).toBeTypeOf('function');
    registeredCallback?.({
      notification: { request: { content: { data: { screen: 'ritual' } } } },
    });

    expect(received).toEqual([{ screen: 'ritual' }]);
  });

  it('forwards an empty object when the tapped notification has no data', () => {
    let registeredCallback: ((response: unknown) => void) | undefined;
    addNotificationResponseReceivedListener.mockImplementation((cb: (r: unknown) => void) => {
      registeredCallback = cb;
      return { remove: vi.fn() };
    });

    const received: Record<string, unknown>[] = [];
    addNotificationTapListener((data) => received.push(data));

    registeredCallback?.({
      notification: { request: { content: { data: undefined } } },
    });

    expect(received).toEqual([{}]);
  });

  it('returns a no-op unsubscribe function without throwing when registration itself throws', () => {
    addNotificationResponseReceivedListener.mockImplementation(() => {
      throw new Error('native module not ready');
    });

    let subscription: { remove: () => void } | undefined;
    expect(() => {
      subscription = addNotificationTapListener(() => {});
    }).not.toThrow();

    expect(subscription).toBeDefined();
    expect(() => subscription?.remove()).not.toThrow();
  });
});
