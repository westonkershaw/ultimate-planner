/**
 * math.ts
 *
 * Consolidated typed utilities derived from App.jsx (v65) formula audit.
 * All formulas here match the exact coefficients used in the live app.
 *
 * This file is the single source of truth for:
 *   - US-customary (lbs/inches) BMR/TDEE entry points
 *   - Goal-aware macro splits (cut/bulk/maintain) with App.jsx coefficients
 *   - Caloric-delta from weekly weight-change rate
 *   - Savings projection with month-by-month breakdown table
 *   - Goal progress percentage
 *
 * Formulas that were already in macroCalculations.ts / financeEngine.ts /
 * workoutUtils.ts are re-exported from this file for convenience; their
 * implementations live in those canonical modules.
 */

// ── Re-exports from canonical modules ─────────────────────────────────────

export {
  // Macro
  calcBMR,
  calcTDEE,
  calcTDEEFromProfile,
  calcMacroTargets,
  calcMacrosFromProfile,
  ACTIVITY_MULTIPLIERS,
  KCAL_PER_GRAM,
  type MacroTargets,
  type MacroOptions,
} from './macroCalculations';

export {
  // Finance
  calcBudgetSplit,
  calcSavingsRate,
  calcCompoundGrowth,
  calcLoanPayment,
  calcMonthsToGoal,
  calcGoalProgress,
  aggregateMonthlySpending,
  getCategoryBreakdown,
  generateSparklineData,
  generateSparklinePath,
  formatCurrency,
  fmt$,
  // Spending Insights
  calcFinancialHealthScore,
  calcTopSpendingDay,
  calcMonthlySpendingTrend,
  calcGoalsOnTrack,
  calcCategory7DaySparkline,
  calcTopCategory,
  type HealthScoreResult,
  type GoalOnTrackStatus,
  // Debt payoff
  calcDebtPayoff,
  type DebtEntry,
  type DebtPayoffResult,
  type PayoffStrategyResult,
  // Budget buckets
  calcBudgetBuckets,
  type BudgetBucketItem,
  // Emergency fund
  calcEmergencyFund,
  type EmergencyFundResult,
  // Investment simulator
  calcInvestmentSim,
  type InvestmentSimResult,
  type InvestmentYearPoint,
  // Bill calendar
  calcBillCalendar,
  billUrgencyColor,
  type BillEntry,
  type BillCalendarDay,
} from './financeEngine';

export {
  // Workout — core
  calcEpley1RM,
  calcBrzycki1RM,
  calcExerciseVolume,
  calcSessionExerciseVolume,
  calcSessionVolume,
  countCompletedSets,
  suggestLinearProgression,
  formatRestTime,
  calcWorkoutStreak,
  calcWeeklyVolumeTrend,
  calcPRBoard,
  calcFrequencyGrid,
  // Workout — analytics
  calcStrengthStandards,
  calcMuscleGroupBalance,
  calcPRTimeline,
  calcWorkoutRecommendation,
  calcConsistencyGrid,
  calc7DayDailyVolume,
  type WeeklyVolumeEntry,
  type PREntry,
  type FrequencyCell,
  type StrengthLevel,
  type StrengthStandardEntry,
  type MuscleGroup,
  type MuscleGroupStats,
  type PRTimelineEntry,
  type WorkoutRecommendation,
  type ConsistencyCell,
  type WorkoutIntensity,
  type DailyVolumeEntry,
} from './workoutUtils';

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * User stats expressed in US customary units (lbs + inches).
 * Mirrors the `bodyStats` shape stored in the App.jsx data blob.
 *
 * `activityLevel` uses the 3-value subset exposed in the nutrition widget
 * AND the 5-value set exposed in the CalorieModal. Both are valid here;
 * unknown values fall back to `moderate` (1.55×) at runtime.
 */
export interface UserStats {
  /** Body weight in pounds */
  weightLbs: number;
  /** Height in inches */
  heightInches: number;
  /** Age in whole years */
  ageYears: number;
  /** Biological sex */
  sex: 'male' | 'female';
  /**
   * Physical activity level.
   * App.jsx CalorieModal exposes 5 values; nutrition widget exposes 3.
   * All 5 are typed here for full coverage.
   */
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'extra';
  /** Weight-management goal */
  goalType: 'cut' | 'maintain' | 'bulk';
}

/**
 * Extended macro result that includes both TDEE and per-goal split.
 * Mirrors the shape returned by `calcCalories` in App.jsx (line 8209).
 */
export interface MacroResult {
  /** TDEE (maintenance calories), pre-adjustment */
  tdee: number;
  /** Target daily calories after bulk/cut delta */
  targetCalories: number;
  /** Protein target in grams/day */
  proteinG: number;
  /** Carbohydrate target in grams/day */
  carbsG: number;
  /** Fat target in grams/day */
  fatG: number;
  /** Caloric delta applied (positive = surplus, negative = deficit) */
  caloricDelta: number;
}

/**
 * Finance goal shape used by the savings-projection helpers.
 * Intentionally minimal — the full `FinanceGoal` interface lives in
 * `/src/types/finance.types.ts`.
 */
export interface FinanceGoalSummary {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  monthlyContribution?: number;
  /** Annual interest rate as decimal, e.g. 0.07 for 7% */
  interestRate?: number;
}

/** Month-by-month savings projection data */
export interface SavingsProjection {
  months: number;
  projectedTotal: number;
  totalContributions: number;
  totalInterest: number;
  monthlyData: Array<{ month: number; balance: number }>;
}

// ── Activity multiplier map (US-customary entry points) ────────────────────

/**
 * Activity multipliers for the 5-level set used in the CalorieModal
 * (App.jsx lines 8183–8188).
 *
 * Note: the nutrition widget uses only 3 levels (sedentary/moderate/active)
 * which are a subset of this map.
 */
export const APP_ACTIVITY_MULTIPLIERS: Record<UserStats['activityLevel'], number> = {
  sedentary: 1.2,    // desk job, little/no exercise
  light: 1.375,      // light exercise 1–3 days/week
  moderate: 1.55,    // moderate exercise 3–5 days/week (default fallback)
  active: 1.725,     // hard exercise 6–7 days/week
  extra: 1.9,        // athlete / physical job
} as const;

// ── US-Customary BMR / TDEE ────────────────────────────────────────────────

/**
 * Calculate BMR from US customary inputs (pounds + inches).
 *
 * Internally converts to kg/cm before applying Mifflin-St Jeor (1990):
 *   Male:   10w + 6.25h − 5a + 5
 *   Female: 10w + 6.25h − 5a − 161
 *
 * This matches App.jsx lines 3627–3628 and 8197–8198 exactly:
 *   `10 * (w * 0.453592) + 6.25 * (h * 2.54) − 5 * age ± sex_const`
 *
 * @param weightLbs    Body weight in pounds
 * @param heightInches Height in inches
 * @param ageYears     Age in whole years
 * @param sex          Biological sex
 * @returns            BMR in kcal/day (not rounded — caller decides precision)
 */
export function calcBMRFromLbs(
  weightLbs: number,
  heightInches: number,
  ageYears: number,
  sex: 'male' | 'female',
): number {
  if (weightLbs <= 0 || heightInches <= 0 || ageYears <= 0) {
    throw new RangeError('weightLbs, heightInches, and ageYears must all be positive.');
  }
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightInches * 2.54;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === 'male' ? base + 5 : base - 161;
}

/**
 * Calculate TDEE from US customary inputs.
 *
 * @param weightLbs    Body weight in pounds
 * @param heightInches Height in inches
 * @param ageYears     Age in whole years
 * @param sex          Biological sex
 * @param activityLevel  Activity level key
 * @returns            TDEE in kcal/day (rounded to nearest integer)
 */
export function calcTDEEFromLbs(
  weightLbs: number,
  heightInches: number,
  ageYears: number,
  sex: 'male' | 'female',
  activityLevel: UserStats['activityLevel'],
): number {
  const bmr = calcBMRFromLbs(weightLbs, heightInches, ageYears, sex);
  const mult = APP_ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55;
  return Math.round(bmr * mult);
}

// ── Caloric delta from weekly weight-change rate ───────────────────────────

/**
 * Convert a target weekly weight-change rate (lbs/week) to a daily caloric
 * surplus or deficit.
 *
 * Rule of thumb: 1 lb of body fat ≈ 3,500 kcal → 500 kcal/day per lb/week.
 * App.jsx line 8203: `calDelta = Math.round(rate * 500)`
 *
 * @param weeklyRateLbs  Target change in lbs per week (positive value)
 * @returns              Caloric delta per day (always positive; caller applies sign)
 */
export function calcCaloricDelta(weeklyRateLbs: number): number {
  if (weeklyRateLbs < 0) throw new RangeError('weeklyRateLbs must be non-negative.');
  return Math.round(weeklyRateLbs * 500);
}

/**
 * Estimate weeks needed to reach a target weight.
 *
 * App.jsx line 8205: `weeksToGoal = Math.abs((targetWeight - currentWeight) / rate)`
 *
 * @param currentWeightLbs  Current body weight in lbs
 * @param targetWeightLbs   Goal body weight in lbs
 * @param weeklyRateLbs     Planned weekly rate of change in lbs (positive)
 * @returns                 Estimated weeks (rounded to nearest whole week)
 */
export function calcWeeksToWeightGoal(
  currentWeightLbs: number,
  targetWeightLbs: number,
  weeklyRateLbs: number,
): number {
  if (weeklyRateLbs <= 0) return Infinity;
  return Math.round(Math.abs(targetWeightLbs - currentWeightLbs) / weeklyRateLbs);
}

// ── Goal-aware macro targets (App.jsx exact coefficients) ──────────────────

/**
 * Calculate macro targets using the goal-specific coefficients from App.jsx.
 *
 * **Protein** (g/day) — App.jsx lines 3633, 8206:
 *   - Cut:      weightLbs × 1.2  (higher to preserve muscle in deficit)
 *   - Bulk:     weightLbs × 1.0
 *   - Maintain: weightLbs × 0.8
 *
 * **Fat** (g/day) — App.jsx lines 3634:
 *   - Bulk:     targetCalories × 0.28 / 9
 *   - Cut/Maintain: targetCalories × 0.25 / 9
 *
 * **Carbs** (g/day) — remainder method (App.jsx lines 3635, body-stats widget):
 *   carbsG = (targetCalories − proteinG×4 − fatG×9) / 4
 *
 * Note: `calcCalories` in the CalorieModal (App.jsx line 8207) uses a
 * fixed 45%-of-calories approach for carbs instead. Both variants exist
 * in the app; the remainder method (used by the main nutrition dashboard)
 * is preferred here as it ensures caloric consistency.
 *
 * Floor values (App.jsx line 3558): protein ≥ 50g, carbs ≥ 50g, fat ≥ 20g.
 *
 * @param stats         UserStats in US customary units
 * @param weeklyRateLbs Target rate of change in lbs/week (default 0.5 for cut/bulk)
 * @returns             MacroResult with TDEE, target calories, and macro grams
 */
export function calcMacroTargetsByGoal(
  stats: UserStats,
  weeklyRateLbs = 0.5,
): MacroResult {
  const { weightLbs, heightInches, ageYears, sex, activityLevel, goalType } = stats;

  if (weightLbs <= 0) throw new RangeError('weightLbs must be positive.');

  const tdee = calcTDEEFromLbs(weightLbs, heightInches, ageYears, sex, activityLevel);
  const delta = calcCaloricDelta(weeklyRateLbs);

  const caloricDelta = goalType === 'bulk' ? delta : goalType === 'cut' ? -delta : 0;
  const targetCalories = tdee + caloricDelta;

  // Protein: per-lb coefficients from App.jsx
  const proteinCoeff = goalType === 'cut' ? 1.2 : goalType === 'bulk' ? 1.0 : 0.8;
  const proteinG = Math.max(50, Math.round(weightLbs * proteinCoeff));

  // Fat: fraction of target calories
  const fatFraction = goalType === 'bulk' ? 0.28 : 0.25;
  const fatG = Math.max(20, Math.round((targetCalories * fatFraction) / 9));

  // Carbs: caloric remainder
  const carbsG = Math.max(50, Math.round((targetCalories - proteinG * 4 - fatG * 9) / 4));

  return { tdee, targetCalories, proteinG, carbsG, fatG, caloricDelta };
}

