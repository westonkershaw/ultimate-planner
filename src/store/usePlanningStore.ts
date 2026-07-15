/**
 * usePlanningStore
 *
 * Tracks the weekly/monthly planning RITUAL — the "did you plan this period"
 * record that powers forgiving streaks, progress, and milestones. Streaks are
 * computed on the fly by the pure streakEngine (freezes are earned, never
 * bought), so this store only stores the completion records + month focuses.
 *
 * Per-user isolated (ownedBy + resetForUser), persisted to localStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  periodIndex,
  computeStreak,
  earnedFreezes,
  type StreakResult,
} from '@/utils/streakEngine';
import type { ID } from '@/types';

const uid = (): ID => Math.random().toString(36).slice(2, 9);

export type PlanSource = 'suggested' | 'scratch' | 'mixed';

export interface WeekRitualRecord {
  completedAt: number;
  /** Days that ended up with an intention (0–7). */
  dayCount: number;
  source: PlanSource;
}

export interface MonthFocusItem {
  id: ID;
  category: string;
  focus: string;
  done: boolean;
}

export interface MonthRitualRecord {
  completedAt: number;
  focuses: MonthFocusItem[];
}

interface PlanningState {
  /** week periodIndex → record */
  weeks: Record<number, WeekRitualRecord>;
  /** month periodIndex → record */
  months: Record<number, MonthRitualRecord>;
  migrated: boolean;
  ownedBy: string;
}

interface PlanningActions {
  completeWeek: (periodIdx: number, meta: { dayCount: number; source: PlanSource }) => void;
  completeMonth: (periodIdx: number, focuses: MonthFocusItem[]) => void;
  /** Save/replace this month's focuses without marking the ritual done. */
  setMonthFocuses: (periodIdx: number, focuses: MonthFocusItem[]) => void;
  toggleMonthFocus: (periodIdx: number, focusId: ID) => void;
  weekStreak: (now?: Date) => StreakResult;
  monthStreak: (now?: Date) => StreakResult;
  isWeekPlanned: (now?: Date) => boolean;
  isMonthPlanned: (now?: Date) => boolean;
  resetForUser: (userId: string) => void;
}

export type PlanningStore = PlanningState & PlanningActions;

export const usePlanningStore = create<PlanningStore>()(
  persist(
    (set, get) => ({
      weeks: {},
      months: {},
      migrated: true, // no legacy source to migrate from
      ownedBy: 'guest',

      completeWeek: (periodIdx, meta) =>
        set((s) => ({
          weeks: { ...s.weeks, [periodIdx]: { completedAt: Date.now(), dayCount: meta.dayCount, source: meta.source } },
        })),

      completeMonth: (periodIdx, focuses) =>
        set((s) => ({
          months: { ...s.months, [periodIdx]: { completedAt: Date.now(), focuses } },
        })),

      setMonthFocuses: (periodIdx, focuses) =>
        set((s) => {
          const existing = s.months[periodIdx];
          return {
            months: {
              ...s.months,
              [periodIdx]: { completedAt: existing?.completedAt ?? 0, focuses },
            },
          };
        }),

      toggleMonthFocus: (periodIdx, focusId) =>
        set((s) => {
          const rec = s.months[periodIdx];
          if (!rec) return s;
          return {
            months: {
              ...s.months,
              [periodIdx]: {
                ...rec,
                focuses: rec.focuses.map((f) => (f.id === focusId ? { ...f, done: !f.done } : f)),
              },
            },
          };
        }),

      weekStreak: (now = new Date()) => {
        const completed = Object.keys(get().weeks).map(Number);
        return computeStreak({
          completedPeriods: completed,
          currentPeriod: periodIndex(now, 'week'),
          freezesAvailable: earnedFreezes(completed.length),
        });
      },

      monthStreak: (now = new Date()) => {
        const completed = Object.entries(get().months)
          .filter(([, r]) => r.completedAt > 0)
          .map(([k]) => Number(k));
        return computeStreak({
          completedPeriods: completed,
          currentPeriod: periodIndex(now, 'month'),
          freezesAvailable: earnedFreezes(completed.length),
        });
      },

      isWeekPlanned: (now = new Date()) => !!get().weeks[periodIndex(now, 'week')],
      isMonthPlanned: (now = new Date()) => {
        const rec = get().months[periodIndex(now, 'month')];
        return !!rec && rec.completedAt > 0;
      },

      resetForUser: (userId) => {
        if (get().ownedBy === userId) return;
        set({ weeks: {}, months: {}, ownedBy: userId });
      },
    }),
    {
      name: 'up_planning_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ weeks: s.weeks, months: s.months, migrated: s.migrated, ownedBy: s.ownedBy }),
    },
  ),
);

/** A stable focus item factory (kept here so wizards + store agree on shape). */
export function makeMonthFocus(category: string, focus: string): MonthFocusItem {
  return { id: uid(), category, focus, done: false };
}
