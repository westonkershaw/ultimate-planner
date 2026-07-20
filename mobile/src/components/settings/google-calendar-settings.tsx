/**
 * google-calendar-settings.tsx — Settings section for Google Calendar sync
 * (Roadmap Phase 5, part two). Not-connected state shows a "Connect Google
 * Calendar" button (connectGoogleCalendar, gcal-auth.ts) with a loading
 * state while the in-app browser flow is in progress and an inline error on
 * failure/cancellation. Connected state shows a connected indicator, a
 * "Sync now" button (runGoogleCalendarSync, gcal-sync-runner.ts) with a
 * friendly created/updated summary, and a Disconnect button
 * (disconnectGoogleCalendar) gated behind the same Alert.alert
 * confirm/destructive pattern goals/[id].tsx and people/[id].tsx already use
 * for delete.
 *
 * Same shape as nightly-ritual-settings.tsx: local state seeded once on
 * mount, a loading spinner until that initial check resolves, ThemedView
 * `backgroundElement` rows, Space Mono-less plain section title.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  isGoogleCalendarConnected,
} from '@/lib/gcal-auth';
import { runGoogleCalendarSync } from '@/lib/gcal-sync-runner';

const ACCENT = '#3c87f7';

function formatSyncSummary(created: number, updated: number, deleted: number, pulled: number): string {
  const parts: string[] = [];
  if (created > 0) parts.push(`${created} created`);
  if (updated > 0) parts.push(`${updated} updated`);
  if (deleted > 0) parts.push(`${deleted} removed`);
  if (pulled > 0) parts.push(`${pulled} pulled from Calendar`);
  if (parts.length === 0) return 'Everything is already up to date.';
  return `Synced: ${parts.join(', ')}.`;
}

export function GoogleCalendarSettings() {
  const theme = useTheme();

  const [loaded, setLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const isConnected = await isGoogleCalendarConnected();
      if (cancelled) return;
      setConnected(isConnected);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConnect() {
    setConnecting(true);
    setConnectError(null);
    try {
      const result = await connectGoogleCalendar();
      if (!result.success) {
        setConnectError(result.error ?? 'Could not connect Google Calendar.');
        return;
      }
      setConnected(true);
      setSyncMessage(null);
    } finally {
      setConnecting(false);
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await runGoogleCalendarSync();
      if (!result.success) {
        setSyncMessage(result.error ?? 'Sync failed. Please try again.');
        return;
      }
      setSyncMessage(formatSyncSummary(result.created, result.updated, result.deleted, result.pulled));
    } finally {
      setSyncing(false);
    }
  }

  function handleDisconnectPress() {
    Alert.alert('Disconnect Google Calendar?', "You'll need to reconnect to sync again.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          setDisconnecting(true);
          try {
            const success = await disconnectGoogleCalendar();
            if (!success) {
              Alert.alert(
                "Couldn't disconnect",
                'Something went wrong disconnecting Google Calendar. Please try again.'
              );
              return;
            }
            setConnected(false);
            setSyncMessage(null);
          } finally {
            setDisconnecting(false);
          }
        },
      },
    ]);
  }

  if (!loaded) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator color={theme.text} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" style={styles.sectionTitle}>
        GOOGLE CALENDAR
      </ThemedText>

      {!connected ? (
        <ThemedView type="backgroundElement" style={styles.row}>
          <View style={styles.rowText}>
            <ThemedText type="smallBold">Connect Google Calendar</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Sync your blocks two-way with your primary Google Calendar.
            </ThemedText>
            {connectError && <ThemedText style={styles.errorText}>{connectError}</ThemedText>}
          </View>
          <Pressable
            onPress={handleConnect}
            disabled={connecting}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: ACCENT },
              (pressed || connecting) && styles.pressed,
            ]}>
            {connecting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.actionButtonText}>Connect</ThemedText>
            )}
          </Pressable>
        </ThemedView>
      ) : (
        <>
          <ThemedView type="backgroundElement" style={styles.row}>
            <View style={styles.rowText}>
              <View style={styles.connectedIndicatorRow}>
                <View style={[styles.connectedDot, { backgroundColor: ACCENT }]} />
                <ThemedText type="smallBold">Connected</ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                Your blocks sync with your primary Google Calendar.
              </ThemedText>
            </View>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.row}>
            <View style={styles.rowText}>
              <ThemedText type="smallBold">Sync now</ThemedText>
              {syncMessage && (
                <ThemedText type="small" themeColor="textSecondary">
                  {syncMessage}
                </ThemedText>
              )}
            </View>
            <Pressable
              onPress={handleSyncNow}
              disabled={syncing}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: ACCENT },
                (pressed || syncing) && styles.pressed,
              ]}>
              {syncing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText style={styles.actionButtonText}>Sync now</ThemedText>
              )}
            </Pressable>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.row}>
            <View style={styles.rowText}>
              <ThemedText type="smallBold">Disconnect</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Stops syncing blocks to Google Calendar.
              </ThemedText>
            </View>
            {disconnecting ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <Pressable onPress={handleDisconnectPress} style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText style={styles.disconnectText}>Disconnect</ThemedText>
              </Pressable>
            )}
          </ThemedView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  sectionTitle: {
    letterSpacing: 0.5,
  },
  loadingRow: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: Spacing.one,
  },
  connectedIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionButton: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  disconnectText: {
    color: '#e0453c',
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    color: '#e0453c',
  },
  pressed: {
    opacity: 0.7,
  },
});
