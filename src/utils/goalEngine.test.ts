/**
 * goalEngine.test.ts
 *
 * Coverage for all three Goal kinds, pace math, the legacy → unified
 * migration, and the back-compat `getProgress` shim.
 */

import { describe, it, expect } from 'vitest';
import {
  getProgress,
  isComplete,
  migrateGoals,
  paceFor,
  progressFor,
  reconcileCurrent,
} from './goalEngine';
import type {
  HabitGoal,
  LegacyFinancialGoal,
  LegacyYearlyGoal,
  NumericGoal,
  OutcomeGoal,
} from '@/types';

// ── Legacy financial in getProgress shim ──────────────────────────────────

describe('getProgress on LegacyFinancialGoal', () => {
  it('returns 100 × saved / targetAmount', () => {
    const g: LegacyFinancialGoal = {
      id: 'f', name: 'Fund', targetAmount: 10000, saved: 2500, deposits: [],
    };
    expect(getProgress(g)).toBe(25);
  });

  it('returns 0 when targetAmount is 0', () => {
    const g: LegacyFinancialGoal = {
      id: 'f', name: 'Fund', targetAmount: 0, saved: 100, deposits: [],
    };
    expect(getProgress(g)).toBe(0);
  });

  it('clamps to 100 when overshooting', () => {
    const g: LegacyFinancialGoal = {
      id: 'f', name: 'Fund', targetAmount: 1000, saved: 5000, deposits: [],
    };
    expect(getProgress(g)).toBe(100);
  });
});

// ── Fixtures ───────────────────────────────────────────────────────────────

function baseOutcome(over: Partial<OutcomeGoal> = {}): OutcomeGoal {
  return {
    kind: 'outcome',
    id: 'g1',
    title: 'Test outcome goal',
    category: 'intellectual',
    createdAt: '2026-01-01T00:00:00.000Z',
    milestones: [],
    weeklyFocus: [],
    ...over,
  };
}

function baseNumeric(over: Partial<NumericGoal> = {}): NumericGoal {
  return {
    kind: 'numeric',
    id: 'n1',
    title: 'Test numeric goal',
    category: 'financial',
    createdAt: '2026-01-01T00:00:00.000Z',
    milestones: [],
    weeklyFocus: [],
    numeric: { unit: '$', start: 0, current: 0, target: 1000, entries: [] },
    ...over,
  };
}

function baseHabit(over: Partial<HabitGoal> = {}): HabitGoal {
  return {
    kind: 'habit',
    id: 'h1',
    title: 'Test habit goal',
    category: 'physical',
    createdAt: '2026-01-01T00:00:00.000Z',
    milestones: [],
    weeklyFocus: [],
    habit: { kiId: 'ki1', targetPerWeek: 5, weeksTarget: 12 },
    ...over,
  };
}

// ── progressFor: outcome ───────────────────────────────────────────────────

describe('progressFor: outcome', () => {
  it('returns 0 when no milestones', () => {
    expect(progressFor(baseOutcome())).toBe(0);
  });

  it('handles equal-weight milestones', () => {
    const g = baseOutcome({
      milestones: [
        { id: 'm1', title: 'A', weight: 1, done: true },
        { id: 'm2', title: 'B', weight: 1, done: true },
        { id: 'm3', title: 'C', weight: 1, done: false },
        { id: 'm4', title: 'D', weight: 1, done: false },
      ],
    });
    expect(progressFor(g)).toBe(50);
  });

  it('respects milestone weights', () => {
    const g = baseOutcome({
      milestones: [
        { id: 'm1', title: 'Big', weight: 3, done: true },
        { id: 'm2', title: 'Small', weight: 1, done: false },
      ],
    });
    expect(progressFor(g)).toBe(75);
  });

  it('treats zero-weight total as 0', () => {
    const g = baseOutcome({
      milestones: [{ id: 'm1', title: 'A', weight: 0, done: true }],
    });
    expect(progressFor(g)).toBe(0);
  });
});

// ── progressFor: numeric ───────────────────────────────────────────────────

describe('progressFor: numeric', () => {
  it('savings-style 60% of target', () => {
    const g = baseNumeric({
      numeric: { unit: '$', start: 0, current: 600, target: 1000, entries: [] },
    });
    expect(progressFor(g)).toBe(60);
  });

  it('weight-loss style (target < start)', () => {
    const g = baseNumeric({
      numeric: { unit: 'lb', start: 200, current: 190, target: 180, entries: [] },
    });
    expect(progressFor(g)).toBe(50);
  });

  it('clamps to 100 when overshooting target', () => {
    const g = baseNumeric({
      numeric: { unit: '$', start: 0, current: 2000, target: 1000, entries: [] },
    });
    expect(progressFor(g)).toBe(100);
  });

  it('clamps to 0 when going backwards from start', () => {
    const g = baseNumeric({
      numeric: { unit: '$', start: 0, current: -50, target: 1000, entries: [] },
    });
    expect(progressFor(g)).toBe(0);
  });

  it('zero-span goal: 100 if at target, else 0', () => {
    const atTarget = baseNumeric({
      numeric: { unit: '$', start: 500, current: 500, target: 500, entries: [] },
    });
    const off = baseNumeric({
      numeric: { unit: '$', start: 500, current: 400, target: 500, entries: [] },
    });
    expect(progressFor(atTarget)).toBe(100);
    expect(progressFor(off)).toBe(0);
  });
});

