import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  ID,
  FinanceGoal,
  Transaction,
  BudgetSplits,
  Envelope,
  EnvelopeSnapshot,
  LinkedAccount,
  CreateGoalInput,
  UpdateGoalInput,
  CreateTransactionInput,
  CreateEnvelopeInput,
} from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────

const uid = (): ID => Math.random().toString(36).slice(2, 9);

const MAX_TRANSACTIONS = 1000;

const MILESTONES = [25, 50, 75, 100];

// ── State & Action Interfaces ──────────────────────────────────────────────

interface FinanceState {
  /** Monthly gross income in dollars */
  income: number;
  goals: FinanceGoal[];
  /** Capped at MAX_TRANSACTIONS entries to bound localStorage usage */
  transactions: Transaction[];
  budgetSplits: BudgetSplits;
  envelopes: Envelope[];
  envelopeSnapshots: EnvelopeSnapshot[];
  linkedAccounts: LinkedAccount[];
  /** Auth user id that currently owns this store's data ('' = unclaimed). */
  ownedBy: string;
}

interface FinanceActions {
  setIncome: (income: number) => void;
  setBudgetSplits: (splits: BudgetSplits) => void;

  // Goal CRUD
  addGoal: (input: Partial<CreateGoalInput>) => void;
  updateGoal: (id: ID, updates: UpdateGoalInput) => void;
  deleteGoal: (id: ID) => void;

  /** Add a deposit to an existing goal, incrementing currentAmount */
  addDeposit: (goalId: ID, amount: number, note?: string) => void;

  // Transaction CRUD
  addTransaction: (input: Partial<CreateTransactionInput>) => void;
  addTransactions: (inputs: CreateTransactionInput[]) => void;
  deleteTransaction: (id: ID) => void;

  // Envelope CRUD
  addEnvelope: (input: CreateEnvelopeInput) => void;
  updateEnvelope: (id: ID, updates: Partial<CreateEnvelopeInput>) => void;
  deleteEnvelope: (id: ID) => void;
  recordEnvelopeSnapshot: (snapshot: Omit<EnvelopeSnapshot, 'envelopeId'> & { envelopeId: ID }) => void;

  // Linked Accounts CRUD
  addLinkedAccount: (account: Omit<LinkedAccount, 'id'>) => void;
  updateLinkedAccount: (id: ID, updates: Partial<LinkedAccount>) => void;
  removeLinkedAccount: (id: ID) => void;

  /** Per-user isolation: clear data when switching to a different account. */
  resetForUser: (userId: string) => void;
}

export type FinanceStore = FinanceState & FinanceActions;

// ── Store ──────────────────────────────────────────────────────────────────

/**
 * useFinanceStore
 *
 * Manages income, savings goals, transactions, and envelope budgets.
 * Persisted to localStorage under key `up_finance`.
 * Default budget split is 50/30/20 (needs/wants/savings).
 */
