import type { ID } from './common.types';

export type TripStatus = 'planning' | 'active' | 'done';

export interface TripExpense {
  id: ID;
  /** YYYY-MM-DD */
  date: string;
  category?: string;
  description: string;
  amount: number;
}

export interface Trip {
  id: ID;
  name: string;
  destination: string;
  emoji?: string;
  /** YYYY-MM-DD */
  startDate?: string;
  /** YYYY-MM-DD */
  endDate?: string;
  budget: number;
  currency: string;
  coverColor?: string;
  notes?: string;
  status: TripStatus;
  expenses: TripExpense[];
}
