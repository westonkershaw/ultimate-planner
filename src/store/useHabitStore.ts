import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Habit, HabitFrequency, ID } from '@/types';

const uid = (): ID =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 12)
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function todayKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

const WDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export function dayName(d: Date = new Date()): string {
  return WDAY_NAMES[d.getDay()]!;
}

export function isScheduledToday(habit: Habit, date: Date = new Date()): boolean {
  const name = dayName(date);
  switch (habit.frequency) {
    case 'daily': return true;
    case 'weekdays': return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(name);
    case 'weekends': return ['Sat', 'Sun'].includes(name);
    case 'custom': return habit.customDays?.includes(name) ?? false;
  }
}

export function calcStreak(habit: Habit): number {
  let streak = 0;
  const d = new Date();
  while (true) {
    if (isScheduledToday(habit, d)) {
      const key = d.toLocaleDateString('en-CA');
      if ((habit.logs[key] ?? 0) < (habit.target || 1)) break;
      streak += 1;
    }
    d.setDate(d.getDate() - 1);
    if (streak > 3650) break;
  }
  return streak;
}

// ── Legacy migration ──────────────────────────────────────────────────────

interface LegacyHabit {
  id?: string;
  name?: string;
  emoji?: string;
  color?: string;
  category?: string;
  frequency?: string;
  customDays?: string[];
  target?: number;
  logs?: Record<string, number>;
  archived?: boolean;
}

function readLegacyHabits(): Habit[] {
  try {
    const authRaw = localStorage.getItem('up_auth_v4');
    const auth = authRaw ? (JSON.parse(authRaw) as { id?: string }) : null;
    const userId = auth?.id ?? 'guest';
    const blobRaw = localStorage.getItem(`up_data_v4_${userId}`);
    if (!blobRaw) return [];
    const blob = JSON.parse(blobRaw) as { customHabits?: LegacyHabit[] };
    if (!Array.isArray(blob.customHabits)) return [];
    return blob.customHabits
      .filter((h): h is LegacyHabit & { name: string } => typeof h.name === 'string')
      .map((h) => ({
        id: h.id ?? uid(),
        name: h.name,
        emoji: h.emoji ?? '✨',
        color: h.color ?? '#6366f1',
        category: h.category,
        frequency: (h.frequency as HabitFrequency) ?? 'daily',
        customDays: h.customDays,
        target: h.target ?? 1,
        logs: h.logs ?? {},
        archived: !!h.archived,
        createdAt: Date.now(),
      }));
  } catch {
    return [];
  }
}

// ── Store ─────────────────────────────────────────────────────────────────

interface HabitState {
  habits: Habit[];
  migrated: boolean;
  ownedBy: string;
}

interface HabitActions {
  addHabit: (input: { name: string; emoji?: string; color?: string; frequency?: HabitFrequency; target?: number; customDays?: string[]; category?: string }) => void;
  updateHabit: (id: ID, patch: Partial<Omit<Habit, 'id'>>) => void;
  deleteHabit: (id: ID) => void;
  archiveHabit: (id: ID, archived: boolean) => void;
  /** Increment today's count by +1 (or -1 if `negative`). Clamped at 0. */
  tick: (id: ID, negative?: boolean) => void;
  migrateFromLegacy: () => void;
  resetForUser: (userId: string) => void;
}

export type HabitStore = HabitState & HabitActions;

export const useHabitStore = create<HabitStore>()(
  persist(
    (set, get) => ({
      habits: [],
      migrated: false,
      ownedBy: 'guest',

      addHabit: (input) => {
        const habit: Habit = {
          id: uid(),
          name: input.name.trim(),
          emoji: input.emoji ?? '✨',
          color: input.color ?? '#6366f1',
          category: input.category,
          frequency: input.frequency ?? 'daily',
          customDays: input.customDays,
          target: input.target ?? 1,
          logs: {},
          archived: false,
          createdAt: Date.now(),
        };
        set({ habits: [...get().habits, habit] });
      },

      updateHabit: (id, patch) => {
        set({ habits: get().habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) });
      },

      deleteHabit: (id) => {
        set({ habits: get().habits.filter((h) => h.id !== id) });
      },

      archiveHabit: (id, archived) => {
        set({ habits: get().habits.map((h) => (h.id === id ? { ...h, archived } : h)) });
      },

      tick: (id, negative) => {
        const today = todayKey();
        set({
          habits: get().habits.map((h) => {
            if (h.id !== id) return h;
            const current = h.logs[today] ?? 0;
            const next = Math.max(0, current + (negative ? -1 : 1));
            return { ...h, logs: { ...h.logs, [today]: next } };
          }),
        });
      },

      migrateFromLegacy: () => {
        const legacy = readLegacyHabits();
        if (legacy.length === 0) { set({ migrated: true }); return; }
        const have = new Set(get().habits.map((h) => h.id));
        const fresh = legacy.filter((h) => !have.has(h.id));
        set({ habits: [...get().habits, ...fresh], migrated: true });
      },

      resetForUser: (userId) => {
        if (get().ownedBy === userId) return;
        set({ habits: [], migrated: false, ownedBy: userId });
        get().migrateFromLegacy();
      },
    }),
    {
      name: 'up_habits_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ habits: s.habits, migrated: s.migrated, ownedBy: s.ownedBy }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.migrated) state.migrateFromLegacy();
      },
    },
  ),
);
