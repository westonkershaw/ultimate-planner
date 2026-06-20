/**
 * spendingPace.ts
 *
 * Pure functions for calculating spending pace relative to the month.
 */

import type { BudgetSplits, Transaction } from '@/types';

export interface SpendingPace {
  daysElapsed: number;
  daysInMonth: number;
  daysPct: number;
  amountSpent: number;
  monthlyBudget: number;
  spentPct: number;
  projectedTotal: number;
  status: 'under' | 'warning' | 'over';
  statusColor: string;
  dailyAvg: number;
}

/**
 * Calculate spending pace for the current month.
 *
 * @param transactions  All transactions
 * @param income        Monthly gross income
 * @param budgetSplits  Current budget split percentages
 */
export function calcSpendingPace(
  transactions: Transaction[],
  income: number,
  budgetSplits: BudgetSplits,
): SpendingPace {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const daysPct = Math.round((daysElapsed / daysInMonth) * 100);

  // Spendable budget = income minus savings allocation
  const monthlyBudget = income * ((100 - budgetSplits.savings) / 100);

  // Filter to current month expenses only (exclude income/savings categories)
  const thisKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthExpenses = transactions.filter((tx) => {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return key === thisKey && tx.category !== 'income' && tx.category !== 'savings';
  });

  const amountSpent = monthExpenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const spentPct = monthlyBudget > 0 ? Math.round((amountSpent / monthlyBudget) * 100) : 0;

  const dailyAvg = daysElapsed > 0 ? amountSpent / daysElapsed : 0;
  const projectedTotal = Math.round(dailyAvg * daysInMonth);

  let status: SpendingPace['status'];
  let statusColor: string;
  if (projectedTotal <= monthlyBudget) {
    status = 'under';
    statusColor = '#10b981';
  } else if (projectedTotal <= monthlyBudget * 1.1) {
    status = 'warning';
    statusColor = '#f59e0b';
  } else {
    status = 'over';
    statusColor = '#ef4444';
  }

  return {
    daysElapsed,
    daysInMonth,
    daysPct,
    amountSpent,
    monthlyBudget,
    spentPct: Math.min(spentPct, 100),
    projectedTotal,
    status,
    statusColor,
    dailyAvg: Math.round(dailyAvg),
  };
}

/**
 * Generate a human-readable pace message.
 */
export function formatPaceMessage(pace: SpendingPace): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  if (pace.status === 'under') {
    return `On track — projected ${fmt(pace.projectedTotal)} by month end`;
  }
  if (pace.status === 'warning') {
    return `Slightly ahead — projected ${fmt(pace.projectedTotal)} (budget ${fmt(pace.monthlyBudget)})`;
  }
  return `Over pace — projected ${fmt(pace.projectedTotal)} vs ${fmt(pace.monthlyBudget)} budget`;
}
