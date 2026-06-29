import type { ID } from './common.types';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export interface Meal {
  id: ID;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Daily meal log indexed by YYYY-MM-DD */
export type DayPlan = Record<MealSlot, Meal[]>;

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
