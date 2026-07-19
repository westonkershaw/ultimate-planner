/**
 * collapsible-section.tsx — a tappable section header (label + count + a
 * chevron) that toggles its children's visibility. Collapse state is owned
 * by the parent (People list tracks a Set of collapsed bucket ids) so it can
 * survive re-renders from query refetches without resetting.
 */

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function CollapsibleSection({
  label,
  count,
  collapsed,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Pressable onPress={onToggle} style={({ pressed }) => pressed && styles.pressed}>
        <View style={styles.header}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.headerLabel}>
            {label.toUpperCase()} · {count}
          </ThemedText>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {collapsed ? '▸' : '▾'}
          </ThemedText>
        </View>
      </Pressable>
      {!collapsed && <View style={styles.rows}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  headerLabel: {
    letterSpacing: 0.5,
  },
  rows: {
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
