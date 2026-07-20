import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { SignInScreen } from '@/components/auth/sign-in-screen';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { addNotificationTapListener } from '@/lib/notifications';
import { queryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync();

/**
 * Registers the tap listener for delivered notifications once, for the
 * lifetime of the app shell, and routes based on the tapped notification's
 * `screen` data field (set at schedule time by notification-priming.ts's
 * callers — nightly-ritual-settings.tsx and weekly-wizard.tsx). Runs
 * unconditionally (auth-independent): a signed-out tap still navigates, same
 * as any other deep link, and expo-router itself handles unauthenticated
 * routing via RootNavigator below.
 */
function useNotificationTapNavigation() {
  const router = useRouter();

  useEffect(() => {
    const subscription = addNotificationTapListener((data) => {
      const screen = data.screen;
      if (screen === 'tonight') {
        router.push('/plan/tonight');
      } else if (screen === 'weekly-wizard') {
        router.push('/plan/weekly-wizard');
      }
    });
    return () => subscription.remove();
  }, [router]);
}

function RootNavigator() {
  const { session, loading } = useAuth();
  useNotificationTapNavigation();

  if (loading) {
    // AnimatedSplashOverlay (rendered by the parent) covers the screen
    // until the initial session check resolves.
    return null;
  }

  return session ? <AppTabs /> : <SignInScreen />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <AnimatedSplashOverlay />
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
