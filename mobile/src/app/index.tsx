/**
 * index.tsx — the Home tab (Phase 2 dashboard). Replaces the Expo template
 * content entirely; the route file itself stays put per expo-router
 * conventions. Layout top-to-bottom: featured goal, area grid, monthly
 * period card, weekly-planning placeholder, progressing-goals list, FAB.
 *
 * All day-boundary math is delegated to dashboard-engine.ts / goal-engine.ts,
 * which themselves route through time-policy — this file only orchestrates
 * data fetching and layout, no date arithmetic of its own.
 */

import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { EmptyFeaturedGoalCard, FeaturedGoalCard } from '@/components/home/featured-goal-card';
import { AreaGrid } from '@/components/home/area-grid';
import { HomeFab } from '@/components/home/home-fab';
import { PeriodCard } from '@/components/home/period-card';
import { ProgressingList } from '@/components/home/progressing-list';
import { SectionHeader } from '@/components/home/section-header';
import { WeeklyPlanningButton } from '@/components/home/weekly-planning-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { featuredGoal, lastLoggedDaysAgo, progressingGoalsSort } from '@/lib/dashboard-engine';
import { useGoals, useRecentEvents } from '@/lib/goals-hooks';
import { addLocalDays, localDayKey, localMonthKey, startOfLocalWeek } from '@/lib/time-policy';
import type { ProgressEvent } from '@/lib/goals-types';

/**
 * How far back useRecentEvents fetches: the earlier of the current local
 * week/month start, minus another 60 local days, so "Logged Nd ago" can
 * still render an accurate count even for a goal not logged since well
 * before the current cadence window opened (capped at "60+d" in the UI).
 */
const RECENCY_LOOKBACK_DAYS = 60;

/**
 * time-policy has no `startOfLocalMonth` helper (only `localMonthKey`), so
 * the month start is built the same way goal-engine.ts's windowForCadence
 * does it: parse the YYYY-MM key back into a local-midnight Date.
 */
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

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const sinceDayKey = useMemo(() => recentEventsSinceDayKey(today), [today]);

  const goalsQuery = useGoals();
  const eventsQuery = useRecentEvents(sinceDayKey);
  const [refreshing, setRefreshing] = useState(false);

  const goals = goalsQuery.data ?? [];
  const events = eventsQuery.data ?? [];

  const eventsByGoalId = useMemo(() => {
    const map = new Map<string, ProgressEvent[]>();
    for (const event of events) {
      const list = map.get(event.goalId);
      if (list) {
        list.push(event);
      } else {
        map.set(event.goalId, [event]);
      }
    }
    return map;
  }, [events]);

  const lastLoggedDayKeyByGoalId = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const [goalId, goalEvents] of eventsByGoalId) {
      let latest: string | null = null;
      for (const event of goalEvents) {
        if (latest === null || event.occurredOn > latest) {
          latest = event.occurredOn;
        }
      }
      map.set(goalId, latest);
    }
    return map;
  }, [eventsByGoalId]);

  const lastLoggedDaysAgoByGoalId = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const goal of goals) {
      map.set(goal.id, lastLoggedDaysAgo(lastLoggedDayKeyByGoalId.get(goal.id) ?? null, today));
    }
    return map;
  }, [goals, lastLoggedDayKeyByGoalId, today]);

  const featured = useMemo(() => featuredGoal(goals, today), [goals, today]);
  const monthlyGoals = useMemo(
    () => goals.filter((g) => g.archivedAt === null && g.cadence === 'monthly'),
    [goals]
  );
  const progressingGoals = useMemo(
    () => progressingGoalsSort(goals, lastLoggedDayKeyByGoalId, today),
    [goals, lastLoggedDayKeyByGoalId, today]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([goalsQuery.refetch(), eventsQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [goalsQuery, eventsQuery]);

  const isLoading = (goalsQuery.isLoading || eventsQuery.isLoading) && !refreshing;
  const isError = goalsQuery.isError || eventsQuery.isError;

  return (
    <ThemedView style={styles.container}>
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
                {goalsQuery.error instanceof Error
                  ? goalsQuery.error.message
                  : eventsQuery.error instanceof Error
                    ? eventsQuery.error.message
                    : 'Could not load your dashboard.'}
              </ThemedText>
              <ThemedText
                type="linkPrimary"
                onPress={() => {
                  goalsQuery.refetch();
                  eventsQuery.refetch();
                }}>
                Try again
              </ThemedText>
            </View>
          )}

          {!isLoading && !isError && (
            <>
              <SectionHeader
                title="THIS WEEK'S GOALS"
                actionLabel="View all"
                onActionPress={() => router.push('/goals')}
              />

              {featured ? (
                <FeaturedGoalCard
                  goal={featured}
                  events={eventsByGoalId.get(featured.id) ?? []}
                  today={today}
                />
              ) : (
                <EmptyFeaturedGoalCard />
              )}

              <AreaGrid
                goals={goals}
                events={events}
                today={today}
                excludeArea={featured?.lifeArea ?? null}
              />

              {monthlyGoals.length > 0 && (
                <PeriodCard goals={monthlyGoals} events={events} today={today} />
              )}

              <WeeklyPlanningButton />

              {progressingGoals.length > 0 && (
                <View style={styles.section}>
                  <SectionHeader title="PROGRESSING GOALS" />
                  <ProgressingList
                    goals={progressingGoals}
                    events={events}
                    today={today}
                    lastLoggedDaysAgoByGoalId={lastLoggedDaysAgoByGoalId}
                  />
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <HomeFab />
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
});
