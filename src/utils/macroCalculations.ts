/**
 * macroCalculations.ts
 *
 * Pure functions for BMR, TDEE, and macro-nutrient targets.
 * No side effects — safe to call from any context.
 *
 * BMR formula: Mifflin-St Jeor (1990)
 *   Male:   10 × weightKg + 6.25 × heightCm − 5 × age + 5
 *   Female: 10 × weightKg + 6.25 × heightCm − 5 × age − 161
 *
 * TDEE = BMR × Physical Activity Level (PAL) multiplier
 *
 * Macro splits default to a moderate-deficit body-recomposition profile:
 *   Protein: 0.82 g / lb of bodyweight (higher end of evidence range)
 *   Fat:     25% of total calories
 *   Carbs:   remainder of calories
 */

import type { ActivityLevel, BiologicalSex, UserProfile } from '@/types';

// ── Constants ──────────────────────────────────────────────────────────────

/** Physical Activity Level multipliers (Ainsworth et al.) */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,          // desk job, little/no exercise
  lightly_active: 1.375,   // light exercise 1–3 days/week
  moderately_active: 1.55, // moderate exercise 3–5 days/week
  very_active: 1.725,      // hard exercise 6–7 days/week
  extra_active: 1.9,       // physical job + twice-daily training
} as const;

/** Calories per gram for each macro */
export const KCAL_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
} as const;

// ── Core Formulas ──────────────────────────────────────────────────────────

/**
 * Calculate Basal Metabolic Rate using the Mifflin-St Jeor equation.
 *
 * @param weightKg  Body weight in kilograms
 * @param heightCm  Height in centimetres
 * @param ageYears  Age in whole years
 * @param sex       Biological sex ('male' | 'female')
 * @returns         BMR in kcal/day (rounded to nearest integer)
 */
export function calcBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: BiologicalSex,
): number {
  if (weightKg <= 0 || heightCm <= 0 || ageYears <= 0) {
    throw new RangeError('Weight, height, and age must all be positive numbers.');
  }
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

/**
 * Calculate Total Daily Energy Expenditure.
 *
 * @param bmr           BMR in kcal/day (from calcBMR)
 * @param activityLevel PAL category
 * @returns             TDEE in kcal/day (rounded to nearest integer)
 */
export function calcTDEE(bmr: number, activityLevel: ActivityLevel): number {
  if (bmr <= 0) throw new RangeError('BMR must be a positive number.');
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Convenience wrapper: calculate TDEE directly from a UserProfile.
 */
export function calcTDEEFromProfile(profile: UserProfile): number {
  const bmr = calcBMR(profile.weightKg, profile.heightCm, profile.ageYears, profile.sex);
  return calcTDEE(bmr, profile.activityLevel);
}

// ── Macro Targets ──────────────────────────────────────────────────────────

export interface MacroTargets {
  /** Target calories (may differ from TDEE when a deficit/surplus is applied) */
  calories: number;
  /** Grams of protein per day */
  proteinG: number;
  /** Grams of fat per day */
  fatG: number;
  /** Grams of carbohydrates per day */
  carbsG: number;
}

export interface MacroOptions {
  /**
   * Caloric adjustment relative to TDEE.
   * Negative = deficit, Positive = surplus. Default: 0.
   */
  caloricAdjustment?: number;
  /**
   * Protein in grams per kg of bodyweight.
   * Default: 1.8 g/kg (evidence-based minimum for muscle retention).
   */
  proteinPerKg?: number;
  /**
   * Fat as a fraction of total calories (0–1).
   * Default: 0.25 (25%).
   */
  fatFraction?: number;
}

/**
 * Calculate daily macro targets from a calorie goal and body weight.
 *
 * Protein is set first (floor), fat is a percentage of total calories,
 * and carbohydrates fill the remainder. This mirrors the protein-priority
 * approach used in evidence-based diet planning.
 *
 * @param tdee      Total Daily Energy Expenditure in kcal/day
 * @param weightKg  Body weight in kilograms (for protein target)
 * @param options   Optional overrides for adjustment, protein, and fat ratios
 * @returns         MacroTargets with calories and grams for each macro
 */
export function calcMacroTargets(
  tdee: number,
  weightKg: number,
  options: MacroOptions = {},
): MacroTargets {
  const {
    caloricAdjustment = 0,
    proteinPerKg = 1.8,
    fatFraction = 0.25,
  } = options;

  if (tdee <= 0) throw new RangeError('TDEE must be a positive number.');
  if (weightKg <= 0) throw new RangeError('Weight must be a positive number.');
  if (fatFraction < 0 || fatFraction > 1) throw new RangeError('fatFraction must be between 0 and 1.');

  const calories = Math.round(tdee + caloricAdjustment);

  const proteinG = Math.round(proteinPerKg * weightKg);
  const proteinKcal = proteinG * KCAL_PER_GRAM.protein;

  const fatG = Math.round((calories * fatFraction) / KCAL_PER_GRAM.fat);
  const fatKcal = fatG * KCAL_PER_GRAM.fat;

  const remainingKcal = Math.max(0, calories - proteinKcal - fatKcal);
  const carbsG = Math.round(remainingKcal / KCAL_PER_GRAM.carbs);

  return { calories, proteinG, fatG, carbsG };
}

/**
 * Convenience wrapper: full pipeline from UserProfile to macro targets.
 *
 * @param profile  UserProfile with weight, height, age, sex, activityLevel
 * @param options  Optional macro overrides
 * @returns        MacroTargets
 */
export function calcMacrosFromProfile(
  profile: UserProfile,
  options: MacroOptions = {},
): MacroTargets {
  const tdee = calcTDEEFromProfile(profile);
  return calcMacroTargets(tdee, profile.weightKg, options);
}
