// ── Shared Primitive Types ──────────────────────────────────────────────────

/** Opaque string ID (generated via uid()) */
export type ID = string;

/** Unix timestamp in milliseconds */
export type Timestamp = number;

/** Priority levels used across tasks and goals */
export type Priority = 'low' | 'medium' | 'high';

/** Toast notification variants */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

/** Top-level navigation views */
export type ActiveView =
  | 'dashboard'
  | 'tasks'
  | 'workouts'
  | 'finance'
  | 'explore'
  | 'settings'
  // Plan
  | 'goals'
  | 'projects'
  | 'timeblock'
  | 'focus'
  // Health
  | 'sleep'
  | 'mood'
  | 'wellness'
  | 'meals'
  | 'body'
  // Money
  | 'networth'
  // Grow
  | 'habits'
  | 'journal'
  | 'reading'
  | 'study'
  | 'vision'
  | 'travel'
  | 'social'
  | 'insights'
  | 'community';

export interface Toast {
  id: ID;
  message: string;
  type: ToastType;
  createdAt: Timestamp;
}
