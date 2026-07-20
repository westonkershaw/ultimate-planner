/**
 * ritual-prefs.ts — local-only preferences for the nightly ritual and
 * reflection moments (Roadmap Phase 4c). Same single-AsyncStorage-key +
 * JSON.stringify/parse approach as planning-prefs.ts (Phase 4b) — one key
 * per preference, since these are simple independent toggles/values rather
 * than one grouped object.
 *
 * This module does NOT schedule any notification itself. It only persists
 * plain values for notifications.ts (and whatever UI screen wires the two
 * together) to read and act on.
 *
 * Per the roadmap, both the nightly ritual and reflection moments are OFF
 * by default until the user explicitly opts in.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const NIGHTLY_RITUAL_ENABLED_KEY = 'ritual_prefs_nightly_enabled_v1';
const NIGHTLY_RITUAL_TIME_KEY = 'ritual_prefs_nightly_time_v1';
const REFLECTION_MOMENTS_ENABLED_KEY = 'ritual_prefs_reflection_enabled_v1';

const DEFAULT_NIGHTLY_RITUAL_TIME = '21:00';

/** Returns whether the nightly ritual reminder is enabled. Defaults to false. */
export async function getNightlyRitualEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(NIGHTLY_RITUAL_ENABLED_KEY);
  if (!raw) return false;
  try {
    return (JSON.parse(raw) as boolean) === true;
  } catch {
    return false;
  }
}

/** Persists whether the nightly ritual reminder is enabled. */
export async function setNightlyRitualEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NIGHTLY_RITUAL_ENABLED_KEY, JSON.stringify(enabled));
}

/** Returns the stored nightly-ritual time, or the "21:00" default if never set. */
export async function getNightlyRitualTime(): Promise<string> {
  const raw = await AsyncStorage.getItem(NIGHTLY_RITUAL_TIME_KEY);
  if (!raw) return DEFAULT_NIGHTLY_RITUAL_TIME;
  try {
    return (JSON.parse(raw) as string) || DEFAULT_NIGHTLY_RITUAL_TIME;
  } catch {
    return DEFAULT_NIGHTLY_RITUAL_TIME;
  }
}

/** Persists the user's preferred nightly-ritual time-of-day, "HH:MM" 24-hour. */
export async function setNightlyRitualTime(time: string): Promise<void> {
  await AsyncStorage.setItem(NIGHTLY_RITUAL_TIME_KEY, JSON.stringify(time));
}

/** Returns whether reflection moments are enabled. Defaults to false. */
export async function getReflectionMomentsEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(REFLECTION_MOMENTS_ENABLED_KEY);
  if (!raw) return false;
  try {
    return (JSON.parse(raw) as boolean) === true;
  } catch {
    return false;
  }
}

/** Persists whether reflection moments are enabled. */
export async function setReflectionMomentsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(REFLECTION_MOMENTS_ENABLED_KEY, JSON.stringify(enabled));
}
