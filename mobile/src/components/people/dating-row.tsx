/**
 * dating-row.tsx — a single row in the DATING section of the People list.
 * Shows the resolved-status badge, name, and (for engaged/newlywed/married)
 * the wedding date, plus a countdown chip for a still-future engaged wedding.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/people/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { weddingCountdownDays } from '@/lib/people-grouping';
import type { Person } from '@/lib/people-types';
import { resolveRelationshipStatus } from '@/lib/relationship-status';
import { formatTargetDate } from '@/components/home/format-target-date';

const ACCENT = '#3c87f7';
const WEDDING_DATE_STATUSES = new Set(['engaged', 'newlywed', 'married']);

export function DatingRow({
  person,
  today,
  onPress,
  onLongPress,
}: {
  person: Person;
  today: Date;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const resolved = resolveRelationshipStatus(person.relationshipStatus, person.weddingDate, today);
  const showWeddingDate = resolved !== null && WEDDING_DATE_STATUSES.has(resolved) && person.weddingDate !== null;

  const countdown =
    resolved === 'engaged' && person.weddingDate !== null
      ? weddingCountdownDays(person.weddingDate, today)
      : null;
  const showCountdown = countdown !== null && countdown > 0;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <StatusBadge resolved={resolved} showLabel={false} />
        <View style={styles.textBlock}>
          <ThemedText type="small" numberOfLines={1} style={styles.name}>
            {person.name}
          </ThemedText>
          {showWeddingDate && (
            <ThemedText type="small" themeColor="textSecondary">
              {formatTargetDate(person.weddingDate!)}
            </ThemedText>
          )}
        </View>
        {showCountdown && (
          <View style={[styles.chip, { borderColor: ACCENT }]}>
            <ThemedText type="small" style={{ color: ACCENT }}>
              in {countdown}d
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  textBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  name: {
    fontWeight: '600',
  },
  chip: {
    borderWidth: 1,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
});
