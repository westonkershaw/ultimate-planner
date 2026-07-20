/**
 * schedule-blocks-step.tsx — wizard Step 3: an inline block-creation form
 * (title, day-of-week chip for the upcoming Mon-Sun, optional time, optional
 * goal/person pickers matching new-block.tsx's Chip pattern) plus a running
 * list of everything scheduled so far this step, each removable via
 * useDeleteBlock. Deliberately inline rather than navigating to
 * app/plan/new-block.tsx — leaving the wizard here would lose wizard state.
 *
 * Day chips are labeled Monday..Sunday and map to the seven day keys of the
 * upcoming local week, built once from `nextMonday` (already computed by the
 * parent via time-policy) — this component never derives a day key itself.
 */

import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Block } from '@/lib/block-types';
import { useCreateBlock, useDeleteBlock } from '@/lib/blocks-hooks';
import type { Goal } from '@/lib/goals-types';
import type { Person } from '@/lib/people-types';

const ACCENT = '#3c87f7';
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
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

export function ScheduleBlocksStep({
  weekDayKeys,
  goals,
  people,
  scheduled,
  onScheduled,
  onRemoved,
}: {
  /** The 7 day keys of the upcoming week, Monday first, Sunday last. */
  weekDayKeys: readonly string[];
  goals: readonly Goal[];
  people: readonly Person[];
  scheduled: readonly Block[];
  onScheduled: (block: Block) => void;
  onRemoved: (id: string) => void;
}) {
  const theme = useTheme();
  const createBlock = useCreateBlock();
  const deleteBlock = useDeleteBlock();

  const [title, setTitle] = useState('');
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('');
  const [goalId, setGoalId] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const activeGoals = goals.filter((g) => g.archivedAt === null);
  const inputBackground = theme.backgroundElement;

  function resetForm() {
    setTitle('');
    setDayIndex(null);
    setStartTime('');
    setGoalId(null);
    setPersonId(null);
  }

  function validate(): string | null {
    if (!title.trim()) return 'Enter a title.';
    if (dayIndex === null) return 'Pick a day of the week.';
    if (startTime.trim() && !isValidTime(startTime.trim())) {
      return 'Start time must be in HH:MM 24-hour format.';
    }
    return null;
  }

  async function handleAdd() {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);

    try {
      const block = await createBlock.mutateAsync({
        title: title.trim(),
        scheduledOn: weekDayKeys[dayIndex!]!,
        startTime: startTime.trim() ? `${startTime.trim()}:00` : null,
        goalId,
        personId,
      });
      onScheduled(block);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create block.');
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      await deleteBlock.mutateAsync(id);
      onRemoved(id);
    } catch {
      // Deletion error: leave the entry in the list so the user can retry.
    } finally {
      setRemovingId(null);
    }
  }

  const goalTitleById = new Map(goals.map((g) => [g.id, g.title]));
  const personNameById = new Map(people.map((p) => [p.id, p.name]));

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle">Schedule the week ahead</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Add blocks one at a time. You can remove any of them before finishing.
      </ThemedText>

      <ThemedView type="backgroundElement" style={styles.form}>
        <View style={styles.field}>
          <ThemedText type="smallBold">Title</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            placeholder="e.g. Morning run"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="smallBold">Day</ThemedText>
          <View style={styles.chipRow}>
            {DAY_LABELS.map((label, index) => (
              <Chip
                key={label}
                label={label.slice(0, 3)}
                selected={dayIndex === index}
                onPress={() => setDayIndex(dayIndex === index ? null : index)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <ThemedText type="smallBold">Start time (optional)</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            placeholder="HH:MM"
            placeholderTextColor={theme.textSecondary}
            value={startTime}
            onChangeText={setStartTime}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="smallBold">Goal (optional)</ThemedText>
          {activeGoals.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No active goals yet.
            </ThemedText>
          ) : (
            <View style={styles.chipRow}>
              {activeGoals.map((goal) => (
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

        {formError && <ThemedText style={styles.errorText}>{formError}</ThemedText>}

        <Pressable
          onPress={handleAdd}
          disabled={createBlock.isPending}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: ACCENT },
            (pressed || createBlock.isPending) && styles.pressed,
          ]}>
          {createBlock.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText style={styles.addButtonText}>Add block</ThemedText>
          )}
        </Pressable>
      </ThemedView>

      <View style={styles.scheduledSection}>
        <ThemedText type="smallBold">
          Scheduled so far ({scheduled.length})
        </ThemedText>
        {scheduled.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Nothing scheduled yet.
          </ThemedText>
        ) : (
          <View style={styles.scheduledList}>
            {scheduled.map((block) => {
              const dayLabel = (() => {
                const idx = weekDayKeys.indexOf(block.scheduledOn);
                return idx >= 0 ? DAY_LABELS[idx] : block.scheduledOn;
              })();
              return (
                <ThemedView key={block.id} type="backgroundElement" style={styles.scheduledRow}>
                  <View style={styles.scheduledRowMain}>
                    <ThemedText type="smallBold" numberOfLines={1} style={styles.scheduledTitle}>
                      {block.title}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {dayLabel}
                      {block.startTime ? ` · ${block.startTime.slice(0, 5)}` : ''}
                      {block.goalId ? ` · ${goalTitleById.get(block.goalId) ?? 'Goal'}` : ''}
                      {block.personId ? ` · ${personNameById.get(block.personId) ?? 'Person'}` : ''}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => handleRemove(block.id)}
                    disabled={removingId === block.id}
                    style={({ pressed }) => pressed && styles.pressed}>
                    {removingId === block.id ? (
                      <ActivityIndicator color={theme.textSecondary} size="small" />
                    ) : (
                      <ThemedText style={styles.removeText}>Remove</ThemedText>
                    )}
                  </Pressable>
                </ThemedView>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  form: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
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
    maxWidth: 160,
  },
  errorText: {
    color: '#e0453c',
  },
  addButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  scheduledSection: {
    gap: Spacing.two,
  },
  scheduledList: {
    gap: Spacing.two,
  },
  scheduledRow: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  scheduledRowMain: {
    flex: 1,
    gap: Spacing.half,
  },
  scheduledTitle: {
    flex: 1,
  },
  removeText: {
    color: '#e0453c',
    fontWeight: '600',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.7,
  },
});
