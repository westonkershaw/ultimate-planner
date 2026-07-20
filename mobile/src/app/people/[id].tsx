/**
 * [id].tsx — basic Person detail screen (Phase 3b), extended in Phase 3c
 * with the category segmented control (friend/family/dating). Flip logic
 * (instant vs. confirm-first) lives in useCategoryFlip, shared with the
 * list's long-press action sheet — see use-category-flip.ts.
 *   - Phase 3e: address/phone/email/social-link rows + editing.
 * This screen covers: identity (name, inline-editable), category flip,
 * resolved relationship status display, last-contact display, "Log
 * contact", contact record rows (address/phone/email/social links), and
 * delete.
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ContactRow } from '@/components/people/contact-row';
import { CategoryPicker } from '@/components/people/pickers';
import { QuickContactActions } from '@/components/people/quick-contact-actions';
import { SocialLinksSection } from '@/components/people/social-links-section';
import { StatusBadge } from '@/components/people/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { geocodeAddress } from '@/lib/geocode';
import { useCategoryFlip } from '@/lib/use-category-flip';
import { weddingCountdownDays } from '@/lib/people-grouping';
import type { SocialLink } from '@/lib/people-types';
import { useDeletePerson, useLogContact, usePeople, useUpdatePerson } from '@/lib/people-hooks';
import { resolveRelationshipStatus } from '@/lib/relationship-status';
import { localDayKey, localDaysBetween, startOfLocalDay } from '@/lib/time-policy';
import { formatTargetDate } from '@/components/home/format-target-date';

/**
 * Soft format nudges for ContactRow — advisory only, never block saving.
 * International formats vary too widely for a hard rule here.
 */
function validateEmail(value: string): string | null {
  if (!value) return null;
  return /@.+/.test(value) ? null : 'Doesn’t look like an email.';
}

function validatePhone(value: string): string | null {
  if (!value) return null;
  const digitCount = (value.match(/\d/g) ?? []).length;
  return digitCount >= 3 ? null : 'Doesn’t look like a phone number.';
}

const ACCENT = '#3c87f7';

