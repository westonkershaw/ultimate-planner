import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { WellnessDay, WellnessLog } from '@/types';

export function todayKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

function emptyDay(): WellnessDay {
  return { water: 0, meditated: false, moved: false };
}

// ── Legacy migration ──────────────────────────────────────────────────────

interface LegacyDay {
  water?: number;
  meditated?: boolean;
  moved?: boolean;
}

function readLegacyWellness(): WellnessLog {
  try {
    const authRaw = localStorage.getItem('up_auth_v4');
    const auth = authRaw ? (JSON.parse(authRaw) as { id?: string }) : null;
    const userId = auth?.id ?? 'guest';
    const blobRaw = localStorage.getItem(`up_data_v4_${userId}`);
    if (!blobRaw) return {};
    const blob = JSON.parse(blobRaw) as { wellnessLog?: Record<string, LegacyDay> };
    if (!blob.wellnessLog || typeof blob.wellnessLog !== 'object') return {};
    const out: WellnessLog = {};
    for (const [date, day] of Object.entries(blob.wellnessLog)) {
      out[date] = {
        water: Number(day.water) || 0,
        meditated: !!day.meditated,
        moved: !!day.moved,
      };
    }
    return out;
  } catch {
    return {};
  }
}

// ── Store ─────────────────────────────────────────────────────────────────

interface WellnessState {
  log: WellnessLog;
  migrated: boolean;
  ownedBy: string;
}

interface WellnessActions {
  setWater: (date: string, glasses: number) => void;
  setMeditated: (date: string, value: boolean) => void;
  setMoved: (date: string, value: boolean) => void;
  migrateFromLegacy: () => void;
  resetForUser: (userId: string) => void;
}

export type WellnessStore = WellnessState & WellnessActions;

function withDay(log: WellnessLog, date: string, patch: Partial<WellnessDay>): WellnessLog {
  const current = log[date] ?? emptyDay();
  return { ...log, [date]: { ...current, ...patch } };
}

export const useWellnessStore = create<WellnessStore>()(
  persist(
    (set, get) => ({
      log: {},
      migrated: false,
      ownedBy: 'guest',

      setWater: (date, glasses) => {
        set({ log: withDay(get().log, date, { water: Math.max(0, Math.round(glasses)) }) });
      },

      setMeditated: (date, value) => {
        set({ log: withDay(get().log, date, { meditated: value }) });
      },

      setMoved: (date, value) => {
        set({ log: withDay(get().log, date, { moved: value }) });
      },

      migrateFromLegacy: () => {
        const legacy = readLegacyWellness();
        if (Object.keys(legacy).length === 0) { set({ migrated: true }); return; }
        set({ log: { ...legacy, ...get().log }, migrated: true });
      },

      resetForUser: (userId) => {
        if (get().ownedBy === userId) return;
        set({ log: {}, migrated: false, ownedBy: userId });
        get().migrateFromLegacy();
      },
    }),
    {
      name: 'up_wellness_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ log: s.log, migrated: s.migrated, ownedBy: s.ownedBy }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.migrated) state.migrateFromLegacy();
      },
    },
  ),
);

// ── Selectors ─────────────────────────────────────────────────────────────

/** Returns the count of days in the last N where ALL three habits were met */
export function perfectDaysLast(log: WellnessLog, n = 7, waterTarget = 8): number {
  const today = new Date();
  let count = 0;
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toLocaleDateString('en-CA');
    const day = log[key];
    if (day && day.water >= waterTarget && day.meditated && day.moved) count++;
  }
  return count;
}

/** Average wellness score (0-100) over last N days */
export function wellnessScoreLast(log: WellnessLog, n = 7, waterTarget = 8): number {
  const today = new Date();
  let totalScore = 0;
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toLocaleDateString('en-CA');
    const day = log[key] ?? emptyDay();
    const waterPct = Math.min(100, (day.water / waterTarget) * 100);
    const meditatedPct = day.meditated ? 100 : 0;
    const movedPct = day.moved ? 100 : 0;
    totalScore += (waterPct + meditatedPct + movedPct) / 3;
  }
  return Math.round(totalScore / n);
}
