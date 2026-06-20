/**
 * math.test.ts
 *
 * Comprehensive tests for all functions exported from math.ts.
 * Tests cover BMR, TDEE, macro targets, caloric delta, weeks-to-goal,
 * savings projections, and goal percentage calculations.
 */

import { describe, it, expect } from 'vitest';
import {
  calcBMRFromLbs,
  calcTDEEFromLbs,
  calcCaloricDelta,
  calcWeeksToWeightGoal,
  calcMacroTargetsByGoal,
  calcMacros,
  calcSavingsProjectionTable,
  calcGoalPct,
  calcMonthsToFinanceGoal,
  APP_ACTIVITY_MULTIPLIERS,
  type UserStats,
  type FinanceGoalSummary,
} from './math';

// ── calcBMRFromLbs ─────────────────────────────────────────────────────────

describe('calcBMRFromLbs', () => {
  it('male 30yo 180lbs 70in → correct Mifflin-St Jeor BMR', () => {
    // weightKg=180*0.453592=81.64656, heightCm=70*2.54=177.8
    // base=10*81.64656+6.25*177.8-5*30=816.4656+1111.25-150=1777.7156, male: +5=1782.7156
    const result = calcBMRFromLbs(180, 70, 30, 'male');
    expect(result).toBeCloseTo(1782.72, 1);
  });

  it('female 25yo 140lbs 65in → correct Mifflin-St Jeor BMR', () => {
    // weightKg=63.50288, heightCm=165.1
    // base=635.0288+1031.875-125=1541.9038, female: -161=1380.9038
    const result = calcBMRFromLbs(140, 65, 25, 'female');
    expect(result).toBeCloseTo(1380.9, 1);
  });

  it('very light person 100lbs', () => {
    // weightKg=45.3592, heightCm=60*2.54=152.4
    // base=453.592+952.5-150=1256.092, male: +5=1261.092
    const result = calcBMRFromLbs(100, 60, 30, 'male');
    expect(result).toBeCloseTo(1261.09, 1);
  });

  it('very heavy person 400lbs', () => {
    // weightKg=400*0.453592=181.4368, heightCm=70*2.54=177.8
    // base=1814.368+1111.25-150=2775.618, male: +5=2780.618
    const result = calcBMRFromLbs(400, 70, 30, 'male');
    expect(result).toBeCloseTo(2780.62, 1);
  });

  it('female BMR is 166 kcal lower than male with same stats', () => {
    // sex constant difference: male +5, female -161 → diff = 166
    const male = calcBMRFromLbs(150, 66, 28, 'male');
    const female = calcBMRFromLbs(150, 66, 28, 'female');
    expect(male - female).toBeCloseTo(166, 5);
  });

  it('throws on non-positive weight', () => {
    expect(() => calcBMRFromLbs(0, 70, 30, 'male')).toThrow(RangeError);
    expect(() => calcBMRFromLbs(-10, 70, 30, 'male')).toThrow(RangeError);
  });

  it('throws on non-positive height', () => {
    expect(() => calcBMRFromLbs(150, 0, 30, 'male')).toThrow(RangeError);
  });

  it('throws on non-positive age', () => {
    expect(() => calcBMRFromLbs(150, 70, 0, 'male')).toThrow(RangeError);
  });
});

// ── calcTDEEFromLbs ────────────────────────────────────────────────────────