export const useFinanceStore = create<FinanceStore>()(
  persist(
    immer((set) => ({
      income: 0,
      goals: [],
      transactions: [],
      budgetSplits: { needs: 50, wants: 30, savings: 20 },
      envelopes: [],
      envelopeSnapshots: [],
      linkedAccounts: [],
      ownedBy: '',

      setIncome: (income) =>
        set((draft) => {
          draft.income = income;
        }),

      setBudgetSplits: (splits) =>
        set((draft) => {
          draft.budgetSplits = splits;
        }),

      // ── Goals ──────────────────────────────────────────────────────────────

      addGoal: (input) =>
        set((draft) => {
          draft.goals.push({
            id: uid(),
            name: '',
            targetAmount: 0,
            currentAmount: 0,
            category: 'savings',
            deadline: '',
            notes: '',
            deposits: [],
            milestonesReached: [],
            createdAt: Date.now(),
            ...input,
          } satisfies FinanceGoal);
        }),

      updateGoal: (id, updates) =>
        set((draft) => {
          const goal = draft.goals.find((g) => g.id === id);
          if (goal) Object.assign(goal, updates);
        }),

      deleteGoal: (id) =>
        set((draft) => {
          draft.goals = draft.goals.filter((g) => g.id !== id);
        }),

      addDeposit: (goalId, amount, note = '') =>
        set((draft) => {
          const goal = draft.goals.find((g) => g.id === goalId);
          if (goal) {
            const prevPct = goal.targetAmount > 0
              ? Math.round(((goal.currentAmount ?? 0) / goal.targetAmount) * 100)
              : 0;

            goal.currentAmount = (goal.currentAmount ?? 0) + Number(amount);
            goal.deposits.push({
              id: uid(),
              amount: Number(amount),
              note,
              date: Date.now(),
            });

            const newPct = goal.targetAmount > 0
              ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
              : 0;

            if (!goal.milestonesReached) goal.milestonesReached = [];
            for (const m of MILESTONES) {
              if (prevPct < m && newPct >= m && !goal.milestonesReached.includes(m)) {
                goal.milestonesReached.push(m);
              }
            }
          }
        }),

      // ── Transactions ───────────────────────────────────────────────────────

      addTransaction: (input) =>
        set((draft) => {
          draft.transactions.unshift({
            id: uid(),
            amount: 0,
            description: '',
            category: 'other',
            date: Date.now(),
            ...input,
          } satisfies Transaction);
          if (draft.transactions.length > MAX_TRANSACTIONS) {
            draft.transactions = draft.transactions.slice(0, MAX_TRANSACTIONS);
          }
        }),

      addTransactions: (inputs) =>
        set((draft) => {
          const newTxs: Transaction[] = inputs.map((input) => ({
            ...input,
            id: uid(),
          }));
          draft.transactions.unshift(...newTxs);
          if (draft.transactions.length > MAX_TRANSACTIONS) {
            draft.transactions = draft.transactions.slice(0, MAX_TRANSACTIONS);
          }
        }),

      deleteTransaction: (id) =>
        set((draft) => {
          draft.transactions = draft.transactions.filter((t) => t.id !== id);
        }),

      // ── Envelopes ─────────────────────────────────────────────────────────

      addEnvelope: (input) =>
        set((draft) => {
          draft.envelopes.push({
            id: uid(),
            createdAt: Date.now(),
            ...input,
          });
        }),

      updateEnvelope: (id, updates) =>
        set((draft) => {
          const env = draft.envelopes.find((e) => e.id === id);
          if (env) Object.assign(env, updates);
        }),

      deleteEnvelope: (id) =>
        set((draft) => {
          draft.envelopes = draft.envelopes.filter((e) => e.id !== id);
        }),

      recordEnvelopeSnapshot: (snapshot) =>
        set((draft) => {
          const existing = draft.envelopeSnapshots.findIndex(
            (s) => s.envelopeId === snapshot.envelopeId && s.month === snapshot.month,
          );
          if (existing >= 0) {
            draft.envelopeSnapshots[existing] = snapshot;
          } else {
            draft.envelopeSnapshots.push(snapshot);
          }
        }),

      // ── Linked Accounts ──────────────────────────────────────────────────────

      addLinkedAccount: (account) =>
        set((draft) => {
          draft.linkedAccounts.push({ id: uid(), ...account });
        }),

      updateLinkedAccount: (id, updates) =>
        set((draft) => {
          const acct = draft.linkedAccounts.find((a) => a.id === id);
          if (acct) Object.assign(acct, updates);
        }),

      removeLinkedAccount: (id) =>
        set((draft) => {
          draft.linkedAccounts = draft.linkedAccounts.filter((a) => a.id !== id);
        }),

      resetForUser: (userId) =>
        set((draft) => {
          if (draft.ownedBy === userId || userId === 'guest') return;
          if (draft.ownedBy === '') { draft.ownedBy = userId; return; }
          draft.income = 0;
          draft.goals = [];
          draft.transactions = [];
          draft.budgetSplits = { needs: 50, wants: 30, savings: 20 };
          draft.envelopes = [];
          draft.envelopeSnapshots = [];
          draft.linkedAccounts = [];
          draft.ownedBy = userId;
        }),
    })),
    { name: 'up_finance' },
  ),
);
