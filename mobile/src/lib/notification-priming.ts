/**
 * notification-priming.ts — the one-line in-app explanation shown right
 * before requesting OS notification permission (Roadmap Phase 4c), plus a
 * small helper that shows it and only calls requestNotificationPermission
 * (notifications.ts) if the user taps through. Two call sites need this
 * exact same copy/flow — the nightly ritual toggle (settings) and the
 * weekly-wizard completion step — so it lives here once instead of being
 * duplicated or drifting between the two.
 *
 * Uses Alert.alert, the codebase's existing confirm/message idiom (see
 * goals/[id].tsx's Archive/Delete confirmations) — there's no modal-route
 * convention here to build a custom dialog on top of.
 */

import { Alert } from 'react-native';

import { requestNotificationPermission } from '@/lib/notifications';

export const NOTIFICATION_PRIMING_MESSAGE =
  'Allow notifications so we can remind you each evening to plan tomorrow.';

/**
 * Shows the priming explanation with a Continue button; only if the user
 * taps Continue does it call requestNotificationPermission and resolve with
 * the result. Resolves `false` if the user dismisses/cancels without ever
 * asking the OS.
 */
export function primeAndRequestNotificationPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert('Stay on top of tomorrow', NOTIFICATION_PRIMING_MESSAGE, [
      { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
      {
        text: 'Continue',
        onPress: async () => {
          resolve(await requestNotificationPermission());
        },
      },
    ]);
  });
}
