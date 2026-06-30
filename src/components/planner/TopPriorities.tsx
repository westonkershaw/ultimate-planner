import { useMemo } from 'react';
import { motion, Reorder } from 'framer-motion';
import { GripVertical, Target } from 'lucide-react';
import { useTaskStore } from '@/store';
import type { Task } from '@/types';

interface TopPrioritiesProps {
  taskIds: string[];
  onChange: (ids: string[]) => void;
}

export default function TopPriorities({ taskIds, onChange }: TopPrioritiesProps) {
  const tasks = useTaskStore((s) => s.tasks);

  const availableTasks = useMemo(
    () => tasks.filter((t) => !t.completed).sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      return p[a.priority] - p[b.priority];
    }),
    [tasks],
  );

  const selectedTasks = useMemo(
    () => taskIds.map((id) => tasks.find((t) => t.id === id)).filter(Boolean) as Task[],
    [taskIds, tasks],
  );

  const unselected = useMemo(
    () => availableTasks.filter((t) => !taskIds.includes(t.id)).slice(0, 5),
    [availableTasks, taskIds],
  );

  const addPriority = (id: string) => {
    if (taskIds.length >= 3) return;
    onChange([...taskIds, id]);
  };

  const removePriority = (id: string) => {
    onChange(taskIds.filter((tid) => tid !== id));
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-fg-muted uppercase tracking-wider flex items-center gap-1.5">
        <Target size={12} className="text-accent-text" />
        Top 3 Priorities
      </label>

      {/* Selected (reorderable) */}
      <Reorder.Group axis="y" values={taskIds} onReorder={onChange} className="space-y-2">
        {selectedTasks.map((task, i) => (
          <Reorder.Item key={task.id} value={task.id}>
            <motion.div
              layout
              className="flex items-center gap-2 p-3 rounded-xl bg-accent/8 border border-accent/20 cursor-grab active:cursor-grabbing"
            >
              <GripVertical size={14} className="text-fg-faint flex-shrink-0" />
              <span className="text-xs font-bold text-accent-text w-5">{i + 1}.</span>
              <span className="text-sm text-fg-secondary flex-1 truncate">{task.title}</span>
              <button
                onClick={() => removePriority(task.id)}
                className="text-xs text-fg-faint hover:text-red-400 transition-colors"
              >
                ✕
              </button>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* Available tasks to add */}
      {taskIds.length < 3 && unselected.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-fg-faint">Tap to add ({3 - taskIds.length} remaining)</p>
          {unselected.map((task) => (
            <motion.button
              key={task.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => addPriority(task.id)}
              className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-border bg-surface-1 text-left hover:border-accent/30 transition-colors"
            >
              <span className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span className="text-sm text-fg-muted truncate">{task.title}</span>
            </motion.button>
          ))}
        </div>
      )}

      {availableTasks.length === 0 && taskIds.length === 0 && (
        <p className="text-xs text-fg-faint py-3 text-center">Add tasks first to set priorities</p>
      )}
    </div>
  );
}
