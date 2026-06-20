import type { ID, Timestamp } from './common.types';

export type TransactionCategory =
  | 'housing'
  | 'food'
  | 'transport'
  | 'utilities'
  | 'entertainment'
  | 'health'
  | 'shopping'
  | 'savings'
  | 'income'
  | 'other';

export interface Transaction {
  id: ID;
  amount: number;
  description: string;
  category: TransactionCategory;
  date: Timestamp;
  source?: 'manual' | 'csv' | 'ofx';
  importedAt?: Timestamp;
}

export interface Deposit {
  id: ID;
  amount: number;
  note: string;
  date: Timestamp;
}

export type GoalCategory = 'savings' | 'debt' | 'investment' | 'purchase' | 'emergency';

export interface FinanceGoal {
  id: ID;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category: GoalCategory;
  deadline: string;
  notes: string;
  deposits: Deposit[];
  milestonesReached?: number[];
  createdAt: Timestamp;
}

export interface BudgetSplits {
  /** Percentage allocated to needs (e.g. 50) */
  needs: number;
  /** Percentage allocated to wants (e.g. 30) */
  wants: number;
  /** Percentage allocated to savings (e.g. 20) */
  savings: number;
}

export interface BudgetAllocation {
  needs: number;
  wants: number;
  savings: number;
}

export interface MonthlySpendingResult {
  monthly: Record<string, number>;
  currentMonth: number;
  total: number;
}

export interface SparklinePoint {
  date: string;
  amount: number;
  /** Days ago (0 = today) */
  day: number;
}

export interface SparklinePathResult {
  path: string;
  points: Array<{ x: number; y: number }>;
  min: number;
  max: number;
}

export interface CategoryBreakdownItem {
  category: TransactionCategory | string;
  amount: number;
}

export interface Envelope {
  id: ID;
  name: string;
  budgetAmount: number;
  mappedCategories: TransactionCategory[];
  keywords: string[];
  color: string;
  rollover: boolean;
  createdAt: Timestamp;
}

export interface EnvelopeSnapshot {
  envelopeId: ID;
  month: string;
  spent: number;
  budgetAmount: number;
  carryover: number;
}

export interface LinkedAccount {
  id: ID;
  bankName: string;
  bankOFXUrl: string;
  bankOrg: string;
  bankFid: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'CREDITCARD';
  accountId: string;
  routingNumber: string;
  lastSynced: Timestamp | null;
  encryptedUsername: string;
  encryptedPassword: string;
}

export type CreateGoalInput = Omit<FinanceGoal, 'id' | 'createdAt' | 'deposits'>;
export type UpdateGoalInput = Partial<Omit<FinanceGoal, 'id'>>;
export type CreateTransactionInput = Omit<Transaction, 'id'>;
export type CreateEnvelopeInput = Omit<Envelope, 'id' | 'createdAt'>;
