/**
 * tonight.tsx — nightly ritual screen (Roadmap Phase 4c). Reuses
 * blocksForDay (block-engine.ts) and the Today screen's complete hook
 * (blocks-hooks.ts) rather than reimplementing block logic — this screen is
 * a different lens over the same data today.tsx already renders, not a
 * parallel model. No uncomplete path here: TODAY is pre-filtered to
 * `completedAt === null`, so there's nothing on this screen to uncomplete.
 *
 * Layout: optional opening reflection card -> TODAY (remaining incomplete
 * blocks, checkable) -> TOMORROW (tomorrow's blocks, read-only glance) ->
 * optional closing reflection card -> Done. Reflection cards only render
 * when getReflectionMomentsEnabled() is true (ritual-prefs.ts); this screen
 * never persists anything into that preference, only reads it.
 *
 * Tapped-notification navigation (root _layout.tsx) lands here with
 * `{ screen: 'tonight' }` — this screen itself doesn't need to know that;
 * it's a plain route like today.tsx.
 */

import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BlockRow } from '@/components/plan/block-row';
import { ReflectionCard } from '@/components/plan/reflection-card';
import { SectionHeader } from '@/components/home/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { blocksForDay } from '@/lib/block-engine';
import { useBlocksForRange, useCompleteBlock } from '@/lib/blocks-hooks';
import { useGoals } from '@/lib/goals-hooks';
import { usePeople } from '@/lib/people-hooks';
import { getReflectionMomentsEnabled } from '@/lib/ritual-prefs';
import { addLocalDays, localDayKey } from '@/lib/time-policy';

const ACCENT = '#3c87f7';

export default function TonightRitualScreen() {
  const theme = useTheme();
  const router = useRouter();

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => localDayKey(today), [today]);
  const tomorrowKey = useMemo(() => localDayKey(addLocalDays(today, 1)), [today]);

  const [reflectionEnabled, setReflectionEnabled] = useState(false);
  const [reflectionLoaded, setReflectionLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getReflectionMomentsEnabled().then((enabled) => {
      if (!cancelled) {
        setReflectionEnabled(enabled);
        setReflectionLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const blocksQuery = useBlocksForRange(todayKey, tomorrowKey);
  const goalsQuery = useGoals();
  const peopleQuery = usePeople();

  const completeBlock = useCompleteBlock();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const blocks = blocksQuery.data ?? [];
  const goals = goalsQuery.data ?? [];
  const people = peopleQuery.data ?? [];

  const todaysRemainingBlocks = useMemo(
    () => blocksForDay(blocks, todayKey).filter((b) => b.completedAt === null),
    [blocks, todayKey]
  );
  const tomorrowsBlocks = useMemo(() => blocksForDay(blocks, tomorrowKey), [blocks, tomorrowKey]);

  const goalTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const goal of goals) map.set(goal.id, goal.title);
    return map;
  }, [goals]);

  const personNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const person of people) map.set(person.id, person.name);
    return map;
  }, [people]);

  async function handleComplete(id: string, goalId: string | null) {
    setTogglingId(id);
    try {
      await completeBlock.mutateAsync({ id, goalId });
    } catch {
      // Mutation error surfaces via react-query state; nothing else to do here.
    } finally {
      setTogglingId(null);
    }
  }

  const isLoading = (blocksQuery.isLoading || goalsQuery.isLoading || !reflectionLoaded) && !blocksQuery.isRefetching;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Tonight' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.centerBlock}>
              <ActivityIndicator color={theme.text} />
            </View>
          ) : (
            <>
              {reflectionEnabled && <ReflectionCard variant="opening" />}

              <View style={styles.section}>
                <SectionHeader title="TODAY" />
                {todaysRemainingBlocks.length === 0 ? (
                  <ThemedView type="backgroundElement" style={styles.emptyState}>
                    <ThemedText type="smallBold">Everything's done for today</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.emptyStateText}>
                      Nice work closing things out.
                    </ThemedText>
                  </ThemedView>
                ) : (
                  <View style={styles.list}>
                    {todaysRemainingBlocks.map((block) => (
                      <BlockRow
                        key={block.id}
                        block={block}
                        goalTitle={block.goalId ? (goalTitleById.get(block.goalId) ?? null) : null}
                        personName={block.personId ? (personNameById.get(block.personId) ?? null) : null}
                        onToggleComplete={() => handleComplete(block.id, block.goalId)}
                        isToggling={togglingId === block.id}
                      />
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <SectionHeader title="TOMORROW" />
                {tomorrowsBlocks.length === 0 ? (
                  <ThemedView type="backgroundElement" style={styles.emptyState}>
                    <ThemedText type="smallBold">Nothing scheduled yet</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.emptyStateText}>
                      You can add blocks for tomorrow from Today's Plan.
                    </ThemedText>
                  </ThemedView>
                ) : (
                  <View style={styles.list}>
                    {tomorrowsBlocks.map((block) => (
                      <ThemedView key={block.id} type="backgroundElement" style={styles.glanceRow}>
                        <ThemedText type="smallBold" numberOfLines={1} style={styles.glanceTitle}>
                          {block.title}
                        </ThemedText>
                        {block.startTime && (
                          <ThemedText type="small" themeColor="textSecondary">
                            {block.startTime.slice(0, 5)}
                          </ThemedText>
                        )}
                      </ThemedView>
                    ))}
                  </View>
                )}
              </View>

              {reflectionEnabled && <ReflectionCard variant="closing" />}

              <Pressable
                onPress={() => router.replace('/')}
                style={({ pressed }) => [
                  styles.doneButton,
                  { backgroundColor: ACCENT },
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.doneButtonText}>Done</ThemedText>
              </Pressable>
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
    paddingTop: Spacing.six,
  },
  section: {
    gap: Spacing.three,
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
  glanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  glanceTitle: {
    flex: 1,
  },
  doneButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
