import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ID, Timestamp } from '@/types';
import type { Achievement } from '@/utils/communityEngine';

// ── Types ──────────────────────────────────────────────────────────────────

export type ReactionEmoji = '🔥' | '💪' | '👏' | '⭐' | '🎉';

export interface Reaction {
  emoji: ReactionEmoji;
  count: number;
  reacted: boolean; // whether current user reacted with this emoji
}

export interface AchievementPost {
  id: ID;
  achievement: Achievement;
  reactions: Record<ReactionEmoji, Reaction>;
}

// ── State & Actions ────────────────────────────────────────────────────────

interface CommunityState {
  achievements: Achievement[];
  posts: AchievementPost[];
  optedInToLeaderboard: boolean;
  lastCheckedAt: Timestamp;
}

interface CommunityActions {
  addAchievements: (newAchievements: Achievement[]) => void;
  toggleReaction: (postId: ID, emoji: ReactionEmoji) => void;
  setOptedIn: (value: boolean) => void;
  setLastChecked: (ts: Timestamp) => void;
}

export type CommunityStore = CommunityState & CommunityActions;

// ── Helpers ────────────────────────────────────────────────────────────────

const EMOJIS: ReactionEmoji[] = ['🔥', '💪', '👏', '⭐', '🎉'];

function makeReactions(): Record<ReactionEmoji, Reaction> {
  const r = {} as Record<ReactionEmoji, Reaction>;
  for (const e of EMOJIS) r[e] = { emoji: e, count: 0, reacted: false };
  return r;
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useCommunityStore = create<CommunityStore>()(
  persist(
    immer((set) => ({
      achievements: [],
      posts: [],
      optedInToLeaderboard: false,
      lastCheckedAt: 0,

      addAchievements: (newAchievements) =>
        set((draft) => {
          for (const a of newAchievements) {
            if (draft.achievements.some((e) => e.id === a.id)) continue;
            draft.achievements.push(a);
            draft.posts.unshift({
              id: `post_${a.id}`,
              achievement: a,
              reactions: makeReactions(),
            });
          }
        }),

      toggleReaction: (postId, emoji) =>
        set((draft) => {
          const post = draft.posts.find((p) => p.id === postId);
          if (!post) return;
          const r = post.reactions[emoji];
          if (r.reacted) {
            r.count = Math.max(0, r.count - 1);
            r.reacted = false;
          } else {
            r.count += 1;
            r.reacted = true;
          }
        }),

      setOptedIn: (value) =>
        set((draft) => {
          draft.optedInToLeaderboard = value;
        }),

      setLastChecked: (ts) =>
        set((draft) => {
          draft.lastCheckedAt = ts;
        }),
    })),
    { name: 'up_community' },
  ),
);
