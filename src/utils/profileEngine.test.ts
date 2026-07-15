/**
 * profileEngine.test.ts — the deterministic learn step.
 */

import { describe, it, expect } from 'vitest';
import {
  emptyProfile,
  migrateProfile,
  deriveProfile,
  mergeInsights,
  timeOfDay,
  applyOverrides,
} from './profileEngine';
import type { LearnedProfile, LearningEvent, LearnedInsight } from '@/types';

const NOW = new Date('2026-07-13T10:00:00Z');

function ev(type: LearningEvent['type'], payload: LearningEvent['payload'] = {}): LearningEvent {
  return { id: Math.random().toString(36).slice(2), userId: 'u1', ts: NOW.toISOString(), type, payload };
}

describe('timeOfDay', () => {
  it('buckets hours', () => {
    expect(timeOfDay(8)).toBe('morning');
    expect(timeOfDay(14)).toBe('afternoon');
    expect(timeOfDay(20)).toBe('evening');
    expect(timeOfDay(2)).toBe('evening');
  });
});

describe('emptyProfile', () => {
  it('is a valid v1 profile', () => {
    const p = emptyProfile('u1');
    expect(p.schemaVersion).toBe(1);
    expect(p.userId).toBe('u1');
    expect(p.identity.goals).toEqual([]);
    expect(p.behavior.completionByTimeOfDay.morning).toEqual({ rate: 0, n: 0 });
  });
});

describe('migrateProfile', () => {
  it('coerces garbage to a valid profile without throwing', () => {
    expect(migrateProfile(null, 'u1').schemaVersion).toBe(1);
    expect(migrateProfile(42, 'u1').userId).toBe('u1');
    expect(migrateProfile('nope', 'u1').identity.values).toEqual([]);
  });

  it('preserves recognised fields from a partial older row', () => {
    const raw = {
      userId: 'old',
      identity: { values: ['health', 5], goals: [{ id: 'g1', title: 'Run', category: 'physical' }] },
      preferences: { planningHour: 9, weeklyPlanningStyle: 'detailed', junk: true },
      insights: [{ id: 'i1', text: 'x', kind: 'works', confidence: 2, evidenceCount: 3 }],
      overrides: { 'preferences.planningHour': 7 },
    };
    const p = migrateProfile(raw, 'fallback');
    expect(p.userId).toBe('old');
    expect(p.identity.values).toEqual(['health']); // non-strings dropped
    expect(p.identity.goals[0]!.title).toBe('Run');
    expect(p.preferences.planningHour).toBe(9);
    expect(p.preferences.weeklyPlanningStyle).toBe('detailed');
    expect(p.insights[0]!.confidence).toBe(1); // clamped 0–1
    expect(p.overrides['preferences.planningHour']).toBe(7);
  });
});

describe('deriveProfile — behavior aggregation', () => {
  const events: LearningEvent[] = [
    // health: 4 done, 0 skipped → rate 1.0 (preferred)
    ...Array.from({ length: 4 }, () => ev('task_completed', { category: 'health', hour: 8, weekday: 'Mon' })),
    // admin: 0 done, 4 skipped → rate 0 (avoid)
    ...Array.from({ length: 4 }, () => ev('task_skipped', { category: 'admin', hour: 14, weekday: 'Wed' })),
    ev('plan_accepted', { weekday: 'Sun', hour: 9, itemCount: 5 }),
    ev('plan_edited', { weekday: 'Sun', hour: 9, itemCount: 4, keptCount: 2 }),
    ev('week_reviewed', { weekday: 'Sun', hour: 9, rating: 4 }),
    ev('month_reviewed', { weekday: 'Sun', hour: 9, rating: 2 }),
  ];

  const p = deriveProfile({ current: emptyProfile('u1'), events, now: NOW });

  it('computes category completion rates', () => {
    expect(p.behavior.completionByCategory.health!.rate).toBe(1);
    expect(p.behavior.completionByCategory.admin!.rate).toBe(0);
  });

  it('derives preferred and avoid categories with min sample', () => {
    expect(p.preferences.preferredCategories).toContain('health');
    expect(p.preferences.avoidCategories).toContain('admin');
  });

  it('finds the productive time of day', () => {
    expect(p.behavior.completionByTimeOfDay.morning).toEqual({ rate: 1, n: 4 });
    expect(p.behavior.completionByTimeOfDay.afternoon).toEqual({ rate: 0, n: 4 });
  });

  it('learns planning day, hour, and style', () => {
    expect(p.preferences.planningDays).toEqual(['Sun']);
    expect(p.preferences.planningHour).toBe(9);
    expect(p.preferences.weeklyPlanningStyle).toBe('detailed'); // avg (5+4)/2 = 4.5 → detailed
  });

  it('computes plan adherence (kept ÷ suggested)', () => {
    // accepted: kept 5 of 5; edited: kept 2 of 4 → 7/9
    expect(p.behavior.planAdherence).toBeCloseTo(7 / 9, 5);
  });

  it('averages review ratings', () => {
    expect(p.behavior.avgReviewRating).toBe(3); // (4 + 2) / 2
  });

  it('produces ranked, non-empty insights', () => {
    expect(p.insights.length).toBeGreaterThan(0);
    expect(p.insights.some((i) => i.kind === 'works')).toBe(true);
    expect(p.insights.some((i) => i.kind === 'avoid')).toBe(true);
    expect(p.insights.length).toBeLessThanOrEqual(12);
  });
});

