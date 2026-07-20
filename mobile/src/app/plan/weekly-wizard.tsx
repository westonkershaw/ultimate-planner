/**
 * weekly-wizard.tsx — guided weekly planning wizard (Roadmap Phase 4b),
 * pushed as a plain Stack.Screen (see plan/_layout.tsx) — this codebase has
 * no existing modal-route convention (no route groups, no
 * `presentation: 'modal'` anywhere), so this screen matches the established
 * pattern: a pushed screen with its own header Cancel action and back
 * handling, same as new-block.tsx / goals/new.tsx.
 *
 * Four steps, entirely client-side state (`step`): review last week
 * (weekly-review.ts), set targets (useUpdateGoal, same mutation the rest of
 * the app uses), schedule blocks for the upcoming week (inline form over
 * useCreateBlock/useDeleteBlock), and a completion step that saves the
 * weekly-planning reminder preference (planning-prefs.ts) and, on Done,
 * requests notification permission (via the same in-app priming explanation
 * used by the Settings nightly-ritual toggle, notification-priming.ts) and
 * schedules a repeating weekly reminder (Roadmap Phase 4c). A denied/skipped
 * permission never blocks the wizard from finishing — the preference is
 * still saved either way.
 */

import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CompletionStep, isValidTime } from '@/components/plan/weekly-wizard/completion-step';
import { ReviewWeekStep } from '@/components/plan/weekly-wizard/review-week-step';
import { ScheduleBlocksStep } from '@/components/plan/weekly-wizard/schedule-blocks-step';
import { SetTargetsStep } from '@/components/plan/weekly-wizard/set-targets-step';
import { StepIndicator } from '@/components/plan/weekly-wizard/step-indicator';
import { WizardNav } from '@/components/plan/weekly-wizard/wizard-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Block } from '@/lib/block-types';
import { useBlocksForRange } from '@/lib/blocks-hooks';
import { useGoals, useRecentEvents } from '@/lib/goals-hooks';
import { primeAndRequestNotificationPermission } from '@/lib/notification-priming';
import { cancelScheduledReminder, scheduleWeeklyReminder } from '@/lib/notifications';
import { usePeople } from '@/lib/people-hooks';
import { getWeeklyPlanningPreference, setWeeklyPlanningPreference, type Weekday } from '@/lib/planning-prefs';
import { addLocalDays, localDayKey, startOfLocalWeek } from '@/lib/time-policy';
import { previousWeekRange, weeklyBlockSummary, weeklyGoalRecap } from '@/lib/weekly-review';

const TOTAL_STEPS = 4;
const WEEKLY_PLANNING_NOTIFICATION_ID = 'weekly-planning';
/** WEEKDAYS in planning-prefs.ts is Sunday-first (index 0 = sunday); Date#getDay() matches that directly. */
const DATE_DAY_TO_WEEKDAY: readonly Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];
/** planning-prefs.ts's Weekday is Sunday-first (index 0); expo-notifications' WEEKLY trigger is 1-7 with 1 = Sunday — same offset, so index + 1. */
const WEEKDAY_TO_TRIGGER_WEEKDAY: Record<Weekday, number> = {
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
  saturday: 7,
};

