/**
 * financeEngine.test.ts
 *
 * Tests for all functions exported from financeEngine.ts.
 * Covers budget splits, savings rate, compound growth, loan payments,
 * months-to-goal, transaction analytics, sparkline generation, and formatting.
 */

import { describe, it, expect } from 'vitest';
import {
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
} from './financeEngine';
import type { FinanceGoal, Transaction } from '@/types';

// ── calcBudgetSplit ────────────────────────────────────────────────────────

describe('calcBudgetSplit', () => {
  it('default 50/30/20 split on $5000', () => {
    const result = calcBudgetSplit(5000);
    expect(result.needs).toBe(2500);
    expect(result.wants).toBe(1500);
    expect(result.savings).toBe(1000);
  });

  it('custom split percentages', () => {
    const result = calcBudgetSplit(4000, { needs: 60, wants: 20, savings: 20 });
    expect(result.needs).toBe(2400);
    expect(result.wants).toBe(800);
    expect(result.savings).toBe(800);
  });

  it('zero income → all zeros', () => {
    const result = calcBudgetSplit(0);
    expect(result.needs).toBe(0);
    expect(result.wants).toBe(0);
    expect(result.savings).toBe(0);
  });

  it('throws on negative income', () => {
    expect(() => calcBudgetSplit(-100)).toThrow(RangeError);
  });
});

// ── calcSavingsRate ────────────────────────────────────────────────────────

describe('calcSavingsRate', () => {
  it('1000 saved / 5000 income → 20%', () => {
    expect(calcSavingsRate(1000, 5000)).toBe(20);
  });

  it('0 income → 0%', () => {
    expect(calcSavingsRate(500, 0)).toBe(0);
  });

  it('saves more than income → capped at 100%', () => {
    expect(calcSavingsRate(6000, 5000)).toBe(100);
  });

  it('negative saved → clamped to 0%', () => {
    expect(calcSavingsRate(-100, 5000)).toBe(0);
  });

  it('half income saved → 50%', () => {
    expect(calcSavingsRate(2500, 5000)).toBe(50);
  });
});

// ── calcCompoundGrowth ─────────────────────────────────────────────────────

describe('calcCompoundGrowth', () => {
  it('0% interest: simple accumulation', () => {
    // 1000 + 100*12 = 2200
    expect(calcCompoundGrowth(1000, 0, 100, 12)).toBe(2200);
  });

  it('6% interest grows faster than 0% interest', () => {
    const withInterest = calcCompoundGrowth(0, 0.06, 500, 12);
    const noInterest = calcCompoundGrowth(0, 0, 500, 12);
    expect(withInterest).toBeGreaterThan(noInterest);
  });

  it('0 months returns principal', () => {
    expect(calcCompoundGrowth(5000, 0.07, 200, 0)).toBe(5000);
  });

  it('throws on negative months', () => {
    expect(() => calcCompoundGrowth(1000, 0.05, 100, -1)).toThrow(RangeError);
  });

  it('throws on negative annual rate', () => {
    expect(() => calcCompoundGrowth(1000, -0.05, 100, 12)).toThrow(RangeError);
  });

  it('non-zero interest: result is rounded to 2 decimal places', () => {
    const result = calcCompoundGrowth(1000, 0.06, 0, 1);
    // 1000 * (1 + 0.005)^1 = 1005
    expect(result).toBe(1005);
  });
});

// ── calcLoanPayment ────────────────────────────────────────────────────────

describe('calcLoanPayment', () => {
  it('0% interest: principal / termMonths', () => {
    // 12000 / 12 = 1000
    expect(calcLoanPayment(12000, 0, 12)).toBe(1000);
  });

  it('5% annual rate 12-month term: payment > principal/term', () => {
    const payment = calcLoanPayment(12000, 0.05, 12);
    expect(payment).toBeGreaterThan(1000);
  });

  it('higher interest rate → higher payment', () => {
    const low = calcLoanPayment(10000, 0.04, 60);
    const high = calcLoanPayment(10000, 0.08, 60);
    expect(high).toBeGreaterThan(low);
  });

  it('throws on negative principal', () => {
    expect(() => calcLoanPayment(-1000, 0.05, 12)).toThrow(RangeError);
  });

  it('throws on non-positive term', () => {
    expect(() => calcLoanPayment(1000, 0.05, 0)).toThrow(RangeError);
  });

  it('throws on negative rate', () => {
    expect(() => calcLoanPayment(1000, -0.05, 12)).toThrow(RangeError);
  });
});

// ── calcMonthsToGoal ───────────────────────────────────────────────────────

