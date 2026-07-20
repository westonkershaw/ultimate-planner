/**
 * completion-step.tsx — wizard's final step: a congratulatory summary of how
 * many blocks got scheduled, plus the weekly-planning reminder preference
 * (day-of-week chip + HH:MM text input, same format/validation style as
 * new-block.tsx's start-time field). Saved via setWeeklyPlanningPreference
 * (planning-prefs.ts) — this step stores a preference value only; it does
 * NOT schedule any notification (that's a later sub-branch bringing in
 * expo-notifications), and the copy says so explicitly.
 */

import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WEEKDAYS, type Weekday } from '@/lib/planning-prefs';

const ACCENT = '#3c87f7';
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

const WEEKDAY_LABELS: Record<Weekday, string> = {
  sunday: 'Sun',
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
};

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={selected ? 'backgroundSelected' : 'backgroundElement'}
        style={[styles.chip, selected && { borderColor: ACCENT, borderWidth: 1 }]}>
        <ThemedText
          type="small"
          themeColor={selected ? 'text' : 'textSecondary'}
          style={selected && { color: theme.text }}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CompletionStep({
  scheduledCount,
  weekday,
  time,
  onWeekdayChange,
  onTimeChange,
  timeError,
}: {
  scheduledCount: number;
  weekday: Weekday;
  time: string;
  onWeekdayChange: (weekday: Weekday) => void;
  onTimeChange: (time: string) => void;
  timeError: string | null;
}) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle">Week planned</ThemedText>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">
          {scheduledCount === 0
            ? 'No blocks scheduled this session — you can always add more from Today.'
            : `You scheduled ${scheduledCount} block${scheduledCount === 1 ? '' : 's'} for the upcoming week.`}
        </ThemedText>
      </ThemedView>

      <View style={styles.field}>
        <ThemedText type="smallBold">Weekly planning reminder</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          This only saves your preferred day and time for now — it doesn&apos;t send a notification yet.
        </ThemedText>

        <View style={styles.chipRow}>
          {WEEKDAYS.map((day) => (
            <Chip
              key={day}
              label={WEEKDAY_LABELS[day]}
              selected={weekday === day}
              onPress={() => onWeekdayChange(day)}
            />
          ))}
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          placeholder="HH:MM"
          placeholderTextColor={theme.textSecondary}
          value={time}
          onChangeText={onTimeChange}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
        />
        {timeError && <ThemedText style={styles.errorText}>{timeError}</ThemedText>}
      </View>
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
  field: {
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  errorText: {
    color: '#e0453c',
  },
  pressed: {
    opacity: 0.7,
  },
});
