/**
 * pickers.tsx — shared chip-style pickers for the goal form (life area,
 * metric type, cadence). Extracted from new.tsx to keep that screen small.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  LIFE_AREAS,
  LIFE_AREA_LABELS,
  type Cadence,
  type LifeArea,
  type MetricType,
} from '@/lib/goals-types';

const ACCENT = '#3c87f7';

const METRIC_TYPES: readonly { value: MetricType; label: string; hint: string }[] = [
  { value: 'currency', label: 'Currency', hint: 'Track a dollar amount' },
  { value: 'count', label: 'Count', hint: 'Track number of times' },
  { value: 'streak', label: 'Streak', hint: 'Track consecutive days' },
  { value: 'numeric', label: 'Numeric', hint: 'Track any other number' },
];

const CADENCES: readonly { value: Cadence; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={selected ? 'backgroundSelected' : 'backgroundElement'}
        style={[styles.chip, selected && { borderColor: ACCENT, borderWidth: 1 }]}>
        <ThemedText
          type="small"
          themeColor={selected ? 'text' : 'textSecondary'}
          style={selected && { color: theme.text }}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function LifeAreaPicker({
  value,
  onChange,
}: {
  value: LifeArea;
  onChange: (v: LifeArea) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {LIFE_AREAS.map((area) => (
        <Chip
          key={area}
          label={LIFE_AREA_LABELS[area]}
          selected={value === area}
          onPress={() => onChange(area)}
        />
      ))}
    </View>
  );
}

export function MetricTypePicker({
  value,
  onChange,
}: {
  value: MetricType;
  onChange: (v: MetricType) => void;
}) {
  const selectedHint = METRIC_TYPES.find((m) => m.value === value)?.hint;
  return (
    <View style={styles.pickerGroup}>
      <View style={styles.chipRow}>
        {METRIC_TYPES.map((metric) => (
          <Chip
            key={metric.value}
            label={metric.label}
            selected={value === metric.value}
            onPress={() => onChange(metric.value)}
          />
        ))}
      </View>
      {selectedHint && (
        <ThemedText type="small" themeColor="textSecondary">
          {selectedHint}
        </ThemedText>
      )}
    </View>
  );
}

export function CadencePicker({
  value,
  onChange,
}: {
  value: Cadence;
  onChange: (v: Cadence) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {CADENCES.map((cadence) => (
        <Chip
          key={cadence.value}
          label={cadence.label}
          selected={value === cadence.value}
          onPress={() => onChange(cadence.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pickerGroup: {
    gap: Spacing.one,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
