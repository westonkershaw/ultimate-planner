/**
 * status-badge.tsx — renders a resolved RelationshipStatus as its
 * statusVisual() dot/star treatment plus optional label, shared by the
 * Dating list rows and the person detail screen.
 *
 * Shape rendering: 'dot' is a small circle (filled solid, or hollow
 * border-only per StatusVisual.filled — used for 'engaged'). 'star' is drawn
 * with react-native-svg so the hollow/filled distinction reads clearly at
 * small sizes. `celebratory` adds a soft accent ring around the shape.
 */

import Svg, { Path } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { statusVisual } from '@/lib/status-visual';
import type { RelationshipStatus } from '@/lib/people-types';

const STAR_PATH =
  'M12 2.5l2.86 6.06 6.64.79-4.9 4.63 1.28 6.6L12 17.27l-5.88 3.31 1.28-6.6-4.9-4.63 6.64-.79z';

function StatusShapeIcon({
  shape,
  color,
  filled,
  size = 14,
}: {
  shape: 'dot' | 'star';
  color: string;
  filled: boolean;
  size?: number;
}) {
  if (shape === 'star') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d={STAR_PATH}
          fill={filled ? color : 'none'}
          stroke={color}
          strokeWidth={filled ? 0 : 2}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  return (
    <View
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2 },
        filled ? { backgroundColor: color } : { borderColor: color, borderWidth: 2 },
      ]}
    />
  );
}

export function StatusBadge({
  resolved,
  showLabel = true,
  size = 14,
}: {
  resolved: RelationshipStatus | null;
  showLabel?: boolean;
  size?: number;
}) {
  const visual = statusVisual(resolved);

  return (
    <View style={styles.row}>
      <View style={visual.celebratory && [styles.celebratoryRing, { borderColor: visual.color }]}>
        <StatusShapeIcon shape={visual.shape} color={visual.color} filled={visual.filled} size={size} />
      </View>
      {showLabel && visual.label !== '' && (
        <ThemedText type="small" themeColor="textSecondary">
          {visual.label}
        </ThemedText>
      )}
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
    // width/height/borderRadius set inline per `size`.
  },
  celebratoryRing: {
    borderWidth: 1,
    borderRadius: 999,
    padding: 2,
  },
});
