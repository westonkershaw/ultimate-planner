import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import BudgetProjector from './BudgetProjector.jsx';
import GoalTracker from './GoalTracker.jsx';
import Sparkline from './Sparkline.jsx';
import SpendingPaceWidget from './SpendingPaceWidget';
import MonthlyReportCard from './MonthlyReportCard';
import EnvelopeBudgeting from './EnvelopeBudgeting';
import {
  fmt$,
  aggregateMonthlySpending,
  getCategoryBreakdown,
  calcFinancialHealthScore,
  calcTopSpendingDay,
  calcMonthlySpendingTrend,
  calcGoalsOnTrack,
  calcCategory7DaySparkline,
  calcTopCategory,
  calcBudgetBuckets,
  calcDebtPayoff,
  calcEmergencyFund,
  calcInvestmentSim,
  calcBillCalendar,
  billUrgencyColor,
} from '../../utils/financeEngine';
import { useFinanceStore } from '../../store';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// ── Constants ────────────────────────────────────────────────────────────────

const TX_CATEGORIES = [
  { id: 'housing',       label: 'Housing',       color: '#6366f1', emoji: '🏠', budget: 0.35 },
  { id: 'food',          label: 'Food',          color: '#10b981', emoji: '🍔', budget: 0.15 },
  { id: 'transport',     label: 'Transport',     color: '#f59e0b', emoji: '🚗', budget: 0.10 },
  { id: 'health',        label: 'Health',        color: '#ef4444', emoji: '💊', budget: 0.08 },
  { id: 'entertainment', label: 'Entertainment', color: '#8b5cf6', emoji: '🎬', budget: 0.05 },
  { id: 'shopping',      label: 'Shopping',      color: '#ec4899', emoji: '🛍',  budget: 0.07 },
  { id: 'utilities',     label: 'Utilities',     color: '#3b82f6', emoji: '⚡', budget: 0.05 },
  { id: 'other',         label: 'Other',         color: '#64748b', emoji: '📦', budget: 0.05 },
];

const CATEGORY_EMOJIS = {
  housing: '🏠', food: '🍔', transport: '🚗', health: '💊',
  entertainment: '🎬', shopping: '🛍', utilities: '⚡', other: '📦',
};

const TABS = [
  { id: 'overview',      label: 'Overview',      hint: 'Health score & spending' },
  { id: 'goals',         label: 'Goals',         hint: 'Savings targets' },
  { id: 'transactions',  label: 'Transactions',  hint: 'Log income & expenses' },
  { id: 'planning',      label: 'Planning',       hint: 'Budget, debt & investments' },
  { id: 'calendar',      label: 'Calendar',       hint: 'Upcoming bills' },
];

const BILL_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6',
];

const uid = () => Math.random().toString(36).slice(2, 9);

// ── localStorage helpers ──────────────────────────────────────────────────────

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

// ── Existing sub-components (preserved verbatim) ──────────────────────────────

function HealthScoreGauge({ score, grade, color }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 140, height: 140 }}
      role="img"
      aria-label={`Financial health score ${score} out of 100, grade ${grade}`}
    >
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle
          cx={70} cy={70} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10}
        />
        <motion.circle
          cx={70} cy={70} r={radius}
          fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={prefersReduced ? offset : circumference}
          transform="rotate(-90 70 70)"
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-syne text-4xl font-black leading-none" style={{ color }}>
          {grade}
        </div>
        <div className="text-slate-400 text-sm font-semibold mt-0.5">{score}/100</div>
      </div>
    </div>
  );
}

function MiniBarChart({ values, color, width = 56, height = 24 }) {
  const max = Math.max(...values, 1);
  const barW = (width - 6) / 7;

  return (
    <svg
      width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true" className="flex-shrink-0"
    >
      {values.map((v, i) => {
        const barH = max > 0 ? Math.max(2, (v / max) * (height - 2)) : 2;
        const x = i * (barW + 1);
        const y = height - barH;
        return (
          <rect
            key={i} x={x} y={y}
            width={Math.max(1, barW - 1)} height={barH} rx={1}
            fill={color} fillOpacity={v > 0 ? 0.8 : 0.2}
          />
        );
      })}
    </svg>
  );
}

function InsightCard({ label, value, sub, accent }) {
  return (
    <div
      className="flex-shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 min-w-[160px]"
      style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
        {label}
      </div>
      <div className="font-syne text-xl font-bold text-slate-100 leading-tight">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function OnTrackBadge({ status }) {
  if (!status) return null;
  if (status.isOnTrack) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
        On track
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
      Need {fmt$(status.shortfall)} more
    </span>
  );
}

// 0. Spending Pie Chart (donut by category)
function PieChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-xl border border-white/10 px-3 py-2"
      style={{ background: '#0d1117', fontFamily: 'DM Sans, sans-serif' }}
    >
      <div className="text-xs font-semibold text-slate-200">
        {d.emoji} {d.name}
      </div>
      <div className="text-sm font-bold" style={{ color: d.color }}>
        {fmt$(d.value)}
      </div>
    </div>
  );
}

function SpendingPieChart({ transactions }) {
  const data = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    const totals = {};
    transactions.forEach((tx) => {
      if (tx.amount >= 0) return; // skip income
      const d = new Date(tx.date);
      if (d.getMonth() !== curMonth || d.getFullYear() !== curYear) return;
      const cat = tx.category || 'other';
      totals[cat] = (totals[cat] || 0) + Math.abs(tx.amount);
    });
    return Object.entries(totals)
      .map(([category, amount]) => {
        const info = TX_CATEGORIES.find((c) => c.id === category) || TX_CATEGORIES[TX_CATEGORIES.length - 1];
        return { name: info.label, value: Math.round(amount * 100) / 100, color: info.color, emoji: info.emoji };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: 140, height: 140 }}
      >
        <span className="text-xs text-slate-600">No spending data</span>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: 140, height: 140 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={35}
            outerRadius={55}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<PieChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="font-syne text-sm font-bold text-slate-100">{fmt$(total)}</div>
        <div className="text-[10px] text-slate-500">spent</div>
      </div>
    </div>
  );
}

// ── New sub-components ────────────────────────────────────────────────────────

