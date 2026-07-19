/**
 * pickers.tsx — chip-style pickers for the person form (category,
 * relationship status). Mirrors components/goals/pickers.tsx's Chip pattern.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORIES, RELATIONSHIP_STATUSES, type Category, type RelationshipStatus } from '@/lib/people-types';

const ACCENT = '#3c87f7';

const CATEGORY_LABELS: Record<Category, string> = {
  friend: 'Friend',
  family: 'Family',
  dating: 'Dating',
};

const RELATIONSHIP_STATUS_LABELS: Record<RelationshipStatus, string> = {
  past: 'Past',
  interested: 'Interested',
  dating: 'Dating',
  engaged: 'Engaged',
  newlywed: 'Newlywed',
  married: 'Married',
};

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

export function CategoryPicker({ value, onChange }: { value: Category; onChange: (v: Category) => void }) {
  return (
    <View style={styles.chipRow}>
      {CATEGORIES.map((category) => (
        <Chip
          key={category}
          label={CATEGORY_LABELS[category]}
          selected={value === category}
          onPress={() => onChange(category)}
        />
      ))}
    </View>
  );
}

/**
 * `value` may be null (unset) — tapping the already-selected chip clears it,
 * since relationshipStatus is optional even for category === 'dating'.
 */
export function RelationshipStatusPicker({
  value,
  onChange,
}: {
  value: RelationshipStatus | null;
  onChange: (v: RelationshipStatus | null) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {RELATIONSHIP_STATUSES.map((status) => (
        <Chip
          key={status}
          label={RELATIONSHIP_STATUS_LABELS[status]}
          selected={value === status}
          onPress={() => onChange(value === status ? null : status)}
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
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
