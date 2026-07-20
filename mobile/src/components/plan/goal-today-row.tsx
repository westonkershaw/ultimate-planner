/**
 * goal-today-row.tsx — one row in the "TODAY'S TARGETS" section of the Daily
 * Planning screen. Same density as ProgressingList's rows
 * (components/home/progressing-list.tsx): title + a single chip, no per-row
 * navigation state beyond what dashboard-engine already computed.
 *
 * The chip label comes from `todayChipFor` (dashboard-engine.ts) — this
 * component never derives progress/cadence math itself.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { TodayChip } from '@/lib/dashboard-engine';
import type { Goal } from '@/lib/goals-types';

const STATE_COLORS: Record<TodayChip['state'], string> = {
  done: '#3c87f7',
  due: '#60646C',
  behind: '#e0453c',
};

interface GoalTodayRowProps {
  goal: Goal;
  chip: TodayChip;
}

export function GoalTodayRow({ goal, chip }: GoalTodayRowProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={styles.textBlock}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {goal.title}
        </ThemedText>
      </View>
      <ThemedView type="backgroundSelected" style={styles.chip}>
        <ThemedText type="small" style={{ color: STATE_COLORS[chip.state] }}>
          {chip.label}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

interface GoalTodayListProps {
  goals: readonly Goal[];
  chipByGoalId: ReadonlyMap<string, TodayChip>;
}

export function GoalTodayList({ goals, chipByGoalId }: GoalTodayListProps) {
  if (goals.length === 0) {
    return null;
  }

  return (
    <View style={styles.list}>
      {goals.map((goal) => {
        const chip = chipByGoalId.get(goal.id);
        if (!chip) return null;
        return <GoalTodayRow key={goal.id} goal={goal} chip={chip} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  textBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.five,
  },
});
