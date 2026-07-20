/**
 * map-callout.tsx — content rendered inside a Marker's <Callout> on the
 * People map (map.tsx). Shows identity (photo/initials, name, status label)
 * plus up to three action rows: Call/Text (only when person.phone is set)
 * and Log contact (via the same useLogContact hook the detail screen uses).
 * Every row (identity + actions) is wrapped in react-native-maps'
 * <CalloutSubview onPress> rather than a plain Pressable — per the library's
 * own docs (node_modules/react-native-maps/README.md, "Custom Callouts"),
 * plain RN touchables nested in a Callout do not reliably receive touch
 * events on iOS, so each row needs its own CalloutSubview to get a press.
 * The outer Callout in map.tsx has no onPress of its own; whole-bubble taps
 * that land outside a CalloutSubview do nothing, which is intentional.
 */

import { CalloutSubview } from 'react-native-maps';
import { Linking, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/people/avatar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MapPin } from '@/lib/map-pins';

const ACCENT = '#3c87f7';

export function MapCallout({
  pin,
  onOpenDetail,
  onLogContact,
  logContactPending,
  phone,
}: {
  pin: MapPin;
  onOpenDetail: () => void;
  onLogContact: () => void;
  logContactPending: boolean;
  phone: string | null;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CalloutSubview onPress={onOpenDetail} style={styles.identityRow}>
        <Avatar name={pin.name} photoUrl={pin.photoUrl} size={40} />
        <View style={styles.identityText}>
          <ThemedText type="smallBold">{pin.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {pin.statusLabel}
          </ThemedText>
        </View>
      </CalloutSubview>

      <View style={styles.actions}>
        {phone !== null && (
          <CalloutSubview onPress={() => Linking.openURL('tel:' + phone)} style={styles.actionRow}>
            <ThemedText type="small" style={{ color: ACCENT }}>
              Call
            </ThemedText>
          </CalloutSubview>
        )}
        {phone !== null && (
          <CalloutSubview onPress={() => Linking.openURL('sms:' + phone)} style={styles.actionRow}>
            <ThemedText type="small" style={{ color: ACCENT }}>
              Text
            </ThemedText>
          </CalloutSubview>
        )}
        <CalloutSubview
          onPress={logContactPending ? undefined : onLogContact}
          style={styles.actionRow}>
          <ThemedText type="small" style={{ color: ACCENT }}>
            {logContactPending ? 'Logging…' : 'Log contact'}
          </ThemedText>
        </CalloutSubview>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 180,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  identityText: {
    gap: Spacing.half,
  },
  actions: {
    gap: Spacing.one,
  },
  actionRow: {
    paddingVertical: Spacing.half,
  },
});
