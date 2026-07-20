/**
 * block-row.tsx — one row in the Today's Plan checklist. Mirrors the density
 * of ProgressingList's rows (components/home/progressing-list.tsx): a
 * checkbox/checkmark marker, title + optional chips, tappable to toggle
 * completion. `startTime` comes back from Postgres as "HH:MM:SS" — formatted
 * here as a plain "HH:MM" string, no timezone conversion (it's a wall-clock
 * time-of-day, not an instant).
 */

import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Block } from '@/lib/block-types';

const ACCENT = '#3c87f7';

/** "09:30:00" -> "09:30"; falls back to the raw string if it doesn't match. */
function formatStartTime(startTime: string): string {
  const match = /^(\d{2}):(\d{2})/.exec(startTime);
  return match ? `${match[1]}:${match[2]}` : startTime;
}

interface BlockRowProps {
  block: Block;
  goalTitle: string | null;
  personName: string | null;
  onToggleComplete: () => void;
  isToggling: boolean;
}

export function BlockRow({ block, goalTitle, personName, onToggleComplete, isToggling }: BlockRowProps) {
  const theme = useTheme();
  const isComplete = block.completedAt !== null;

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <Pressable
        onPress={onToggleComplete}
        disabled={isToggling}
        hitSlop={8}
        style={({ pressed }) => [styles.checkbox, { borderColor: isComplete ? ACCENT : theme.textSecondary }, pressed && styles.pressed]}>
        {isToggling ? (
          <ActivityIndicator size="small" color={ACCENT} />
        ) : (
          isComplete && <View style={[styles.checkboxFill, { backgroundColor: ACCENT }]} />
        )}
      </Pressable>

      <View style={styles.textBlock}>
        <ThemedText
          type="smallBold"
          numberOfLines={1}
          style={isComplete && styles.completedText}
          themeColor={isComplete ? 'textSecondary' : 'text'}>
          {block.title}
        </ThemedText>

        <View style={styles.metaRow}>
          {block.startTime && (
            <ThemedText type="small" themeColor="textSecondary">
              {formatStartTime(block.startTime)}
            </ThemedText>
          )}
          {goalTitle && (
            <ThemedView type="backgroundSelected" style={styles.chip}>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {goalTitle}
              </ThemedText>
            </ThemedView>
          )}
          {personName && (
            <ThemedView type="backgroundSelected" style={styles.chip}>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {personName}
              </ThemedText>
            </ThemedView>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Spacing.one,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxFill: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  textBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.five,
  },
});
