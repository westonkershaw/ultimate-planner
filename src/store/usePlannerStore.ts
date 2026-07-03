import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ID, Timestamp } from '@/types';

const uid = (): ID => Math.random().toString(36).slice(2, 9);

/** Return YYYY-MM-DD for monday + offset days */
function offsetDate(mondayDate: string, offset: number): string {
  const d = new Date(mondayDate + 'T00:00:00');
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0]!;
}

export interface DailyPlan {
  id: ID;
  date: string; // YYYY-MM-DD
  intention: string;
  energyLevel: number; // 1-5
  topPriorities: string[]; // task IDs, ordered
  review: DailyReview | null;
  createdAt: Timestamp;
}

export interface DailyReview {
  rating: number; // 1-5
  notes: string;
  completedAt: Timestamp;
}

interface PlannerState {
  plans: DailyPlan[];
  /** Auth user id that currently owns this store's data ('' = unclaimed). */
  ownedBy: string;
}

interface PlannerActions {
  getToday: () => DailyPlan | undefined;
  getPlan: (date: string) => DailyPlan | undefined;
  getPlansForWeek: (mondayDate: string) => DailyPlan[];
  createPlan: (date: string) => void;
  ensureWeekPlans: (mondayDate: string) => void;
  setIntention: (date: string, intention: string) => void;
  setEnergyLevel: (date: string, level: number) => void;
  setTopPriorities: (date: string, taskIds: string[]) => void;
  submitReview: (date: string, rating: number, notes: string) => void;
  /** Per-user isolation: clear data when switching to a different account. */
  resetForUser: (userId: string) => void;
}

export type PlannerStore = PlannerState & PlannerActions;

export const usePlannerStore = create<PlannerStore>()(
  persist(
    immer((set, get) => ({
      plans: [],
      ownedBy: '',

      getToday: () => {
        const today = new Date().toISOString().split('T')[0];
        return get().plans.find((p) => p.date === today);
      },

      getPlan: (date) => get().plans.find((p) => p.date === date),

      getPlansForWeek: (mondayDate) => {
        const plans = get().plans;
        return Array.from({ length: 7 }, (_, i) => {
          const d = offsetDate(mondayDate, i);
          return plans.find((p) => p.date === d);
        }).filter(Boolean) as DailyPlan[];
      },

      ensureWeekPlans: (mondayDate) =>
        set((draft) => {
          for (let i = 0; i < 7; i++) {
            const d = offsetDate(mondayDate, i);
            if (!draft.plans.some((p) => p.date === d)) {
              draft.plans.push({
                id: uid(),
                date: d,
                intention: '',
                energyLevel: 3,
                topPriorities: [],
                review: null,
                createdAt: Date.now(),
              });
            }
          }
        }),

      createPlan: (date) =>
        set((draft) => {
          if (draft.plans.some((p) => p.date === date)) return;
          draft.plans.unshift({
            id: uid(),
            date,
            intention: '',
            energyLevel: 3,
            topPriorities: [],
            review: null,
            createdAt: Date.now(),
          });
        }),

      setIntention: (date, intention) =>
        set((draft) => {
          const plan = draft.plans.find((p) => p.date === date);
          if (plan) plan.intention = intention;
        }),

      setEnergyLevel: (date, level) =>
        set((draft) => {
          const plan = draft.plans.find((p) => p.date === date);
          if (plan) plan.energyLevel = level;
        }),

      setTopPriorities: (date, taskIds) =>
        set((draft) => {
          const plan = draft.plans.find((p) => p.date === date);
          if (plan) plan.topPriorities = taskIds;
        }),

      submitReview: (date, rating, notes) =>
        set((draft) => {
          const plan = draft.plans.find((p) => p.date === date);
          if (plan) {
            plan.review = { rating, notes, completedAt: Date.now() };
          }
        }),

      resetForUser: (userId) =>
        set((draft) => {
          if (draft.ownedBy === userId || userId === 'guest') return;
          if (draft.ownedBy === '') { draft.ownedBy = userId; return; }
          draft.plans = [];
          draft.ownedBy = userId;
        }),
    })),
    { name: 'up_planner' },
  ),
);
