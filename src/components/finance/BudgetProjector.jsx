import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { calcBudgetSplit, fmt$ } from '../../utils/financeEngine';
import { useFinanceStore } from '../../store';

const SPLIT_PRESETS = [
  { label: '50/30/20', needs: 50, wants: 30, savings: 20 },
  { label: '60/20/20', needs: 60, wants: 20, savings: 20 },
  { label: '70/20/10', needs: 70, wants: 20, savings: 10 },
  { label: '40/20/40', needs: 40, wants: 20, savings: 40 },
];

function ProgressBar({ label, amount, color, pct }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color }}>{fmt$(amount)}</span>
          <span className="text-[10px] text-slate-600">{pct}%</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
        />
      </div>
    </div>
  );
}

const BudgetProjector = React.memo(function BudgetProjector() {
  const { income, budgetSplits, setIncome, setBudgetSplits } = useFinanceStore();
  const [incomeInput, setIncomeInput] = useState(String(income || ''));
  const [editing, setEditing] = useState(false);

  const split = useMemo(() => calcBudgetSplit(income, budgetSplits), [income, budgetSplits]);

  const handleSaveIncome = () => {
    const val = parseFloat(incomeInput.replace(/[^0-9.]/g, '')) || 0;
    setIncome(val);
    setEditing(false);
  };

  const selectPreset = (preset) => {
    setBudgetSplits({ needs: preset.needs, wants: preset.wants, savings: preset.savings });
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="font-syne text-base font-bold text-slate-100">Budget Projector</div>
          <div className="text-xs text-slate-600">50/30/20 rule</div>
        </div>
        <button
          onClick={() => setEditing((e) => !e)}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {editing ? (
        <div className="mb-5 space-y-4">
          <Input
            label="Monthly Income"
            type="number"
            value={incomeInput}
            onChange={(e) => setIncomeInput(e.target.value)}
            placeholder="5000"
          />

          {/* Preset selectors */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 block mb-2">
              Split Preset
            </label>
            <div className="flex gap-2 flex-wrap">
              {SPLIT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => selectPreset(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                    budgetSplits.needs === p.needs && budgetSplits.wants === p.wants
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-white/5 text-slate-500 border-white/10 hover:text-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSaveIncome} size="sm">Save</Button>
        </div>
      ) : (
        <div className="mb-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-1">Monthly Income</div>
          <div className="font-syne text-2xl font-bold text-slate-100">{fmt$(income)}</div>
        </div>
      )}

      {income > 0 ? (
        <div className="mt-4">
          <ProgressBar
            label="Needs"
            amount={split.needs}
            pct={budgetSplits.needs}
            color="#6366f1"
          />
          <ProgressBar
            label="Wants"
            amount={split.wants}
            pct={budgetSplits.wants}
            color="#f59e0b"
          />
          <ProgressBar
            label="Savings"
            amount={split.savings}
            pct={budgetSplits.savings}
            color="#10b981"
          />
        </div>
      ) : (
        <div className="text-center py-4 text-slate-600 text-sm">
          Enter your monthly income to see the budget breakdown
        </div>
      )}
    </Card>
  );
});

export default BudgetProjector;
