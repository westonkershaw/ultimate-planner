/**
 * period-card.tsx — full-width horizontally-pageable card, one page per
 * monthly-cadence goal (see FeaturedGoalCard for the weekly/daily equivalent
 * shown up top). Hidden entirely by the caller when there are no monthly
 * goals — this component always assumes `goals` is non-empty.
 */

import { useRouter } from 'expo-router';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { todayChipFor } from '@/lib/dashboard-engine';
import type { Goal, ProgressEvent } from '@/lib/goals-types';

const ACCENT = '#3c87f7';

interface PeriodCardProps {
  goals: readonly Goal[];
  events: readonly ProgressEvent[];
  today: Date;
}

function pageWidth(): number {
  return Math.min(Dimensions.get('window').width, MaxContentWidth) - Spacing.four * 2;
}

function PeriodPage({ goal, events, today, width }: { goal: Goal; events: readonly ProgressEvent[]; today: Date; width: number }) {
  const router = useRouter();
  const chip = todayChipFor(goal, events, today);
  const progressRatio = chip.windowTarget > 0 ? Math.min(1, chip.windowCurrent / chip.windowTarget) : 0;

  return (
    <Pressable
      onPress={() => router.push(`/goals/${goal.id}`)}
      style={({ pressed }) => [styles.page, { width }, pressed && styles.pressed]}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.chipLabel}>
        {chip.label.toUpperCase()}
      </ThemedText>
      <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
        {goal.title}
      </ThemedText>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progressRatio * 100}%` }]} />
      </View>
    </Pressable>
  );
}

export function PeriodCard({ goals, events, today }: PeriodCardProps) {
  const width = pageWidth();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={width}
        decelerationRate="fast">
        {goals.map((goal) => (
          <PeriodPage key={goal.id} goal={goal} events={events} today={today} width={width} />
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  page: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  chipLabel: {
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.25)',
    marginTop: Spacing.one,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 3,
  },
});
