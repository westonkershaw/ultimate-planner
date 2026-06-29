export interface WellnessDay {
  /** Glasses of water drunk (0-8+) */
  water: number;
  /** Logged a meditation session */
  meditated: boolean;
  /** Got movement / exercise */
  moved: boolean;
}

/** Daily wellness log indexed by YYYY-MM-DD */
export type WellnessLog = Record<string, WellnessDay>;
