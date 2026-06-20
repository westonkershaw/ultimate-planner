import type { ID } from './common.types';

export type ReadingStatus = 'want' | 'reading' | 'done';

export interface Book {
  id: ID;
  title: string;
  author?: string;
  cover?: string;
  emoji?: string;
  status: ReadingStatus;
  /** 0-100 */
  progress: number;
  totalPages?: number;
  currentPage?: number;
  /** 0-5 stars (0 = unrated) */
  rating: number;
  notes?: string;
  aiSummary?: string;
  genre?: string;
  /** YYYY-MM-DD */
  startDate?: string;
  /** YYYY-MM-DD */
  finishDate?: string;
  /** YYYY-MM-DD when added to the list */
  addedAt: string;
}

export interface ReadingGoal {
  year: number;
  target: number;
}