describe('calcMonthsToGoal', () => {
  it('already at goal → 0 months', () => {
    expect(calcMonthsToGoal(1000, 1000, 100)).toBe(0);
  });

  it('$0 current, $1000 target, $100/month, 0% → 10 months', () => {
    expect(calcMonthsToGoal(1000, 0, 100)).toBe(10);
  });

  it('no contribution → Infinity', () => {
    expect(calcMonthsToGoal(5000, 0, 0)).toBe(Infinity);
  });

  it('with interest reaches goal faster than without', () => {
    const noInterest = calcMonthsToGoal(10000, 0, 200, 0);
    const withInterest = calcMonthsToGoal(10000, 0, 200, 0.06);
    expect(withInterest).toBeLessThan(noInterest);
  });

  it('current exceeds target → 0 months', () => {
    expect(calcMonthsToGoal(1000, 1500, 100)).toBe(0);
  });

  it('goal unreachable in 600 months with interest → Infinity', () => {
    // $1 billion target, $1/month contribution, tiny interest rate
    // The iterative path caps at 600 months and returns Infinity
    expect(calcMonthsToGoal(1_000_000_000, 0, 1, 0.001)).toBe(Infinity);
  });
});

// ── calcGoalProgress ──────────────────────────────────────────────────────

describe('calcGoalProgress', () => {
  const makeGoal = (currentAmount: number, targetAmount: number): FinanceGoal => ({
    id: 'g1',
    name: 'Test',
    targetAmount,
    currentAmount,
    category: 'savings',
    deadline: '2025-12-31',
    notes: '',
    deposits: [],
    createdAt: new Date('2024-01-01').getTime(),
  });

  it('0 current, 1000 target → 0%', () => {
    expect(calcGoalProgress(makeGoal(0, 1000))).toBe(0);
  });

  it('500 current, 1000 target → 50%', () => {
    expect(calcGoalProgress(makeGoal(500, 1000))).toBe(50);
  });

  it('1000 current, 1000 target → 100%', () => {
    expect(calcGoalProgress(makeGoal(1000, 1000))).toBe(100);
  });

  it('1500 current, 1000 target → capped at 100%', () => {
    expect(calcGoalProgress(makeGoal(1500, 1000))).toBe(100);
  });

  it('0 target → 0%', () => {
    expect(calcGoalProgress(makeGoal(500, 0))).toBe(0);
  });
});

// ── aggregateMonthlySpending ───────────────────────────────────────────────

describe('aggregateMonthlySpending', () => {
  const makeTransaction = (amount: number, date: number): Transaction => ({
    id: `tx-${Math.random()}`,
    amount,
    description: 'Test',
    category: 'food',
    date,
  });

  it('empty transactions → all zeros', () => {
    const result = aggregateMonthlySpending([]);
    expect(result.total).toBe(0);
    expect(result.currentMonth).toBe(0);
    expect(result.monthly).toEqual({});
  });

  it('transactions are grouped by month', () => {
    const txs = [
      makeTransaction(100, new Date('2024-01-15').getTime()),
      makeTransaction(200, new Date('2024-01-20').getTime()),
      makeTransaction(150, new Date('2024-02-10').getTime()),
    ];
    const result = aggregateMonthlySpending(txs);
    expect(result.monthly['2024-01']).toBe(300);
    expect(result.monthly['2024-02']).toBe(150);
  });

  it('total is sum of all transaction amounts', () => {
    const txs = [
      makeTransaction(100, new Date('2024-01-01').getTime()),
      makeTransaction(200, new Date('2024-02-01').getTime()),
    ];
    expect(aggregateMonthlySpending(txs).total).toBe(300);
  });

  it('negative amounts are treated as absolute values', () => {
    const txs = [makeTransaction(-50, new Date('2024-01-01').getTime())];
    expect(aggregateMonthlySpending(txs).total).toBe(50);
  });
});

// ── getCategoryBreakdown ───────────────────────────────────────────────────

describe('getCategoryBreakdown', () => {
  const makeTransaction = (amount: number, category: string): Transaction => ({
    id: `tx-${Math.random()}`,
    amount,
    description: 'Test',
    category: category as Transaction['category'],
    date: new Date('2024-01-01').getTime(),
  });

  it('empty transactions → empty array', () => {
    expect(getCategoryBreakdown([])).toEqual([]);
  });

  it('groups by category and sums amounts', () => {
    const txs = [
      makeTransaction(100, 'food'),
      makeTransaction(50, 'food'),
      makeTransaction(200, 'housing'),
    ];
    const result = getCategoryBreakdown(txs);
    const food = result.find((r) => r.category === 'food');
    const housing = result.find((r) => r.category === 'housing');
    expect(food?.amount).toBe(150);
    expect(housing?.amount).toBe(200);
  });

  it('sorted descending by amount', () => {
    const txs = [
      makeTransaction(100, 'food'),
      makeTransaction(300, 'housing'),
      makeTransaction(50, 'transport'),
    ];
    const result = getCategoryBreakdown(txs);
    expect(result[0]!.category).toBe('housing');
    expect(result[1]!.category).toBe('food');
    expect(result[2]!.category).toBe('transport');
  });

  it('null/undefined category falls back to "other"', () => {
    const tx = { id: 'x', amount: 99, description: 'x', category: undefined as unknown as Transaction['category'], date: new Date('2024-01-01').getTime() };
    const result = getCategoryBreakdown([tx]);
    expect(result[0]!.category).toBe('other');
  });
});

