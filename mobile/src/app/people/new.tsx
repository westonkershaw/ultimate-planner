/**
 * new.tsx — create-person form. Validation mirrors goals/new.tsx's
 * isValidDateKey pattern for weddingDate. Relationship status + wedding date
 * fields only render for category === 'dating' (roadmap: engaged requires a
 * weddingDate — enforced below, not just hinted via placeholder).
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CategoryPicker, RelationshipStatusPicker } from '@/components/people/pickers';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCreatePerson } from '@/lib/people-hooks';
import type { Category, RelationshipStatus } from '@/lib/people-types';

const ACCENT = '#3c87f7';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WEDDING_DATE_STATUSES = new Set<RelationshipStatus>(['engaged', 'newlywed', 'married']);

function isValidDateKey(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!);
  return date.getFullYear() === y && date.getMonth() === m! - 1 && date.getDate() === d;
}

export default function NewPersonScreen() {
  const theme = useTheme();
  const router = useRouter();
  const createPerson = useCreatePerson();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('friend');
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus | null>(null);
  const [weddingDate, setWeddingDate] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const inputBackground = theme.backgroundElement;
  const isDating = category === 'dating';
  const showWeddingDate = isDating && relationshipStatus !== null && WEDDING_DATE_STATUSES.has(relationshipStatus);
  const weddingDateRequired = relationshipStatus === 'engaged';

  function validate(): string | null {
    if (!name.trim()) return 'Enter a name.';
    if (showWeddingDate) {
      const trimmed = weddingDate.trim();
      if (weddingDateRequired && !trimmed) {
        return 'Engaged requires a wedding date.';
      }
      if (trimmed && !isValidDateKey(trimmed)) {
        return 'Wedding date must be a valid date in YYYY-MM-DD format.';
      }
    }
    return null;
  }

  async function handleCreate() {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);

    try {
      await createPerson.mutateAsync({
        name: name.trim(),
        category,
        relationshipStatus: isDating ? relationshipStatus : null,
        weddingDate: showWeddingDate && weddingDate.trim() ? weddingDate.trim() : null,
        photoUrl: photoUrl.trim() || null,
      });
      router.back();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create person.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <View style={styles.field}>
          <ThemedText type="smallBold">Name</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: inputBackground, color: theme.text }]}
            placeholder="e.g. Jamie Rivera"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="smallBold">Category</ThemedText>
          <CategoryPicker
            value={category}
            onChange={(next) => {
              setCategory(next);
              if (next !== 'dating') {
                setRelationshipStatus(null);
                setWeddingDate('');
              }
            }}
          />
        </View>

        {isDating && (
          <View style={styles.field}>
            <ThemedText type="smallBold">Relationship status (optional)</ThemedText>
            <RelationshipStatusPicker
              value={relationshipStatus}
              onChange={(next) => {
                setRelationshipStatus(next);
                if (next === null || !WEDDING_DATE_STATUSES.has(next)) {
                  setWeddingDate('');
                }
              }}
            />
          </View>
        )}

        {showWeddingDate && (
          <View style={styles.field}>
            <ThemedText type="smallBold">
              Wedding date{weddingDateRequired ? '' : ' (optional)'}
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: inputBackground, color: theme.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textSecondary}
              value={weddingDate}
              onChangeText={setWeddingDate}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        )}

        <View style={styles.field}>
          <ThemedText type="smallBold">Photo URL (optional)</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: inputBackground, color: theme.text }]}
            placeholder="https://…"
            placeholderTextColor={theme.textSecondary}
            value={photoUrl}
            onChangeText={setPhotoUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {formError && <ThemedText style={styles.errorText}>{formError}</ThemedText>}

        <Pressable
          onPress={handleCreate}
          disabled={createPerson.isPending}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: ACCENT },
            (pressed || createPerson.isPending) && styles.pressed,
          ]}>
          {createPerson.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText style={styles.buttonText}>Create</ThemedText>
          )}
        </Pressable>
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
  field: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  errorText: {
    color: '#e0453c',
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
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
});
