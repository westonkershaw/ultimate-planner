/**
 * social-links-section.tsx — social link rows for the Person detail screen.
 * Each row is a tappable link (opens via Linking after a loose URL-shape
 * guard) with a small delete control; an inline add-form appends a new
 * {platform, url} entry. There is no dedicated social-links mutation — the
 * whole array is replaced through the same useUpdatePerson patch every other
 * field on this screen already uses (see [id].tsx's name edit).
 *
 * Icons: expo-symbols' SymbolView, the app's existing icon mechanism (see
 * app-tabs.web.tsx / collapsible.tsx / explore.tsx) — no new icon package.
 * symbolNameForPlatform (lib/social-icon.ts) maps a few common platform
 * names to a generic SF Symbol glyph; anything else falls back to `link`.
 */

import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SocialLink } from '@/lib/people-types';
import { symbolNameForPlatform } from '@/lib/social-icon';

const ACCENT = '#3c87f7';

/** Loose shape guard, not a strict URL parse — just enough to avoid handing Linking garbage. */
function looksLikeUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value.trim()) || /^[\w-]+\.[a-z]{2,}(\/.*)?$/i.test(value.trim());
}

function openLink(url: string) {
  if (!looksLikeUrl(url)) return;
  const target = /^https?:\/\//i.test(url) ? url : 'https://' + url;
  Linking.openURL(target);
}

function SocialLinkRow({ link, onDelete }: { link: SocialLink; onDelete: () => void }) {
  const theme = useTheme();

  function confirmDelete() {
    Alert.alert('Remove link?', `Remove the ${link.platform} link.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onDelete },
    ]);
  }

  return (
    <View style={styles.linkRow}>
      <Pressable
        onPress={() => openLink(link.url)}
        style={({ pressed }) => [styles.linkPressable, pressed && styles.pressed]}>
        <SymbolView
          name={{ ios: symbolNameForPlatform(link.platform), android: 'link', web: 'link' }}
          size={18}
          tintColor={theme.textSecondary}
        />
        <View style={styles.linkText}>
          <ThemedText type="small" style={styles.platformLabel}>
            {link.platform}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {link.url}
          </ThemedText>
        </View>
      </Pressable>
      <Pressable onPress={confirmDelete} style={({ pressed }) => pressed && styles.pressed}>
        <ThemedText type="small" style={styles.deleteText}>
          Remove
        </ThemedText>
      </Pressable>
    </View>
  );
}

export function SocialLinksSection({
  links,
  onChange,
  saving,
}: {
  links: SocialLink[];
  onChange: (next: SocialLink[]) => Promise<void>;
  saving: boolean;
}) {
  const theme = useTheme();
  const [adding, setAdding] = useState(false);
  const [platform, setPlatform] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  function startAdding() {
    setPlatform('');
    setUrl('');
    setError(null);
    setAdding(true);
  }

  async function handleAdd() {
    const trimmedPlatform = platform.trim();
    const trimmedUrl = url.trim();
    if (!trimmedPlatform || !trimmedUrl) {
      setError('Platform and URL are both required.');
      return;
    }
    setError(null);
    try {
      await onChange([...links, { platform: trimmedPlatform, url: trimmedUrl }]);
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save link.');
    }
  }

  function handleDelete(index: number) {
    onChange(links.filter((_, i) => i !== index)).catch(() => {
      // update-person error surfaces via the shared mutation state elsewhere;
      // nothing additional to do here.
    });
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          SOCIAL LINKS
        </ThemedText>
        {!adding && (
          <Pressable onPress={startAdding} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="linkPrimary">Add</ThemedText>
          </Pressable>
        )}
      </View>

      {links.map((link, index) => (
        <SocialLinkRow key={`${link.platform}-${index}`} link={link} onDelete={() => handleDelete(index)} />
      ))}

      {adding && (
        <View style={styles.addForm}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
            placeholder="Platform (e.g. Instagram)"
            placeholderTextColor={theme.textSecondary}
            value={platform}
            onChangeText={setPlatform}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
            placeholder="URL"
            placeholderTextColor={theme.textSecondary}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
          {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
          <View style={styles.row}>
            <Pressable
              onPress={() => setAdding(false)}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <ThemedText type="small">Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleAdd}
              disabled={saving}
              style={({ pressed }) => [
                styles.button,
                styles.rowInput,
                { backgroundColor: ACCENT },
                (pressed || saving) && styles.pressed,
              ]}>
              {saving ? <ActivityIndicator color="#ffffff" /> : <ThemedText style={styles.buttonText}>Add</ThemedText>}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  linkPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  linkText: {
    flex: 1,
    gap: Spacing.half,
  },
  platformLabel: {
    textTransform: 'capitalize',
  },
  deleteText: {
    color: '#e0453c',
  },
  addForm: {
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
