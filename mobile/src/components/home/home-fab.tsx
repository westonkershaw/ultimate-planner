/**
 * home-fab.tsx — floating "+" bottom-right on Home. Opens an Alert-based
 * action sheet (cross-platform, no extra package) with two real actions plus
 * Cancel. "Add block" arrives in Phase 4 (calendar blocks) — not included yet.
 */

import { useRouter } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';

const ACCENT = '#3c87f7';

export function HomeFab() {
  const router = useRouter();

  function handlePress() {
    Alert.alert('Add', undefined, [
      { text: 'Log progress', onPress: () => router.push('/goals') },
      { text: 'Add goal', onPress: () => router.push('/goals/new') },
      // Add block (calendar) arrives in Phase 4.
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
      <ThemedText style={styles.plus}>+</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 6,
      },
    }),
  },
  pressed: {
    opacity: 0.85,
  },
  plus: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
});
