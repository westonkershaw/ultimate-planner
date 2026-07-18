import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CadencePicker, LifeAreaPicker, MetricTypePicker } from '@/components/goals/pickers';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCreateGoal } from '@/lib/goals-hooks';
import { TEMPLATE_SETS, type GoalTemplate } from '@/lib/goal-templates';
import type { Cadence, LifeArea, MetricType } from '@/lib/goals-types';

const ACCENT = '#3c87f7';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateKey(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!);
  return date.getFullYear() === y && date.getMonth() === m! - 1 && date.getDate() === d;
}

export default function NewGoalScreen() {
  const theme = useTheme();
  const router = useRouter();
  const createGoal = useCreateGoal();

  const [title, setTitle] = useState('');
  const [lifeArea, setLifeArea] = useState<LifeArea>('finance');
  const [metricType, setMetricType] = useState<MetricType>('numeric');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const [cadence, setCadence] = useState<Cadence>('weekly');
  const [targetDate, setTargetDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [bulkAddingSetId, setBulkAddingSetId] = useState<string | null>(null);

  const inputBackground = theme.backgroundElement;
  const showUnitField = metricType === 'currency' || metricType === 'numeric';

  function prefillFromTemplate(template: GoalTemplate) {
    setTitle(template.title);
    setLifeArea(template.lifeArea);
    setMetricType(template.metricType);
    setTargetValue(String(template.targetValue));
    setUnit(template.unit ?? '');
    setCadence(template.cadence);
    setTargetDate('');
    setFormError(null);
  }

  function validate(): string | null {
    if (!title.trim()) return 'Enter a goal title.';
    const parsedTarget = Number(targetValue);
    if (!targetValue.trim() || Number.isNaN(parsedTarget) || parsedTarget <= 0) {
      return 'Enter a target value greater than 0.';
    }
    if (targetDate.trim() && !isValidDateKey(targetDate.trim())) {
      return 'Target date must be a valid date in YYYY-MM-DD format.';
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
      await createGoal.mutateAsync({
        title: title.trim(),
        lifeArea,
        metricType,
        targetValue: Number(targetValue),
        unit: unit.trim() || null,
        cadence,
        targetDate: targetDate.trim() || null,
      });
      router.back();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create goal.');
    }
  }

  async function handleAddAllFive(setId: string, templates: readonly GoalTemplate[]) {
    setBulkAddingSetId(setId);
    setFormError(null);
    try {
      for (const template of templates) {
        await createGoal.mutateAsync({
          title: template.title,
          lifeArea: template.lifeArea,
          metricType: template.metricType,
          targetValue: template.targetValue,
          unit: template.unit ?? null,
          cadence: template.cadence,
          targetDate: null,
        });
      }
      router.back();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add template goals.');
    } finally {
      setBulkAddingSetId(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <View style={styles.field}>
          <ThemedText type="smallBold">Title</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: inputBackground, color: theme.text }]}
            placeholder="e.g. Build an emergency fund"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="smallBold">Life area</ThemedText>
          <LifeAreaPicker value={lifeArea} onChange={setLifeArea} />
        </View>

        <View style={styles.field}>
          <ThemedText type="smallBold">Metric type</ThemedText>
          <MetricTypePicker value={metricType} onChange={setMetricType} />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.rowInput]}>
            <ThemedText type="smallBold">Target value</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: inputBackground, color: theme.text }]}
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
              value={targetValue}
              onChangeText={setTargetValue}
              keyboardType="decimal-pad"
            />
          </View>
          {showUnitField && (
            <View style={[styles.field, styles.rowInput]}>
              <ThemedText type="smallBold">Unit (optional)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBackground, color: theme.text }]}
                placeholder={metricType === 'currency' ? '$' : 'e.g. reps'}
                placeholderTextColor={theme.textSecondary}
                value={unit}
                onChangeText={setUnit}
              />
            </View>
          )}
        </View>

        <View style={styles.field}>
          <ThemedText type="smallBold">Cadence</ThemedText>
          <CadencePicker value={cadence} onChange={setCadence} />
        </View>

        <View style={styles.field}>
          <ThemedText type="smallBold">Target date (optional)</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: inputBackground, color: theme.text }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSecondary}
            value={targetDate}
            onChangeText={setTargetDate}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {formError && <ThemedText style={styles.errorText}>{formError}</ThemedText>}

        <Pressable
          onPress={handleCreate}
          disabled={createGoal.isPending}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: ACCENT },
            (pressed || createGoal.isPending) && styles.pressed,
          ]}>
          {createGoal.isPending && bulkAddingSetId === null ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText style={styles.buttonText}>Create</ThemedText>
          )}
        </Pressable>

        <View style={styles.templatesSection}>
          <ThemedText type="subtitle" style={styles.templatesHeading}>
            Templates
          </ThemedText>
          {TEMPLATE_SETS.map((set) => (
            <ThemedView key={set.id} type="backgroundElement" style={styles.templateCard}>
              <ThemedText type="smallBold">{set.label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {set.description}
              </ThemedText>

              <View style={styles.templateRows}>
                {set.templates.map((template) => (
                  <Pressable
                    key={template.title}
                    onPress={() => prefillFromTemplate(template)}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <ThemedView type="backgroundSelected" style={styles.templateRow}>
                      <ThemedText type="small" numberOfLines={1} style={styles.templateRowTitle}>
                        {template.title}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {template.cadence}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => handleAddAllFive(set.id, set.templates)}
                disabled={createGoal.isPending}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { borderColor: ACCENT },
                  (pressed || createGoal.isPending) && styles.pressed,
                ]}>
                {bulkAddingSetId === set.id ? (
                  <ActivityIndicator color={ACCENT} />
                ) : (
                  <ThemedText style={[styles.secondaryButtonText, { color: ACCENT }]}>
                    Add all 5
                  </ThemedText>
                )}
              </Pressable>
            </ThemedView>
          ))}
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
  field: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
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
  templatesSection: {
    gap: Spacing.three,
  },
  templatesHeading: {
    fontSize: 24,
    lineHeight: 28,
  },
  templateCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  templateRows: {
    gap: Spacing.one,
  },
  templateRow: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  templateRowTitle: {
    flex: 1,
  },
  secondaryButton: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
