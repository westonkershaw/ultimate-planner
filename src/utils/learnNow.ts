/**
 * learnNow.ts
 *
 * A one-call trigger for the deterministic learn step, used at the natural
 * "review" moments (finishing a week/month ritual, or the manual button in
 * Settings). It snapshots the user's current goals into identity and recomputes
 * the profile from the recent event window.
 */

import { useGoalStore, useProfileStore } from '@/store';
import type { ProfileGoal } from '@/types';

/** Active goals mapped to the compact identity shape. */
export function goalsSnapshot(): ProfileGoal[] {
  return useGoalStore
    .getState()
    .goals.filter((g) => !g.archived)
    .map((g) => ({ id: g.id, title: g.title, category: g.category }));
}

/** Recompute + persist the learned profile. Safe to await or fire-and-forget. */
export async function learnNow(values?: string[]): Promise<void> {
  await useProfileStore.getState().runLearn({ goals: goalsSnapshot(), values });
}
