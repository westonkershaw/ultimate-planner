import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckSquare,
  CircleCheck,
  Flame,
  Wallet,
  Sprout,
  Target,
  Sparkles,
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Sparkline from './finance/Sparkline.jsx';
import RestTimer from './widgets/RestTimer';
import LiquidProgress from './widgets/LiquidProgress';
import { useTaskStore, useWorkoutStore, useFinanceStore, useUIStore } from '../store';
import { fmt$, calcGoalProgress } from '../utils/financeEngine';

function StatCard({ label, value, sub, Icon, onClick }) {
  return (
    <Card className="p-4 cursor-pointer" hover onClick={onClick}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">{label}</div>
        {Icon && <Icon size={15} className="text-fg-muted flex-shrink-0" />}
      </div>
      <div className="text-2xl font-semibold text-fg tabular-nums">{value}</div>
      {sub && <div className="text-xs text-fg-muted mt-0.5">{sub}</div>}
    </Card>
  );
}

function SectionLink({ label, onClick }) {
  return (
    <button onClick={onClick} className="text-xs text-accent-text hover:opacity-80 transition-opacity">
      {label}
    </button>
  );
}

function TaskSummary({ tasks, onViewAll, onNavigate }) {
  const urgent = tasks.filter((t) => !t.completed && t.priority === 'high');
  const today = tasks.filter((t) => {
    if (t.completed || !t.dueDate) return false;
    return new Date(t.dueDate).toDateString() === new Date().toDateString();
  });

  const PRIORITY_COLORS = { high: '#e2685f', medium: '#d9a441', low: '#41b27a' };
  const QUICK_START = [
    { Icon: CheckSquare, label: 'Add your first task', hint: 'Go to My Week', view: 'tasks' },
    { Icon: Sprout, label: 'Create a daily habit', hint: 'Go to Habits', view: 'habits' },
    { Icon: Target, label: 'Set a yearly goal', hint: 'Go to My Week → Goals', view: 'goals' },
  ];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-base font-semibold text-fg">Tasks</div>
        <SectionLink label="View all →" onClick={onViewAll} />
      </div>

      {tasks.filter((t) => !t.completed).length === 0 ? (
        tasks.length === 0 ? (
          <div className="text-center px-4 py-6">
            <div className="w-11 h-11 rounded-card bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-3">
              <Sparkles size={20} className="text-accent-text" />
            </div>
            <div className="text-[17px] font-semibold text-fg mb-2">Welcome to Ultimate Life Planner</div>
            <div className="text-[13px] text-fg-muted leading-relaxed mb-5 max-w-[280px] mx-auto">
              Your personal command center for goals, habits, health, and finances. Let's get you started.
            </div>
            <div className="flex flex-col gap-2.5 max-w-[260px] mx-auto">
              {QUICK_START.map((item) => (
                <button
                  key={item.label}
                  onClick={() => onNavigate(item.view)}
                  className="flex items-center gap-3 bg-surface-2 border border-border rounded-card px-3.5 py-2.5 text-left hover:border-border-strong transition-colors"
                >
                  <item.Icon size={18} className="text-accent-text flex-shrink-0" />
                  <div>
                    <div className="text-[13px] font-medium text-fg">{item.label}</div>
                    <div className="text-[11px] text-fg-muted">{item.hint}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-fg-muted text-sm">All caught up.</div>
        )
      ) : (
        <div className="space-y-2">
          {[...urgent, ...today.filter((t) => t.priority !== 'high')]
            .slice(0, 5)
            .map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-sm py-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PRIORITY_COLORS[task.priority] || '#8b929e' }}
                />
                <span className="flex-1 text-fg-secondary truncate">{task.title}</span>
                {task.dueDate && (
                  <span className="text-[10px] text-fg-faint flex-shrink-0 tabular-nums">
                    {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            ))}
          {tasks.filter((t) => !t.completed).length > 5 && (
            <div className="text-xs text-fg-faint pt-1">
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
        <div className="text-base font-semibold text-fg">Workout Streak</div>
        <SectionLink label="Workouts →" onClick={onView} />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Flame size={22} className="text-accent-text" />
          <span className="text-3xl font-semibold text-fg tabular-nums">{streak}</span>
        </div>
        <div>
          <div className="text-sm text-fg-secondary">day{streak !== 1 ? 's' : ''}</div>
          <div className="text-xs text-fg-muted">current streak</div>
        </div>
      </div>

      <div className="flex gap-1.5">
        {last7.map((day) => (
          <div key={day.key} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full h-7 rounded-control"
              style={{
                backgroundColor: day.hadWorkout ? '#0e9488' : 'var(--color-surface-2)',
                border: `1px solid ${day.hadWorkout ? 'rgba(45,212,191,0.3)' : 'var(--color-border)'}`,
              }}
            />
            <div className="text-[9px] text-fg-faint">
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
        <div className="text-base font-semibold text-fg">Finance</div>
        <SectionLink label="Details →" onClick={onView} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-[10px] text-fg-muted mb-0.5 uppercase tracking-wider">Monthly Income</div>
          <div className="text-lg font-semibold text-fg tabular-nums">{fmt$(income)}</div>
        </div>
        <div>
          <div className="text-[10px] text-fg-muted mb-0.5 uppercase tracking-wider">This Month</div>
          <div className="text-lg font-semibold text-warning-text tabular-nums">{fmt$(thisMonthSpend)}</div>
        </div>
      </div>

      {topGoal && (
        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-fg-muted truncate">{topGoal.name}</span>
            <span className="text-xs text-success-text font-medium flex-shrink-0 ml-2 tabular-nums">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-success"
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
          <div className="text-[10px] text-fg-muted mt-1 tabular-nums">
            {fmt$(topGoal.currentAmount || 0)} / {fmt$(topGoal.targetAmount)}
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="mt-3">
          <Sparkline transactions={transactions} width={300} height={40} color="#41b27a" days={14} />
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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="text-xs text-fg-faint mb-1 font-medium">{today}</div>
        <h1 className="text-3xl font-semibold text-fg tracking-tight">Good {greeting}</h1>
        <p className="text-fg-muted text-sm mt-1">Here's your overview for today</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Active Tasks" value={activeTasks} sub={`${highPriority} high priority`} Icon={CheckSquare} onClick={() => setActiveView('tasks')} />
        <StatCard label="Completed" value={completedTasks} sub="tasks done" Icon={CircleCheck} onClick={() => setActiveView('tasks')} />
        <StatCard label="Workout Streak" value={`${streak}d`} sub={`${workoutHistory.length} total workouts`} Icon={Flame} onClick={() => setActiveView('workouts')} />
        <StatCard label="Income" value={fmt$(income)} sub={`${goals.length} savings goals`} Icon={Wallet} onClick={() => setActiveView('finance')} />
      </div>

      {/* Main content grid */}
      <div className="grid sm:grid-cols-2 gap-5">
        <TaskSummary tasks={tasks} onViewAll={() => setActiveView('tasks')} onNavigate={setActiveView} />
        <WorkoutStreakCard streak={streak} history={workoutHistory} onView={() => setActiveView('workouts')} />
        <div className="sm:col-span-2">
          <FinanceCard income={income} goals={goals} transactions={transactions} onView={() => setActiveView('finance')} />
        </div>
      </div>

      {/* Pro Widgets row */}
      <div className="grid sm:grid-cols-2 gap-5 mt-5">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-base font-semibold text-fg">Rest Timer</div>
            <SectionLink label="Workouts →" onClick={() => setActiveView('workouts')} />
          </div>
          <div className="flex justify-center">
            <RestTimer defaultSeconds={90} />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-base font-semibold text-fg">Savings Goal</div>
            <SectionLink label="Finance →" onClick={() => setActiveView('finance')} />
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
