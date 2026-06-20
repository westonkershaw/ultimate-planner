/**
 * financeEngine.ts
 *
 * Pure functions for all financial calculations in Ultimate Life Planner.
 * Migrated and typed from financeEngine.js. No side effects.
 */

import type {
  BudgetAllocation,
  BudgetSplits,
  CategoryBreakdownItem,
  FinanceGoal,
  MonthlySpendingResult,
  SparklinePathResult,
  SparklinePoint,
  Transaction,
} from '@/types';

// ── Budget Formulas ─────────────────────────────────────────────────────────

/**
 * Calculate dollar allocations from a 50/30/20-style budget split.
 *
 * @param income  Monthly gross income in dollars
 * @param splits  Percentage split (must sum to 100; defaults to 50/30/20)
 * @returns       BudgetAllocation with dollar amounts for each bucket
 */
export function calcBudgetSplit(
  income: number,
  splits: BudgetSplits = { needs: 50, wants: 30, savings: 20 },
): BudgetAllocation {
  if (income < 0) throw new RangeError('Income must be non-negative.');
  return {
    needs: (income * splits.needs) / 100,
    wants: (income * splits.wants) / 100,
    savings: (income * splits.savings) / 100,
  };
}

/**
 * Calculate savings rate as a percentage of income.
 *
 * @param monthlySaved   Amount saved per month
 * @param monthlyIncome  Gross monthly income
 * @returns              Savings rate 0–100 (clamped)
 */
export function calcSavingsRate(monthlySaved: number, monthlyIncome: number): number {
  if (monthlyIncome <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((monthlySaved / monthlyIncome) * 100)));
}

/**
 * Project a future balance using compound interest (monthly compounding).
 *
 * Formula: FV = P(1 + r/n)^(nt) + PMT × [((1 + r/n)^(nt) − 1) / (r/n)]
 * Where n = 12 (monthly compounding).
 *
 * @param principal       Current balance (P)
 * @param annualRateDecimal  Annual interest rate as decimal (e.g. 0.07 for 7%)
 * @param monthlyContribution  Regular monthly contribution (PMT)
 * @param months          Number of months to project
 * @returns               Projected future value
 */
export function calcCompoundGrowth(
  principal: number,
  annualRateDecimal: number,
  monthlyContribution: number,
  months: number,
): number {
  if (months < 0) throw new RangeError('months must be non-negative.');
  if (annualRateDecimal < 0) throw new RangeError('annualRateDecimal must be non-negative.');

  const r = annualRateDecimal / 12; // monthly rate

  if (r === 0) {
    // No interest: simple accumulation
    return principal + monthlyContribution * months;
  }

  const growth = Math.pow(1 + r, months);
  const futureValue = principal * growth + monthlyContribution * ((growth - 1) / r);
  return Math.round(futureValue * 100) / 100;
}

/**
 * Calculate monthly payment for a fixed-rate loan.
 *
 * Formula: M = P × [r(1+r)^n] / [(1+r)^n − 1]
 *
 * @param principal       Loan principal
 * @param annualRateDecimal  Annual rate as decimal (e.g. 0.05 for 5%)
 * @param termMonths      Loan term in months
 * @returns               Monthly payment amount
 */
