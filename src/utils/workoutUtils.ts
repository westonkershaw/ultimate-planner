/**
 * workoutUtils.ts
 *
 * Pure functions for workout volume, intensity, and progression calculations.
 * No side effects — safe to call from any context.
 *
 * 1RM formula: Epley (1985) — the most widely cited single-rep max estimator
 *   1RM = weight × (1 + reps / 30)
 *
 * Volume load: total tonnage moved in a session or exercise
 *   Volume = Σ (weight × reps) across all completed sets
 */

import type { RoutineExercise, SessionExercise, WorkoutSession } from '@/types';

// ── 1-Rep Max Estimators ───────────────────────────────────────────────────

/**
 * Estimate 1-Rep Max using the Epley formula.
 *
 * @param weight  Weight lifted in any consistent unit (kg or lbs)
 * @param reps    Number of reps performed (must be >= 1)
 * @returns       Estimated 1RM in the same unit as `weight`
 */
export function calcEpley1RM(weight: number, reps: number): number {
  if (weight <= 0) throw new RangeError('Weight must be positive.');
  if (reps < 1) throw new RangeError('Reps must be at least 1.');
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

/**
 * Estimate 1-Rep Max using the Brzycki formula.
 * Slightly more accurate at low rep ranges (1–10).
 *
 *   1RM = weight × 36 / (37 − reps)
 *
 * @param weight  Weight lifted
 * @param reps    Number of reps (must be 1–36; undefined for >= 37)
 * @returns       Estimated 1RM
 */
export function calcBrzycki1RM(weight: number, reps: number): number {
  if (weight <= 0) throw new RangeError('Weight must be positive.');
  if (reps < 1 || reps > 36) throw new RangeError('Brzycki formula valid for 1–36 reps.');
  if (reps === 1) return weight;
  return Math.round((weight * 36) / (37 - reps));
}

// ── Volume Calculations ────────────────────────────────────────────────────

/**
 * Calculate volume load (tonnage) for a single exercise's planned sets.
 *
 * @param exercise  RoutineExercise with planned sets
 * @returns         Total volume in the same unit as set weights
 */
export function calcExerciseVolume(exercise: RoutineExercise): number {
  return exercise.sets.reduce((total, set) => total + set.weight * set.reps, 0);
}

/**
 * Calculate volume load for a completed session exercise (actual values only).
 *
 * @param exercise  SessionExercise with completed set actuals
 * @returns         Volume from completed sets only
 */
export function calcSessionExerciseVolume(exercise: SessionExercise): number {
  return exercise.sets
    .filter((s) => s.completed)
    .reduce((total, set) => total + set.actualWeight * set.actualReps, 0);
}

/**
 * Calculate total volume load across all exercises in a completed session.
 *
 * @param session  WorkoutSession with session exercises
 * @returns        Total volume for the session
 */
export function calcSessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, ex) => total + calcSessionExerciseVolume(ex),
    0,
  );
}

/**
 * Count total completed sets in a session.
 *
 * @param session  WorkoutSession
 * @returns        Number of sets where completed === true
 */
export function countCompletedSets(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, ex) => total + ex.sets.filter((s) => s.completed).length,
    0,
  );
}

// ── Progression ────────────────────────────────────────────────────────────

/**
 * Suggest the next working weight based on linear progression.
 * Adds a fixed increment if the target rep goal was met on all sets.
 *
 * @param currentWeight     Weight used in the last session
 * @param setsCompleted     Number of sets completed at target reps
 * @param totalSets         Total planned sets
 * @param targetReps        Target rep count per set
 * @param incrementKg       Weight to add on successful session (default 2.5 kg)
 * @returns                 Suggested weight for next session
 */
export function suggestLinearProgression(
  currentWeight: number,
  setsCompleted: number,
  totalSets: number,
  targetReps: number,
  incrementKg = 2.5,
): number {
  void targetReps; // reserved for future rep-range logic
  const allSetsCompleted = setsCompleted >= totalSets;
  return allSetsCompleted ? currentWeight + incrementKg : currentWeight;
}

