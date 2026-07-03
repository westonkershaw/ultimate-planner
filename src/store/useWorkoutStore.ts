import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  ID,
  Routine,
  WorkoutSession,
  CreateRoutineInput,
  UpdateRoutineInput,
  UserProfile,
} from '@/types';
import { calcWorkoutStreak } from '@/utils/workoutUtils';

// ── Helpers ────────────────────────────────────────────────────────────────

const uid = (): ID => Math.random().toString(36).slice(2, 9);

// ── State & Action Interfaces ──────────────────────────────────────────────

interface WorkoutState {
  routines: Routine[];
  workoutHistory: WorkoutSession[];
  activeSession: WorkoutSession | null;
  userProfile: UserProfile | null;
  /** Auth user id that currently owns this store's data ('' = unclaimed). */
  ownedBy: string;
}

interface WorkoutActions {
  // Routine CRUD
  addRoutine: (input: Partial<CreateRoutineInput>) => void;
  updateRoutine: (id: ID, updates: UpdateRoutineInput) => void;
  deleteRoutine: (id: ID) => void;

  // Session lifecycle
  startSession: (routine: Routine) => void;
  completeSet: (exIndex: number, setIndex: number, weight: number, reps: number) => void;
  endSession: () => void;
  cancelSession: () => void;

  // Profile
  setUserProfile: (profile: UserProfile) => void;

  // Computed (read-only derived values exposed as getters)
  getStreak: () => number;

  /** Per-user isolation: clear data when switching to a different account. */
  resetForUser: (userId: string) => void;
}

export type WorkoutStore = WorkoutState & WorkoutActions;

// ── Store ──────────────────────────────────────────────────────────────────

/**
 * useWorkoutStore
 *
 * Manages workout routines, live sessions, and session history.
 * Persisted to localStorage under key `up_workouts`.
 * History is capped at 100 sessions to bound storage size.
 */
export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    immer((set, get) => ({
      routines: [],
      workoutHistory: [],
      activeSession: null,
      userProfile: null,
      ownedBy: '',

      // ── Routine CRUD ──────────────────────────────────────────────────────

      addRoutine: (input) =>
        set((draft) => {
          draft.routines.push({
            id: uid(),
            name: '',
            exercises: [],
            createdAt: Date.now(),
            ...input,
          } satisfies Routine);
        }),

      updateRoutine: (id, updates) =>
        set((draft) => {
          const routine = draft.routines.find((r) => r.id === id);
          if (routine) Object.assign(routine, updates);
        }),

      deleteRoutine: (id) =>
        set((draft) => {
          draft.routines = draft.routines.filter((r) => r.id !== id);
        }),

      // ── Session Lifecycle ─────────────────────────────────────────────────

      startSession: (routine) =>
        set((draft) => {
          draft.activeSession = {
            id: uid(),
            routineId: routine.id,
            routineName: routine.name,
            exercises: routine.exercises.map((ex) => ({
              ...ex,
              sets: ex.sets.map((s) => ({
                ...s,
                completed: false,
                actualReps: s.reps,
                actualWeight: s.weight,
              })),
            })),
            currentExIndex: 0,
            currentSetIndex: 0,
            startedAt: Date.now(),
          } satisfies WorkoutSession;
        }),

      completeSet: (exIndex, setIndex, weight, reps) =>
        set((draft) => {
          if (!draft.activeSession) return;
          const set_ = draft.activeSession.exercises[exIndex]?.sets[setIndex];
          if (set_) {
            set_.completed = true;
            set_.actualWeight = weight;
            set_.actualReps = reps;
          }
        }),

      endSession: () =>
        set((draft) => {
          if (!draft.activeSession) return;
          const completedAt = Date.now();
          const session: WorkoutSession = {
            ...draft.activeSession,
            completedAt,
            duration: Math.round(
              (completedAt - draft.activeSession.startedAt) / 1000 / 60,
            ),
          };
          draft.workoutHistory.unshift(session);
          if (draft.workoutHistory.length > 100) {
            draft.workoutHistory = draft.workoutHistory.slice(0, 100);
          }
          draft.activeSession = null;
        }),

      cancelSession: () =>
        set((draft) => {
          draft.activeSession = null;
        }),

      // ── Profile ────────────────────────────────────────────────────────────

      setUserProfile: (profile) =>
        set((draft) => {
          draft.userProfile = profile;
        }),

      // ── Computed ──────────────────────────────────────────────────────────

      getStreak: () => calcWorkoutStreak(get().workoutHistory),

      resetForUser: (userId) =>
        set((draft) => {
          if (draft.ownedBy === userId || userId === 'guest') return;
          if (draft.ownedBy === '') { draft.ownedBy = userId; return; }
          draft.routines = [];
          draft.workoutHistory = [];
          draft.activeSession = null;
          draft.userProfile = null;
          draft.ownedBy = userId;
        }),
    })),
    { name: 'up_workouts' },
  ),
);
