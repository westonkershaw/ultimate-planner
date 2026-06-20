/**
 * workoutUtils.test.ts
 *
 * Comprehensive tests for all functions exported from workoutUtils.ts.
 * Covers 1RM estimators, volume calculations, progression, rest formatting,
 * and streak calculation.
 */

import { describe, it, expect } from 'vitest';
import {
  calcEpley1RM,
  calcBrzycki1RM,
  calcExerciseVolume,
  calcSessionExerciseVolume,
  calcSessionVolume,
  countCompletedSets,
  suggestLinearProgression,
  formatRestTime,
  calcWorkoutStreak,
} from './workoutUtils';
import type { RoutineExercise, SessionExercise, WorkoutSession } from '@/types';

// ── calcEpley1RM ───────────────────────────────────────────────────────────

describe('calcEpley1RM', () => {
  it('225lbs × 10 reps → ~300lbs (Epley: weight × (1 + reps/30))', () => {
    // Math.round(225 * (1 + 10/30)) = Math.round(225 * 1.333...) = Math.round(300) = 300
    expect(calcEpley1RM(225, 10)).toBe(300);
  });

  it('135lbs × 1 rep → 135lbs (no formula needed, direct return)', () => {
    expect(calcEpley1RM(135, 1)).toBe(135);
  });

  it('315lbs × 5 reps → ~368lbs', () => {
    // Math.round(315 * (1 + 5/30)) = Math.round(315 * 1.1666...) = Math.round(367.5) = 368
    expect(calcEpley1RM(315, 5)).toBe(368);
  });

  it('100lbs × 20 reps → correct Epley estimate', () => {
    // Math.round(100 * (1 + 20/30)) = Math.round(100 * 1.6666...) = Math.round(166.66) = 167
    expect(calcEpley1RM(100, 20)).toBe(167);
  });

  it('throws on weight ≤ 0', () => {
    expect(() => calcEpley1RM(0, 10)).toThrow(RangeError);
    expect(() => calcEpley1RM(-50, 10)).toThrow(RangeError);
  });

  it('throws on reps < 1', () => {
    expect(() => calcEpley1RM(100, 0)).toThrow(RangeError);
    expect(() => calcEpley1RM(100, -1)).toThrow(RangeError);
  });

  it('1RM is at least the working weight', () => {
    expect(calcEpley1RM(200, 5)).toBeGreaterThanOrEqual(200);
  });
});

// ── calcBrzycki1RM ─────────────────────────────────────────────────────────

describe('calcBrzycki1RM', () => {
  it('225lbs × 1 rep → 225lbs (direct return)', () => {
    expect(calcBrzycki1RM(225, 1)).toBe(225);
  });

  it('225lbs × 10 reps → correct Brzycki estimate', () => {
    // Math.round(225 * 36 / (37 - 10)) = Math.round(8100 / 27) = Math.round(300) = 300
    expect(calcBrzycki1RM(225, 10)).toBe(300);
  });

  it('315lbs × 5 reps → correct Brzycki estimate', () => {
    // Math.round(315 * 36 / (37 - 5)) = Math.round(11340 / 32) = Math.round(354.375) = 354
    expect(calcBrzycki1RM(315, 5)).toBe(354);
  });

  it('throws on weight ≤ 0', () => {
    expect(() => calcBrzycki1RM(0, 5)).toThrow(RangeError);
  });

  it('throws on reps < 1', () => {
    expect(() => calcBrzycki1RM(100, 0)).toThrow(RangeError);
  });

  it('throws on reps > 36', () => {
    expect(() => calcBrzycki1RM(100, 37)).toThrow(RangeError);
  });
});

// ── calcExerciseVolume ────────────────────────────────────────────────────