describe('calcTDEEFromLbs', () => {
  // bmr for male 30yo 180lbs 70in ≈ 1782.7156
  const bmr = 1782.7156;

  it('sedentary multiplier (1.2)', () => {
    const result = calcTDEEFromLbs(180, 70, 30, 'male', 'sedentary');
    expect(result).toBe(Math.round(bmr * 1.2));
  });

  it('light multiplier (1.375)', () => {
    const result = calcTDEEFromLbs(180, 70, 30, 'male', 'light');
    expect(result).toBe(Math.round(bmr * 1.375));
  });

  it('moderate multiplier (1.55)', () => {
    const result = calcTDEEFromLbs(180, 70, 30, 'male', 'moderate');
    expect(result).toBe(Math.round(bmr * 1.55));
  });

  it('active multiplier (1.725)', () => {
    const result = calcTDEEFromLbs(180, 70, 30, 'male', 'active');
    expect(result).toBe(Math.round(bmr * 1.725));
  });

  it('extra multiplier (1.9)', () => {
    const result = calcTDEEFromLbs(180, 70, 30, 'male', 'extra');
    expect(result).toBe(Math.round(bmr * 1.9));
  });

  it('TDEE is higher than BMR for all activity levels', () => {
    const activities = ['sedentary', 'light', 'moderate', 'active', 'extra'] as const;
    const rawBmr = calcBMRFromLbs(180, 70, 30, 'male');
    for (const level of activities) {
      const tdee = calcTDEEFromLbs(180, 70, 30, 'male', level);
      expect(tdee).toBeGreaterThan(rawBmr);
    }
  });

  it('all activity multipliers match APP_ACTIVITY_MULTIPLIERS', () => {
    const activities = Object.keys(APP_ACTIVITY_MULTIPLIERS) as Array<keyof typeof APP_ACTIVITY_MULTIPLIERS>;
    const rawBmr = calcBMRFromLbs(180, 70, 30, 'male');
    for (const level of activities) {
      const tdee = calcTDEEFromLbs(180, 70, 30, 'male', level);
      expect(tdee).toBe(Math.round(rawBmr * APP_ACTIVITY_MULTIPLIERS[level]));
    }
  });
});

// ── calcMacroTargetsByGoal ─────────────────────────────────────────────────

describe('calcMacroTargetsByGoal', () => {
  const baseStats: UserStats = {
    weightLbs: 180,
    heightInches: 70,
    ageYears: 30,
    sex: 'male',
    activityLevel: 'moderate',
    goalType: 'cut',
  };

  it('cut goal: protein ≥ 1.2g/lb bodyweight', () => {
    const result = calcMacroTargetsByGoal({ ...baseStats, goalType: 'cut' });
    expect(result.proteinG).toBeGreaterThanOrEqual(Math.floor(180 * 1.2));
  });

  it('bulk goal: protein ≥ 1.0g/lb bodyweight', () => {
    const result = calcMacroTargetsByGoal({ ...baseStats, goalType: 'bulk' });
    expect(result.proteinG).toBeGreaterThanOrEqual(Math.floor(180 * 1.0));
  });

  it('maintain goal: protein ≥ 0.8g/lb bodyweight', () => {
    const result = calcMacroTargetsByGoal({ ...baseStats, goalType: 'maintain' });
    expect(result.proteinG).toBeGreaterThanOrEqual(Math.floor(180 * 0.8));
  });

  it('cut: fat = 25% of target calories', () => {
    const result = calcMacroTargetsByGoal({ ...baseStats, goalType: 'cut' });
    const expectedFat = Math.max(20, Math.round((result.targetCalories * 0.25) / 9));
    expect(result.fatG).toBe(expectedFat);
  });

  it('maintain: fat = 25% of target calories', () => {
    const result = calcMacroTargetsByGoal({ ...baseStats, goalType: 'maintain' });
    const expectedFat = Math.max(20, Math.round((result.targetCalories * 0.25) / 9));
    expect(result.fatG).toBe(expectedFat);
  });

  it('bulk: fat = 28% of target calories', () => {
    const result = calcMacroTargetsByGoal({ ...baseStats, goalType: 'bulk' });
    const expectedFat = Math.max(20, Math.round((result.targetCalories * 0.28) / 9));
    expect(result.fatG).toBe(expectedFat);
  });

  it('calories = (protein×4) + (carbs×4) + (fat×9) within rounding tolerance (±5 kcal)', () => {
    for (const goalType of ['cut', 'bulk', 'maintain'] as const) {
      const result = calcMacroTargetsByGoal({ ...baseStats, goalType });
      const macroCalories = result.proteinG * 4 + result.carbsG * 4 + result.fatG * 9;
      expect(Math.abs(macroCalories - result.targetCalories)).toBeLessThanOrEqual(5);
    }
  });

  it('cut applies caloric deficit', () => {
    const result = calcMacroTargetsByGoal({ ...baseStats, goalType: 'cut' }, 1.0);
    expect(result.caloricDelta).toBe(-500);
    expect(result.targetCalories).toBe(result.tdee - 500);
  });

  it('bulk applies caloric surplus', () => {
    const result = calcMacroTargetsByGoal({ ...baseStats, goalType: 'bulk' }, 1.0);
    expect(result.caloricDelta).toBe(500);
    expect(result.targetCalories).toBe(result.tdee + 500);
  });

  it('maintain has zero caloric delta', () => {
    const result = calcMacroTargetsByGoal({ ...baseStats, goalType: 'maintain' });
    expect(result.caloricDelta).toBe(0);
    expect(result.targetCalories).toBe(result.tdee);
  });

  it('throws on non-positive weight', () => {
    expect(() =>
      calcMacroTargetsByGoal({ ...baseStats, weightLbs: 0 }),
    ).toThrow(RangeError);
  });

  it('protein floors at 50g for extremely light weight', () => {
    // At 40lbs * 1.2 = 48g, which is below the 50g floor
    const result = calcMacroTargetsByGoal(
      { ...baseStats, weightLbs: 40, goalType: 'cut' },
    );
    expect(result.proteinG).toBeGreaterThanOrEqual(50);
  });
});