// ── Rest Timer Utility ─────────────────────────────────────────────────────

/**
 * Format a rest duration in seconds into mm:ss display string.
 *
 * @param totalSeconds  Number of seconds (non-negative integer)
 * @returns             Formatted string e.g. "1:30"
 */
export function formatRestTime(totalSeconds: number): string {
  if (totalSeconds < 0) throw new RangeError('totalSeconds must be non-negative.');
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// ── Weekly Volume Trend ────────────────────────────────────────────────────

/**
 * One entry in a 7-week volume trend chart.
 */
export interface WeeklyVolumeEntry {
  /** Short label such as "Mar 17" */
  weekLabel: string;
  /** Total volume (lbs) across all completed sets in the week */
  volume: number;
}

/**
 * Build a 7-entry weekly volume trend from session history.
 *
 * Weeks are Mon–Sun; week 0 is the oldest (6 weeks ago), week 6 is the
 * current (partial) week. Sessions with no volume are included as 0.
 *
 * @param sessions  All completed WorkoutSessions (any order)
 * @returns         Array of 7 WeeklyVolumeEntry, oldest first
 */
export function calcWeeklyVolumeTrend(
  sessions: WorkoutSession[],
): WeeklyVolumeEntry[] {
  const today = new Date();
  // Monday-based week start
  const todayDow = (today.getDay() + 6) % 7; // 0=Mon … 6=Sun
  const thisWeekMonday = new Date(today);
  thisWeekMonday.setDate(today.getDate() - todayDow);
  thisWeekMonday.setHours(0, 0, 0, 0);

  const entries: WeeklyVolumeEntry[] = [];
  for (let w = 6; w >= 0; w--) {
    const weekStart = new Date(thisWeekMonday);
    weekStart.setDate(thisWeekMonday.getDate() - w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const volume = sessions.reduce((sum, s) => {
      const d = new Date(s.completedAt ?? s.startedAt);
      if (d >= weekStart && d < weekEnd) {
        return sum + calcSessionVolume(s);
      }
      return sum;
    }, 0);

    const label = weekStart.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    entries.push({ weekLabel: label, volume });
  }
  return entries;
}

// ── PR Board ───────────────────────────────────────────────────────────────

/**
 * A personal-record entry for one exercise.
 */
export interface PREntry {
  exerciseName: string;
  /** Estimated 1-rep max in lbs using the Epley formula */
  epley1RM: number;
  /** Actual best weight used */
  bestWeight: number;
  /** Reps at that best weight */
  repsAtBest: number;
}

/**
 * Derive the top N exercises by estimated 1RM from session history.
 *
 * Scans every completed set across all sessions and keeps the highest
 * Epley 1RM per exercise name, then returns the top N sorted descending.
 *
 * @param sessions  All completed WorkoutSessions
 * @param topN      Maximum entries to return (default 3)
 * @returns         Array of PREntry sorted by epley1RM descending
 */
export function calcPRBoard(
  sessions: WorkoutSession[],
  topN = 3,
): PREntry[] {
  const best = new Map<string, PREntry>();

  for (const session of sessions) {
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (!set.completed || set.actualWeight <= 0 || set.actualReps < 1) continue;
        let rm: number;
        try {
          rm = calcEpley1RM(set.actualWeight, set.actualReps);
        } catch {
          continue;
        }
        const existing = best.get(ex.name);
        if (!existing || rm > existing.epley1RM) {
          best.set(ex.name, {
            exerciseName: ex.name,
            epley1RM: rm,
            bestWeight: set.actualWeight,
            repsAtBest: set.actualReps,
          });
        }
      }
    }
  }

  return [...best.values()]
    .sort((a, b) => b.epley1RM - a.epley1RM)
    .slice(0, topN);
}

// ── Frequency Grid ─────────────────────────────────────────────────────────

/**
 * One cell in a workout-frequency contribution grid.
 */
