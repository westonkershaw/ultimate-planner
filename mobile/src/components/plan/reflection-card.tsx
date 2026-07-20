/**
 * reflection-card.tsx — small warm, static reflection prompt shown on the
 * nightly ritual screen (Roadmap Phase 4c) when reflection moments are
 * enabled (`getReflectionMomentsEnabled`, ritual-prefs.ts). Purely
 * presentational: no text input, nothing persisted, same as the roadmap's
 * "purely a presentational feature" framing for reflection moments.
 *
 * No existing user-audience/faith preference was found anywhere in this
 * codebase (searched for "spiritual", "faith", "denomination", "audience" —
 * the only hit is the Spiritual life-area goal templates in goal-templates.ts,
 * which are themselves non-denominational, e.g. "Meditation", "Scripture
 * study" offered as one of several template packs, not an assumed default).
 * So this copy stays warm and non-denominational rather than presuming any
 * particular audience — same choice already made there.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const OPENING_PROMPT = "Before you look back on today, take a breath. You showed up — that's enough.";
const CLOSING_PROMPT = 'Whatever tomorrow holds, you get to begin again. Rest well.';

export function ReflectionCard({ variant }: { variant: 'opening' | 'closing' }) {
  const prompt = variant === 'opening' ? OPENING_PROMPT : CLOSING_PROMPT;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.content}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
          {prompt}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
  },
  content: {
    gap: Spacing.two,
  },
  text: {
    fontStyle: 'italic',
    lineHeight: 22,
  },
});
