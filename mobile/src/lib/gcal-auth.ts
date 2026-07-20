/**
 * gcal-auth.ts — Google Calendar OAuth connect/disconnect + token access
 * (Roadmap Phase 5, part two).
 *
 * ARCHITECTURE (see research notes below for the evidence):
 *
 * 1. This app already authenticates users with email/password
 *    (auth-context.tsx, Phase 0.5). Connecting Google Calendar must ADD a
 *    linked Google identity to that already-signed-in user, not replace the
 *    session. `supabase.auth.linkIdentity({ provider: 'google', ... })` is
 *    exactly this: "Links an oauth identity to an existing user" (installed
 *    @supabase/supabase-js 2.110.7 types, GoTrueClient.d.ts). It requires the
 *    signed-in user AND requires "Enable Manual Linking" to be turned on in
 *    the Supabase project's Authentication settings (documented directly on
 *    the sibling `unlinkIdentity` method in the same file — manual linking
 *    covers both directions). That is a project-config change outside this
 *    repo; connectGoogleCalendar() cannot flip it, so a misconfigured
 *    project surfaces as a normal Supabase AuthError caught below, not a
 *    crash.
 *
 * 2. `linkIdentity` (OAuth overload) returns `{ data: { url }, error }` — it
 *    does NOT navigate anywhere itself (there's no browser context on
 *    native). The caller opens `url` with expo-web-browser's
 *    `openAuthSessionAsync`, which on iOS uses `ASWebAuthenticationSession`
 *    and on Android a custom-tab + Linking/AppState combo, and resolves
 *    `{ type: 'success', url: <redirect-back-into-app> }` once Google
 *    finishes and Supabase redirects to our `mobile://` scheme (app.json
 *    `expo.scheme: "mobile"`). We pass `redirectTo: 'mobile://'` explicitly
 *    so this matches regardless of the current route.
 *
 * 3. Supabase's PKCE flow puts a `?code=...` on that redirect URL; we finish
 *    the exchange with `supabase.auth.exchangeCodeForSession(code)`, which
 *    both completes the identity link AND updates the current session (its
 *    response can carry a fresh `provider_token` for the linked provider).
 *    If the redirect instead carries tokens directly in a `#access_token=`
 *    fragment (implicit flow, seen on some project configs), we fall back
 *    to reading the fragment and calling `setSession` with it — belt and
 *    suspenders, since which flow fires is a project setting we don't
 *    control from here.
 *
 * 4. Google Calendar access tokens are short-lived (~1 hour). Supabase's own
 *    `Session.provider_refresh_token` doc comment says outright: "this can
 *    be used to refresh the provider_token via the oauth provider's API" —
 *    i.e. Supabase does NOT auto-refresh third-party provider tokens for
 *    you; there is no `provider_token_expires_at` anywhere in the SDK. Auto-
 *    refreshing would mean us securely storing and rotating a Google refresh
 *    token ourselves, which is a materially bigger security surface (a
 *    long-lived secret we'd have to protect, and re-auth logic for when it's
 *    revoked). Per the scoping instruction to default to the safer option,
 *    this task scopes token access to FOREGROUND-ONLY: `getGoogleAccessToken`
 *    reads whatever `provider_token` is on the CURRENT Supabase session and
 *    returns null (never throws, never silently reuses a stale token) if
 *    there isn't one or the session itself is gone. There is deliberately no
 *    background refresh loop here — that would require persisting Google's
 *    own refresh_token, out of scope for this task. Reconnecting via
 *    connectGoogleCalendar() is the supported way to get a fresh token today.
 */

import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const REDIRECT_TO = 'mobile://';

export interface ConnectGoogleCalendarResult {
  success: boolean;
  error?: string;
}

/**
 * Pulls the auth code (PKCE) or access token (implicit fallback) out of the
 * URL expo-web-browser hands back after Google + Supabase redirect into the
 * app. Never throws — malformed input just yields nulls, which the caller
 * turns into a clear error message.
 */
