/**
 * planSuggest.test.ts — the profile → pre-filled plan closed loop.
 */

import { describe, it, expect } from 'vitest';
import { suggestWeekPlan, suggestMonthPlan } from './planSuggest';
import { emptyProfile } from './profileEngine';
import type { LearnedProfile } from '@/types';

function profileWith(patch: Partial<LearnedProfile>): LearnedProfile {
  return { ...emptyProfile('u1'), ...patch };
}

describe('suggestWeekPlan', () => {
  it('fills all 7 days with non-empty intentions even for an empty profile', () => {
    const plan = suggestWeekPlan(emptyProfile('u1'));
    expect(plan.days).toHaveLength(7);
    expect(plan.days.every((d) => d.intention.length > 0)).toBe(true);
    expect(plan.days.map((d) => d.dayIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(plan.basis).toMatch(/balanced/i);
  });

  it('leans into preferred categories and cites the real completion rate', () => {
    const p = profileWith({
      preferences: { ...emptyProfile('u1').preferences, preferredCategories: ['health'] },
      behavior: {
        ...emptyProfile('u1').behavior,
        completionByCategory: { health: { done: 8, skipped: 2, rate: 0.8 } },
      },
    });
    const plan = suggestWeekPlan(p);
    expect(plan.days.some((d) => d.category === 'health')).toBe(true);
    const healthDay = plan.days.find((d) => d.category === 'health')!;
    expect(healthDay.rationale).toMatch(/80%/);
    expect(plan.basis).toMatch(/health/);
  });

  it('never suggests an avoided category', () => {
    const p = profileWith({
      preferences: { ...emptyProfile('u1').preferences, avoidCategories: ['focus', 'health'] },
    });
    const plan = suggestWeekPlan(p);
    expect(plan.days.every((d) => d.category !== 'focus' && d.category !== 'health')).toBe(true);
  });

  it('pins an intention to a goal in that category', () => {
    const p = profileWith({
      identity: { values: [], goals: [{ id: 'g1', title: 'Run a 10k', category: 'health' }] },
      preferences: { ...emptyProfile('u1').preferences, preferredCategories: ['health'] },
    });
    const plan = suggestWeekPlan(p);
    const healthDay = plan.days.find((d) => d.category === 'health')!;
    expect(healthDay.intention).toContain('Run a 10k');
    expect(healthDay.rationale).toContain('Run a 10k');
  });

  it('suggests gentler energy on weekends by default', () => {
    const plan = suggestWeekPlan(emptyProfile('u1'));
    expect(plan.days[5]!.energyLevel).toBeLessThanOrEqual(2); // Sat
    expect(plan.days[6]!.energyLevel).toBeLessThanOrEqual(2); // Sun
  });
});

describe('suggestMonthPlan', () => {
  it('produces up to three themed focuses', () => {
    const plan = suggestMonthPlan(emptyProfile('u1'));
    expect(plan.focuses.length).toBeGreaterThan(0);
    expect(plan.focuses.length).toBeLessThanOrEqual(3);
    expect(plan.focuses.every((f) => f.focus.length > 0 && f.rationale.length > 0)).toBe(true);
  });

  it('anchors focuses to goals when present', () => {
    const p = profileWith({
      identity: { values: [], goals: [{ id: 'g1', title: 'Ship the app', category: 'focus' }] },
    });
    const plan = suggestMonthPlan(p);
    expect(plan.focuses.some((f) => f.focus.includes('Ship the app'))).toBe(true);
    expect(plan.basis).toMatch(/goals/i);
  });
});
