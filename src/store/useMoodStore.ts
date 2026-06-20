import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MoodEntry, MoodScore, ID } from '@/types';

const uid = (): ID =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 12)
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function todayKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

function clampScore(n: number): MoodScore {
  return Math.max(0, Math.min(5, Math.round(n))) as MoodScore;
}

// ── Legacy migration ──────────────────────────────────────────────────────
//
// Legacy shape: data.moodLogs is a Record<date, {score, emoji, note, timestamp}>.
// Convert to an array of MoodEntry on migration.

interface LegacyMoodValue {
  score?: number;
  note?: string;
  timestamp?: string;
  emoji?: string;
}

function readLegacyMood(): MoodEntry[] {
  try {
    const authRaw = localStorage.getItem('up_auth_v4');
    const auth = authRaw ? (JSON.parse(authRaw) as { id?: string }) : null;
    const userId = auth?.id ?? 'guest';
    const blobRaw = localStorage.getItem(`up_data_v4_${userId}`);
    if (!blobRaw) return [];
    const blob = JSON.parse(blobRaw) as { moodLogs?: Record<string, LegacyMoodValue> };
    const logs = blob.moodLogs;
    if (!logs || typeof logs !== 'object') return [];
    return Object.entries(logs)
      .filter(([date, v]) => typeof date === 'string' && v && typeof v.score === 'number')
      .map(([date, v]) => ({
        id: uid(),
        date,
        score: clampScore(v.score ?? 0),
        note: v.note,
        timestamp: v.timestamp ?? new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

// ── Store ─────────────────────────────────────────────────────────────────

interface MoodState {
  entries: MoodEntry[];
  migrated: boolean;
  ownedBy: string;
}

interface MoodActions {
  logMood: (score: MoodScore, note?: string) => void;
  upsertEntry: (entry: Omit<MoodEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) => void;
  deleteEntry: (id: ID) => void;
  migrateFromLegacy: () => void;
  resetForUser: (userId: string) => void;
}

export type MoodStore = MoodState & MoodActions;

export const useMoodStore = create<MoodStore>()(
  persist(
    (set, get) => ({
      entries: [],
      migrated: false,
      ownedBy: 'guest',

      logMood: (score, note) => {
        const today = todayKey();
        const existing = get().entries.find((e) => e.date === today);
        const entry: MoodEntry = {
          id: existing?.id ?? uid(),
          date: today,
          score: clampScore(score),
          note: note ?? existing?.note,
          timestamp: new Date().toISOString(),
        };
        set({
          entries: [...get().entries.filter((e) => e.date !== today), entry]
            .sort((a, b) => (a.date < b.date ? 1 : -1)),
        });
      },

      upsertEntry: (entry) => {
        const id = entry.id ?? uid();
        const next: MoodEntry = {
          ...entry,
          id,
          score: clampScore(entry.score),
          timestamp: entry.timestamp ?? new Date().toISOString(),
        };
        set({
          entries: [
            ...get().entries.filter((e) => e.id !== id && e.date !== entry.date),
            next,
          ].sort((a, b) => (a.date < b.date ? 1 : -1)),
        });
      },

      deleteEntry: (id) => {
        set({ entries: get().entries.filter((e) => e.id !== id) });
      },

      migrateFromLegacy: () => {
        const legacy = readLegacyMood();
        if (legacy.length === 0) { set({ migrated: true }); return; }
        const have = new Set(get().entries.map((e) => e.date));
        const fresh = legacy.filter((e) => !have.has(e.date));
        set({
          entries: [...get().entries, ...fresh].sort((a, b) => (a.date < b.date ? 1 : -1)),
          migrated: true,
        });
      },

      resetForUser: (userId) => {
        if (get().ownedBy === userId) return;
        set({ entries: [], migrated: false, ownedBy: userId });
        get().migrateFromLegacy();
      },
    }),
    {
      name: 'up_mood_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ entries: s.entries, migrated: s.migrated, ownedBy: s.ownedBy }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.migrated) state.migrateFromLegacy();
      },
    },
  ),
);

// ── Selectors ─────────────────────────────────────────────────────────────

export function calcMoodStreak(entries: MoodEntry[]): number {
  const dates = new Set(entries.map((e) => e.date));
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toLocaleDateString('en-CA');
    if (!dates.has(key)) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function calcMoodAvg(entries: MoodEntry[], lastN = 7): number {
  const recent = entries.slice(0, lastN).filter((e) => e.score > 0);
  if (recent.length === 0) return 0;
  return Math.round((recent.reduce((s, e) => s + e.score, 0) / recent.length) * 10) / 10;
}
