import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import Card from './ui/Card';
import Button from './ui/Button';
import Sparkline from './finance/Sparkline.jsx';
import RestTimer from './widgets/RestTimer';
import LiquidProgress from './widgets/LiquidProgress';
import { useTaskStore, useWorkoutStore, useFinanceStore, useUIStore } from '../store';
import { fmt$, calcGoalProgress } from '../utils/financeEngine';

function StatCard({ label, value, sub, color = '#6366f1', icon, onClick }) {
  return (
    <Card
      className="p-4 cursor-pointer"
      hover
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-2xl">{icon}</div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">{label}</div>
      </div>
      <div className="font-syne text-2xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
    </Card>
  );
}

function TaskSummary({ tasks, onViewAll }) {
  const urgent = tasks.filter((t) => !t.completed && t.priority === 'high');
  const today = tasks.filter((t) => {
    if (t.completed || !t.dueDate) return false;
    return new Date(t.dueDate).toDateString() === new Date().toDateString();
  });

  const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-syne text-base font-bold text-slate-100">Tasks</div>
        <button onClick={onViewAll} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          View all →
        </button>
      </div>

      {tasks.filter((t) => !t.completed).length === 0 ? (
        (() => {
          const isNewUser = tasks.length === 0;
          return isNewUser ? (
            <div style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
                Welcome to Ultimate Life Planner!
              </div>
              <div style={{ fontSize: 13, color: 'rgba(148,163,184,0.7)', lineHeight: 1.6, marginBottom: 20, maxWidth: 280, margin: '0 auto 20px' }}>
                Your personal command center for goals, habits, health, and finances. Let's get you started.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 260, margin: '0 auto' }}>
                {[
                  { emoji: '✅', label: 'Add your first task', hint: 'Go to My Week' },
                  { emoji: '🌱', label: 'Create a daily habit', hint: 'Go to Habits' },
                  { emoji: '🎯', label: 'Set a yearly goal', hint: 'Go to My Week → Goals' },
                ].map((item) => (
                  <div key={item.label} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)',
                    borderRadius: 12, padding: '10px 14px', textAlign: 'left',
                  }}>
                    <span style={{ fontSize: 20 }}>{item.emoji}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)' }}>{item.hint}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-600 text-sm">
              All caught up! 🎉
            </div>
          );
        })()
      ) : (
        <div className="space-y-2">
          {[...urgent, ...today.filter((t) => t.priority !== 'high')]
            .slice(0, 5)
            .map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 text-sm py-1.5"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PRIORITY_COLORS[task.priority] || '#64748b' }}
                />
                <span className="flex-1 text-slate-300 truncate">{task.title}</span>
                {task.dueDate && (
                  <span className="text-[10px] text-slate-600 flex-shrink-0">
                    {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            ))}
          {tasks.filter((t) => !t.completed).length > 5 && (
            <div className="text-xs text-slate-600 pt-1">
              +{tasks.filter((t) => !t.completed).length - 5} more tasks
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function WorkoutStreakCard({ streak, history, onView }) {
  const last7 = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const hadWorkout = history.some((w) => {
        const wd = new Date(w.completedAt || 0);
        return `${wd.getFullYear()}-${wd.getMonth()}-${wd.getDate()}` === key;
      });
      days.push({ key, hadWorkout, date: d });
    }
    return days;
  }, [history]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-syne text-base font-bold text-slate-100">Workout Streak</div>
        <button onClick={onView} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          Workouts →
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="font-syne text-3xl font-bold text-amber-400">{streak}</div>
        <div>
          <div className="text-sm text-slate-300">day{streak !== 1 ? 's' : ''}</div>
          <div className="text-xs text-slate-600">current streak</div>
        </div>
      </div>

      {/* Last 7 days */}
      <div className="flex gap-1.5">
        {last7.map((day) => (
          <div key={day.key} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full h-7 rounded-lg"
              style={{
                backgroundColor: day.hadWorkout ? '#f59e0b' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${day.hadWorkout ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.06)'}`,
                boxShadow: day.hadWorkout ? '0 0 8px rgba(245,158,11,0.3)' : 'none',
              }}
            />
            <div className="text-[9px] text-slate-700">
              {day.date.toLocaleDateString('en-US', { weekday: 'narrow' })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FinanceCard({ income, goals, transactions, onView }) {
  const topGoal = goals[0];
  const pct = topGoal ? calcGoalProgress(topGoal) : 0;
  const thisMonthSpend = useMemo(() => {
    const now = new Date();
    return transactions
      .filter((tx) => {
        const d = new Date(tx.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((a, tx) => a + tx.amount, 0);
  }, [transactions]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-syne text-base font-bold text-slate-100">Finance</div>
        <button onClick={onView} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          Details →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-[10px] text-slate-600 mb-0.5">Monthly Income</div>
          <div className="text-lg font-bold font-syne text-slate-100">{fmt$(income)}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-600 mb-0.5">This Month</div>
          <div className="text-lg font-bold font-syne text-amber-400">{fmt$(thisMonthSpend)}</div>
        </div>
      </div>

      {topGoal && (
        <div className="border-t border-white/[0.06] pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 truncate">{topGoal.name}</span>
            <span className="text-xs text-emerald-400 font-medium flex-shrink-0 ml-2">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              style={{ boxShadow: '0 0 6px rgba(16,185,129,0.5)' }}
            />
          </div>
          <div className="text-[10px] text-slate-600 mt-1">
            {fmt$(topGoal.currentAmount || 0)} / {fmt$(topGoal.targetAmount)}
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="mt-3">
          <Sparkline transactions={transactions} width={300} height={40} color="#10b981" days={14} />
        </div>
      )}
    </Card>
  );
}

const Dashboard = React.memo(function Dashboard() {
  const { tasks } = useTaskStore();
  const { workoutHistory, getStreak } = useWorkoutStore();
  const { income, goals, transactions } = useFinanceStore();
  const { setActiveView } = useUIStore();

  const streak = getStreak();
  const activeTasks = tasks.filter((t) => !t.completed).length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const highPriority = tasks.filter((t) => !t.completed && t.priority === 'high').length;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="text-xs text-slate-600 mb-1 font-medium">{today}</div>
        <h1 className="font-syne text-3xl font-bold text-slate-100">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} ✦
        </h1>
        <p className="text-slate-500 text-sm mt-1">Here's your overview for today</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Active Tasks"
          value={activeTasks}
          sub={`${highPriority} high priority`}
          color="#6366f1"
          icon="✓"
          onClick={() => setActiveView('tasks')}
        />
        <StatCard
          label="Completed"
          value={completedTasks}
          sub="tasks done"
          color="#10b981"
          icon="◉"
          onClick={() => setActiveView('tasks')}
        />
        <StatCard
          label="Workout Streak"
          value={`${streak}d`}
          sub={`${workoutHistory.length} total workouts`}
          color="#f59e0b"
          icon="◈"
          onClick={() => setActiveView('workouts')}
        />
        <StatCard
          label="Income"
          value={fmt$(income)}
          sub={`${goals.length} savings goals`}
          color="#10b981"
          icon="◎"
          onClick={() => setActiveView('finance')}
        />
      </div>

      {/* Main content grid */}
      <div className="grid sm:grid-cols-2 gap-5">
        <TaskSummary tasks={tasks} onViewAll={() => setActiveView('tasks')} />
        <WorkoutStreakCard streak={streak} history={workoutHistory} onView={() => setActiveView('workouts')} />
        <div className="sm:col-span-2">
          <FinanceCard income={income} goals={goals} transactions={transactions} onView={() => setActiveView('finance')} />
        </div>
      </div>

      {/* Pro Widgets row */}
      <div className="grid sm:grid-cols-2 gap-5 mt-5">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-syne text-base font-bold text-slate-100">Rest Timer</div>
            <button onClick={() => setActiveView('workouts')} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Workouts →
            </button>
          </div>
          <div className="flex justify-center">
            <RestTimer defaultSeconds={90} />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-syne text-base font-bold text-slate-100">Savings Goal</div>
            <button onClick={() => setActiveView('finance')} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Finance →
            </button>
          </div>
          <div className="flex justify-center">
            <LiquidProgress width={180} height={180} />
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => {
          setActiveView('tasks');
          setTimeout(() => document.getElementById('quick-add-input')?.focus(), 300);
        }}>
          + Add Task
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setActiveView('workouts')}>
          Start Workout
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setActiveView('finance')}>
          Track Spending
        </Button>
      </div>
    </div>
  );
});

export default Dashboard;