export interface FrequencyCell {
  /** YYYY-MM-DD */
  dateStr: string;
  /** True if a workout was logged on this day */
  worked: boolean;
}

/**
 * Build a 28-cell (4 weeks × 7 days) workout frequency grid.
 *
 * Day 0 is the Monday of 4 weeks ago; day 27 is the Sunday of last week
 * (or today if mid-week). Cells are ordered oldest first.
 *
 * @param sessions  All completed WorkoutSessions
 * @returns         Array of 28 FrequencyCell
 */
export function calcFrequencyGrid(
  sessions: WorkoutSession[],
): FrequencyCell[] {
  // Build a set of YYYY-MM-DD strings for days with at least one session
  const workedDays = new Set(
    sessions
      .filter((s) => s.completedAt !== undefined)
      .map((s) => {
        const d = new Date(s.completedAt!);
        return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
      }),
  );

  const today = new Date();
  const todayDow = (today.getDay() + 6) % 7;
  const gridStart = new Date(today);
  gridStart.setDate(today.getDate() - todayDow - 21); // 4 weeks back from this Monday
  gridStart.setHours(0, 0, 0, 0);

  const cells: FrequencyCell[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const dateStr = d.toLocaleDateString('en-CA');
    cells.push({ dateStr, worked: workedDays.has(dateStr) });
  }
  return cells;
}

// ── Strength Standards ─────────────────────────────────────────────────────

/**
 * Strength level classification for a single lift.
 * Levels reflect bodyweight-ratio thresholds widely cited in the strength
 * community (ExRx / Symmetric Strength guidelines).
 */
export type StrengthLevel =
  | 'untrained'
  | 'beginner'
  | 'novice'
  | 'intermediate'
  | 'advanced'
  | 'elite';

export interface StrengthStandardEntry {
  exerciseName: string;
  /** User's best estimated 1RM in lbs */
  best1RM: number;
  /** Best 1RM expressed as a multiple of bodyweight */
  bwRatio: number;
  /** Achieved level */
  level: StrengthLevel;
  /**
   * Progress fraction 0–1 towards the NEXT level threshold.
   * 1.0 when the user has reached Elite.
   */
  progressToNext: number;
  /** BW-ratio thresholds [beginner, novice, intermediate, advanced, elite] */
  thresholds: [number, number, number, number, number];
}

/** BW-ratio thresholds per lift (male baseline, lbs, Epley 1RM) */
const STRENGTH_STANDARDS: Record<
  string,
  [number, number, number, number, number]
> = {
  'bench press': [0.5, 0.75, 1.0, 1.25, 1.5],
  squat:         [0.75, 1.0, 1.25, 1.5, 2.0],
  deadlift:      [1.0, 1.25, 1.5, 2.0, 2.5],
  'overhead press': [0.35, 0.5, 0.65, 0.8, 1.0],
  'barbell row': [0.5, 0.65, 0.85, 1.0, 1.25],
};

/**
 * Normalise an exercise name for lookup in STRENGTH_STANDARDS.
 * Strips leading/trailing whitespace and converts to lowercase.
 */
function normaliseExName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Classify a bodyweight-ratio against the 5 standard thresholds.
 *
 * @param ratio      Best 1RM / bodyweight
 * @param thresholds [beginner, novice, intermediate, advanced, elite]
 */
