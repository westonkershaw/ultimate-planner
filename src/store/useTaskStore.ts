import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Task, CreateTaskInput, UpdateTaskInput, ID } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────

const uid = (): ID => Math.random().toString(36).slice(2, 9);

// ── State & Action Interfaces ──────────────────────────────────────────────

interface TaskState {
  tasks: Task[];
  /** Auth user id that currently owns this store's data ('' = unclaimed). */
  ownedBy: string;
}

interface TaskActions {
  addTask: (input: Partial<CreateTaskInput>) => void;
  updateTask: (id: ID, updates: UpdateTaskInput) => void;
  deleteTask: (id: ID) => void;
  toggleTask: (id: ID) => void;
  /** Per-user isolation: clear data when switching to a different account. */
  resetForUser: (userId: string) => void;
}

export type TaskStore = TaskState & TaskActions;

// ── Store ──────────────────────────────────────────────────────────────────

/**
 * useTaskStore
 *
 * Manages user tasks. Persisted to localStorage under key `up_tasks`.
 * All CRUD operations accept partial inputs; defaults are applied on creation.
 */
export const useTaskStore = create<TaskStore>()(
  persist(
    immer((set) => ({
      tasks: [],
      ownedBy: '',

      addTask: (input) =>
        set((draft) => {
          draft.tasks.push({
            id: uid(),
            title: '',
            description: '',
            priority: 'medium',
            dueDate: '',
            completed: false,
            tags: [],
            createdAt: Date.now(),
            ...input,
          } satisfies Task);
        }),

      updateTask: (id, updates) =>
        set((draft) => {
          const task = draft.tasks.find((t) => t.id === id);
          if (task) Object.assign(task, updates);
        }),

      deleteTask: (id) =>
        set((draft) => {
          draft.tasks = draft.tasks.filter((t) => t.id !== id);
        }),

      toggleTask: (id) =>
        set((draft) => {
          const task = draft.tasks.find((t) => t.id === id);
          if (task) task.completed = !task.completed;
        }),

      resetForUser: (userId) =>
        set((draft) => {
          if (draft.ownedBy === userId || userId === 'guest') return;
          if (draft.ownedBy === '') { draft.ownedBy = userId; return; }
          draft.tasks = [];
          draft.ownedBy = userId;
        }),
    })),
    { name: 'up_tasks' },
  ),
);
