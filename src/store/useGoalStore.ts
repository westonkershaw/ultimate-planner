import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Goal,
  OutcomeGoal,
  NumericGoal,
  LifeCategory,
  Milestone,
  ID,
  LegacyYearlyGoal,
  LegacyFinancialGoal,
} from '@/types';
import { migrateGoals } from '@/utils/goalEngine';
import { logLearningEvent } from '@/utils/learningEvents';

const uid = (): ID =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 12)
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** ISO date (YYYY-MM-DD) of the Monday of the current week. */
function mondayISO(now = new Date()): string {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return d.toLocaleDateString('en-CA');
}

// ── Legacy migration ──────────────────────────────────────────────────────

function readLegacyGoals(): Goal[] {
  try {
    const authRaw = localStorage.getItem('up_auth_v4');
    const auth = authRaw ? (JSON.parse(authRaw) as { id?: string }) : null;
    const userId = auth?.id ?? 'guest';
    const blobRaw = localStorage.getItem(`up_data_v4_${userId}`);
    if (!blobRaw) return [];
    const blob = JSON.parse(blobRaw) as {
      goals?: Goal[];
      yearlyGoals?: LegacyYearlyGoal[];
      financialGoals?: LegacyFinancialGoal[];
    };
    // If the monolith already migrated to unified `goals`, trust those.
    if (Array.isArray(blob.goals) && blob.goals.length) return blob.goals;
    return migrateGoals(blob.yearlyGoals ?? [], blob.financialGoals ?? []);
  } catch {
    return [];
  }
}

// ── Inputs ─────────────────────────────────────────────────────────────────

export interface NewGoalInput {
  kind: 'outcome' | 'numeric';
  title: string;
  category: LifeCategory;
  deadline?: string;
  description?: string;
  /** Required when kind === 'numeric'. */
  numeric?: { unit: string; start: number; target: number };
}

// ── Store ─────────────────────────────────────────────────────────────────

interface GoalState {
  goals: Goal[];
  migrated: boolean;
  ownedBy: string;
}

interface GoalActions {
  addGoal: (input: NewGoalInput) => ID;
  updateGoal: (id: ID, patch: Partial<Pick<Goal, 'title' | 'description' | 'category' | 'deadline'>>) => void;
  deleteGoal: (id: ID) => void;
  archiveGoal: (id: ID, archived: boolean) => void;
  addMilestone: (goalId: ID, title: string) => void;
  toggleMilestone: (goalId: ID, milestoneId: ID) => void;
  deleteMilestone: (goalId: ID, milestoneId: ID) => void;
  addNumericEntry: (goalId: ID, delta: number, note?: string) => void;
  setWeeklyFocus: (goalId: ID, action: string) => void;
  toggleWeeklyFocus: (goalId: ID, weekOf: string) => void;
  migrateFromLegacy: () => void;
  resetForUser: (userId: string) => void;
}

export type GoalStore = GoalState & GoalActions;

const mapGoal = (goals: Goal[], id: ID, fn: (g: Goal) => Goal): Goal[] =>
  goals.map((g) => (g.id === id ? fn(g) : g));

export const useGoalStore = create<GoalStore>()(
  persist(
    (set, get) => ({
      goals: [],
      migrated: false,
      ownedBy: 'guest',

      addGoal: (input) => {
        const id = uid();
        const base = {
          id,
          title: input.title.trim(),
          description: input.description?.trim() || undefined,
          category: input.category,
          deadline: input.deadline || undefined,
          archived: false,
          createdAt: new Date().toISOString(),
          milestones: [] as Milestone[],
          weeklyFocus: [],
        };
        const goal: Goal =
          input.kind === 'numeric'
            ? ({
                ...base,
                kind: 'numeric',
                numeric: {
                  unit: input.numeric?.unit || '',
                  start: input.numeric?.start ?? 0,
                  current: input.numeric?.start ?? 0,
                  target: input.numeric?.target ?? 0,
                  entries: [],
                },
              } satisfies NumericGoal)
            : ({ ...base, kind: 'outcome' } satisfies OutcomeGoal);
        set({ goals: [...get().goals, goal] });
        logLearningEvent('goal_set', { goalId: id, goalTitle: goal.title, category: goal.category });
        return id;
      },

      updateGoal: (id, patch) => {
        set({ goals: mapGoal(get().goals, id, (g) => ({ ...g, ...patch })) });
        const g = get().goals.find((x) => x.id === id);
        if (g) logLearningEvent('goal_edited', { goalId: id, goalTitle: g.title, category: g.category });
      },

      deleteGoal: (id) => set({ goals: get().goals.filter((g) => g.id !== id) }),

      archiveGoal: (id, archived) => {
        set({ goals: mapGoal(get().goals, id, (g) => ({ ...g, archived })) });
      },

      addMilestone: (goalId, title) => {
        const t = title.trim();
        if (!t) return;
        const ms: Milestone = { id: uid(), title: t, weight: 1, done: false };
        set({ goals: mapGoal(get().goals, goalId, (g) => ({ ...g, milestones: [...g.milestones, ms] })) });
      },

      toggleMilestone: (goalId, milestoneId) => {
        set({
          goals: mapGoal(get().goals, goalId, (g) => ({
            ...g,
            milestones: g.milestones.map((m) =>
              m.id === milestoneId ? { ...m, done: !m.done, doneAt: !m.done ? Date.now() : undefined } : m,
            ),
          })),
        });
      },

      deleteMilestone: (goalId, milestoneId) => {
        set({
          goals: mapGoal(get().goals, goalId, (g) => ({
            ...g,
            milestones: g.milestones.filter((m) => m.id !== milestoneId),
          })),
        });
      },

      addNumericEntry: (goalId, delta, note) => {
        if (!Number.isFinite(delta) || delta === 0) return;
        set({
          goals: mapGoal(get().goals, goalId, (g) => {
            if (g.kind !== 'numeric') return g;
            const entries = [...g.numeric.entries, { id: uid(), date: new Date().toLocaleDateString('en-CA'), delta, note }];
            return { ...g, numeric: { ...g.numeric, entries, current: g.numeric.start + entries.reduce((a, e) => a + e.delta, 0) } };
          }),
        });
      },

      setWeeklyFocus: (goalId, action) => {
        const weekOf = mondayISO();
        set({
          goals: mapGoal(get().goals, goalId, (g) => {
            const rest = g.weeklyFocus.filter((w) => w.weekOf !== weekOf);
            return { ...g, weeklyFocus: [...rest, { weekOf, action: action.trim(), done: false }] };
          }),
        });
      },

      toggleWeeklyFocus: (goalId, weekOf) => {
        set({
          goals: mapGoal(get().goals, goalId, (g) => ({
            ...g,
            weeklyFocus: g.weeklyFocus.map((w) => (w.weekOf === weekOf ? { ...w, done: !w.done } : w)),
          })),
        });
      },

      migrateFromLegacy: () => {
        const legacy = readLegacyGoals();
        if (legacy.length === 0) { set({ migrated: true }); return; }
        const have = new Set(get().goals.map((g) => g.id));
        const fresh = legacy.filter((g) => !have.has(g.id));
        set({ goals: [...get().goals, ...fresh], migrated: true });
      },

      resetForUser: (userId) => {
        if (get().ownedBy === userId) return;
        set({ goals: [], migrated: false, ownedBy: userId });
        get().migrateFromLegacy();
      },
    }),
    {
      name: 'up_goals_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ goals: s.goals, migrated: s.migrated, ownedBy: s.ownedBy }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.migrated) state.migrateFromLegacy();
      },
    },
  ),
);