function classifyLevel(
  ratio: number,
  thresholds: [number, number, number, number, number],
): { level: StrengthLevel; progressToNext: number } {
  const levels: StrengthLevel[] = [
    'beginner', 'novice', 'intermediate', 'advanced', 'elite',
  ];
  // Determine which band the user is in
  let levelIdx = -1; // -1 = untrained (below beginner threshold)
  for (let i = thresholds.length - 1; i >= 0; i--) {
    const threshold = thresholds[i];
    if (threshold !== undefined && ratio >= threshold) {
      levelIdx = i;
      break;
    }
  }

  if (levelIdx === -1) {
    // Below beginner — progress towards beginner
    const beginnerThreshold = thresholds[0] ?? 0.5;
    const progressToNext = Math.min(ratio / beginnerThreshold, 1);
    return { level: 'untrained', progressToNext };
  }

  if (levelIdx === thresholds.length - 1) {
    // At or above elite
    return { level: 'elite', progressToNext: 1 };
  }

  const current = thresholds[levelIdx] ?? 0;
  const next = thresholds[levelIdx + 1] ?? current + 0.5;
  const progressToNext = (ratio - current) / (next - current);
  const level: StrengthLevel = levels[levelIdx] ?? 'beginner';

  return { level, progressToNext: Math.min(progressToNext, 1) };
}

/**
 * Compare the user's best lifts to bodyweight-ratio strength standards.
 *
 * Only returns entries for exercises that:
 *   - have a matching entry in STRENGTH_STANDARDS
 *   - the user has at least one completed set in session history
 *
 * @param sessions     All completed WorkoutSessions
 * @param bodyweightLbs  User's current bodyweight in lbs
 * @returns            Array of StrengthStandardEntry for matched lifts
 */
export function calcStrengthStandards(
  sessions: WorkoutSession[],
  bodyweightLbs: number,
): StrengthStandardEntry[] {
  if (bodyweightLbs <= 0) return [];

  // Collect best Epley 1RM per exercise
  const best1RMMap = new Map<string, number>();
  for (const session of sessions) {
    for (const ex of session.exercises) {
      const key = normaliseExName(ex.name);
      for (const set of ex.sets) {
        if (!set.completed || set.actualWeight <= 0 || set.actualReps < 1) continue;
        let rm: number;
        try {
          rm = calcEpley1RM(set.actualWeight, set.actualReps);
        } catch {
          continue;
        }
        const existing = best1RMMap.get(key) ?? 0;
        if (rm > existing) best1RMMap.set(key, rm);
      }
    }
  }

  const results: StrengthStandardEntry[] = [];
  for (const [normKey, thresholds] of Object.entries(STRENGTH_STANDARDS)) {
    const best1RM = best1RMMap.get(normKey);
    if (best1RM === undefined) continue; // user hasn't logged this lift

    const bwRatio = best1RM / bodyweightLbs;
    const { level, progressToNext } = classifyLevel(bwRatio, thresholds);

    // Recover display name from the original STRENGTH_STANDARDS key
    const displayName = normKey
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    results.push({
      exerciseName: displayName,
      best1RM,
      bwRatio,
      level,
      progressToNext,
      thresholds,
    });
  }

  return results;
}

// ── Workout Consistency Calendar ────────────────────────────────────────────

export type WorkoutIntensity = 'none' | 'light' | 'moderate' | 'heavy';

export interface ConsistencyCell {
  /** YYYY-MM-DD */
  dateStr: string;
  intensity: WorkoutIntensity;
  /** Total session volume logged on this day (lbs) */
  volume: number;
  /** Session names logged on this day */
  sessionNames: string[];
}

/**
 * Categorise a volume total into an intensity band.
 * Thresholds are intentionally generous for a beginner-friendly UX.
 */
function volumeToIntensity(volume: number): WorkoutIntensity {
  if (volume === 0) return 'none';
  if (volume < 3000) return 'light';
  if (volume < 8000) return 'moderate';
  return 'heavy';
}

/**
 * Build a 84-cell (12 weeks × 7 days) workout consistency contribution grid.
 *
 * Each cell carries the total session volume for that day, bucketed into an
 * intensity level. Cells are ordered oldest first (Mon of 12 weeks ago → today).
 *
 * @param sessions  All completed WorkoutSessions
 * @returns         84-cell ConsistencyCell array
 */
