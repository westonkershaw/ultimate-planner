import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, CheckSquare, Dumbbell, Sparkles } from 'lucide-react';
import { useTaskStore, useWorkoutStore } from '@/store';
import { usePlannerStore } from '@/store/usePlannerStore';
import { calcConsistencyScore } from '@/utils/communityEngine';
import type { LeaderboardEntry } from '@/utils/communityEngine';

// Placeholder community members (replaced by Supabase when connected)
const DEMO_ENTRIES: Omit<LeaderboardEntry, 'rank'>[] = [
  { name: 'Alex M.', score: 88, tasksCompleted: 24, workouts: 5, plannerDays: 7, isCurrentUser: false },
  { name: 'Jordan K.', score: 76, tasksCompleted: 18, workouts: 4, plannerDays: 6, isCurrentUser: false },
  { name: 'Sam R.', score: 61, tasksCompleted: 12, workouts: 3, plannerDays: 5, isCurrentUser: false },
  { name: 'Taylor P.', score: 45, tasksCompleted: 8, workouts: 2, plannerDays: 3, isCurrentUser: false },
];

const RANK_STYLES: Record<number, string> = {
  1: 'border-amber-500/30 bg-amber-500/5',
  2: 'border-slate-400/30 bg-slate-400/5',
  3: 'border-amber-700/30 bg-amber-700/5',
};

const RANK_BADGES = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const tasks = useTaskStore((s) => s.tasks);
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const plans = usePlannerStore((s) => s.plans);

  const myStats = useMemo(
    () => calcConsistencyScore(tasks, workoutHistory, plans),
    [tasks, workoutHistory, plans],
  );

  const entries = useMemo(() => {
    const me: LeaderboardEntry = {
      rank: 0,
      name: 'You',
      score: myStats.score,
      tasksCompleted: myStats.tasksCompleted,
      workouts: myStats.workouts,
      plannerDays: myStats.plannerDays,
      isCurrentUser: true,
    };
    const all = [...DEMO_ENTRIES.map((e) => ({ ...e, rank: 0 })), me];
    all.sort((a, b) => b.score - a.score);
    return all.map((e, i) => ({ ...e, rank: i + 1 }));
  }, [myStats]);

  return (
    <div className="space-y-4">
      {/* Score card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 text-center space-y-3"
      >
        <div className="text-xs font-bold text-indigo-400 uppercase tracking-[2px]">
          Your Weekly Score
        </div>
        <div className="text-5xl font-black text-slate-100 font-[Syne]">
          {myStats.score}
        </div>
        <div className="flex justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <CheckSquare size={12} className="text-indigo-400" />
            {myStats.tasksCompleted} tasks
          </span>
          <span className="flex items-center gap-1">
            <Dumbbell size={12} className="text-indigo-400" />
            {myStats.workouts} workouts
          </span>
          <span className="flex items-center gap-1">
            <Sparkles size={12} className="text-indigo-400" />
            {myStats.plannerDays}d planned
          </span>
        </div>
        {/* Score bar */}
        <div className="bg-slate-900/60 rounded-full h-2 overflow-hidden max-w-xs mx-auto">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #6366f1, #34d399)' }}
            initial={{ width: 0 }}
            animate={{ width: `${myStats.score}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </motion.div>

      {/* Header */}
      <div className="flex items-center gap-2">
        <Trophy size={14} className="text-amber-400" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Weekly Leaderboard
        </span>
      </div>

      {/* Rankings */}
      <div className="space-y-2">
        {entries.map((entry, i) => (
          <motion.div
            key={entry.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={[
              'flex items-center gap-3 p-3 rounded-xl border transition-all',
              entry.isCurrentUser
                ? 'border-indigo-500/30 bg-indigo-500/8'
                : RANK_STYLES[entry.rank] ?? 'border-slate-800/40 bg-slate-900/30',
            ].join(' ')}
          >
            {/* Rank */}
            <div className="w-8 text-center flex-shrink-0">
              {entry.rank <= 3 ? (
                <span className="text-lg">{RANK_BADGES[entry.rank - 1]}</span>
              ) : (
                <span className="text-sm font-bold text-slate-600">#{entry.rank}</span>
              )}
            </div>

            {/* Avatar */}
            <div className={[
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
              entry.isCurrentUser
                ? 'bg-indigo-500/30 text-indigo-300'
                : 'bg-slate-800 text-slate-400',
            ].join(' ')}>
              {entry.name[0]}
            </div>

            {/* Name + stats */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={[
                  'text-sm font-semibold truncate',
                  entry.isCurrentUser ? 'text-indigo-300' : 'text-slate-200',
                ].join(' ')}>
                  {entry.name}
                </span>
                {entry.isCurrentUser && (
                  <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/15 px-1.5 py-0.5 rounded">
                    YOU
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-600">
                {entry.tasksCompleted}t &middot; {entry.workouts}w &middot; {entry.plannerDays}d
              </span>
            </div>

            {/* Score */}
            <div className="text-right flex-shrink-0">
              <span className={[
                'text-lg font-black',
                entry.isCurrentUser ? 'text-indigo-300' : 'text-slate-300',
              ].join(' ')}>
                {entry.score}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <p className="text-[10px] text-slate-700 text-center pt-1">
        Score based on tasks completed, workouts logged &amp; days planned this week
      </p>
    </div>
  );
}
