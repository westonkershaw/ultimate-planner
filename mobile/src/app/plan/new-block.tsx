/**
 * new-block.tsx — create-block form. Mirrors goals/new.tsx and people/new.tsx:
 * same field/label/input styling, same Chip picker visual language (see
 * components/goals/pickers.tsx, components/people/pickers.tsx) but built here
 * over live goal/person lists since those pickers are fixed enums and this
 * one isn't. `scheduledOn` arrives as a route param (day key from
 * time-policy) — this screen never computes a date key itself, only reads
 * the one it's handed and defaults to today's if none was passed.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCreateBlock } from '@/lib/blocks-hooks';
import { useGoals } from '@/lib/goals-hooks';
import { usePeople } from '@/lib/people-hooks';
import { localDayKey } from '@/lib/time-policy';

const ACCENT = '#3c87f7';
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** "YYYY-MM-DD" -> a friendlier label without pulling in a date-formatting dependency. */
function formatDayKeyLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  if (!y || !m || !d) return dayKey;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

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
          style={selected && { color: theme.text }}
          numberOfLines={1}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export default function NewBlockScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ scheduledOn?: string }>();
  const createBlock = useCreateBlock();

  const goalsQuery = useGoals();
  const peopleQuery = usePeople();
  const goals = (goalsQuery.data ?? []).filter((g) => g.archivedAt === null);
  const people = peopleQuery.data ?? [];

  const scheduledOn = params.scheduledOn?.trim() || localDayKey(new Date());

  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [goalId, setGoalId] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const inputBackground = theme.backgroundElement;

  function validate(): string | null {
    if (!title.trim()) return 'Enter a title.';
    if (startTime.trim() && !isValidTime(startTime.trim())) {
      return 'Start time must be in HH:MM 24-hour format.';
    }
    if (durationMinutes.trim()) {
      const parsed = Number(durationMinutes);
      if (Number.isNaN(parsed) || parsed <= 0) {
        return 'Duration must be a number of minutes greater than 0.';
      }
    }
    return null;
  }

  async function handleCreate() {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);

    try {
      await createBlock.mutateAsync({
        title: title.trim(),
        scheduledOn,
        startTime: startTime.trim() ? `${startTime.trim()}:00` : null,
        durationMinutes: durationMinutes.trim() ? Number(durationMinutes) : null,
        goalId,
        personId,
        notes: notes.trim() || null,
      });
      router.back();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create block.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <View style={styles.field}>
          <ThemedText type="smallBold">Title</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: inputBackground, color: theme.text }]}
            placeholder="e.g. Morning run"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="smallBold">Scheduled for</ThemedText>
          <ThemedView type="backgroundElement" style={styles.dayLabelBox}>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDayKeyLabel(scheduledOn)}
            </ThemedText>
          </ThemedView>
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.rowInput]}>
            <ThemedText type="smallBold">Start time (optional)</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: inputBackground, color: theme.text }]}
              placeholder="HH:MM"
              placeholderTextColor={theme.textSecondary}
              value={startTime}
              onChangeText={setStartTime}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={[styles.field, styles.rowInput]}>
            <ThemedText type="smallBold">Duration, min (optional)</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: inputBackground, color: theme.text }]}
              placeholder="30"
              placeholderTextColor={theme.textSecondary}
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.field}>
          <ThemedText type="smallBold">Goal (optional)</ThemedText>
          {goals.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No active goals yet.
            </ThemedText>
          ) : (
            <View style={styles.chipRow}>
              {goals.map((goal) => (
                <Chip
                  key={goal.id}
                  label={goal.title}
                  selected={goalId === goal.id}
                  onPress={() => setGoalId(goalId === goal.id ? null : goal.id)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.field}>
          <ThemedText type="smallBold">Person (optional)</ThemedText>
          {people.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No people added yet.
            </ThemedText>
          ) : (
            <View style={styles.chipRow}>
              {people.map((person) => (
                <Chip
                  key={person.id}
                  label={person.name}
                  selected={personId === person.id}
                  onPress={() => setPersonId(personId === person.id ? null : person.id)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.field}>
          <ThemedText type="smallBold">Notes (optional)</ThemedText>
          <TextInput
            style={[styles.input, styles.notesInput, { backgroundColor: inputBackground, color: theme.text }]}
            placeholder="Any details worth remembering"
            placeholderTextColor={theme.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {formError && <ThemedText style={styles.errorText}>{formError}</ThemedText>}

        <Pressable
          onPress={handleCreate}
          disabled={createBlock.isPending}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: ACCENT },
            (pressed || createBlock.isPending) && styles.pressed,
          ]}>
          {createBlock.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText style={styles.buttonText}>Create</ThemedText>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  field: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rowInput: {
    flex: 1,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dayLabelBox: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
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
    maxWidth: 220,
  },
  errorText: {
    color: '#e0453c',
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
