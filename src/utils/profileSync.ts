/**
 * profileSync.ts
 *
 * The backend access layer for the learning profile. Supabase is the source of
 * truth; localStorage is a cache + offline fallback. Both clients (web + the
 * App Store wrapper) go through here, so phone and web read/write the same row.
 *
 * Everything degrades gracefully: when Supabase is unconfigured (or a network
 * call fails), we transparently use the local cache so the feature keeps working
 * and nothing breaks pre-provisioning.
 */

import { getSupabase, isSupabaseEnabled } from './supabase';
import { migrateProfile } from './profileEngine';
import type { LearnedProfile, LearningEvent } from '@/types';

const PROFILE_KEY = (uid: string): string => `up_profile_v1_${uid}`;
const EVENTS_KEY = (uid: string): string => `up_learning_events_${uid}`;
const EVENTS_CAP = 500;

const uid = (): string => Math.random().toString(36).slice(2, 12);

/** Current auth user id, matching AuthGate's `user?.id ?? 'guest'` convention. */
export function currentUserId(): string {
  try {
    const raw = localStorage.getItem('up_auth_v4');
    const auth = raw ? (JSON.parse(raw) as { id?: string }) : null;
    return auth?.id ?? 'guest';
  } catch {
    return 'guest';
  }
}

/** Only sync to Supabase for real (non-guest) authenticated users. */
function canUseCloud(userId: string): boolean {
  return isSupabaseEnabled() && userId !== 'guest' && !userId.startsWith('local-');
}

// ── Local cache helpers ─────────────────────────────────────────────────────

function readLocalProfile(userId: string): LearnedProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY(userId));
    return raw ? migrateProfile(JSON.parse(raw), userId) : null;
  } catch {
    return null;
  }
}

function writeLocalProfile(profile: LearnedProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY(profile.userId), JSON.stringify(profile));
  } catch {
    /* ignore quota errors */
  }
}

function readLocalEvents(userId: string): LearningEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY(userId));
    return raw ? (JSON.parse(raw) as LearningEvent[]) : [];
  } catch {
    return [];
  }
}

function writeLocalEvents(userId: string, events: LearningEvent[]): void {
  try {
    localStorage.setItem(EVENTS_KEY(userId), JSON.stringify(events.slice(-EVENTS_CAP)));
  } catch {
    /* ignore */
  }
}

// ── Profile ─────────────────────────────────────────────────────────────────

/** Fetch the profile (cloud first, else local cache). Returns null if none. */
export async function fetchProfile(userId: string): Promise<LearnedProfile | null> {
  if (canUseCloud(userId)) {
    try {
      const sb = getSupabase()!;
      const { data, error } = await sb
        .from('user_profile')
        .select('profile')
        .eq('user_id', userId)
        .single();
      if (!error && data?.profile) {
        const profile = migrateProfile(data.profile, userId);
        writeLocalProfile(profile); // refresh cache
        return profile;
      }
    } catch {
      /* fall through to local */
    }
  }
  return readLocalProfile(userId);
}

/** Persist the profile to cloud (best-effort) and always to the local cache. */
export async function saveProfile(profile: LearnedProfile): Promise<void> {
  writeLocalProfile(profile);
  if (canUseCloud(profile.userId)) {
    try {
      const sb = getSupabase()!;
      await sb.from('user_profile').upsert(
        {
          user_id: profile.userId,
          schema_version: profile.schemaVersion,
          profile,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    } catch {
      /* cache already written; next sync will retry */
    }
  }
}

/** Wipe the stored profile row (used by full reset). */
export async function deleteProfile(userId: string): Promise<void> {
  try {
    localStorage.removeItem(PROFILE_KEY(userId));
  } catch {
    /* ignore */
  }
  if (canUseCloud(userId)) {
    try {
      await getSupabase()!.from('user_profile').delete().eq('user_id', userId);
    } catch {
      /* ignore */
    }
  }
}

// ── Events ──────────────────────────────────────────────────────────────────

/** Append one event (never throws; buffers locally and best-effort to cloud). */
export async function appendEvent(event: LearningEvent): Promise<void> {
  const buffered = [...readLocalEvents(event.userId), event];
  writeLocalEvents(event.userId, buffered);
  if (canUseCloud(event.userId)) {
    try {
      await getSupabase()!
        .from('learning_events')
        .insert({ user_id: event.userId, ts: event.ts, type: event.type, payload: event.payload });
    } catch {
      /* buffered locally; a future learn step still reads the local window */
    }
  }
}

/** Recent events for the learn step (cloud first, else local buffer). */
export async function fetchRecentEvents(userId: string, limit = EVENTS_CAP): Promise<LearningEvent[]> {
  if (canUseCloud(userId)) {
    try {
      const sb = getSupabase()!;
      const { data, error } = await sb
        .from('learning_events')
        .select('id, ts, type, payload')
        .eq('user_id', userId)
        .order('ts', { ascending: false })
        .limit(limit);
      if (!error && Array.isArray(data)) {
        return data
          .map((r) => ({
            id: String(r.id ?? uid()),
            userId,
            ts: String(r.ts),
            type: r.type as LearningEvent['type'],
            payload: (r.payload ?? {}) as LearningEvent['payload'],
          }))
          .reverse(); // chronological
      }
    } catch {
      /* fall through */
    }
  }
  return readLocalEvents(userId).slice(-limit);
}

/** Purge the event log (used by "Reset what's been learned"). */
export async function clearEvents(userId: string): Promise<void> {
  writeLocalEvents(userId, []);
  if (canUseCloud(userId)) {
    try {
      await getSupabase()!.from('learning_events').delete().eq('user_id', userId);
    } catch {
      /* ignore */
    }
  }
}
