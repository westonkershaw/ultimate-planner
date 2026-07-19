/**
 * weekly-planning-button.tsx — full-width outlined button that opens the
 * guided weekly planning session. The session itself is Phase 4 work; for
 * now this is a placeholder Alert per the Phase 2 scope.
 */

import { Alert, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const ACCENT = '#3c87f7';

export function WeeklyPlanningButton() {
  function handlePress() {
    Alert.alert('Weekly planning', 'The guided weekly planning session arrives in Phase 4.');
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
