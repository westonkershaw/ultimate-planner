import type { ID } from './common.types';

export interface Flashcard {
  id: ID;
  front: string;
  back: string;
  /** Number of times reviewed. */
  reviews: number;
  /** Last grade 1-5 (1 = forgot, 5 = perfect). 0 = never graded. */
  lastGrade: 0 | 1 | 2 | 3 | 4 | 5;
}

export interface FlashcardDeck {
  id: ID;
  name: string;
  emoji: string;
  color: string;
  description?: string;
  cards: Flashcard[];
  /** ISO timestamp */
  createdAt: string;
  totalReviews: number;
  /** YYYY-MM-DD of last study session */
  lastStudied: string | null;
}

export interface StudySession {
  id: ID;
  deckId: ID;
  /** YYYY-MM-DD */
  date: string;
  cardsReviewed: number;
  /** Seconds */
  duration: number;
}
