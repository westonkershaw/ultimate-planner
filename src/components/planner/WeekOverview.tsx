import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Sparkles } from 'lucide-react';
import { usePlannerStore } from '@/store/usePlannerStore';
import { useTaskStore } from '@/store';
import type { Task } from '@/types';

interface WeekOverviewProps {
  mondayDate: string;
  onSelectDay: (dayIndex: number) => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function offsetDate(monday: string, offset: number): string {
  const d = new Date(monday + 'T00:00:00');
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0]!;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function WeekOverview({ mondayDate, onSelectDay }: WeekOverviewProps) {
  const plans = usePlannerStore((s) => s.plans);
  const tasks = useTaskStore((s) => s.tasks);

  const days = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]!;
    return Array.from({ length: 7 }, (_, i) => {
      const date = offsetDate(mondayDate, i);
      const plan = plans.find((p) => p.date === date);
      const dayTasks = tasks.filter((t: Task) => t.dueDate === date && !t.completed);
      const completedCount = tasks.filter((t: Task) => t.dueDate === date && t.completed).length;
      return { date, plan, dayTasks, completedCount, isToday: date === today };
    });
  }, [mondayDate, plans, tasks]);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-fg font-[Syne]">
          Your Week at a Glance
        </h3>
        <p className="text-xs text-fg-muted">
          Tap any day to start planning it
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {days.map((day, i) => {
          const hasContent = day.plan?.intention || day.dayTasks.length > 0 || day.completedCount > 0;
          return (
            <motion.button
              key={day.date}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectDay(i)}
              className={[
                'flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all min-h-[120px]',
                day.isToday
                  ? 'bg-accent/10 border-accent/30'
                  : hasContent
                    ? 'bg-surface-1 border-border hover:border-border-strong'
                    : 'bg-surface-1 border-border hover:border-border-strong',
              ].join(' ')}
            >
              {/* Day header */}
              <div className="flex items-center justify-between w-full">
                <div>
                  <span className={[
                    'text-xs font-bold uppercase tracking-wider',
                    day.isToday ? 'text-accent-text' : 'text-fg-muted',
                  ].join(' ')}>
                    {DAY_LABELS[i]}
                  </span>
                  <span className="text-[10px] text-fg-faint ml-1.5">
                    {formatShortDate(day.date)}
                  </span>
                </div>
                {day.isToday && (
                  <span className="text-[9px] font-bold text-accent-text bg-accent/15 px-1.5 py-0.5 rounded">
                    TODAY
                  </span>
                )}
              </div>

              {/* Intention */}
              {day.plan?.intention ? (
                <div className="flex items-start gap-1.5 w-full">
                  <Sparkles size={10} className="text-accent-text mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-fg-secondary line-clamp-2 leading-tight">
                    {day.plan.intention}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-fg-faint italic">No intention set</p>
              )}

              {/* Task count */}
              <div className="mt-auto flex items-center gap-2 w-full">
                {day.dayTasks.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-fg-muted">
                    <Calendar size={10} />
                    {day.dayTasks.length} task{day.dayTasks.length !== 1 ? 's' : ''}
                  </span>
                )}
                {day.completedCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-500/70">
                    <CheckCircle2 size={10} />
                    {day.completedCount}
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