export default function WeeklyWizardScreen() {
  const theme = useTheme();
  const router = useRouter();

  const today = useMemo(() => new Date(), []);
  const prevWeekRange = useMemo(() => previousWeekRange(today), [today]);
  const nextMonday = useMemo(() => addLocalDays(startOfLocalWeek(today), 7), [today]);
  const weekDayKeys = useMemo(
    () => Array.from({ length: 7 }, (_, i) => localDayKey(addLocalDays(nextMonday, i))),
    [nextMonday]
  );

  const lastWeekBlocksQuery = useBlocksForRange(prevWeekRange.fromDayKey, prevWeekRange.toDayKey);
  const goalsQuery = useGoals();
  const eventsQuery = useRecentEvents(prevWeekRange.fromDayKey);
  const peopleQuery = usePeople();

  const [step, setStep] = useState(0);
  const [scheduledBlocks, setScheduledBlocks] = useState<Block[]>([]);
  const [weekday, setWeekday] = useState<Weekday>(DATE_DAY_TO_WEEKDAY[today.getDay()]!);
  const [time, setTime] = useState('09:00');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load any existing preference once, so step 4 starts from the user's
  // current choice rather than always defaulting to today/09:00.
  useEffect(() => {
    let cancelled = false;
    getWeeklyPlanningPreference().then((pref) => {
      if (cancelled || !pref) return;
      setWeekday(pref.weekday);
      setTime(pref.time);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const goals = goalsQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const people = peopleQuery.data ?? [];
  const lastWeekBlocks = lastWeekBlocksQuery.data ?? [];

  const blockSummary = useMemo(
    () => weeklyBlockSummary(lastWeekBlocks, prevWeekRange),
    [lastWeekBlocks, prevWeekRange]
  );
  const goalRecap = useMemo(
    () => weeklyGoalRecap(goals, events, prevWeekRange),
    [goals, events, prevWeekRange]
  );

  const isLoading =
    step === 0 && (lastWeekBlocksQuery.isLoading || goalsQuery.isLoading || eventsQuery.isLoading);

  function handleClose() {
    router.back();
  }

  function goNext() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function goBack() {
    if (step === 0) {
      handleClose();
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleAddGoal() {
    // goals/new.tsx has no life-area route param (it defaults to 'finance'
    // and lets the user pick) — navigating there and back is the existing
    // goal-creation flow the roadmap points at; the wizard resumes exactly
    // where it was via router.back() from that screen.
    router.push('/goals/new');
  }

  function handleBlockScheduled(block: Block) {
    setScheduledBlocks((prev) => [...prev, block]);
  }

  function handleBlockRemoved(id: string) {
    setScheduledBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  async function handleDone() {
    const trimmedTime = time.trim();
    if (!isValidTime(trimmedTime)) {
      setTimeError('Time must be in HH:MM 24-hour format.');
      return;
    }
    setTimeError(null);
    setSaving(true);
    try {
      await setWeeklyPlanningPreference(weekday, trimmedTime);

      // Only show the priming explanation (and the OS prompt behind it) when
      // permission isn't already granted — a returning user who granted it
      // previously (e.g. via the Settings nightly-ritual toggle) shouldn't
      // see the explanation again. This read never itself prompts the OS.
      const current = await Notifications.getPermissionsAsync().catch(() => null);
      const granted = current?.granted === true || (await primeAndRequestNotificationPermission());

      if (granted) {
        const [hour, minute] = trimmedTime.split(':').map(Number);
        const scheduled = await scheduleWeeklyReminder(
          WEEKLY_PLANNING_NOTIFICATION_ID,
          WEEKDAY_TO_TRIGGER_WEEKDAY[weekday],
          hour!,
          minute!,
          'Time to plan your week',
          'Take a few minutes to set up the week ahead.',
          { screen: 'weekly-wizard' }
        );
        if (!scheduled) {
          await cancelScheduledReminder(WEEKLY_PLANNING_NOTIFICATION_ID);
          Alert.alert(
            "Couldn't enable reminders",
            'Something went wrong scheduling the reminder. Please try again from Settings.'
          );
        }
      } else {
        await cancelScheduledReminder(WEEKLY_PLANNING_NOTIFICATION_ID);
        Alert.alert(
          'Preference saved',
          'You can enable notifications later from Settings to get the actual reminder.'
        );
      }

      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Weekly Planning',
          headerLeft: () => (
            <Pressable onPress={handleClose} hitSlop={12} style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="linkPrimary">Cancel</ThemedText>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <StepIndicator step={step} totalSteps={TOTAL_STEPS} />

          {isLoading ? (
            <View style={styles.centerBlock}>
              <ActivityIndicator color={theme.text} />
            </View>
          ) : (
            <>
              {step === 0 && <ReviewWeekStep blockSummary={blockSummary} goalRecap={goalRecap} />}

              {step === 1 && <SetTargetsStep goals={goals} onAddGoal={handleAddGoal} />}

              {step === 2 && (
                <ScheduleBlocksStep
                  weekDayKeys={weekDayKeys}
                  goals={goals}
                  people={people}
                  scheduled={scheduledBlocks}
                  onScheduled={handleBlockScheduled}
                  onRemoved={handleBlockRemoved}
                />
              )}

              {step === 3 && (
                <CompletionStep
                  scheduledCount={scheduledBlocks.length}
                  weekday={weekday}
                  time={time}
                  onWeekdayChange={setWeekday}
                  onTimeChange={(next) => {
                    setTime(next);
                    setTimeError(null);
                  }}
                  timeError={timeError}
                />
              )}
            </>
          )}

          <WizardNav
            onBack={goBack}
            onNext={step < TOTAL_STEPS - 1 ? goNext : undefined}
            nextDisabled={saving}
          />

          {step === TOTAL_STEPS - 1 && (
            <Pressable
              onPress={handleDone}
              disabled={saving}
              style={({ pressed }) => [
                styles.doneButton,
                { backgroundColor: '#3c87f7' },
                (pressed || saving) && styles.pressed,
              ]}>
              {saving ? <ActivityIndicator color="#ffffff" /> : <ThemedText style={styles.doneButtonText}>Done</ThemedText>}
            </Pressable>
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
