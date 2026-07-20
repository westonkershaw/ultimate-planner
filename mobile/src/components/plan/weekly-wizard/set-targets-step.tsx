/**
 * set-targets-step.tsx — wizard Step 2: a scrollable list of all five life
 * areas, each showing its active (non-archived) goals with an inline-editable
 * target value. Editing goes through the existing useUpdateGoal mutation —
 * same patch shape goals/new.tsx and the goal detail screen already use, no
 * new mutation path. Areas with zero active goals show a prompt that
 * navigates to the existing goal-creation screen (src/app/goals/new.tsx) and
 * returns to the wizard on back.
 */

import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUpdateGoal } from '@/lib/goals-hooks';
import { LIFE_AREAS, LIFE_AREA_LABELS, type Goal } from '@/lib/goals-types';

const ACCENT = '#3c87f7';

function GoalTargetRow({ goal }: { goal: Goal }) {
  const theme = useTheme();
  const updateGoal = useUpdateGoal();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(goal.targetValue));
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(String(goal.targetValue));
    setError(null);
    setEditing(true);
  }

  async function commit() {
    const parsed = Number(draft);
    if (!draft.trim() || Number.isNaN(parsed) || parsed <= 0) {
      setError('Enter a target value greater than 0.');
      return;
    }
    setError(null);
    try {
      await updateGoal.mutateAsync({ id: goal.id, patch: { targetValue: parsed } });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update target.');
    }
  }

  return (
    <ThemedView type="backgroundElement" style={styles.goalRow}>
      <View style={styles.goalRowMain}>
        <ThemedText type="smallBold" numberOfLines={1} style={styles.goalTitle}>
          {goal.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {goal.cadence}
        </ThemedText>
      </View>

      {editing ? (
        <View style={styles.editRow}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            value={draft}
            onChangeText={setDraft}
            keyboardType="decimal-pad"
            autoFocus
          />
          <Pressable
            onPress={commit}
            disabled={updateGoal.isPending}
            style={({ pressed }) => [styles.saveButton, { backgroundColor: ACCENT }, pressed && styles.pressed]}>
            {updateGoal.isPending ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            )}
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={startEdit} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="default" style={{ color: ACCENT }}>
            Target: {goal.targetValue}
            {goal.unit ? ` ${goal.unit}` : ''}
          </ThemedText>
        </Pressable>
      )}

      {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
    </ThemedView>
  );
}

export function SetTargetsStep({
  goals,
  onAddGoal,
}: {
  goals: readonly Goal[];
  onAddGoal: () => void;
}) {
  const activeGoals = goals.filter((g) => g.archivedAt === null);

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle">Set this week&apos;s targets</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Tap a target to adjust it for the week ahead.
      </ThemedText>

      {LIFE_AREAS.map((lifeArea) => {
        const areaGoals = activeGoals.filter((g) => g.lifeArea === lifeArea);
        return (
          <View key={lifeArea} style={styles.areaBlock}>
            <ThemedText type="smallBold">{LIFE_AREA_LABELS[lifeArea]}</ThemedText>

            {areaGoals.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.emptyArea}>
                <ThemedText type="small" themeColor="textSecondary">
                  No active goals in this area yet.
                </ThemedText>
                <Pressable onPress={onAddGoal} style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedText type="linkPrimary">Add a goal</ThemedText>
                </Pressable>
              </ThemedView>
            ) : (
              <View style={styles.goalList}>
                {areaGoals.map((goal) => (
                  <GoalTargetRow key={goal.id} goal={goal} />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  areaBlock: {
    gap: Spacing.two,
  },
  emptyArea: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  goalList: {
    gap: Spacing.two,
  },
  goalRow: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  goalRowMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  goalTitle: {
    flex: 1,
  },
  editRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  saveButton: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    color: '#e0453c',
  },
  pressed: {
    opacity: 0.7,
  },
});
