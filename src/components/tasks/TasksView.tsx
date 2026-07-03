import React, { useMemo, useCallback } from 'react';
import TaskListRaw from './TaskList';
import { useTaskStore } from '@/store';
import type { Task } from '@/types';

// TaskList is an untyped .jsx presentational component; declare the controlled
// props contract we rely on so the adapter is type-checked.
interface ListTask {
  id: string;
  title: string;
  done: boolean;
  priority: string;
  category: string;
  time: string;
}
interface TaskListProps {
  tasks: ListTask[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (title: string) => void;
  isPro?: boolean;
}
const TaskList = TaskListRaw as unknown as React.FC<TaskListProps>;

// ── Adapter ───────────────────────────────────────────────────────────────
// TaskList is a presentational component with its own demo shape
// ({ done, time, category }). This wires it to the real persisted task store
// so the Tasks tab manages actual tasks (was previously stuck on MOCK_TASKS).

function toListShape(t: Task) {
  return {
    id: t.id,
    title: t.title,
    done: t.completed,
    priority: t.priority === 'medium' ? 'normal' : t.priority,
    category: t.tags?.[0] ?? '',
    time: t.dueDate
      ? new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '',
  };
}

const TasksView = React.memo(function TasksView() {
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const listTasks = useMemo(() => tasks.map(toListShape), [tasks]);

  const onAdd = useCallback((title: string) => addTask({ title }), [addTask]);
  const onToggle = useCallback((id: string) => toggleTask(id), [toggleTask]);
  const onDelete = useCallback((id: string) => deleteTask(id), [deleteTask]);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <TaskList tasks={listTasks} onToggle={onToggle} onDelete={onDelete} onAdd={onAdd} />
    </div>
  );
});

export default TasksView;