/**
 * Convenience wrapper: full macro pipeline from a UserStats object.
 * Identical to `calcMacroTargetsByGoal` but accepts the full stats shape
 * for callers that already have it assembled.
 *
 * @param stats  UserStats in US customary units
 * @returns      MacroResult
 */
export function calcMacros(stats: UserStats): MacroResult {
  return calcMacroTargetsByGoal(stats);
}

// ── Savings projection with monthly breakdown table ────────────────────────

/**
 * Generate a full savings projection with a month-by-month balance table.
 *
 * Uses standard compound interest (monthly compounding):
 *   balance(n) = balance(n-1) × (1 + r) + monthlyContribution
 *
 * where r = annualRate / 12.
 *
 * @param principal            Starting balance
 * @param monthlyContribution  Fixed monthly addition
 * @param annualRate           Annual interest rate as decimal (e.g. 0.07 for 7%)
 * @param months               Number of months to project
 * @returns                    SavingsProjection with monthly breakdown
 */
export function calcSavingsProjectionTable(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  months: number,
): SavingsProjection {
  if (months < 0) throw new RangeError('months must be non-negative.');
  if (annualRate < 0) throw new RangeError('annualRate must be non-negative.');

  const r = annualRate / 12;
  const monthlyData: Array<{ month: number; balance: number }> = [];

  let balance = principal;
  for (let m = 1; m <= months; m++) {
    balance = r === 0
      ? balance + monthlyContribution
      : balance * (1 + r) + monthlyContribution;
    monthlyData.push({ month: m, balance: Math.round(balance * 100) / 100 });
  }

  const projectedTotal = months === 0 ? principal : (monthlyData[months - 1]?.balance ?? principal);
  const totalContributions = principal + monthlyContribution * months;
  const totalInterest = Math.max(0, projectedTotal - totalContributions);

  return {
    months,
    projectedTotal,
    totalContributions,
    totalInterest,
    monthlyData,
  };
}

/**
 * Calculate goal completion percentage from a FinanceGoalSummary.
 * Alias for `calcGoalProgress` using the math.ts interface shape.
 *
 * @param goal  FinanceGoalSummary with targetAmount and currentAmount
 * @returns     Integer percentage clamped to [0, 100]
 */
export function calcGoalPct(goal: FinanceGoalSummary): number {
  if (!goal.targetAmount || goal.targetAmount === 0) return 0;
  return Math.min(100, Math.round(((goal.currentAmount ?? 0) / goal.targetAmount) * 100));
}

/**
 * Calculate how many months until a FinanceGoalSummary is reached,
 * taking optional monthly contribution and interest rate into account.
 *
 * @param goal  FinanceGoalSummary
 * @returns     Months to completion, or Infinity if unreachable
 */
export function calcMonthsToFinanceGoal(goal: FinanceGoalSummary): number {
  const contribution = goal.monthlyContribution ?? 0;
  const rate = goal.interestRate ?? 0;
  if (contribution <= 0) return Infinity;
  if (goal.currentAmount >= goal.targetAmount) return 0;

  const r = rate / 12;
  let balance = goal.currentAmount;
  for (let month = 1; month <= 600; month++) {
    balance = r === 0
      ? balance + contribution
      : balance * (1 + r) + contribution;
    if (balance >= goal.targetAmount) return month;
  }
  return Infinity;
}

// ── Time-Blocking utilities ─────────────────────────────────────────────────

/**
 * Convert an hour + minute pair to a 0-based 30-min slot index.
 *
 * GRID_START_HOUR (6) means slot 0 = 6:00 AM, slot 1 = 6:30 AM, etc.
 * Returns -1 if the time is before the grid start.
 *
 * @param hour         Hour in 24-hour format (0–23)
 * @param minute       Minute (0 or 30 expected; others are floored to 30-min grid)
 * @param gridStartHour  First visible hour (default 6 = 6:00 AM)
 * @returns            Zero-based slot index, or -1 if out of range
 */
export function timeToSlotIndex(
  hour: number,
  minute: number,
  gridStartHour = 6,
): number {
  const totalMinutes = hour * 60 + minute;
  const startMinutes = gridStartHour * 60;
  if (totalMinutes < startMinutes) return -1;
  return Math.floor((totalMinutes - startMinutes) / 30);
}

/**
 * Return the number of 30-min slots a time block spans.
 * Minimum 1 slot is always returned.
 *
 * @param startHour   Block start hour (24h)
 * @param startMin    Block start minute
 * @param endHour     Block end hour (24h)
 * @param endMin      Block end minute
 * @returns           Slot count (integer ≥ 1)
 */
export function blockDurationSlots(
  startHour: number,
  startMin: number,
  endHour: number,
  endMin: number,
): number {
  const durationMin = (endHour * 60 + endMin) - (startHour * 60 + startMin);
  return Math.max(1, Math.round(durationMin / 30));
}

/**
 * Format an hour + minute pair as a readable 12-hour time string.
 *
 * @param hour    Hour in 24-hour format (0–23)
 * @param minute  Minute (0–59)
 * @returns       e.g. "9:30 AM", "12:00 PM"
 */
export function formatSlotTime(hour: number, minute: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = String(minute).padStart(2, '0');
  return `${h}:${m} ${period}`;
}

// ── Habit Heat Map utilities ────────────────────────────────────────────────

/**
 * Single cell in a habit contribution heat map.
 * `dateStr` is a YYYY-MM-DD string.
 * `pct` is 0–1 representing the logged value divided by the habit target
 * (clamped to 1 for over-achievement).
 * `logged` is true when any truthy entry exists for this date.
 */
export interface HeatmapCell {
  dateStr: string;
  pct: number;
  logged: boolean;
}

/**
 * Build a 84-cell (12 weeks × 7 days Mon–Sun) heat map grid for a habit.
 *
 * Cells are ordered left-to-right, oldest first so that column 0 = 12 weeks
 * ago and column 11 = this week. Within each column, row 0 = Monday through
 * row 6 = Sunday.
 *
 * The habit `logs` object is keyed by `YYYY-MM-DD` date strings and values
 * are either a truthy number (logged amount) or boolean true.
 *
 * @param logs    Record of date-string → value (number | boolean)
 * @param target  Daily target value — used to derive the 0–1 pct
 * @returns       Array of 84 HeatmapCell, row-major (7 rows × 12 cols)
 */
export function calcHabitHeatmapCells(
  logs: Record<string, number | boolean>,
  target: number,
): HeatmapCell[] {
  const safeTarget = target > 0 ? target : 1;
  const cells: HeatmapCell[] = [];

  // Find the Monday that starts the 12-week window.
  // "Today" is always in the rightmost (12th) column.
  const today = new Date();
  // Day of week: 0=Sun … 6=Sat. Convert to Mon-based: 0=Mon … 6=Sun.
  const todayDow = (today.getDay() + 6) % 7; // 0=Mon … 6=Sun
  // Start of current week (Monday)
  const thisWeekMonday = new Date(today);
  thisWeekMonday.setDate(today.getDate() - todayDow);
  thisWeekMonday.setHours(0, 0, 0, 0);
  // 12 weeks back from this Monday
  const gridStart = new Date(thisWeekMonday);
  gridStart.setDate(thisWeekMonday.getDate() - 11 * 7);

  for (let col = 0; col < 12; col++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + col * 7 + row);
      const dateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
      const rawVal = logs[dateStr];
      const logged = !!rawVal;
      let pct = 0;
      if (logged) {
        const numVal = typeof rawVal === 'boolean' ? 1 : (rawVal as number);
        pct = Math.min(1, numVal / safeTarget);
      }
      cells.push({ dateStr, pct, logged });
    }
  }
  return cells;
}

/**
 * Weekly bar chart data for the past 4 full weeks.
 *
 * Each entry represents one week (Mon–Sun) and contains:
 * - `weekLabel`: short label like "Mar 17"
 * - `daysHit`: count of days that have any truthy log entry
 * - `pct`: 0–1 fraction of 7 days hit
 *
 * Week 0 is the oldest (4 weeks ago), week 3 is the most recent completed week.
 *
 * @param logs  Record of date-string → value
 * @returns     Array of 4 weekly bar entries
 */
export interface WeekBarEntry {
  weekLabel: string;
  daysHit: number;
  pct: number;
}

export function calcHabitWeeklyBars(
  logs: Record<string, number | boolean>,
): WeekBarEntry[] {
  const today = new Date();
  const todayDow = (today.getDay() + 6) % 7;
  // Start of current week (Monday)
  const thisWeekMonday = new Date(today);
  thisWeekMonday.setDate(today.getDate() - todayDow);
  thisWeekMonday.setHours(0, 0, 0, 0);

  const entries: WeekBarEntry[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(thisWeekMonday);
    weekStart.setDate(thisWeekMonday.getDate() - (w + 1) * 7);
    let daysHit = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      const key = day.toLocaleDateString('en-CA');
      if (logs[key]) daysHit++;
    }
    const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    entries.push({ weekLabel: label, daysHit, pct: daysHit / 7 });
  }
  return entries;
}

/**
 * Compute the best (longest) streak for a habit across all logged dates.
 *
 * Walks every date in the logs backward from today to find the maximum
 * consecutive run of days that have a truthy log entry, regardless of
 * scheduling. This is intentionally simpler than the schedule-aware
 * `calcStreak` to give an "all-time best" number.
 *
 * @param logs  Record of date-string → value
 * @returns     Length of the longest consecutive run (integer ≥ 0)
 */
