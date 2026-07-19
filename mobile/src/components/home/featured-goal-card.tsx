/**
 * featured-goal-card.tsx — the big card at the top of Home for `featuredGoal`
 * (see dashboard-engine.ts): fraction + title + area icon, a Today chip with
 * a one-tap "+" for count/streak goals, and long-press to pin/unpin. Numeric
 * and currency metrics don't have a meaningful "+1" so the "+" opens the goal
 * detail screen instead.
 */

import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { LIFE_AREA_ICONS } from '@/components/icons/life-area-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LifeAreaColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { todayChipFor } from '@/lib/dashboard-engine';
import { useLogProgress, useSetPinned } from '@/lib/goals-hooks';
import type { Goal, ProgressEvent } from '@/lib/goals-types';

const ACCENT = '#3c87f7';

interface FeaturedGoalCardProps {
  goal: Goal;
  events: readonly ProgressEvent[];
  today: Date;
}

export function FeaturedGoalCard({ goal, events, today }: FeaturedGoalCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const logProgress = useLogProgress();
  const setPinned = useSetPinned();

  const chip = todayChipFor(goal, events, today);
  const Icon = LIFE_AREA_ICONS[goal.lifeArea];
  const areaColor = LifeAreaColors[goal.lifeArea];
  const isOneTapLoggable = goal.metricType === 'count' || goal.metricType === 'streak';

  function handlePlusPress() {
    if (isOneTapLoggable) {
      logProgress.mutate({ goalId: goal.id, amount: 1 });
    } else {
      router.push(`/goals/${goal.id}`);
    }
  }

  function handleLongPress() {
    setPinned.mutate(goal.pinnedAt !== null ? null : goal.id);
  }

  return (
    <Pressable onLongPress={handleLongPress} delayLongPress={400}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.topRow}>
          <View style={[styles.iconBadge, { borderColor: areaColor }]}>
            <Icon size={20} color={areaColor} />
          </View>
          {goal.pinnedAt !== null && (
            <View style={styles.pinnedBadge}>
              <View style={styles.pinnedDot} />
              <ThemedText type="small" themeColor="textSecondary">
                Pinned
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.mainRow}>
          <View style={styles.fractionBlock}>
            <ThemedText style={styles.fraction}>
              {chip.windowCurrent}/{chip.windowTarget}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {goal.title}
            </ThemedText>
          </View>

          <Pressable
            onPress={handlePlusPress}
            hitSlop={12}
            style={({ pressed }) => [styles.todayChip, pressed && styles.pressed]}>
            <ThemedText type="small" style={styles.todayChipLabel}>
              {chip.label}
            </ThemedText>
            <View style={[styles.plusButton, { backgroundColor: ACCENT }]}>
              <ThemedText style={styles.plusButtonText}>+</ThemedText>
            </View>
          </Pressable>
        </View>
      </ThemedView>
    </Pressable>
  );
}

export function EmptyFeaturedGoalCard() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/goals/new')} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={[styles.card, styles.emptyCard]}>
        <ThemedText style={styles.emptyText}>Set your first goal +</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  pinnedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  fractionBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  fraction: {
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 44,
  },
  todayChip: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  todayChipLabel: {
    fontWeight: '600',
  },
  plusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusButtonText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.7,
  },
});