export function calcLoanPayment(
  principal: number,
  annualRateDecimal: number,
  termMonths: number,
): number {
  if (principal < 0) throw new RangeError('principal must be non-negative.');
  if (termMonths <= 0) throw new RangeError('termMonths must be positive.');
  if (annualRateDecimal < 0) throw new RangeError('annualRateDecimal must be non-negative.');

  const r = annualRateDecimal / 12;

  if (r === 0) {
    return Math.round((principal / termMonths) * 100) / 100;
  }

  const payment = (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
  return Math.round(payment * 100) / 100;
}

/**
 * Calculate how many months until a savings goal is reached
 * given a current balance, monthly contribution, and optional interest rate.
 *
 * @param targetAmount       Goal amount
 * @param currentAmount      Current saved amount
 * @param monthlyContribution  Regular monthly addition
 * @param annualRateDecimal  Annual rate as decimal (default 0 — no interest)
 * @returns                  Months to goal, or Infinity if unreachable
 */
export function calcMonthsToGoal(
  targetAmount: number,
  currentAmount: number,
  monthlyContribution: number,
  annualRateDecimal = 0,
): number {
  if (monthlyContribution <= 0) return Infinity;
  if (currentAmount >= targetAmount) return 0;

  const r = annualRateDecimal / 12;
  if (r === 0) {
    return Math.ceil((targetAmount - currentAmount) / monthlyContribution);
  }

  // Solve for n: target = current*(1+r)^n + PMT*((1+r)^n - 1)/r
  // This has no closed form; iterate month by month (max 600 months = 50 years)
  let balance = currentAmount;
  for (let month = 1; month <= 600; month++) {
    balance = balance * (1 + r) + monthlyContribution;
    if (balance >= targetAmount) return month;
  }
  return Infinity;
}

// ── Transaction Analytics ──────────────────────────────────────────────────

/**
 * Aggregate spending by calendar month.
 *
 * @param transactions  Array of transactions (any date range)
 * @returns             MonthlySpendingResult with per-month totals
 */
export function aggregateMonthlySpending(
  transactions: Transaction[],
): MonthlySpendingResult {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const monthly: Record<string, number> = {};
  transactions.forEach((tx) => {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = (monthly[key] ?? 0) + Math.abs(tx.amount);
  });

  const currentKey = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}`;
  return {
    monthly,
    currentMonth: monthly[currentKey] ?? 0,
    total: Object.values(monthly).reduce((a, b) => a + b, 0),
  };
}

/**
 * Break down spending by transaction category, sorted descending by amount.
 *
 * @param transactions  Array of transactions to analyze
 * @returns             Array of { category, amount } sorted highest first
 */
export function getCategoryBreakdown(
  transactions: Transaction[],
): CategoryBreakdownItem[] {
  const breakdown: Record<string, number> = {};
  transactions.forEach((tx) => {
    const cat = tx.category ?? 'other';
    breakdown[cat] = (breakdown[cat] ?? 0) + Math.abs(tx.amount);
  });
  return Object.entries(breakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({ category, amount }));
}

// ── Goal Utilities ──────────────────────────────────────────────────────────

/**
 * Calculate goal progress as an integer percentage (0–100).
 *
 * @param goal  FinanceGoal to evaluate
 * @returns     Progress percentage clamped to [0, 100]
 */
export function calcGoalProgress(goal: FinanceGoal): number {
  if (!goal.targetAmount || goal.targetAmount === 0) return 0;
  return Math.min(100, Math.round(((goal.currentAmount ?? 0) / goal.targetAmount) * 100));
}

// ── Sparkline / SVG Helpers ────────────────────────────────────────────────

/**
 * Generate per-day spending data for the last N days.
 *
 * @param transactions  All available transactions
 * @param days          Number of days to include (default 30)
 * @returns             Array of SparklinePoint ordered oldest → newest
 */
export function generateSparklineData(
  transactions: Transaction[],
  days = 30,
): SparklinePoint[] {
  const data: SparklinePoint[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const dayTotal = transactions
      .filter((tx) => {
        const txDate = new Date(tx.date);
        const txKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${String(txDate.getDate()).padStart(2, '0')}`;
        return txKey === key;
      })
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    data.push({ date: key, amount: dayTotal, day: i });
  }

  return data;
}

/**
 * Generate a smooth SVG cubic bezier path from sparkline data points.
 *
 * @param data     SparklinePoint array (at least 2 points)
 * @param width    SVG viewport width in pixels
 * @param height   SVG viewport height in pixels
 * @param padding  Inner padding in pixels (default 4)
 * @returns        SparklinePathResult with path string, point coords, and min/max
 */
