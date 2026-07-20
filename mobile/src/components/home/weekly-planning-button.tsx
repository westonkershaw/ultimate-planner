/**
 * weekly-planning-button.tsx — full-width outlined button that opens the
 * guided weekly planning wizard (Roadmap Phase 4b), replacing the earlier
 * Phase 2 placeholder Alert.
 */

import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const ACCENT = '#3c87f7';

export function WeeklyPlanningButton() {
  const router = useRouter();

  function handlePress() {
    router.push('/plan/weekly-wizard');
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.button, { borderColor: ACCENT }, pressed && styles.pressed]}>
      <ThemedText style={[styles.label, { color: ACCENT }]}>WEEKLY PLANNING</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
