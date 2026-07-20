/**
 * map-empty-state.tsx — centered overlay card shown on the People map when
 * there are zero geocoded people to plot. Pure presentation; map.tsx decides
 * when to render it (pins.length === 0).
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ACCENT = '#3c87f7';

export function MapEmptyState({ onBack }: { onBack: () => void }) {
  const theme = useTheme();

  return (
    <View style={styles.overlay}>
      <View style={[styles.card, { backgroundColor: theme.background }]}>
        <ThemedText type="subtitle" style={styles.centerText}>
          No one on the map yet — add an address on a person&apos;s detail page.
        </ThemedText>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.button, { backgroundColor: ACCENT }, pressed && styles.pressed]}>
          <ThemedText style={styles.buttonText}>Back to people</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'center',
    maxWidth: 320,
  },
  centerText: {
    textAlign: 'center',
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
  pressed: {
    opacity: 0.7,
  },
});
