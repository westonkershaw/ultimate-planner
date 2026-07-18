/**
 * status-dot.tsx — small colored dot + label for GoalStatus. `rounded-full`
 * style is exempt from any no-rounded-corners rule elsewhere in the app
 * (this is the mobile app, not the web kinetic-utility system) — dots read
 * fine rounded.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { GoalStatus } from '@/lib/goals-types';

const ACCENT = '#3c87f7';
const NEEDS_ATTENTION = '#e0453c';

const STATUS_LABEL: Record<GoalStatus, string> = {
  progressing: 'Progressing',
  needs_attention: 'Needs attention',
};

export function StatusDot({ status }: { status: GoalStatus }) {
  const color = status === 'progressing' ? ACCENT : NEEDS_ATTENTION;
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText type="small" themeColor="textSecondary">
        {STATUS_LABEL[status]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
