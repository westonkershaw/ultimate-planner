/**
 * person-row.tsx — a single row in a Friends & Family recency group: avatar,
 * name, and a "Last contact Nd ago" / "No contact logged" subtitle. Days are
 * computed via time-policy's localDaysBetween, never a raw ms diff.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/people/avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Person } from '@/lib/people-types';
import { localDayKey, localDaysBetween, startOfLocalDay } from '@/lib/time-policy';

/** Local-midnight Date from a 'YYYY-MM-DD' day-key — matches people-grouping.ts's convention. */
function localDateFromDayKey(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

function lastContactSubtitle(lastContactAt: string | null, today: Date): string {
  if (lastContactAt === null) return 'No contact logged';
  const lastContactDayKey = localDayKey(new Date(lastContactAt));
  const days = localDaysBetween(localDateFromDayKey(lastContactDayKey), startOfLocalDay(today));
  if (days <= 0) return 'Last contact today';
  return `Last contact ${days}d ago`;
}

export function PersonRow({
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
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <Avatar name={person.name} photoUrl={person.photoUrl} size={36} />
        <View style={styles.textBlock}>
          <ThemedText type="small" numberOfLines={1} style={styles.name}>
            {person.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {lastContactSubtitle(person.lastContactAt, today)}
          </ThemedText>
        </View>
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
    paddingVertical: Spacing.two,
  },
  textBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  name: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
