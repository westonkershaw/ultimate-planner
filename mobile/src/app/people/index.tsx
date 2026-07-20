/**
 * index.tsx — the People list. Two top-level groupings:
 *   1. DATING (only rendered when at least one category==='dating' person
 *      exists) — a flat, status-ordered list via sortDatingGroup, not
 *      collapsible (small enough it doesn't need it, and status order is
 *      the point).
 *   2. Friends & Family — the three recency buckets from
 *      groupFriendsFamilyByRecency, each a CollapsibleSection.
 *
 * `today` is memoized once per mount (matches goals/[id].tsx's pattern) so
 * every grouping/sorting call in a render pass agrees on "now".
 */

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';

import { CollapsibleSection } from '@/components/people/collapsible-section';
import { DatingRow } from '@/components/people/dating-row';
import { PersonRow } from '@/components/people/person-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { groupFriendsFamilyByRecency, sortDatingGroup, type RecencyBucket } from '@/lib/people-grouping';
import { usePeople } from '@/lib/people-hooks';
import { useCategoryFlip } from '@/lib/use-category-flip';

const ACCENT = '#3c87f7';

function EmptyState() {
  const router = useRouter();
  return (
    <View style={styles.emptyState}>
      <ThemedText type="subtitle" style={styles.centerText}>
        No people yet
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centerText}>
        Add the people in your life to track relationships and stay in touch.
      </ThemedText>
      <Pressable
        onPress={() => router.push('/people/new')}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: ACCENT },
          pressed && styles.pressed,
        ]}>
        <ThemedText style={styles.buttonText}>Add someone</ThemedText>
      </Pressable>
    </View>
  );
}

export default function PeopleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const { data: people, isLoading, isError, error, refetch } = usePeople();
  const [refreshing, setRefreshing] = useState(false);
  const [collapsedBuckets, setCollapsedBuckets] = useState<Set<RecencyBucket>>(new Set());
  const { requestMove } = useCategoryFlip();

  const allPeople = people ?? [];
  const datingPeople = useMemo(() => sortDatingGroup(allPeople, today), [allPeople, today]);
  const recencyGroups = useMemo(() => groupFriendsFamilyByRecency(allPeople, today), [allPeople, today]);

  const toggleBucket = useCallback((bucket: RecencyBucket) => {
    setCollapsedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(bucket)) {
        next.delete(bucket);
      } else {
        next.add(bucket);
      }
      return next;
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.push('/people/map')}
                hitSlop={12}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="linkPrimary" style={styles.headerMap}>
                  Map
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => router.push('/people/new')}
                hitSlop={12}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="linkPrimary" style={styles.headerAdd}>
                  +
                </ThemedText>
              </Pressable>
            </View>
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
                {error instanceof Error ? error.message : 'Could not load people.'}
              </ThemedText>
              <Pressable
                onPress={() => refetch()}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="linkPrimary">Try again</ThemedText>
              </Pressable>
            </View>
          )}

          {!isLoading && !isError && allPeople.length === 0 && <EmptyState />}

          {!isLoading && !isError && allPeople.length > 0 && (
            <>
              {datingPeople.length > 0 && (
                <View style={styles.section}>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
                    DATING
                  </ThemedText>
                  <View style={styles.rows}>
                    {datingPeople.map((person) => (
                      <DatingRow
                        key={person.id}
                        person={person}
                        today={today}
                        onPress={() => router.push(`/people/${person.id}`)}
                        onLongPress={() => requestMove(person)}
                      />
                    ))}
                  </View>
                </View>
              )}

              {recencyGroups.map((group) => (
                <CollapsibleSection
                  key={group.bucket}
                  label={group.label}
                  count={group.people.length}
                  collapsed={collapsedBuckets.has(group.bucket)}
                  onToggle={() => toggleBucket(group.bucket)}>
                  {group.people.map((person) => (
                    <PersonRow
                      key={person.id}
                      person={person}
                      today={today}
                      onPress={() => router.push(`/people/${person.id}`)}
                      onLongPress={() => requestMove(person)}
                    />
                  ))}
                </CollapsibleSection>
              ))}
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
    gap: Spacing.two,
  },
  sectionHeader: {
    letterSpacing: 0.5,
  },
  rows: {
    gap: Spacing.two,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerMap: {
    fontSize: 16,
  },
});
