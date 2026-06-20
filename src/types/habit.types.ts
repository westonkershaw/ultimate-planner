import type { ID } from './common.types';

export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom';

export interface Habit {
  id: ID;
  name: string;
  emoji: string;
  color: string;
  category?: string;
  frequency: HabitFrequency;
  /** Days of week for custom frequency: 'Mon' | 'Tue' | ... */
  customDays?: string[];
  /** Target completions per day (default 1). */
  target: number;
  /** Date (YYYY-MM-DD) → completion count for that day. */
  logs: Record<string, number>;
  archived: boolean;
  createdAt: number;
}
