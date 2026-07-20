/**
 * ritual-prefs.test.ts — coverage for the nightly-ritual/reflection-moments
 * local preferences (Roadmap Phase 4c).
 *
 * `@react-native-async-storage/async-storage` is replaced with a small
 * in-memory `vi.mock` (get/set/remove/clear backed by a plain object) so
 * these run in plain node with zero native dependency. There is no existing
 * planning-prefs.test.ts to mirror in this codebase yet, so this mock uses
 * the same "one key per preference, JSON.stringify/parse" contract that
 * ritual-prefs.ts itself documents borrowing from planning-prefs.ts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => store.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  },
}));

import {
  getNightlyRitualEnabled,
  getNightlyRitualTime,
  getReflectionMomentsEnabled,
  setNightlyRitualEnabled,
  setNightlyRitualTime,
  setReflectionMomentsEnabled,
} from '../ritual-prefs';

beforeEach(() => {
  store.clear();
});

describe('defaults when nothing has ever been stored', () => {
  it('nightly ritual enabled defaults to false', async () => {
    await expect(getNightlyRitualEnabled()).resolves.toBe(false);
  });

  it('reflection moments enabled defaults to false', async () => {
    await expect(getReflectionMomentsEnabled()).resolves.toBe(false);
  });

  it('nightly ritual time defaults to the documented "21:00"', async () => {
    await expect(getNightlyRitualTime()).resolves.toBe('21:00');
  });
});

describe('set then get round trips', () => {
  it('round trips nightly ritual enabled = true', async () => {
    await setNightlyRitualEnabled(true);
    await expect(getNightlyRitualEnabled()).resolves.toBe(true);
  });

  it('round trips nightly ritual enabled back to false', async () => {
    await setNightlyRitualEnabled(true);
    await setNightlyRitualEnabled(false);
    await expect(getNightlyRitualEnabled()).resolves.toBe(false);
  });

  it('round trips reflection moments enabled = true', async () => {
    await setReflectionMomentsEnabled(true);
    await expect(getReflectionMomentsEnabled()).resolves.toBe(true);
  });

  it('round trips a custom nightly ritual time', async () => {
    await setNightlyRitualTime('22:30');
    await expect(getNightlyRitualTime()).resolves.toBe('22:30');
  });

  it('round trips a midnight-adjacent nightly ritual time', async () => {
    await setNightlyRitualTime('23:59');
    await expect(getNightlyRitualTime()).resolves.toBe('23:59');
  });

  it('keeps the three preferences independent of one another', async () => {
    await setNightlyRitualEnabled(true);
    await setNightlyRitualTime('06:15');
    await setReflectionMomentsEnabled(false);

    await expect(getNightlyRitualEnabled()).resolves.toBe(true);
    await expect(getNightlyRitualTime()).resolves.toBe('06:15');
    await expect(getReflectionMomentsEnabled()).resolves.toBe(false);
  });
});