export function generateSparklinePath(
  data: SparklinePoint[],
  width: number,
  height: number,
  padding = 4,
): SparklinePathResult | null {
  if (!data || data.length < 2) return null;

  const values = data.map((d) => d.amount);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * (width - padding * 2),
    y: height - padding - ((d.amount - min) / range) * (height - padding * 2),
  }));

  let path = `M ${points[0]!.x},${points[0]!.y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const cpX = (prev.x + curr.x) / 2;
    path += ` C ${cpX},${prev.y} ${cpX},${curr.y} ${curr.x},${curr.y}`;
  }

  return { path, points, min, max };
}

// ── Formatting ──────────────────────────────────────────────────────────────

/**
 * Format a number as a USD currency string with no decimal places.
 *
 * @param n  Number to format (undefined/null treated as 0)
 * @returns  Formatted string like "$1,234"
 */
export function formatCurrency(n: number | null | undefined): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

/**
 * Legacy alias for formatCurrency (preserves compatibility with existing JSX).
 * @deprecated Prefer `formatCurrency`.
 */
export const fmt$ = formatCurrency;

// ── Spending Insights ────────────────────────────────────────────────────────

/**
 * Result shape for the Financial Health Score calculation.
 */
export interface HealthScoreResult {
  /** Total score 0–100 */
  score: number;
  /** Letter grade derived from score */
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  /** Color hex string for the score tier */
  color: string;
  /** Component breakdown for debugging / tooltips */
  components: {
    savingsRate: number;
    spendingTrend: number;
    emergencyFund: number;
    goalProgress: number;
  };
}

/**
 * Calculate a 0–100 Financial Health Score from user finance data.
 *
 * Scoring rubric:
 *   Savings rate  : >20% → +30, 10-20% → +20, 5-10% → +10, 0-5% → +5
 *   Spending trend: this month < last month → +25, equal → +15, higher → +5
 *   Emergency fund: any goal with currentAmount > 3× monthly expenses → +25
 *   Goal progress : any goal >50% complete → +20
 *
 * @param income          Monthly gross income in dollars
 * @param transactions    All transactions
 * @param goals           All finance goals
 * @returns               HealthScoreResult
 */
export function calcFinancialHealthScore(
  income: number,
  transactions: Transaction[],
  goals: FinanceGoal[],
): HealthScoreResult {
  let savingsRatePts = 0;
  let spendingTrendPts = 0;
  let emergencyFundPts = 0;
  let goalProgressPts = 0;

  // ── Savings rate ──────────────────────────────────────────────────────────
  const spending = aggregateMonthlySpending(transactions);
  const monthlySaved = Math.max(0, income - spending.currentMonth);
  const savingsRate = calcSavingsRate(monthlySaved, income);
  if (savingsRate > 20) savingsRatePts = 30;
  else if (savingsRate > 10) savingsRatePts = 20;
  else if (savingsRate > 5) savingsRatePts = 10;
  else savingsRatePts = 5;

  // ── Spending trend (this month vs last month) ─────────────────────────────
  const now = new Date();
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastKey = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthSpend = spending.monthly[thisKey] ?? 0;
  const lastMonthSpend = spending.monthly[lastKey] ?? 0;
  if (lastMonthSpend === 0) {
    // No prior data — neutral
    spendingTrendPts = 15;
  } else if (thisMonthSpend < lastMonthSpend) {
    spendingTrendPts = 25;
  } else if (thisMonthSpend === lastMonthSpend) {
    spendingTrendPts = 15;
  } else {
    spendingTrendPts = 5;
  }

  // ── Emergency fund: any goal whose currentAmount > 3× monthly expenses ────
  const monthlyExpenses = spending.currentMonth > 0 ? spending.currentMonth : income * 0.8;
  const threeMonths = monthlyExpenses * 3;
  if (goals.some((g) => (g.currentAmount ?? 0) >= threeMonths && threeMonths > 0)) {
    emergencyFundPts = 25;
  }

  // ── Goal progress: any goal >50% ─────────────────────────────────────────
  if (goals.some((g) => calcGoalProgress(g) > 50)) {
    goalProgressPts = 20;
  }

  const score = Math.min(
    100,
    savingsRatePts + spendingTrendPts + emergencyFundPts + goalProgressPts,
  );

  let grade: HealthScoreResult['grade'];
  let color: string;
  if (score >= 80) { grade = 'A'; color = '#10b981'; }
  else if (score >= 60) { grade = 'B'; color = '#14b8a6'; }
  else if (score >= 40) { grade = 'C'; color = '#f59e0b'; }
  else if (score >= 20) { grade = 'D'; color = '#f97316'; }
  else { grade = 'F'; color = '#ef4444'; }

  return {
    score,
    grade,
    color,
    components: {
      savingsRate: savingsRatePts,
      spendingTrend: spendingTrendPts,
      emergencyFund: emergencyFundPts,
      goalProgress: goalProgressPts,
    },
  };
}

/**
 * Determine which day-of-week has the highest average spend across transactions.
 *
 * @param transactions  All available transactions
 * @returns             Object with dayName ('Sunday'…'Saturday') and avgAmount,
 *                      or null if there are no transactions.
 */
export function calcTopSpendingDay(
  transactions: Transaction[],
): { dayName: string; avgAmount: number } | null {
  if (transactions.length === 0) return null;

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const totals = new Array<number>(7).fill(0);
  const counts = new Array<number>(7).fill(0);

  transactions.forEach((tx) => {
    const dow = new Date(tx.date).getDay();
    totals[dow] = (totals[dow] ?? 0) + Math.abs(tx.amount);
    counts[dow] = (counts[dow] ?? 0) + 1;
  });

  let maxAvg = 0;
  let maxDay = 0;
  for (let d = 0; d < 7; d++) {
    const avg = counts[d]! > 0 ? (totals[d]! / counts[d]!) : 0;
    if (avg > maxAvg) { maxAvg = avg; maxDay = d; }
  }

  return { dayName: DAY_NAMES[maxDay]!, avgAmount: Math.round(maxAvg) };
}

/**
 * Calculate the spending percent change between this month and last month.
 *
 * @param transactions  All available transactions
 * @returns             Object with pct (signed percentage, positive = increase),
 *                      direction ('up' | 'down' | 'flat'), and absolute amounts.
 */
export function calcMonthlySpendingTrend(
  transactions: Transaction[],
): { pct: number; direction: 'up' | 'down' | 'flat'; thisMonth: number; lastMonth: number } {
  const spending = aggregateMonthlySpending(transactions);
  const now = new Date();
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastKey = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`;

  const thisMonth = spending.monthly[thisKey] ?? 0;
  const lastMonth = spending.monthly[lastKey] ?? 0;

  if (lastMonth === 0) return { pct: 0, direction: 'flat', thisMonth, lastMonth };
  const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  const direction = pct < 0 ? 'down' : pct > 0 ? 'up' : 'flat';
  return { pct, direction, thisMonth, lastMonth };
}