export function calcConsistencyGrid(
  sessions: WorkoutSession[],
): ConsistencyCell[] {
  // Build a day-keyed map of {volume, sessionNames}
  const dayMap = new Map<string, { volume: number; names: string[] }>();

  for (const session of sessions) {
    if (!session.completedAt) continue;
    const d = new Date(session.completedAt);
    const dateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const vol = calcSessionVolume(session);
    const existing = dayMap.get(dateStr) ?? { volume: 0, names: [] };
    existing.volume += vol;
    existing.names.push(session.routineName);
    dayMap.set(dateStr, existing);
  }

  const today = new Date();
  const todayDow = (today.getDay() + 6) % 7; // 0=Mon … 6=Sun
  const gridStart = new Date(today);
  gridStart.setDate(today.getDate() - todayDow - 11 * 7); // 12 weeks back from this Monday
  gridStart.setHours(0, 0, 0, 0);

  const cells: ConsistencyCell[] = [];
  for (let i = 0; i < 84; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const dateStr = d.toLocaleDateString('en-CA');
    const day = dayMap.get(dateStr);
    cells.push({
      dateStr,
      intensity: volumeToIntensity(day?.volume ?? 0),
      volume: day?.volume ?? 0,
      sessionNames: day?.names ?? [],
    });
  }

  return cells;
}

// ── Muscle Group Balance ────────────────────────────────────────────────────

export type MuscleGroup = 'push' | 'pull' | 'legs' | 'core';

export interface MuscleGroupStats {
  group: MuscleGroup;
  /** Number of sessions (any exercise in this group) in the last 28 days */
  sessionsLast28Days: number;
  /**
   * Days since the most recent session that included this muscle group.
   * -1 if never trained.
   */
  daysSinceLast: number;
  /** Display label */
  label: string;
  /** Short emoji icon */
  emoji: string;
}

const MUSCLE_KEYWORDS: Record<MuscleGroup, string[]> = {
  push: [
    'bench', 'press', 'push', 'chest', 'fly', 'flye', 'dip',
    'shoulder', 'deltoid', 'lateral raise', 'overhead', 'tricep', 'skull',
  ],
  pull: [
    'row', 'pull', 'deadlift', 'lat', 'pulldown', 'chin', 'curl',
    'bicep', 'shrug', 'rack', 'rdl', 'hamstring', 'back',
  ],
  legs: [
    'squat', 'leg', 'lunge', 'hack', 'calf', 'quad', 'glute',
    'hip thrust', 'step up', 'bulgarian', 'front squat',
  ],
  core: [
    'crunch', 'plank', 'ab', 'core', 'oblique', 'russian twist',
    'sit-up', 'situp', 'leg raise', 'cable wood',
  ],
};

function classifyExercise(name: string): MuscleGroup | null {
  const lower = name.toLowerCase();
  for (const [group, keywords] of Object.entries(MUSCLE_KEYWORDS) as [MuscleGroup, string[]][]) {
    if (keywords.some((kw) => lower.includes(kw))) return group;
  }
  return null;
}

const GROUP_META: Record<MuscleGroup, { label: string; emoji: string }> = {
  push: { label: 'Push', emoji: '🫸' },
  pull: { label: 'Pull', emoji: '🫷' },
  legs: { label: 'Legs', emoji: '🦵' },
  core: { label: 'Core', emoji: '🎯' },
};

/**
 * Analyse session history to produce per-muscle-group frequency statistics.
 *
 * @param sessions  All completed WorkoutSessions
 * @returns         Array of 4 MuscleGroupStats (push/pull/legs/core)
 */