/** Local-midnight Date from a 'YYYY-MM-DD' day-key — matches people-grouping.ts's convention. */
function localDateFromDayKey(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

function lastContactLine(lastContactAt: string | null, today: Date): string {
  if (lastContactAt === null) return 'No contact logged';
  const lastContactDayKey = localDayKey(new Date(lastContactAt));
  const days = localDaysBetween(localDateFromDayKey(lastContactDayKey), startOfLocalDay(today));
  if (days <= 0) return 'Last contact: today';
  return `Last contact: ${days}d ago`;
}

export default function PersonDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: people, isLoading } = usePeople();
  const person = useMemo(() => people?.find((p) => p.id === id), [people, id]);

  const logContact = useLogContact();
  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();
  const { requestFlip, isFlipping } = useCategoryFlip();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);

  if (isLoading) {
    return (
      <View style={styles.centerBlock}>
        <ActivityIndicator color={theme.text} />
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.centerBlock}>
        <ThemedText style={styles.centerText}>This person could not be found.</ThemedText>
      </View>
    );
  }

  const resolved = resolveRelationshipStatus(person.relationshipStatus, person.weddingDate, today);
  const countdown =
    resolved === 'engaged' && person.weddingDate !== null
      ? weddingCountdownDays(person.weddingDate, today)
      : null;
  const showCountdown = countdown !== null && countdown > 0;

  function startEditing() {
    setEditName(person!.name);
    setEditError(null);
    setEditing(true);
  }

  async function handleSaveEdit() {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('Name cannot be empty.');
      return;
    }
    setEditError(null);
    try {
      await updatePerson.mutateAsync({ id: person!.id, patch: { name: trimmed } });
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not save changes.');
    }
  }

  async function handleLogContact() {
    setLogError(null);
    try {
      await logContact.mutateAsync(person!.id);
    } catch (err) {
      setLogError(err instanceof Error ? err.message : 'Could not log contact.');
    }
  }

  /**
   * Saves the address text through the normal update-person mutation and
   * resolves as soon as THAT completes — the caller (ContactRow) exits edit
   * mode right away, so the save feels instant. Geocoding runs as a detached
   * follow-up: still properly awaited (not fire-and-forget-unawaited) inside
   * its own async function, just not part of the promise this function
   * returns, so it can never delay or block the perceived save. A null
   * result (unresolvable address, network error, etc.) is silently
   * ignored — no error shown, no existing lat/lng cleared.
   */
  async function handleSaveAddress(next: string) {
    const personId = person!.id;
    await updatePerson.mutateAsync({ id: personId, patch: { address: next || null } });

    (async () => {
      const geocoded = await geocodeAddress(next);
      if (geocoded !== null) {
        await updatePerson.mutateAsync({
          id: personId,
          patch: { latitude: geocoded.latitude, longitude: geocoded.longitude },
        });
      }
    })();
  }

  async function handleSavePhone(next: string) {
    await updatePerson.mutateAsync({ id: person!.id, patch: { phone: next || null } });
  }

  async function handleSaveEmail(next: string) {
    await updatePerson.mutateAsync({ id: person!.id, patch: { email: next || null } });
  }

  async function handleSaveSocialLinks(next: SocialLink[]) {
    await updatePerson.mutateAsync({ id: person!.id, patch: { socialLinks: next } });
  }

  function handleDelete() {
    Alert.alert('Delete person?', `This permanently deletes "${person!.name}".`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePerson.mutateAsync(person!.id);
            router.back();
          } catch {
            // deletePerson.error surfaces below via mutation state
          }
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Stack.Screen options={{ title: person.name }} />
      <View style={styles.content}>
        <View style={styles.headerBlock}>
          <ThemedText type="title" style={styles.name}>
            {person.name}
          </ThemedText>

          {person.category === 'dating' && resolved !== null && (
            <View style={styles.statusRow}>
              <StatusBadge resolved={resolved} />
              {person.weddingDate !== null && (
                <ThemedText type="small" themeColor="textSecondary">
                  {formatTargetDate(person.weddingDate)}
                </ThemedText>
              )}
              {showCountdown && (
                <View style={[styles.chip, { borderColor: ACCENT }]}>
                  <ThemedText type="small" style={{ color: ACCENT }}>
                    in {countdown}d
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          <ThemedText type="small" themeColor="textSecondary">
            {lastContactLine(person.lastContactAt, today)}
          </ThemedText>
        </View>

        <View style={styles.categorySection}>
          <View style={styles.categoryHeaderRow}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              CATEGORY
            </ThemedText>
            {isFlipping && <ActivityIndicator size="small" color={theme.textSecondary} />}
          </View>
          <View pointerEvents={isFlipping ? 'none' : 'auto'} style={isFlipping && styles.pressed}>
            <CategoryPicker
              value={person.category}
              onChange={(next) => requestFlip(person, next)}
            />
          </View>
        </View>

        <ThemedView type="backgroundElement" style={styles.actionSection}>
          <Pressable
            onPress={handleLogContact}
            disabled={logContact.isPending}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: ACCENT },
              (pressed || logContact.isPending) && styles.pressed,
            ]}>
            {logContact.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.buttonText}>Log contact</ThemedText>
            )}
          </Pressable>
          {logError && <ThemedText style={styles.errorText}>{logError}</ThemedText>}
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.contactSection}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            CONTACT
          </ThemedText>

          {person.phone && (
            <QuickContactActions phone={person.phone} onLogContact={handleLogContact} />
          )}

          <ContactRow
            label="ADDRESS"
            value={person.address ?? ''}
            placeholder="Address"
            onSave={handleSaveAddress}
            saving={updatePerson.isPending}
          />
          <ContactRow
            label="PHONE"
            value={person.phone ?? ''}
            placeholder="Phone"
            keyboardType="phone-pad"
            validate={validatePhone}
            onSave={handleSavePhone}
            saving={updatePerson.isPending}
          />
          <ContactRow
            label="EMAIL"
            value={person.email ?? ''}
            placeholder="Email"
            keyboardType="email-address"
            validate={validateEmail}
            onSave={handleSaveEmail}
            saving={updatePerson.isPending}
          />

          <SocialLinksSection
            links={person.socialLinks}
            onChange={handleSaveSocialLinks}
            saving={updatePerson.isPending}
          />
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.editSection}>
          <View style={styles.editHeaderRow}>
            <ThemedText type="smallBold">Edit</ThemedText>
            {!editing && (
              <Pressable onPress={startEditing} style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="linkPrimary">Edit</ThemedText>
              </Pressable>
            )}
          </View>

          {editing && (
            <View style={styles.field}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundSelected, color: theme.text },
                ]}
                placeholder="Name"
                placeholderTextColor={theme.textSecondary}
                value={editName}
                onChangeText={setEditName}
              />
              {editError && <ThemedText style={styles.errorText}>{editError}</ThemedText>}
              <View style={styles.row}>
                <Pressable
                  onPress={() => setEditing(false)}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                  <ThemedText type="small">Cancel</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleSaveEdit}
                  disabled={updatePerson.isPending}
                  style={({ pressed }) => [
                    styles.button,
                    styles.rowInput,
                    { backgroundColor: ACCENT },
                    (pressed || updatePerson.isPending) && styles.pressed,
                  ]}>
                  {updatePerson.isPending ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <ThemedText style={styles.buttonText}>Save</ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </ThemedView>

        <View style={styles.dangerZone}>
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <ThemedText type="small" style={styles.deleteText}>
              Delete
            </ThemedText>
          </Pressable>
          {deletePerson.error && (
            <ThemedText style={styles.errorText}>
              {deletePerson.error instanceof Error
                ? deletePerson.error.message
                : 'Something went wrong.'}
            </ThemedText>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  headerBlock: {
    gap: Spacing.two,
  },
  name: {
    fontSize: 32,
    lineHeight: 38,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  categorySection: {
    gap: Spacing.two,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  contactSection: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  actionSection: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
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
  pressed: {
    opacity: 0.7,
  },
  errorText: {
    color: '#e0453c',
  },
  editSection: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  editHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerZone: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  deleteText: {
    color: '#e0453c',
  },
});
