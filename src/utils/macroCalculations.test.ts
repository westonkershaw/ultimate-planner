/**
 * macroCalculations.test.ts
 *
 * Tests for all functions exported from macroCalculations.ts.
 * Covers BMR, TDEE, macro targets, and profile-based convenience wrappers.
 */

import { describe, it, expect } from 'vitest';
import {
  calcBMR,
  calcTDEE,
  calcTDEEFromProfile,
  calcMacroTargets,
  calcMacrosFromProfile,
  ACTIVITY_MULTIPLIERS,
  KCAL_PER_GRAM,
} from './macroCalculations';
import type { UserProfile } from '@/types';

// ── KCAL_PER_GRAM constants ────────────────────────────────────────────────

describe('KCAL_PER_GRAM', () => {
  it('protein = 4', () => expect(KCAL_PER_GRAM.protein).toBe(4));
  it('carbs = 4', () => expect(KCAL_PER_GRAM.carbs).toBe(4));
  it('fat = 9', () => expect(KCAL_PER_GRAM.fat).toBe(9));
});

// ── ACTIVITY_MULTIPLIERS ───────────────────────────────────────────────────

describe('ACTIVITY_MULTIPLIERS', () => {
  it('sedentary = 1.2', () => expect(ACTIVITY_MULTIPLIERS.sedentary).toBe(1.2));
  it('lightly_active = 1.375', () => expect(ACTIVITY_MULTIPLIERS.lightly_active).toBe(1.375));
  it('moderately_active = 1.55', () => expect(ACTIVITY_MULTIPLIERS.moderately_active).toBe(1.55));
  it('very_active = 1.725', () => expect(ACTIVITY_MULTIPLIERS.very_active).toBe(1.725));
  it('extra_active = 1.9', () => expect(ACTIVITY_MULTIPLIERS.extra_active).toBe(1.9));
});

// ── calcBMR ────────────────────────────────────────────────────────────────

describe('calcBMR', () => {
  it('male 30yo 81.65kg 177.8cm → correct Mifflin-St Jeor BMR', () => {
    // base = 10*81.65 + 6.25*177.8 - 5*30 = 816.5 + 1111.25 - 150 = 1777.75, +5 = 1782.75 → round = 1783
    const result = calcBMR(81.65, 177.8, 30, 'male');
    expect(result).toBeCloseTo(1783, 0);
  });

  it('female 25yo 63.5kg 165.1cm → correct Mifflin-St Jeor BMR', () => {
    // base = 635 + 1031.875 - 125 = 1541.875, -161 = 1380.875 → 1381
    const result = calcBMR(63.5, 165.1, 25, 'female');
    expect(result).toBeCloseTo(1381, 0);
  });

  it('female BMR is 166 less than male with identical stats', () => {
    const male = calcBMR(70, 175, 30, 'male');
    const female = calcBMR(70, 175, 30, 'female');
    expect(male - female).toBe(166);
  });

  it('throws on non-positive weight', () => {
    expect(() => calcBMR(0, 175, 30, 'male')).toThrow(RangeError);
  });

  it('throws on non-positive height', () => {
    expect(() => calcBMR(70, 0, 30, 'male')).toThrow(RangeError);
  });

  it('throws on non-positive age', () => {
    expect(() => calcBMR(70, 175, 0, 'male')).toThrow(RangeError);
  });
});

// ── calcTDEE ───────────────────────────────────────────────────────────────

describe('calcTDEE', () => {
  it('sedentary multiplier applied correctly', () => {
    expect(calcTDEE(2000, 'sedentary')).toBe(Math.round(2000 * 1.2));
  });

  it('lightly_active multiplier applied correctly', () => {
    expect(calcTDEE(2000, 'lightly_active')).toBe(Math.round(2000 * 1.375));
  });

  it('moderately_active multiplier applied correctly', () => {
    expect(calcTDEE(2000, 'moderately_active')).toBe(Math.round(2000 * 1.55));
  });

  it('very_active multiplier applied correctly', () => {
    expect(calcTDEE(2000, 'very_active')).toBe(Math.round(2000 * 1.725));
  });

  it('extra_active multiplier applied correctly', () => {
    expect(calcTDEE(2000, 'extra_active')).toBe(Math.round(2000 * 1.9));
  });

  it('throws on non-positive BMR', () => {
    expect(() => calcTDEE(0, 'sedentary')).toThrow(RangeError);
    expect(() => calcTDEE(-100, 'sedentary')).toThrow(RangeError);
  });
});