describe('deriveProfile — respects overrides', () => {
  it('never overwrites a pinned preference', () => {
    const current: LearnedProfile = {
      ...emptyProfile('u1'),
      overrides: { 'preferences.planningHour': 6, dismissedInsights: ['works:health'] },
    };
    const events: LearningEvent[] = [
      ev('plan_accepted', { weekday: 'Sun', hour: 21, itemCount: 3 }),
      ...Array.from({ length: 3 }, () => ev('task_completed', { category: 'health', hour: 8 })),
    ];
    const p = deriveProfile({ current, events, now: NOW });
    expect(p.preferences.planningHour).toBe(6); // override wins over learned 21
    expect(p.insights.find((i) => i.id === 'works:health')).toBeUndefined(); // dismissed
  });
});

describe('deriveProfile — identity goal sync', () => {
  it('replaces goals from the snapshot, preserving why', () => {
    const current: LearnedProfile = {
      ...emptyProfile('u1'),
      identity: { values: ['growth'], goals: [{ id: 'g1', title: 'Read', category: 'intellectual', why: 'joy' }] },
    };
    const p = deriveProfile({
      current,
      events: [],
      now: NOW,
      goals: [{ id: 'g1', title: 'Read 12 books', category: 'intellectual' }],
    });
    expect(p.identity.goals[0]!.title).toBe('Read 12 books');
    expect(p.identity.goals[0]!.why).toBe('joy'); // preserved
    expect(p.identity.values).toEqual(['growth']); // untouched
  });
});

describe('mergeInsights', () => {
  const mk = (id: string, conf: number, ev = 5): LearnedInsight => ({
    id, text: id, kind: 'pattern', confidence: conf, evidenceCount: ev, updatedAt: 'old',
  });

  it('caps at 12 and ranks by confidence × evidence', () => {
    const candidates = Array.from({ length: 20 }, (_, i) => mk(`p:${i}`, i / 20));
    const out = mergeInsights([], candidates, 'now');
    expect(out.length).toBe(12);
    expect(out[0]!.confidence).toBeGreaterThan(out[11]!.confidence);
  });

  it('keeps prior updatedAt when text is unchanged', () => {
    const prior = [mk('p:1', 0.5)];
    const out = mergeInsights(prior, [mk('p:1', 0.9)], 'now');
    expect(out[0]!.updatedAt).toBe('old'); // text same → timestamp preserved
    expect(out[0]!.confidence).toBe(0.9); // but data refreshed
  });
});

describe('applyOverrides', () => {
  it('filters dismissed insights', () => {
    const p: LearnedProfile = {
      ...emptyProfile('u1'),
      insights: [
        { id: 'a', text: 'a', kind: 'works', confidence: 1, evidenceCount: 1, updatedAt: 'x' },
        { id: 'b', text: 'b', kind: 'avoid', confidence: 1, evidenceCount: 1, updatedAt: 'x' },
      ],
      overrides: { dismissedInsights: ['a'] },
    };
    expect(applyOverrides(p).insights.map((i) => i.id)).toEqual(['b']);
  });
});