describe('calcExerciseVolume', () => {
  it('3 sets × 10 reps × 225lbs = 6750lbs volume', () => {
    const exercise: RoutineExercise = {
      id: 'ex1',
      name: 'Bench Press',
      sets: [
        { weight: 225, reps: 10 },
        { weight: 225, reps: 10 },
        { weight: 225, reps: 10 },
      ],
    };
    expect(calcExerciseVolume(exercise)).toBe(6750);
  });

  it('empty sets array → 0', () => {
    const exercise: RoutineExercise = {
      id: 'ex1',
      name: 'Bench Press',
      sets: [],
    };
    expect(calcExerciseVolume(exercise)).toBe(0);
  });

  it('mixed weight sets accumulate correctly', () => {
    const exercise: RoutineExercise = {
      id: 'ex1',
      name: 'Squat',
      sets: [
        { weight: 135, reps: 5 },
        { weight: 185, reps: 5 },
        { weight: 225, reps: 3 },
      ],
    };
    // 135*5 + 185*5 + 225*3 = 675 + 925 + 675 = 2275
    expect(calcExerciseVolume(exercise)).toBe(2275);
  });
});

// ── calcSessionExerciseVolume ─────────────────────────────────────────────

describe('calcSessionExerciseVolume', () => {
  it('counts only completed sets', () => {
    const exercise: SessionExercise = {
      id: 'ex1',
      name: 'Deadlift',
      sets: [
        { weight: 225, reps: 5, completed: true, actualWeight: 225, actualReps: 5 },
        { weight: 225, reps: 5, completed: false, actualWeight: 0, actualReps: 0 },
        { weight: 225, reps: 5, completed: true, actualWeight: 225, actualReps: 4 },
      ],
    };
    // completed sets: 225*5 + 225*4 = 1125 + 900 = 2025
    expect(calcSessionExerciseVolume(exercise)).toBe(2025);
  });

  it('all sets incomplete → 0', () => {
    const exercise: SessionExercise = {
      id: 'ex1',
      name: 'OHP',
      sets: [
        { weight: 135, reps: 8, completed: false, actualWeight: 0, actualReps: 0 },
      ],
    };
    expect(calcSessionExerciseVolume(exercise)).toBe(0);
  });

  it('empty sets array → 0', () => {
    const exercise: SessionExercise = {
      id: 'ex1',
      name: 'Curl',
      sets: [],
    };
    expect(calcSessionExerciseVolume(exercise)).toBe(0);
  });
});

// ── calcSessionVolume ─────────────────────────────────────────────────────

describe('calcSessionVolume', () => {
  it('sums volume across all exercises in session', () => {
    const session: WorkoutSession = {
      id: 's1',
      routineId: 'r1',
      routineName: 'Push Day',
      exercises: [
        {
          id: 'ex1',
          name: 'Bench',
          sets: [
            { weight: 225, reps: 5, completed: true, actualWeight: 225, actualReps: 5 },
          ],
        },
        {
          id: 'ex2',
          name: 'OHP',
          sets: [
            { weight: 135, reps: 8, completed: true, actualWeight: 135, actualReps: 8 },
          ],
        },
      ],
      currentExIndex: 0,
      currentSetIndex: 0,
      startedAt: new Date('2024-01-01').getTime(),
    };
    // 225*5 + 135*8 = 1125 + 1080 = 2205
    expect(calcSessionVolume(session)).toBe(2205);
  });

  it('empty exercises → 0', () => {
    const session: WorkoutSession = {
      id: 's1',
      routineId: 'r1',
      routineName: 'Empty',
      exercises: [],
      currentExIndex: 0,
      currentSetIndex: 0,
      startedAt: new Date('2024-01-01').getTime(),
    };
    expect(calcSessionVolume(session)).toBe(0);
  });
});

// ── countCompletedSets ────────────────────────────────────────────────────