/**
 * On-track status for a single finance goal relative to the current calendar month.
 */
export interface GoalOnTrackStatus {
  goalId: string;
  goalName: string;
  isOnTrack: boolean;
  monthlyNeeded: number;
  savedThisMonth: number;
  shortfall: number;
  /** Months remaining until deadline, or null if no deadline set */
  monthsRemaining: number | null;
}

/**
 * Compute on-track status for each goal given what the user has saved
 * this month (via goal deposits made this calendar month).
 *
 * @param goals  All finance goals
 * @returns      Array of GoalOnTrackStatus, one per goal
 */
export function calcGoalsOnTrack(goals: FinanceGoal[]): GoalOnTrackStatus[] {
  const now = new Date();

  return goals.map((goal): GoalOnTrackStatus => {
    const pct = calcGoalProgress(goal);
    const remaining = Math.max(0, (goal.targetAmount ?? 0) - (goal.currentAmount ?? 0));

    // Months remaining until deadline
    let monthsRemaining: number | null = null;
    if (goal.deadline) {
      // Append T12:00:00 so the date string is parsed in local time, not UTC midnight
      // (avoids off-by-one day errors in negative UTC-offset timezones)
      const deadlineStr = goal.deadline.length === 10 ? goal.deadline + 'T12:00:00' : goal.deadline;
      const deadline = new Date(deadlineStr);
      const diffMs = deadline.getTime() - now.getTime();
      monthsRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30.44)));
    }

    const monthlyNeeded =
      monthsRemaining !== null && monthsRemaining > 0
        ? Math.ceil(remaining / monthsRemaining)
        : 0;

    // Sum deposits made this calendar month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const savedThisMonth = (goal.deposits ?? [])
      .filter((d) => d.date >= thisMonthStart)
      .reduce((sum, d) => sum + (d.amount ?? 0), 0);

    const isOnTrack = pct >= 100 || monthlyNeeded === 0 || savedThisMonth >= monthlyNeeded;
    const shortfall = Math.max(0, monthlyNeeded - savedThisMonth);

    return {
      goalId: goal.id,
      goalName: goal.name,
      isOnTrack,
      monthlyNeeded,
      savedThisMonth,
      shortfall,
      monthsRemaining,
    };
  });
}

