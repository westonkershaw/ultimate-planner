import { Link, Stack, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LIFE_AREAS, LIFE_AREA_LABELS, type Goal, type LifeArea } from '@/lib/goals-types';
import { useGoals } from '@/lib/goals-hooks';

const ACCENT = '#3c87f7';

function GoalRow({ goal }: { goal: Goal }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/goals/${goal.id}`)}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <ThemedText type="small" numberOfLines={1} style={styles.rowTitle}>
          {goal.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {goal.cadence} · {goal.targetValue}
          {goal.unit ? ` ${goal.unit}` : ''}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function GroupedGoals({ goals }: { goals: Goal[] }) {
  const goalsByArea = new Map<LifeArea, Goal[]>();
  for (const goal of goals) {
    const list = goalsByArea.get(goal.lifeArea) ?? [];
    list.push(goal);
    goalsByArea.set(goal.lifeArea, list);
  }

  return (
    <View style={styles.groupsWrapper}>
      {LIFE_AREAS.filter((area) => goalsByArea.has(area)).map((area) => (
        <View key={area} style={styles.group}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupHeader}>
            {LIFE_AREA_LABELS[area].toUpperCase()}
          </ThemedText>
          <View style={styles.groupRows}>
            {goalsByArea.get(area)!.map((goal) => (
              <GoalRow key={goal.id} goal={goal} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState() {
  const router = useRouter();
  return (
    <View style={styles.emptyState}>
      <ThemedText type="subtitle" style={styles.centerText}>
        No goals yet
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centerText}>
        Set a goal in any life area and track your progress over time.
      </ThemedText>
      <Pressable
        onPress={() => router.push('/goals/new')}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: ACCENT },
          pressed && styles.pressed,
        ]}>
        <ThemedText style={styles.buttonText}>Add your first goal</ThemedText>
      </Pressable>
      <Link href="/goals/new" asChild>
        <Pressable style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="linkPrimary" style={styles.centerText}>
            Start from a template
          </ThemedText>
        </Pressable>
      </Link>
    </View>
  );
}

export default function GoalsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: goals, isLoading, isError, error, refetch } = useGoals();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/goals/new')}
              hitSlop={12}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="linkPrimary" style={styles.headerAdd}>
                +
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {isLoading && (
            <View style={styles.centerBlock}>
              <ActivityIndicator color={theme.text} />
            </View>
          )}

          {isError && !isLoading && (
            <View style={styles.centerBlock}>
              <ThemedText style={styles.centerText}>
                {error instanceof Error ? error.message : 'Could not load goals.'}
              </ThemedText>
              <Pressable
                onPress={() => refetch()}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="linkPrimary">Try again</ThemedText>
              </Pressable>
            </View>
          )}

          {!isLoading && !isError && goals && goals.length === 0 && <EmptyState />}

          {!isLoading && !isError && goals && goals.length > 0 && <GroupedGoals goals={goals} />}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  groupsWrapper: {
    gap: Spacing.four,
  },
  group: {
    gap: Spacing.two,
  },
  groupHeader: {
    letterSpacing: 0.5,
  },
  groupRows: {
    gap: Spacing.two,
  },
  row: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
  rowTitle: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.six,
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  headerAdd: {
    fontSize: 24,
    lineHeight: 28,
  },
});
