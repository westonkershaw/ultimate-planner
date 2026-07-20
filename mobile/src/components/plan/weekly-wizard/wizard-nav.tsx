/**
 * wizard-nav.tsx — shared Back/Next footer row for each weekly-wizard step.
 * `onNext` is omitted to hide the Next button (final step uses its own Done
 * button instead); `nextLabel` lets a step rename it (e.g. "Done").
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const ACCENT = '#3c87f7';

export function WizardNav({
  onBack,
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
          <ThemedText style={[styles.secondaryButtonText, { color: ACCENT }]}>Back</ThemedText>
        </Pressable>
      ) : (
        <View style={styles.secondaryButton} />
      )}

      {onNext && (
        <Pressable
          onPress={onNext}
          disabled={nextDisabled}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: ACCENT },
            (pressed || nextDisabled) && styles.pressed,
          ]}>
          <ThemedText style={styles.primaryButtonText}>{nextLabel}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  primaryButton: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    minWidth: 72,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
