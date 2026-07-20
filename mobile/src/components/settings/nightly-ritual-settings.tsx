/**
 * nightly-ritual-settings.tsx — Settings section for the nightly planning
 * ritual (Roadmap Phase 4c): a toggle that schedules/cancels a repeating
 * daily local notification (notifications.ts) gated behind an in-app
 * permission explanation (notification-priming.ts), an HH:MM time field
 * (same format/validation as completion-step.tsx's weekly reminder field),
 * and a separate no-permission "reflection moments" toggle.
 *
 * Persistence goes through ritual-prefs.ts exclusively — this component
 * never touches AsyncStorage directly.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { primeAndRequestNotificationPermission } from '@/lib/notification-priming';
import { cancelScheduledReminder, scheduleDailyReminder } from '@/lib/notifications';
import {
  getNightlyRitualEnabled,
  getNightlyRitualTime,
  getReflectionMomentsEnabled,
  setNightlyRitualEnabled,
  setNightlyRitualTime,
  setReflectionMomentsEnabled,
} from '@/lib/ritual-prefs';

const ACCENT = '#3c87f7';
const NIGHTLY_RITUAL_NOTIFICATION_ID = 'nightly-ritual';
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour: hour!, minute: minute! };
}

async function scheduleNightlyReminder(time: string): Promise<boolean> {
  const { hour, minute } = parseTime(time);
  return scheduleDailyReminder(
    NIGHTLY_RITUAL_NOTIFICATION_ID,
    hour,
    minute,
    'Time to check off today',
    'Glance at tomorrow before you wind down.',
    { screen: 'tonight' }
  );
}

export function NightlyRitualSettings() {
  const theme = useTheme();

  const [loaded, setLoaded] = useState(false);
  const [ritualEnabled, setRitualEnabled] = useState(false);
  const [ritualTime, setRitualTime] = useState('21:00');
  const [timeDraft, setTimeDraft] = useState('21:00');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [reflectionEnabled, setReflectionEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [enabled, time, reflection] = await Promise.all([
        getNightlyRitualEnabled(),
        getNightlyRitualTime(),
        getReflectionMomentsEnabled(),
      ]);
      if (cancelled) return;
      setRitualEnabled(enabled);
      setRitualTime(time);
      setTimeDraft(time);
      setReflectionEnabled(reflection);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggleRitual(next: boolean) {
    if (!next) {
      // Turning off never needs permission — just cancel and persist.
      setRitualEnabled(false);
      await setNightlyRitualEnabled(false);
      await cancelScheduledReminder(NIGHTLY_RITUAL_NOTIFICATION_ID);
      return;
    }

    setBusy(true);
    try {
      const granted = await primeAndRequestNotificationPermission();
      if (!granted) {
        setRitualEnabled(false);
        Alert.alert(
          "Couldn't enable reminders",
          'You can turn this on later from your device Settings app.'
        );
        return;
      }

      const scheduled = await scheduleNightlyReminder(ritualTime);
      if (!scheduled) {
        setRitualEnabled(false);
        await setNightlyRitualEnabled(false);
        Alert.alert(
          "Couldn't enable reminders",
          'Something went wrong scheduling the reminder. Please try again.'
        );
        return;
      }

      setRitualEnabled(true);
      await setNightlyRitualEnabled(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleTimeBlur() {
    const trimmed = timeDraft.trim();
    if (!isValidTime(trimmed)) {
      setTimeError('Time must be in HH:MM 24-hour format.');
      return;
    }
    setTimeError(null);
    setRitualTime(trimmed);
    await setNightlyRitualTime(trimmed);
    if (ritualEnabled) {
      const scheduled = await scheduleNightlyReminder(trimmed);
      if (!scheduled) {
        setRitualEnabled(false);
        await setNightlyRitualEnabled(false);
        await cancelScheduledReminder(NIGHTLY_RITUAL_NOTIFICATION_ID);
        Alert.alert(
          "Couldn't enable reminders",
          'Something went wrong scheduling the reminder. Please try again.'
        );
      }
    }
  }

  async function handleToggleReflection(next: boolean) {
    setReflectionEnabled(next);
    await setReflectionMomentsEnabled(next);
  }

  if (!loaded) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator color={theme.text} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" style={styles.sectionTitle}>
        NIGHTLY PLANNING
      </ThemedText>

      <ThemedView type="backgroundElement" style={styles.row}>
        <View style={styles.rowText}>
          <ThemedText type="smallBold">Nightly ritual reminder</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            A gentle nudge each evening to close out today and glance at tomorrow.
          </ThemedText>
        </View>
        {busy ? (
          <ActivityIndicator color={theme.text} />
        ) : (
          <Switch
            value={ritualEnabled}
            onValueChange={handleToggleRitual}
            trackColor={{ true: ACCENT }}
          />
        )}
      </ThemedView>

      {ritualEnabled && (
        <ThemedView type="backgroundElement" style={styles.row}>
          <View style={styles.rowText}>
            <ThemedText type="smallBold">Reminder time</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
              placeholder="HH:MM"
              placeholderTextColor={theme.textSecondary}
              value={timeDraft}
              onChangeText={(next) => {
                setTimeDraft(next);
                setTimeError(null);
              }}
              onBlur={handleTimeBlur}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
            />
            {timeError && <ThemedText style={styles.errorText}>{timeError}</ThemedText>}
          </View>
        </ThemedView>
      )}

      <ThemedView type="backgroundElement" style={styles.row}>
        <View style={styles.rowText}>
          <ThemedText type="smallBold">Reflection moments</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Adds a brief warm reflection prompt to the start and end of the nightly ritual screen.
          </ThemedText>
        </View>
        <Switch
          value={reflectionEnabled}
          onValueChange={handleToggleReflection}
          trackColor={{ true: ACCENT }}
        />
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  sectionTitle: {
    letterSpacing: 0.5,
  },
  loadingRow: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: Spacing.one,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    marginTop: Spacing.one,
  },
  errorText: {
    color: '#e0453c',
  },
});
