/**
 * today-plan-button.tsx — full-width filled button that pushes to the Daily
 * Planning screen (/plan/today). Sibling to weekly-planning-button.tsx but
 * wired to a real route rather than a placeholder — do not touch
 * WeeklyPlanningButton's Alert-based placeholder, that's separate scope.
 */

import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const ACCENT = '#3c87f7';

export function TodayPlanButton() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/plan/today')}
      style={({ pressed }) => [styles.button, { backgroundColor: ACCENT }, pressed && styles.pressed]}>
      <ThemedText style={styles.label}>TODAYS PLAN</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
