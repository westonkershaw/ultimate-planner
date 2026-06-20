import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SleepEntry, SleepQuality, ID } from '@/types';

const uid = (): ID =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 12)
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function todayKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

function clampQuality(n: number): SleepQuality {
  return Math.max(0, Math.min(5, Math.round(n))) as SleepQuality;
}

/** Hours of sleep between bedTime and wakeTime (handles cross-midnight). */
export function durationHours(bedTime: string, wakeTime: string): number {
  if (!bedTime || !wakeTime) return 0;
  const [bh, bm] = bedTime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  if (bh == null || bm == null || wh == null || wm == null) return 0;
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
}

// ── Legacy migration ──────────────────────────────────────────────────────

interface LegacySleep {
  id?: string;
  date?: string;
  bedTime?: string;
  wakeTime?: string;
  quality?: number;
  notes?: string;
}

function readLegacySleep(): SleepEntry[] {
  try {
    const authRaw = localStorage.getItem('up_auth_v4');
    const auth = authRaw ? (JSON.parse(authRaw) as { id?: string }) : null;
    const userId = auth?.id ?? 'guest';
    const blobRaw = localStorage.getItem(`up_data_v4_${userId}`);
    if (!blobRaw) return [];
    const blob = JSON.parse(blobRaw) as { sleepLog?: LegacySleep[] };
    if (!Array.isArray(blob.sleepLog)) return [];
    return blob.sleepLog
      .filter((e): e is LegacySleep & { date: string; bedTime: string; wakeTime: string } =>
        !!e.date && !!e.bedTime && !!e.wakeTime)
      .map((e) => ({
        id: e.id ?? uid(),
        date: e.date,
        bedTime: e.bedTime,
        wakeTime: e.wakeTime,
        quality: clampQuality(e.quality ?? 0),
        notes: e.notes,
        updatedAt: Date.now(),
      }));
  } catch {
    return [];
  }
}

// ── Store ─────────────────────────────────────────────────────────────────

interface SleepState {
  entries: SleepEntry[];
  migrated: boolean;
  ownedBy: string;
}

interface SleepActions {
  upsertEntry: (entry: Omit<SleepEntry, 'id' | 'updatedAt'> & { id?: string }) => void;
  deleteEntry: (id: ID) => void;
  migrateFromLegacy: () => void;
  resetForUser: (userId: string) => void;
}

export type SleepStore = SleepState & SleepActions;

export const useSleepStore = create<SleepStore>()(
  persist(
    (set, get) => ({
      entries: [],
      migrated: false,
      ownedBy: 'guest',

      upsertEntry: (entry) => {
        const id = entry.id ?? uid();
        const next: SleepEntry = {
          ...entry,
          id,
          quality: clampQuality(entry.quality),
          updatedAt: Date.now(),
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
        const legacy = readLegacySleep();
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
      name: 'up_sleep_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ entries: s.entries, migrated: s.migrated, ownedBy: s.ownedBy }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.migrated) state.migrateFromLegacy();
      },
    },
  ),
);

// ── Selectors ─────────────────────────────────────────────────────────────

export function calcAvgHours(entries: SleepEntry[], lastN = 7): number {
  if (entries.length === 0) return 0;
  const recent = entries.slice(0, lastN);
  const total = recent.reduce((sum, e) => sum + durationHours(e.bedTime, e.wakeTime), 0);
  return Math.round((total / recent.length) * 10) / 10;
}

export function calcAvgQuality(entries: SleepEntry[], lastN = 7): number {
  const rated = entries.slice(0, lastN).filter((e) => e.quality > 0);
  if (rated.length === 0) return 0;
  return Math.round((rated.reduce((s, e) => s + e.quality, 0) / rated.length) * 10) / 10;
}
