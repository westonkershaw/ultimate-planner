/**
 * progressing-list.tsx — the "PROGRESSING GOALS" section: one row per goal in
 * `progressingGoalsSort` order (see dashboard-engine.ts). Each row shows a
 * status dot (or a target-flag mark when the goal has a target date), title,
 * a subtitle line, and how long ago it was last logged.
 *
 * NOTE: no "Next block" line yet — calendar blocks arrive in Phase 4.
 */

import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { TargetFlagIcon } from '@/components/icons/life-area-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { deriveStatus } from '@/lib/goal-engine';
import { formatTargetDate } from '@/components/home/format-target-date';
import { LIFE_AREA_LABELS, type Goal, type ProgressEvent } from '@/lib/goals-types';

const PROGRESSING_COLOR = '#3c87f7';
const NEEDS_ATTENTION_COLOR = '#e0453c';
const LAST_LOGGED_CAP_DAYS = 60;

/** 'Not yet logged' / '{n}d ago' / capped '60+d ago' display for the right column. */
function formatLastLogged(daysAgo: number | null): string {
  if (daysAgo === null) return 'Not yet logged';
  if (daysAgo > LAST_LOGGED_CAP_DAYS) return `${LAST_LOGGED_CAP_DAYS}+d ago`;
  return `Logged ${daysAgo}d ago`;
}

interface ProgressingRowProps {
  goal: Goal;
  events: readonly ProgressEvent[];
  today: Date;
  lastLoggedDaysAgo: number | null;
}

function ProgressingRow({ goal, events, today, lastLoggedDaysAgo }: ProgressingRowProps) {
  const router = useRouter();
  const status = deriveStatus(goal, events, today);
  const statusColor = status === 'progressing' ? PROGRESSING_COLOR : NEEDS_ATTENTION_COLOR;

  const subtitle = goal.targetDate
    ? `Target: ${formatTargetDate(goal.targetDate)}`
    : `${LIFE_AREA_LABELS[goal.lifeArea]} · ${goal.cadence}`;

  return (
    <Pressable
      onPress={() => router.push(`/goals/${goal.id}`)}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <View style={styles.marker}>
          {goal.targetDate ? (
            <TargetFlagIcon size={18} color={statusColor} />
          ) : (
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
          )}
        </View>
        <View style={styles.textBlock}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {goal.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.lastLogged}>
          {formatLastLogged(lastLoggedDaysAgo)}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

interface ProgressingListProps {
  goals: readonly Goal[];
  events: readonly ProgressEvent[];
  today: Date;
  lastLoggedDaysAgoByGoalId: ReadonlyMap<string, number | null>;
}

export function ProgressingList({ goals, events, today, lastLoggedDaysAgoByGoalId }: ProgressingListProps) {
  if (goals.length === 0) {
    return null;
  }

  return (
    <View style={styles.list}>
      {goals.map((goal) => (
        <ProgressingRow
          key={goal.id}
          goal={goal}
          events={events}
          today={today}
          lastLoggedDaysAgo={lastLoggedDaysAgoByGoalId.get(goal.id) ?? null}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  marker: {
    width: 18,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  lastLogged: {
    textAlign: 'right',
  },
});
