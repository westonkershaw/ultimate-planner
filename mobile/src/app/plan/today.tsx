/**
 * today.tsx — Daily Planning screen (Roadmap Phase 4a). Two sections:
 * TODAY'S TARGETS (per-goal `todayChipFor` reused from dashboard-engine.ts,
 * same density as Home's ProgressingList) and TODAY'S BLOCKS (checklist over
 * `blocksForDay`, block-engine.ts). All day-boundary math routes through
 * time-policy — this screen never computes a date key itself.
 */

import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { BlockRow } from '@/components/plan/block-row';
import { GoalTodayList } from '@/components/plan/goal-today-row';
import { SectionHeader } from '@/components/home/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { blocksForDay } from '@/lib/block-engine';
import { useBlocksForRange, useCompleteBlock, useUncompleteBlock } from '@/lib/blocks-hooks';
import { todayChipFor, type TodayChip } from '@/lib/dashboard-engine';
import { useGoals, useRecentEvents } from '@/lib/goals-hooks';
import { usePeople } from '@/lib/people-hooks';
import { addLocalDays, localDayKey, localMonthKey, startOfLocalWeek } from '@/lib/time-policy';

const ACCENT = '#3c87f7';
/** Same lookback window Home uses so weekly/monthly cadence chips have their full window of events. */
const RECENCY_LOOKBACK_DAYS = 60;

function startOfLocalMonth(date: Date): Date {
  const [y, m] = localMonthKey(date).split('-').map(Number);
  return new Date(y!, m! - 1, 1);
}

function recentEventsSinceDayKey(today: Date): string {
  const weekStart = startOfLocalWeek(today);
  const monthStart = startOfLocalMonth(today);
  const earliestWindowStart = weekStart < monthStart ? weekStart : monthStart;
  return localDayKey(addLocalDays(earliestWindowStart, -RECENCY_LOOKBACK_DAYS));
}

export default function TodayPlanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => localDayKey(today), [today]);
  const tomorrowKey = useMemo(() => localDayKey(addLocalDays(today, 1)), [today]);
  const sinceDayKey = useMemo(() => recentEventsSinceDayKey(today), [today]);

  const blocksQuery = useBlocksForRange(todayKey, todayKey);
  const goalsQuery = useGoals();
  const eventsQuery = useRecentEvents(sinceDayKey);
  const peopleQuery = usePeople();

  const completeBlock = useCompleteBlock();
  const uncompleteBlock = useUncompleteBlock();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const blocks = blocksQuery.data ?? [];
  const goals = goalsQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const people = peopleQuery.data ?? [];

  const todaysBlocks = useMemo(() => blocksForDay(blocks, todayKey), [blocks, todayKey]);
  const activeGoals = useMemo(() => goals.filter((g) => g.archivedAt === null), [goals]);

  const chipByGoalId = useMemo(() => {
    const map = new Map<string, TodayChip>();
    for (const goal of activeGoals) {
      map.set(goal.id, todayChipFor(goal, events, today));
    }
    return map;
  }, [activeGoals, events, today]);

  const goalTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const goal of goals) {
      map.set(goal.id, goal.title);
    }
    return map;
  }, [goals]);

  const personNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const person of people) {
      map.set(person.id, person.name);
    }
    return map;
  }, [people]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([blocksQuery.refetch(), goalsQuery.refetch(), eventsQuery.refetch(), peopleQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [blocksQuery, goalsQuery, eventsQuery, peopleQuery]);

  async function handleToggleComplete(id: string, goalId: string | null, isComplete: boolean) {
    setTogglingId(id);
    try {
      if (isComplete) {
        await uncompleteBlock.mutateAsync(id);
      } else {
        await completeBlock.mutateAsync({ id, goalId });
      }
    } catch {
      // Mutation error surfaces via react-query state; nothing else to do here.
    } finally {
      setTogglingId(null);
    }
  }

  const isLoading = (blocksQuery.isLoading || goalsQuery.isLoading || eventsQuery.isLoading) && !refreshing;
  const isError = blocksQuery.isError || goalsQuery.isError || eventsQuery.isError;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: '/plan/new-block', params: { scheduledOn: todayKey } })}
              hitSlop={12}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="linkPrimary" style={styles.headerAdd}>
                +
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.text} />
        }>
        <View style={styles.content}>
          {isLoading && (
            <View style={styles.centerBlock}>
              <ActivityIndicator color={theme.text} />
            </View>
          )}

          {isError && !isLoading && (
            <View style={styles.centerBlock}>
              <ThemedText style={styles.centerText}>
                {blocksQuery.error instanceof Error
                  ? blocksQuery.error.message
                  : goalsQuery.error instanceof Error
                    ? goalsQuery.error.message
                    : eventsQuery.error instanceof Error
                      ? eventsQuery.error.message
                      : "Could not load today's plan."}
              </ThemedText>
              <ThemedText
                type="linkPrimary"
                onPress={() => {
                  blocksQuery.refetch();
                  goalsQuery.refetch();
                  eventsQuery.refetch();
                }}>
                Try again
              </ThemedText>
            </View>
          )}

          {!isLoading && !isError && (
            <>
              {activeGoals.length > 0 && (
                <View style={styles.section}>
                  <SectionHeader title="TODAY'S TARGETS" />
                  <GoalTodayList goals={activeGoals} chipByGoalId={chipByGoalId} />
                </View>
              )}

              <View style={styles.section}>
                <View style={styles.blocksHeaderRow}>
                  <SectionHeader title="TODAY'S BLOCKS" />
                </View>

                {todaysBlocks.length === 0 ? (
                  <ThemedView type="backgroundElement" style={styles.emptyState}>
                    <ThemedText type="smallBold">No blocks scheduled today</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.emptyStateText}>
                      Add a block to plan out your day.
                    </ThemedText>
                    <ThemedText
                      type="linkPrimary"
                      onPress={() => router.push({ pathname: '/plan/new-block', params: { scheduledOn: todayKey } })}>
                      Add a block
                    </ThemedText>
                  </ThemedView>
                ) : (
                  <View style={styles.list}>
                    {todaysBlocks.map((block) => (
                      <BlockRow
                        key={block.id}
                        block={block}
                        goalTitle={block.goalId ? (goalTitleById.get(block.goalId) ?? null) : null}
                        personName={block.personId ? (personNameById.get(block.personId) ?? null) : null}
                        onToggleComplete={() =>
                          handleToggleComplete(block.id, block.goalId, block.completedAt !== null)
                        }
                        isToggling={togglingId === block.id}
                      />
                    ))}
                  </View>
                )}
              </View>

              <ThemedText
                type="linkPrimary"
                onPress={() => router.push({ pathname: '/plan/new-block', params: { scheduledOn: tomorrowKey } })}
                style={[styles.planTomorrowButton, { borderColor: ACCENT }]}>
                PLAN TOMORROW
              </ThemedText>
            </>
          )}
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
  section: {
    gap: Spacing.three,
  },
  blocksHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: {
    gap: Spacing.two,
  },
  emptyState: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyStateText: {
    textAlign: 'center',
  },
  planTomorrowButton: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.5,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.7,
  },
  headerAdd: {
    fontSize: 24,
    lineHeight: 28,
  },
});
