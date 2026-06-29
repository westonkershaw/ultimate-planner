import type { ID } from './common.types';

export type VisionCardType = 'goal' | 'quote' | 'affirmation' | 'note';

export interface VisionCard {
  id: ID;
  type: VisionCardType;
  content: string;
  /** CSS color string, e.g. '#6366f1' */
  color?: string;
}

export interface VisionBoard {
  id: ID;
  name: string;
  /** Accent color for the board chip + frame */
  color: string;
  cards: VisionCard[];
  createdAt: number;
}
