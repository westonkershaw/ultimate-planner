import type { Task, ID, Timestamp } from '@/types';
import type { DailyPlan } from '@/store/usePlannerStore';
import type { WorkoutSession } from '@/types';

// ── Achievement Types ──────────────────────────────────────────────────────

export type AchievementType =
  | 'task_streak'
  | 'task_milestone'
  | 'workout_streak'
  | 'workout_count'
  | 'planner_streak'
  | 'priority_clear'
  | 'week_perfect';

export interface Achievement {
  id: ID;
  type: AchievementType;
  title: string;
  description: string;
  icon: string;
  value: number;
  earnedAt: Timestamp;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  tasksCompleted: number;
  workouts: number;
  plannerDays: number;
  isCurrentUser: boolean;
}

// ── Streak Helpers ─────────────────────────────────────────────────────────

function dayKey(ts: number): string {
  return new Date(ts).toISOString().split('T')[0]!;
}

function todayKey(): string {
  return new Date().toISOString().split('T')[0]!;
}

function consecutiveDaysBack(dates: Set<string>): number {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().split('T')[0]!;
    if (dates.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// ── Achievement Detection ────────────────────────────────────��─────────────

const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 90, 180, 365];
const COUNT_MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

export function detectAchievements(
  tasks: Task[],
  workoutHistory: WorkoutSession[],
  plans: DailyPlan[],
  existing: Achievement[],
): Achievement[] {
  const newAchievements: Achievement[] = [];
  const existingIds = new Set(existing.map((a) => a.id));

  const uid = (prefix: string, value: number) => `${prefix}_${value}`;

  // Task completion streak
  const taskCompletionDays = new Set<string>();
  for (const t of tasks) {
    if (t.completed && t.createdAt) {
      taskCompletionDays.add(dayKey(t.createdAt));
    }
  }
  const taskStreak = consecutiveDaysBack(taskCompletionDays);
  for (const m of STREAK_MILESTONES) {
    const id = uid('task_streak', m);
    if (taskStreak >= m && !existingIds.has(id)) {
      newAchievements.push({
        id,
        type: 'task_streak',
        title: `${m}-Day Task Streak`,
        description: `Completed tasks ${m} days in a row`,
        icon: m >= 30 ? '🔥' : '✅',
        value: m,
        earnedAt: Date.now(),
      });
    }
  }

  // Total tasks completed milestones
  const totalCompleted = tasks.filter((t) => t.completed).length;
  for (const m of COUNT_MILESTONES) {
    const id = uid('task_milestone', m);
    if (totalCompleted >= m && !existingIds.has(id)) {
      newAchievements.push({
        id,
        type: 'task_milestone',
        title: `${m} Tasks Crushed`,
        description: `Completed ${m} total tasks`,
        icon: m >= 100 ? '🏆' : '⚡',
        value: m,
        earnedAt: Date.now(),
      });
    }
  }

  // Workout streak
  const workoutDays = new Set<string>();
  for (const w of workoutHistory) {
    if (w.completedAt) workoutDays.add(dayKey(w.completedAt));
  }
  const workoutStreak = consecutiveDaysBack(workoutDays);
  for (const m of STREAK_MILESTONES) {
    const id = uid('workout_streak', m);
    if (workoutStreak >= m && !existingIds.has(id)) {
      newAchievements.push({
        id,
        type: 'workout_streak',
        title: `${m}-Day Workout Streak`,
        description: `Worked out ${m} days in a row`,
        icon: m >= 30 ? '💪' : '🏋️',
        value: m,
        earnedAt: Date.now(),
      });
    }
  }

  // Total workouts milestones
  const totalWorkouts = workoutHistory.filter((w) => w.completedAt).length;
  for (const m of COUNT_MILESTONES) {
    const id = uid('workout_count', m);
    if (totalWorkouts >= m && !existingIds.has(id)) {
      newAchievements.push({
        id,
        type: 'workout_count',
        title: `${m} Workouts Logged`,
        description: `Completed ${m} total workout sessions`,
        icon: m >= 100 ? '🥇' : '💪',
        value: m,
        earnedAt: Date.now(),
      });
    }
  }

  // Planner streak (days with intention set)
  const plannerDays = new Set<string>();
  for (const p of plans) {
    if (p.intention) plannerDays.add(p.date);
  }
  const plannerStreak = consecutiveDaysBack(plannerDays);
  for (const m of STREAK_MILESTONES) {
    const id = uid('planner_streak', m);
    if (plannerStreak >= m && !existingIds.has(id)) {
      newAchievements.push({
        id,
        type: 'planner_streak',
        title: `${m}-Day Planning Streak`,
        description: `Set your daily intention ${m} days straight`,
        icon: m >= 30 ? '🌟' : '📋',
        value: m,
        earnedAt: Date.now(),
      });
    }
  }

  // Priority clear: completed all 3 top priorities today
  const today = todayKey();
  const todayPlan = plans.find((p) => p.date === today);
  if (todayPlan && todayPlan.topPriorities.length === 3) {
    const allDone = todayPlan.topPriorities.every((id) => {
      const task = tasks.find((t) => t.id === id);
      return task?.completed;
    });
    if (allDone && !existingIds.has(`priority_clear_${today}`)) {
      newAchievements.push({
        id: `priority_clear_${today}`,
        type: 'priority_clear',
        title: 'Priority Sweep',
        description: 'Cleared all 3 top priorities today',
        icon: '🎯',
        value: 3,
        earnedAt: Date.now(),
      });
    }
  }

  return newAchievements;
}

// ── Consistency Score ──────────────────────────────────────────────────────

export function calcConsistencyScore(
  tasks: Task[],
  workoutHistory: WorkoutSession[],
  plans: DailyPlan[],
): { score: number; tasksCompleted: number; workouts: number; plannerDays: number } {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoTs = weekAgo.getTime();
  const weekAgoDate = weekAgo.toISOString().split('T')[0]!;

  const tasksCompleted = tasks.filter(
    (t) => t.completed && t.createdAt >= weekAgoTs,
  ).length;

  const workouts = workoutHistory.filter(
    (w) => w.completedAt && w.completedAt >= weekAgoTs,
  ).length;

  const plannerDays = plans.filter(
    (p) => p.date >= weekAgoDate && p.intention,
  ).length;

  // Score: weighted sum capped at 100
  const taskScore = Math.min(tasksCompleted * 3, 30);    // max 30
  const workoutScore = Math.min(workouts * 10, 30);       // max 30
  const plannerScore = Math.min(plannerDays * 5, 35);     // max 35
  const bonusStreak = tasksCompleted >= 7 && workouts >= 3 && plannerDays >= 5 ? 5 : 0;

  const score = Math.min(taskScore + workoutScore + plannerScore + bonusStreak, 100);

  return { score, tasksCompleted, workouts, plannerDays };
}