/**
 * Generate 7-day per-bar spend data for a single category.
 *
 * @param transactions  All available transactions
 * @param category      Category id to filter by
 * @returns             Array of 7 numbers (oldest → today), each = total spend that day
 */
export function calcCategory7DaySparkline(
  transactions: Transaction[],
  category: string,
): number[] {
  const today = new Date();
  const result: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const dayTotal = transactions
      .filter((tx) => {
        if (tx.category !== category) return false;
        const txDate = new Date(tx.date);
        const txKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${String(txDate.getDate()).padStart(2, '0')}`;
        return txKey === key;
      })
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    result.push(dayTotal);
  }

  return result;
}

/**
 * Determine the top spending category for a given month.
 *
 * @param transactions  All available transactions (filtered to current month internally)
 * @returns             Object with category id, label-friendly name, amount, and percent of total,
 *                      or null if there are no transactions this month.
 */
export function calcTopCategory(
  transactions: Transaction[],
): { category: string; amount: number; pctOfTotal: number } | null {
  const now = new Date();
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthTx = transactions.filter((tx) => {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return key === thisKey;
  });

  if (thisMonthTx.length === 0) return null;

  const breakdown = getCategoryBreakdown(thisMonthTx);
  if (breakdown.length === 0) return null;

  const top = breakdown[0]!;
  const total = breakdown.reduce((a, b) => a + b.amount, 0);
  const pctOfTotal = total > 0 ? Math.round((top.amount / total) * 100) : 0;

  return { category: top.category, amount: top.amount, pctOfTotal };
}

// ── Debt Payoff ────────────────────────────────────────────────────────────

/** A single debt entry provided by the user. */
export interface DebtEntry {
  id: string;
  name: string;
  balance: number;
  apr: number;         // Annual percentage rate, e.g. 18.99
  minPayment: number;
}

/** Result for a single debt within a payoff schedule. */
export interface DebtPayoffResult {
  id: string;
  name: string;
  months: number;
  totalInterest: number;
  totalPaid: number;
  /** Remaining balance at each month index (index 0 = start). */
  balanceCurve: number[];
}

/** Full result for one payoff strategy. */
export interface PayoffStrategyResult {
  debts: DebtPayoffResult[];
  totalMonths: number;
  totalInterestPaid: number;
}

/**
 * Simulate debt payoff using a sorted-priority strategy (avalanche or snowball).
 *
 * Avalanche = sort debts highest APR first (minimizes total interest).
 * Snowball  = sort debts lowest balance first (faster psychological wins).
 *
 * Extra payment is distributed to the highest-priority debt each month.
 * When a debt is paid off, its freed minimum payment rolls into the next.
 *
 * @param debts        Array of debts the user entered
 * @param extraPayment Additional monthly dollars beyond all minimums
 * @param strategy     'avalanche' | 'snowball'
 * @returns            PayoffStrategyResult
 */
export function calcDebtPayoff(
  debts: DebtEntry[],
  extraPayment: number,
  strategy: 'avalanche' | 'snowball',
): PayoffStrategyResult {
  if (debts.length === 0) {
    return { debts: [], totalMonths: 0, totalInterestPaid: 0 };
  }

  // Sort priority: avalanche = highest APR first, snowball = lowest balance first
  const sorted = [...debts].sort((a, b) =>
    strategy === 'avalanche' ? b.apr - a.apr : a.balance - b.balance,
  );

  // Working state
  const balances = sorted.map((d) => d.balance);
  const results: DebtPayoffResult[] = sorted.map((d) => ({
    id: d.id,
    name: d.name,
    months: 0,
    totalInterest: 0,
    totalPaid: 0,
    balanceCurve: [d.balance],
  }));

  let month = 0;
  const MAX_MONTHS = 600; // 50-year safety cap

  while (balances.some((b) => b > 0) && month < MAX_MONTHS) {
    month++;

    // Identify priority target (first still-active debt in sorted order)
    const priorityIdx = balances.findIndex((b) => b > 0);

    for (let i = 0; i < sorted.length; i++) {
      if (balances[i]! <= 0) {
        results[i]!.balanceCurve.push(0);
        continue;
      }

      const monthlyRate = sorted[i]!.apr / 100 / 12;
      const interest = balances[i]! * monthlyRate;
      results[i]!.totalInterest += interest;

      // Payment for this debt: minimum + extra only if it is the priority target.
      // Guard: ensure at least $1 toward principal to avoid an infinite loop when
      // both minPayment and extraPayment are 0 (e.g. 0% APR with no payment set).
      const rawPayment = sorted[i]!.minPayment + (i === priorityIdx ? extraPayment : 0);
      const payment = Math.min(
        balances[i]! + interest,
        rawPayment > 0 ? rawPayment : 1,
      );

      results[i]!.totalPaid += payment;
      balances[i] = Math.max(0, balances[i]! + interest - payment);

      if (balances[i] === 0 && results[i]!.months === 0) {
        results[i]!.months = month;
      }

      results[i]!.balanceCurve.push(balances[i]!);
    }
  }

  // Mark any debts still unpaid after cap
  for (let i = 0; i < results.length; i++) {
    if (results[i]!.months === 0 && balances[i]! > 0) {
      results[i]!.months = MAX_MONTHS;
    }
  }

  return {
    debts: results,
    totalMonths: month,
    totalInterestPaid: Math.round(results.reduce((s, d) => s + d.totalInterest, 0) * 100) / 100,
  };
}

// ── Budget Buckets (50/30/20) ──────────────────────────────────────────────

export interface BudgetBucketItem {
  key: 'needs' | 'wants' | 'savings';
  label: string;
  targetPct: number;
  targetAmt: number;
  actualAmt: number;
  /** Actual as percent of income */
  actualPct: number;
  /** Over/under vs target */
  variance: number;
  color: string;
}

/**
 * Compute the 50/30/20 budget bucket breakdown with actuals derived from
 * a category→bucket mapping applied to the current month's transactions.
 *
 * Needs  = housing, transport, utilities, health
 * Wants  = food, entertainment, shopping, other
 * Savings= income - needs - wants (implicit)
 *
 * @param income        Monthly gross income
 * @param transactions  All transactions (function filters to current month)
 * @param splits        Custom target splits (defaults to 50/30/20)
 * @returns             Array of BudgetBucketItem, length 3
 */
export function calcBudgetBuckets(
  income: number,
  transactions: Transaction[],
  splits: { needs: number; wants: number; savings: number } = { needs: 50, wants: 30, savings: 20 },
): BudgetBucketItem[] {
  const NEEDS_CATS = new Set(['housing', 'transport', 'utilities', 'health']);
  const WANTS_CATS = new Set(['food', 'entertainment', 'shopping', 'other']);

  const now = new Date();
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const thisMonth = transactions.filter((tx) => {
    const d = new Date(tx.date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === thisKey;
  });

  let needsAmt = 0;
  let wantsAmt = 0;
  thisMonth.forEach((tx) => {
    const amt = Math.abs(tx.amount);
    if (NEEDS_CATS.has(tx.category)) needsAmt += amt;
    else if (WANTS_CATS.has(tx.category)) wantsAmt += amt;
  });
  const savingsAmt = Math.max(0, income - needsAmt - wantsAmt);

  const make = (
    key: 'needs' | 'wants' | 'savings',
    label: string,
    targetPct: number,
    actualAmt: number,
    color: string,
  ): BudgetBucketItem => {
    const targetAmt = (income * targetPct) / 100;
    const actualPct = income > 0 ? Math.round((actualAmt / income) * 100) : 0;
    return {
      key,
      label,
      targetPct,
      targetAmt,
      actualAmt: Math.round(actualAmt * 100) / 100,
      actualPct,
      variance: Math.round((actualAmt - targetAmt) * 100) / 100,
      color,
    };
  };

  return [
    make('needs',   'Needs',   splits.needs,   needsAmt,   '#6366f1'),
    make('wants',   'Wants',   splits.wants,   wantsAmt,   '#f59e0b'),
    make('savings', 'Savings', splits.savings, savingsAmt, '#10b981'),
  ];
}

// ── Emergency Fund ─────────────────────────────────────────────────────────

export interface EmergencyFundResult {
  targetAmt: number;
  currentAmt: number;
  pct: number;           // 0–100+ (can exceed 100)
  monthlyNeeded: number; // to hit target in 12 months from today
  milestone: 25 | 50 | 75 | 100 | null;
}

/**
 * Calculate emergency fund status.
 *
 * @param monthlyExpenses  Estimated monthly expenses in dollars
 * @param currentSaved     Current emergency fund balance
 * @param monthsCoverage   How many months of expenses to target (3 or 6)
 * @returns                EmergencyFundResult
 */
export function calcEmergencyFund(
  monthlyExpenses: number,
  currentSaved: number,
  monthsCoverage: 3 | 6 = 3,
): EmergencyFundResult {
  const targetAmt = monthlyExpenses * monthsCoverage;
  const pct = targetAmt > 0 ? Math.round((currentSaved / targetAmt) * 100) : 0;
  const gap = Math.max(0, targetAmt - currentSaved);
  const monthlyNeeded = Math.ceil(gap / 12);

  let milestone: EmergencyFundResult['milestone'] = null;
  if (pct >= 100) milestone = 100;
  else if (pct >= 75) milestone = 75;
  else if (pct >= 50) milestone = 50;
  else if (pct >= 25) milestone = 25;

  return {
    targetAmt: Math.round(targetAmt * 100) / 100,
    currentAmt: Math.round(currentSaved * 100) / 100,
    pct,
    monthlyNeeded,
    milestone,
  };
}

// ── Investment Return Simulator ────────────────────────────────────────────

export interface InvestmentYearPoint {
  year: number;
  totalValue: number;
  totalContributed: number;
  totalInterest: number;
}

export interface InvestmentSimResult {
  finalValue: number;
  totalContributed: number;
  totalInterest: number;
  /** One entry per year from year 0 (start) through year N */
  curve: InvestmentYearPoint[];
}

/**
 * Simulate compound investment growth year-by-year.
 * Uses monthly compounding internally; emits one data point per year.
 *
 * @param initialAmount       Starting lump-sum investment
 * @param monthlyContribution Regular monthly contribution
 * @param annualReturnPct     Expected annual return as a percent (e.g. 7)
 * @param years               Investment horizon in years
 * @returns                   InvestmentSimResult
 */
export function calcInvestmentSim(
  initialAmount: number,
  monthlyContribution: number,
  annualReturnPct: number,
  years: number,
): InvestmentSimResult {
  const r = annualReturnPct / 100 / 12;
  const curve: InvestmentYearPoint[] = [];

  // Year 0 — starting point
  curve.push({
    year: 0,
    totalValue: initialAmount,
    totalContributed: initialAmount,
    totalInterest: 0,
  });

  let balance = initialAmount;
  let contributed = initialAmount;

  for (let yr = 1; yr <= years; yr++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + r) + monthlyContribution;
      contributed += monthlyContribution;
    }
    curve.push({
      year: yr,
      totalValue: Math.round(balance * 100) / 100,
      totalContributed: Math.round(contributed * 100) / 100,
      totalInterest: Math.round((balance - contributed) * 100) / 100,
    });
  }

  const last = curve[curve.length - 1]!;
  return {
    finalValue: last.totalValue,
    totalContributed: last.totalContributed,
    totalInterest: last.totalInterest,
    curve,
  };
}

// ── Bill Calendar ──────────────────────────────────────────────────────────

export interface BillEntry {
  id: string;
  name: string;
  amount: number;
  /** Day of month the bill is due (1–31) */
  dueDay: number;
  category: string;
  color: string;
}

export interface BillCalendarDay {
  date: Date;
  dayOfMonth: number;
  isToday: boolean;
  bills: BillEntry[];
}

/**
 * Generate a 30-day calendar strip starting from today, with bills placed
 * on their due-day slot.
 *
 * @param bills  Array of user-defined recurring bills
 * @returns      Array of 30 BillCalendarDay objects
 */
export function calcBillCalendar(bills: BillEntry[]): BillCalendarDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result: BillCalendarDay[] = [];

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dom = d.getDate();

    result.push({
      date: d,
      dayOfMonth: dom,
      isToday: i === 0,
      bills: bills.filter((b) => b.dueDay === dom),
    });
  }

  return result;
}

/**
 * Classify urgency of a bill due in N days from today.
 * red = 0–3 days, yellow = 4–7, green = 8+
 */
export function billUrgencyColor(daysUntilDue: number): string {
  if (daysUntilDue <= 3) return '#ef4444';
  if (daysUntilDue <= 7) return '#f59e0b';
  return '#10b981';
}
