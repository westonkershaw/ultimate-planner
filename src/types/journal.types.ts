import type { ID } from './common.types';

export type JournalRating = 0 | 1 | 2 | 3 | 4 | 5;

export interface JournalEntry {
  id: ID;
  /** YYYY-MM-DD (local) */
  date: string;
  text: string;
  rating: JournalRating;
  mood?: string;
  prompt?: string;
  gratitude?: string;
  tags: string[];
  /** Photo URLs or data URIs */
  photos: string[];
  /** AI-generated weekly insight blurb (optional, populated server-side) */
  aiInsight?: string;
  /** Created/updated unix ms */
  updatedAt: number;
}
