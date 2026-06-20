/**
 * envelopeEngine.ts
 *
 * Pure functions for envelope budgeting calculations.
 */

import type { Envelope, EnvelopeSnapshot, Transaction } from '@/types';

// ── Spending Calculation ────────────────────────────────────��─────────────

/**
 * Calculate total spending for an envelope in a given month.
 * Matches transactions by mapped categories and keyword matching.
 *
 * @param envelope      The envelope to calculate for
 * @param transactions  All transactions
 * @param month         Month string 'YYYY-MM' (defaults to current month)
 */
export function calcEnvelopeSpending(
  envelope: Envelope,
  transactions: Transaction[],
  month?: string,
): number {
  const targetMonth = month ?? getCurrentMonth();
  const catSet = new Set(envelope.mappedCategories);
  const keywords = envelope.keywords.map((k) => k.toLowerCase());

  return transactions
    .filter((tx) => {
      const txMonth = getTransactionMonth(tx);
      if (txMonth !== targetMonth) return false;
      if (tx.category === 'income' || tx.category === 'savings') return false;

      if (catSet.has(tx.category)) return true;

      if (keywords.length > 0) {
        const desc = tx.description.toLowerCase();
        return keywords.some((kw) => desc.includes(kw));
      }

      return false;
    })
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
}

// ── Status ────────────────────────────────────────────────────────────────

export interface EnvelopeStatus {
  pct: number;
  status: 'under' | 'warning' | 'over';
  remaining: number;
  color: string;
}

/**
 * Determine the visual status of an envelope given its spending.
 */
export function calcEnvelopeStatus(
  envelope: Envelope,
  spent: number,
): EnvelopeStatus {
  const effective = envelope.budgetAmount;
  if (effective <= 0) {
    return { pct: 0, status: 'under', remaining: 0, color: '#10b981' };
  }

  const pct = Math.round((spent / effective) * 100);
  const remaining = Math.max(0, effective - spent);

  let status: EnvelopeStatus['status'];
  let color: string;
  if (pct >= 100) {
    status = 'over';
    color = '#ef4444';
  } else if (pct >= 75) {
    status = 'warning';
    color = '#f59e0b';
  } else {
    status = 'under';
    color = '#10b981';
  }

  return { pct: Math.min(pct, 100), status, remaining, color };
}

// ── Carryover ─────────────────────────────────────────────────────────────

/**
 * Calculate carryover from previous month if rollover is enabled.
 */
export function calcMonthlyCarryover(
  envelope: Envelope,
  snapshots: EnvelopeSnapshot[],
): number {
  if (!envelope.rollover) return 0;

  const prevMonth = getPreviousMonth();
  const snapshot = snapshots.find(
    (s) => s.envelopeId === envelope.id && s.month === prevMonth,
  );
  if (!snapshot) return 0;

  return Math.max(0, snapshot.budgetAmount + snapshot.carryover - snapshot.spent);
}

// ── Report Helper ─────────────────────────────────────────────────────────

export interface EnvelopeReport {
  id: string;
  name: string;
  budgetAmount: number;
  spent: number;
  pct: number;
  status: 'under' | 'warning' | 'over';
  color: string;
}

/**
 * Generate a summary report for all envelopes.
 */
export function calcAllEnvelopesReport(
  envelopes: Envelope[],
  transactions: Transaction[],
): EnvelopeReport[] {
  return envelopes.map((env) => {
    const spent = calcEnvelopeSpending(env, transactions);
    const { pct, status, color } = calcEnvelopeStatus(env, spent);
    return {
      id: env.id,
      name: env.name,
      budgetAmount: env.budgetAmount,
      spent,
      pct,
      status,
      color,
    };
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getPreviousMonth(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

function getTransactionMonth(tx: Transaction): string {
  const d = new Date(tx.date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