describe('reconcileCurrent', () => {
  it('uses stored current when finite', () => {
    const g = baseNumeric({
      numeric: { unit: '$', start: 0, current: 700, target: 1000, entries: [
        { id: 'e1', date: '2026-02-01', delta: 500 },
      ] },
    });
    expect(reconcileCurrent(g)).toBe(700);
  });

  it('falls back to start + Σ delta when current is NaN', () => {
    const g = baseNumeric({
      numeric: {
        unit: '$',
        start: 100,
        current: Number.NaN,
        target: 1000,
        entries: [
          { id: 'e1', date: '2026-02-01', delta: 200 },
          { id: 'e2', date: '2026-03-01', delta: 300 },
        ],
      },
    });
    expect(reconcileCurrent(g)).toBe(600);
  });
});

// ── progressFor: habit ─────────────────────────────────────────────────────

describe('progressFor: habit', () => {
  it('0 when no weeks logged', () => {
    expect(progressFor(baseHabit())).toBe(0);
  });

  it('counts done weeklyFocus entries against weeksTarget', () => {
    const g = baseHabit({
      habit: { kiId: 'ki1', targetPerWeek: 5, weeksTarget: 10 },
      weeklyFocus: [
        { weekOf: '2026-01-05', action: 'x', done: true },
        { weekOf: '2026-01-12', action: 'x', done: true },
        { weekOf: '2026-01-19', action: 'x', done: false },
      ],
    });
    expect(progressFor(g)).toBe(20);
  });

  it('handles weeksTarget=0 without throwing', () => {
    const g = baseHabit({
      habit: { kiId: 'ki1', targetPerWeek: 5, weeksTarget: 0 },
    });
    expect(progressFor(g)).toBe(0);
  });
});

// ── isComplete ─────────────────────────────────────────────────────────────

describe('isComplete', () => {
  it('true at 100', () => {
    const g = baseOutcome({
      milestones: [{ id: 'm1', title: 'A', weight: 1, done: true }],
    });
    expect(isComplete(g)).toBe(true);
  });

  it('false below 100', () => {
    const g = baseOutcome({
      milestones: [
        { id: 'm1', title: 'A', weight: 1, done: true },
        { id: 'm2', title: 'B', weight: 1, done: false },
      ],
    });
    expect(isComplete(g)).toBe(false);
  });
});

// ── paceFor ────────────────────────────────────────────────────────────────

describe('paceFor', () => {
  const FROZEN_NOW = Date.parse('2026-06-01T00:00:00.000Z');

  it('returns "unknown" when no deadline', () => {
    const p = paceFor(baseOutcome(), FROZEN_NOW);
    expect(p.status).toBe('unknown');
    expect(p.expected).toBe(0);
  });

  it('"on-track" when actual matches elapsed time', () => {
    // Year-long goal, half-elapsed, half-progress = on-track
    const g = baseOutcome({
      createdAt: '2026-01-01T00:00:00.000Z',
      deadline: '2026-12-31T00:00:00.000Z',
      milestones: [
        { id: 'm1', title: 'A', weight: 1, done: true },
        { id: 'm2', title: 'B', weight: 1, done: false },
      ],
    });
    const p = paceFor(g, FROZEN_NOW);
    // ~5 of 12 months elapsed → expected ~41%, actual 50% → diff +9 → ahead
    expect(p.status).toBe('ahead');
  });

  it('"behind" when actual lags elapsed time', () => {
    const g = baseOutcome({
      createdAt: '2026-01-01T00:00:00.000Z',
      deadline: '2026-07-01T00:00:00.000Z',
      milestones: [
        { id: 'm1', title: 'A', weight: 1, done: true },
        { id: 'm2', title: 'B', weight: 1, done: false },
        { id: 'm3', title: 'C', weight: 1, done: false },
        { id: 'm4', title: 'D', weight: 1, done: false },
      ],
    });
    // ~83% elapsed by 2026-06-01, actual 25% → behind
    const p = paceFor(g, FROZEN_NOW);
    expect(p.status).toBe('behind');
  });

  it('"behind" when deadline is invalid (dueAt ≤ createdAt)', () => {
    const g = baseOutcome({
      createdAt: '2026-06-01T00:00:00.000Z',
      deadline: '2026-01-01T00:00:00.000Z',
    });
    const p = paceFor(g, FROZEN_NOW);
    expect(p.status).toBe('behind');
    expect(p.expected).toBe(100);
  });
});

// ── getProgress shim ───────────────────────────────────────────────────────

