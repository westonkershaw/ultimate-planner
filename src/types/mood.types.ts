import type { ID } from './common.types';

/** 1 (rough) → 5 (great); 0 = not logged */
export type MoodScore = 0 | 1 | 2 | 3 | 4 | 5;

export interface MoodEntry {
  id: ID;
  /** YYYY-MM-DD (local) */
  date: string;
  score: MoodScore;
  note?: string;
  /** ISO timestamp the entry was logged */
  timestamp: string;
}