// ── generateSparklineData ─────────────────────────────────────────────────

describe('generateSparklineData', () => {
  it('returns array of length equal to days param', () => {
    const result = generateSparklineData([], 30);
    expect(result).toHaveLength(30);
  });

  it('default days = 30', () => {
    const result = generateSparklineData([]);
    expect(result).toHaveLength(30);
  });

  it('day property counts down from days-1 to 0', () => {
    const result = generateSparklineData([], 5);
    expect(result[0]!.day).toBe(4);
    expect(result[4]!.day).toBe(0);
  });

  it('amount = 0 when no matching transactions', () => {
    const result = generateSparklineData([], 7);
    result.forEach((pt) => expect(pt.amount).toBe(0));
  });

  it('sums transaction amounts for matching dates', () => {
    // Use a full ISO timestamp (with time component) so that new Date() parses
    // in local time, matching the date-key logic in generateSparklineData
    const today = new Date();
    // Build ISO string with local date/time parts to avoid UTC-midnight timezone shift
    const txs: Transaction[] = [
      { id: 't1', amount: 42, description: 'x', category: 'food', date: today.getTime() },
      { id: 't2', amount: 58, description: 'y', category: 'food', date: today.getTime() },
    ];
    const result = generateSparklineData(txs, 7);
    const todayPoint = result.find((p) => p.day === 0);
    expect(todayPoint!.amount).toBe(100);
  });
});

// ── generateSparklinePath ─────────────────────────────────────────────────

describe('generateSparklinePath', () => {
  it('returns null for empty data', () => {
    expect(generateSparklinePath([], 200, 100)).toBeNull();
  });

  it('returns null for single data point', () => {
    const data = [{ date: '2024-01-01', amount: 100, day: 0 }];
    expect(generateSparklinePath(data, 200, 100)).toBeNull();
  });

  it('returns path string for 2+ points', () => {
    const data = [
      { date: '2024-01-01', amount: 50, day: 1 },
      { date: '2024-01-02', amount: 100, day: 0 },
    ];
    const result = generateSparklinePath(data, 200, 100);
    expect(result).not.toBeNull();
    expect(typeof result!.path).toBe('string');
    expect(result!.path.startsWith('M ')).toBe(true);
  });

  it('result contains correct min and max values', () => {
    const data = [
      { date: '2024-01-01', amount: 50, day: 2 },
      { date: '2024-01-02', amount: 200, day: 1 },
      { date: '2024-01-03', amount: 100, day: 0 },
    ];
    const result = generateSparklinePath(data, 200, 100);
    expect(result!.min).toBe(50);
    expect(result!.max).toBe(200);
  });

  it('points array has same length as data', () => {
    const data = [
      { date: '2024-01-01', amount: 50, day: 2 },
      { date: '2024-01-02', amount: 100, day: 1 },
      { date: '2024-01-03', amount: 150, day: 0 },
    ];
    const result = generateSparklinePath(data, 200, 100);
    expect(result!.points).toHaveLength(3);
  });

  it('all data same value: range defaults to 1 (no division by zero)', () => {
    const data = [
      { date: '2024-01-01', amount: 100, day: 1 },
      { date: '2024-01-02', amount: 100, day: 0 },
    ];
    expect(() => generateSparklinePath(data, 200, 100)).not.toThrow();
  });
});

// ── formatCurrency / fmt$ ──────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats integer as USD with no decimals', () => {
    expect(formatCurrency(1234)).toBe('$1,234');
  });

  it('rounds fractional amounts', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235');
  });

  it('formats 0', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('formats null as $0', () => {
    expect(formatCurrency(null)).toBe('$0');
  });

  it('formats undefined as $0', () => {
    expect(formatCurrency(undefined)).toBe('$0');
  });

  it('formats large numbers with commas', () => {
    expect(formatCurrency(1_000_000)).toBe('$1,000,000');
  });
});

describe('fmt$', () => {
  it('is an alias for formatCurrency', () => {
    expect(fmt$(5000)).toBe(formatCurrency(5000));
  });
});