export function calcHabitBestStreak(
  logs: Record<string, number | boolean>,
): number {
  const keys = Object.keys(logs).filter((k) => !!logs[k]);
  if (keys.length === 0) return 0;

  // Sort descending so we iterate oldest first after reversing
  const sorted = [...keys].sort();

  let best = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00');
    const curr = new Date(sorted[i] + 'T12:00:00');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
    if (diffDays === 1) {
      current++;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

// ── Habit difficulty & challenge score ──────────────────────────────────────

export type HabitDifficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_POINTS: Record<HabitDifficulty, number> = { easy: 1, medium: 2, hard: 3 };

/**
 * Sum difficulty points for all habits that were logged today.
 *
 * @param habits  Array of habit objects; each may optionally carry `difficulty`
 * @param todayKey  YYYY-MM-DD string for today
 * @returns  Integer challenge score (0 if nothing logged)
 */
export function calcDailyChallengeScore(
  habits: Array<{ difficulty?: HabitDifficulty; logs?: Record<string, unknown>; archived?: boolean }>,
  todayKey: string,
): number {
  return habits
    .filter((h) => !h.archived && !!(h.logs ?? {})[todayKey])
    .reduce((sum, h) => sum + DIFFICULTY_POINTS[h.difficulty ?? 'easy'], 0);
}

/**
 * Count total "perfect days" — days on which every scheduled active habit was logged.
 *
 * A day is only evaluated if it is <= today (no future dates).
 * We look back up to `lookbackDays` (default 90) to keep it bounded.
 *
 * @param habits        Full habits array (archived habits are excluded)
 * @param lookbackDays  How many days to scan (default 90)
 * @returns             Count of perfect days in the window
 */
export function calcPerfectDays(
  habits: Array<{
    archived?: boolean;
    frequency: string;
    customDays?: string[];
    logs?: Record<string, unknown>;
  }>,
  lookbackDays = 90,
): number {
  const active = habits.filter((h) => !h.archived);
  if (active.length === 0) return 0;

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');
  let count = 0;

  for (let i = 0; i < lookbackDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-CA');
    if (dateStr > todayStr) continue;

    const dayName = (['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const)[d.getDay()] ?? 'Sunday';
    const weekday = d.getDay();

    const isScheduled = (h: typeof active[0]) => {
      switch (h.frequency) {
        case 'daily': return true;
        case 'weekdays': return weekday >= 1 && weekday <= 5;
        case 'weekends': return weekday === 0 || weekday === 6;
        case 'weekly': return i === 0; // only count today for weekly
        case 'custom': return (h.customDays ?? []).includes(dayName);
        default: return true;
      }
    };

    const scheduledHabits = active.filter((h) => isScheduled(h));
    if (scheduledHabits.length === 0) continue;

    const allDone = scheduledHabits.every((h) => !!(h.logs ?? {})[dateStr]);
    if (allDone) count++;
  }

  return count;
}

/**
 * Find the weekday name on which the user completes the most habits on average.
 *
 * @param habits        Full habits array (archived excluded)
 * @param lookbackDays  How many days to scan (default 56 = 8 weeks)
 * @returns             Weekday name (e.g. "Monday") or null if no data
 */
export function calcStrongestDay(
  habits: Array<{ archived?: boolean; logs?: Record<string, unknown> }>,
  lookbackDays = 56,
): string | null {
  const active = habits.filter((h) => !h.archived);
  if (active.length === 0) return null;

  const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const totals: number[] = new Array(7).fill(0) as number[];
  const counts: number[] = new Array(7).fill(0) as number[];
  const today = new Date();

  for (let i = 1; i <= lookbackDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-CA');
    const dow = d.getDay();
    const logged = active.filter((h) => !!(h.logs ?? {})[dateStr]).length;
    totals[dow] = (totals[dow] ?? 0) + logged;
    counts[dow] = (counts[dow] ?? 0) + 1;
  }

  let bestDay = -1;
  let bestAvg = -1;
  for (let dow = 0; dow < 7; dow++) {
    const c = counts[dow] ?? 0;
    if (c === 0) continue;
    const avg = (totals[dow] ?? 0) / c;
    if (avg > bestAvg) { bestAvg = avg; bestDay = dow; }
  }

  return bestDay >= 0 ? (DAY_NAMES[bestDay] ?? null) : null;
}

/**
 * Return the habit that has the longest current streak (tie: first found).
 * Returns null if no habits have any logs.
 */
export function calcLongestStreakHabit(
  habits: Array<{ id: string; name: string; archived?: boolean; streak?: number }>,
): { name: string; streak: number } | null {
  const active = habits.filter((h) => !h.archived && (h.streak ?? 0) > 0);
  if (active.length === 0) return null;
  const best = active.reduce((a, b) => ((a.streak ?? 0) >= (b.streak ?? 0) ? a : b));
  return { name: best.name, streak: best.streak ?? 0 };
}

/**
 * Calculate the maximum possible daily score — sum of difficulty points for
 * every active habit that is scheduled today.
 *
 * @param habits    Full habits array
 * @param todayKey  YYYY-MM-DD string for today
 * @returns         Integer max score
 */
export function calcMaxDailyScore(
  habits: Array<{
    difficulty?: HabitDifficulty;
    archived?: boolean;
    frequency: string;
    customDays?: string[];
  }>,
  todayKey: string,
): number {
  const d = new Date(todayKey + 'T12:00:00');
  const dayName = (['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const)[d.getDay()] ?? 'Sunday';
  const weekday = d.getDay();

  return habits
    .filter((h) => {
      if (h.archived) return false;
      switch (h.frequency) {
        case 'daily': return true;
        case 'weekdays': return weekday >= 1 && weekday <= 5;
        case 'weekends': return weekday === 0 || weekday === 6;
        case 'weekly': return true;
        case 'custom': return (h.customDays ?? []).includes(dayName);
        default: return true;
      }
    })
    .reduce((sum, h) => sum + DIFFICULTY_POINTS[h.difficulty ?? 'easy'], 0);
}

/** Milestone day-counts at which to celebrate a habit streak. */
export const HABIT_STREAK_MILESTONES = [7, 14, 30, 60, 100] as const;

/**
 * Given a habit's current streak, return the milestone value if the streak
 * exactly hits one. Returns null otherwise.
 *
 * @param streak  Current consecutive-day streak
 * @returns       Milestone number (7 | 14 | 30 | 60 | 100) or null
 */
export function calcHabitStreakMilestone(streak: number): 7 | 14 | 30 | 60 | 100 | null {
  return (HABIT_STREAK_MILESTONES as readonly number[]).includes(streak)
    ? (streak as 7 | 14 | 30 | 60 | 100)
    : null;
}

// ── Weekly performance scoring ──────────────────────────────────────────────

/**
 * Compute a composite weekly performance score from 0–100.
 *
 * Weights (must sum to 100):
 *   - Task completion:  50 pts  (completionPct maps directly to 0–50)
 *   - Workout cadence:  30 pts  (4+ workouts = full 30 pts; linear below)
 *   - Sleep quality:    20 pts  (7.5h+ = full 20 pts; linear below)
 *
 * Returns 0 when all inputs are 0 / null.
 *
 * @param completionPct  Task completion percentage 0–100
 * @param workoutCount   Number of workouts completed this week
 * @param avgSleepH      Average nightly sleep hours (null if unlogged)
 * @returns              Integer score 0–100
 */
export function calcWeeklyScore(
  completionPct: number,
  workoutCount: number,
  avgSleepH: number | null,
): number {
  const taskPts    = Math.min(50, Math.round((completionPct / 100) * 50));
  const workoutPts = Math.min(30, Math.round((workoutCount / 4) * 30));
  const sleepPts   = avgSleepH !== null
    ? Math.min(20, Math.round((Math.min(avgSleepH, 7.5) / 7.5) * 20))
    : 10; // neutral 10 when sleep unlogged
  return taskPts + workoutPts + sleepPts;
}

/**
 * Convert a 0–100 weekly performance score to a letter grade.
 *
 * A: 90–100  B: 75–89  C: 55–74  D: 40–54  F: 0–39
 *
 * @param score  Integer 0–100 from `calcWeeklyScore`
 * @returns      Letter grade string
 */
export function calcLetterGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

// ── Journal utilities ───────────────────────────────────────────────────────

/**
 * Count the number of words in a string.
 * Splits on whitespace; empty strings and all-whitespace return 0.
 *
 * @param text  Input string
 * @returns     Word count (integer >= 0)
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Minimal journal entry shape needed by the utilities below. */
export interface JournalEntrySummary {
  date: string;       // YYYY-MM-DD
  text: string;
  tags?: string[];
}

/**
 * Calculate the current consecutive writing streak (days in a row with
 * at least one journal entry ending on or including today).
 * If today has no entry yet, counts backward from yesterday to keep
 * the streak alive.
 *
 * @param entries  Array of journal entries with `date` field (YYYY-MM-DD)
 * @returns        Streak length in days (0 if not written recently)
 */
export function calcWritingStreak(entries: JournalEntrySummary[]): number {
  if (entries.length === 0) return 0;
  const datesSet = new Set(entries.map((e) => e.date));
  const d = new Date();
  const todayStr = d.toLocaleDateString('en-CA');
  // If today not yet written, start counting from yesterday
  if (!datesSet.has(todayStr)) {
    d.setDate(d.getDate() - 1);
  }
  let streak = 0;
  while (true) {
    const key = d.toLocaleDateString('en-CA');
    if (!datesSet.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/**
 * Sum total word count across all journal entries.
 *
 * @param entries  Array of journal entries
 * @returns        Total word count across all texts
 */
export function calcLifetimeWordCount(entries: JournalEntrySummary[]): number {
  return entries.reduce((acc, e) => acc + countWords(e.text), 0);
}

/**
 * Count how many times each tag appears across all journal entries.
 * Returns sorted by frequency descending.
 *
 * @param entries  Array of journal entries with optional `tags` field
 * @returns        Array of { tag, count } sorted by count desc
 */
export function calcTagFrequency(
  entries: JournalEntrySummary[],
): Array<{ tag: string; count: number }> {
  const freq: Record<string, number> = {};
  for (const e of entries) {
    for (const tag of (e.tags ?? [])) {
      freq[tag] = (freq[tag] ?? 0) + 1;
    }
  }
  return Object.entries(freq)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

// ── Mood utilities ──────────────────────────────────────────────────────────

/** Minimal mood log shape keyed by YYYY-MM-DD. */
export interface MoodLogMap {
  [dateStr: string]: { score: number; note?: string; timestamp?: string };
}

/** One point in the 14-day trend chart. */
export interface MoodTrendPoint {
  dateStr: string;
  /** Short label like "Mar 15" */
  label: string;
  /** Mood score 1-5, or null if not logged */
  score: number | null;
  isToday: boolean;
}

/**
 * Build an ordered array of 14 trend points for the mood line chart.
 * Index 0 = 13 days ago, index 13 = today.
 *
 * @param moodLogs  MoodLogMap keyed by YYYY-MM-DD
 * @returns         Array of 14 MoodTrendPoint
 */
export function calcMood14Days(moodLogs: MoodLogMap): MoodTrendPoint[] {
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');
  const points: MoodTrendPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toLocaleDateString('en-CA');
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const log = moodLogs[ds];
    points.push({
      dateStr: ds,
      label,
      score: log ? log.score : null,
      isToday: ds === todayStr,
    });
  }
  return points;
}

/** Weekly mood summary: average and score distribution. */
export interface MoodWeeklySummary {
  /** Average mood score this week, or null if nothing logged */
  avg: number | null;
  /** Count of each score 1-5 */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  /** Total entries logged this week */
  totalLogged: number;
}

/**
 * Compute this week's (last 7 days including today) mood average and
 * score distribution.
 *
 * @param moodLogs  MoodLogMap keyed by YYYY-MM-DD
 * @returns         MoodWeeklySummary
 */
export function calcMoodWeeklySummary(moodLogs: MoodLogMap): MoodWeeklySummary {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toLocaleDateString('en-CA');
    const log = moodLogs[ds];
    if (log) {
      const s = Math.min(5, Math.max(1, log.score)) as 1 | 2 | 3 | 4 | 5;
      dist[s] = (dist[s] ?? 0) + 1;
      sum += s;
      total++;
    }
  }
  return {
    avg: total > 0 ? Math.round((sum / total) * 10) / 10 : null,
    distribution: dist as Record<1 | 2 | 3 | 4 | 5, number>,
    totalLogged: total,
  };
}

/** One entry in the day-of-week mood breakdown. */
export interface MoodByDow {
  /** 0=Sun...6=Sat */
  dow: number;
  label: string;
  avg: number | null;
  count: number;
}

/**
 * Compute average mood score grouped by day of week across all logged entries.
 * Returns an array of 7 entries ordered Sun-Sat.
 *
 * @param moodLogs  MoodLogMap keyed by YYYY-MM-DD
 * @returns         Array of 7 MoodByDow
 */
export function calcMoodByDayOfWeek(moodLogs: MoodLogMap): MoodByDow[] {
  const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const sums: number[] = new Array(7).fill(0) as number[];
  const counts: number[] = new Array(7).fill(0) as number[];
  for (const [ds, log] of Object.entries(moodLogs)) {
    const d = new Date(ds + 'T12:00:00');
    const dow = d.getDay();
    sums[dow] = (sums[dow] ?? 0) + log.score;
    counts[dow] = (counts[dow] ?? 0) + 1;
  }
  return DOW_LABELS.map((label, dow) => {
    const c = counts[dow] ?? 0;
    const s = sums[dow] ?? 0;
    return {
      dow,
      label,
      avg: c > 0 ? Math.round((s / c) * 10) / 10 : null,
      count: c,
    };
  });
}

/** Workout history entry shape needed for mood correlation. */
export interface WorkoutHistoryEntry {
  completedAt: number; // Unix timestamp ms
}

/** Result of exercise vs rest day mood comparison. */
export interface MoodExerciseCorrelation {
  exerciseDaysAvg: number | null;
  restDaysAvg: number | null;
  exerciseDaysCount: number;
  restDaysCount: number;
}

/**
 * Compare average mood on days where a workout was completed vs rest days.
 * Only considers days that have mood logs and fall within the last 90 days.
 *
 * @param moodLogs        MoodLogMap
 * @param workoutHistory  Array of completed workouts with `completedAt` timestamps
 * @returns               MoodExerciseCorrelation
 */
export function calcMoodVsExercise(
  moodLogs: MoodLogMap,
  workoutHistory: WorkoutHistoryEntry[],
): MoodExerciseCorrelation {
  const exerciseDateSet = new Set<string>();
  for (const w of workoutHistory) {
    const d = new Date(w.completedAt);
    exerciseDateSet.add(d.toLocaleDateString('en-CA'));
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toLocaleDateString('en-CA');

  let exSum = 0; let exCount = 0;
  let restSum = 0; let restCount = 0;

  for (const [ds, log] of Object.entries(moodLogs)) {
    if (ds < cutoffStr) continue;
    if (exerciseDateSet.has(ds)) {
      exSum += log.score; exCount++;
    } else {
      restSum += log.score; restCount++;
    }
  }

  return {
    exerciseDaysAvg: exCount > 0 ? Math.round((exSum / exCount) * 10) / 10 : null,
    restDaysAvg: restCount > 0 ? Math.round((restSum / restCount) * 10) / 10 : null,
    exerciseDaysCount: exCount,
    restDaysCount: restCount,
  };
}

/** Single cell in the 12-week mood heatmap. */
export interface MoodHeatmapCell {
  dateStr: string;
  label: string;
  /** Mood score 1-5, or null if not logged */
  score: number | null;
  isToday: boolean;
  isFuture: boolean;
}

/**
 * Build an 84-cell (12 weeks x 7 days, Sun-Sat) mood heatmap grid.
 * Column 0 = 12 weeks ago, column 11 = this week.
 * Within each column, row 0 = Sunday through row 6 = Saturday.
 *
 * @param moodLogs  MoodLogMap keyed by YYYY-MM-DD
 * @returns         Array of 84 MoodHeatmapCell, column-major (7 rows x 12 cols)
 */
export function calcMood12WeekHeatmap(moodLogs: MoodLogMap): MoodHeatmapCell[] {
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');
  const todayDow = today.getDay(); // 0=Sun
  // Start of current week (Sunday)
  const thisWeekSunday = new Date(today);
  thisWeekSunday.setDate(today.getDate() - todayDow);
  // Go back 11 more weeks
  const gridStart = new Date(thisWeekSunday);
  gridStart.setDate(thisWeekSunday.getDate() - 11 * 7);

  const cells: MoodHeatmapCell[] = [];
  for (let col = 0; col < 12; col++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + col * 7 + row);
      const ds = d.toLocaleDateString('en-CA');
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const log = moodLogs[ds];
      const isFuture = ds > todayStr;
      cells.push({
        dateStr: ds,
        label,
        score: (!isFuture && log) ? log.score : null,
        isToday: ds === todayStr,
        isFuture,
      });
    }
  }
  return cells;
}

/**
 * Calculate the average mood score during periods of high habit streaks (5+).
 * For each mood-logged day, computes the consecutive habit streak ending on
 * that day; averages mood scores on days with streak >= 5.
 *
 * Returns null if fewer than 3 qualifying days exist.
 *
 * @param moodLogs   MoodLogMap
 * @param habitLogs  Record of date-string to truthy value for a tracked habit
 * @returns          Average mood on high-streak days, or null
 */
export function calcMoodAtHighStreak(
  moodLogs: MoodLogMap,
  habitLogs: Record<string, number | boolean>,
): number | null {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toLocaleDateString('en-CA');
  const highStreakScores: number[] = [];

  for (const [ds, log] of Object.entries(moodLogs)) {
    if (ds < cutoffStr) continue;
    let streak = 0;
    const d = new Date(ds + 'T12:00:00');
    while (true) {
      const key = d.toLocaleDateString('en-CA');
      if (!habitLogs[key]) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    if (streak >= 5) highStreakScores.push(log.score);
  }

  if (highStreakScores.length < 3) return null;
  const sum = highStreakScores.reduce((a, b) => a + b, 0);
  return Math.round((sum / highStreakScores.length) * 10) / 10;
}

// ── Journal sentiment & review utilities ────────────────────────────────────

const SENTIMENT_POSITIVE_WORDS = new Set([
  'happy', 'grateful', 'excited', 'proud', 'accomplished', 'joy', 'love',
  'amazing', 'great', 'wonderful', 'inspired', 'motivated', 'calm', 'peaceful',
  'confident', 'fantastic', 'excellent', 'brilliant', 'thrilled', 'energized',
  'hopeful', 'optimistic', 'cheerful', 'delighted', 'fulfilled',
]);

const SENTIMENT_NEGATIVE_WORDS = new Set([
  'anxious', 'stressed', 'sad', 'worried', 'tired', 'overwhelmed', 'frustrated',
  'angry', 'lonely', 'lost', 'confused', 'afraid', 'struggle', 'difficult', 'pain',
  'exhausted', 'hopeless', 'miserable', 'depressed', 'upset', 'irritated',
  'disappointed', 'discouraged', 'drained', 'helpless',
]);

/**
 * Calculate a keyword-based sentiment score for a journal entry text.
 * Score = (positiveCount - negativeCount) / totalWords * 100, clamped -100 to +100.
 * Returns 0 for empty or whitespace-only text.
 *
 * @param text  Raw journal entry text
 * @returns     Sentiment score in the range [-100, 100]
 */
export function calcEntrySentiment(text: string): number {
  const words = text.toLowerCase().match(/[a-z']+/g);
  if (!words || words.length === 0) return 0;
  let pos = 0;
  let neg = 0;
  for (const w of words) {
    if (SENTIMENT_POSITIVE_WORDS.has(w)) pos++;
    else if (SENTIMENT_NEGATIVE_WORDS.has(w)) neg++;
  }
  const raw = ((pos - neg) / words.length) * 100;
  return Math.max(-100, Math.min(100, Math.round(raw * 10) / 10));
}

/** A single day's sentiment data point for the sparkline. */
export interface SentimentTrendPoint {
  dateStr: string;
  /** Score in [-100, 100], or null if no entry exists for that day */
  score: number | null;
  /** Short label e.g. "Mar 15" */
  label: string;
}

/**
 * Build an array of 30 daily sentiment trend points (oldest first).
 * Days with no journal entry have score = null.
 *
 * @param entries  Array of journal entries with `date` and `text` fields
 * @returns        Array of 30 SentimentTrendPoint
 */
export function calcSentiment30DayTrend(
  entries: JournalEntrySummary[],
): SentimentTrendPoint[] {
  const byDate: Record<string, string> = {};
  for (const e of entries) {
    byDate[e.date] = e.text;
  }
  const points: SentimentTrendPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toLocaleDateString('en-CA');
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const text = byDate[ds];
    points.push({
      dateStr: ds,
      label,
      score: text != null ? calcEntrySentiment(text) : null,
    });
  }
  return points;
}

/** Shape returned by the weekly journal review calculation. */
export interface WeeklyJournalReview {
  /** Total words written this week across all entries */
  totalWords: number;
  /** Number of entries this week */
  entryCount: number;
  /** Average sentiment score for the week, or null if no entries */
  avgSentiment: number | null;
  /** Top 3 tags used this week, in order of frequency */
  topTags: string[];
  /** The most common topic keyword (>=3 chars, excluding stopwords), or null */
  topTopic: string | null;
  /** Consistency description: 'daily' | 'almost_daily' | 'some_days' | 'sporadic' | 'none' */
  consistency: 'daily' | 'almost_daily' | 'some_days' | 'sporadic' | 'none';
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'was', 'that', 'this', 'have', 'had', 'not', 'but',
  'with', 'are', 'from', 'been', 'what', 'when', 'your', 'you', 'its',
  'they', 'will', 'can', 'just', 'about', 'more', 'also', 'some', 'would',
  'did', 'how', 'than', 'her', 'him', 'his', 'she', 'one', 'all', 'our',
  'out', 'into', 'today', 'day', 'time', 'very', 'get', 'got', 'felt',
]);

/**
 * Generate an auto-summary of the current week's journal activity.
 * Week is defined as Mon-Sun of the current ISO week.
 *
 * @param entries  All journal entries (only this week's are used)
 * @returns        WeeklyJournalReview
 */
export function calcWeeklyJournalReview(
  entries: JournalEntrySummary[],
): WeeklyJournalReview {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const daysFromMon = (dow + 6) % 7;
  const monDate = new Date(now);
  monDate.setDate(now.getDate() - daysFromMon);
  monDate.setHours(0, 0, 0, 0);
  const sunDate = new Date(monDate);
  sunDate.setDate(monDate.getDate() + 6);
  sunDate.setHours(23, 59, 59, 999);

  const weekStart = monDate.toLocaleDateString('en-CA');
  const weekEnd = sunDate.toLocaleDateString('en-CA');

  const weekEntries = entries.filter((e) => e.date >= weekStart && e.date <= weekEnd);

  if (weekEntries.length === 0) {
    return {
      totalWords: 0,
      entryCount: 0,
      avgSentiment: null,
      topTags: [],
      topTopic: null,
      consistency: 'none',
    };
  }

  const totalWords = weekEntries.reduce((s, e) => s + countWords(e.text), 0);

  const sentiments = weekEntries.map((e) => calcEntrySentiment(e.text));
  const avgSentiment =
    Math.round((sentiments.reduce((a, b) => a + b, 0) / sentiments.length) * 10) / 10;

  const tagFreq: Record<string, number> = {};
  for (const e of weekEntries) {
    for (const tag of e.tags ?? []) {
      tagFreq[tag] = (tagFreq[tag] ?? 0) + 1;
    }
  }
  const topTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  const wordFreq: Record<string, number> = {};
  for (const e of weekEntries) {
    const words = e.text.toLowerCase().match(/[a-z]{3,}/g) ?? [];
    for (const w of words) {
      if (!STOPWORDS.has(w)) {
        wordFreq[w] = (wordFreq[w] ?? 0) + 1;
      }
    }
  }
  const topTopicEntry = Object.entries(wordFreq).sort((a, b) => b[1] - a[1])[0];
  const topTopic = topTopicEntry && topTopicEntry[1] >= 2 ? topTopicEntry[0] : null;

  const uniqueDays = new Set(weekEntries.map((e) => e.date)).size;
  const consistency: WeeklyJournalReview['consistency'] =
    uniqueDays >= 7
      ? 'daily'
      : uniqueDays >= 5
      ? 'almost_daily'
      : uniqueDays >= 3
      ? 'some_days'
      : 'sporadic';

  return { totalWords, entryCount: weekEntries.length, avgSentiment, topTags, topTopic, consistency };
}

// ── Journal Insights: Monthly/Quarterly Digest ─────────────────────────────

/** Shape for a monthly or quarterly journal digest. */
export interface JournalDigest {
  period: string;
  totalEntries: number;
  totalWords: number;
  avgWordsPerEntry: number;
  avgSentiment: number | null;
  sentimentTrend: 'improving' | 'declining' | 'stable' | 'insufficient';
  topTags: Array<{ tag: string; count: number }>;
  topTopics: Array<{ topic: string; count: number }>;
  bestDay: { date: string; sentiment: number } | null;
  toughestDay: { date: string; sentiment: number } | null;
  consistency: number; // percentage of days with entries
  longestStreak: number;
  avgRating: number | null;
}

/**
 * Calculate a digest for a given set of journal entries within a date range.
 */
export function calcJournalDigest(
  entries: JournalEntrySummary[],
  startDate: string,
  endDate: string,
  periodLabel: string,
): JournalDigest {
  const rangeEntries = entries.filter((e) => e.date >= startDate && e.date <= endDate);
  const totalEntries = rangeEntries.length;
  const totalWords = rangeEntries.reduce((s, e) => s + countWords(e.text), 0);

  if (totalEntries === 0) {
    return {
      period: periodLabel, totalEntries: 0, totalWords: 0, avgWordsPerEntry: 0,
      avgSentiment: null, sentimentTrend: 'insufficient', topTags: [], topTopics: [],
      bestDay: null, toughestDay: null, consistency: 0, longestStreak: 0, avgRating: null,
    };
  }

  const avgWordsPerEntry = Math.round(totalWords / totalEntries);

  // Sentiment
  const sentiments = rangeEntries.map((e) => ({ date: e.date, score: calcEntrySentiment(e.text) }));
  const avgSentiment = Math.round((sentiments.reduce((s, p) => s + p.score, 0) / sentiments.length) * 10) / 10;

  // Sentiment trend: compare first half vs second half
  const mid = Math.floor(sentiments.length / 2);
  let sentimentTrend: JournalDigest['sentimentTrend'] = 'insufficient';
  if (sentiments.length >= 4) {
    const firstHalfAvg = sentiments.slice(0, mid).reduce((s, p) => s + p.score, 0) / mid;
    const secondHalfAvg = sentiments.slice(mid).reduce((s, p) => s + p.score, 0) / (sentiments.length - mid);
    const diff = secondHalfAvg - firstHalfAvg;
    sentimentTrend = diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable';
  }

  // Best and toughest days
  const sorted = [...sentiments].sort((a, b) => b.score - a.score);
  const bestDay = sorted[0] ? { date: sorted[0].date, sentiment: sorted[0].score } : null;
  const last = sorted[sorted.length - 1];
  const toughestDay = last ? { date: last.date, sentiment: last.score } : null;

  // Tags
  const tagFreq: Record<string, number> = {};
  for (const e of rangeEntries) {
    for (const tag of (e as any).tags ?? []) {
      tagFreq[tag] = (tagFreq[tag] ?? 0) + 1;
    }
  }
  const topTags = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => ({ tag, count }));

  // Topics (words >= 4 chars, excluding stopwords, count >= 2)
  const wordFreq: Record<string, number> = {};
  for (const e of rangeEntries) {
    const words = e.text.toLowerCase().match(/[a-z]{4,}/g) ?? [];
    for (const w of words) {
      if (!STOPWORDS.has(w)) {
        wordFreq[w] = (wordFreq[w] ?? 0) + 1;
      }
    }
  }
  const topTopics = Object.entries(wordFreq)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([topic, count]) => ({ topic, count }));

  // Consistency: % of days in range that have entries
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const daysWithEntries = new Set(rangeEntries.map((e) => e.date)).size;
  const consistency = Math.round((daysWithEntries / totalDays) * 100);

  // Longest streak in range
  const dateSet = new Set(rangeEntries.map((e) => e.date));
  let longestStreak = 0;
  let currentStreak = 0;
  const d = new Date(startDate + 'T12:00:00');
  while (d.toLocaleDateString('en-CA') <= endDate) {
    if (dateSet.has(d.toLocaleDateString('en-CA'))) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
    d.setDate(d.getDate() + 1);
  }

  // Avg rating
  const rated = rangeEntries.filter((e) => (e as any).rating > 0);
  const avgRating = rated.length > 0
    ? Math.round((rated.reduce((s, e) => s + ((e as any).rating || 0), 0) / rated.length) * 10) / 10
    : null;

  return {
    period: periodLabel, totalEntries, totalWords, avgWordsPerEntry,
    avgSentiment, sentimentTrend, topTags, topTopics,
    bestDay, toughestDay, consistency, longestStreak, avgRating,
  };
}

/**
 * Build monthly digest for a given month.
 */
export function calcMonthlyDigest(
  entries: JournalEntrySummary[],
  year: number,
  month: number,
): JournalDigest {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const label = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return calcJournalDigest(entries, startDate, endDate, label);
}

/**
 * Build quarterly digest (Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec).
 */
export function calcQuarterlyDigest(
  entries: JournalEntrySummary[],
  year: number,
  quarter: number,
): JournalDigest {
  const startMonth = (quarter - 1) * 3;
  const startDate = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`;
  const endMonth = startMonth + 2;
  const lastDay = new Date(year, endMonth + 1, 0).getDate();
  const endDate = `${year}-${String(endMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return calcJournalDigest(entries, startDate, endDate, `Q${quarter} ${year}`);
}

// ── Journal Insights: On This Day ──────────────────────────────────────────

export interface OnThisDayEntry {
  label: string;
  entry: JournalEntrySummary & { rating?: number; gratitude?: string; tags?: string[] };
}

/**
 * Find journal entries from 1 week, 1 month, and 1 year ago.
 */
export function calcOnThisDay(
  entries: JournalEntrySummary[],
): OnThisDayEntry[] {
  const results: OnThisDayEntry[] = [];
  const byDate = new Map<string, JournalEntrySummary>();
  for (const e of entries) byDate.set(e.date, e);

  const now = new Date();

  const offsets: Array<{ days: number; label: string }> = [
    { days: 7, label: '1 week ago' },
    { days: 14, label: '2 weeks ago' },
    { days: 30, label: '1 month ago' },
    { days: 90, label: '3 months ago' },
    { days: 180, label: '6 months ago' },
    { days: 365, label: '1 year ago' },
  ];

  for (const { days, label } of offsets) {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    const key = d.toLocaleDateString('en-CA');
    const entry = byDate.get(key);
    if (entry) {
      results.push({ label, entry: entry as any });
    }
  }

  return results;
}

// ── Journal Insights: Topic Tracking ───────────────────────────────────────

export interface TopicTrendPoint {
  week: string; // "YYYY-Www"
  weekLabel: string; // "Mar 10"
  topics: Record<string, number>;
}

/**
 * Track topic frequency across weekly buckets for the last N weeks.
 */
export function calcTopicTrends(
  entries: JournalEntrySummary[],
  weeks: number = 8,
): { trends: TopicTrendPoint[]; allTopics: string[] } {
  const now = new Date();
  const buckets: TopicTrendPoint[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - w * 7 - weekStart.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const startStr = weekStart.toLocaleDateString('en-CA');
    const endStr = weekEnd.toLocaleDateString('en-CA');
    const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const weekEntries = entries.filter((e) => e.date >= startStr && e.date <= endStr);
    const topics: Record<string, number> = {};
    for (const e of weekEntries) {
      const words = e.text.toLowerCase().match(/[a-z]{4,}/g) ?? [];
      for (const wd of words) {
        if (!STOPWORDS.has(wd)) {
          topics[wd] = (topics[wd] ?? 0) + 1;
        }
      }
    }
    buckets.push({ week: startStr, weekLabel, topics });
  }

  // Find top 6 topics across all weeks
  const globalFreq: Record<string, number> = {};
  for (const b of buckets) {
    for (const [topic, count] of Object.entries(b.topics)) {
      globalFreq[topic] = (globalFreq[topic] ?? 0) + count;
    }
  }
  const allTopics = Object.entries(globalFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([t]) => t);

  return { trends: buckets, allTopics };
}

// ── Journal Insights: Goal Correlation ─────────────────────────────────────

export interface GoalCorrelationPoint {
  date: string;
  label: string;
  sentiment: number | null;
  taskCompletionRate: number | null;
  habitCompletionRate: number | null;
}

/**
 * Correlate journal sentiment with task/habit completion over the last N days.
 */
export function calcGoalCorrelation(
  entries: JournalEntrySummary[],
  weekDays: Record<string, { tasks?: Array<{ done: boolean }> }>,
  customHabits: Array<{ logs?: Record<string, boolean>; frequency?: string }>,
  days: number = 14,
): GoalCorrelationPoint[] {
  const entryMap = new Map<string, JournalEntrySummary>();
  for (const e of entries) entryMap.set(e.date, e);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const points: GoalCorrelationPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-CA');
    const dayName = dayNames[d.getDay()];
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Sentiment
    const entry = entryMap.get(dateStr);
    const sentiment = entry ? calcEntrySentiment(entry.text) : null;

    // Task completion for that day of week
    const dayData = weekDays[dayName as keyof typeof weekDays];
    const dayTasks = dayData?.tasks ?? [];
    const taskCompletionRate = dayTasks.length > 0
      ? Math.round((dayTasks.filter((t: any) => t.done).length / dayTasks.length) * 100)
      : null;

    // Habit completion for that date
    const activeHabits = customHabits.filter((h) => !(h as any).archived);
    const habitsForDay = activeHabits.filter(() => true); // simplified - all active habits
    const habitsDone = habitsForDay.filter((h) => h.logs?.[dateStr] === true).length;
    const habitCompletionRate = habitsForDay.length > 0
      ? Math.round((habitsDone / habitsForDay.length) * 100)
      : null;

    points.push({ date: dateStr, label, sentiment, taskCompletionRate, habitCompletionRate });
  }

  return points;
}

// ── Journal Streaks & Milestones ───────────────────────────────────────────

export interface JournalStreakMilestones {
  currentStreak: number;
  longestStreak: number;
  totalEntries: number;
  totalWords: number;
  uniqueMonths: number;
  avgWordsPerEntry: number;
  /** Milestones: [threshold, label, tier] */
  milestones: Array<{ threshold: number; label: string; tier: string; reached: boolean }>;
}

export function calcJournalStreakMilestones(entries: JournalEntrySummary[]): JournalStreakMilestones {
  const currentStreak = calcWritingStreak(entries);
  const totalEntries = entries.length;
  const totalWords = calcLifetimeWordCount(entries);
  const avgWordsPerEntry = totalEntries > 0 ? Math.round(totalWords / totalEntries) : 0;

  // Unique months with entries
  const months = new Set(entries.map((e) => e.date.slice(0, 7)));
  const uniqueMonths = months.size;

  // Longest streak ever
  const datesSet = new Set(entries.map((e) => e.date));
  const allDates = [...datesSet].sort();
  let longest = 0;
  let streak = 0;
  if (allDates.length > 0) {
    const start = new Date(allDates[0] + 'T12:00:00');
    const end = new Date(allDates[allDates.length - 1] + 'T12:00:00');
    const d = new Date(start);
    while (d <= end) {
      if (datesSet.has(d.toLocaleDateString('en-CA'))) {
        streak++;
        longest = Math.max(longest, streak);
      } else {
        streak = 0;
      }
      d.setDate(d.getDate() + 1);
    }
  }

  const milestones = [
    { threshold: 3, label: 'First Spark', tier: 'bronze' },
    { threshold: 7, label: 'One Week', tier: 'bronze' },
    { threshold: 14, label: 'Two Weeks', tier: 'silver' },
    { threshold: 30, label: 'Monthly Master', tier: 'silver' },
    { threshold: 60, label: 'Two Months', tier: 'gold' },
    { threshold: 90, label: 'Quarter Year', tier: 'gold' },
    { threshold: 180, label: 'Half Year', tier: 'platinum' },
    { threshold: 365, label: 'Full Year', tier: 'emerald' },
  ].map((m) => ({ ...m, reached: currentStreak >= m.threshold }));

  return { currentStreak, longestStreak: longest, totalEntries, totalWords, uniqueMonths, avgWordsPerEntry, milestones };
}

/** Shape of mood-vs-sleep correlation data. */
export interface MoodSleepCorrelation {
  /** Average mood when sleep was less than 6 hours, or null if insufficient data */
  shortSleepAvg: number | null;
  /** Average mood when sleep was 6-7.9 hours, or null if insufficient data */
  midSleepAvg: number | null;
  /** Average mood when sleep was 8-9 hours, or null if insufficient data */
  sweetSpotAvg: number | null;
  /** Sleep range with the highest average mood: 'short' | 'mid' | 'sweet' | null */
  bestRange: 'short' | 'mid' | 'sweet' | null;
  /** Total days analyzed */
  totalDays: number;
}

/** Minimal sleep log entry shape used by mood-sleep correlation. */
export interface SleepLogEntry {
  date: string;   // YYYY-MM-DD
  hours: number;  // numeric hours slept
}

/**
 * Correlate mood scores with sleep hours to identify the sleep sweet spot.
 * Groups days into three buckets: short (<6h), mid (6-7.9h), sweet (8-9h).
 * Requires at least 2 data points per bucket to report a bucket average.
 *
 * @param moodLogs   MoodLogMap keyed by YYYY-MM-DD (scores 1-5)
 * @param sleepLogs  Array of SleepLogEntry
 * @returns          MoodSleepCorrelation
 */
export function calcMoodSleepCorrelation(
  moodLogs: MoodLogMap,
  sleepLogs: SleepLogEntry[],
): MoodSleepCorrelation {
  const shortScores: number[] = [];
  const midScores: number[] = [];
  const sweetScores: number[] = [];

  for (const entry of sleepLogs) {
    const log = moodLogs[entry.date];
    if (!log || typeof log.score !== 'number') continue;
    if (entry.hours < 6) {
      shortScores.push(log.score);
    } else if (entry.hours < 8) {
      midScores.push(log.score);
    } else if (entry.hours <= 9) {
      sweetScores.push(log.score);
    }
  }

  function avg(arr: number[]): number | null {
    if (arr.length < 2) return null;
    return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
  }

  const shortSleepAvg = avg(shortScores);
  const midSleepAvg = avg(midScores);
  const sweetSpotAvg = avg(sweetScores);

  const candidates: Array<{ key: 'short' | 'mid' | 'sweet'; val: number }> = [];
  if (shortSleepAvg !== null) candidates.push({ key: 'short', val: shortSleepAvg });
  if (midSleepAvg !== null)   candidates.push({ key: 'mid',   val: midSleepAvg });
  if (sweetSpotAvg !== null)  candidates.push({ key: 'sweet', val: sweetSpotAvg });

  const best = candidates.length > 0
    ? candidates.reduce((a, b) => (b.val > a.val ? b : a))
    : null;

  return {
    shortSleepAvg,
    midSleepAvg,
    sweetSpotAvg,
    bestRange: best?.key ?? null,
    totalDays: shortScores.length + midScores.length + sweetScores.length,
  };
}

// ── Meal logging utilities ───────────────────────────────────────────────────

/**
 * Count the current consecutive meal-logging streak.
 *
 * A day "counts" when `hasEntry(dateStr)` returns true (at least one meal
 * logged for that date). The streak counts backward from today, stopping as
 * soon as a day with no entry is found.
 *
 * @param hasEntry  Predicate that returns true when a given YYYY-MM-DD date
 *                  has at least one meal logged
 * @returns         Streak length in days (0 when today has no entry)
 */
export function calcMealLoggingStreak(
  hasEntry: (dateStr: string) => boolean,
): number {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 366; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
    if (hasEntry(key)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Clamp a value/goal ratio to a 0–1 progress fraction suitable for SVG
 * ring rendering.
 *
 * @param value  Current logged amount
 * @param goal   Target amount (must be > 0; returns 0 if not)
 * @returns      Progress fraction in [0, 1]
 */
export function calcRingProgress(value: number, goal: number): number {
  if (!goal || goal <= 0) return 0;
  return Math.min(1, Math.max(0, value / goal));
}

/**
 * Derive the protein-density quality label for a single meal.
 *
 * Protein density = protein (g) per 100 kcal
 *   >= 8g  → 'excellent'
 *   >= 5g  → 'good'
 *   < 5g   → 'fair'
 *
 * Returns 'fair' for meals with 0 calories (no meaningful ratio).
 *
 * @param calories  Meal calorie count
 * @param proteinG  Grams of protein in the meal
 * @returns         Quality label
 */
export function calcMealQuality(
  calories: number,
  proteinG: number,
): 'excellent' | 'good' | 'fair' {
  if (!calories || calories <= 0) return 'fair';
  const density = (proteinG / calories) * 100;
  if (density >= 8) return 'excellent';
  if (density >= 5) return 'good';
  return 'fair';
}

// ── Net Worth utilities ──────────────────────────────────────────────────────

/** A single saved net-worth snapshot. */
export interface NetWorthSnapshot {
  date: string;
  netWorth: number;
  assets: number;
  liabilities: number;
}

/** A detected net-worth milestone. */
export interface NetWorthMilestone {
  label: string;
  amount: number;
  date: string;
}

/**
 * Detect which standard net-worth milestones have been crossed and which
 * is the next one not yet reached.
 *
 * Standard milestones: $1k, $5k, $10k, $25k, $50k, $100k, $250k, $500k, $1M
 *
 * @param snapshots  Snapshot history (any order)
 * @param current    Current net worth
 */
export function calcNetWorthMilestones(
  snapshots: NetWorthSnapshot[],
  current: number,
): { hit: NetWorthMilestone[]; next: { label: string; amount: number; remaining: number } | null } {
  const levels = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));

  function fmtM(n: number): string {
    if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
    if (n >= 1_000) return '$' + (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + 'k';
    return '$' + n.toLocaleString();
  }

  const hit: NetWorthMilestone[] = [];
  for (const amount of levels) {
    if (current >= amount) {
      const crossing = sorted.find((s) => s.netWorth >= amount);
      hit.push({ label: fmtM(amount), amount, date: crossing?.date ?? '' });
    }
  }

  const nextAmount = levels.find((l) => current < l) ?? null;
  const next = nextAmount !== null
    ? { label: fmtM(nextAmount), amount: nextAmount, remaining: nextAmount - current }
    : null;

  return { hit, next };
}

/**
 * Compute Financial Independence score as a percentage.
 * Formula: (netWorth / annualExpenses / 25) * 100, clamped to [0, 100].
 *
 * @param netWorth        Current net worth
 * @param annualExpenses  Annual spending (must be > 0)
 */
export function calcFIScore(netWorth: number, annualExpenses: number): number {
  if (!annualExpenses || annualExpenses <= 0) return 0;
  return Math.min(100, Math.max(0, (netWorth / annualExpenses / 25) * 100));
}

/**
 * Estimate years to Financial Independence.
 * FI target = annualExpenses × 25. Assumes 7% real annual return.
 *
 * Returns null when already at FI or inputs are invalid.
 *
 * @param netWorth        Current net worth
 * @param annualExpenses  Annual spending
 * @param annualSavings   Annual savings
 * @param annualReturn    Real annual return decimal (default 0.07)
 */
export function calcYearsToFI(
  netWorth: number,
  annualExpenses: number,
  annualSavings: number,
  annualReturn = 0.07,
): number | null {
  if (!annualExpenses || annualExpenses <= 0) return null;
  const target = annualExpenses * 25;
  if (netWorth >= target) return null;
  if (annualSavings <= 0 && annualReturn <= 0) return null;
  const monthlyReturn = annualReturn / 12;
  const monthlySavings = annualSavings / 12;
  let balance = netWorth;
  for (let month = 1; month <= 600; month++) {
    balance = balance * (1 + monthlyReturn) + monthlySavings;
    if (balance >= target) return Math.round((month / 12) * 10) / 10;
  }
  return null;
}

/**
 * Build a smooth SVG cubic-bezier path through a set of [x, y] points.
 *
 * @param points  Array of [x, y] coordinate pairs
 */
export function calcSmoothSVGPath(points: Array<[number, number]>): string {
  if (points.length < 2) return '';
  const first = points[0];
  if (!first) return '';
  let d = 'M ' + first[0] + ' ' + first[1];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (!prev || !curr) continue;
    const cpx = (prev[0] + curr[0]) / 2;
    d += ' C ' + cpx + ' ' + prev[1] + ' ' + cpx + ' ' + curr[1] + ' ' + curr[0] + ' ' + curr[1];
  }
  return d;
}

/**
 * Map net-worth snapshots to normalised SVG [x, y] coordinates.
 *
 * @param snapshots  Ordered snapshot array (ascending by date)
 * @param width      SVG viewport width
 * @param height     SVG viewport height
 * @param padY       Vertical padding (default 16)
 */
export function calcNetWorthSVGPoints(
  snapshots: NetWorthSnapshot[],
  width: number,
  height: number,
  padY = 16,
): Array<[number, number]> {
  if (snapshots.length < 2) return [];
  const values = snapshots.map((s) => s.netWorth);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const usableH = height - padY * 2;
  return snapshots.map((s, i) => {
    const x = (i / (snapshots.length - 1)) * width;
    const y = padY + usableH - ((s.netWorth - minV) / range) * usableH;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as [number, number];
  });
}

// ── Reading List utilities ───────────────────────────────────────────────────

/** Minimal book shape needed by reading analytics utilities. */
export interface BookSummary {
  id: string;
  status: 'reading' | 'done' | 'want';
  genre: string;
  startDate?: string;
  finishDate?: string;
  totalPages?: number;
  currentPage?: number;
  progress?: number;
}

/** One entry in the monthly reading history. */
export interface MonthlyReadingEntry {
  year: number;
  month: number;
  label: string;
  count: number;
  bookIds: string[];
}

/** Genre count result. */
export interface GenreCount {
  genre: string;
  count: number;
  pct: number;
}

/**
 * Group completed books by finish month for the last `months` months.
 *
 * @param books   Full book array
 * @param months  How many months to include (default 12)
 */
export function calcMonthlyReadingHistory(
  books: BookSummary[],
  months = 12,
): MonthlyReadingEntry[] {
  const today = new Date();
  const entries: MonthlyReadingEntry[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const bookIds = books
      .filter((b) => {
        if (b.status !== 'done' || !b.finishDate) return false;
        const fd = new Date(b.finishDate + 'T12:00:00');
        return fd.getFullYear() === year && fd.getMonth() === month;
      })
      .map((b) => b.id);
    entries.push({ year, month, label, count: bookIds.length, bookIds });
  }
  return entries;
}

/**
 * Count completed books per genre, sorted by frequency descending.
 *
 * @param books  Full book array (only 'done' books counted)
 */
export function calcGenreBreakdown(books: BookSummary[]): GenreCount[] {
  const done = books.filter((b) => b.status === 'done');
  const total = done.length;
  const map: Record<string, number> = {};
  done.forEach((b) => { map[b.genre] = (map[b.genre] || 0) + 1; });
  return Object.entries(map)
    .map(([genre, count]) => ({
      genre,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Estimate days remaining to finish the currently-reading book at average pace.
 *
 * @param book  BookSummary with status 'reading'
 */
export function calcDaysToFinish(book: BookSummary): number | null {
  if (book.status !== 'reading') return null;
  const cp = book.currentPage ?? 0;
  const tp = book.totalPages ?? 0;
  const pagesLeft = tp - cp;
  if (tp <= 0 || pagesLeft <= 0 || !book.startDate) return null;
  const start = new Date(book.startDate + 'T12:00:00');
  const today = new Date();
  const daysSinceStart = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86_400_000));
  const pagesPerDay = cp / daysSinceStart;
  if (pagesPerDay <= 0) return null;
  return Math.ceil(pagesLeft / pagesPerDay);
}

/**
 * Determine reading challenge pace relative to the current month.
 *
 * @param booksRead   Books read so far this year
 * @param target      Annual target
 * @param yearMonth   Current 0-indexed month (default: today's month)
 */
export function calcReadingChallengePace(
  booksRead: number,
  target: number,
  yearMonth?: number,
): 'ahead' | 'on-track' | 'behind' {
  if (!target || target <= 0) return 'on-track';
  const month = yearMonth ?? new Date().getMonth();
  const expected = ((month + 1) / 12) * target;
  const delta = booksRead - expected;
  if (delta >= 0.5) return 'ahead';
  if (delta <= -0.5) return 'behind';
  return 'on-track';
}

// ── SVG Progress Ring utilities ──────────────────────────────────────────────

/**
 * Result shape for SVG progress ring rendering.
 */
export interface SvgRingProps {
  circumference: number;
  strokeDashoffset: number;
  viewBox: number;
  center: number;
  radius: number;
}

/**
 * Compute all SVG properties needed to render a circular progress ring.
 * progress 0.0 = empty, 1.0 = full.
 *
 * @param progress  Fraction to fill, clamped [0, 1]
 * @param size      Outer viewBox dimension in px (default 120)
 * @param thickness Stroke width of the ring in px (default 10)
 */
export function calcSvgRingProps(
  progress: number,
  size = 120,
  thickness = 10,
): SvgRingProps {
  const safeProgress = Math.min(1, Math.max(0, progress));
  const center = size / 2;
  const radius = center - thickness / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - safeProgress);
  return { circumference, strokeDashoffset, viewBox: size, center, radius };
}

/**
 * Compute the (x, y) coordinate of a point on a circle at a given angle.
 * Angle 0 = 12-o'clock, clockwise.
 */
export function angleToCoord(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ── Pomodoro / study timer utilities ─────────────────────────────────────────

export const POMODORO_DURATIONS = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
} as const;

export type PomodoroPhase = keyof typeof POMODORO_DURATIONS;

/**
 * Determine the next Pomodoro phase after a completed work session.
 * Every 4th session triggers a long break.
 */
export function nextPomodoroPhase(completedSessions: number): PomodoroPhase {
  if (completedSessions > 0 && completedSessions % 4 === 0) return 'longBreak';
  return 'shortBreak';
}

/**
 * Format seconds into "MM:SS" display string.
 */
export function formatTimerDisplay(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

// ── Study statistics utilities ────────────────────────────────────────────────

export interface StudySessionSummary {
  date: string;
  duration: number;
  cardsReviewed: number;
  correct: number;
}

export function calcStudyTimeForDate(
  sessions: StudySessionSummary[],
  dateStr: string,
): number {
  return sessions
    .filter((s) => s.date === dateStr)
    .reduce((sum, s) => sum + (s.duration ?? 0), 0);
}

export function calcStudyTimeForWeek(
  sessions: StudySessionSummary[],
  dateStr: string,
): number {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - dow);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const start = monday.toLocaleDateString('en-CA');
  const end = sunday.toLocaleDateString('en-CA');
  return sessions
    .filter((s) => s.date >= start && s.date <= end)
    .reduce((sum, s) => sum + (s.duration ?? 0), 0);
}

export function calcOverallRetentionRate(
  sessions: StudySessionSummary[],
): number | null {
  const total = sessions.reduce((s, x) => s + x.cardsReviewed, 0);
  if (total === 0) return null;
  const correct = sessions.reduce((s, x) => s + x.correct, 0);
  return Math.round((correct / total) * 100);
}

export function calc7DayRetentionRate(
  sessions: StudySessionSummary[],
): number | null {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() - 6);
  const cutoffStr = cutoff.toLocaleDateString('en-CA');
  const recent = sessions.filter((s) => s.date >= cutoffStr);
  const total = recent.reduce((s, x) => s + x.cardsReviewed, 0);
  if (total === 0) return null;
  const correct = recent.reduce((s, x) => s + x.correct, 0);
  return Math.round((correct / total) * 100);
}

export function calcBestStudyDay(
  sessions: StudySessionSummary[],
): { dateStr: string; seconds: number } | null {
  if (!sessions.length) return null;
  const totals: Record<string, number> = {};
  for (const s of sessions) {
    totals[s.date] = (totals[s.date] ?? 0) + s.duration;
  }
  let bestDate = '';
  let bestSecs = 0;
  for (const [d, secs] of Object.entries(totals)) {
    if (secs > bestSecs) { bestSecs = secs; bestDate = d; }
  }
  return bestDate ? { dateStr: bestDate, seconds: bestSecs } : null;
}

export function calcStudyConsistency7Days(
  sessions: StudySessionSummary[],
): number {
  const today = new Date();
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ds = d.toLocaleDateString('en-CA');
    if (sessions.some((s) => s.date === ds)) count++;
  }
  return count;
}

// ── Vision Board goal progress utility ───────────────────────────────────────

/**
 * Compute display progress percent for a vision board goal card.
 * Clamped to [0, 100].
 */
export function calcVisionGoalPct(current: number, target: number): number {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}

// ── Sleep Score utilities ────────────────────────────────────────────────────

/**
 * Minimal sleep log entry shape needed by the sleep utilities below.
 */
export interface SleepEntry {
  date: string;   // YYYY-MM-DD
  bedTime: string;  // "HH:MM" 24-hour
  wakeTime: string; // "HH:MM" 24-hour
  quality?: number; // 1-5
}

/**
 * Parse a bed-time / wake-time pair to hours slept, handling midnight crossing.
 *
 * @param bedTime   "HH:MM" 24-hour string
 * @param wakeTime  "HH:MM" 24-hour string
 * @returns         Hours as decimal, 0 if inputs are invalid
 */
export function parseSleepDuration(bedTime: string, wakeTime: string): number {
  if (!bedTime || !wakeTime) return 0;
  const [bh = 0, bm = 0] = bedTime.split(':').map(Number);
  const [wh = 0, wm = 0] = wakeTime.split(':').map(Number);
  let bedMins = bh * 60 + bm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins <= bedMins) wakeMins += 24 * 60;
  return (wakeMins - bedMins) / 60;
}

/**
 * Compute a 0-100 Sleep Score for a given night.
 *
 * **Duration component** (0-80 pts):
 *   - 7-9h: 80 pts
 *   - 6-7h: 60 pts
 *   - >9h:  68 pts
 *   - <6h:  32 pts
 *
 * **Consistency component** (0-20 pts):
 *   Added when a previous bedTime is supplied and the new bedTime is
 *   within ±30 minutes of it.
 *
 * @param durationHrs    Hours slept for this night
 * @param bedTime        Current night bedTime ("HH:MM")
 * @param prevBedTime    Previous night bedTime ("HH:MM"), or null
 * @returns              Integer score 0-100
 */
export function calcSleepScore(
  durationHrs: number,
  bedTime: string,
  prevBedTime: string | null,
): number {
  if (durationHrs <= 0) return 0;

  let durPts: number;
  if (durationHrs >= 7 && durationHrs <= 9) durPts = 80;
  else if (durationHrs >= 6) durPts = 60;
  else if (durationHrs > 9) durPts = 68;
  else durPts = 32;

  let consPts = 0;
  if (prevBedTime && bedTime) {
    const toMins = (t: string) => {
      const [h = 0, m = 0] = t.split(':').map(Number);
      return h * 60 + m;
    };
    let diff = Math.abs(toMins(bedTime) - toMins(prevBedTime));
    // Handle midnight wrap: e.g. 23:30 vs 00:10 = 40 min apart
    if (diff > 720) diff = 1440 - diff;
    if (diff <= 30) consPts = 20;
  }

  return Math.min(100, durPts + consPts);
}

/**
 * Derive a label for a sleep score.
 *
 * @param score  0-100 integer from calcSleepScore
 * @returns      Human-readable label
 */
export function sleepScoreLabel(score: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

/**
 * Calculate the current consecutive sleep-logging streak.
 * A day counts when any SleepEntry with that date exists.
 * Counts backward from today; if today has no entry, counts from yesterday.
 *
 * @param sleepLog  Array of sleep entries
 * @returns         Streak length in days (0 if none)
 */
export function calcSleepLoggingStreak(sleepLog: SleepEntry[]): number {
  if (!sleepLog.length) return 0;
  const dates = new Set(sleepLog.map((e) => e.date));
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');
  // If today not yet logged, start counting from yesterday
  const start = dates.has(todayStr) ? 0 : 1;
  let streak = 0;
  for (let i = start; i < 366; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toLocaleDateString('en-CA');
    if (dates.has(key)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Build the 14-day sleep trend dataset for the SVG line chart.
 * Index 0 = 13 days ago, index 13 = yesterday/today.
 *
 * @param sleepLog  Array of sleep entries
 * @returns         Array of 14 entries with date, label (M/T/W…), and hours (null if unlogged)
 */
export interface SleepTrendPoint {
  date: string;
  label: string; // single-char day M T W T F S S
  hours: number | null;
}

export function calcSleep14DayTrend(sleepLog: SleepEntry[]): SleepTrendPoint[] {
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const logMap: Record<string, SleepEntry> = {};
  for (const e of sleepLog) logMap[e.date] = e;
  const today = new Date();
  const points: SleepTrendPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ds = d.toLocaleDateString('en-CA');
    const entry = logMap[ds];
    const hours = entry ? parseSleepDuration(entry.bedTime, entry.wakeTime) : null;
    points.push({
      date: ds,
      label: dayLabels[d.getDay()] ?? 'S',
      hours: hours && hours > 0 ? Math.round(hours * 10) / 10 : null,
    });
  }
  return points;
}

// ── Body Metrics utilities ───────────────────────────────────────────────────

/**
 * Minimal weight history entry shape.
 */
export interface WeightEntry {
  id?: string;
  date: string;   // YYYY-MM-DD
  weight: number; // lbs
}

/**
 * Compute a 7-day centered moving average over weight entries.
 * Returns a parallel array aligned to the same sorted entries.
 * Entries with fewer than 3 neighbors in the window get null.
 *
 * @param entries  Weight history sorted ascending by date
 * @param window   Window size in days (default 7)
 * @returns        Array of { date, avg } with null when insufficient data
 */
export interface WeightAvgPoint {
  date: string;
  avg: number | null;
}

export function calcWeightMovingAverage(
  entries: WeightEntry[],
  window = 7,
): WeightAvgPoint[] {
  if (!entries.length) return [];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const half = Math.floor(window / 2);
  return sorted.map((entry, idx) => {
    const start = Math.max(0, idx - half);
    const end = Math.min(sorted.length - 1, idx + half);
    const slice = sorted.slice(start, end + 1);
    if (slice.length < 3) return { date: entry.date, avg: null };
    const avg = slice.reduce((s, e) => s + e.weight, 0) / slice.length;
    return { date: entry.date, avg: Math.round(avg * 10) / 10 };
  });
}

/**
 * Monthly average weight table with delta vs the prior month.
 *
 * @param entries  Weight history (any order)
 * @returns        Array ordered oldest-first with month label, average, and delta
 */
export interface WeightMonthRow {
  monthLabel: string; // e.g. "Jan 2024"
  avg: number;
  delta: number | null; // null for first entry
  entryCount: number;
}

export function calcWeightMonthlyAverages(entries: WeightEntry[]): WeightMonthRow[] {
  if (!entries.length) return [];
  const byMonth: Record<string, number[]> = {};
  for (const e of entries) {
    const key = e.date.slice(0, 7); // YYYY-MM
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(e.weight);
  }
  const keys = Object.keys(byMonth).sort();
  return keys.map((key, idx) => {
    const weights = byMonth[key] ?? [];
    const avg = Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10;
    const d = new Date(key + '-01T12:00:00');
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    let delta: number | null = null;
    if (idx > 0) {
      const prevKey = keys[idx - 1];
      const prevWeights = byMonth[prevKey ?? ''] ?? [];
      if (prevWeights.length > 0) {
        const prevAvg = prevWeights.reduce((s: number, w: number) => s + w, 0) / prevWeights.length;
        delta = Math.round((avg - prevAvg) * 10) / 10;
      }
    }
    return { monthLabel, avg, delta, entryCount: weights.length };
  });
}

/**
 * Extract the last N entries for a specific measurement key from a
 * measurements history array, returning simple {date, value} pairs
 * suitable for a mini sparkline.
 *
 * @param measurements  Array of measurement objects keyed by date + arbitrary fields
 * @param key           The measurement field to extract (e.g. "waist")
 * @param limit         Max number of entries to return (default 8)
 * @returns             Array of { date, value } sorted oldest-first
 */
export interface MeasurementPoint {
  date: string;
  value: number;
}

export function calcMeasurementSparkline(
  measurements: Array<Record<string, unknown>>,
  key: string,
  limit = 8,
): MeasurementPoint[] {
  const valid = measurements
    .filter((m) => typeof m[key] === 'number' && (m[key] as number) > 0 && typeof m['date'] === 'string')
    .map((m) => ({ date: m['date'] as string, value: m[key] as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return valid.slice(-limit);
}

// ── Pomodoro session log utilities ────────────────────────────────────────────

export interface PomodoroLogEntry {
  date: string;        // YYYY-MM-DD
  taskId: string | null;
  taskTitle: string;
  phase: string;       // "work" | "shortBreak" | "longBreak"
  completedAt: string; // ISO timestamp
}

/**
 * Count completed work-phase pomodoros for a given date.
 */
export function calcPomodorosForDate(
  log: PomodoroLogEntry[],
  dateStr: string,
): number {
  return log.filter((e) => e.date === dateStr && e.phase === 'work').length;
}

/**
 * Compute daily focus score as a fraction in [0, 1].
 * @param log     Pomodoro log entries
 * @param dateStr YYYY-MM-DD
 * @param goal    Daily pomodoro goal (default 8)
 */
export function calcDailyFocusScore(
  log: PomodoroLogEntry[],
  dateStr: string,
  goal = 8,
): number {
  if (goal <= 0) return 0;
  return Math.min(1, calcPomodorosForDate(log, dateStr) / goal);
}

/**
 * Count completed work-phase pomodoros in the current ISO week.
 */
export function calcPomodorosForWeek(
  log: PomodoroLogEntry[],
  dateStr: string,
): number {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - dow);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const monStr = monday.toLocaleDateString('en-CA');
  const sunStr = sunday.toLocaleDateString('en-CA');
  return log.filter(
    (e) => e.phase === 'work' && e.date >= monStr && e.date <= sunStr,
  ).length;
}

// ── Vision Board category bucket mapping ──────────────────────────────────────

/**
 * The five named vision board category buckets and their canonical
 * lower-cased aliases drawn from CATEGORY_LABELS in VisionBoardTab.jsx.
 */
export const VISION_BUCKETS = [
  { id: 'health',          label: 'Health',          emoji: '\u{1F4AA}', aliases: ['physical', 'health'] },
  { id: 'career',          label: 'Career',           emoji: '\u{1F680}', aliases: ['career', 'intellectual', 'creative'] },
  { id: 'relationships',   label: 'Relationships',    emoji: '\u2764\uFE0F',  aliases: ['social', 'spiritual', 'relationships'] },
  { id: 'financial',       label: 'Financial',        emoji: '\u{1F4B0}', aliases: ['financial', 'finance'] },
  { id: 'personal_growth', label: 'Personal Growth',  emoji: '\u{1F331}', aliases: ['default', 'personal', 'personal_growth'] },
] as const;

export type VisionBucketId = (typeof VISION_BUCKETS)[number]['id'];

/**
 * Map a raw category string from a vision gallery card to the best-matching
 * bucket id.  Falls back to 'personal_growth' for unknown categories.
 */
export function mapCategoryToBucket(category: string): VisionBucketId {
  const lower = (category || '').toLowerCase();
  for (const bucket of VISION_BUCKETS) {
    if ((bucket.aliases as readonly string[]).includes(lower)) return bucket.id;
  }
  return 'personal_growth';
}

/**
 * Pick a deterministic "affirmation of the day" index from an array of
 * affirmation cards, so the same card shows all day but changes each day.
 * Returns -1 if the array is empty.
 */
export function calcAffirmationOfDayIndex(
  count: number,
  dateStr: string,
): number {
  if (count <= 0) return -1;
  // Simple hash: sum of char codes of the date string, mod count
  const hash = dateStr.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return hash % count;
}

// ── Reading Session utilities ─────────────────────────────────────────────────

export interface ReadingSession {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  minutes: number;
  /** Estimated pages covered in this session */
  pages: number;
  bookId?: string;
}

/** Helper: return Monday and Sunday of the ISO week containing `now`. */
function _isoWeekBounds(now: Date): { monday: Date; sunday: Date } {
  const day = now.getDay(); // 0 = Sun, 6 = Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

/**
 * Total pages read in the ISO week containing `refDate` (defaults to today).
 */
export function calcPagesThisWeek(
  sessions: ReadingSession[],
  refDate?: Date,
): number {
  const { monday, sunday } = _isoWeekBounds(refDate ?? new Date());
  return sessions.reduce((sum, s) => {
    const d = new Date(s.date + 'T12:00:00');
    if (d >= monday && d <= sunday) return sum + (s.pages || 0);
    return sum;
  }, 0);
}

/**
 * Total minutes logged in the ISO week containing `refDate` (defaults to today).
 */
export function calcMinutesThisWeek(
  sessions: ReadingSession[],
  refDate?: Date,
): number {
  const { monday, sunday } = _isoWeekBounds(refDate ?? new Date());
  return sessions.reduce((sum, s) => {
    const d = new Date(s.date + 'T12:00:00');
    if (d >= monday && d <= sunday) return sum + (s.minutes || 0);
    return sum;
  }, 0);
}

export interface BookMilestoneBadge {
  count: number;
  label: string;
  emoji: string;
  reached: boolean;
}

/**
 * Returns badge descriptors for 5 / 10 / 25 / 50 books-completed milestones.
 */
export function calcReadingMilestoneBadges(totalDone: number): BookMilestoneBadge[] {
  const THRESHOLDS: Array<{ count: number; label: string; emoji: string }> = [
    { count: 5,  label: 'Bookworm',    emoji: '📖' },
    { count: 10, label: 'Page Turner', emoji: '📚' },
    { count: 25, label: 'Avid Reader', emoji: '🎓' },
    { count: 50, label: 'Bibliophile', emoji: '🏆' },
  ];
  return THRESHOLDS.map((t) => ({ ...t, reached: totalDone >= t.count }));
}

// ── Water intake utilities ─────────────────────────────────────────────────────

/** One entry in the water log array. */
export interface WaterLogEntry {
  /** YYYY-MM-DD date string */
  date: string;
  /** Number of glasses logged on this date */
  glasses: number;
}

/**
 * Calculate the current consecutive water-goal streak.
 * A day counts if `glasses >= goalGlasses`.
 * If today has not yet met the goal, the streak counts backward from yesterday
 * so that a streak in progress is preserved during the day.
 *
 * @param waterLog     Array of WaterLogEntry ordered by date (any order)
 * @param goalGlasses  Daily glass target (default 8)
 * @returns            Consecutive days meeting the goal (integer >= 0)
 */
export function calcWaterStreak(
  waterLog: WaterLogEntry[],
  goalGlasses = 8,
): number {
  if (!waterLog.length) return 0;

  const logMap: Record<string, number> = {};
  for (const entry of waterLog) {
    logMap[entry.date] = entry.glasses;
  }

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');
  const todayMet = (logMap[todayStr] ?? 0) >= goalGlasses;

  const d = new Date(today);
  if (!todayMet) {
    // Check from yesterday so in-progress days don't break the streak
    d.setDate(d.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const key = d.toLocaleDateString('en-CA');
    if ((logMap[key] ?? 0) >= goalGlasses) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ── Meal timing / spacing utilities ───────────────────────────────────────────

/**
 * Result of a meal spacing analysis for a single day.
 */
export interface MealSpacingResult {
  /** Average hours between consecutive meals (null if fewer than 2 timed meals) */
  avgHoursBetween: number | null;
  /** Gaps flagged as too large (> thresholdHours) */
  largeGaps: Array<{
    fromSlot: string;
    toSlot: string;
    hours: number;
  }>;
}

/**
 * Analyse the spacing between logged meals within one day.
 *
 * Only meals with a numeric `timestamp` field (Unix ms) are considered.
 * Meals are sorted chronologically before analysis.
 *
 * @param dayData         Day meal data: each slot may contain meals with optional `timestamp`
 * @param slots           Ordered slot names to scan (default: breakfast/lunch/dinner/snacks)
 * @param thresholdHours  Gap above which a warning is issued (default 5 hours)
 * @returns               MealSpacingResult
 */
export function calcMealSpacing(
  dayData: Record<string, Array<{ timestamp?: number; name?: string }>> | null | undefined,
  slots = ['breakfast', 'lunch', 'dinner', 'snacks'],
  thresholdHours = 5,
): MealSpacingResult {
  if (!dayData) return { avgHoursBetween: null, largeGaps: [] };

  // Collect all timed meals as { ts, slotName }
  const timed: Array<{ ts: number; slot: string }> = [];
  for (const slot of slots) {
    for (const meal of (dayData[slot] ?? [])) {
      if (typeof meal.timestamp === 'number' && meal.timestamp > 0) {
        timed.push({ ts: meal.timestamp, slot });
      }
    }
  }

  // Sort ascending by timestamp
  timed.sort((a, b) => a.ts - b.ts);

  if (timed.length < 2) return { avgHoursBetween: null, largeGaps: [] };

  let totalHours = 0;
  const largeGaps: MealSpacingResult['largeGaps'] = [];

  for (let i = 1; i < timed.length; i++) {
    const curr = timed[i];
    const prev = timed[i - 1];
    if (!curr || !prev) continue;
    const hours = (curr.ts - prev.ts) / 3_600_000;
    totalHours += hours;
    if (hours > thresholdHours) {
      largeGaps.push({
        fromSlot: prev.slot,
        toSlot: curr.slot,
        hours: Math.round(hours * 10) / 10,
      });
    }
  }

  return {
    avgHoursBetween: Math.round((totalHours / (timed.length - 1)) * 10) / 10,
    largeGaps,
  };
}

// ── Calorie budget remaining utilities ────────────────────────────────────────

/**
 * Remaining calorie and macro budget for the day.
 */
export interface BudgetRemaining {
  /** Calories left to eat (negative = over budget) */
  calories: number;
  /** Protein remaining in grams */
  protein: number;
  /** Carbs remaining in grams */
  carbs: number;
  /** Fat remaining in grams */
  fat: number;
  /** Proportion of calorie goal consumed, clamped 0–1 */
  caloriePct: number;
}

/**
 * Compute remaining calorie and macro budget for the current day.
 *
 * @param logged   Today's logged totals { calories, protein, carbs, fat }
 * @param targets  Daily targets         { calories, protein, carbs, fat }
 * @returns        BudgetRemaining
 */
export function calcBudgetRemaining(
  logged: { calories: number; protein: number; carbs: number; fat: number },
  targets: { calories: number; protein: number; carbs: number; fat: number },
): BudgetRemaining {
  const safeTarget = targets.calories > 0 ? targets.calories : 1;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    calories: Math.round(targets.calories - logged.calories),
    protein:  r1(targets.protein  - logged.protein),
    carbs:    r1(targets.carbs    - logged.carbs),
    fat:      r1(targets.fat      - logged.fat),
    caloriePct: Math.min(1, logged.calories / safeTarget),
  };
}
