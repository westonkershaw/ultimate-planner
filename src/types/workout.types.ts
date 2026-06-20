import type { ID, Timestamp } from './common.types';

/** A single planned set within an exercise template */
export interface PlannedSet {
  reps: number;
  weight: number;
  /** Rest duration in seconds after this set */
  rest?: number;
}

/** A planned set that has been executed during a live session */
export interface CompletedSet extends PlannedSet {
  completed: boolean;
  actualReps: number;
  actualWeight: number;
}

/** An exercise within a routine template */
export interface RoutineExercise {
  id: ID;
  name: string;
  sets: PlannedSet[];
  notes?: string;
}

/** An exercise as it appears inside an active or completed session */
export interface SessionExercise {
  id: ID;
  name: string;
  sets: CompletedSet[];
  notes?: string;
}

export interface Routine {
  id: ID;
  name: string;
  exercises: RoutineExercise[];
  createdAt: Timestamp;
}

export interface WorkoutSession {
  id: ID;
  routineId: ID;
  routineName: string;
  exercises: SessionExercise[];
  currentExIndex: number;
  currentSetIndex: number;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  /** Session duration in minutes, set on end */
  duration?: number;
}

/** Biological sex for BMR calculation */
export type BiologicalSex = 'male' | 'female';

/** PAL multiplier keys */
export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active';

export interface UserProfile {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: BiologicalSex;
  activityLevel: ActivityLevel;
}

export type CreateRoutineInput = Omit<Routine, 'id' | 'createdAt'>;
export type UpdateRoutineInput = Partial<Omit<Routine, 'id'>>;