// ── calcTDEEFromProfile ────────────────────────────────────────────────────

describe('calcTDEEFromProfile', () => {
  const profile: UserProfile = {
    weightKg: 80,
    heightCm: 180,
    ageYears: 30,
    sex: 'male',
    activityLevel: 'moderately_active',
  };

  it('matches manual calcBMR + calcTDEE pipeline', () => {
    const { calcBMR: bm, calcTDEE: td } = { calcBMR, calcTDEE };
    const bmr = bm(profile.weightKg, profile.heightCm, profile.ageYears, profile.sex);
    const tdee = td(bmr, profile.activityLevel);
    expect(calcTDEEFromProfile(profile)).toBe(tdee);
  });

  it('returns a positive number for a valid profile', () => {
    expect(calcTDEEFromProfile(profile)).toBeGreaterThan(0);
  });
});

// ── calcMacroTargets ───────────────────────────────────────────────────────

describe('calcMacroTargets', () => {
  it('defaults produce protein ≥ floor for given weight', () => {
    // default proteinPerKg=1.8, 80kg → 144g
    const result = calcMacroTargets(2000, 80);
    expect(result.proteinG).toBe(Math.round(1.8 * 80));
  });

  it('fat = 25% of calories by default', () => {
    const result = calcMacroTargets(2000, 80);
    expect(result.fatG).toBe(Math.round((2000 * 0.25) / 9));
  });

  it('carbsG fills remaining calories', () => {
    const result = calcMacroTargets(2000, 80);
    const remaining = 2000 - result.proteinG * 4 - result.fatG * 9;
    expect(result.carbsG).toBe(Math.round(Math.max(0, remaining) / 4));
  });

  it('caloricAdjustment shifts target calories', () => {
    const result = calcMacroTargets(2000, 80, { caloricAdjustment: -500 });
    expect(result.calories).toBe(1500);
  });

  it('custom proteinPerKg overrides default', () => {
    const result = calcMacroTargets(2000, 80, { proteinPerKg: 2.2 });
    expect(result.proteinG).toBe(Math.round(2.2 * 80));
  });

  it('custom fatFraction overrides default', () => {
    const result = calcMacroTargets(2000, 80, { fatFraction: 0.30 });
    expect(result.fatG).toBe(Math.round((2000 * 0.30) / 9));
  });

  it('throws on non-positive TDEE', () => {
    expect(() => calcMacroTargets(0, 80)).toThrow(RangeError);
  });

  it('throws on non-positive weight', () => {
    expect(() => calcMacroTargets(2000, 0)).toThrow(RangeError);
  });

  it('throws on fatFraction out of range', () => {
    expect(() => calcMacroTargets(2000, 80, { fatFraction: 1.5 })).toThrow(RangeError);
    expect(() => calcMacroTargets(2000, 80, { fatFraction: -0.1 })).toThrow(RangeError);
  });

  it('returns object with calories, proteinG, fatG, carbsG', () => {
    const result = calcMacroTargets(2000, 80);
    expect(result).toHaveProperty('calories');
    expect(result).toHaveProperty('proteinG');
    expect(result).toHaveProperty('fatG');
    expect(result).toHaveProperty('carbsG');
  });
});

// ── calcMacrosFromProfile ──────────────────────────────────────────────────

describe('calcMacrosFromProfile', () => {
  const profile: UserProfile = {
    weightKg: 75,
    heightCm: 170,
    ageYears: 28,
    sex: 'female',
    activityLevel: 'lightly_active',
  };

  it('returns same result as calcTDEEFromProfile → calcMacroTargets pipeline', () => {
    const tdee = calcTDEEFromProfile(profile);
    const expected = calcMacroTargets(tdee, profile.weightKg);
    expect(calcMacrosFromProfile(profile)).toEqual(expected);
  });

  it('options are forwarded correctly', () => {
    const tdee = calcTDEEFromProfile(profile);
    const opts = { caloricAdjustment: -300, proteinPerKg: 2.0 };
    const expected = calcMacroTargets(tdee, profile.weightKg, opts);
    expect(calcMacrosFromProfile(profile, opts)).toEqual(expected);
  });
});
