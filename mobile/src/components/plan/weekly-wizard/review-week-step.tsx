/**
 * review-week-step.tsx — wizard Step 1: a celebratory, factual recap of last
 * week (blocks done/total + a per-active-goal progress line), built entirely
 * from weekly-review.ts (weeklyBlockSummary/weeklyGoalRecap) — no local
 * summation. Copy stays neutral/encouraging even at zero progress; it never
 * scolds.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { CompletionSummary } from '@/lib/block-engine';
import { LIFE_AREA_LABELS } from '@/lib/goals-types';
import type { WeeklyGoalRecapEntry } from '@/lib/weekly-review';

function blockSummaryLine(summary: CompletionSummary): string {
  if (summary.total === 0) {
    return "You didn't have any blocks scheduled last week.";
  }
  return `You completed ${summary.done} of ${summary.total} scheduled blocks last week.`;
}

function goalRecapLine(entry: WeeklyGoalRecapEntry): string {
  if (entry.progress === 0) {
    return `${entry.title} — no logged progress last week.`;
  }
  return `${entry.title} — ${entry.progress} logged last week.`;
}

export function ReviewWeekStep({
  blockSummary,
  goalRecap,
}: {
  blockSummary: CompletionSummary;
  goalRecap: WeeklyGoalRecapEntry[];
}) {
  const byArea = new Map<string, WeeklyGoalRecapEntry[]>();
  for (const entry of goalRecap) {
    const list = byArea.get(entry.lifeArea);
    if (list) {
      list.push(entry);
    } else {
      byArea.set(entry.lifeArea, [entry]);
    }
  }

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle">Last week in review</ThemedText>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{blockSummaryLine(blockSummary)}</ThemedText>
      </ThemedView>

      {goalRecap.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No active goals to recap yet — add one on the next step.
        </ThemedText>
      ) : (
        <View style={styles.areas}>
          {Array.from(byArea.entries()).map(([lifeArea, entries]) => (
            <View key={lifeArea} style={styles.areaBlock}>
              <ThemedText type="smallBold">
                {LIFE_AREA_LABELS[lifeArea as keyof typeof LIFE_AREA_LABELS] ?? lifeArea}
              </ThemedText>
              {entries.map((entry) => (
                <ThemedText key={entry.goalId} type="small" themeColor="textSecondary">
                  {goalRecapLine(entry)}
                </ThemedText>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
  },
  areas: {
    gap: Spacing.three,
  },
  areaBlock: {
    gap: Spacing.one,
  },
});
