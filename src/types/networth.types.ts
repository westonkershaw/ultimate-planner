import type { ID } from './common.types';

export interface NetWorthAsset {
  id: ID;
  name: string;
  value: number;
  category?: string;
  notes?: string;
}

export interface NetWorthLiability {
  id: ID;
  name: string;
  balance: number;
  category?: string;
  notes?: string;
}

export interface NetWorthSnapshot {
  /** YYYY-MM-DD */
  date: string;
  netWorth: number;
  assets: number;
  liabilities: number;
}
