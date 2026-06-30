import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award } from 'lucide-react';
import { useTaskStore, useWorkoutStore, useCommunityStore } from '@/store';
import { usePlannerStore } from '@/store/usePlannerStore';
import { detectAchievements } from '@/utils/communityEngine';
import type { ReactionEmoji, AchievementPost } from '@/store/useCommunityStore';

const REACTION_EMOJIS: ReactionEmoji[] = ['🔥', '💪', '👏', '⭐', '🎉'];

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function AchievementCard({ post }: { post: AchievementPost }) {
  const toggleReaction = useCommunityStore((s) => s.toggleReaction);
  const { achievement, reactions } = post;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-border bg-surface-1 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center text-xl flex-shrink-0">
          {achievement.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-fg">{achievement.title}</h4>
          <p className="text-xs text-fg-muted">{achievement.description}</p>
        </div>
        <span className="text-[10px] text-fg-faint flex-shrink-0">
          {timeAgo(achievement.earnedAt)}
        </span>
      </div>

      {/* Reactions */}
      <div className="flex items-center gap-1.5">
        {REACTION_EMOJIS.map((emoji) => {
          const r = reactions[emoji];
          return (
            <motion.button
              key={emoji}
              whileTap={{ scale: 0.85 }}
              onClick={() => toggleReaction(post.id, emoji)}
              className={[
                'flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all',
                r.reacted
                  ? 'bg-accent/15 border border-accent/30'
                  : 'bg-surface-2 border border-border hover:border-border-strong',
              ].join(' ')}
            >
              <span>{emoji}</span>
              {r.count > 0 && (
                <span className={r.reacted ? 'text-accent-text' : 'text-fg-muted'}>
                  {r.count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function AchievementFeed() {
  const tasks = useTaskStore((s) => s.tasks);
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const plans = usePlannerStore((s) => s.plans);
  const { achievements, posts, addAchievements } = useCommunityStore();

  // Check for new achievements on mount and when data changes
  const newAchievements = useMemo(
    () => detectAchievements(tasks, workoutHistory, plans, achievements),
    [tasks, workoutHistory, plans, achievements],
  );

  useEffect(() => {
    if (newAchievements.length > 0) {
      addAchievements(newAchievements);
    }
  }, [newAchievements, addAchievements]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Award size={14} className="text-accent-text" />
        <span className="text-xs font-bold text-fg-muted uppercase tracking-wider">
          Achievements
        </span>
        {posts.length > 0 && (
          <span className="text-[10px] text-fg-faint ml-auto">
            {posts.length} earned
          </span>
        )}
      </div>

      {posts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 space-y-3"
        >
          <div className="text-4xl">🏅</div>
          <p className="text-sm text-fg-muted">No achievements yet</p>
          <p className="text-xs text-fg-faint max-w-xs mx-auto">
            Complete tasks, log workouts, and set daily intentions to earn your first achievement
          </p>
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {posts.map((post) => (
              <AchievementCard key={post.id} post={post} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
