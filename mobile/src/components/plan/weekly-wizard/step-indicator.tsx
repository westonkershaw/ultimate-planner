/**
 * step-indicator.tsx — small dot-row showing wizard progress (Roadmap Phase 4b).
 * Purely presentational; the wizard screen owns step state.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const ACCENT = '#3c87f7';

export function StepIndicator({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <ThemedView
          key={i}
          type={i === step ? undefined : 'backgroundElement'}
          style={[styles.dot, i === step && { backgroundColor: ACCENT }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
