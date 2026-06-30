import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import GoalJar from './GoalJar';
import MilestoneCelebration from './MilestoneCelebration';
import { calcGoalProgress, fmt$ } from '../../utils/financeEngine';
import { calcDepositStreak, getNewMilestone } from '../../utils/goalMilestones';
import { useFinanceStore } from '../../store';

const GOAL_CATEGORIES = [
  { id: 'savings', label: 'Savings', icon: '💰' },
  { id: 'emergency', label: 'Emergency Fund', icon: '🛡️' },
  { id: 'vacation', label: 'Vacation', icon: '✈️' },
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'car', label: 'Car', icon: '🚗' },
  { id: 'education', label: 'Education', icon: '🎓' },
  { id: 'investment', label: 'Investment', icon: '📈' },
  { id: 'other', label: 'Other', icon: '⭐' },
];

function GoalCard({ goal, onDelete, onDeposit }) {
  const pct = calcGoalProgress(goal);
  const [depositAmt, setDepositAmt] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [showDeposit, setShowDeposit] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const prevPctRef = useRef(pct);

  const catInfo = GOAL_CATEGORIES.find((c) => c.id === goal.category) || GOAL_CATEGORIES[0];
  const remaining = Math.max(0, (goal.targetAmount || 0) - (goal.currentAmount || 0));
  const streak = calcDepositStreak(goal.deposits || []);
  const milestones = goal.milestonesReached || [];

  const handleDeposit = () => {
    if (!depositAmt || isNaN(Number(depositAmt))) return;
    const prevPct = prevPctRef.current;
    onDeposit(goal.id, Number(depositAmt), depositNote);

    // Check for new milestone after deposit
    const newAmount = (goal.currentAmount || 0) + Number(depositAmt);
    const newPct = goal.targetAmount > 0 ? Math.round((newAmount / goal.targetAmount) * 100) : 0;
    const newMilestone = getNewMilestone(prevPct, newPct);
    if (newMilestone) setCelebration(newMilestone);
    prevPctRef.current = newPct;

    setDepositAmt('');
    setDepositNote('');
    setShowDeposit(false);
  };

  return (
    <Card className="p-4 relative overflow-hidden">
      <MilestoneCelebration milestone={celebration} color="#10b981" />
      <div className="flex items-start gap-4">
        <GoalJar pct={pct} color="#10b981" size={80} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="text-xs text-fg-faint">{catInfo.icon} {catInfo.label}</div>
              <div className="font-syne text-base font-bold text-fg truncate">{goal.name}</div>
            </div>
            <button
              onClick={() => onDelete(goal.id)}
              className="text-fg-faint hover:text-red-400 transition-colors text-xs flex-shrink-0"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-4 text-sm mb-3">
            <div>
              <div className="text-emerald-400 font-bold">{fmt$(goal.currentAmount || 0)}</div>
              <div className="text-[10px] text-fg-faint">Saved</div>
            </div>
            <div>
              <div className="text-fg-secondary font-bold">{fmt$(goal.targetAmount || 0)}</div>
              <div className="text-[10px] text-fg-faint">Target</div>
            </div>
            <div>
              <div className="text-fg-muted font-bold">{fmt$(remaining)}</div>
              <div className="text-[10px] text-fg-faint">Remaining</div>
            </div>
          </div>

          {goal.deadline && (
            <div className="text-[10px] text-fg-faint mb-2">
              {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
          )}

          {/* Streak + milestone badges */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/15 text-orange-300">
                {streak}mo streak
              </span>
            )}
            {milestones.map((m) => (
              <span
                key={m}
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300"
              >
                {m}%
              </span>
            ))}
          </div>

          <AnimatePresence>
            {showDeposit ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 mt-2">
                  <input
                    type="number"
                    value={depositAmt}
                    onChange={(e) => setDepositAmt(e.target.value)}
                    placeholder="Amount"
                    className="flex-1 rounded-lg border border-white/10 bg-[#0a1120]/80 px-2 py-1.5 text-xs text-fg-secondary outline-none focus:border-emerald-500/60"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleDeposit(); }}
                    autoFocus
                  />
                  <input
                    value={depositNote}
                    onChange={(e) => setDepositNote(e.target.value)}
                    placeholder="Note"
                    className="flex-1 rounded-lg border border-white/10 bg-[#0a1120]/80 px-2 py-1.5 text-xs text-fg-secondary outline-none focus:border-emerald-500/60"
                  />
                  <button
                    onClick={handleDeposit}
                    className="px-2 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setShowDeposit(false)}
                    className="text-fg-faint hover:text-fg-muted text-xs"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={() => setShowDeposit(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                + Add Deposit
              </button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Recent deposits */}
      {goal.deposits && goal.deposits.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="text-[10px] text-fg-faint uppercase tracking-wider mb-2">Recent Deposits</div>
          {goal.deposits.slice(-3).reverse().map((dep) => (
            <div key={dep.id} className="flex items-center justify-between text-xs py-0.5">
              <span className="text-fg-muted">{dep.note || 'Deposit'}</span>
              <span className="text-emerald-400 font-medium">+{fmt$(dep.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const GoalTracker = React.memo(function GoalTracker() {
  const { goals, addGoal, deleteGoal, addDeposit } = useFinanceStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    targetAmount: '',
    category: 'savings',
    deadline: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Goal name is required';
    if (!form.targetAmount || isNaN(Number(form.targetAmount))) e.targetAmount = 'Valid amount required';
    return e;
  };

  const handleAdd = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    addGoal({
      name: form.name.trim(),
      targetAmount: Number(form.targetAmount),
      currentAmount: 0,
      category: form.category,
      deadline: form.deadline,
      notes: form.notes,
    });
    setForm({ name: '', targetAmount: '', category: 'savings', deadline: '', notes: '' });
    setErrors({});
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="font-syne text-base font-bold text-fg">Savings Goals</div>
        <Button size="sm" onClick={() => setShowForm(true)}>+ Add Goal</Button>
      </div>

      <div className="grid gap-4">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onDelete={deleteGoal}
            onDeposit={addDeposit}
          />
        ))}
        {goals.length === 0 && (
          <div
            className="rounded-xl border border-dashed border-white/10 py-8 text-center text-fg-faint text-sm cursor-pointer hover:border-accent/30 transition-colors"
            onClick={() => setShowForm(true)}
          >
            No goals yet. Click to add your first savings goal.
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Savings Goal">
        <div className="space-y-3">
          <Input
            label="Goal Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Emergency Fund"
            error={errors.name}
          />
          <Input
            label="Target Amount ($)"
            type="number"
            value={form.targetAmount}
            onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
            placeholder="10000"
            error={errors.targetAmount}
          />
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#0a1120]/80 px-3 py-2.5 text-sm text-fg-secondary outline-none focus:border-accent/60"
            >
              {GOAL_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Deadline (Optional)"
            type="date"
            value={form.deadline}
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
          />
          <div className="flex gap-2 pt-2">
            <Button onClick={handleAdd} className="flex-1">Add Goal</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

export default GoalTracker;
