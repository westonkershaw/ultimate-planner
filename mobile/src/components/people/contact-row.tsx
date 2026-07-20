/**
 * contact-row.tsx — a single labeled contact field (address/phone/email) on
 * the Person detail screen. Mirrors the inline-edit pattern already used for
 * the name field in app/people/[id].tsx: tap to reveal a TextInput + Save/
 * Cancel row, Save disabled while the mutation is pending. Renders nothing
 * when `value` is empty (the screen only mounts a row for non-empty fields
 * per Phase 3e's requirement — omitted, not shown blank).
 */

import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ACCENT = '#3c87f7';

export function ContactRow({
  label,
  value,
  placeholder,
  keyboardType,
  validate,
  onSave,
  saving,
}: {
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: 'phone-pad' | 'email-address' | 'default';
  /**
   * Soft format nudge — returns a message to display, or null when the value
   * looks fine. This is advisory only: it never blocks `onSave`, since
   * formats (especially phone numbers) vary too widely to hard-validate.
   */
  validate?: (next: string) => string | null;
  onSave: (next: string) => Promise<void>;
  saving: boolean;
}) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setDraft(value);
    setWarning(null);
    setError(null);
    setEditing(true);
  }

  function handleChangeText(next: string) {
    setDraft(next);
    setWarning(validate?.(next.trim()) ?? null);
  }

  async function handleSave() {
    const trimmed = draft.trim();
    setError(null);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.');
    }
  }

  if (!editing && !value) return null;

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      {editing ? (
        <>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            value={draft}
            onChangeText={handleChangeText}
            keyboardType={keyboardType}
            autoCapitalize="none"
          />
          {warning && (
            <ThemedText type="small" themeColor="textSecondary">
              {warning}
            </ThemedText>
          )}
          {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
          <View style={styles.row}>
            <Pressable
              onPress={() => setEditing(false)}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <ThemedText type="small">Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.button,
                styles.rowInput,
                { backgroundColor: ACCENT },
                (pressed || saving) && styles.pressed,
              ]}>
              {saving ? <ActivityIndicator color="#ffffff" /> : <ThemedText style={styles.buttonText}>Save</ThemedText>}
            </Pressable>
          </View>
        </>
      ) : (
        <Pressable onPress={startEditing} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="default">{value}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rowInput: {
    flex: 1,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  errorText: {
    color: '#e0453c',
  },
});