function extractAuthCodeOrTokens(redirectUrl: string): {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
} {
  try {
    // `mobile://` isn't a URL scheme the global URL parser always likes on
    // every platform, so normalize to a parseable form first.
    const normalized = redirectUrl.replace(/^mobile:\/\//, 'https://mobile.local/');
    const url = new URL(normalized);

    const code = url.searchParams.get('code');

    // Implicit-flow fallback: tokens arrive in the fragment, not the query.
    const fragment = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    const fragmentParams = new URLSearchParams(fragment);
    const accessToken = fragmentParams.get('access_token');
    const refreshToken = fragmentParams.get('refresh_token');

    return { code, accessToken, refreshToken };
  } catch {
    return { code: null, accessToken: null, refreshToken: null };
  }
}

/**
 * Starts the "Connect Google Calendar" flow for the already-signed-in user:
 * links a Google identity via Supabase (requires manual linking enabled on
 * the Supabase project — see file doc comment), scoped to
 * calendar.events, opens the authorization URL in an in-app browser session,
 * and completes the redirect back into the app. Never throws.
 */
export async function connectGoogleCalendar(): Promise<ConnectGoogleCalendarResult> {
  try {
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        redirectTo: REDIRECT_TO,
        scopes: GOOGLE_CALENDAR_SCOPE,
        queryParams: {
          // Forces Google to hand back a refresh token / re-consent so the
          // provider_token we get back is fresh, even if this Google
          // account previously granted (and Google would otherwise silently
          // skip re-prompting for) this same scope.
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error || !data?.url) {
      return { success: false, error: error?.message ?? 'Could not start Google sign-in.' };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_TO);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { success: false, error: 'Google Calendar connection was cancelled.' };
    }
    if (result.type !== 'success' || !result.url) {
      return { success: false, error: 'Google Calendar connection did not complete.' };
    }

    const { code, accessToken, refreshToken } = extractAuthCodeOrTokens(result.url);

    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        return { success: false, error: exchangeError.message };
      }
      return { success: true };
    }

    if (accessToken && refreshToken) {
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (setSessionError) {
        return { success: false, error: setSessionError.message };
      }
      return { success: true };
    }

    return { success: false, error: 'Google did not return a valid authorization response.' };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Something went wrong connecting Google Calendar.',
    };
  }
}

/**
 * Unlinks the Google identity from the current user via Supabase's
 * `unlinkIdentity`. Returns false (never throws) on any failure, including
 * "not connected in the first place" and "only identity left" (Supabase
 * requires at least 2 identities to unlink one — this user always has the
 * email/password identity too, so that shouldn't trigger here, but we still
 * treat it as a normal failure rather than crashing).
 */
export async function disconnectGoogleCalendar(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getUserIdentities();
    if (error || !data) return false;

    const googleIdentity = data.identities.find((identity) => identity.provider === 'google');
    if (!googleIdentity) return false;

    const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity);
    return !unlinkError;
  } catch {
    return false;
  }
}

/**
 * Whether the current user has a linked Google identity. Foreground-only
 * connectivity check — does not imply the access token is still valid (see
 * getGoogleAccessToken). Never throws.
 */
export async function isGoogleCalendarConnected(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getUserIdentities();
    if (error || !data) return false;
    return data.identities.some((identity) => identity.provider === 'google');
  } catch {
    return false;
  }
}

/**
 * Returns a currently-valid Google access token for calling the Calendar
 * API, or null when there isn't one — no Google identity linked, no active
 * Supabase session, or (most commonly) the ~1hr Google token has expired
 * since the last connect/reconnect. Per the file doc comment, this
 * deliberately does NOT attempt a silent background refresh: Supabase does
 * not refresh third-party provider tokens on its own, and doing it
 * ourselves would mean persisting Google's refresh_token, out of scope here.
 * Callers (gcal-sync-runner.ts) treat null as "ask the user to reconnect,"
 * not as an error to throw.
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;
    return data.session.provider_token ?? null;
  } catch {
    return null;
  }
}
