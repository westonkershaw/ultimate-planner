import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { StatusDot } from '@/components/goals/status-dot';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { currentStreak, deriveStatus, progressForCadence } from '@/lib/goal-engine';
import {
  useArchiveGoal,
  useDeleteGoal,
  useGoalEvents,
  useGoals,
  useLogProgress,
  useUpdateGoal,
} from '@/lib/goals-hooks';

const ACCENT = '#3c87f7';

export default function GoalDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: goals, isLoading: goalsLoading } = useGoals();
  const goal = useMemo(() => goals?.find((g) => g.id === id), [goals, id]);

  const {
    data: events,
    isLoading: eventsLoading,
    isError: eventsError,
  } = useGoalEvents(id);

  const logProgress = useLogProgress();
  const updateGoal = useUpdateGoal();
  const archiveGoal = useArchiveGoal();
  const deleteGoal = useDeleteGoal();

  const [logAmount, setLogAmount] = useState('');
  const [logError, setLogError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTargetValue, setEditTargetValue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const today = new Date();

  if (goalsLoading) {
    return (
      <View style={styles.centerBlock}>
        <ActivityIndicator color={theme.text} />
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={styles.centerBlock}>
        <ThemedText style={styles.centerText}>This goal could not be found.</ThemedText>
      </View>
    );
  }

  const goalEvents = events ?? [];
  const window = progressForCadence(goal, goalEvents, today);
  const status = deriveStatus(goal, goalEvents, today);
  const streak = goal.metricType === 'streak' ? currentStreak(goalEvents, today) : null;
  const recentEvents = [...goalEvents]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 10);

  function startEditing() {
    setEditTitle(goal!.title);
    setEditTargetValue(String(goal!.targetValue));
    setEditError(null);
    setEditing(true);
  }

  async function handleSaveEdit() {
    const trimmedTitle = editTitle.trim();
    const parsedTarget = Number(editTargetValue);
    if (!trimmedTitle) {
      setEditError('Title cannot be empty.');
      return;
    }
    if (!editTargetValue.trim() || Number.isNaN(parsedTarget) || parsedTarget <= 0) {
      setEditError('Enter a target value greater than 0.');
      return;
    }
    setEditError(null);
    try {
      await updateGoal.mutateAsync({
        id: goal!.id,
        patch: { title: trimmedTitle, targetValue: parsedTarget },
      });
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not save changes.');
    }
  }

  async function handleQuickLog() {
    setLogError(null);
    try {
      await logProgress.mutateAsync({ goalId: goal!.id, amount: 1 });
    } catch (err) {
      setLogError(err instanceof Error ? err.message : 'Could not log progress.');
    }
  }

  async function handleAmountLog() {
    const parsed = Number(logAmount);
    if (!logAmount.trim() || Number.isNaN(parsed) || parsed === 0) {
      setLogError('Enter a non-zero amount.');
      return;
    }
    setLogError(null);
    try {
      await logProgress.mutateAsync({ goalId: goal!.id, amount: parsed });
      setLogAmount('');
    } catch (err) {
      setLogError(err instanceof Error ? err.message : 'Could not log progress.');
    }
  }

  function handleArchive() {
    Alert.alert('Archive goal?', `"${goal!.title}" will be hidden from your active goals list.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        onPress: async () => {
          try {
            await archiveGoal.mutateAsync(goal!.id);
            router.back();
          } catch {
            // archiveGoal.error surfaces below via mutation state
          }
        },
      },
    ]);
  }

  function handleDelete() {
    Alert.alert(
      'Delete goal?',
      `This permanently deletes "${goal!.title}" and all of its logged progress.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGoal.mutateAsync(goal!.id);
              router.back();
            } catch {
              // deleteGoal.error surfaces below via mutation state
            }
          },
        },
      ]
    );
  }

  const isCountLike = goal.metricType === 'count' || goal.metricType === 'streak';

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Stack.Screen options={{ title: goal.title }} />
      <View style={styles.content}>
        <View style={styles.headerBlock}>
          <ThemedText type="title" style={styles.bigNumber}>
            {window.current}
            <ThemedText type="subtitle" themeColor="textSecondary">
              {' '}
              / {window.target}
              {goal.unit ? ` ${goal.unit}` : ''}
            </ThemedText>
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            This {goal.cadence.replace('ly', '')} window ({window.windowStart} to{' '}
            {window.windowEnd})
          </ThemedText>
          <StatusDot status={status} />
          {streak !== null && (
            <ThemedText type="small" themeColor="textSecondary">
              Current streak: {streak} day{streak === 1 ? '' : 's'}
            </ThemedText>
          )}
        </View>

        <ThemedView type="backgroundElement" style={styles.logSection}>
          <ThemedText type="smallBold">Log progress</ThemedText>
          {isCountLike ? (
            <Pressable
              onPress={handleQuickLog}
              disabled={logProgress.isPending}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: ACCENT },
                (pressed || logProgress.isPending) && styles.pressed,
              ]}>
              {logProgress.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText style={styles.buttonText}>+ Log progress</ThemedText>
              )}
            </Pressable>
          ) : (
            <View style={styles.row}>
              <TextInput
                style={[
                  styles.input,
                  styles.rowInput,
                  { backgroundColor: theme.backgroundSelected, color: theme.text },
                ]}
                placeholder="Amount"
                placeholderTextColor={theme.textSecondary}
                value={logAmount}
                onChangeText={setLogAmount}
                keyboardType="numeric"
              />
              <Pressable
                onPress={handleAmountLog}
                disabled={logProgress.isPending}
                style={({ pressed }) => [
                  styles.button,
                  styles.logButton,
                  { backgroundColor: ACCENT },
                  (pressed || logProgress.isPending) && styles.pressed,
                ]}>
                {logProgress.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText style={styles.buttonText}>Log</ThemedText>
                )}
              </Pressable>
            </View>
          )}
          {logError && <ThemedText style={styles.errorText}>{logError}</ThemedText>}
        </ThemedView>

        <View style={styles.field}>
          <ThemedText type="smallBold">Recent activity</ThemedText>
          {eventsLoading && <ActivityIndicator color={theme.text} />}
          {eventsError && (
            <ThemedText style={styles.errorText}>Could not load recent activity.</ThemedText>
          )}
          {!eventsLoading && !eventsError && recentEvents.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              No progress logged yet.
            </ThemedText>
          )}
          {!eventsLoading &&
            !eventsError &&
            recentEvents.map((event) => (
              <View key={event.id} style={styles.eventRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  {event.occurredOn}
                </ThemedText>
                <ThemedText type="small" style={styles.eventAmount}>
                  {event.amount > 0 ? '+' : ''}
                  {event.amount}
                </ThemedText>
                {event.note && (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {event.note}
                  </ThemedText>
                )}
              </View>
            ))}
        </View>

        <ThemedView type="backgroundElement" style={styles.editSection}>
          <View style={styles.editHeaderRow}>
            <ThemedText type="smallBold">Edit</ThemedText>
            {!editing && (
              <Pressable onPress={startEditing} style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="linkPrimary">Edit</ThemedText>
              </Pressable>
            )}
          </View>

          {editing && (
            <View style={styles.field}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundSelected, color: theme.text },
                ]}
                placeholder="Title"
                placeholderTextColor={theme.textSecondary}
                value={editTitle}
                onChangeText={setEditTitle}
              />
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundSelected, color: theme.text },
                ]}
                placeholder="Target value"
                placeholderTextColor={theme.textSecondary}
                value={editTargetValue}
                onChangeText={setEditTargetValue}
                keyboardType="decimal-pad"
              />
              {editError && <ThemedText style={styles.errorText}>{editError}</ThemedText>}
              <View style={styles.row}>
                <Pressable
                  onPress={() => setEditing(false)}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                  <ThemedText type="small">Cancel</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleSaveEdit}
                  disabled={updateGoal.isPending}
                  style={({ pressed }) => [
                    styles.button,
                    styles.rowInput,
                    { backgroundColor: ACCENT },
                    (pressed || updateGoal.isPending) && styles.pressed,
                  ]}>
                  {updateGoal.isPending ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <ThemedText style={styles.buttonText}>Save</ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </ThemedView>

        <View style={styles.dangerZone}>
          <Pressable
            onPress={handleArchive}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <ThemedText type="small">Archive</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <ThemedText type="small" style={styles.deleteText}>
              Delete
            </ThemedText>
          </Pressable>
          {(archiveGoal.error || deleteGoal.error) && (
            <ThemedText style={styles.errorText}>
              {(archiveGoal.error ?? deleteGoal.error) instanceof Error
                ? (archiveGoal.error ?? deleteGoal.error)!.message
                : 'Something went wrong.'}
            </ThemedText>
          )}
        </View>
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
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  headerBlock: {
    gap: Spacing.two,
  },
  bigNumber: {
    fontSize: 40,
    lineHeight: 44,
  },
  logSection: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  field: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
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
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButton: {
    paddingHorizontal: Spacing.four,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  errorText: {
    color: '#e0453c',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  eventAmount: {
    fontWeight: '600',
  },
  editSection: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  editHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerZone: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  deleteText: {
    color: '#e0453c',
  },
});
