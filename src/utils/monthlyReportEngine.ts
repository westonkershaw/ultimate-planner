/**
 * monthlyReportEngine.ts
 *
 * Pure functions for generating monthly spending reports.
 */

import type { Envelope, Transaction } from '@/types';
import {
  aggregateMonthlySpending,
  calcSavingsRate,
  getCategoryBreakdown,
  formatCurrency,
} from './financeEngine';
import { calcAllEnvelopesReport } from './envelopeEngine';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReportInsight {
  type: 'biggest_expense' | 'frequent_merchant' | 'trend';
  label: string;
  value: string;
}

export interface MonthlyReport {
  month: string;
  monthLabel: string;
  totalIncome: number;
  totalSpent: number;
  totalSaved: number;
  savingsRate: number;
  topCategories: { category: string; amount: number; pct: number }[];
  vsLastMonth: {
    spentDelta: number;
    savedDelta: number;
    direction: 'up' | 'down' | 'flat';
  };
  envelopeAdherence: number;
  insights: ReportInsight[];
  transactionCount: number;
}

// ── Report Generation ─────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Generate a monthly spending report.
 * Returns null if fewer than 5 transactions exist for the month.
 */
export function generateMonthlyReport(
  income: number,
  transactions: Transaction[],
  envelopes: Envelope[],
  month?: string,
): MonthlyReport | null {
  const now = new Date();
  const targetMonth = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearStr, monthStr] = targetMonth.split('-');
  const monthIdx = parseInt(monthStr!, 10) - 1;
  const monthLabel = `${MONTH_NAMES[monthIdx]} ${yearStr}`;

  // Filter transactions to target month
  const monthTxs = transactions.filter((tx) => {
    const d = new Date(tx.date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === targetMonth;
  });

  if (monthTxs.length < 5) return null;

  // Income vs expenses
  const incomeTxs = monthTxs.filter((t) => t.category === 'income');
  const expenseTxs = monthTxs.filter((t) => t.category !== 'income' && t.category !== 'savings');

  const totalIncome = income > 0 ? income : incomeTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalSpent = expenseTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalSaved = Math.max(0, totalIncome - totalSpent);
  const savingsRate = calcSavingsRate(totalSaved, totalIncome);

  // Top categories
  const breakdown = getCategoryBreakdown(expenseTxs);
  const total = breakdown.reduce((s, b) => s + b.amount, 0);
  const topCategories = breakdown.slice(0, 3).map((b) => ({
    category: b.category,
    amount: b.amount,
    pct: total > 0 ? Math.round((b.amount / total) * 100) : 0,
  }));

  // Compare to previous month
  const prevDate = new Date(parseInt(yearStr!, 10), monthIdx - 1, 1);
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const spending = aggregateMonthlySpending(transactions);
  const lastMonthSpend = spending.monthly[prevKey] ?? 0;
  const lastMonthSaved = Math.max(0, totalIncome - lastMonthSpend);
  const spentDelta = lastMonthSpend > 0
    ? Math.round(((totalSpent - lastMonthSpend) / lastMonthSpend) * 100)
    : 0;
  const savedDelta = lastMonthSaved > 0
    ? Math.round(((totalSaved - lastMonthSaved) / lastMonthSaved) * 100)
    : 0;
  const direction: 'up' | 'down' | 'flat' = spentDelta > 0 ? 'up' : spentDelta < 0 ? 'down' : 'flat';

  // Envelope adherence
  let envelopeAdherence = 100;
  if (envelopes.length > 0) {
    const envReport = calcAllEnvelopesReport(envelopes, transactions);
    const onTrack = envReport.filter((r) => r.status !== 'over').length;
    envelopeAdherence = Math.round((onTrack / envelopes.length) * 100);
  }

  // Insights
  const insights: ReportInsight[] = [];

  // Biggest single expense
  if (expenseTxs.length > 0) {
    const biggest = expenseTxs.reduce((max, tx) =>
      Math.abs(tx.amount) > Math.abs(max.amount) ? tx : max,
    );
    insights.push({
      type: 'biggest_expense',
      label: 'Biggest expense',
      value: `${biggest.description} — ${formatCurrency(Math.abs(biggest.amount))}`,
    });
  }

  // Most frequent merchant
  const merchantCounts: Record<string, number> = {};
  expenseTxs.forEach((tx) => {
    const key = tx.description.toLowerCase().trim();
    merchantCounts[key] = (merchantCounts[key] ?? 0) + 1;
  });
  const topMerchant = Object.entries(merchantCounts).sort(([, a], [, b]) => b - a)[0];
  if (topMerchant && topMerchant[1] > 1) {
    insights.push({
      type: 'frequent_merchant',
      label: 'Most frequent',
      value: `${topMerchant[0]} (${topMerchant[1]} transactions)`,
    });
  }

  // Spending trend
  if (lastMonthSpend > 0) {
    const pctStr = Math.abs(spentDelta);
    insights.push({
      type: 'trend',
      label: 'vs. last month',
      value: direction === 'down'
        ? `Spending down ${pctStr}%`
        : direction === 'up'
          ? `Spending up ${pctStr}%`
          : 'Spending flat',
    });
  }

  return {
    month: targetMonth,
    monthLabel,
    totalIncome,
    totalSpent,
    totalSaved,
    savingsRate,
    topCategories,
    vsLastMonth: { spentDelta, savedDelta, direction },
    envelopeAdherence,
    insights,
    transactionCount: monthTxs.length,
  };
}

/**
 * Format a report as markdown text for clipboard sharing.
 */
export function formatReportForClipboard(report: MonthlyReport): string {
  const lines: string[] = [
    `## ${report.monthLabel} Financial Report`,
    '',
    `**Income:** ${formatCurrency(report.totalIncome)}`,
    `**Spent:** ${formatCurrency(report.totalSpent)}`,
    `**Saved:** ${formatCurrency(report.totalSaved)} (${report.savingsRate}% savings rate)`,
    '',
    '### Top Categories',
  ];

  report.topCategories.forEach((c) => {
    lines.push(`- ${c.category}: ${formatCurrency(c.amount)} (${c.pct}%)`);
  });

  if (report.insights.length > 0) {
    lines.push('', '### Insights');
    report.insights.forEach((i) => {
      lines.push(`- ${i.label}: ${i.value}`);
    });
  }

  lines.push('', `_${report.transactionCount} transactions analyzed_`);
  return lines.join('\n');
}