// ── calcMacros (convenience wrapper) ──────────────────────────────────────

describe('calcMacros', () => {
  it('returns same result as calcMacroTargetsByGoal with default rate', () => {
    const stats: UserStats = {
      weightLbs: 160,
      heightInches: 68,
      ageYears: 28,
      sex: 'female',
      activityLevel: 'light',
      goalType: 'maintain',
    };
    const fromCalcMacros = calcMacros(stats);
    const fromTarget = calcMacroTargetsByGoal(stats);
    expect(fromCalcMacros).toEqual(fromTarget);
  });
});

// ── calcCaloricDelta ───────────────────────────────────────────────────────

describe('calcCaloricDelta', () => {
  it('1 lb/week → 500 kcal/day deficit', () => {
    expect(calcCaloricDelta(1)).toBe(500);
  });

  it('0.5 lb/week → 250 kcal/day deficit', () => {
    expect(calcCaloricDelta(0.5)).toBe(250);
  });

  it('0 lb/week → 0 kcal delta', () => {
    expect(calcCaloricDelta(0)).toBe(0);
  });

  it('2 lb/week → 1000 kcal/day', () => {
    expect(calcCaloricDelta(2)).toBe(1000);
  });

  it('throws on negative rate', () => {
    expect(() => calcCaloricDelta(-1)).toThrow(RangeError);
  });
});

// ── calcWeeksToWeightGoal ──────────────────────────────────────────────────

describe('calcWeeksToWeightGoal', () => {
  it('20 lbs to lose at 1 lb/week = 20 weeks', () => {
    expect(calcWeeksToWeightGoal(200, 180, 1)).toBe(20);
  });

  it('10 lbs to gain at 0.5 lb/week = 20 weeks', () => {
    expect(calcWeeksToWeightGoal(160, 170, 0.5)).toBe(20);
  });

  it('already at goal = 0 weeks', () => {
    expect(calcWeeksToWeightGoal(180, 180, 1)).toBe(0);
  });

  it('direction is absolute (losing or gaining same result)', () => {
    expect(calcWeeksToWeightGoal(180, 160, 1)).toBe(
      calcWeeksToWeightGoal(160, 180, 1),
    );
  });

  it('zero rate → Infinity', () => {
    expect(calcWeeksToWeightGoal(200, 180, 0)).toBe(Infinity);
  });

  it('negative rate → Infinity', () => {
    expect(calcWeeksToWeightGoal(200, 180, -1)).toBe(Infinity);
  });
});

// ── calcSavingsProjectionTable ─────────────────────────────────────────────