describe('countCompletedSets', () => {
  it('counts completed sets across all exercises', () => {
    const session: WorkoutSession = {
      id: 's1',
      routineId: 'r1',
      routineName: 'Test',
      exercises: [
        {
          id: 'ex1',
          name: 'Bench',
          sets: [
            { weight: 200, reps: 5, completed: true, actualWeight: 200, actualReps: 5 },
            { weight: 200, reps: 5, completed: false, actualWeight: 0, actualReps: 0 },
          ],
        },
        {
          id: 'ex2',
          name: 'Row',
          sets: [
            { weight: 150, reps: 8, completed: true, actualWeight: 150, actualReps: 8 },
            { weight: 150, reps: 8, completed: true, actualWeight: 150, actualReps: 8 },
          ],
        },
      ],
      currentExIndex: 0,
      currentSetIndex: 0,
      startedAt: new Date('2024-01-01').getTime(),
    };
    expect(countCompletedSets(session)).toBe(3);
  });

  it('no completed sets → 0', () => {
    const session: WorkoutSession = {
      id: 's1',
      routineId: 'r1',
      routineName: 'Test',
      exercises: [
        {
          id: 'ex1',
          name: 'Bench',
          sets: [
            { weight: 200, reps: 5, completed: false, actualWeight: 0, actualReps: 0 },
          ],
        },
      ],
      currentExIndex: 0,
      currentSetIndex: 0,
      startedAt: new Date('2024-01-01').getTime(),
    };
    expect(countCompletedSets(session)).toBe(0);
  });
});

// ── suggestLinearProgression ───────────────────────────────────────────────

describe('suggestLinearProgression', () => {
  it('all sets completed → adds increment', () => {
    expect(suggestLinearProgression(100, 3, 3, 5)).toBe(102.5);
  });

  it('not all sets completed → same weight', () => {
    expect(suggestLinearProgression(100, 2, 3, 5)).toBe(100);
  });

  it('custom increment applied on success', () => {
    expect(suggestLinearProgression(200, 4, 4, 8, 5)).toBe(205);
  });

  it('default increment is 2.5', () => {
    expect(suggestLinearProgression(150, 3, 3, 5)).toBe(152.5);
  });
});

// ── formatRestTime ─────────────────────────────────────────────────────────

describe('formatRestTime', () => {
  it('90 seconds → "1:30"', () => {
    expect(formatRestTime(90)).toBe('1:30');
  });

  it('60 seconds → "1:00"', () => {
    expect(formatRestTime(60)).toBe('1:00');
  });

  it('45 seconds → "0:45"', () => {
    expect(formatRestTime(45)).toBe('0:45');
  });

  it('0 seconds → "0:00"', () => {
    expect(formatRestTime(0)).toBe('0:00');
  });

  it('150 seconds → "2:30"', () => {
    expect(formatRestTime(150)).toBe('2:30');
  });

  it('9 seconds → "0:09" (zero-padded)', () => {
    expect(formatRestTime(9)).toBe('0:09');
  });

  it('throws on negative seconds', () => {
    expect(() => formatRestTime(-1)).toThrow(RangeError);
  });
});

// ── calcWorkoutStreak ──────────────────────────────────────────────────────

describe('calcWorkoutStreak', () => {
  it('empty sessions → 0', () => {
    expect(calcWorkoutStreak([])).toBe(0);
  });

  it('no completedAt values → 0', () => {
    expect(calcWorkoutStreak([{ completedAt: undefined }, { completedAt: undefined }])).toBe(0);
  });

  it('single session today → streak of at least 1', () => {
    const today = new Date();
    const streak = calcWorkoutStreak([{ completedAt: today.getTime() }]);
    expect(streak).toBeGreaterThanOrEqual(1);
  });

  it('consecutive days starting today → correct streak count', () => {
    const sessions = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      sessions.push({ completedAt: d.getTime() });
    }
    expect(calcWorkoutStreak(sessions)).toBe(5);
  });

  it('gap in sessions breaks streak', () => {
    // Session today and 2 days ago (gap yesterday) → streak = 1
    const today = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(today.getDate() - 2);
    const streak = calcWorkoutStreak([
      { completedAt: today.getTime() },
      { completedAt: twoDaysAgo.getTime() },
    ]);
    expect(streak).toBe(1);
  });
});
