/**
 * section-header.tsx — small-caps section title + optional right-aligned
 * link (e.g. "VIEW ALL" -> /goals). Reused wherever Home needs a section row.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <ThemedText type="smallBold" style={styles.title}>
        {title}
      </ThemedText>
      {actionLabel && onActionPress && (
        <Pressable onPress={onActionPress} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="linkPrimary" style={styles.action}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    letterSpacing: 0.5,
  },
  action: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
