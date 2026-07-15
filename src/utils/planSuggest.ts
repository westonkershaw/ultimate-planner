/**
 * planSuggest.ts
 *
 * The closed loop: turn the LearnedProfile into a pre-filled week/month plan so
 * the user can accept in one tap. Suggestions favour the categories the user
 * actually follows through on, at the cadence they actually plan, and always
 * stay honest about *why* (every suggestion carries a plain-language rationale).
 *
 * Pure + deterministic (no store access, no I/O) so it's unit-testable and can
 * render instantly with zero latency and zero API calls.
 */

import type {
  LearnedProfile,
  SuggestedDay,
  SuggestedWeekPlan,
  SuggestedFocus,
  SuggestedMonthPlan,
  ProfileGoal,
  ProfileCategory,
} from '@/types';

/** Monday-first weekday short names, aligned with SuggestedDay.dayIndex 0–6. */
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Friendly fallbacks so an empty profile still yields a useful, gentle week. */
const DEFAULT_CATEGORIES: ProfileCategory[] = ['focus', 'health', 'growth', 'connection', 'rest'];

const pct = (rate: number): number => Math.round(rate * 100);
const cap = (s: string): string => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

function dedupe<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

/** Build the ranked category rotation: what works first, then goals, then defaults. */
function rankedCategories(profile: LearnedProfile): ProfileCategory[] {
  const avoid = new Set(profile.preferences.avoidCategories);
  const goalCats = profile.identity.goals.map((g) => g.category);
  const ranked = dedupe([
    ...profile.preferences.preferredCategories,
    ...goalCats,
    ...DEFAULT_CATEGORIES,
  ]).filter((c) => !avoid.has(c));
  return ranked.length ? ranked : DEFAULT_CATEGORIES;
}

function goalInCategory(goals: ProfileGoal[], category: ProfileCategory): ProfileGoal | undefined {
  return goals.find((g) => g.category === category && g.title.trim().length > 0);
}

/** Suggested focus/energy for a weekday, learned from follow-through where known. */
function energyFor(profile: LearnedProfile, weekday: string): number {
  const rate = profile.behavior.followThroughByWeekday[weekday];
  if (typeof rate === 'number') return Math.max(1, Math.min(5, Math.round(1 + rate * 4)));
  return weekday === 'Sat' || weekday === 'Sun' ? 2 : 3; // gentler weekends by default
}

// ── Week plan ───────────────────────────────────────────────────────────────

export function suggestWeekPlan(profile: LearnedProfile): SuggestedWeekPlan {
  const cats = rankedCategories(profile);
  const preferred = new Set(profile.preferences.preferredCategories);

  const days: SuggestedDay[] = WEEK.map((weekday, i) => {
    const category = cats[i % cats.length]!;
    const goal = goalInCategory(profile.identity.goals, category);

    const intention = goal ? `Move "${goal.title}" forward` : `${cap(category)} focus block`;

    let rationale: string;
    const catStat = profile.behavior.completionByCategory[category];
    if (goal) {
      rationale = `Keeps your goal "${goal.title}" moving.`;
    } else if (preferred.has(category) && catStat) {
      rationale = `You finish ${pct(catStat.rate)}% of your ${category} tasks — lean in.`;
    } else {
      rationale = 'A balanced starting point — tweak anything.';
    }

    return {
      dayIndex: i,
      intention,
      category,
      energyLevel: energyFor(profile, weekday),
      rationale,
    };
  });

  const basis = profile.preferences.preferredCategories.length
    ? `Built around what you actually finish (${profile.preferences.preferredCategories
        .slice(0, 3)
        .join(', ')})${profile.identity.goals.length ? ' and your active goals' : ''}.`
    : "A gentle, balanced week to start — it'll shape to you as you go.";

  return { days, basis };
}

// ── Month plan ──────────────────────────────────────────────────────────────

export function suggestMonthPlan(profile: LearnedProfile): SuggestedMonthPlan {
  const cats = rankedCategories(profile);
  // A focused month = 3 themes, ideally one per active goal / strong category.
  const chosen = dedupe(cats).slice(0, 3);

  const focuses: SuggestedFocus[] = chosen.map((category) => {
    const goal = goalInCategory(profile.identity.goals, category);
    const catStat = profile.behavior.completionByCategory[category];
    if (goal) {
      return {
        category,
        focus: `Make real progress on "${goal.title}"`,
        rationale: `A goal you've set in ${category} — a month is enough to move the needle.`,
      };
    }
    return {
      category,
      focus: `${cap(category)}: one meaningful step each week`,
      rationale:
        catStat && catStat.rate >= 0.6
          ? `You're consistent here (${pct(catStat.rate)}%) — worth compounding.`
          : 'A steady theme to anchor the month.',
    };
  });

  const basis = profile.identity.goals.length
    ? 'Anchored to your goals and the areas you keep momentum in.'
    : 'A simple three-theme month — edit to fit what matters now.';

  return { focuses, basis };
}
