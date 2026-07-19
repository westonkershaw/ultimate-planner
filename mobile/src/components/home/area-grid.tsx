/**
 * area-grid.tsx — 2-column grid, one card per LifeArea excluding the area
 * already shown in the FeaturedGoalCard. Always renders every remaining area
 * (stable layout) so the grid doesn't reflow as goals are added/removed.
 */

import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { LIFE_AREA_ICONS } from '@/components/icons/life-area-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LifeAreaColors, Spacing } from '@/constants/theme';
import { deriveStatus, progressForCadence } from '@/lib/goal-engine';
import { primaryGoalForArea } from '@/lib/dashboard-engine';
import { LIFE_AREAS, LIFE_AREA_LABELS, type Goal, type LifeArea, type ProgressEvent } from '@/lib/goals-types';

const PROGRESSING_COLOR = '#3c87f7';
const NEEDS_ATTENTION_COLOR = '#e0453c';

interface AreaGridProps {
  goals: readonly Goal[];
  events: readonly ProgressEvent[];
  today: Date;
  excludeArea: LifeArea | null;
}

function AreaCard({ area, goals, events, today }: { area: LifeArea; goals: readonly Goal[]; events: readonly ProgressEvent[]; today: Date }) {
  const router = useRouter();
  const Icon = LIFE_AREA_ICONS[area];
  const areaColor = LifeAreaColors[area];
  const goal = primaryGoalForArea(goals, area, today);

  if (!goal) {
    return (
      <Pressable
        onPress={() => router.push('/goals/new')}
        style={({ pressed }) => [styles.cardWrap, pressed && styles.pressed]}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <Icon size={20} color={areaColor} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.areaLabel}>
            {LIFE_AREA_LABELS[area].toUpperCase()}
          </ThemedText>
          <ThemedText type="smallBold">Set a goal +</ThemedText>
        </ThemedView>
      </Pressable>
    );
  }

  const window = progressForCadence(goal, events, today);
  const status = deriveStatus(goal, events, today);
  const statusColor = status === 'progressing' ? PROGRESSING_COLOR : NEEDS_ATTENTION_COLOR;

  return (
    <Pressable
      onPress={() => router.push(`/goals/${goal.id}`)}
      style={({ pressed }) => [styles.cardWrap, pressed && styles.pressed]}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.cardTopRow}>
          <Icon size={20} color={areaColor} />
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.areaLabel}>
          {LIFE_AREA_LABELS[area].toUpperCase()}
        </ThemedText>
        <ThemedText type="smallBold" numberOfLines={1}>
          {window.current}/{window.target}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function AreaGrid({ goals, events, today, excludeArea }: AreaGridProps) {
  const areas = LIFE_AREAS.filter((area) => area !== excludeArea);

  return (
    <View style={styles.grid}>
      {areas.map((area) => (
        <View key={area} style={styles.gridItem}>
          <AreaCard area={area} goals={goals} events={events} today={today} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  gridItem: {
    width: '48%',
  },
  cardWrap: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
    minHeight: 92,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  areaLabel: {
    letterSpacing: 0.5,
  },
});