export function calcMuscleGroupBalance(
  sessions: WorkoutSession[],
): MuscleGroupStats[] {
  const now = new Date();
  const cutoff28 = new Date(now);
  cutoff28.setDate(now.getDate() - 28);

  // Per-group: track session dates
  const dateSets: Record<MuscleGroup, Set<string>> = {
    push: new Set(),
    pull: new Set(),
    legs: new Set(),
    core: new Set(),
  };

  for (const session of sessions) {
    if (!session.completedAt) continue;
    const sessionDate = new Date(session.completedAt);
    const dateStr = sessionDate.toLocaleDateString('en-CA');
    const groupsHit = new Set<MuscleGroup>();

    for (const ex of session.exercises) {
      const group = classifyExercise(ex.name);
      if (group) groupsHit.add(group);
    }

    for (const group of groupsHit) {
      dateSets[group].add(dateStr);
    }
  }

  const groups: MuscleGroup[] = ['push', 'pull', 'legs', 'core'];

  return groups.map((group) => {
    const dates = [...dateSets[group]]
      .map((s) => new Date(s + 'T00:00:00'))
      .sort((a, b) => b.getTime() - a.getTime());

    const sessionsLast28Days = dates.filter((d) => d >= cutoff28).length;

    let daysSinceLast = -1;
    const mostRecent = dates[0];
    if (mostRecent !== undefined) {
      const msPerDay = 1000 * 60 * 60 * 24;
      daysSinceLast = Math.floor(
        (now.getTime() - mostRecent.getTime()) / msPerDay,
      );
    }

    return {
      group,
      sessionsLast28Days,
      daysSinceLast,
      label: GROUP_META[group].label,
      emoji: GROUP_META[group].emoji,
    };
  });
}

// ── PR Timeline ─────────────────────────────────────────────────────────────

export interface PRTimelineEntry {
  exerciseName: string;
  /** Current best Epley 1RM (lbs) */
  current1RM: number;
  /** Date the current PR was set */
  currentPRDate: string;
  /** Previous best Epley 1RM, undefined if this is the first PR */
  previous1RM?: number;
  /** Date previous PR was set */
  previousPRDate?: string;
  /** lbs gained from previous to current PR */
  delta?: number;
  /**
   * Rate of progress expressed as lbs/week.
   * Positive means improving; undefined if only one PR exists.
   */
  ratePerWeek?: number;
  /** True when PR was set within the last 14 days */
  isHotStreak: boolean;
}

/**
 * Build a per-exercise PR timeline showing current and previous bests.
 *
 * The function walks sessions in chronological order (oldest first) to detect
 * when each exercise's estimated 1RM was beaten, capturing the two most
 * recent PR events per exercise.
 *
 * @param sessions  All completed WorkoutSessions
 * @returns         Array of PRTimelineEntry, one per exercise that has data
 */
export function calcPRTimeline(
  sessions: WorkoutSession[],
): PRTimelineEntry[] {
  // Sort sessions oldest first
  const sorted = [...sessions].sort((a, b) => {
    const tA = a.completedAt ?? a.startedAt;
    const tB = b.completedAt ?? b.startedAt;
    return tA - tB;
  });

  // Per exercise: track the two most recent PR events
  interface PREvent { rm: number; dateMs: number }
  const timeline = new Map<string, { current: PREvent; previous?: PREvent }>();

  for (const session of sorted) {
    const sessionDateMs = session.completedAt ?? session.startedAt;

    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (!set.completed || set.actualWeight <= 0 || set.actualReps < 1) continue;
        let rm: number;
        try {
          rm = calcEpley1RM(set.actualWeight, set.actualReps);
        } catch {
          continue;
        }

        const existing = timeline.get(ex.name);
        if (!existing || rm > existing.current.rm) {
          timeline.set(ex.name, {
            previous: existing?.current,
            current: { rm, dateMs: sessionDateMs },
          });
        }
      }
    }
  }

  const now = Date.now();
  const msPerWeek = 1000 * 60 * 60 * 24 * 7;
  const hotStreakCutoffMs = now - 14 * 24 * 60 * 60 * 1000;

  const entries: PRTimelineEntry[] = [];
  for (const [name, { current, previous }] of timeline.entries()) {
    const currentDate = new Date(current.dateMs);
    const currentPRDate = currentDate.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

    let previous1RM: number | undefined;
    let previousPRDate: string | undefined;
    let delta: number | undefined;
    let ratePerWeek: number | undefined;

    if (previous) {
      previous1RM = previous.rm;
      previousPRDate = new Date(previous.dateMs).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
      delta = current.rm - previous.rm;
      const weeksElapsed = (current.dateMs - previous.dateMs) / msPerWeek;
      ratePerWeek = weeksElapsed > 0
        ? Math.round((delta / weeksElapsed) * 10) / 10
        : undefined;
    }

    entries.push({
      exerciseName: name,
      current1RM: current.rm,
      currentPRDate,
      previous1RM,
      previousPRDate,
      delta,
      ratePerWeek,
      isHotStreak: current.dateMs >= hotStreakCutoffMs,
    });
  }

  // Sort: hot streaks first, then by 1RM descending
  return entries.sort((a, b) => {
    if (a.isHotStreak !== b.isHotStreak) return a.isHotStreak ? -1 : 1;
    return b.current1RM - a.current1RM;
  });
}