describe('getProgress shim', () => {
  it('reads new Goal via progressFor', () => {
    const g = baseOutcome({
      milestones: [
        { id: 'm1', title: 'A', weight: 1, done: true },
        { id: 'm2', title: 'B', weight: 1, done: false },
      ],
    });
    expect(getProgress(g)).toBe(50);
  });

  it('reads legacy yearlyGoal.progress directly', () => {
    const legacy: LegacyYearlyGoal = {
      id: 'old1',
      title: 'Old goal',
      category: 'physical',
      progress: 73,
    };
    expect(getProgress(legacy)).toBe(73);
  });

  it('clamps legacy out-of-range values', () => {
    const tooHigh: LegacyYearlyGoal = {
      id: 'h', title: 'h', category: 'physical', progress: 150,
    };
    const tooLow: LegacyYearlyGoal = {
      id: 'l', title: 'l', category: 'physical', progress: -5,
    };
    expect(getProgress(tooHigh)).toBe(100);
    expect(getProgress(tooLow)).toBe(0);
  });
});

// ── migrateGoals ───────────────────────────────────────────────────────────

describe('migrateGoals', () => {
  const FROZEN_NOW = Date.parse('2026-06-01T12:00:00.000Z'); // a Monday

  it('migrates yearly goal with steps → outcome with milestones', () => {
    const old: LegacyYearlyGoal = {
      id: 'dg1',
      title: 'Run a half marathon',
      category: 'physical',
      progress: 35,
      target: '2026-12-31',
      steps: [
        { id: 's1', text: 'Run 3x/week', done: true },
        { id: 's2', text: '10K race', done: false },
      ],
      weekSteps: 'Run 4 miles Tue/Thu',
      createdAt: '2026-04-01T00:00:00.000Z',
    };
    const [migrated] = migrateGoals([old], [], FROZEN_NOW);
    expect(migrated).toBeDefined();
    if (!migrated || migrated.kind !== 'outcome') throw new Error('expected outcome');
    expect(migrated.id).toBe('dg1');
    expect(migrated.deadline).toBe('2026-12-31');
    expect(migrated.milestones).toHaveLength(2);
    expect(migrated.milestones[0]?.done).toBe(true);
    expect(migrated.milestones[1]?.done).toBe(false);
    expect(migrated.weeklyFocus).toHaveLength(1);
    expect(migrated.weeklyFocus[0]?.action).toBe('Run 4 miles Tue/Thu');
    // Progress derives from milestones (1 of 2 done = 50), not the old 35.
    expect(progressFor(migrated)).toBe(50);
  });

  it('preserves the old progress bar when no steps exist', () => {
    const old: LegacyYearlyGoal = {
      id: 'g',
      title: 'Manual progress goal',
      category: 'intellectual',
      progress: 60,
    };
    const [migrated] = migrateGoals([old], [], FROZEN_NOW);
    if (!migrated || migrated.kind !== 'outcome') throw new Error('expected outcome');
    expect(progressFor(migrated)).toBe(60);
  });

  it('keeps progress=100 from old data as a single synthetic milestone', () => {
    const old: LegacyYearlyGoal = {
      id: 'g100',
      title: 'Already done',
      category: 'spiritual',
      progress: 100,
    };
    const [migrated] = migrateGoals([old], [], FROZEN_NOW);
    if (!migrated || migrated.kind !== 'outcome') throw new Error('expected outcome');
    expect(progressFor(migrated)).toBe(100);
    expect(migrated.milestones).toHaveLength(1);
  });

  it('migrates financial goal → numeric with deltas', () => {
    const old: LegacyFinancialGoal = {
      id: 'dfg1',
      name: 'Emergency Fund',
      targetAmount: 15000,
      saved: 9000,
      deadline: '2026-12-31',
      deposits: [
        { id: 'd1', amount: 500, date: '2026-05-01', note: 'Auto-transfer' },
        { id: 'd2', amount: 300, date: '2026-05-15' },
      ],
    };
    const [migrated] = migrateGoals([], [old], FROZEN_NOW);
    if (!migrated || migrated.kind !== 'numeric') throw new Error('expected numeric');
    expect(migrated.id).toBe('dfg1');
    expect(migrated.title).toBe('Emergency Fund');
    expect(migrated.category).toBe('financial');
    expect(migrated.numeric.target).toBe(15000);
    expect(migrated.numeric.current).toBe(9000);
    // start backfilled so start + Σ deltas reconciles with `saved`
    expect(migrated.numeric.start).toBe(8200);
    expect(migrated.numeric.entries).toHaveLength(2);
    expect(progressFor(migrated)).toBeCloseTo(11.76, 1); // (9000-8200)/(15000-8200) ≈ 11.76%
  });

  it('handles empty inputs without throwing', () => {
    expect(migrateGoals([], [], FROZEN_NOW)).toEqual([]);
    expect(migrateGoals(undefined, undefined, FROZEN_NOW)).toEqual([]);
  });

  it('preserves task linkage by keeping the original goal id', () => {
    const old: LegacyYearlyGoal = {
      id: 'dg2',
      title: 'Save fund',
      category: 'financial',
      progress: 60,
    };
    const [migrated] = migrateGoals([old], [], FROZEN_NOW);
    expect(migrated?.id).toBe('dg2');
  });
});
