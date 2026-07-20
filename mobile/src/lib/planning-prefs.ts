/**
 * planning-prefs.ts — local-only preference for when the user wants their
 * weekly planning session (Roadmap Phase 4b). Same single-AsyncStorage-key
 * + JSON.stringify/parse approach as the Supabase client's own session
 * storage (src/lib/supabase.ts uses AsyncStorage directly under the hood) —
 * this module just does it for one small plain-object value instead of an
 * auth session.
 *
 * This module does NOT schedule any notification. It only persists the
 * user's chosen day/time as a plain value for a later sub-branch (which
 * brings in expo-notifications) to read and act on.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export interface WeeklyPlanningPreference {
  weekday: Weekday;
  /** 24-hour "HH:MM" time-of-day, e.g. "09:00". */
  time: string;
}

const STORAGE_KEY = 'planning_prefs_weekly_v1';

/** Returns the stored preference, or null if the user has never set one. */
export async function getWeeklyPlanningPreference(): Promise<WeeklyPlanningPreference | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WeeklyPlanningPreference;
  } catch {
    return null;
  }
}

/** Persists the user's preferred weekly-planning weekday and time-of-day. */
export async function setWeeklyPlanningPreference(weekday: Weekday, time: string): Promise<void> {
  const value: WeeklyPlanningPreference = { weekday, time };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}
