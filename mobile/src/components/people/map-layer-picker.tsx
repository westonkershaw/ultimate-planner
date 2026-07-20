/**
 * map-layer-picker.tsx — floating row of 4 chips (All / Dating / Friends /
 * Family) over the top of the People map, for switching MapLayer. Styled via
 * useTheme with an opaque background + border so the labels stay legible
 * over map tiles of any color.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MapLayer } from '@/lib/map-pins';

const ACCENT = '#3c87f7';

const LAYER_OPTIONS: { value: MapLayer; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'dating', label: 'Dating' },
  { value: 'friends', label: 'Friends' },
  { value: 'family', label: 'Family' },
];

export function MapLayerPicker({
  layer,
  onChange,
}: {
  layer: MapLayer;
  onChange: (layer: MapLayer) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {LAYER_OPTIONS.map((option) => {
        const active = option.value === layer;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              { backgroundColor: theme.background, borderColor: active ? ACCENT : theme.backgroundSelected },
            ]}>
            <ThemedText type="small" style={active ? { color: ACCENT } : undefined}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
