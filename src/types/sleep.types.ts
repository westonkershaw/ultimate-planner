import type { ID } from './common.types';

/** 1-5 self-rated sleep quality (0 = unrated) */
export type SleepQuality = 0 | 1 | 2 | 3 | 4 | 5;

export interface SleepEntry {
  id: ID;
  /** YYYY-MM-DD (local) — date the user woke up */
  date: string;
  /** "HH:MM" 24h */
  bedTime: string;
  /** "HH:MM" 24h */
  wakeTime: string;
  quality: SleepQuality;
  notes?: string;
  updatedAt: number;
}
