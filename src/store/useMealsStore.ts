import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Meal, DayPlan, MealSlot, MacroTargets, ID } from '@/types';
import { MEAL_SLOTS } from '@/types';

const uid = (): ID =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 12)
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function todayKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

function emptyDay(): DayPlan {
  return { breakfast: [], lunch: [], dinner: [], snacks: [] };
}

// ── Legacy migration ──────────────────────────────────────────────────────

interface LegacyMeal { id?: string; name?: string; calories?: number; protein?: number; carbs?: number; fat?: number }
type LegacyDay = Partial<Record<MealSlot, LegacyMeal[]>>;

function readLegacyMeals(): { plan: Record<string, DayPlan>; targets: MacroTargets | null } {
  const empty = { plan: {} as Record<string, DayPlan>, targets: null };
  try {
    const authRaw = localStorage.getItem('up_auth_v4');
    const auth = authRaw ? (JSON.parse(authRaw) as { id?: string }) : null;
    const userId = auth?.id ?? 'guest';
    const blobRaw = localStorage.getItem(`up_data_v4_${userId}`);
    if (!blobRaw) return empty;
    const blob = JSON.parse(blobRaw) as {
      mealPlan?: Record<string, LegacyDay>;
      macroTargets?: { protein?: number; carbs?: number; fat?: number };
      calorieGoal?: number;
    };
    const plan: Record<string, DayPlan> = {};
    if (blob.mealPlan && typeof blob.mealPlan === 'object') {
      for (const [date, legacyDay] of Object.entries(blob.mealPlan)) {
        const day = emptyDay();
        for (const slot of MEAL_SLOTS) {
          const meals = legacyDay[slot] ?? [];
          day[slot] = meals
            .filter((m): m is LegacyMeal & { name: string } => typeof m.name === 'string')
            .map((m) => ({
              id: m.id ?? uid(),
              name: m.name,
              calories: Number(m.calories) || 0,
              protein: Number(m.protein) || 0,
              carbs: Number(m.carbs) || 0,
              fat: Number(m.fat) || 0,
            }));
        }
        plan[date] = day;
      }
    }
    const targets: MacroTargets | null = (blob.calorieGoal || blob.macroTargets) ? {
      calories: Number(blob.calorieGoal) || 2000,
      protein: Number(blob.macroTargets?.protein) || 150,
      carbs: Number(blob.macroTargets?.carbs) || 200,
      fat: Number(blob.macroTargets?.fat) || 65,
    } : null;
    return { plan, targets };
  } catch {
    return empty;
  }
}

// ── Store ─────────────────────────────────────────────────────────────────

interface MealsState {
  plan: Record<string, DayPlan>;
  targets: MacroTargets;
  migrated: boolean;
  ownedBy: string;
}

interface MealsActions {
  addMeal: (date: string, slot: MealSlot, input: Omit<Meal, 'id'>) => void;
  deleteMeal: (date: string, slot: MealSlot, id: ID) => void;
  setTargets: (patch: Partial<MacroTargets>) => void;
  migrateFromLegacy: () => void;
  resetForUser: (userId: string) => void;
}

export type MealsStore = MealsState & MealsActions;

const DEFAULT_TARGETS: MacroTargets = { calories: 2000, protein: 150, carbs: 200, fat: 65 };

export const useMealsStore = create<MealsStore>()(
  persist(
    (set, get) => ({
      plan: {},
      targets: { ...DEFAULT_TARGETS },
      migrated: false,
      ownedBy: 'guest',

      addMeal: (date, slot, input) => {
        const meal: Meal = { ...input, id: uid() };
        const day: DayPlan = { ...(get().plan[date] ?? emptyDay()) };
        day[slot] = [...day[slot], meal];
        set({ plan: { ...get().plan, [date]: day } });
      },

      deleteMeal: (date, slot, id) => {
        const day = get().plan[date];
        if (!day) return;
        const next: DayPlan = { ...day, [slot]: day[slot].filter((m) => m.id !== id) };
        set({ plan: { ...get().plan, [date]: next } });
      },

      setTargets: (patch) => {
        set({ targets: { ...get().targets, ...patch } });
      },

      migrateFromLegacy: () => {
        const { plan, targets } = readLegacyMeals();
        if (Object.keys(plan).length === 0 && !targets) { set({ migrated: true }); return; }
        set({
          plan: { ...plan, ...get().plan },
          targets: targets ?? get().targets,
          migrated: true,
        });
      },

      resetForUser: (userId) => {
        if (get().ownedBy === userId) return;
        set({ plan: {}, targets: { ...DEFAULT_TARGETS }, migrated: false, ownedBy: userId });
        get().migrateFromLegacy();
      },
    }),
    {
      name: 'up_meals_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ plan: s.plan, targets: s.targets, migrated: s.migrated, ownedBy: s.ownedBy }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.migrated) state.migrateFromLegacy();
      },
    },
  ),
);

// ── Selectors ─────────────────────────────────────────────────────────────

export function dayTotals(day: DayPlan): MacroTargets {
  const totals: MacroTargets = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const slot of MEAL_SLOTS) {
    for (const meal of day[slot]) {
      totals.calories += meal.calories;
      totals.protein += meal.protein;
      totals.carbs += meal.carbs;
      totals.fat += meal.fat;
    }
  }
  return totals;
}
