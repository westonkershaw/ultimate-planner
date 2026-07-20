/**
 * quick-contact-actions.tsx — Call/Text buttons for the Person detail screen,
 * shown only when person.phone is non-empty. URLs are built with plain
 * string concatenation ('tel:' + phone / 'sms:' + phone), matching both this
 * session's tooling requirement and the existing convention in
 * map-callout.tsx. After Linking.openURL, prompts to log the contact via the
 * same useLogContact hook the rest of this screen already uses.
 */

import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const ACCENT = '#3c87f7';

function promptLogContact(onLogContact: () => void) {
  Alert.alert('Log this contact?', 'Mark this person as contacted now?', [
    { text: 'Not now', style: 'cancel' },
    { text: 'Log contact', onPress: onLogContact },
  ]);
}

export function QuickContactActions({
  phone,
  onLogContact,
}: {
  phone: string;
  onLogContact: () => void;
}) {
  function handleCall() {
    Linking.openURL('tel:' + phone);
    promptLogContact(onLogContact);
  }

  function handleText() {
    Linking.openURL('sms:' + phone);
    promptLogContact(onLogContact);
  }

  return (
    <View style={styles.row}>
      <Pressable onPress={handleCall} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <ThemedText type="small" style={{ color: ACCENT }}>
          Call
        </ThemedText>
      </Pressable>
      <Pressable onPress={handleText} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <ThemedText type="small" style={{ color: ACCENT }}>
          Text
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
