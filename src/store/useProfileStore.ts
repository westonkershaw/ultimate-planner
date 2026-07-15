/**
 * useProfileStore
 *
 * In-memory access to the LearnedProfile. The backend (Supabase) is the source
 * of truth; this store hydrates from it (via profileSync) on user change and
 * writes back on every mutation. It is intentionally NOT persisted itself — the
 * cache lives in profileSync so there's exactly one local copy.
 *
 * The learn step (deriveProfile) is deterministic and cheap, so it runs on the
 * client at review time and the result is saved to the shared row.
 */

import { create } from 'zustand';
import {
  emptyProfile,
  deriveProfile,
  applyOverrides,
} from '@/utils/profileEngine';
import {
  fetchProfile,
  saveProfile,
  fetchRecentEvents,
  deleteProfile,
  clearEvents,
} from '@/utils/profileSync';
import type { LearnedProfile, ProfileGoal } from '@/types';

interface RunLearnOptions {
  /** Current goal snapshot to sync into identity.goals. */
  goals?: ProfileGoal[];
  /** User-authored values (preserved from current if omitted). */
  values?: string[];
  now?: Date;
}

interface ProfileState {
  profile: LearnedProfile | null;
  ownedBy: string;
  loading: boolean;
}

interface ProfileActions {
  /** Load (or seed) the profile for a user. */
  hydrate: (userId: string) => Promise<void>;
  /** Re-key on auth change (mirrors the other per-user stores). */
  resetForUser: (userId: string) => void;
  /** Run the deterministic learn step over recent events and persist. */
  runLearn: (opts?: RunLearnOptions) => Promise<void>;
  /** Pin a value the learn step must never overwrite. */
  setOverride: (path: string, value: unknown) => void;
  /** Un-pin (the learned value returns on the next learn run). */
  removeOverride: (path: string) => void;
  /** Hide an insight the user disagrees with. */
  dismissInsight: (id: string) => void;
  /** Edit the user-authored values list. */
  setValues: (values: string[]) => void;
  /** Clear what's been LEARNED (behaviour, insights, observed prefs); keep identity. */
  resetLearned: () => Promise<void>;
  /** Nuke the entire profile + event log. */
  resetAll: () => Promise<void>;
}

export type ProfileStore = ProfileState & ProfileActions;

function persist(profile: LearnedProfile): void {
  void saveProfile(profile);
}

export const useProfileStore = create<ProfileStore>()((set, get) => ({
  profile: null,
  ownedBy: '',
  loading: false,

  hydrate: async (userId) => {
    set({ loading: true });
    const existing = await fetchProfile(userId);
    // Seed an in-memory empty profile if none yet; it's only saved once the
    // user actually generates data (avoids empty rows for tyre-kickers).
    set({ profile: existing ?? emptyProfile(userId), ownedBy: userId, loading: false });
  },

  resetForUser: (userId) => {
    if (get().ownedBy === userId && get().profile) return;
    set({ profile: null, ownedBy: userId });
    void get().hydrate(userId);
  },

  runLearn: async (opts = {}) => {
    const userId = get().ownedBy || get().profile?.userId || 'guest';
    const current = get().profile ?? emptyProfile(userId);
    const events = await fetchRecentEvents(userId);
    const next = deriveProfile({
      current,
      events,
      now: opts.now,
      goals: opts.goals,
      values: opts.values,
    });
    set({ profile: next });
    persist(next);
  },

  setOverride: (path, value) => {
    const current = get().profile;
    if (!current) return;
    const next = applyOverrides({
      ...current,
      overrides: { ...current.overrides, [path]: value },
      updatedAt: new Date().toISOString(),
    });
    set({ profile: next });
    persist(next);
  },

  removeOverride: (path) => {
    const current = get().profile;
    if (!current) return;
    const overrides = { ...current.overrides };
    delete overrides[path];
    const next = { ...current, overrides, updatedAt: new Date().toISOString() };
    set({ profile: next });
    persist(next);
  },

  dismissInsight: (id) => {
    const current = get().profile;
    if (!current) return;
    const prev = Array.isArray(current.overrides['dismissedInsights'])
      ? (current.overrides['dismissedInsights'] as string[])
      : [];
    const dismissed = Array.from(new Set([...prev, id]));
    get().setOverride('dismissedInsights', dismissed);
  },

  setValues: (values) => {
    const current = get().profile;
    if (!current) return;
    const next = applyOverrides({
      ...current,
      identity: { ...current.identity, values },
      overrides: { ...current.overrides, 'identity.values': values },
      updatedAt: new Date().toISOString(),
    });
    set({ profile: next });
    persist(next);
  },

  resetLearned: async () => {
    const current = get().profile;
    if (!current) return;
    const fresh = emptyProfile(current.userId);
    // Preserve user-authored identity and any explicit overrides.
    const next = applyOverrides({
      ...fresh,
      identity: current.identity,
      overrides: current.overrides,
      updatedAt: new Date().toISOString(),
    });
    set({ profile: next });
    persist(next);
    await clearEvents(current.userId);
  },

  resetAll: async () => {
    const userId = get().ownedBy || get().profile?.userId || 'guest';
    const fresh = emptyProfile(userId);
    set({ profile: fresh });
    await deleteProfile(userId);
    await clearEvents(userId);
  },
}));