// 1. Debt Payoff Calculator
function DebtPayoffSection({ income: _income }) {
  const [debts, setDebts] = useState(() => loadLS('up_debts', []));
  const [extra, setExtra] = useState(() => loadLS('up_debt_extra', 0));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', balance: '', apr: '', minPayment: '' });
  const [formErr, setFormErr] = useState('');

  useEffect(() => { saveLS('up_debts', debts); }, [debts]);
  useEffect(() => { saveLS('up_debt_extra', extra); }, [extra]);

  const avalanche = useMemo(
    () => calcDebtPayoff(debts, Number(extra) || 0, 'avalanche'),
    [debts, extra],
  );
  const snowball = useMemo(
    () => calcDebtPayoff(debts, Number(extra) || 0, 'snowball'),
    [debts, extra],
  );

  const betterStrategy = useMemo(() => {
    if (debts.length === 0) return null;
    const interestDiff = snowball.totalInterestPaid - avalanche.totalInterestPaid;
    const monthDiff = snowball.totalMonths - avalanche.totalMonths;
    if (interestDiff <= 0 && monthDiff <= 0) return null;
    return {
      name: 'Avalanche',
      interestSaved: Math.abs(interestDiff),
      monthsSaved: Math.abs(monthDiff),
    };
  }, [avalanche, snowball, debts]);

  const addDebt = useCallback(() => {
    if (!form.name.trim()) { setFormErr('Name required'); return; }
    if (!form.balance || isNaN(Number(form.balance)) || Number(form.balance) <= 0) {
      setFormErr('Valid balance required'); return;
    }
    if (!form.apr || isNaN(Number(form.apr))) { setFormErr('Valid APR required'); return; }
    if (!form.minPayment || isNaN(Number(form.minPayment))) {
      setFormErr('Valid minimum payment required'); return;
    }
    const newDebt = {
      id: uid(),
      name: form.name.trim(),
      balance: Number(form.balance),
      apr: Number(form.apr),
      minPayment: Number(form.minPayment),
    };
    setDebts((prev) => [...prev, newDebt]);
    setForm({ name: '', balance: '', apr: '', minPayment: '' });
    setFormErr('');
    setShowForm(false);
  }, [form]);

  const removeDebt = useCallback((id) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-syne text-base font-bold text-slate-100">Debt Payoff Calculator</div>
          <div className="text-xs text-slate-600">Compare avalanche vs snowball strategy</div>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>+ Add Debt</Button>
      </div>

      {/* Extra payment field */}
      {debts.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 block mb-1">
                Extra Monthly Payment
              </label>
              <input
                type="number"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-white/10 bg-[#0a1120]/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/60"
              />
            </div>
            <div className="text-xs text-slate-600 pt-5 whitespace-nowrap">
              added beyond minimums
            </div>
          </div>
        </Card>
      )}

      {/* Debt list with progress bars */}
      {debts.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-white/10 py-10 text-center text-slate-600 text-sm cursor-pointer hover:border-indigo-500/30 transition-colors"
          onClick={() => setShowForm(true)}
        >
          No debts added yet. Add your first debt to compare payoff strategies.
        </div>
      ) : (
        <Card className="p-4 space-y-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
            Your Debts
          </div>
          {debts.map((debt) => {
            const avDebt = avalanche.debts.find((d) => d.id === debt.id);
            const pctRemaining = debt.balance > 0
              ? Math.min(100, Math.round(((avDebt?.balanceCurve[avDebt.balanceCurve.length - 1] ?? debt.balance) / debt.balance) * 100))
              : 0;
            return (
              <div key={debt.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300 font-medium">{debt.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500">{debt.apr}% APR</span>
                    <span className="text-xs font-semibold text-amber-400">{fmt$(debt.balance)}</span>
                    <button
                      onClick={() => removeDebt(debt.id)}
                      className="text-slate-700 hover:text-red-400 transition-colors text-xs"
                      aria-label={`Remove debt: ${debt.name}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-amber-500"
                    animate={{ width: prefersReduced ? `${pctRemaining}%` : `${pctRemaining}%` }}
                    initial={{ width: '100%' }}
                    transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                  />
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Strategy comparison */}
      {debts.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Avalanche', subtitle: 'Highest APR first', data: avalanche, color: '#6366f1', icon: '⬇' },
            { label: 'Snowball', subtitle: 'Lowest balance first', data: snowball, color: '#10b981', icon: '⬆' },
          ].map(({ label, subtitle, data, color, icon }) => (
            <Card key={label} className="p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-base">{icon}</span>
                <div>
                  <div className="text-sm font-bold text-slate-100">{label}</div>
                  <div className="text-[10px] text-slate-600">{subtitle}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-[10px] text-slate-500">Total Interest</div>
                  <div className="font-syne text-lg font-bold" style={{ color }}>
                    {fmt$(data.totalInterestPaid)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Months to Payoff</div>
                  <div className="text-sm font-semibold text-slate-200">
                    {data.totalMonths} months
                    <span className="text-[10px] text-slate-600 ml-1">
                      ({(data.totalMonths / 12).toFixed(1)} yrs)
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Recommendation banner */}
      {betterStrategy && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3"
        >
          <div className="text-sm font-semibold text-indigo-300">
            {betterStrategy.name} saves you {fmt$(betterStrategy.interestSaved)} and{' '}
            {betterStrategy.monthsSaved} month{betterStrategy.monthsSaved !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-indigo-400/70 mt-0.5">
            Recommended strategy based on your current debts
          </div>
        </motion.div>
      )}

      {/* Add debt modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setFormErr(''); }} title="Add Debt">
        <div className="space-y-3">
          <Input
            label="Debt Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Visa Card"
          />
          <Input
            label="Balance ($)"
            type="number"
            value={form.balance}
            onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))}
            placeholder="5000"
          />
          <Input
            label="APR (%)"
            type="number"
            value={form.apr}
            onChange={(e) => setForm((f) => ({ ...f, apr: e.target.value }))}
            placeholder="18.99"
          />
          <Input
            label="Minimum Payment ($)"
            type="number"
            value={form.minPayment}
            onChange={(e) => setForm((f) => ({ ...f, minPayment: e.target.value }))}
            placeholder="150"
          />
          {formErr && <p className="text-xs text-red-400">{formErr}</p>}
          <div className="flex gap-2 pt-2">
            <Button onClick={addDebt} className="flex-1">Add Debt</Button>
            <Button variant="ghost" onClick={() => { setShowForm(false); setFormErr(''); }}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// 2. Monthly Budget Builder (50/30/20)
function BudgetBuilderSection({ income, transactions }) {
  const [splits, setSplits] = useState(() => loadLS('up_budget_splits', { needs: 50, wants: 30, savings: 20 }));
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(splits);

  useEffect(() => { saveLS('up_budget_splits', splits); }, [splits]);

  const buckets = useMemo(
    () => calcBudgetBuckets(income, transactions, splits),
    [income, transactions, splits],
  );

  const lastMonthBuckets = useMemo(() => {
    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const lastTx = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === lastKey;
    });
    return calcBudgetBuckets(income, lastTx, splits);
  }, [income, transactions, splits]);

  const saveSplits = useCallback(() => {
    const total = (Number(editForm.needs) || 0) + (Number(editForm.wants) || 0) + (Number(editForm.savings) || 0);
    if (total !== 100) return;
    setSplits({ needs: Number(editForm.needs), wants: Number(editForm.wants), savings: Number(editForm.savings) });
    setEditing(false);
  }, [editForm]);

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-syne text-base font-bold text-slate-100">Monthly Budget Builder</div>
          <div className="text-xs text-slate-500">
            50/30/20 rule — <span className="text-indigo-400">50%</span> needs (rent, food) &middot; <span className="text-purple-400">30%</span> wants (dining, fun) &middot; <span className="text-emerald-400">20%</span> savings
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { setEditForm(splits); setEditing(true); }}>
          Adjust Targets
        </Button>
      </div>

      {income === 0 ? (
        <Card className="p-4 text-center text-sm">
          <div className="text-slate-400 font-semibold mb-1">Income not set</div>
          <div className="text-slate-600 text-xs leading-relaxed">
            Go to the <span className="text-indigo-400">Overview tab</span> and enter your monthly take-home income.
            Once set, your 50/30/20 budget buckets will populate here.
          </div>
          <div className="mt-3 text-[10px] text-slate-600">
            The 50/30/20 rule: allocate 50% of income to needs (rent, food), 30% to wants (dining, entertainment), and 20% to savings or debt payoff.
          </div>
        </Card>
      ) : (
        <>
          {/* Bucket bars */}
          <Card className="p-5 space-y-5">
            {buckets.map((bucket) => {
              const last = lastMonthBuckets.find((b) => b.key === bucket.key);
              const lastAmt = last?.actualAmt ?? 0;
              const diff = bucket.actualAmt - lastAmt;
              const over = bucket.variance > 0;
              const fillPct = bucket.targetAmt > 0
                ? Math.min(100, Math.round((bucket.actualAmt / bucket.targetAmt) * 100))
                : 0;

              return (
                <div key={bucket.key}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bucket.color }} />
                      <span className="text-sm font-medium text-slate-200">{bucket.label}</span>
                      <span className="text-[10px] text-slate-600">({bucket.targetPct}% target)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-200">{fmt$(bucket.actualAmt)}</span>
                      <span className="text-[10px] text-slate-500">/ {fmt$(bucket.targetAmt)}</span>
                      {over ? (
                        <span className="text-[10px] font-bold text-red-400 border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                          +{fmt$(bucket.variance)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          {fmt$(Math.abs(bucket.variance))} under
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: over ? '#ef4444' : bucket.color }}
                      animate={{ width: prefersReduced ? `${fillPct}%` : `${fillPct}%` }}
                      initial={{ width: '0%' }}
                      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                    />
                  </div>
                  {/* Month-over-month comparison */}
                  <div className="mt-1 text-[10px] text-slate-600">
                    {diff === 0
                      ? 'Same as last month'
                      : diff > 0
                        ? `+${fmt$(diff)} vs last month`
                        : `${fmt$(diff)} vs last month`}
                  </div>
                </div>
              );
            })}
          </Card>

          {/* Donut visual strip */}
          <Card className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
              Income Allocation
            </div>
            <div className="flex gap-0 h-4 rounded-full overflow-hidden">
              {buckets.map((b) => (
                <motion.div
                  key={b.key}
                  style={{ backgroundColor: b.color }}
                  animate={{ flex: prefersReduced ? b.actualPct : b.actualPct }}
                  initial={{ flex: 0 }}
                  transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                  title={`${b.label}: ${b.actualPct}%`}
                />
              ))}
            </div>
            <div className="flex gap-4 mt-2">
              {buckets.map((b) => (
                <div key={b.key} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                  <span className="text-[10px] text-slate-500">{b.label} {b.actualPct}%</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Edit targets modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Adjust Budget Targets">
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Percentages must total exactly 100%.</p>
          {['needs', 'wants', 'savings'].map((key) => (
            <div key={key}>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 block mb-1 capitalize">
                {key} (%)
              </label>
              <input
                type="number"
                value={editForm[key]}
                onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0a1120]/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/60"
              />
            </div>
          ))}
          {(Number(editForm.needs) + Number(editForm.wants) + Number(editForm.savings)) !== 100 && (
            <p className="text-xs text-red-400">
              Total: {Number(editForm.needs) + Number(editForm.wants) + Number(editForm.savings)}% (must equal 100%)
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={saveSplits} className="flex-1">Save</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// 3. Emergency Fund Tracker
const MILESTONE_LABELS = { 25: '25%', 50: '50%', 75: '75%', 100: '100%' };
const MILESTONE_COLORS = { 25: '#f59e0b', 50: '#6366f1', 75: '#8b5cf6', 100: '#10b981' };

function EmergencyFundSection({ income, transactions }) {
  const [currentSaved, setCurrentSaved] = useState(() => loadLS('up_ef_saved', 0));
  const [monthsCoverage, setMonthsCoverage] = useState(() => loadLS('up_ef_months', 3));
  useEffect(() => { saveLS('up_ef_saved', currentSaved); }, [currentSaved]);
  useEffect(() => { saveLS('up_ef_months', monthsCoverage); }, [monthsCoverage]);

  const spending = useMemo(() => aggregateMonthlySpending(transactions), [transactions]);
  const monthlyExpenses = spending.currentMonth > 0 ? spending.currentMonth : income * 0.8 || 3000;

  const efData = useMemo(
    () => calcEmergencyFund(monthlyExpenses, Number(currentSaved) || 0, monthsCoverage),
    [monthlyExpenses, currentSaved, monthsCoverage],
  );

  const fillPct = Math.min(100, efData.pct);

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="space-y-4">
      <div>
        <div className="font-syne text-base font-bold text-slate-100">Emergency Fund Tracker</div>
        <div className="text-xs text-slate-600">Track your financial safety net</div>
      </div>

      {/* Milestone celebration banner */}
      <AnimatePresence>
        {efData.milestone && (
          <motion.div
            key={efData.milestone}
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-xl border px-4 py-3 text-center"
            style={{
              borderColor: `${MILESTONE_COLORS[efData.milestone]}40`,
              backgroundColor: `${MILESTONE_COLORS[efData.milestone]}12`,
            }}
          >
            <div className="text-lg mb-0.5" aria-hidden="true">
              {efData.milestone === 100 ? '🎉' : '🏆'}
            </div>
            <div
              className="text-sm font-bold"
              style={{ color: MILESTONE_COLORS[efData.milestone] }}
            >
              {MILESTONE_LABELS[efData.milestone]} milestone reached!
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {efData.milestone === 100
                ? 'Your emergency fund is fully funded.'
                : `Keep going — ${100 - efData.milestone}% more to full funding.`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="p-5">
        {/* Coverage selector */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-slate-400">Target coverage:</span>
          {([3, 6]).map((m) => (
            <button
              key={m}
              onClick={() => setMonthsCoverage(m)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                monthsCoverage === m
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-500 border border-white/10 hover:border-white/20'
              }`}
            >
              {m} months
            </button>
          ))}
        </div>

        {/* Progress fill bar */}
        <div className="relative mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Current savings</span>
            <span className="text-sm font-bold text-emerald-400">{fmt$(efData.currentAmt)}</span>
          </div>
          <div className="h-5 rounded-full bg-white/[0.05] overflow-hidden border border-white/[0.07]">
            <motion.div
              className="h-full rounded-full relative overflow-hidden"
              style={{ background: 'linear-gradient(90deg, #10b981, #14b8a6)' }}
              animate={{ width: prefersReduced ? `${fillPct}%` : `${fillPct}%` }}
              initial={{ width: '0%' }}
              transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.1 }}
            >
              {/* Shimmer wave — skipped when prefers-reduced-motion */}
              {!prefersReduced && (
                <motion.div
                  className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-64px', '400px'] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', delay: 1 }}
                />
              )}
            </motion.div>
          </div>
          {/* Milestone tick marks */}
          <div className="relative h-2">
            {[25, 50, 75, 100].map((m) => (
              <div
                key={m}
                className="absolute flex flex-col items-center"
                style={{ left: `${m}%`, transform: 'translateX(-50%)' }}
              >
                <div
                  className="w-px h-1.5 mt-0.5"
                  style={{ backgroundColor: efData.pct >= m ? MILESTONE_COLORS[m] : '#334155' }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-slate-600">$0</span>
            <span className="text-[10px] text-slate-600">{fmt$(efData.targetAmt)} goal</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
            <div className="text-[10px] text-slate-500 mb-1">Progress</div>
            <div className="font-syne text-lg font-bold text-slate-100">{efData.pct}%</div>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
            <div className="text-[10px] text-slate-500 mb-1">Target</div>
            <div className="font-syne text-lg font-bold text-slate-100">{fmt$(efData.targetAmt)}</div>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
            <div className="text-[10px] text-slate-500 mb-1">Monthly Needed</div>
            <div className="font-syne text-lg font-bold text-emerald-400">
              {efData.pct >= 100 ? 'Done!' : fmt$(efData.monthlyNeeded)}
            </div>
          </div>
        </div>

        {efData.pct < 100 && (
          <div className="mt-3 text-[10px] text-slate-600 text-center">
            Save {fmt$(efData.monthlyNeeded)}/mo to reach your goal in 12 months
          </div>
        )}
      </Card>

      {/* Current savings input */}
      <Card className="p-4">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 block mb-2">
          Current Emergency Fund Balance
        </label>
        <input
          type="number"
          value={currentSaved}
          onChange={(e) => setCurrentSaved(e.target.value)}
          placeholder="0"
          className="w-full rounded-xl border border-white/10 bg-[#0a1120]/80 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500/60"
        />
        <div className="text-[10px] text-slate-600 mt-1.5">
          Estimated monthly expenses: {fmt$(monthlyExpenses)} ({monthsCoverage} mo target = {fmt$(efData.targetAmt)})
        </div>
      </Card>
    </div>
  );
}

// 4. Investment Return Simulator
const PRESETS = [
  { label: 'Conservative', rate: 5, color: '#10b981' },
  { label: 'Moderate',     rate: 7, color: '#6366f1' },
  { label: 'Aggressive',   rate: 10, color: '#f59e0b' },
];

const PAD = { top: 8, right: 8, bottom: 24, left: 8 };

function InvestmentSimSection() {
  const [form, setForm] = useState(() =>
    loadLS('up_invest_form', { initial: 10000, monthly: 500, rate: 7, years: 20 }),
  );
  const [activePreset, setActivePreset] = useState(1);

  useEffect(() => { saveLS('up_invest_form', form); }, [form]);

  const result = useMemo(
    () => calcInvestmentSim(
      Number(form.initial) || 0,
      Number(form.monthly) || 0,
      Number(form.rate) || 0,
      Math.min(50, Math.max(1, Number(form.years) || 20)),
    ),
    [form],
  );

  const applyPreset = useCallback((preset, idx) => {
    setForm((f) => ({ ...f, rate: preset.rate }));
    setActivePreset(idx);
  }, []);

  // SVG area chart dimensions
  const W = 560;
  const H = 120;
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const { pathTotal, pathContrib } = useMemo(() => {
    const curve = result.curve;
    if (curve.length < 2) return { pathTotal: '', pathContrib: '' };

    const maxVal = Math.max(...curve.map((p) => p.totalValue), 1);
    const xS = (yr) => PAD.left + (yr / (curve.length - 1)) * chartW;
    const yS = (val) => PAD.top + chartH - (val / maxVal) * chartH;

    // Build smooth bezier paths
    let pathT = `M ${xS(0)},${yS(curve[0].totalValue)}`;
    let pathC = `M ${xS(0)},${yS(curve[0].totalContributed)}`;

    for (let i = 1; i < curve.length; i++) {
      const prev = curve[i - 1];
      const curr = curve[i];
      const cpX = (xS(i - 1) + xS(i)) / 2;
      pathT += ` C ${cpX},${yS(prev.totalValue)} ${cpX},${yS(curr.totalValue)} ${xS(i)},${yS(curr.totalValue)}`;
      pathC += ` C ${cpX},${yS(prev.totalContributed)} ${cpX},${yS(curr.totalContributed)} ${xS(i)},${yS(curr.totalContributed)}`;
    }

    // Close area paths
    const lastX = xS(curve.length - 1);
    const baseY = yS(0);
    const areaT = `${pathT} L ${lastX},${baseY} L ${PAD.left},${baseY} Z`;
    const areaC = `${pathC} L ${lastX},${baseY} L ${PAD.left},${baseY} Z`;

    return { pathTotal: areaT, pathContrib: areaC };
  }, [result.curve, chartW, chartH]);

  const presetColor = PRESETS[activePreset]?.color ?? '#6366f1';

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="space-y-4">
      <div>
        <div className="font-syne text-base font-bold text-slate-100">Investment Return Simulator</div>
        <div className="text-xs text-slate-600">Compound growth projection</div>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p, i)}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              activePreset === i
                ? 'border-opacity-60 text-slate-100'
                : 'border-white/10 text-slate-500 hover:border-white/20'
            }`}
            style={activePreset === i ? { borderColor: `${p.color}60`, backgroundColor: `${p.color}15`, color: p.color } : {}}
          >
            {p.label} ({p.rate}%)
          </button>
        ))}
      </div>

      {/* Inputs */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'initial',  label: 'Initial Amount ($)', placeholder: '10000' },
            { key: 'monthly',  label: 'Monthly Contribution ($)', placeholder: '500' },
            { key: 'rate',     label: 'Annual Return (%)', placeholder: '7' },
            { key: 'years',    label: 'Years', placeholder: '20' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 block mb-1">
                {label}
              </label>
              <input
                type="number"
                value={form[key]}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((f) => ({ ...f, [key]: val }));
                  if (key === 'rate') {
                    const rateNum = Number(val);
                    const idx = PRESETS.findIndex((p) => p.rate === rateNum);
                    setActivePreset(idx >= 0 ? idx : -1);
                  }
                }}
                placeholder={placeholder}
                className="w-full rounded-xl border border-white/10 bg-[#0a1120]/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/60"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Final Value',        value: fmt$(result.finalValue),       color: presetColor },
          { label: 'Total Contributed',  value: fmt$(result.totalContributed), color: '#64748b' },
          { label: 'Interest Earned',    value: fmt$(result.totalInterest),    color: '#10b981' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-3 text-center">
            <div className="text-[10px] text-slate-500 mb-1">{label}</div>
            <div className="font-syne text-base font-bold" style={{ color }}>{value}</div>
          </Card>
        ))}
      </div>

      {/* SVG Area Chart */}
      <Card className="p-4">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Growth Curve
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 120 }}
          role="img"
          aria-label={`Investment growth curve over ${form.years} years reaching ${fmt$(result.finalValue)}`}
        >
          <defs>
            <linearGradient id="investGradTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={presetColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={presetColor} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="investGradContrib" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#64748b" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* Contributed area (below total) */}
          {pathContrib && (
            <path d={pathContrib} fill="url(#investGradContrib)" />
          )}
          {/* Total value area */}
          {pathTotal && (
            <path d={pathTotal} fill="url(#investGradTotal)" />
          )}
          {/* Stroke lines */}
          {pathContrib && (
            <path
              d={pathContrib.split(' L ')[0] + ' L ' + (pathContrib.split(' L ')[1] ?? '')}
              fill="none" stroke="#475569" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.6}
            />
          )}
          {pathTotal && !prefersReduced && (
            <motion.path
              d={pathTotal.split(' L ')[0]}
              fill="none"
              stroke={presetColor}
              strokeWidth={2}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          )}
          {pathTotal && prefersReduced && (
            <path
              d={pathTotal.split(' L ')[0]}
              fill="none" stroke={presetColor} strokeWidth={2}
            />
          )}

          {/* Year labels on x-axis */}
          {result.curve
            .filter((_, i) => i % Math.max(1, Math.floor(result.curve.length / 5)) === 0 || i === result.curve.length - 1)
            .map((pt) => {
              const x = PAD.left + (pt.year / (result.curve.length - 1)) * chartW;
              return (
                <text
                  key={pt.year}
                  x={x} y={H - 4}
                  textAnchor="middle"
                  className="text-[8px]"
                  fill="#475569"
                  fontSize={8}
                >
                  Yr {pt.year}
                </text>
              );
            })}
        </svg>
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: presetColor }} />
            <span className="text-[10px] text-slate-500">Total Value</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded bg-slate-600" style={{ borderTop: '1px dashed #475569' }} />
            <span className="text-[10px] text-slate-500">Contributions</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// 5. Bill Due Calendar
const DEFAULT_BILL_COLORS = BILL_COLORS;

function BillCalendarSection() {
  const [bills, setBills] = useState(() => loadLS('up_bills', []));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', amount: '', dueDay: '', category: 'utilities', color: DEFAULT_BILL_COLORS[0] });
  const [formErr, setFormErr] = useState('');

  useEffect(() => { saveLS('up_bills', bills); }, [bills]);

  const calendarDays = useMemo(() => calcBillCalendar(bills), [bills]);

  const upcomingBills = useMemo(() => {
    const results = [];
    calendarDays.forEach((day, i) => {
      day.bills.forEach((bill) => {
        results.push({ ...bill, daysUntil: i, date: day.date });
      });
    });
    return results.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [calendarDays]);

  const thisWeek = useMemo(() => upcomingBills.filter((b) => b.daysUntil <= 7), [upcomingBills]);

  const addBill = useCallback(() => {
    if (!form.name.trim()) { setFormErr('Name required'); return; }
    if (!form.amount || isNaN(Number(form.amount))) { setFormErr('Valid amount required'); return; }
    const day = Number(form.dueDay);
    if (!day || day < 1 || day > 31) { setFormErr('Due day must be 1–31'); return; }
    setBills((prev) => [
      ...prev,
      {
        id: uid(),
        name: form.name.trim(),
        amount: Number(form.amount),
        dueDay: day,
        category: form.category,
        color: form.color,
      },
    ]);
    setForm({ name: '', amount: '', dueDay: '', category: 'utilities', color: DEFAULT_BILL_COLORS[0] });
    setFormErr('');
    setShowForm(false);
  }, [form]);

  const removeBill = useCallback((id) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-syne text-base font-bold text-slate-100">Bill Due Calendar</div>
          <div className="text-xs text-slate-600">Next 30 days of upcoming bills</div>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>+ Add Bill</Button>
      </div>

      {/* Upcoming this week */}
      {thisWeek.length > 0 && (
        <Card className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Upcoming This Week
          </div>
          <div className="space-y-2">
            {thisWeek.map((bill) => {
              const urgColor = billUrgencyColor(bill.daysUntil);
              return (
                <div key={bill.id + bill.daysUntil} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: urgColor }} />
                    <span className="text-sm text-slate-300">{bill.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-200">{fmt$(bill.amount)}</span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
                      style={{
                        color: urgColor,
                        borderColor: `${urgColor}40`,
                        backgroundColor: `${urgColor}12`,
                      }}
                    >
                      {bill.daysUntil === 0 ? 'Today' : bill.daysUntil === 1 ? 'Tomorrow' : `${bill.daysUntil}d`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 30-day calendar strip */}
      <Card className="p-4">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
          30-Day View
        </div>
        <div
          className="flex gap-1 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none' }}
          role="region"
          aria-label="30-day bill calendar"
        >
          {calendarDays.map((day, i) => {
            return (
              <div
                key={i}
                className={`flex-shrink-0 flex flex-col items-center gap-1 w-8 py-1.5 rounded-lg ${
                  day.isToday ? 'bg-indigo-500/20 border border-indigo-500/40' : ''
                }`}
              >
                <span className={`text-[9px] font-medium ${day.isToday ? 'text-indigo-400' : 'text-slate-600'}`}>
                  {day.date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                </span>
                <span className={`text-[10px] font-semibold ${day.isToday ? 'text-indigo-300' : 'text-slate-400'}`}>
                  {day.dayOfMonth}
                </span>
                {/* Bill dots */}
                <div className="flex flex-col gap-0.5 items-center min-h-[12px]">
                  {day.bills.slice(0, 3).map((bill) => {
                    const urgColor = billUrgencyColor(i);
                    return (
                      <div
                        key={bill.id}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: urgColor }}
                        title={`${bill.name}: ${fmt$(bill.amount)}`}
                      />
                    );
                  })}
                  {day.bills.length > 3 && (
                    <span className="text-[7px] text-slate-600">+{day.bills.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex gap-4 mt-3">
          {[['#ef4444', 'Due within 3 days'], ['#f59e0b', '4–7 days'], ['#10b981', '8+ days']].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
              <span className="text-[10px] text-slate-600">{l}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Bill list */}
      {bills.length > 0 && (
        <Card className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
            All Bills
          </div>
          <div className="space-y-2">
            {bills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bill.color }} />
                  <span className="text-sm text-slate-300">{bill.name}</span>
                  <span className="text-[10px] text-slate-600">due day {bill.dueDay}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-200">{fmt$(bill.amount)}</span>
                  <button
                    onClick={() => removeBill(bill.id)}
                    className="text-slate-700 hover:text-red-400 transition-colors text-xs opacity-0 group-hover:opacity-100"
                    aria-label={`Remove bill: ${bill.name}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-slate-500">Monthly total</span>
            <span className="text-sm font-bold text-slate-200">
              {fmt$(bills.reduce((s, b) => s + b.amount, 0))}
            </span>
          </div>
        </Card>
      )}

      {bills.length === 0 && (
        <div
          className="rounded-xl border border-dashed border-white/10 py-10 text-center text-slate-600 text-sm cursor-pointer hover:border-indigo-500/30 transition-colors"
          onClick={() => setShowForm(true)}
        >
          No bills added yet. Add recurring bills to track due dates.
        </div>
      )}

      {/* Add bill modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setFormErr(''); }} title="Add Bill">
        <div className="space-y-3">
          <Input
            label="Bill Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Internet"
          />
          <Input
            label="Amount ($)"
            type="number"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="80"
          />
          <Input
            label="Due Day of Month (1–31)"
            type="number"
            value={form.dueDay}
            onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))}
            placeholder="15"
          />
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 block mb-1">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {DEFAULT_BILL_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className="w-6 h-6 rounded-full transition-transform"
                  style={{
                    backgroundColor: c,
                    outline: form.color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                    transform: form.color === c ? 'scale(1.25)' : 'scale(1)',
                  }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>
          {formErr && <p className="text-xs text-red-400">{formErr}</p>}
          <div className="flex gap-2 pt-2">
            <Button onClick={addBill} className="flex-1">Add Bill</Button>
            <Button variant="ghost" onClick={() => { setShowForm(false); setFormErr(''); }}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

const FinanceDashboard = React.memo(function FinanceDashboard() {
  const { income, goals, transactions, addTransaction, deleteTransaction, setIncome } = useFinanceStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState({ description: '', amount: '', category: 'other' });
  const [txError, setTxError] = useState('');
  const [incomeInput, setIncomeInput] = useState(() => income > 0 ? String(income) : '');
  const [showIncomeSetup, setShowIncomeSetup] = useState(false);

  // ── Derived data (all via financeEngine utilities) ──────────────────────
  const spending = useMemo(() => aggregateMonthlySpending(transactions), [transactions]);
  const breakdown = useMemo(() => getCategoryBreakdown(transactions.slice(0, 50)), [transactions]);

  const healthScore = useMemo(
    () => calcFinancialHealthScore(income, transactions, goals),
    [income, transactions, goals],
  );

  const topSpendDay = useMemo(() => calcTopSpendingDay(transactions), [transactions]);
  const trend = useMemo(() => calcMonthlySpendingTrend(transactions), [transactions]);
  const topCategory = useMemo(() => calcTopCategory(transactions), [transactions]);
  const goalsOnTrack = useMemo(() => calcGoalsOnTrack(goals), [goals]);

  const category7d = useMemo(() => {
    const result = {};
    TX_CATEGORIES.forEach(({ id }) => {
      result[id] = calcCategory7DaySparkline(transactions, id);
    });
    return result;
  }, [transactions]);

  const budgetCategories = useMemo(() => {
    const BUDGET_CATS = ['housing', 'food', 'entertainment'];
    return BUDGET_CATS.map((id) => {
      const catInfo = TX_CATEGORIES.find((c) => c.id === id);
      const budgetAmt = income * (catInfo?.budget ?? 0);
      const actual = breakdown.find((b) => b.category === id)?.amount ?? 0;
      const pct = budgetAmt > 0 ? Math.min(150, Math.round((actual / budgetAmt) * 100)) : 0;
      const barColor =
        pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
      return { id, label: catInfo?.label ?? id, emoji: catInfo?.emoji ?? '', color: catInfo?.color ?? '#64748b', actual, budgetAmt, pct, barColor };
    });
  }, [income, breakdown]);

  const trendPct = Math.abs(trend.pct);
  const trendUp = trend.direction === 'up';
  const trendColor = trendUp ? '#ef4444' : '#10b981';
  const trendArrow = trendUp ? '↑' : '↓';
  const trendText =
    trend.direction === 'flat'
      ? 'Same as last month'
      : `Spending is ${trendArrow}${trendPct}% vs last month`;

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleAddTx = () => {
    if (!txForm.description.trim()) { setTxError('Description required'); return; }
    if (!txForm.amount || isNaN(Number(txForm.amount))) { setTxError('Valid amount required'); return; }
    addTransaction({
      description: txForm.description.trim(),
      amount: Number(txForm.amount),
      category: txForm.category,
      date: Date.now(),
    });
    setTxForm({ description: '', amount: '', category: 'other' });
    setTxError('');
    setShowTxForm(false);
  };

  const handleSaveIncome = useCallback(() => {
    const val = Number(incomeInput);
    if (!incomeInput || isNaN(val) || val < 0) return;
    setIncome(val);
    setShowIncomeSetup(false);
  }, [incomeInput, setIncome]);

  const isNewUser = income === 0 && transactions.length === 0 && goals.length === 0;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-syne text-2xl font-bold text-slate-100">Finance</h1>
        <p className="text-slate-600 text-sm mt-0.5">
          {isNewUser ? 'Set your income to unlock budgets, goals & spending insights' : 'Budget, goals & spending overview'}
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 border-b border-white/[0.06] overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
        role="tablist"
        aria-label="Finance sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.hint}
            className={`group px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">

          {/* ── New-user setup banner ── */}
          {income === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.07] p-5"
            >
              <div className="font-syne text-base font-bold text-slate-100 mb-1">
                Welcome to Finance — set up in 2 steps
              </div>
              <div className="text-xs text-slate-400 mb-4 leading-relaxed">
                <span className="text-indigo-400 font-semibold">Step 1:</span> Enter your monthly take-home income below.
                {' '}<span className="text-indigo-400 font-semibold">Step 2:</span> Log your first expense in the Transactions tab.
                That's it — budgets, health score, and insights all update automatically.
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1 max-w-xs">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 block mb-1.5">
                    Monthly Take-Home Income ($)
                  </label>
                  <input
                    type="number"
                    value={incomeInput}
                    onChange={(e) => setIncomeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveIncome(); }}
                    placeholder="e.g. 4500"
                    className="w-full rounded-xl border border-indigo-500/40 bg-[#0a1120]/80 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500/70"
                    aria-label="Monthly take-home income"
                  />
                </div>
                <Button onClick={handleSaveIncome} disabled={!incomeInput || isNaN(Number(incomeInput))}>
                  Save Income
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Income update row (shown when income is already set) ── */}
          {income > 0 && (
            <div className="flex items-center justify-between px-1">
              <div className="text-xs text-slate-500">
                Monthly income: <span className="text-slate-300 font-semibold">{fmt$(income)}</span>
              </div>
              {!showIncomeSetup && (
                <button
                  onClick={() => { setIncomeInput(String(income)); setShowIncomeSetup(true); }}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Edit income
                </button>
              )}
              {showIncomeSetup && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={incomeInput}
                    onChange={(e) => setIncomeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveIncome(); }}
                    className="w-32 rounded-xl border border-indigo-500/40 bg-[#0a1120]/80 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-indigo-500/70"
                    aria-label="Update monthly income"
                  />
                  <Button size="sm" onClick={handleSaveIncome}>Save</Button>
                  <button onClick={() => setShowIncomeSetup(false)} className="text-xs text-slate-600 hover:text-slate-400">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Financial Health Score */}
          <Card className="p-5">
            <div className="flex items-center gap-6">
              <HealthScoreGauge
                score={healthScore.score}
                grade={healthScore.grade}
                color={healthScore.color}
              />
              <div className="flex-1 min-w-0">
                <div className="font-syne text-base font-bold text-slate-100 mb-0.5">
                  Your Financial Health
                </div>
                <div className="text-[10px] text-slate-600 mb-3">
                  {isNewUser ? 'Add income & transactions to improve your score' : 'Updated today'}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {[
                    { label: 'Savings Rate', pts: healthScore.components.savingsRate, max: 30 },
                    { label: 'Spending Trend', pts: healthScore.components.spendingTrend, max: 25 },
                    { label: 'Emergency Fund', pts: healthScore.components.emergencyFund, max: 25 },
                    { label: 'Goal Progress', pts: healthScore.components.goalProgress, max: 20 },
                  ].map(({ label, pts, max }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-slate-500">{label}</span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {pts}/{max}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: healthScore.color }}
                          animate={{ width: `${(pts / max) * 100}%` }}
                          transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.4 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Budget Categories Pie Chart */}
          <Card className="p-5">
            <div className="flex items-center gap-6">
              <SpendingPieChart transactions={transactions} />
              <div className="flex-1 min-w-0">
                <div className="font-syne text-base font-bold text-slate-100 mb-0.5">
                  Budget Categories
                </div>
                <div className="text-[10px] text-slate-600 mb-3">
                  This month&apos;s spending breakdown
                </div>
                <div className="space-y-1.5">
                  {(() => {
                    const now = new Date();
                    const curMonth = now.getMonth();
                    const curYear = now.getFullYear();
                    const totals = {};
                    transactions.forEach((tx) => {
                      if (tx.amount >= 0) return;
                      const d = new Date(tx.date);
                      if (d.getMonth() !== curMonth || d.getFullYear() !== curYear) return;
                      const cat = tx.category || 'other';
                      totals[cat] = (totals[cat] || 0) + Math.abs(tx.amount);
                    });
                    const entries = Object.entries(totals)
                      .map(([cat, amt]) => {
                        const info = TX_CATEGORIES.find((c) => c.id === cat) || TX_CATEGORIES[TX_CATEGORIES.length - 1];
                        return { label: info.label, emoji: info.emoji, color: info.color, amount: amt };
                      })
                      .sort((a, b) => b.amount - a.amount)
                      .slice(0, 4);
                    if (entries.length === 0) {
                      return (
                        <div className="text-xs text-slate-600">Log expenses to see categories</div>
                      );
                    }
                    return entries.map((e) => (
                      <div key={e.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                          <span className="text-xs text-slate-400">{e.emoji} {e.label}</span>
                        </div>
                        <span className="text-xs font-medium text-slate-300">{fmt$(e.amount)}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </Card>

          {/* ── Budget by Category Pie Chart ── */}
          <Card className="p-5">
            <div className="font-syne text-base font-bold text-slate-100 mb-1">
              Budget by Category
            </div>
            <div className="text-[10px] text-slate-600 mb-4">
              Full category breakdown for the current month
            </div>
            {(() => {
              const now = new Date();
              const curMonth = now.getMonth();
              const curYear = now.getFullYear();
              const totals = {};
              transactions.forEach((tx) => {
                if (tx.amount >= 0) return;
                const d = new Date(tx.date);
                if (d.getMonth() !== curMonth || d.getFullYear() !== curYear) return;
                const cat = tx.category || 'other';
                totals[cat] = (totals[cat] || 0) + Math.abs(tx.amount);
              });
              const pieData = Object.entries(totals)
                .map(([cat, amt]) => {
                  const info = TX_CATEGORIES.find((c) => c.id === cat) || TX_CATEGORIES[TX_CATEGORIES.length - 1];
                  return { name: info.label, value: Math.round(amt * 100) / 100, color: info.color, emoji: info.emoji };
                })
                .sort((a, b) => b.value - a.value);
              const grandTotal = pieData.reduce((s, d) => s + d.value, 0);

              if (pieData.length === 0) {
                return (
                  <div
                    className="flex items-center justify-center rounded-xl border border-dashed border-white/10 cursor-pointer hover:border-indigo-500/30 transition-colors"
                    style={{ height: 180 }}
                    onClick={() => { setActiveTab('transactions'); setShowTxForm(true); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setActiveTab('transactions'); setShowTxForm(true); } }}
                  >
                    <span className="text-sm text-slate-600">No spending data yet — log an expense to see your chart</span>
                  </div>
                );
              }

              return (
                <div className="flex flex-col items-center gap-5">
                  {/* Responsive pie chart */}
                  <div className="w-full" style={{ maxWidth: 280, height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                          animationBegin={0}
                          animationDuration={800}
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={`budget-cell-${i}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend grid */}
                  <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                    {pieData.map((entry) => {
                      const pct = grandTotal > 0 ? Math.round((entry.value / grandTotal) * 100) : 0;
                      return (
                        <div
                          key={entry.name}
                          className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] text-slate-300 font-medium truncate">
                              {entry.emoji} {entry.name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {fmt$(entry.value)} &middot; {pct}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </Card>

          {/* Spending Insight Cards */}
          <div
            className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1"
            style={{ scrollbarWidth: 'none' }}
            role="region"
            aria-label="Spending insights"
          >
            <InsightCard
              label="Biggest Category"
              value={
                topCategory
                  ? `${CATEGORY_EMOJIS[topCategory.category] ?? '📦'} ${
                      TX_CATEGORIES.find((c) => c.id === topCategory.category)?.label ?? topCategory.category
                    }`
                  : '—'
              }
              sub={topCategory ? `${topCategory.pctOfTotal}% of total this month` : 'No data yet'}
              accent="#6366f1"
            />
            <InsightCard
              label="Peak Spend Day"
              value={topSpendDay ? topSpendDay.dayName : '—'}
              sub={topSpendDay ? `Avg ${fmt$(topSpendDay.avgAmount)} per transaction` : 'No data yet'}
              accent="#f59e0b"
            />
            <InsightCard
              label="Monthly Trend"
              value={
                <span style={{ color: trend.direction === 'flat' ? '#64748b' : trendColor }}>
                  {trend.direction === 'flat' ? '= Flat' : `${trendArrow}${trendPct}%`}
                </span>
              }
              sub={trendText}
              accent={trend.direction === 'flat' ? '#64748b' : trendColor}
            />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card
              className={`p-4 ${income === 0 ? 'cursor-pointer hover:border-indigo-500/40 transition-colors' : ''}`}
              onClick={income === 0 ? () => setShowIncomeSetup(true) : undefined}
              role={income === 0 ? 'button' : undefined}
              tabIndex={income === 0 ? 0 : undefined}
              onKeyDown={income === 0 ? (e) => { if (e.key === 'Enter' || e.key === ' ') setShowIncomeSetup(true); } : undefined}
              aria-label={income === 0 ? 'Tap to set your monthly income' : undefined}
            >
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-1">Monthly Income</div>
              {income === 0 ? (
                <div className="text-sm text-indigo-400 font-semibold">Tap to set income</div>
              ) : (
                <div className="font-syne text-xl font-bold text-slate-100">{fmt$(income)}</div>
              )}
            </Card>
            <Card className="p-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-1">This Month Spent</div>
              <div className="font-syne text-xl font-bold text-amber-400">
                {transactions.length === 0 ? <span className="text-sm text-slate-600 font-normal">No expenses yet</span> : fmt$(spending.currentMonth)}
              </div>
            </Card>
            <Card className="p-4 col-span-2 sm:col-span-1">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-1">Active Goals</div>
              <div className="font-syne text-xl font-bold text-emerald-400">
                {goals.length === 0 ? <span className="text-sm text-slate-600 font-normal">None yet</span> : goals.length}
              </div>
            </Card>
          </div>

          {/* Spending Pace Indicator */}
          <SpendingPaceWidget />

          {/* 30-day Sparkline */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-syne text-base font-bold text-slate-100">30-Day Spending</div>
                <div className="text-xs text-slate-600">Daily transaction totals</div>
              </div>
              {transactions.length === 0 && (
                <button
                  onClick={() => { setActiveTab('transactions'); setShowTxForm(true); }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  + Log first expense
                </button>
              )}
            </div>
            {transactions.length === 0 ? (
              <div
                className="flex items-center justify-center rounded-xl border border-dashed border-white/10 cursor-pointer hover:border-indigo-500/30 transition-colors"
                style={{ height: 80 }}
                onClick={() => { setActiveTab('transactions'); setShowTxForm(true); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setActiveTab('transactions'); setShowTxForm(true); } }}
              >
                <span className="text-sm text-slate-600">No spending data yet — log an expense to see your chart</span>
              </div>
            ) : (
              <Sparkline
                transactions={transactions}
                width={600}
                height={80}
                color="#6366f1"
                days={30}
                className="w-full"
              />
            )}
          </Card>

          {/* Monthly Report */}
          <MonthlyReportCard />

          {/* Budget Projector */}
          <BudgetProjector />

          {/* Monthly Budget Progress Bars */}
          {income > 0 && (
            <Card className="p-5">
              <div className="font-syne text-base font-bold text-slate-100 mb-4">Budget vs Actual</div>
              <div className="space-y-4">
                {budgetCategories.map(({ id, label, emoji, actual, budgetAmt, pct, barColor }) => (
                  <div key={id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400">{emoji} {label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-300">{fmt$(actual)}</span>
                        <span className="text-[10px] text-slate-600">/ {fmt$(budgetAmt)}</span>
                        {pct >= 100 && (
                          <span className="text-[10px] font-bold text-red-400 rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-0.5">
                            Over
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: barColor }}
                        animate={{ width: `${Math.min(100, pct)}%` }}
                        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Category Breakdown */}
          {breakdown.length > 0 && (
            <Card className="p-5">
              <div className="font-syne text-base font-bold text-slate-100 mb-4">Spending by Category</div>
              <div className="space-y-3">
                {breakdown.slice(0, 5).map(({ category, amount }) => {
                  const catInfo = TX_CATEGORIES.find((c) => c.id === category) || TX_CATEGORIES.at(-1);
                  const total = breakdown.reduce((a, b) => a + b.amount, 0);
                  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
                  const sparkData = category7d[category] ?? new Array(7).fill(0);
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">{catInfo.label}</span>
                        <div className="flex items-center gap-3">
                          <MiniBarChart values={sparkData} color={catInfo.color} width={56} height={24} />
                          <span className="text-xs font-medium text-slate-300 w-14 text-right">{fmt$(amount)}</span>
                          <span className="text-[10px] text-slate-600 w-7 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: catInfo.color }}
                          animate={{ width: `${pct}%` }}
                          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Goals Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          {goals.length === 0 && (
            <Card className="p-5 border-dashed">
              <div className="font-syne text-base font-bold text-slate-100 mb-1">Set a savings goal</div>
              <div className="text-sm text-slate-500 leading-relaxed mb-1">
                Goals let you track progress toward a target amount — a vacation fund, emergency fund, down payment, or anything else.
                Set a deadline and Ultimate Life Planner will calculate how much you need to save each month.
              </div>
            </Card>
          )}
          {goals.length > 0 && (
            <Card className="p-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
                Monthly Progress
              </div>
              <div className="space-y-2">
                {goalsOnTrack.map((status) => (
                  <div key={status.goalId} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400 truncate flex-1">{status.goalName}</span>
                    <OnTrackBadge status={status} />
                  </div>
                ))}
              </div>
            </Card>
          )}
          <GoalTracker />
        </div>
      )}

      {/* ── Transactions Tab ─────────────────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-syne text-base font-bold text-slate-100">Transactions</div>
              <div className="text-[10px] text-slate-600 mt-0.5">Log income as a positive amount (+), expenses as a negative amount (-)</div>
            </div>
            <Button onClick={() => setShowTxForm(true)}>+ Add Transaction</Button>
          </div>

          {transactions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-dashed border-white/10 py-14 px-6 text-center cursor-pointer hover:border-indigo-500/30 transition-colors"
              onClick={() => setShowTxForm(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowTxForm(true); }}
              aria-label="Add your first transaction"
            >
              <div className="text-3xl mb-3" aria-hidden="true">💸</div>
              <div className="font-syne text-base font-semibold text-slate-300 mb-1">No transactions yet</div>
              <div className="text-sm text-slate-600 max-w-xs mx-auto mb-4 leading-relaxed">
                Log an expense (e.g. Rent -1200) or income (e.g. Paycheck +4500).
                Your budget, insights, and health score all update automatically.
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 px-5 py-2.5 text-sm font-semibold text-indigo-300">
                + Add first transaction
              </div>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const catInfo = TX_CATEGORIES.find((c) => c.id === tx.category) || TX_CATEGORIES.at(-1);
                return (
                  <motion.div
                    key={tx.id}
                    layout
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] group"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: catInfo.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-300 truncate">{tx.description}</div>
                      <div className="text-[10px] text-slate-600">
                        {catInfo.label} · {new Date(tx.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-amber-400">{fmt$(tx.amount)}</div>
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="text-slate-700 hover:text-red-400 transition-colors text-xs opacity-0 group-hover:opacity-100"
                      aria-label={`Delete transaction: ${tx.description}`}
                    >
                      ✕
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Planning Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'planning' && (
        <div className="space-y-10">
          <DebtPayoffSection income={income} />
          <div className="border-t border-white/[0.06]" />
          <BudgetBuilderSection income={income} transactions={transactions} />
          <div className="border-t border-white/[0.06]" />
          <EnvelopeBudgeting />
          <div className="border-t border-white/[0.06]" />
          <EmergencyFundSection income={income} transactions={transactions} />
          <div className="border-t border-white/[0.06]" />
          <InvestmentSimSection />
        </div>
      )}

      {/* ── Calendar Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'calendar' && (
        <BillCalendarSection />
      )}

      {/* Add Transaction Modal */}
      <Modal open={showTxForm} onClose={() => setShowTxForm(false)} title="Add Transaction">
        <div className="space-y-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-slate-500 leading-relaxed">
            Use a <span className="text-emerald-400 font-semibold">positive number</span> for income (e.g. +4500 for salary).
            Use a <span className="text-amber-400 font-semibold">negative number</span> for expenses (e.g. -85 for groceries).
            Or enter any positive number — the category will classify it as spending automatically.
          </div>
          <Input
            label="Description"
            value={txForm.description}
            onChange={(e) => setTxForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="e.g. Grocery run"
          />
          <Input
            label="Amount ($) — negative for expenses, positive for income"
            type="number"
            value={txForm.amount}
            onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="-50 or +4500"
          />
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Category
            </label>
            <select
              value={txForm.category}
              onChange={(e) => setTxForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#0a1120]/80 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500/60"
            >
              {TX_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          {txError && <p className="text-xs text-red-400">{txError}</p>}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleAddTx} className="flex-1">Add Transaction</Button>
            <Button variant="ghost" onClick={() => setShowTxForm(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

export default FinanceDashboard;
