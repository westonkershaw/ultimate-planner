import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskStore } from '../../store';

const PRIORITY_STYLES = {
  high: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', label: 'High' },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', label: 'Medium' },
  low: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', label: 'Low' },
};

function isOverdue(dueDate) {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function isToday(dueDate) {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const today = new Date();
  return due.toDateString() === today.toDateString();
}

function formatDueDate(dueDate) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  if (isToday(dueDate)) return 'Today';
  if (isOverdue(dueDate)) {
    const days = Math.ceil((new Date().setHours(0,0,0,0) - d) / (1000 * 60 * 60 * 24));
    return `${days}d overdue`;
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TaskCard = React.memo(function TaskCard({ task }) {
  const { toggleTask, deleteTask } = useTaskStore();
  const priority = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;
  const overdue = isOverdue(task.dueDate) && !task.completed;
  const today = isToday(task.dueDate);

  const handleToggle = useCallback(() => {
    toggleTask(task.id);
  }, [task.id, toggleTask]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: task.completed ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="flex items-start gap-3 px-4 py-3 rounded-xl border bg-white/[0.02] group transition-colors hover:bg-white/[0.04]"
      style={{
        borderColor: task.completed ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.07)',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-lg border-2 transition-all duration-200 flex items-center justify-center"
        style={{
          borderColor: task.completed ? '#10b981' : priority.color,
          backgroundColor: task.completed ? '#10b981' : 'transparent',
        }}
      >
        {task.completed && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-[10px] text-slate-900 font-bold leading-none"
          >
            ✓
          </motion.span>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${task.completed ? 'line-through text-slate-600' : 'text-slate-200'}`}>
          {task.title}
        </div>
        {task.description && !task.completed && (
          <div className="text-xs text-slate-600 mt-0.5 line-clamp-1">{task.description}</div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {/* Priority badge */}
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{ color: priority.color, backgroundColor: priority.bg, border: `1px solid ${priority.border}` }}
          >
            {priority.label}
          </span>

          {/* Due date */}
          {task.dueDate && (
            <span
              className={`text-[10px] font-medium ${
                overdue ? 'text-red-400' : today ? 'text-amber-400' : 'text-slate-600'
              }`}
            >
              {overdue ? '⚠ ' : today ? '📅 ' : '🗓 '}
              {formatDueDate(task.dueDate)}
            </span>
          )}

          {/* Tags */}
          {task.tags?.map((tag) => (
            <span key={tag} className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-md">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => deleteTask(task.id)}
        className="text-slate-700 hover:text-red-400 transition-colors text-xs flex-shrink-0 opacity-0 group-hover:opacity-100"
      >
        ✕
      </button>
    </motion.div>
  );
});

export default TaskCard;