describe('calcSavingsProjectionTable', () => {
  it('$1000 principal, $100/month, 0% interest, 12 months → $2200 total', () => {
    const result = calcSavingsProjectionTable(1000, 100, 0, 12);
    expect(result.projectedTotal).toBe(2200);
  });

  it('0% interest: totalContributions = principal + monthlyContribution × months', () => {
    const result = calcSavingsProjectionTable(1000, 100, 0, 12);
    expect(result.totalContributions).toBe(1000 + 100 * 12);
  });

  it('0% interest: totalInterest = 0', () => {
    const result = calcSavingsProjectionTable(1000, 100, 0, 12);
    expect(result.totalInterest).toBe(0);
  });

  it('monthlyData array length matches months param', () => {
    const result = calcSavingsProjectionTable(1000, 100, 0, 12);
    expect(result.monthlyData).toHaveLength(12);
  });

  it('monthlyData month 1 balance = principal + contribution (0% interest)', () => {
    const result = calcSavingsProjectionTable(1000, 100, 0, 12);
    expect(result.monthlyData[0]!.balance).toBe(1100);
  });

  it('$0 principal, $500/month, 6% annual, 12 months: balance grows beyond $6000', () => {
    // Simple check: with 6% compound interest the balance should exceed flat accumulation
    const withInterest = calcSavingsProjectionTable(0, 500, 0.06, 12);
    const noInterest = calcSavingsProjectionTable(0, 500, 0, 12);
    expect(withInterest.projectedTotal).toBeGreaterThan(noInterest.projectedTotal);
  });

  it('$0 principal, $500/month, 6% annual, 12 months: totalContributions = 500 × 12', () => {
    const result = calcSavingsProjectionTable(0, 500, 0.06, 12);
    expect(result.totalContributions).toBe(500 * 12);
  });

  it('$0 principal, $500/month, 6% annual, 12 months: totalInterest > 0', () => {
    const result = calcSavingsProjectionTable(0, 500, 0.06, 12);
    expect(result.totalInterest).toBeGreaterThan(0);
  });

  it('0 months projection returns principal as projectedTotal', () => {
    const result = calcSavingsProjectionTable(5000, 200, 0.05, 0);
    expect(result.projectedTotal).toBe(5000);
    expect(result.monthlyData).toHaveLength(0);
  });

  it('monthlyData month values are ascending', () => {
    const result = calcSavingsProjectionTable(1000, 100, 0, 6);
    for (let i = 0; i < result.monthlyData.length; i++) {
      expect(result.monthlyData[i]!.month).toBe(i + 1);
    }
  });

  it('throws on negative months', () => {
    expect(() => calcSavingsProjectionTable(1000, 100, 0, -1)).toThrow(RangeError);
  });

  it('throws on negative annual rate', () => {
    expect(() => calcSavingsProjectionTable(1000, 100, -0.05, 12)).toThrow(RangeError);
  });
});

// ── calcGoalPct ────────────────────────────────────────────────────────────

describe('calcGoalPct', () => {
  const makeGoal = (currentAmount: number, targetAmount: number): FinanceGoalSummary => ({
    id: 'test',
    name: 'Test Goal',
    targetAmount,
    currentAmount,
  });

  it('0 current, 1000 target → 0%', () => {
    expect(calcGoalPct(makeGoal(0, 1000))).toBe(0);
  });

  it('500 current, 1000 target → 50%', () => {
    expect(calcGoalPct(makeGoal(500, 1000))).toBe(50);
  });

  it('1000 current, 1000 target → 100%', () => {
    expect(calcGoalPct(makeGoal(1000, 1000))).toBe(100);
  });

  it('1500 current, 1000 target → capped at 100%', () => {
    expect(calcGoalPct(makeGoal(1500, 1000))).toBe(100);
  });

  it('0 target amount → returns 0', () => {
    expect(calcGoalPct(makeGoal(500, 0))).toBe(0);
  });

  it('250 current, 1000 target → 25%', () => {
    expect(calcGoalPct(makeGoal(250, 1000))).toBe(25);
  });
});

// ── calcMonthsToFinanceGoal ────────────────────────────────────────────────

describe('calcMonthsToFinanceGoal', () => {
  const makeGoal = (
    currentAmount: number,
    targetAmount: number,
    monthlyContribution: number,
    interestRate = 0,
  ): FinanceGoalSummary => ({
    id: 'test',
    name: 'Test Goal',
    targetAmount,
    currentAmount,
    monthlyContribution,
    interestRate,
  });

  it('already at goal → 0 months', () => {
    expect(calcMonthsToFinanceGoal(makeGoal(1000, 1000, 100))).toBe(0);
  });

  it('$0 current, $1000 target, $100/month, 0% → 10 months', () => {
    expect(calcMonthsToFinanceGoal(makeGoal(0, 1000, 100))).toBe(10);
  });

  it('no contribution → Infinity', () => {
    expect(calcMonthsToFinanceGoal(makeGoal(0, 1000, 0))).toBe(Infinity);
  });

  it('with interest reaches goal faster than without', () => {
    const withInterest = calcMonthsToFinanceGoal(makeGoal(0, 10000, 200, 0.06));
    const noInterest = calcMonthsToFinanceGoal(makeGoal(0, 10000, 200, 0));
    expect(withInterest).toBeLessThan(noInterest);
  });

  it('goal unreachable in 600 months → Infinity', () => {
    // $1 billion target, $1/month, no interest → would take 1 billion months
    expect(
      calcMonthsToFinanceGoal(makeGoal(0, 1_000_000_000, 1, 0)),
    ).toBe(Infinity);
  });
});
