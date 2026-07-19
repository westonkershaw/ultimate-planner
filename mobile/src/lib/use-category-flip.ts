/**
 * use-category-flip.ts — the ONE place that decides how to apply a category
 * change (instant vs. confirm-first) and which mutation to fire, plus the
 * "Move to…" action sheet that offers the flip from a list row. Shared by
 * the detail screen's segmented control and the list's long-press so the
 * "Keep dating history?" Alert only exists in one spot.
 */

import { Alert } from 'react-native';

import { flipRequiresConfirm } from './category-flip';
import { useSetCategory, useUpdatePerson } from './people-hooks';
import { CATEGORIES, type Category, type Person } from './people-types';

const CATEGORY_LABELS: Record<Category, string> = {
  friend: 'Friend',
  family: 'Family',
  dating: 'Dating',
};

export function useCategoryFlip() {
  const setCategory = useSetCategory();
  const updatePerson = useUpdatePerson();

  /** True while either the instant-flip or the confirm-flip mutation is running. */
  const isFlipping = setCategory.isPending || updatePerson.isPending;

  function requestFlip(person: Person, next: Category) {
    if (next === person.category) return;

    if (flipRequiresConfirm(person.category, next, person.relationshipStatus)) {
      Alert.alert('Keep dating history?', 'This person has a dating status set.', [
        {
          text: 'Keep hidden',
          style: 'default',
          isPreferred: true,
          onPress: () => {
            setCategory.mutate({ id: person.id, category: next });
          },
        },
        {
          text: 'Clear it',
          style: 'destructive',
          onPress: () => {
            updatePerson.mutate({
              id: person.id,
              patch: { category: next, relationshipStatus: null, weddingDate: null },
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    setCategory.mutate({ id: person.id, category: next });
  }

  /** Long-press entry point for a list row: "Move to…" offers the other two categories. */
  function requestMove(person: Person) {
    const otherCategories = CATEGORIES.filter((category) => category !== person.category);
    Alert.alert(
      'Move to…',
      undefined,
      [
        ...otherCategories.map((category) => ({
          text: CATEGORY_LABELS[category],
          onPress: () => requestFlip(person, category),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }

  return { requestFlip, requestMove, isFlipping };
}