// ── Workout Recommendation Engine ──────────────────────────────────────────

export interface WorkoutRecommendation {
  message: string;
  type: 'lift_heavy' | 'recovery' | 'leg_day' | 'pull_day' | 'push_day' | 'rest' | 'general';
  urgency: 'high' | 'medium' | 'low';
}

/**
 * Produce a plain-language workout recommendation based on the last 7 days
 * of training history and muscle-group balance data.
 *
 * Rule priority (highest first):
 *   1. Trained 3+ days in a row → recovery
 *   2. Rested 2+ days → ready to lift heavy
 *   3. Legs not trained in 4+ days → leg day
 *   4. Pull not trained in 5+ days → pull day
 *   5. Push not trained in 5+ days → push day
 *   6. Default → general encouragement
 *
 * @param sessions  All completed WorkoutSessions
 * @returns         A WorkoutRecommendation
 */
export function calcWorkoutRecommendation(
  sessions: WorkoutSession[],
): WorkoutRecommendation {
  const balance = calcMuscleGroupBalance(sessions);
  const byGroup = Object.fromEntries(balance.map((b) => [b.group, b])) as Record<
    MuscleGroup,
    MuscleGroupStats
  >;

  // Build a set of day-strings for the last 7 days that had a session
  const now = new Date();
  const daySet = new Set<string>();
  for (const session of sessions) {
    if (!session.completedAt) continue;
    const d = new Date(session.completedAt);
    const key = d.toLocaleDateString('en-CA');
    daySet.add(key);
  }

  // Determine consecutive days trained ending today / yesterday
  let consecutiveDays = 0;
  const cursor = new Date(now);
  for (let i = 0; i < 14; i++) {
    const key = cursor.toLocaleDateString('en-CA');
    if (daySet.has(key)) {
      consecutiveDays++;
    } else if (i > 0) {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  // Days since last session (any group)
  let daysSinceAny = -1;
  if (sessions.length > 0) {
    const latestMs = Math.max(
      ...sessions
        .filter((s) => s.completedAt !== undefined)
        .map((s) => s.completedAt as number),
    );
    if (isFinite(latestMs)) {
      daysSinceAny = Math.floor(
        (now.getTime() - latestMs) / (1000 * 60 * 60 * 24),
      );
    }
  }

  // Rule 1 — too much consecutive training
  if (consecutiveDays >= 3) {
    return {
      message: 'You have trained ' + consecutiveDays + ' days in a row. Recovery day recommended.',
      type: 'recovery',
      urgency: 'high',
    };
  }

  // Rule 2 — well rested
  if (daysSinceAny >= 2 || daysSinceAny === -1) {
    const prefix = daysSinceAny === -1
      ? 'No sessions logged yet.'
      : 'You have rested ' + daysSinceAny + ' days.';
    return {
      message: prefix + ' Ready to lift heavy — Upper body day suggested.',
      type: 'lift_heavy',
      urgency: 'medium',
    };
  }

  // Rule 3 — legs overdue
  if (byGroup.legs.daysSinceLast >= 4 || byGroup.legs.daysSinceLast === -1) {
    return {
      message: 'Leg day is overdue! Last trained ' + (
        byGroup.legs.daysSinceLast === -1
          ? 'never'
          : byGroup.legs.daysSinceLast + ' days ago'
      ) + '.',
      type: 'leg_day',
      urgency: 'high',
    };
  }

  // Rule 4 — pull overdue
  if (byGroup.pull.daysSinceLast >= 5 || byGroup.pull.daysSinceLast === -1) {
    return {
      message: 'You have not trained Pull in ' + (
        byGroup.pull.daysSinceLast === -1 ? 'a while' : byGroup.pull.daysSinceLast + ' days'
      ) + '. Back/bicep day suggested.',
      type: 'pull_day',
      urgency: 'medium',
    };
  }

  // Rule 5 — push overdue
  if (byGroup.push.daysSinceLast >= 5 || byGroup.push.daysSinceLast === -1) {
    return {
      message: 'You have not trained Push in ' + (
        byGroup.push.daysSinceLast === -1 ? 'a while' : byGroup.push.daysSinceLast + ' days'
      ) + '. Chest/shoulder day suggested.',
      type: 'push_day',
      urgency: 'medium',
    };
  }

  return {
    message: 'Keep up the consistency! Log today\'s session to maintain momentum.',
    type: 'general',
    urgency: 'low',
  };
}

// ── 7-Day Daily Volume Trend ────────────────────────────────────────────────

/**
 * One entry in a 7-day daily volume chart.
 */
export interface DailyVolumeEntry {
  /** Short label: "Mon", "Tue", etc. */
  dayLabel: string;
  /** YYYY-MM-DD for this day */
  dateStr: string;
  /** Total volume (lbs) across all completed sets logged on this day */
  volume: number;
  /** True when above the 7-day mean volume (used for bar colouring) */
  aboveAverage: boolean;
}

/**
 * Build a 7-entry daily volume trend covering the last 7 calendar days
 * (today is index 6, 6 days ago is index 0).
 *
 * Each bar is coloured green when its volume exceeds the 7-day mean,
 * otherwise gray. Days with no sessions show volume 0.
 *
 * @param sessions  All completed WorkoutSessions (any order)
 * @returns         Array of 7 DailyVolumeEntry, oldest first
 */
export function calc7DayDailyVolume(
  sessions: WorkoutSession[],
): DailyVolumeEntry[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sum volume per calendar day (YYYY-MM-DD)
  const dayVolMap = new Map<string, number>();
  for (const session of sessions) {
    if (!session.completedAt) continue;
    const d = new Date(session.completedAt);
    const key = d.toLocaleDateString('en-CA');
    dayVolMap.set(key, (dayVolMap.get(key) ?? 0) + calcSessionVolume(session));
  }

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const entries: Omit<DailyVolumeEntry, 'aboveAverage'>[] = [];

  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const dateStr = d.toLocaleDateString('en-CA');
    entries.push({
      dayLabel: DAY_NAMES[d.getDay()] ?? 'Day',
      dateStr,
      volume: dayVolMap.get(dateStr) ?? 0,
    });
  }

  const total = entries.reduce((s, e) => s + e.volume, 0);
  const mean = total / 7;

  return entries.map((e) => ({ ...e, aboveAverage: e.volume > mean && e.volume > 0 }));
}

// ── Streak Calculation ─────────────────────────────────────────────────────

/**
 * Calculate the current consecutive-day workout streak from session history.
 * A streak counts backwards from today; if today has no session, the streak
 * still counts if yesterday does (same-day granularity).
 *
 * @param sessions  Array of completed WorkoutSessions (any order)
 * @returns         Current streak in days
 */
export function calcWorkoutStreak(
  sessions: Pick<WorkoutSession, 'completedAt'>[],
): number {
  if (!sessions.length) return 0;

  const days = new Set(
    sessions
      .filter((s) => s.completedAt !== undefined)
      .map((s) => {
        const d = new Date(s.completedAt!);
        return d.toLocaleDateString('en-CA');
      }),
  );

  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = cursor.toLocaleDateString('en-CA');
    if (days.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
