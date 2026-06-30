import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, CheckCircle2 } from 'lucide-react';
import { usePlannerStore } from '@/store/usePlannerStore';
import { useTaskStore } from '@/store';
import DailyIntention from './DailyIntention';
import EnergySelector from './EnergySelector';
import TopPriorities from './TopPriorities';
import type { Task } from '@/types';

interface WeekDayStepProps {
  date: string;
  dayLabel: string;
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function WeekDayStep({ date, dayLabel }: WeekDayStepProps) {
  const { getPlan, setIntention, setEnergyLevel, setTopPriorities } = usePlannerStore();
  const { tasks, addTask, toggleTask } = useTaskStore();
  const [quickTitle, setQuickTitle] = useState('');

  const plan = getPlan(date);

  const dayTasks = useMemo(
    () => tasks.filter((t: Task) => t.dueDate === date),
    [tasks, date],
  );

  const pendingTasks = useMemo(() => dayTasks.filter((t) => !t.completed), [dayTasks]);
  const completedTasks = useMemo(() => dayTasks.filter((t) => t.completed), [dayTasks]);

  const handleQuickAdd = () => {
    const title = quickTitle.trim();
    if (!title) return;
    addTask({ title, dueDate: date, priority: 'medium' });
    setQuickTitle('');
  };

  if (!plan) return null;

  return (
    <div className="space-y-5">
      {/* Day header */}
      <div className="text-center space-y-0.5">
        <h3 className="text-lg font-bold text-fg font-[Syne]">{dayLabel}</h3>
        <p className="text-xs text-fg-muted">{formatFullDate(date)}</p>
      </div>

      <DailyIntention
        value={plan.intention}
        onChange={(v) => setIntention(date, v)}
      />

      <EnergySelector
        value={plan.energyLevel}
        onChange={(v) => setEnergyLevel(date, v)}
      />

      <TopPriorities
        taskIds={plan.topPriorities}
        onChange={(ids) => setTopPriorities(date, ids)}
      />

      {/* Tasks for this day */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-fg-muted uppercase tracking-wider flex items-center gap-1.5">
          <Calendar size={12} className="text-accent-text" />
          Tasks for {dayLabel}
        </label>

        {pendingTasks.length === 0 && completedTasks.length === 0 && (
          <p className="text-xs text-fg-faint italic py-2">No tasks scheduled yet.</p>
        )}

        {pendingTasks.map((task) => (
          <motion.div
            key={task.id}
            layout
            className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-surface-1"
          >
            <button
              onClick={() => toggleTask(task.id)}
              className="w-4 h-4 rounded border border-border-strong hover:border-accent transition-colors flex-shrink-0"
            />
            <span className="text-sm text-fg-secondary flex-1 truncate">{task.title}</span>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
          </motion.div>
        ))}

        {completedTasks.length > 0 && (
          <div className="space-y-1 opacity-50">
            {completedTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg">
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <span className="text-xs text-fg-muted line-through truncate">{task.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick add */}
        <div className="flex gap-2 mt-2">
          <input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
            placeholder="Quick add a task..."
            className="flex-1 bg-surface-1 border border-border rounded-lg px-3 py-2 text-sm text-fg-secondary placeholder:text-fg-faint focus:outline-none focus:border-accent/40"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleQuickAdd}
            className="p-2 rounded-lg bg-accent/15 border border-accent/30 text-accent-text hover:bg-accent/25 transition-colors"
          >
            <Plus size={16} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
